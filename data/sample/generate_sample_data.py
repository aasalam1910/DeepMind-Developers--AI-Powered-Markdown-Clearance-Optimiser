import random
import pandas as pd
import numpy as np
from pathlib import Path

random.seed(42)
np.random.seed(42)

STORES = ["MUM-1", "DEL-2", "BLR-3", "CHN-4", "HYD-5"]
CATEGORY_SKUS = {"Apparel": 20, "Footwear": 15, "Home": 15}
START_DATE = pd.Timestamp("2026-03-01")

skus = []
for cat, count in CATEGORY_SKUS.items():
    for i in range(count):
        skus.append((f"{cat[:3].upper()}-{i+1:03d}", cat))

profiles = {}
for sku_id, _ in skus:
    r = random.random()
    if r < 0.20:
        profiles[sku_id] = "red"
    elif r < 0.55:
        profiles[sku_id] = "amber"
    else:
        profiles[sku_id] = "green"

dates = pd.date_range(START_DATE, periods=30)

pos_rows = []
for sku_id, cat in skus:
    profile = profiles[sku_id]
    for store in STORES:
        for d in dates:
            week = (d - START_DATE).days // 7
            if profile == "red":
                base = random.uniform(0, 0.8)
            elif profile == "amber":
                base = max(0, random.uniform(2, 5) - week * 0.4)
            else:
                base = random.uniform(3, 8)
            units = max(0, int(np.random.poisson(max(base, 0))))
            if units > 0:
                pos_rows.append({
                    "sku": sku_id,
                    "store": store,
                    "date": d.strftime("%Y-%m-%d"),
                    "units_sold": units,
                })

pos_df = pd.DataFrame(pos_rows)

inv_rows = []
for sku_id, cat in skus:
    profile = profiles[sku_id]
    for store in STORES:
        total_sold = pos_df[
            (pos_df["sku"] == sku_id) & (pos_df["store"] == store)
        ]["units_sold"].sum()
        if profile == "red":
            stock = int(total_sold * random.uniform(3, 6)) + random.randint(10, 40)
        elif profile == "amber":
            stock = int(total_sold * random.uniform(0.8, 1.8)) + random.randint(5, 20)
        else:
            stock = int(total_sold * random.uniform(0.15, 0.5)) + random.randint(2, 10)
        inv_rows.append({
            "sku": sku_id,
            "store": store,
            "stock_on_hand": max(stock, 1),
            "category": cat,
        })

inv_df = pd.DataFrame(inv_rows)

Path("data/sample").mkdir(parents=True, exist_ok=True)
pos_df.to_csv("data/sample/pos_sales_sample.csv", index=False)
inv_df.to_csv("data/sample/inventory_sample.csv", index=False)
print(f"POS rows: {len(pos_df)} | Inventory rows: {len(inv_df)}")
