import os
from dotenv import load_dotenv

load_dotenv()

# Declare the Groq model identifier explicitly for src/rationale.py to import
LLM_MODEL = "llama-3.3-70b-versatile"

# Safely grab your Groq API key from the environment configuration
GROQ_API_KEY = os.getenv
LLM_MAX_TOKENS = 512
SEASON_START_DATE = "2026-03-01"
SEASON_END_DATE   = "2026-06-30"
LLM_TEMPERATURE = 0.2  # Low temperature keeps the AI rationales structured and factual

# --- Resiliency / Error Handling ---
LLM_RETRY_ATTEMPTS = 3  # If the Groq API times out, try 3 times before failing

# --- Business Logic Hyperparameters ---
# Multipliers to adjust discount strategy based on how demanding a category is
CATEGORY_LIFT_MULTIPLIERS = {
    "Accessories": 1.0,
    "Kurtas": 1.1,
    "Footwear": 1.0,
    "Western Wear": 1.2
}

VELOCITY_WINDOW_DAYS = 14
TREND_WINDOW_DAYS    = 7

RED_SELLTHROUGH_THRESHOLD   = 60
AMBER_SELLTHROUGH_THRESHOLD = 75
RED_DOC_MULTIPLIER          = 1.0
AMBER_DOC_MULTIPLIER        = 0.75

MARKDOWN_BANDS = {
    "red_critical": (30, 40),
    "red_moderate": (20, 30),
    "amber_decel":  (15, 20),
    "amber_stable": (10, 15),
}

ACTION_LEAD_DAYS = {"Red": 3, "Amber": 7}

CATEGORY_LIFT_MULTIPLIERS = {
    "Apparel":  1.5,
    "Footwear": 1.4,
    "Home":     1.3,
    "Default":  1.4,
}

COLUMN_ALIASES = {
    "sku":           ["sku", "sku_id", "product_id", "item_code"],
    "store":         ["store", "store_id", "branch", "location"],
    "date":          ["date", "txn_date", "sale_date", "transaction_date"],
    "units_sold":    ["units_sold", "qty", "quantity", "sold_units"],
    "stock_on_hand": ["stock_on_hand", "soh", "closing_stock", "inventory"],
    "category":      ["category", "category_name", "dept", "department"],
}
