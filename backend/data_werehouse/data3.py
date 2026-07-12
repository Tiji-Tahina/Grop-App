import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import CheckButtons, Button

# ==========================================
# 1. DATA AND STATE
# ==========================================
labels_init = {
    "age": ["18-25", "25-35", "35-45", "45-55", "55-65"],
    "niv": ["SD", "SB", "AB"],
    "sit": ["Married", "Unmarried"]
}

data_m = np.array([[(3,2,0,5), (2,2,1,5), (0,3,2,5)], [(3,1,1,5), (2,1,2,5), (1,2,2,5)], [(1,3,1,5), (1,3,1,5), (0,2,3,5)], [(1,2,2,5), (1,1,3,5), (0,3,2,5)], [(1,2,2,5), (1,2,2,5), (0,2,3,5)]])
data_nm = np.array([[(3,1,1,5), (2,2,1,5), (0,3,2,5)], [(4,1,0,5), (3,2,0,5), (1,3,1,5)], [(2,2,1,5), (2,2,1,5), (1,2,2,5)], [(2,2,1,5), (1,2,2,5), (1,2,2,5)], [(2,1,2,5), (1,1,3,5), (1,3,1,5)]])
cube_master = np.stack([data_m, data_nm])

state = {k: [[i] for i in range(len(v))] for k, v in labels_init.items()}
visibility = {k: [True] * len(v) for k, v in labels_init.items()}
selection = {k: [False] * len(v) for k, v in labels_init.items()}

# ==========================================
# 2. ENHANCED OLAP ENGINE
# ==========================================

def get_current_view():
    # Filter groups in 'state': a group is visible only if AT LEAST ONE unit is visible
    idx_sit = [g for g in state["sit"] if any(visibility["sit"][u] for u in g)]
    idx_age = [g for g in state["age"] if any(visibility["age"][u] for u in g)]
    idx_niv = [g for g in state["niv"] if any(visibility["niv"][u] for u in g)]

    if not idx_sit or not idx_age or not idx_niv:
        return np.zeros((0,0,0,4)), [], [], []

    view_cube = np.zeros((len(idx_sit), len(idx_age), len(idx_niv), 4))

    def make_label(dim, groups):
        lbls = []
        for g in groups:
            active = [u for u in g if visibility[dim][u]]
            if len(active) > 1:
                lbls.append(f"{labels_init[dim][active[0]]}..{labels_init[dim][active[-1]]}")
            elif active:
                lbls.append(labels_init[dim][active[0]])
        return lbls

    for i, gs in enumerate(idx_sit):
        for j, ga in enumerate(idx_age):
            for k, gn in enumerate(idx_niv):
                # Sum only over VISIBLE intersections
                v_s = [u for u in gs if visibility["sit"][u]]
                v_a = [u for u in ga if visibility["age"][u]]
                v_n = [u for u in gn if visibility["niv"][u]]
                if v_s and v_a and v_n:
                    view_cube[i,j,k] = np.sum(cube_master[np.ix_(v_s, v_a, v_n)], axis=(0,1,2))

    return view_cube, make_label("age", idx_age), make_label("niv", idx_niv), make_label("sit", idx_sit)

# ==========================================
# 3. CORRECTED ACTIONS
# ==========================================

def handle_slice(event):
    """SLICE: Isolate a single slice on the selected axis."""
    for dim in ["age", "niv", "sit"]:
        indices = [i for i, val in enumerate(selection[dim]) if val]
        if len(indices) == 1:
            for i in range(len(visibility[dim])):
                visibility[dim][i] = (i == indices[0])
    update_plot()

def handle_dice(event):
    """DICE: Filter strictly based on all checked boxes."""
    for dim in ["age", "niv", "sit"]:
        indices = [i for i, val in enumerate(selection[dim]) if val]
        if indices:  # If something is checked on this axis
            for i in range(len(visibility[dim])):
                visibility[dim][i] = (i in indices)
    update_plot()

def handle_rollup(event):
    for dim in ["age", "niv", "sit"]:
        indices = [i for i, val in enumerate(selection[dim]) if val]
        if len(indices) > 1:
            new_s = [g for g in state[dim] if not any(idx in indices for idx in g)]
            new_s.append(sorted(indices))
            state[dim] = sorted(new_s, key=lambda x: x[0])
    update_plot()

