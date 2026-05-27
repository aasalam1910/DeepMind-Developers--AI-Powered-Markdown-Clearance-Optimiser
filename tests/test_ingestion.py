import pytest
import pandas as pd
from io import StringIO
from src.ingestion import load_and_validate, ValidationError

POS_CSV = """sku,store,date,units_sold
SKU-001,MUM-1,2026-03-01,5
SKU-001,MUM-1,2026-03-02,3
SKU-002,DEL-2,2026-03-01,2
"""

INV_CSV = """sku,store,stock_on_hand,category
SKU-001,MUM-1,50,Apparel
SKU-002,DEL-2,30,Footwear
"""

def test_load_returns_clean_dataframes():
    pos_df, inv_df = load_and_validate(StringIO(POS_CSV), StringIO(INV_CSV))
    assert set(pos_df.columns) >= {"sku", "store", "date", "units_sold"}
    assert set(inv_df.columns) >= {"sku", "store", "stock_on_hand"}
    assert len(pos_df) == 3
    assert len(inv_df) == 2

def test_missing_pos_column_raises_validation_error():
    bad_pos = "sku,store,units_sold\nSKU-001,MUM-1,5\n"
    with pytest.raises(ValidationError, match="date"):
        load_and_validate(StringIO(bad_pos), StringIO(INV_CSV))

def test_missing_inv_column_raises_validation_error():
    bad_inv = "sku,store\nSKU-001,MUM-1\n"
    with pytest.raises(ValidationError, match="stock_on_hand"):
        load_and_validate(StringIO(POS_CSV), StringIO(bad_inv))

def test_alias_columns_are_resolved():
    alias_pos = "item_code,branch,txn_date,qty\nSKU-001,MUM-1,2026-03-01,5\n"
    pos_df, _ = load_and_validate(StringIO(alias_pos), StringIO(INV_CSV))
    assert "sku" in pos_df.columns
    assert "units_sold" in pos_df.columns

def test_duplicate_rows_are_aggregated():
    dup_pos = """sku,store,date,units_sold
SKU-001,MUM-1,2026-03-01,5
SKU-001,MUM-1,2026-03-01,3
"""
    pos_df, _ = load_and_validate(StringIO(dup_pos), StringIO(INV_CSV))
    row = pos_df[(pos_df["sku"] == "SKU-001") & (pos_df["store"] == "MUM-1")]
    assert row["units_sold"].values[0] == 8

def test_missing_category_defaults_to_default():
    inv_no_cat = "sku,store,stock_on_hand\nSKU-001,MUM-1,50\nSKU-002,DEL-2,30\n"
    _, inv_df = load_and_validate(StringIO(POS_CSV), StringIO(inv_no_cat))
    assert (inv_df["category"] == "Default").all()

def test_non_numeric_units_rows_are_dropped():
    bad_units = """sku,store,date,units_sold
SKU-001,MUM-1,2026-03-01,5
SKU-001,MUM-1,2026-03-02,N/A
"""
    pos_df, _ = load_and_validate(StringIO(bad_units), StringIO(INV_CSV))
    assert len(pos_df) == 1
