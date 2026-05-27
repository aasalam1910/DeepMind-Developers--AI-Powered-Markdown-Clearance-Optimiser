import pandas as pd
import numpy as np
from config.settings import VELOCITY_WINDOW_DAYS, TREND_WINDOW_DAYS, SEASON_START_DATE


def _classify_trend(slope: float) -> str:
    if slope > 0.1:
        return "accelerating"
    if slope < -0.1:
        return "decelerating"
    return "stable"


def compute_features(pos_df: pd.DataFrame, inventory_df: pd.DataFrame) -> pd.DataFrame:
    season_start = pd.Timestamp(SEASON_START_DATE)
    reference_date = pos_df["date"].max()

    season_sales = (
        pos_df[pos_df["date"] >= season_start]
        .groupby(["sku", "store"], as_index=False)["units_sold"]
        .sum()
        .rename(columns={"units_sold": "units_sold_season"})
    )

    cutoff_14d = reference_date - pd.Timedelta(days=VELOCITY_WINDOW_DAYS)
    velocity_df = (
        pos_df[pos_df["date"] > cutoff_14d]
        .groupby(["sku", "store"], as_index=False)["units_sold"]
        .sum()
        .rename(columns={"units_sold": "units_sold_14d"})
    )
    velocity_df["velocity_14d"] = velocity_df["units_sold_14d"] / VELOCITY_WINDOW_DAYS

    trend_cutoff = reference_date - pd.Timedelta(days=TREND_WINDOW_DAYS * 3)
    trend_data = pos_df[pos_df["date"] > trend_cutoff].copy()

    def _compute_trend(group: pd.DataFrame) -> str:
        daily = (
            group.set_index("date")["units_sold"]
            .resample("D").sum()
            .fillna(0)
        )
        if len(daily) < 3:
            return "stable"
        x = np.arange(len(daily))
        slope = np.polyfit(x, daily.values, 1)[0]
        return _classify_trend(slope)

    trend_df = (
        trend_data.groupby(["sku", "store"])
        .apply(_compute_trend, include_groups=False)
        .reset_index()
    )
    trend_df.columns = ["sku", "store", "velocity_trend"]

    features_df = inventory_df.copy()
    features_df = features_df.merge(season_sales, on=["sku", "store"], how="left")
    features_df = features_df.merge(
        velocity_df[["sku", "store", "velocity_14d"]], on=["sku", "store"], how="left"
    )
    features_df = features_df.merge(trend_df, on=["sku", "store"], how="left")

    features_df["units_sold_season"] = features_df["units_sold_season"].fillna(0)
    features_df["velocity_14d"] = features_df["velocity_14d"].fillna(0)
    features_df["velocity_trend"] = features_df["velocity_trend"].fillna("stable")

    features_df["opening_stock"] = (
        features_df["stock_on_hand"] + features_df["units_sold_season"]
    )
    features_df["sell_through_pct"] = np.where(
        features_df["opening_stock"] > 0,
        features_df["units_sold_season"] / features_df["opening_stock"] * 100,
        0.0,
    )
    features_df["days_of_cover"] = np.where(
        features_df["velocity_14d"] > 0,
        features_df["stock_on_hand"] / features_df["velocity_14d"],
        np.nan,
    )
    features_df["season_week"] = (reference_date - season_start).days // 7 + 1

    return features_df