def handle_drill(event):
    for dim in ["age", "niv", "sit"]:
        indices = [i for i, val in enumerate(selection[dim]) if val]
        new_s = []
        for g in state[dim]:
            if any(idx in indices for idx in g):
                for unit in g: new_s.append([unit])
            else: new_s.append(g)
        state[dim] = sorted(new_s, key=lambda x: x[0])
    update_plot()

def handle_reset(event):
    for dim in ["age", "niv", "sit"]:
        visibility[dim] = [True] * len(labels_init[dim])
        state[dim] = [[i] for i in range(len(labels_init[dim]))]
        selection[dim] = [False] * len(labels_init[dim])
    update_plot()

# ==========================================
# 4. GRAPHICAL INTERFACE
# ==========================================

fig = plt.figure(figsize=(14, 9), facecolor='#050505')
ax = fig.add_subplot(111, projection='3d', facecolor='#050505')
plt.subplots_adjust(left=0.25, bottom=0.05)

def update_plot(event=None):
    ax.clear()
    ax.set_facecolor('#050505')
    cube, t_age, t_niv, t_sit = get_current_view()

    # Keep fixed limits for spatial consistency
    ax.set_xlim(0, 5); ax.set_ylim(0, 5); ax.set_zlim(0, 2)

    if cube.size > 0:
        for s in range(cube.shape[0]):
            for a in range(cube.shape[1]):
                for n in range(cube.shape[2]):
                    v = cube[s, a, n]
                    txt = f"{int(v[0])},{int(v[1])}\n{int(v[2])},{int(v[3])}"
                    # Position relative to labels to avoid overlaps
                    ax.bar3d(n, a, s, 0.7, 0.7, 0.2, color=(0,0,0,0), edgecolor='#00FFCC', linewidth=0.7)
                    ax.text(n+0.35, a+0.35, s+0.1, txt, color='white', fontsize=8, ha='center', fontweight='bold')

        ax.set_xticks(np.arange(len(t_niv)) + 0.35); ax.set_xticklabels(t_niv, color='#00FFCC', fontsize=8)
        ax.set_yticks(np.arange(len(t_age)) + 0.35); ax.set_yticklabels(t_age, color='#00FFCC', fontsize=8)
        ax.set_zticks(np.arange(len(t_sit)) + 0.1); ax.set_zticklabels(t_sit, color='#00FFCC', fontsize=8)

    ax.tick_params(colors='white')
    ax.set_title("OLAP PROTOTYPE M2 - DATA ANALYSIS", color='white', pad=15)
    fig.canvas.draw_idle()

# --- SELECTION MENU CONSTRUCTION ---
def create_chk(pos, dim):
    ax_m = plt.axes(pos, facecolor='#111111')
    c = CheckButtons(ax_m, labels_init[dim], selection[dim])
    for l in c.labels: l.set_color('white'); l.set_fontsize(9)
    def sync(label):
        idx = labels_init[dim].index(label)
        selection[dim][idx] = not selection[dim][idx]
    c.on_clicked(sync)
    return c

c_age = create_chk([0.02, 0.78, 0.18, 0.18], "age")
c_niv = create_chk([0.02, 0.65, 0.18, 0.10], "niv")
c_sit = create_chk([0.02, 0.55, 0.18, 0.08], "sit")

# --- OPERATION BUTTONS ---
btns_cfg = [
    ('SLICE (1 Value)', '#004466', handle_slice, 0.45),
    ('DICE (Selection)', '#006688', handle_dice, 0.37),
    ('MERGE (-)', '#660000', handle_rollup, 0.29),
    ('EXPAND (+)', '#006600', handle_drill, 0.21),
    ('RESET', '#333333', handle_reset, 0.13)
]

btns_store = []
for label, color, func, y in btns_cfg:
    ax_b = plt.axes([0.02, y, 0.18, 0.06])
    b = Button(ax_b, label, color=color, hovercolor='#444444')
    b.label.set_color('white')
    b.on_clicked(func)
    btns_store.append(b)

update_plot()
plt.show()
