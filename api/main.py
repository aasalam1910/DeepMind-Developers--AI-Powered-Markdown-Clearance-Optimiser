import io
import json
import sys
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.ingestion import load_and_validate, ValidationError
from src.features import compute_features
from src.recommender import generate_recommendations
from src.rationale import generate_rationale_for_sku
from src.export import build_action_sheet

app = FastAPI(title="Markdown Optimiser API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_records(df: pd.DataFrame) -> list:
    return json.loads(df.to_json(orient="records"))


@app.post("/api/recommend")
async def recommend(
    pos_file: UploadFile = File(...),
    inv_file: UploadFile = File(...),
    season_start: str | None = Query(default=None),
    season_end:   str | None = Query(default=None),
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

    rec_df = generate_recommendations(
        compute_features(pos_df, inv_df, season_start_date=season_start),
        season_end_date=season_end,
    )
    return {"recommendations": _to_records(rec_df)}


@app.post("/api/recommend/sample")
async def recommend_sample(
    season_start: str | None = Query(default=None),
    season_end:   str | None = Query(default=None),
):
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
    )
    return {"recommendations": _to_records(rec_df)}


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
