import pandas as pd
import numpy as np
from datetime import date, timedelta
from config.settings import (
    RED_SELLTHROUGH_THRESHOLD, AMBER_SELLTHROUGH_THRESHOLD,
    RED_DOC_MULTIPLIER, AMBER_DOC_MULTIPLIER,
    MARKDOWN_BANDS, SEASON_END_DATE, ACTION_LEAD_DAYS,
)


def generate_recommendations(features_df: pd.DataFrame) -> pd.DataFrame:
    df = features_df.copy()
    today = date.today()
    season_end = pd.Timestamp(SEASON_END_DATE)
    season_days_remaining = max((season_end - pd.Timestamp(today)).days, 0)

    def _assign_tier(row: pd.Series) -> str:
        doc = row["days_of_cover"]
        stp = row["sell_through_pct"]
        if pd.isna(doc):
            return "Green"
        red = (
            doc > season_days_remaining * RED_DOC_MULTIPLIER
            and stp < RED_SELLTHROUGH_THRESHOLD
        )
        if red:
            return "Red"
        amber = (
            doc > season_days_remaining * AMBER_DOC_MULTIPLIER
            or stp < AMBER_SELLTHROUGH_THRESHOLD
        )
        if amber:
            return "Amber"
        return "Green"

    def _assign_markdown(row: pd.Series) -> int:
        tier = row["urgency_tier"]
        doc = row["days_of_cover"]
        trend = row["velocity_trend"]
        if tier == "Green" or pd.isna(doc):
            return 0
        if tier == "Red":
            band = (
                MARKDOWN_BANDS["red_critical"]
                if doc > season_days_remaining * 1.5
                else MARKDOWN_BANDS["red_moderate"]
            )
        else:
            band = (
                MARKDOWN_BANDS["amber_decel"]
                if trend == "decelerating"
                else MARKDOWN_BANDS["amber_stable"]
            )
        return (band[0] + band[1]) // 2

    def _assign_action_date(tier: str):
        if tier == "Green":
            return None
        return (today + timedelta(days=ACTION_LEAD_DAYS[tier])).strftime("%Y-%m-%d")

    df["urgency_tier"] = df.apply(_assign_tier, axis=1)
    df["markdown_pct"] = df.apply(_assign_markdown, axis=1)
    df["action_by_date"] = df["urgency_tier"].apply(_assign_action_date)

    return df
