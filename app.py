import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import date

from src.ingestion import load_and_validate, ValidationError
from src.features import compute_features
from src.recommender import generate_recommendations
from src.rationale import get_or_generate_rationale
from src.export import build_action_sheet
from config import settings

st.set_page_config(
    page_title="Markdown & Clearance Optimiser",
    page_icon="🏷️",
    layout="wide",
)

TIER_COLORS = {"Red": "#EF4444", "Amber": "#F59E0B", "Green": "#10B981"}


# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.title("🏷️ Markdown Optimiser")
    st.caption("Team 27 — Deep Mind Developers")

    st.header("📂 Data Input")
    pos_file = st.file_uploader("POS Sales CSV", type="csv", key="pos_upload")
    inv_file = st.file_uploader("Inventory Snapshot CSV", type="csv", key="inv_upload")
    load_sample = st.button("📊 Load Sample Data", use_container_width=True)

    st.header("⚙️ Season Config")
    season_start = st.date_input(
        "Season Start", value=pd.Timestamp(settings.SEASON_START_DATE).date()
    )
    season_end_input = st.date_input(
        "Season End", value=pd.Timestamp(settings.SEASON_END_DATE).date()
    )
    settings.SEASON_START_DATE = str(season_start)
    settings.SEASON_END_DATE = str(season_end_input)


# ── Load data ─────────────────────────────────────────────────────────────────
pos_df, inv_df = None, None

if load_sample:
    try:
        pos_df, inv_df = load_and_validate(
            "data/sample/pos_sales_sample.csv",
            "data/sample/inventory_sample.csv",
        )
    except (ValidationError, FileNotFoundError) as e:
        st.sidebar.error(str(e))

elif pos_file and inv_file:
    try:
        pos_df, inv_df = load_and_validate(pos_file, inv_file)
    except ValidationError as e:
        st.sidebar.error(str(e))


# ── Main area ─────────────────────────────────────────────────────────────────
st.title("AI-Powered Markdown & Clearance Optimiser")
st.caption("SKU-level markdown recommendations with explainable AI rationale.")

if pos_df is None or inv_df is None:
    st.info("👆 Upload POS and Inventory CSVs in the sidebar, or click **Load Sample Data**.")
    st.stop()

with st.spinner("Computing features and recommendations…"):
    features_df = compute_features(pos_df, inv_df)
    rec_df = generate_recommendations(features_df)

# Season progress
today = date.today()
total_days = max(
    (pd.Timestamp(settings.SEASON_END_DATE) - pd.Timestamp(settings.SEASON_START_DATE)).days, 1
)
elapsed_days = max(
    (pd.Timestamp(today) - pd.Timestamp(settings.SEASON_START_DATE)).days, 0
)
days_remaining = max(total_days - elapsed_days, 0)

with st.sidebar:
    st.header("📅 Season Progress")
    st.progress(min(elapsed_days / total_days, 1.0))
    st.caption(f"**{days_remaining}** days remaining in season")

    st.header("🔍 Filters")
    sel_store = st.multiselect("Store", options=sorted(rec_df["store"].unique()))
    sel_tier = st.multiselect("Urgency Tier", options=["Red", "Amber", "Green"])
    sel_cat = st.multiselect("Category", options=sorted(rec_df["category"].unique()))

# Apply filters
filtered = rec_df.copy()
if sel_store:
    filtered = filtered[filtered["store"].isin(sel_store)]
if sel_tier:
    filtered = filtered[filtered["urgency_tier"].isin(sel_tier)]
if sel_cat:
    filtered = filtered[filtered["category"].isin(sel_cat)]

# KPI cards
c1, c2, c3, c4 = st.columns(4)
c1.metric("🔴 Red — Critical",   int((rec_df["urgency_tier"] == "Red").sum()))
c2.metric("🟡 Amber — At Risk",  int((rec_df["urgency_tier"] == "Amber").sum()))
c3.metric("🟢 Green — On Track", int((rec_df["urgency_tier"] == "Green").sum()))
c4.metric("📦 Total SKU×Store",  len(rec_df))

st.divider()

# Charts
col_l, col_r = st.columns(2)

with col_l:
    bar_data = (
        rec_df.groupby(["store", "urgency_tier"])["sell_through_pct"]
        .mean()
        .reset_index()
    )
    fig_bar = px.bar(
        bar_data, x="store", y="sell_through_pct", color="urgency_tier",
        color_discrete_map=TIER_COLORS,
        title="Avg Sell-Through Rate by Store",
        labels={"sell_through_pct": "Sell-Through %", "store": "Store", "urgency_tier": "Tier"},
        barmode="group",
    )
    st.plotly_chart(fig_bar, use_container_width=True)

with col_r:
    scatter_data = rec_df.dropna(subset=["days_of_cover"])
    fig_scatter = px.scatter(
        scatter_data, x="velocity_14d", y="days_of_cover",
        color="urgency_tier", size="stock_on_hand",
        color_discrete_map=TIER_COLORS,
        title="Days of Cover vs Velocity",
        labels={"velocity_14d": "Daily Velocity (units)", "days_of_cover": "Days of Cover"},
        hover_data=["sku", "store"],
    )
    st.plotly_chart(fig_scatter, use_container_width=True)

treemap_data = (
    rec_df.groupby(["category", "urgency_tier"])["stock_on_hand"].sum().reset_index()
)
fig_tree = px.treemap(
    treemap_data, path=["category", "urgency_tier"], values="stock_on_hand",
    color="urgency_tier", color_discrete_map=TIER_COLORS,
    title="Inventory at Risk by Category",
)
st.plotly_chart(fig_tree, use_container_width=True)

st.divider()

# SKU table + rationale
st.subheader("📋 SKU Recommendations")

if filtered.empty:
    st.info("No SKUs match current filters.")
    st.stop()

display_cols = [
    "sku", "store", "category", "urgency_tier", "markdown_pct",
    "stock_on_hand", "velocity_14d", "days_of_cover", "sell_through_pct",
]
display_df = filtered[display_cols].round(2)

event = st.dataframe(
    display_df,
    use_container_width=True,
    on_select="rerun",
    selection_mode="single-row",
    hide_index=True,
)

if event.selection.rows:
    row_idx = event.selection.rows[0]
    sel_row = filtered.iloc[row_idx]
    sku, store_name = sel_row["sku"], sel_row["store"]
    tier = sel_row["urgency_tier"]

    st.markdown(
        f"**Selected:** `{sku}` @ `{store_name}` — "
        f"Tier: **{tier}** — Markdown: **{int(sel_row['markdown_pct'])}%**"
    )

    rationale_key = f"rationale_{sku}_{store_name}"
    if rationale_key in st.session_state:
        st.success(st.session_state[rationale_key])
    elif tier in ("Red", "Amber"):
        if st.button(f"✨ Generate Rationale for {sku} @ {store_name}"):
            with st.spinner("Generating rationale via Groq…"):
                rationale = get_or_generate_rationale(sku, store_name, sel_row)
            st.success(rationale)
    else:
        st.info("Green SKU — selling well, no markdown needed.")

# Export button (in sidebar, always visible)
with st.sidebar:
    st.header("📥 Export")
    export_df = filtered.copy()
    export_df["rationale"] = export_df.apply(
        lambda r: st.session_state.get(f"rationale_{r['sku']}_{r['store']}", ""),
        axis=1,
    )
    excel_buf = build_action_sheet(export_df)
    st.download_button(
        label="⬇️ Download Action Sheet",
        data=excel_buf,
        file_name="markdown_recommendations.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )
