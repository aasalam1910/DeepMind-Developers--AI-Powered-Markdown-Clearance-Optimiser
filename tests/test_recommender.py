import pytest
import pandas as pd
import numpy as np
from src.recommender import generate_recommendations


def make_features(days_of_cover, sell_through_pct, velocity_trend="stable"):
    return pd.DataFrame([{
        "sku": "SKU-001", "store": "MUM-1", "category": "Apparel",
        "stock_on_hand": 100, "velocity_14d": 2.0,
        "days_of_cover": days_of_cover,
        "sell_through_pct": sell_through_pct,
        "velocity_trend": velocity_trend,
        "units_sold_season": 50, "opening_stock": 150, "season_week": 5,
    }])


def test_red_tier_when_high_doc_and_low_sellthrough():
    df = make_features(days_of_cover=80, sell_through_pct=40)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["urgency_tier"] == "Red"


def test_green_tier_when_velocity_zero():
    df = make_features(days_of_cover=float("nan"), sell_through_pct=80)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["urgency_tier"] == "Green"


def test_green_tier_when_well_on_track():
    df = make_features(days_of_cover=5, sell_through_pct=90)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["urgency_tier"] == "Green"


def test_markdown_zero_for_green():
    df = make_features(days_of_cover=5, sell_through_pct=90)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["markdown_pct"] == 0


def test_amber_decel_markdown_higher_than_amber_stable():
    decel = generate_recommendations(
        make_features(days_of_cover=30, sell_through_pct=65, velocity_trend="decelerating")
    )
    stable = generate_recommendations(
        make_features(days_of_cover=30, sell_through_pct=65, velocity_trend="stable")
    )
    assert decel.iloc[0]["markdown_pct"] >= stable.iloc[0]["markdown_pct"]


def test_action_by_date_none_for_green():
    df = make_features(days_of_cover=5, sell_through_pct=90)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["action_by_date"] is None


def test_action_by_date_set_for_red():
    df = make_features(days_of_cover=80, sell_through_pct=40)
    rec = generate_recommendations(df)
    assert rec.iloc[0]["action_by_date"] is not None
