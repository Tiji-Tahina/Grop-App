"""
OLAP Data Warehouse — Madagascar Agriculture
Cube: Region × Crop × Year
Metrics: Yield (kg/ha), Production (t), Price (Ar/kg)

Run from backend/:
    python data_werehouse/dw_madagascar.py
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import CheckButtons, Button, RadioButtons

# ═══════════════════════════════════════════════════════════════
# 1. DIMENSIONS
# ═══════════════════════════════════════════════════════════════

REGIONS = [
    "Diana", "Sava", "Analanjirofo", "Atsinanana", "Vatovavy-Fitovinany",
    "Atsimo-Atsinanana", "Anosy", "Androy", "Atsimo-Andrefana", "Menabe",
    "Melaky", "Boeny", "Sofia", "Betsiboka", "Analamanga",
    "Itasy", "Bongolava", "Vakinankaratra", "Amoron'i Mania", "Haute Matsiatra",
    "Ihorombe", "Alaotra-Mangoro",
]

CULTURES = ["Riz", "Manioc", "Maïs", "Vanille", "Girofle", "Café",
            "Haricot", "Patate douce", "Arachide"]

ANNEES   = [2020, 2021, 2022, 2023, 2024]
METRIQUES = ["Rendement (kg/ha)", "Production (t)", "Prix (Ar/kg)"]

# ═══════════════════════════════════════════════════════════════
# 2. BASE PARAMETERS
# ═══════════════════════════════════════════════════════════════

BASE_RENDEMENT = {
    "Riz": 2500, "Manioc": 7000, "Maïs": 1800, "Vanille": 150,
    "Girofle": 400, "Café": 500, "Haricot": 900,
    "Patate douce": 6000, "Arachide": 1200,
}

BASE_PRIX = {
    "Riz": 2400, "Manioc": 750, "Maïs": 1500, "Vanille": 140000,
    "Girofle": 90000, "Café": 9000, "Haricot": 3500,
    "Patate douce": 900, "Arachide": 4500,
}

# Total region area (thousands of hectares)
REGION_AREA = {
    "Diana": 18, "Sava": 22, "Analanjirofo": 15, "Atsinanana": 20,
    "Vatovavy-Fitovinany": 18, "Atsimo-Atsinanana": 12, "Anosy": 8,
    "Androy": 5, "Atsimo-Andrefana": 6, "Menabe": 14, "Melaky": 10,
    "Boeny": 20, "Sofia": 35, "Betsiboka": 12, "Analamanga": 25,
    "Itasy": 18, "Bongolava": 14, "Vakinankaratra": 30, "Amoron'i Mania": 16,
    "Haute Matsiatra": 20, "Ihorombe": 8, "Alaotra-Mangoro": 45,
}

# Regional production factor by crop (0 = absent)
REGIONAL_FACTORS = {
    "Riz": {
        "Alaotra-Mangoro": 1.25, "Sofia": 1.10, "Vakinankaratra": 0.90,
        "Itasy": 0.95, "Betsiboka": 0.85, "Boeny": 0.80, "Analamanga": 0.75,
        "Haute Matsiatra": 0.70, "Amoron'i Mania": 0.70, "Bongolava": 0.65,
        "Diana": 0.60, "Analanjirofo": 0.55, "Menabe": 0.50,
        "Atsinanana": 0.65, "Vatovavy-Fitovinany": 0.60,
    },
    "Manioc": {
        "Sofia": 1.15, "Boeny": 1.00, "Menabe": 0.90, "Melaky": 0.85,
        "Atsimo-Andrefana": 0.80, "Betsiboka": 0.80, "Diana": 0.75,
        "Anosy": 0.70, "Androy": 0.65, "Bongolava": 0.70,
        "Atsinanana": 0.65, "Vatovavy-Fitovinany": 0.70,
    },
    "Maïs": {
        "Vakinankaratra": 1.10, "Haute Matsiatra": 1.00, "Bongolava": 0.90,
        "Analamanga": 0.85, "Ihorombe": 0.80, "Amoron'i Mania": 0.80,
        "Itasy": 0.75, "Menabe": 0.70,
    },
    "Vanille": {
        "Sava": 1.50, "Analanjirofo": 1.00, "Diana": 0.70,
    },
    "Girofle": {
        "Analanjirofo": 1.30, "Diana": 1.10, "Atsinanana": 1.00,
    },
    "Café": {
        "Vatovavy-Fitovinany": 1.20, "Atsimo-Atsinanana": 1.00, "Analanjirofo": 0.90,
    },
    "Haricot": {
        "Vakinankaratra": 1.10, "Analamanga": 1.00, "Itasy": 0.95,
        "Amoron'i Mania": 0.90, "Haute Matsiatra": 0.85,
    },
    "Patate douce": {
        "Vakinankaratra": 1.20, "Analamanga": 1.00, "Amoron'i Mania": 1.00,
        "Itasy": 0.95, "Haute Matsiatra": 0.90,
    },
    "Arachide": {
        "Ihorombe": 1.20, "Menabe": 1.10, "Atsimo-Andrefana": 1.00,
        "Anosy": 0.90, "Androy": 0.80,
    },
}

# ═══════════════════════════════════════════════════════════════
# 3. CUBE CONSTRUCTION
# cube[ri, ci, ai, mi]  →  ri=region, ci=crop, ai=year, mi=metric
# ═══════════════════════════════════════════════════════════════

cube = np.zeros((len(REGIONS), len(CULTURES), len(ANNEES), 3))

for ri, region in enumerate(REGIONS):
    area_kha = REGION_AREA.get(region, 10)
    for ci, culture in enumerate(CULTURES):
        factor = REGIONAL_FACTORS.get(culture, {}).get(region, 0.0)
        if factor == 0.0:
            continue
        base_rend = BASE_RENDEMENT[culture] * factor
        base_prix = BASE_PRIX[culture]
        for ai in range(len(ANNEES)):
            rendement  = base_rend * (1.02 ** ai)
            prix       = base_prix * (1.03 ** ai)
            # production (t) = yield(kg/ha) * area(ha) / 1000
            production = rendement * (area_kha * factor * 0.25) * 1000 / 1000
            cube[ri, ci, ai, 0] = round(rendement)
            cube[ri, ci, ai, 1] = round(production)
            cube[ri, ci, ai, 2] = round(prix)

# ── Real data (override) ────────────────────────────────

def _set(region, culture, annee, rendement, production, prix):
    ri = REGIONS.index(region)
    ci = CULTURES.index(culture)
    ai = ANNEES.index(annee)
    cube[ri, ci, ai] = [rendement, production, prix]

_set("Alaotra-Mangoro", "Riz",     2020, 2800, 38000,  2500)
_set("Alaotra-Mangoro", "Riz",     2021, 3000, 42500,  2600)
_set("Alaotra-Mangoro", "Riz",     2022, 3100, 44000,  2700)
_set("Alaotra-Mangoro", "Riz",     2023, 3150, 45200,  2800)
_set("Alaotra-Mangoro", "Riz",     2024, 3200, 45000,  2900)
_set("Sofia",           "Manioc",  2020, 7800, 55000,   800)
_set("Sofia",           "Manioc",  2021, 8000, 58000,   850)
_set("Sofia",           "Manioc",  2024, 8500, 62000,   900)
_set("Sava",            "Vanille", 2020,  180,   320, 150000)
_set("Sava",            "Vanille", 2024,  220,   450, 180000)
_set("Diana",           "Girofle", 2024,  450,  1200,  95000)

# ═══════════════════════════════════════════════════════════════
# 4. OLAP STATE
# ═══════════════════════════════════════════════════════════════

state = {
    "regions":   [True]  * len(REGIONS),    # visibility
    "cultures":  [True]  * len(CULTURES),
    "annee_idx": 4,                          # 2024 by default
    "metrique":  0,                          # Yield
    "sel_reg":   [False] * len(REGIONS),     # selection for SLICE/DICE
    "sel_cul":   [False] * len(CULTURES),
}

# ═══════════════════════════════════════════════════════════════
# 5. CURRENT VIEW
# ═══════════════════════════════════════════════════════════════

def get_view():
    """Return filtered data based on OLAP state."""
    ai   = state["annee_idx"]
    mi   = state["metrique"]
    regs = [i for i, v in enumerate(state["regions"])  if v]
    culs = [i for i, v in enumerate(state["cultures"]) if v]

    if not regs or not culs:
        return np.zeros((0, 0)), [], []

    view = np.zeros((len(regs), len(culs)))
    for i, ri in enumerate(regs):
        for j, ci in enumerate(culs):
            view[i, j] = cube[ri, ci, ai, mi]

    reg_labels = [REGIONS[i]  for i in regs]
    cul_labels = [CULTURES[i] for i in culs]
    return view, reg_labels, cul_labels

# ═══════════════════════════════════════════════════════════════
# 6. OLAP OPERATIONS
# ═══════════════════════════════════════════════════════════════

def handle_slice(event):
    """SLICE: Isolate a single slice (first checked item on each axis)."""
    sel_r = [i for i, v in enumerate(state["sel_reg"]) if v]
    sel_c = [i for i, v in enumerate(state["sel_cul"]) if v]
    if sel_r:
        for i in range(len(REGIONS)):
            state["regions"][i] = (i == sel_r[0])
    if sel_c:
        for i in range(len(CULTURES)):
            state["cultures"][i] = (i == sel_c[0])
    update_plot()

def handle_dice(event):
    """DICE: Filter based on all checked boxes."""
    sel_r = [i for i, v in enumerate(state["sel_reg"]) if v]
    sel_c = [i for i, v in enumerate(state["sel_cul"]) if v]
    if sel_r:
        for i in range(len(REGIONS)):
            state["regions"][i] = (i in sel_r)
    if sel_c:
        for i in range(len(CULTURES)):
            state["cultures"][i] = (i in sel_c)
    update_plot()

def handle_rollup(event):
    """ROLLUP: Aggregate all years (average) — displays average on Z axis."""
    state["annee_idx"] = -1  # signal "all years"
    update_plot()

def handle_reset(event):
    """RESET: Reset everything to default values."""
    for i in range(len(REGIONS)):
        state["regions"][i]  = True
        state["sel_reg"][i]  = False
    for i in range(len(CULTURES)):
        state["cultures"][i] = True
        state["sel_cul"][i]  = False
    state["annee_idx"] = 4
    state["metrique"]  = 0
    # Reset UI checkboxes
    for ci, checked in enumerate(chk_reg.get_status()):
        if not checked:
            chk_reg.set_active(ci)
    for ci, checked in enumerate(chk_cul.get_status()):
        if not checked:
            chk_cul.set_active(ci)
    update_plot()

# ═══════════════════════════════════════════════════════════════
# 7. VISUALIZATION
# ═══════════════════════════════════════════════════════════════

# Color palette by crop (index-based)
CULTURE_COLORS = [
    "#4CAF50",  # Riz — green
    "#8D6E63",  # Manioc — brown
    "#FDD835",  # Maïs — yellow
    "#7B1FA2",  # Vanille — purple
    "#FF7043",  # Girofle — orange
    "#795548",  # Café — coffee brown
    "#26A69A",  # Haricot — teal
    "#EF5350",  # Patate douce — red
    "#78909C",  # Arachide — blue grey
]

fig = plt.figure(figsize=(17, 10), facecolor='#0a0f14')
ax  = fig.add_subplot(111, projection='3d', facecolor='#0a0f14')
plt.subplots_adjust(left=0.26, right=0.99, bottom=0.20, top=0.93)

def update_plot(event=None):
    ax.clear()
    ax.set_facecolor('#0a0f14')

    ai = state["annee_idx"]
    mi = state["metrique"]

    # ── ROLLUP handling (all years) ───────────────────────
    if ai == -1:
        regs  = [i for i, v in enumerate(state["regions"])  if v]
        culs  = [i for i, v in enumerate(state["cultures"]) if v]
        if not regs or not culs:
            ax.set_title("No data selected", color='white')
            fig.canvas.draw_idle()
            return
        view      = np.mean(cube[np.ix_(regs, culs, list(range(len(ANNEES))), [mi])], axis=2).squeeze()
        annee_lbl = "2020–2024 (average)"
        reg_labels = [REGIONS[i]  for i in regs]
        cul_labels = [CULTURES[i] for i in culs]
    else:
        view, reg_labels, cul_labels = get_view()
        annee_lbl = str(ANNEES[ai])
        if view.size == 0:
            ax.set_title("No data selected", color='white')
            fig.canvas.draw_idle()
            return

    n_reg = len(reg_labels)
    n_cul = len(cul_labels)

    # Bar spacing
    bar_w = 0.6
    bar_d = 0.6
    gap_x = 1.0   # between crops
    gap_y = 1.2   # between regions

    for ci in range(n_cul):
        color = CULTURE_COLORS[ci % len(CULTURE_COLORS)]
        for ri in range(n_reg):
            val = view[ri, ci] if view.ndim == 2 else view[ci]
            if val <= 0:
                continue
            x = ci * gap_x
            y = ri * gap_y
            ax.bar3d(x, y, 0, bar_w, bar_d, val,
                     color=color, alpha=0.82,
                     edgecolor=(1, 1, 1, 0.15), linewidth=0.4)
            # Label on top
            ax.text(x + bar_w/2, y + bar_d/2, val,
                    f"{val:,.0f}",
                    color='white', fontsize=6.5, ha='center', va='bottom',
                    fontweight='bold')

    # Axes
    x_ticks = np.arange(n_cul) * gap_x + bar_w/2
    y_ticks = np.arange(n_reg) * gap_y + bar_d/2
    ax.set_xticks(x_ticks)
    ax.set_xticklabels(cul_labels, color='#00E5CC', fontsize=8, rotation=20, ha='right')
    ax.set_yticks(y_ticks)
    ax.set_yticklabels(reg_labels, color='#00E5CC', fontsize=8)
    ax.set_zlabel(METRIQUES[mi], color='#aaaaaa', fontsize=8)
    ax.zaxis.label.set_color('#aaaaaa')
    ax.tick_params(colors='#888888', labelsize=7)

    ax.set_xlabel("Crop", color='#aaaaaa', fontsize=9)
    ax.set_ylabel("Region",  color='#aaaaaa', fontsize=9)
    ax.set_title(
        f"MADAGASCAR AGRICULTURAL OLAP — {METRIQUES[mi]}  ·  {annee_lbl}",
        color='white', fontsize=11, pad=12
    )

    # Subtle grid
    ax.grid(True, color=(0.31, 0.31, 0.31, 0.3), linewidth=0.4)
    ax.xaxis.pane.fill = False
    ax.yaxis.pane.fill = False
    ax.zaxis.pane.fill = False
    ax.xaxis.pane.set_edgecolor((0.31, 0.31, 0.31, 0.3))
    ax.yaxis.pane.set_edgecolor((0.31, 0.31, 0.31, 0.3))
    ax.zaxis.pane.set_edgecolor((0.31, 0.31, 0.31, 0.3))

    fig.canvas.draw_idle()

# ═══════════════════════════════════════════════════════════════
# 8. WIDGETS
# ═══════════════════════════════════════════════════════════════

# ── Regions ────────────────────────────────────────────────────
ax_reg = plt.axes([0.01, 0.30, 0.13, 0.62], facecolor='#0d1520')
chk_reg = CheckButtons(ax_reg, REGIONS, state["regions"])
for txt in chk_reg.labels:
    txt.set_color('#cccccc')
    txt.set_fontsize(7.5)
ax_reg.set_title("Regions", color='#00E5CC', fontsize=8, pad=4)

def on_region(label):
    i = REGIONS.index(label)
    state["regions"][i] = not state["regions"][i]
    state["sel_reg"][i] = not state["sel_reg"][i]
    update_plot()

chk_reg.on_clicked(on_region)

# ── Crops ───────────────────────────────────────────────────────
ax_cul = plt.axes([0.01, 0.16, 0.13, 0.13], facecolor='#0d1520')
chk_cul = CheckButtons(ax_cul, CULTURES, state["cultures"])
for txt in chk_cul.labels:
    txt.set_color('#cccccc')
    txt.set_fontsize(7.5)
ax_cul.set_title("Crops", color='#00E5CC', fontsize=8, pad=4)

def on_culture(label):
    i = CULTURES.index(label)
    state["cultures"][i] = not state["cultures"][i]
    state["sel_cul"][i]  = not state["sel_cul"][i]
    update_plot()

chk_cul.on_clicked(on_culture)

# ── Year (radio) ──────────────────────────────────────────────
ax_yr = plt.axes([0.01, 0.07, 0.13, 0.08], facecolor='#0d1520')
radio_yr = RadioButtons(ax_yr, [str(a) for a in ANNEES], active=4)
for lbl in radio_yr.labels:
    lbl.set_color('#cccccc')
    lbl.set_fontsize(7.5)
ax_yr.set_title("Year", color='#00E5CC', fontsize=8, pad=4)

def on_annee(label):
    state["annee_idx"] = ANNEES.index(int(label))
    update_plot()

radio_yr.on_clicked(on_annee)

# ── Metric (radio) ───────────────────────────────────────────
ax_met = plt.axes([0.01, 0.01, 0.13, 0.05], facecolor='#0d1520')
radio_met = RadioButtons(ax_met, ["Yield", "Production", "Price"], active=0)
for lbl in radio_met.labels:
    lbl.set_color('#cccccc')
    lbl.set_fontsize(7.5)

def on_metrique(label):
    state["metrique"] = ["Yield", "Production", "Price"].index(label)
    update_plot()

radio_met.on_clicked(on_metrique)

# ── Operation buttons ─────────────────────────────────────────
BTN_STYLE = [
    ("SLICE",       "#003355", handle_slice,  0.27),
    ("DICE",        "#004422", handle_dice,   0.36),
    ("ROLLUP ∑",    "#552200", handle_rollup, 0.45),
    ("RESET",       "#222222", handle_reset,  0.54),
]

btn_store = []
for label, color, func, x in BTN_STYLE:
    ax_b = plt.axes([x, 0.01, 0.085, 0.05])
    b = Button(ax_b, label, color=color, hovercolor='#555555')
    b.label.set_color('white')
    b.label.set_fontsize(8)
    b.on_clicked(func)
    btn_store.append(b)

# ─── Crop legend ──────────────────────────────────────────
legend_patches = [
    plt.Rectangle((0, 0), 1, 1, fc=CULTURE_COLORS[i], label=CULTURES[i])
    for i in range(len(CULTURES))
]
fig.legend(handles=legend_patches, loc='lower right',
           ncol=3, fontsize=7, facecolor='#0d1520',
           labelcolor='#cccccc', edgecolor='#333333',
           bbox_to_anchor=(0.99, 0.07))

# ═══════════════════════════════════════════════════════════════
# 9. LAUNCH
# ═══════════════════════════════════════════════════════════════

update_plot()
plt.show()
