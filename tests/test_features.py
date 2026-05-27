import pytest
import pandas as pd
import numpy as np
from src.features import compute_features


def make_pos(units_per_day=5, days=30, sku="SKU-001", store="MUM-1"):
    dates = pd.date_range("2026-03-01", periods=days)
    return pd.DataFrame({
        "sku": sku, "store": store,
        "date": dates, "units_sold": units_per_day,
    })


def make_inv(stock=100, sku="SKU-001", store="MUM-1", category="Apparel"):
    return pd.DataFrame([{
        "sku": sku, "store": store,
        "stock_on_hand": stock, "category": category,
    }])


def test_velocity_14d_equals_average_of_last_14_days():
    pos_df = make_pos(units_per_day=10)
    features = compute_features(pos_df, make_inv())
    assert abs(features.iloc[0]["velocity_14d"] - 10.0) < 0.01


def test_opening_stock_derived_as_stock_plus_season_sales():
    pos_df = make_pos(units_per_day=5, days=30)  # 150 total
    features = compute_features(pos_df, make_inv(stock=50))
    assert features.iloc[0]["opening_stock"] == 200


def test_sell_through_pct_correct():
    pos_df = make_pos(units_per_day=5, days=30)  # 150 sold; opening=200
    features = compute_features(pos_df, make_inv(stock=50))
    assert abs(features.iloc[0]["sell_through_pct"] - 75.0) < 0.1


def test_days_of_cover_null_when_velocity_zero():
    pos_df = make_pos(units_per_day=0)
    features = compute_features(pos_df, make_inv())
    assert pd.isna(features.iloc[0]["days_of_cover"])


def test_days_of_cover_correct_when_velocity_nonzero():
    pos_df = make_pos(units_per_day=10)   # velocity = 10
    features = compute_features(pos_df, make_inv(stock=50))
    assert abs(features.iloc[0]["days_of_cover"] - 5.0) < 0.1


def test_velocity_trend_decelerating():
    dates = pd.date_range("2026-03-01", periods=14)
    units = list(range(14, 0, -1))
    pos_df = pd.DataFrame({"sku": "SKU-001", "store": "MUM-1", "date": dates, "units_sold": units})
    features = compute_features(pos_df, make_inv())
    assert features.iloc[0]["velocity_trend"] == "decelerating"


def test_velocity_trend_accelerating():
    dates = pd.date_range("2026-03-01", periods=14)
    units = list(range(1, 15))
    pos_df = pd.DataFrame({"sku": "SKU-001", "store": "MUM-1", "date": dates, "units_sold": units})
    features = compute_features(pos_df, make_inv())
    assert features.iloc[0]["velocity_trend"] == "accelerating"
