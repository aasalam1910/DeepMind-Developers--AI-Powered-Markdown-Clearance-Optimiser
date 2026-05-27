import time
import pandas as pd
import streamlit as st
from groq import Groq
from datetime import date
from config.settings import (
    LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE,
    LLM_RETRY_ATTEMPTS, CATEGORY_LIFT_MULTIPLIERS, SEASON_END_DATE,
)


def _build_prompt(row: pd.Series, days_remaining: int) -> str:
    lift = CATEGORY_LIFT_MULTIPLIERS.get(
        row.get("category", "Default"),
        CATEGORY_LIFT_MULTIPLIERS["Default"],
    )
    doc = row["days_of_cover"]
    doc_str = f"{doc:.0f}" if pd.notna(doc) else "N/A"
    return (
        f"You are a retail merchandising assistant. Write a 2-3 sentence "
        f"plain-English rationale for this markdown recommendation. Be specific with numbers.\n\n"
        f"SKU: {row['sku']} | Store: {row['store']}\n"
        f"Daily velocity: {row['velocity_14d']:.1f} units/day | Stock: {int(row['stock_on_hand'])} units\n"
        f"Days of cover: {doc_str}d | Season ends in: {days_remaining}d\n"
        f"Recommended markdown: {int(row['markdown_pct'])}%\n"
        f"Expected velocity lift: {lift}x (category average)\n\n"
        f"Rationale:"
    )


def generate_rationale_for_sku(row: pd.Series) -> str:
    client = Groq(api_key=st.secrets["GROQ_API_KEY"])
    days_remaining = max(
        (pd.Timestamp(SEASON_END_DATE) - pd.Timestamp(date.today())).days, 0
    )
    prompt = _build_prompt(row, days_remaining)

    for attempt in range(LLM_RETRY_ATTEMPTS):
        try:
            response = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=LLM_MAX_TOKENS,
                temperature=LLM_TEMPERATURE,
            )
            return response.choices[0].message.content.strip()
        except Exception:
            if attempt < LLM_RETRY_ATTEMPTS - 1:
                time.sleep(2 ** attempt)

    return "Rationale unavailable — please review metrics manually."


def get_or_generate_rationale(sku: str, store: str, row: pd.Series) -> str:
    key = f"rationale_{sku}_{store}"
    if key not in st.session_state:
        st.session_state[key] = generate_rationale_for_sku(row)
    return st.session_state[key]
