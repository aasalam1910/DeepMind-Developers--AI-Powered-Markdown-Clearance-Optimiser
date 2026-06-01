import os
import re
import time
import pandas as pd
from groq import Groq
from datetime import date
from pathlib import Path
from dotenv import load_dotenv
from config.settings import (
    LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE,
    LLM_RETRY_ATTEMPTS, CATEGORY_LIFT_MULTIPLIERS, SEASON_END_DATE,
)

load_dotenv(Path(__file__).parent.parent / ".streamlit" / ".env")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def _build_structured_prompt(row: pd.Series, days_remaining: int) -> str:
    lift = CATEGORY_LIFT_MULTIPLIERS.get(
        row.get("category", "Default"),
        CATEGORY_LIFT_MULTIPLIERS["Default"],
    )
    doc = row["days_of_cover"]
    doc_str = f"{doc:.0f}" if pd.notna(doc) else "N/A"

    calc_steps = row.get('markdown_calc') or []
    calc_steps = calc_steps if isinstance(calc_steps, list) else []
    calc_block = '\n'.join(f"  {s}" for s in calc_steps) if calc_steps else '  (not available)'

    return f"""You are a retail merchandising analyst. Respond with EXACTLY these 5 numbered sections and no other text.

1. RECOMMENDED DISCOUNT
State the recommended markdown % and in one phrase why this exact % was chosen.

2. WHY THIS DISCOUNT
2-3 sentences. You MUST cite: daily velocity ({row['velocity_14d']:.1f} units/day), days of cover ({doc_str} days), and days remaining in season ({days_remaining} days). Reference the calculation below.

3. WHAT WILL HAPPEN
Exactly 1 sentence. You MUST cite the expected {lift}x velocity lift after the markdown is applied.

4. IF THIS IS NOT APPLIED
Exactly 1 sentence. You MUST cite the {int(row['stock_on_hand'])} units at risk of remaining unsold.

5. CONFIDENCE
State HIGH, MEDIUM, or LOW followed by one short reason.

---
SKU: {row['sku']} | Store: {row['store']} | Category: {row.get('category', 'Default')}
Urgency tier: {row['urgency_tier']} | Recommended markdown: {int(row['markdown_pct'])}%
Daily velocity: {row['velocity_14d']:.1f} units/day | Stock on hand: {int(row['stock_on_hand'])} units
Days of cover: {doc_str} | Days remaining in season: {days_remaining}
Sell-through to date: {row['sell_through_pct']:.1f}% | Velocity trend: {row.get('velocity_trend', 'stable')}
Expected velocity lift at this markdown: {lift}x

Discount calculation steps:
{calc_block}"""


def _parse_rationale_sections(text: str) -> dict:
    result = {
        "rationale_why": "",
        "rationale_outcome": "",
        "rationale_consequence": "",
        "confidence": "",
    }
    patterns = {
        "rationale_why":         r"2[\.\)]\s*WHY THIS DISCOUNT\s*([\s\S]*?)(?=\n\s*3[\.\)]|\Z)",
        "rationale_outcome":     r"3[\.\)]\s*WHAT WILL HAPPEN\s*([\s\S]*?)(?=\n\s*4[\.\)]|\Z)",
        "rationale_consequence": r"4[\.\)]\s*IF THIS IS NOT APPLIED\s*([\s\S]*?)(?=\n\s*5[\.\)]|\Z)",
        "confidence":            r"5[\.\)]\s*CONFIDENCE\s*([\s\S]*?)$",
    }
    for key, pattern in patterns.items():
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            result[key] = m.group(1).strip()
    return result


def _fallback_dict() -> dict:
    return {
        "rationale_why": "Rationale unavailable — please review metrics manually.",
        "rationale_outcome": "",
        "rationale_consequence": "",
        "confidence": "N/A",
    }


def generate_rationale_for_sku(row: pd.Series) -> dict:
    if not GROQ_API_KEY:
        return _fallback_dict()

    days_remaining = max(
        (pd.Timestamp(SEASON_END_DATE) - pd.Timestamp(date.today())).days, 0
    )
    prompt = _build_structured_prompt(row, days_remaining)

    try:
        with Groq(api_key=GROQ_API_KEY) as client:
            for attempt in range(LLM_RETRY_ATTEMPTS):
                try:
                    response = client.chat.completions.create(
                        model=LLM_MODEL,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=LLM_MAX_TOKENS,
                        temperature=LLM_TEMPERATURE,
                    )
                    text = response.choices[0].message.content.strip()
                    parsed = _parse_rationale_sections(text)
                    if parsed["rationale_why"]:
                        return parsed
                except Exception:
                    if attempt < LLM_RETRY_ATTEMPTS - 1:
                        time.sleep(2 ** attempt)
    except Exception:
        return _fallback_dict()

    return _fallback_dict()


def get_or_generate_rationale(sku: str, store: str, row: pd.Series) -> dict:
    import streamlit as st
    key = f"rationale_{sku}_{store}"
    if key not in st.session_state:
        st.session_state[key] = generate_rationale_for_sku(row)
    val = st.session_state[key]
    if isinstance(val, str):
        return {"rationale_why": val, "rationale_outcome": "", "rationale_consequence": "", "confidence": "N/A"}
    return val
