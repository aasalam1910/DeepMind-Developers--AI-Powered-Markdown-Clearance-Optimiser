import pandas as pd
from config.settings import COLUMN_ALIASES


class ValidationError(Exception):
    pass


def _resolve_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {}
    lower_cols = {c.lower().strip(): c for c in df.columns}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias.lower() in lower_cols:
                rename_map[lower_cols[alias.lower()]] = canonical
                break
    return df.rename(columns=rename_map)


def load_and_validate(pos_file, inventory_file) -> tuple[pd.DataFrame, pd.DataFrame]:
    pos_df = pd.read_csv(pos_file)
    inv_df = pd.read_csv(inventory_file)

    pos_df = _resolve_columns(pos_df)
    inv_df = _resolve_columns(inv_df)

    pos_required = {"sku", "store", "date", "units_sold"}
    missing_pos = pos_required - set(pos_df.columns)
    if missing_pos:
        raise ValidationError(f"POS CSV missing required columns: {missing_pos}")

    inv_required = {"sku", "store", "stock_on_hand"}
    missing_inv = inv_required - set(inv_df.columns)
    if missing_inv:
        raise ValidationError(f"Inventory CSV missing required columns: {missing_inv}")

    pos_df["date"] = pd.to_datetime(pos_df["date"], errors="coerce")
    pos_df = pos_df.dropna(subset=["date"])

    pos_df["units_sold"] = pd.to_numeric(pos_df["units_sold"], errors="coerce")
    inv_df["stock_on_hand"] = pd.to_numeric(inv_df["stock_on_hand"], errors="coerce")

    pos_df = pos_df.dropna(subset=["sku", "store", "date", "units_sold"])
    inv_df = inv_df.dropna(subset=["sku", "store", "stock_on_hand"])

    pos_df = (
        pos_df.groupby(["sku", "store", "date"], as_index=False)["units_sold"].sum()
    )

    if "category" not in inv_df.columns:
        inv_df["category"] = "Default"

    return pos_df, inv_df
