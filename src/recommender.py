import calendar as _cal
import pandas as pd
import numpy as np
from datetime import date, timedelta
from config.settings import (
    RED_SELLTHROUGH_THRESHOLD, AMBER_SELLTHROUGH_THRESHOLD,
    RED_DOC_MULTIPLIER, AMBER_DOC_MULTIPLIER,
    MARKDOWN_BANDS, SEASON_END_DATE, ACTION_LEAD_DAYS,
    CATEGORY_LIFT_MULTIPLIERS,
)


def _compute_festival_info(row: pd.Series, festival_boosts: list, season_start: date, season_end: date) -> tuple:
    """Return (combined_boost, festival_names) combining ALL active festivals in the season window."""
    combined_boost = 1.0
    festival_names = []
    category = str(row.get("category", "Default"))
    for fest in festival_boosts:
        if not fest.get("enabled", True):
            continue
        month = fest.get("month")
        year  = fest.get("year", season_end.year)
        if not month:
            continue
        try:
            last_day = _cal.monthrange(int(year), int(month))[1]
            f_start  = date(int(year), int(month), 1)
            f_end    = date(int(year), int(month), last_day)
        except (ValueError, TypeError):
            continue
        # Festival month overlaps with the season window
        if f_start <= season_end and f_end >= season_start:
            boosts = fest.get("category_boosts", {})
            boost  = boosts.get(category, boosts.get("Default", 1.0))
            if boost > 1.0:
                combined_boost *= boost          # compound all active festivals
                festival_names.append(fest.get("name", ""))
    # Cap combined boost at 3.0x to avoid extreme reductions
    combined_boost = min(combined_boost, 3.0)
    return combined_boost, " + ".join(festival_names)


def generate_recommendations(features_df: pd.DataFrame, season_end_date: str | None = None, festival_boosts: list | None = None) -> pd.DataFrame:
    df = features_df.copy()
    today = date.today()
    season_end = pd.Timestamp(season_end_date or SEASON_END_DATE)
    season_days_remaining = max((season_end - pd.Timestamp(today)).days, 0)
    season_end_date_obj   = season_end.date()
    season_start_date_obj = (season_end - pd.Timedelta(days=120)).date()  # fallback; features may carry actual start

    # --- Festival velocity boost ---
    active_festivals = [f for f in (festival_boosts or []) if f.get("enabled", True)]
    if active_festivals:
        info = df.apply(
            lambda r: _compute_festival_info(r, active_festivals, season_start_date_obj, season_end_date_obj), axis=1
        )
        df["festival_boost"] = [i[0] for i in info]
        df["festival_name"]  = [i[1] for i in info]
        # Recalculate days_of_cover using boosted velocity for tier assignment
        df["_doc_for_tier"] = df.apply(
            lambda r: (r["stock_on_hand"] / (r["velocity_14d"] * r["festival_boost"]))
            if r["velocity_14d"] > 0 and r["festival_boost"] > 1.0
            else r["days_of_cover"],
            axis=1,
        )
    else:
        df["festival_boost"] = 1.0
        df["festival_name"]  = ""
        df["_doc_for_tier"]  = df["days_of_cover"]

    def _assign_tier(row: pd.Series) -> str:
        doc = row["_doc_for_tier"]
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
    df["velocity_lift"] = df["category"].map(CATEGORY_LIFT_MULTIPLIERS).fillna(
        CATEGORY_LIFT_MULTIPLIERS["Default"]
    )
    df.drop(columns=["_doc_for_tier"], inplace=True, errors="ignore")

    # --- Apply festival markdown reduction ---
    # Higher festival demand = same stock clears with a smaller discount
    if active_festivals:
        def _festival_markdown(row):
            boost     = row.get("festival_boost", 1.0)
            orig_pct  = row.get("markdown_pct", 0)
            tier      = row.get("urgency_tier", "Green")
            fest_name = row.get("festival_name", "")
            if boost <= 1.0 or orig_pct == 0:
                return pd.Series({
                    "markdown_pct":    orig_pct,
                    "markdown_band":   row["markdown_band"],
                    "markdown_reason": row["markdown_reason"],
                    "urgency_tier":    tier,
                })
            # Reduction: 1.3x → 15%, 1.5x → 25%, 1.6x → 30%, capped at 40%
            reduction   = min(0.40, (boost - 1.0) * 0.5)
            new_pct     = max(5, round(orig_pct * (1 - reduction)))
            band_lo     = max(5,  new_pct - 5)
            band_hi     = min(70, new_pct + 5)
            new_reason  = (
                row["markdown_reason"] +
                f" 🎉 {fest_name} demand boost ({boost}x) applied — markdown reduced from {orig_pct}% to {new_pct}%."
            )
            # Downgrade tier if markdown dropped into lower band
            new_tier = tier
            if tier == "Red"   and new_pct <= 20: new_tier = "Amber"
            if tier == "Amber" and new_pct <= 10: new_tier = "Green"
            return pd.Series({
                "markdown_pct":    new_pct,
                "markdown_band":   f"{band_lo}-{band_hi}%",
                "markdown_reason": new_reason,
                "urgency_tier":    new_tier,
            })

        fest_adjustments = df.apply(_festival_markdown, axis=1)
        df["markdown_pct"]    = fest_adjustments["markdown_pct"]
        df["markdown_band"]   = fest_adjustments["markdown_band"]
        df["markdown_reason"] = fest_adjustments["markdown_reason"]
        df["urgency_tier"]    = fest_adjustments["urgency_tier"]

    return df
