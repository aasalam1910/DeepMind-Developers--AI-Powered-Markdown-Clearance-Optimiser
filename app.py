import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
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
TIER_BG     = {"Red": "#2D1515", "Amber": "#2D2010", "Green": "#0F2D1E"}
TIER_ICONS  = {"Red": "🔴", "Amber": "🟡", "Green": "🟢"}

# ── Global CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

/* Page background */
.stApp { background: #0F1117; }

/* Sidebar */
[data-testid="stSidebar"] {
    background: #161B27;
    border-right: 1px solid #2A3045;
}
[data-testid="stSidebar"] h1 { color: #F1F5F9; font-size: 1.1rem !important; }
[data-testid="stSidebar"] h2,
[data-testid="stSidebar"] h3 { color: #94A3B8; font-size: 0.75rem !important;
    text-transform: uppercase; letter-spacing: 0.08em; margin-top: 1.2rem; }

/* KPI cards */
.kpi-card {
    background: #161B27;
    border: 1px solid #2A3045;
    border-radius: 12px;
    padding: 20px 24px;
    text-align: center;
    transition: border-color 0.2s;
}
.kpi-card:hover { border-color: #475569; }
.kpi-value { font-size: 2.4rem; font-weight: 700; line-height: 1; margin-bottom: 4px; }
.kpi-label { font-size: 0.78rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; }

/* Section headers */
.section-title {
    font-size: 1rem; font-weight: 600; color: #CBD5E1;
    text-transform: uppercase; letter-spacing: 0.07em;
    margin: 0 0 12px 0; padding-bottom: 8px;
    border-bottom: 1px solid #2A3045;
}

/* Discount card */
.discount-card {
    border-radius: 10px;
    padding: 18px 22px;
    margin: 10px 0 14px 0;
    border-left: 5px solid;
}
.discount-pct  { font-size: 2rem; font-weight: 700; line-height: 1.1; }
.discount-range { font-size: 0.85rem; color: #94A3B8; font-weight: 400; margin-left: 8px; }
.discount-reason { font-size: 0.9rem; line-height: 1.6; margin-top: 6px; color: #CBD5E1; }
.discount-date  { font-size: 0.8rem; color: #64748B; margin-top: 8px; }

/* Rationale panels */
.rat-section-title {
    font-size: 0.75rem; font-weight: 600; color: #64748B;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
}
.rat-section-body { font-size: 0.9rem; color: #CBD5E1; line-height: 1.6; }

/* Dataframe clean look */
[data-testid="stDataFrame"] { border-radius: 10px; overflow: hidden; }

/* Divider */
hr { border-color: #2A3045 !important; }

/* Button */
.stButton > button {
    background: linear-gradient(135deg, #6366F1, #8B5CF6);
    color: white; border: none; border-radius: 8px;
    font-weight: 600; font-size: 0.88rem;
    padding: 10px 20px; transition: opacity 0.2s;
}
.stButton > button:hover { opacity: 0.88; color: white; }

/* Progress bar */
[data-testid="stProgressBar"] > div > div {
    background: linear-gradient(90deg, #6366F1, #10B981) !important;
}

/* Spinner */
.stSpinner > div { border-top-color: #6366F1 !important; }
</style>
""", unsafe_allow_html=True)


# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🏷️ Markdown Optimiser")
    st.caption("Team 27 — Deep Mind Developers")
    st.divider()

    st.markdown("### 📂 Data Input")
    pos_file   = st.file_uploader("POS Sales CSV", type="csv", key="pos_upload")
    inv_file   = st.file_uploader("Inventory Snapshot CSV", type="csv", key="inv_upload")
    load_sample = st.button("📊 Load Sample Data", use_container_width=True)

    st.markdown("### ⚙️ Season Config")
    season_start = st.date_input(
        "Season Start", value=pd.Timestamp(settings.SEASON_START_DATE).date()
    )
    season_end_input = st.date_input(
        "Season End", value=pd.Timestamp(settings.SEASON_END_DATE).date()
    )
    settings.SEASON_START_DATE = str(season_start)
    settings.SEASON_END_DATE   = str(season_end_input)


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


# ── Hero header ───────────────────────────────────────────────────────────────
st.markdown("""
<div style="background:linear-gradient(135deg,#1E293B 0%,#0F172A 100%);
     border:1px solid #2A3045;border-radius:14px;padding:28px 32px;margin-bottom:24px">
  <div style="display:flex;align-items:center;gap:14px">
    <span style="font-size:2.4rem">🏷️</span>
    <div>
      <h1 style="margin:0;font-size:1.6rem;font-weight:700;color:#F1F5F9">
        AI-Powered Markdown &amp; Clearance Optimiser
      </h1>
      <p style="margin:4px 0 0 0;font-size:0.9rem;color:#64748B">
        SKU-level markdown recommendations with explainable AI rationale
      </p>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

if pos_df is None or inv_df is None:
    st.markdown("""
    <div style="background:#161B27;border:1px dashed #2A3045;border-radius:12px;
         padding:48px;text-align:center">
      <div style="font-size:3rem;margin-bottom:12px">📂</div>
      <p style="color:#94A3B8;font-size:1rem;margin:0">
        Upload POS and Inventory CSVs in the sidebar, or click
        <strong style="color:#6366F1">Load Sample Data</strong> to get started.
      </p>
    </div>
    """, unsafe_allow_html=True)
    st.stop()

with st.spinner("Computing features and recommendations…"):
    features_df = compute_features(pos_df, inv_df)
    rec_df      = generate_recommendations(features_df)

# Season progress
today        = date.today()
total_days   = max((pd.Timestamp(settings.SEASON_END_DATE) - pd.Timestamp(settings.SEASON_START_DATE)).days, 1)
elapsed_days = max((pd.Timestamp(today) - pd.Timestamp(settings.SEASON_START_DATE)).days, 0)
days_remaining = max(total_days - elapsed_days, 0)
pct_elapsed  = min(elapsed_days / total_days, 1.0)

with st.sidebar:
    st.divider()
    st.markdown("### 📅 Season Progress")
    st.progress(pct_elapsed)
    c_e, c_r = st.columns(2)
    c_e.metric("Elapsed", f"{elapsed_days}d")
    c_r.metric("Remaining", f"{days_remaining}d")

    st.markdown("### 🔍 Filters")
    sel_store = st.multiselect("Store",        options=sorted(rec_df["store"].unique()))
    sel_tier  = st.multiselect("Urgency Tier", options=["Red", "Amber", "Green"])
    sel_cat   = st.multiselect("Category",     options=sorted(rec_df["category"].unique()))

# Apply filters
filtered = rec_df.copy()
if sel_store: filtered = filtered[filtered["store"].isin(sel_store)]
if sel_tier:  filtered = filtered[filtered["urgency_tier"].isin(sel_tier)]
if sel_cat:   filtered = filtered[filtered["category"].isin(sel_cat)]

# ── KPI cards ─────────────────────────────────────────────────────────────────
n_red   = int((rec_df["urgency_tier"] == "Red").sum())
n_amber = int((rec_df["urgency_tier"] == "Amber").sum())
n_green = int((rec_df["urgency_tier"] == "Green").sum())
n_total = len(rec_df)

c1, c2, c3, c4 = st.columns(4)
for col, value, label, color in [
    (c1, n_red,   "Critical — Red",    "#EF4444"),
    (c2, n_amber, "At Risk — Amber",   "#F59E0B"),
    (c3, n_green, "On Track — Green",  "#10B981"),
    (c4, n_total, "Total SKU × Store", "#6366F1"),
]:
    col.markdown(
        f'<div class="kpi-card" style="border-top:3px solid {color}">'
        f'<div class="kpi-value" style="color:{color}">{value}</div>'
        f'<div class="kpi-label">{label}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

st.markdown("<br>", unsafe_allow_html=True)

# ── Charts ────────────────────────────────────────────────────────────────────
CHART_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="#161B27",
    font=dict(family="Inter, sans-serif", color="#94A3B8", size=12),
    title_font=dict(color="#F1F5F9", size=14, family="Inter, sans-serif"),
    legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color="#CBD5E1")),
    margin=dict(t=48, l=12, r=12, b=12),
    xaxis=dict(gridcolor="#2A3045", linecolor="#2A3045", tickfont=dict(color="#64748B")),
    yaxis=dict(gridcolor="#2A3045", linecolor="#2A3045", tickfont=dict(color="#64748B")),
)

col_l, col_r = st.columns(2)

with col_l:
    bar_data = (
        rec_df.groupby(["store", "urgency_tier"])["sell_through_pct"]
        .mean().reset_index()
    )
    fig_bar = px.bar(
        bar_data, x="store", y="sell_through_pct", color="urgency_tier",
        color_discrete_map=TIER_COLORS,
        title="Avg Sell-Through Rate by Store",
        labels={"sell_through_pct": "Sell-Through %", "store": "Store", "urgency_tier": "Tier"},
        barmode="group",
    )
    fig_bar.update_layout(**CHART_LAYOUT)
    fig_bar.update_traces(marker_line_width=0)
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
    fig_scatter.update_layout(**CHART_LAYOUT)
    st.plotly_chart(fig_scatter, use_container_width=True)

# Treemap
treemap_data = (
    rec_df.groupby(["category", "urgency_tier"])
    .agg(stock_on_hand=("stock_on_hand", "sum"), sku_count=("sku", "count"))
    .reset_index()
)
cat_totals = treemap_data.groupby("category")["stock_on_hand"].sum().rename("cat_total")
treemap_data = treemap_data.join(cat_totals, on="category")
treemap_data["pct_of_category"] = (
    treemap_data["stock_on_hand"] / treemap_data["cat_total"] * 100
).round(1)

fig_tree = px.treemap(
    treemap_data,
    path=["category", "urgency_tier"],
    values="stock_on_hand",
    color="urgency_tier",
    color_discrete_map=TIER_COLORS,
    custom_data=["sku_count", "pct_of_category"],
    title="Inventory at Risk by Category  —  block size = units on hand",
)
fig_tree.update_traces(
    texttemplate=(
        "<b>%{label}</b><br>"
        "%{value:,} units<br>"
        "%{customdata[0]} SKUs · %{customdata[1]:.1f}% of cat."
    ),
    textfont=dict(size=13, family="Inter, sans-serif"),
    hovertemplate=(
        "<b>%{label}</b><br>"
        "Stock on hand: <b>%{value:,} units</b><br>"
        "SKU count: <b>%{customdata[0]}</b><br>"
        "Share of category: <b>%{customdata[1]:.1f}%</b>"
        "<extra></extra>"
    ),
)
fig_tree.update_layout(
    height=480,
    paper_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, sans-serif", color="#F1F5F9"),
    title_font=dict(color="#F1F5F9", size=14),
    margin=dict(t=48, l=8, r=8, b=8),
)
st.plotly_chart(fig_tree, use_container_width=True)

st.divider()

# ── SKU table ─────────────────────────────────────────────────────────────────
st.markdown('<p class="section-title">📋 SKU Recommendations</p>', unsafe_allow_html=True)

if filtered.empty:
    st.info("No SKUs match current filters.")
    st.stop()

display_cols = [
    "sku", "store", "category", "urgency_tier",
    "markdown_band", "markdown_pct",
    "stock_on_hand", "velocity_14d", "days_of_cover", "sell_through_pct",
]
col_labels = {
    "sku": "SKU", "store": "Store", "category": "Category",
    "urgency_tier": "Tier", "markdown_band": "Band", "markdown_pct": "Discount %",
    "stock_on_hand": "Stock", "velocity_14d": "Velocity/day",
    "days_of_cover": "Days Cover", "sell_through_pct": "Sell-Through %",
}
display_df = filtered[display_cols].round(2).rename(columns=col_labels)

event = st.dataframe(
    display_df,
    use_container_width=True,
    on_select="rerun",
    selection_mode="single-row",
    hide_index=True,
)

# ── SKU detail panel ──────────────────────────────────────────────────────────
if event.selection.rows:
    row_idx   = event.selection.rows[0]
    sel_row   = filtered.iloc[row_idx]
    sku       = sel_row["sku"]
    store_name = sel_row["store"]
    tier      = sel_row["urgency_tier"]
    tier_color = TIER_COLORS[tier]
    tier_icon  = TIER_ICONS[tier]

    st.markdown("<br>", unsafe_allow_html=True)

    # Selected SKU header
    st.markdown(
        f'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
        f'<span style="font-size:1.5rem">{tier_icon}</span>'
        f'<div>'
        f'<span style="font-size:1.05rem;font-weight:600;color:#F1F5F9">{sku}</span>'
        f'<span style="color:#64748B;margin:0 6px">@</span>'
        f'<span style="font-size:1.05rem;font-weight:600;color:#F1F5F9">{store_name}</span>'
        f'<span style="margin-left:12px;padding:3px 10px;border-radius:20px;font-size:0.75rem;'
        f'font-weight:600;background:{TIER_BG.get(tier,"#1E293B")};color:{tier_color};'
        f'border:1px solid {tier_color}">{tier}</span>'
        f'</div></div>',
        unsafe_allow_html=True,
    )

    # Discount card
    band        = sel_row.get("markdown_band", f"{int(sel_row['markdown_pct'])}%")
    reason      = sel_row.get("markdown_reason", "")
    action_date = sel_row.get("action_by_date", "")
    bg_card     = {"Red": "#1A0A0A", "Amber": "#1A1200", "Green": "#071A0F"}.get(tier, "#161B27")
    action_html = (
        f'<p class="discount-date">⏰ Action by: <strong>{action_date}</strong></p>'
        if action_date else ""
    )

    st.markdown(
        f'<div class="discount-card" style="background:{bg_card};border-left-color:{tier_color}">'
        f'<p class="discount-pct" style="color:{tier_color}">'
        f'{int(sel_row["markdown_pct"])}% Discount'
        f'<span class="discount-range">recommended range: {band}</span>'
        f'</p>'
        f'<p class="discount-reason">{reason}</p>'
        f'{action_html}'
        f'</div>',
        unsafe_allow_html=True,
    )

    # Metrics row
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Stock on Hand",  f"{int(sel_row['stock_on_hand'])} units")
    m2.metric("Daily Velocity", f"{sel_row['velocity_14d']:.1f} u/day")
    doc_val = f"{sel_row['days_of_cover']:.0f} days" if pd.notna(sel_row['days_of_cover']) else "N/A"
    m3.metric("Days of Cover",  doc_val)
    m4.metric("Sell-Through",   f"{sel_row['sell_through_pct']:.1f}%")

    st.markdown("<br>", unsafe_allow_html=True)

    # AI Rationale
    rationale_key = f"rationale_{sku}_{store_name}"

    if rationale_key in st.session_state:
        rd         = get_or_generate_rationale(sku, store_name, sel_row)
        conf_label = rd.get("confidence", "N/A").split("\n")[0][:60]
        with st.expander(
            f"{tier_icon} AI Rationale — {sku} @ {store_name}   ·   Confidence: {conf_label}",
            expanded=False,
        ):
            _r1, _r2 = st.columns(2)
            with _r1:
                st.markdown('<p class="rat-section-title">📊 Why This Discount</p>', unsafe_allow_html=True)
                st.markdown(f'<p class="rat-section-body">{rd.get("rationale_why") or "—"}</p>', unsafe_allow_html=True)
                st.markdown('<p class="rat-section-title" style="margin-top:16px">✅ What Will Happen</p>', unsafe_allow_html=True)
                st.markdown(f'<p class="rat-section-body">{rd.get("rationale_outcome") or "—"}</p>', unsafe_allow_html=True)
            with _r2:
                st.markdown('<p class="rat-section-title">⚠️ If Not Applied</p>', unsafe_allow_html=True)
                st.markdown(f'<p class="rat-section-body">{rd.get("rationale_consequence") or "—"}</p>', unsafe_allow_html=True)
                st.markdown('<p class="rat-section-title" style="margin-top:16px">🎯 Confidence</p>', unsafe_allow_html=True)
                st.markdown(f'<p class="rat-section-body">{rd.get("confidence") or "—"}</p>', unsafe_allow_html=True)

    elif tier in ("Red", "Amber"):
        if st.button(f"✨ Generate AI Rationale for {sku} @ {store_name}"):
            with st.spinner("Generating rationale via Groq…"):
                rd = get_or_generate_rationale(sku, store_name, sel_row)
            conf_label = rd.get("confidence", "N/A").split("\n")[0][:60]
            with st.expander(
                f"{tier_icon} AI Rationale — {sku} @ {store_name}   ·   Confidence: {conf_label}",
                expanded=True,
            ):
                _r1, _r2 = st.columns(2)
                with _r1:
                    st.markdown('<p class="rat-section-title">📊 Why This Discount</p>', unsafe_allow_html=True)
                    st.markdown(f'<p class="rat-section-body">{rd.get("rationale_why") or "—"}</p>', unsafe_allow_html=True)
                    st.markdown('<p class="rat-section-title" style="margin-top:16px">✅ What Will Happen</p>', unsafe_allow_html=True)
                    st.markdown(f'<p class="rat-section-body">{rd.get("rationale_outcome") or "—"}</p>', unsafe_allow_html=True)
                with _r2:
                    st.markdown('<p class="rat-section-title">⚠️ If Not Applied</p>', unsafe_allow_html=True)
                    st.markdown(f'<p class="rat-section-body">{rd.get("rationale_consequence") or "—"}</p>', unsafe_allow_html=True)
                    st.markdown('<p class="rat-section-title" style="margin-top:16px">🎯 Confidence</p>', unsafe_allow_html=True)
                    st.markdown(f'<p class="rat-section-body">{rd.get("confidence") or "—"}</p>', unsafe_allow_html=True)
    else:
        st.markdown(
            '<div style="background:#071A0F;border:1px solid #10B981;border-radius:8px;'
            'padding:12px 16px;color:#10B981;font-size:0.9rem">'
            '✅ Green SKU — selling well, no markdown needed.</div>',
            unsafe_allow_html=True,
        )

# ── Sidebar export ────────────────────────────────────────────────────────────
with st.sidebar:
    st.divider()
    st.markdown("### 📥 Export")
    export_df = filtered.copy()

    def _export_rationale(r):
        val = st.session_state.get(f"rationale_{r['sku']}_{r['store']}", "")
        if not val:
            return ""
        if isinstance(val, str):
            return val
        parts = []
        if val.get("rationale_why"):        parts.append(f"WHY: {val['rationale_why']}")
        if val.get("rationale_outcome"):    parts.append(f"OUTCOME: {val['rationale_outcome']}")
        if val.get("rationale_consequence"):parts.append(f"RISK: {val['rationale_consequence']}")
        if val.get("confidence"):           parts.append(f"CONFIDENCE: {val['confidence']}")
        return "\n\n".join(parts)

    export_df["rationale"] = export_df.apply(_export_rationale, axis=1)
    excel_buf = build_action_sheet(export_df)
    st.download_button(
        label="⬇️ Download Action Sheet",
        data=excel_buf,
        file_name="markdown_recommendations.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )
