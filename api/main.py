import io
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

from fastapi import Body, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.ingestion import load_and_validate, ValidationError
from src.features import compute_features
from src.recommender import generate_recommendations
from src.rationale import generate_rationale_for_sku
from src.export import build_action_sheet
from config.settings import GROQ_API_KEY, LLM_MODEL, FESTIVAL_DEFAULT_BOOSTS

app = FastAPI(title="Markdown Optimiser API")

import os

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),          # set this in Render dashboard
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "service": "Markdown Optimiser API"}


def _to_records(df: pd.DataFrame) -> list:
    return json.loads(df.to_json(orient="records"))


@app.post("/api/recommend")
async def recommend(
    pos_file:     UploadFile  = File(...),
    inv_file:     UploadFile  = File(...),
    season_start: str | None  = Query(default=None),
    season_end:   str | None  = Query(default=None),
    festivals:    str | None  = Form(default=None),
):
    try:
        pos_df, inv_df = load_and_validate(
            io.StringIO((await pos_file.read()).decode("utf-8")),
            io.StringIO((await inv_file.read()).decode("utf-8")),
        )
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File parse error: {e}")

    festival_boosts = json.loads(festivals) if festivals else []
    rec_df = generate_recommendations(
        compute_features(pos_df, inv_df, season_start_date=season_start),
        season_end_date=season_end,
        festival_boosts=festival_boosts,
    )
    return {"recommendations": _to_records(rec_df)}


@app.post("/api/recommend/sample")
async def recommend_sample(payload: dict = Body(default={})):
    season_start    = payload.get("season_start")
    season_end      = payload.get("season_end")
    festival_boosts = payload.get("festivals", [])

    root = Path(__file__).parent.parent
    try:
        pos_df, inv_df = load_and_validate(
            str(root / "data/sample/pos_sales_sample.csv"),
            str(root / "data/sample/inventory_sample.csv"),
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Sample data files not found")

    rec_df = generate_recommendations(
        compute_features(pos_df, inv_df, season_start_date=season_start),
        season_end_date=season_end,
        festival_boosts=festival_boosts,
    )
    return {"recommendations": _to_records(rec_df)}


@app.post("/api/festivals/detect")
async def detect_festivals(payload: dict):
    year         = payload.get("year",   date.today().year)
    region       = payload.get("region", "India")
    season_start = payload.get("season_start")
    season_end   = payload.get("season_end")

    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="LLM not configured")

    festival_name = payload.get("festival_name")

    season_context = ""
    if season_start and season_end:
        season_context = f" Only include festivals that fall between {season_start} and {season_end}."

    # Region-specific festival lists for India
    REGION_FESTIVALS = {
        "All India": (
            "Pan-India: Diwali, Navratri, Durga Puja, Holi, Janmashtami, Ram Navami, Ganesh Chaturthi, "
            "Ramzan, Eid ul-Fitr, Eid ul-Adha, Milad-un-Nabi, Christmas, New Year. "
            "North India: Lohri, Makar Sankranti, Baisakhi, Teej, Karva Chauth, Chhath Puja. "
            "South India: Pongal, Ugadi, Onam, Vishu, Tamil New Year, Varalakshmi Vratam, Karthigai Deepam. "
            "East India: Bihu, Rath Yatra, Poila Boishakh. "
            "West India: Gudi Padwa, Uttarayan."
        ),
        "North India": (
            "Diwali, Navratri, Holi, Janmashtami, Ram Navami, "
            "Ramzan, Eid ul-Fitr, Eid ul-Adha, Milad-un-Nabi, Christmas, New Year, "
            "Lohri, Makar Sankranti, Baisakhi, Teej, Karva Chauth, Chhath Puja."
        ),
        "South India": (
            "Diwali, Navratri, Ganesh Chaturthi, Janmashtami, "
            "Ramzan, Eid ul-Fitr, Eid ul-Adha, Milad-un-Nabi, Christmas, New Year, "
            "Pongal, Ugadi, Onam, Vishu, Tamil New Year, Varalakshmi Vratam, Karthigai Deepam."
        ),
        "East India": (
            "Diwali, Durga Puja, Holi, Janmashtami, "
            "Ramzan, Eid ul-Fitr, Christmas, New Year, "
            "Bihu, Rath Yatra, Poila Boishakh."
        ),
        "West India": (
            "Diwali, Navratri, Holi, Janmashtami, "
            "Ramzan, Eid ul-Fitr, Christmas, New Year, "
            "Ganesh Chaturthi, Gudi Padwa, Makar Sankranti, Uttarayan."
        ),
    }
    festival_list = REGION_FESTIVALS.get(region, REGION_FESTIVALS["All India"])

    if festival_name:
        prompt = f"""For the year {year} in India ({region}), which month does "{festival_name}" fall in?
This is a shopping/cultural festival. Identify the month when most buying activity happens for this festival.
For lunar-calendar festivals (Eid, Ramzan, Diwali, Holi, etc.), calculate the correct Gregorian month for {year}.{season_context}

Return ONLY a valid JSON array with a single entry (no extra text):
[{{"name": "{festival_name}", "month": <month_number>, "month_name": "<month_name>"}}]

If this festival does not fall within the season window, return an empty array: []"""
    else:
        prompt = f"""List the major shopping festivals in India ({region}) for the year {year}.{season_context}
For each festival identify which MONTH (not exact date) it primarily falls in — the month when most shopping and buying activity happens.
Important: many Indian festivals follow lunar/regional calendars and shift every year — calculate the correct Gregorian month for {year} carefully.

Return ONLY a valid JSON array (no extra text) in this exact format:
[
  {{"name": "Diwali", "month": 10, "month_name": "October"}},
  {{"name": "Pongal", "month": 1, "month_name": "January"}}
]

Include ONLY festivals from this region-specific list that fall within the season window:
{festival_list}

Rules:
- For Ramzan: use the month Ramzan BEGINS in {year}.
- For Milad-un-Nabi: use the month of the Prophet's birthday in {year}.
- For Lohri: always January.
- For Pongal / Makar Sankranti / Uttarayan: always January.
- For Ugadi / Gudi Padwa / Tamil New Year / Vishu / Baisakhi / Bihu: March or April depending on {year}.
- For Onam: August or September depending on {year}.
- For Ganesh Chaturthi: August or September depending on {year}.
- Skip any festival that falls outside {season_start or "the season start"} to {season_end or "season end"}."""

    try:
        from groq import Groq
        with Groq(api_key=GROQ_API_KEY) as client:
            for attempt in range(3):
                try:
                    resp = client.chat.completions.create(
                        model=LLM_MODEL,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=512,
                        temperature=0.1,
                    )
                    text  = resp.choices[0].message.content.strip()
                    match = re.search(r'\[[\s\S]*?\]', text)
                    if not match:
                        continue
                    raw = json.loads(match.group())
                    # Build season filter dates
                    import calendar as _cal2
                    try:
                        s_start = date.fromisoformat(season_start) if season_start else None
                        s_end   = date.fromisoformat(season_end)   if season_end   else None
                    except Exception:
                        s_start = s_end = None

                    festivals = []
                    for f in raw:
                        month = f.get("month")
                        if not month:
                            continue
                        name   = f.get("name", "Festival")
                        boosts = FESTIVAL_DEFAULT_BOOSTS.get(name, FESTIVAL_DEFAULT_BOOSTS["Default"])
                        entry  = {
                            "name":            name,
                            "month":           month,
                            "month_name":      f.get("month_name", ""),
                            "year":            year,
                            "category_boosts": boosts,
                            "enabled":         True,
                        }
                        # Hard filter: only include if month overlaps season window
                        if s_start and s_end:
                            last_day = _cal2.monthrange(year, int(month))[1]
                            f_start  = date(year, int(month), 1)
                            f_end    = date(year, int(month), last_day)
                            if not (f_start <= s_end and f_end >= s_start):
                                continue
                        festivals.append(entry)
                    return {"festivals": festivals}
                except Exception:
                    if attempt < 2:
                        time.sleep(2 ** attempt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Festival detection failed: {e}")

    raise HTTPException(status_code=500, detail="Could not parse festival data from LLM")


@app.post("/api/rationale")
async def rationale(payload: dict):
    return generate_rationale_for_sku(pd.Series(payload))


@app.post("/api/export")
async def export(payload: dict):
    recs = payload.get("recommendations", [])
    if not recs:
        raise HTTPException(status_code=400, detail="No recommendations to export")
    df = pd.DataFrame(recs)
    if "rationale" not in df.columns:
        df["rationale"] = ""
    buf = build_action_sheet(df)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=markdown_recommendations.xlsx"},
    )
