import os
from dotenv import load_dotenv

load_dotenv()

# Declare the Groq model identifier explicitly for src/rationale.py to import
LLM_MODEL = "llama-3.3-70b-versatile"

# Safely grab your Groq API key from the environment configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
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

FESTIVAL_DEFAULT_BOOSTS = {
    # ── Pan-India ──────────────────────────────────────────────────────────────
    "Diwali":             {"Apparel": 1.5, "Footwear": 1.3, "Home": 1.4, "Accessories": 1.3, "Kurtas": 1.6, "Western Wear": 1.3, "Default": 1.2},
    "Navratri":           {"Apparel": 1.5, "Footwear": 1.2, "Home": 1.1, "Accessories": 1.3, "Kurtas": 1.6, "Western Wear": 1.4, "Default": 1.2},
    "Durga Puja":         {"Apparel": 1.5, "Footwear": 1.3, "Home": 1.2, "Accessories": 1.3, "Kurtas": 1.5, "Western Wear": 1.3, "Default": 1.2},
    "Holi":               {"Apparel": 1.3, "Footwear": 1.1, "Home": 1.1, "Accessories": 1.2, "Kurtas": 1.3, "Western Wear": 1.2, "Default": 1.1},
    "Janmashtami":        {"Apparel": 1.2, "Footwear": 1.1, "Home": 1.2, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.1, "Default": 1.1},
    "Ram Navami":         {"Apparel": 1.2, "Footwear": 1.1, "Home": 1.1, "Accessories": 1.1, "Kurtas": 1.3, "Western Wear": 1.1, "Default": 1.1},
    "Ganesh Chaturthi":   {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.3, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.2},
    "Ramzan":             {"Apparel": 1.6, "Footwear": 1.3, "Home": 1.3, "Accessories": 1.4, "Kurtas": 1.7, "Western Wear": 1.3, "Default": 1.3},
    "Eid ul-Fitr":        {"Apparel": 1.6, "Footwear": 1.4, "Home": 1.2, "Accessories": 1.4, "Kurtas": 1.7, "Western Wear": 1.3, "Default": 1.2},
    "Eid ul-Adha":        {"Apparel": 1.4, "Footwear": 1.3, "Home": 1.2, "Accessories": 1.3, "Kurtas": 1.5, "Western Wear": 1.2, "Default": 1.1},
    "Milad-un-Nabi":      {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.1, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    "Christmas":          {"Apparel": 1.4, "Footwear": 1.3, "Home": 1.5, "Accessories": 1.3, "Kurtas": 1.2, "Western Wear": 1.4, "Default": 1.3},
    "New Year":           {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.2, "Accessories": 1.3, "Kurtas": 1.2, "Western Wear": 1.4, "Default": 1.2},
    # ── North India ────────────────────────────────────────────────────────────
    "Lohri":              {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.2, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.2},
    "Makar Sankranti":    {"Apparel": 1.2, "Footwear": 1.1, "Home": 1.2, "Accessories": 1.1, "Kurtas": 1.3, "Western Wear": 1.1, "Default": 1.1},
    "Baisakhi":           {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.1, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    "Karva Chauth":       {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.1, "Accessories": 1.4, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.2},
    "Teej":               {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.1, "Accessories": 1.3, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    "Chhath Puja":        {"Apparel": 1.2, "Footwear": 1.1, "Home": 1.1, "Accessories": 1.2, "Kurtas": 1.3, "Western Wear": 1.1, "Default": 1.1},
    # ── South India ────────────────────────────────────────────────────────────
    "Pongal":             {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.3, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    "Ugadi":              {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.2, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    "Onam":               {"Apparel": 1.4, "Footwear": 1.2, "Home": 1.3, "Accessories": 1.2, "Kurtas": 1.5, "Western Wear": 1.2, "Default": 1.2},
    "Vishu":              {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.2, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    "Tamil New Year":     {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.2, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    "Varalakshmi Vratam": {"Apparel": 1.2, "Footwear": 1.1, "Home": 1.2, "Accessories": 1.3, "Kurtas": 1.3, "Western Wear": 1.1, "Default": 1.1},
    "Karthigai Deepam":   {"Apparel": 1.2, "Footwear": 1.1, "Home": 1.3, "Accessories": 1.2, "Kurtas": 1.3, "Western Wear": 1.1, "Default": 1.1},
    # ── East India ─────────────────────────────────────────────────────────────
    "Bihu":               {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.2, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    "Rath Yatra":         {"Apparel": 1.2, "Footwear": 1.1, "Home": 1.2, "Accessories": 1.1, "Kurtas": 1.3, "Western Wear": 1.1, "Default": 1.1},
    "Poila Boishakh":     {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.2, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    # ── West India ─────────────────────────────────────────────────────────────
    "Gudi Padwa":         {"Apparel": 1.3, "Footwear": 1.2, "Home": 1.2, "Accessories": 1.2, "Kurtas": 1.4, "Western Wear": 1.2, "Default": 1.1},
    "Uttarayan":          {"Apparel": 1.2, "Footwear": 1.1, "Home": 1.1, "Accessories": 1.2, "Kurtas": 1.2, "Western Wear": 1.1, "Default": 1.1},
    # ── Default fallback ───────────────────────────────────────────────────────
    "Default":            {"Default": 1.1},
}

COLUMN_ALIASES = {
    "sku":           ["sku", "sku_id", "product_id", "item_code"],
    "store":         ["store", "store_id", "branch", "location"],
    "date":          ["date", "txn_date", "sale_date", "transaction_date"],
    "units_sold":    ["units_sold", "qty", "quantity", "sold_units"],
    "stock_on_hand": ["stock_on_hand", "soh", "closing_stock", "inventory"],
    "category":      ["category", "category_name", "dept", "department"],
}