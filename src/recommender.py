import pandas as pd
import numpy as np
from datetime import date, timedelta
from config.settings import (
    RED_SELLTHROUGH_THRESHOLD, AMBER_SELLTHROUGH_THRESHOLD,
    RED_DOC_MULTIPLIER, AMBER_DOC_MULTIPLIER,
    MARKDOWN_BANDS, SEASON_END_DATE, ACTION_LEAD_DAYS,
    CATEGORY_LIFT_MULTIPLIERS,
)


def generate_recommendations(features_df: pd.DataFrame, season_end_date: str | None = None) -> pd.DataFrame:
    df = features_df.copy()
    today = date.today()
    season_end = pd.Timestamp(season_end_date or SEASON_END_DATE)
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

    def _assign_markdown_details(row: pd.Series) -> pd.Series:
        tier  = row["urgency_tier"]
        doc   = row["days_of_cover"]
        trend = row["velocity_trend"]
        stp   = row["sell_through_pct"]
        stock = int(row["stock_on_hand"])

        if tier == "Green" or pd.isna(doc):
            return pd.Series({
                "markdown_pct":    0,
                "markdown_band":   "0%",
                "markdown_reason": f"Selling well — {stp:.0f}% sold, no markdown needed.",
                "markdown_calc":   [],
            })

        ratio = doc / season_days_remaining if season_days_remaining > 0 else doc

        if tier == "Red":
            st_deficit = max(0.0, RED_SELLTHROUGH_THRESHOLD - stp)
            base       = 20.0 + (ratio - 1.0) * 8.0
            st_penalty = st_deficit * 0.3
            raw        = base + st_penalty
            pct        = int(min(70, max(20, round(raw))))

            steps = [
                f"Step 1 | Coverage Ratio = Days of Cover / Days Remaining = {doc:.0f} / {season_days_remaining} = {ratio:.2f}x",
                f"Step 2 | Base Markdown  = 20 + (ratio - 1) x 8 = 20 + ({ratio:.2f} - 1) x 8 = {base:.1f}%",
                f"Step 3 | ST Deficit     = max(0, {RED_SELLTHROUGH_THRESHOLD} - {stp:.0f}) = {st_deficit:.0f}pp below target",
                f"Step 4 | ST Penalty     = {st_deficit:.0f} x 0.30 = +{st_penalty:.1f}%",
                f"Step 5 | Raw Total      = {base:.1f} + {st_penalty:.1f} = {raw:.1f}%",
                f"Step 6 | Final          = clamp({raw:.1f}%, 20-70%) = {pct}%",
            ]
            reason = (
                f"Coverage ratio {ratio:.1f}x — stock outlasts the season by that multiple at current velocity. "
                f"With only {stp:.0f}% sold ({st_deficit:.0f}pp below the {RED_SELLTHROUGH_THRESHOLD}% threshold), "
                f"a {pct}% markdown is needed to clear {stock} units before season end."
            )

        else:  # Amber
            # Time urgency: how close to season end (0 = full season ahead, 1 = season ended)
            # Reference: 90 days as a full season window
            time_urgency  = max(0.0, 1.0 - season_days_remaining / 90.0)
            time_pressure = round(time_urgency * 10.0, 1)

            st_deficit = max(0.0, AMBER_SELLTHROUGH_THRESHOLD - stp)
            base       = 10.0 + st_deficit * 0.25 + time_pressure

            if trend == "decelerating":
                adjusted  = base * 1.2
                trend_txt = f"x1.2 (decelerating) -> {adjusted:.1f}%"
            else:
                adjusted  = base
                trend_txt = f"x1.0 (stable) -> {adjusted:.1f}%"

            pct = int(min(35, max(10, round(adjusted))))

            steps = [
                f"Step 1 | ST Deficit      = max(0, {AMBER_SELLTHROUGH_THRESHOLD} - {stp:.0f}) = {st_deficit:.0f}pp below target",
                f"Step 2 | Time Urgency    = 1 - ({season_days_remaining} / 90) = {time_urgency:.2f}  ->  +{time_pressure}%",
                f"Step 3 | Base Markdown   = 10 + {st_deficit:.0f} x 0.25 + {time_pressure} = {base:.1f}%",
                f"Step 4 | Trend Adj       = {trend_txt}",
                f"Step 5 | Final           = clamp({adjusted:.1f}%, 10-35%) = {pct}%",
            ]
            if trend == "decelerating":
                reason = (
                    f"Sell-through is {stp:.0f}% ({st_deficit:.0f}pp below the {AMBER_SELLTHROUGH_THRESHOLD}% target) "
                    f"and velocity is declining. With {season_days_remaining} days left, "
                    f"a {pct}% markdown now prevents a deeper cut later."
                )
            else:
                reason = (
                    f"Sell-through is {stp:.0f}% against the {AMBER_SELLTHROUGH_THRESHOLD}% target "
                    f"({st_deficit:.0f}pp gap) with {season_days_remaining} days remaining. "
                    f"A {pct}% discount closes the gap and protects full-price integrity."
                )

        band_lo = max(10, pct - 5)
        band_hi = min(70, pct + 5)
        return pd.Series({
            "markdown_pct":    pct,
            "markdown_band":   f"{band_lo}-{band_hi}%",
            "markdown_reason": reason,
            "markdown_calc":   steps,
        })

    def _assign_action_date(row: pd.Series) -> str | None:
        tier = row["urgency_tier"]
        doc  = row["days_of_cover"]
        pct  = row["markdown_pct"]

        if tier == "Green" or pct == 0:
            return None

        # Coverage ratio — how many times stock outlasts the remaining season
        ratio = (doc / season_days_remaining) if (season_days_remaining > 0 and pd.notna(doc)) else 3.0

        if tier == "Red":
            # Higher ratio = more urgent = fewer days to act
            # ratio 1x → 30 days;  ratio 3x → 10 days;  ratio 5x+ → 3 days
            days_until = max(3, round(30.0 / min(ratio, 10.0)))
        else:  # Amber
            # Less urgent — more time to act, but still season-aware
            days_until = max(7, round(45.0 / min(ratio + 0.1, 10.0)))

        action_date = today + timedelta(days=int(days_until))
        # Cap at season end minus 7-day buffer so it's always before season end
        season_end_date = (season_end - pd.Timedelta(days=7)).date()
        action_date = min(action_date, season_end_date)

        return action_date.strftime("%Y-%m-%d")

    df["urgency_tier"] = df.apply(_assign_tier, axis=1)
    details = df.apply(_assign_markdown_details, axis=1)
    df["markdown_pct"]    = details["markdown_pct"]
    df["markdown_band"]   = details["markdown_band"]
    df["markdown_reason"] = details["markdown_reason"]
    df["markdown_calc"]   = details["markdown_calc"]
    df["action_by_date"]  = df.apply(_assign_action_date, axis=1)

    return df
