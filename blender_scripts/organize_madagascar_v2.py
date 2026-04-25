"""
organize_madagascar_v2.py — Option B (robuste)
================================================
Compatible avec la scène DÉJÀ partiellement organisée par v1.
- Auto-détecte les collections Region_* existantes
- Identifie les régions et districts par leur nom (sans collections Regions/Districts)
- Méthode primaire : BVHTree geometric test (point-in-mesh, vote sur N points)
- Méthode secondaire : table de mapping officiel
- Auto-détection du parent (gère "Madagscar" et "Madagascar")
"""

import bpy
import bmesh
import mathutils
from mathutils.bvhtree import BVHTree
from collections import defaultdict

# ─────────────────────────────────────────────
# NOMS OFFICIELS DES 22 RÉGIONS
# ─────────────────────────────────────────────
REGION_NAMES = [
    "Analamanga", "Vakinankaratra", "Itasy", "Bongolava",
    "Haute Matsiatra", "Matsiatra Ambony",   # deux alias possibles
    "Amoron'i Mania", "Vatovavy-Fitovinany", "Vatovavy",
    "Ihorombe", "Atsimo-Atsinanana", "Atsinanana", "Analanjirofo",
    "Alaotra-Mangoro", "Boeny", "Sofia", "Betsiboka", "Melaky",
    "Atsimo-Andrefana", "Androy", "Anosy", "Menabe", "Diana", "Sava",
]

# ─────────────────────────────────────────────
# TABLE OFFICIELLE  district → région
# ─────────────────────────────────────────────
OFFICIAL_MAP = {
    # Analamanga
    "ambohidratrimo": "Analamanga",
    "andramasina": "Analamanga",
    "anjozorobe": "Analamanga",
    "ankazobe": "Analamanga",
    "antananarivo atsimondrano": "Analamanga",
    "antananarivo avaradrano": "Analamanga",
    "arivonimamo": "Analamanga",
    "manjakandriana": "Analamanga",
    "1er arrondissement": "Analamanga",
    "2e arrondissement": "Analamanga",
    "3e arrondissement": "Analamanga",
    "4e arrondissement": "Analamanga",
    "5e arrondissement": "Analamanga",
    "6e arrondissement": "Analamanga",
    "antananarivo renivohitra": "Analamanga",
    # Vakinankaratra
    "ambatolampy": "Vakinankaratra",
    "antanifotsy": "Vakinankaratra",
    "antsirabe i": "Vakinankaratra",
    "antsirabe ii": "Vakinankaratra",
    "betafo": "Vakinankaratra",
    "faratsiho": "Vakinankaratra",
    "mandoto": "Vakinankaratra",
    # Itasy
    "miarinarivo": "Itasy",
    "soavinandriana": "Itasy",
    # Bongolava
    "fenoarivobe": "Bongolava",
    "tsiroanomandidy": "Bongolava",
    # Haute Matsiatra / Matsiatra Ambony
    "ambalavao": "Matsiatra Ambony",
    "ambohimahasoa": "Matsiatra Ambony",
    "fianarantsoa i": "Matsiatra Ambony",
    "isandra": "Matsiatra Ambony",
    "lalangina": "Matsiatra Ambony",
    "vohibato": "Matsiatra Ambony",
    "ikalamavony": "Matsiatra Ambony",
    # Amoron'i Mania
    "ambatofinandrahana": "Amoron'i Mania",
    "ambositra": "Amoron'i Mania",
    "fandriana": "Amoron'i Mania",
    "manandriana": "Amoron'i Mania",
    # Vatovavy-Fitovinany
    "manakara atsimo": "Vatovavy-Fitovinany",
    "mananjary": "Vatovavy-Fitovinany",
    "ifanadiana": "Vatovavy-Fitovinany",
    "ikongo": "Vatovavy-Fitovinany",
    "nosy-varika": "Vatovavy-Fitovinany",
    "vohipeno": "Vatovavy-Fitovinany",
    # Ihorombe
    "ihosy": "Ihorombe",
    "iakora": "Ihorombe",
    "ivohibe": "Ihorombe",
    # Atsimo-Atsinanana
    "befotaka": "Atsimo-Atsinanana",
    "farafangana": "Atsimo-Atsinanana",
    "midongy-atsimo": "Atsimo-Atsinanana",
    "vangaindrano": "Atsimo-Atsinanana",
    "vondrozo": "Atsimo-Atsinanana",
    # Atsinanana
    "antanambao manampontsy": "Atsinanana",
    "brickaville": "Atsinanana",
    "mahanoro": "Atsinanana",
    "marolambo": "Atsinanana",
    "toamasina i": "Atsinanana",
    "toamasina ii": "Atsinanana",
    "vatomandry": "Atsinanana",
    # Analanjirofo
    "fenerive est": "Analanjirofo",
    "mananara-avaratra": "Analanjirofo",
    "maroantsetra": "Analanjirofo",
    "sainte marie": "Analanjirofo",
    "soanierana ivongo": "Analanjirofo",
    "vavatenina": "Analanjirofo",
    # Alaotra-Mangoro
    "amparafaravola": "Alaotra-Mangoro",
    "andilamena": "Alaotra-Mangoro",
    "anosibe-an'ala": "Alaotra-Mangoro",
    "moramanga": "Alaotra-Mangoro",
    "ambatondrazaka": "Alaotra-Mangoro",
    # Boeny
    "ambato boeni": "Boeny",
    "mahajanga i": "Boeny",
    "mahajanga ii": "Boeny",
    "marovoay": "Boeny",
    "mitsinjo": "Boeny",
    "soalala": "Boeny",
    # Sofia
    "analalava": "Sofia",
    "antsohihy": "Sofia",
    "befandriana nord": "Sofia",
    "bealanana": "Sofia",
    "kandreho": "Sofia",
    "mampikony": "Sofia",
    "mandritsara": "Sofia",
    "port-berge (boriziny-vaovao)": "Sofia",
    "tsaratanana": "Sofia",
    # Betsiboka
    "maevatanana": "Betsiboka",
    # Melaky
    "ambatomainty": "Melaky",
    "antsalova": "Melaky",
    "besalampy": "Melaky",
    "maintirano": "Melaky",
    "morafenobe": "Melaky",
    # Atsimo-Andrefana
    "ampanihy ouest": "Atsimo-Andrefana",
    "ankazoabo": "Atsimo-Andrefana",
    "benenitra": "Atsimo-Andrefana",
    "beroroha": "Atsimo-Andrefana",
    "betioky atsimo": "Atsimo-Andrefana",
    "mahabo": "Atsimo-Andrefana",
    "manja": "Atsimo-Andrefana",
    "morombe": "Atsimo-Andrefana",
    "sakaraha": "Atsimo-Andrefana",
    "toliary-i": "Atsimo-Andrefana",
    "toliary-ii": "Atsimo-Andrefana",
    "toliara i": "Atsimo-Andrefana",
    "toliara ii": "Atsimo-Andrefana",
    # Androy
    "ambovombe-androy": "Androy",
    "bekily": "Androy",
    "beloha": "Androy",
    "tsihombe": "Androy",
    # Anosy
    "amboasary-atsimo": "Anosy",
    "betroka": "Anosy",
    "taolagnaro": "Anosy",
    # Menabe
    "belo sur tsiribihina": "Menabe",
    "miandrivazo": "Menabe",
    "morondava": "Menabe",
    # Diana
    "ambanja": "Diana",
    "ambilobe": "Diana",
    "antsiranana i": "Diana",
    "antsiranana ii": "Diana",
    "nosy-be": "Diana",
    # Sava
    "antalaha": "Sava",
    "andapa": "Sava",
    "sambava": "Sava",
    "vohemar": "Sava",
}

PREFIX = "Region_"

# ─────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────

def n(s): return s.strip().lower()

def find_col(*names):
    for name in names:
        c = bpy.data.collections.get(name)
        if c: return c
    # fuzzy
    target = n(names[0])
    for c in bpy.data.collections:
        if target in n(c.name) or n(c.name) in target:
            return c
    return None

def get_or_create(name, parent=None):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
    if parent and c.name not in [x.name for x in parent.children]:
        parent.children.link(c)
    return c

def unlink_all(obj):
    for c in bpy.data.collections:
        if obj.name in c.objects:
            c.objects.unlink(obj)

def link_obj(obj, col):
    if obj.name not in [o.name for o in col.objects]:
        col.objects.link(obj)

# ─────────────────────────────────────────────
# IDENTIFICATION DES OBJETS
# ─────────────────────────────────────────────

def identify_objects():
    """
    Identifie régions et districts depuis bpy.data.objects.
    Stratégie : si le nom de l'objet correspond à un nom de région officiel → région.
    Sinon → district (si dans une collection Region_* → déjà assigné).
    """
    region_set = {n(r) for r in REGION_NAMES}
    all_mesh = [o for o in bpy.data.objects if o.type == 'MESH' and o.name != 'Plane']

    region_objs   = []
    district_objs = []
    already_done  = []   # districts déjà dans une Region_* collection

    # Trouver les collections Region_* existantes
    region_cols = {c.name: c for c in bpy.data.collections
                   if c.name.startswith(PREFIX)}

    # Objet dans Region_* → déjà organisé si c'est un district
    in_region_col = set()
    for rc in region_cols.values():
        for o in rc.objects:
            in_region_col.add(o.name)

    for obj in all_mesh:
        obj_norm = n(obj.name)
        # C'est une région si son nom normalisé est dans la liste
        is_region = obj_norm in region_set
        if not is_region:
            # Essai partiel (ex. "Amoron'i Mania" → apostrophe)
            for rn in region_set:
                if rn.replace("'", "") == obj_norm.replace("'", ""):
                    is_region = True
                    break

        if is_region:
            region_objs.append(obj)
        else:
            # Forcer la réévaluation de tous les districts
            district_objs.append(obj)

    return region_objs, district_objs, already_done, region_cols

# ─────────────────────────────────────────────
# GÉOMÉTRIE
# ─────────────────────────────────────────────

def build_bvh(obj):
    try:
        depsgraph = bpy.context.evaluated_depsgraph_get()
        obj_eval  = obj.evaluated_get(depsgraph)
        mesh      = obj_eval.to_mesh()
        if not mesh: return None
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.transform(bm, matrix=obj.matrix_world, verts=bm.verts)
        bvh = BVHTree.FromBMesh(bm)
        bm.free()
        obj_eval.to_mesh_clear()
        return bvh
    except Exception as e:
        print(f"    [BVH ERR] {obj.name}: {e}")
        return None

def point_inside(pt, bvh):
    """Raycast vers +Z, compte les hits — impair = dedans."""
    origin = mathutils.Vector(pt)
    ray    = mathutils.Vector((0, 0, 1))
    hits   = 0
    for _ in range(10):
        loc, _, _, _ = bvh.ray_cast(origin, ray)
        if loc is None: break
        hits += 1
        origin = loc + ray * 1e-5
    return (hits % 2) == 1

def centroid_world(obj):
    verts = obj.data.vertices
    if not verts: return obj.matrix_world.translation.copy()
    c = sum((obj.matrix_world @ v.co for v in verts), mathutils.Vector()) / len(verts)
    return c

def sample_pts(obj, k=7):
    pts = [centroid_world(obj)]
    for corner in [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]:
        pts.append(corner)
    return pts[:k]

def geo_region(dist_obj, region_objs, bvh_cache):
    pts   = sample_pts(dist_obj, k=9)
    votes = defaultdict(int)
    for r in region_objs:
        bvh = bvh_cache.get(r.name)
        if not bvh: continue
        for pt in pts:
            if point_inside(pt, bvh):
                votes[r.name] += 1
    if not votes: return None
    best = max(votes, key=votes.get)
    return best if votes[best] > 0 else None

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    print("\n" + "="*68)
    print("  ORGANISATION DRILL-DOWN MADAGASCAR v2 (géométrique)")
    print("="*68)

    # Parent
    col_mad = find_col("Madagascar", "Madagscar", "MADAGASCAR")
    if col_mad is None:
        raise RuntimeError("Collection Madagascar/Madagscar introuvable !")
    print(f"\n✓ Parent : '{col_mad.name}'")

    # Identifier objets
    region_objs, district_objs, already_done, existing_reg_cols = identify_objects()
    print(f"✓ Régions trouvées    : {len(region_objs)}")
    print(f"✓ Districts à traiter : {len(district_objs)}")
    print(f"✓ Districts déjà OK   : {len(already_done)} (dans Region_*)")

    if not region_objs:
        raise RuntimeError("Aucun objet région identifié !")

    # Collections Region_* (créer si manquantes)
    print(f"\n── Collections régionales ──")
    reg_cols = {}
    for r in region_objs:
        cname = (PREFIX + r.name).replace(" ", "_").replace("'", "").replace("/", "-")
        rc = get_or_create(cname, parent=col_mad)
        reg_cols[r.name] = rc
        # Placer l'objet région dans sa collection
        unlink_all(r)
        link_obj(r, rc)
        print(f"  📁 {cname}  ← région '{r.name}'")

    if not district_objs:
        print("\n✅ Tous les districts sont déjà organisés. Sauvegarde…")
        bpy.ops.wm.save_mainfile()
        print(f"  ✓ {bpy.data.filepath}")
        return

    # BVHTrees
    print(f"\n── Construction BVHTrees ──")
    bvh_cache = {}
    for r in region_objs:
        bvh = build_bvh(r)
        if bvh:
            bvh_cache[r.name] = bvh
            print(f"  ✓ {r.name}")
        else:
            print(f"  ✗ {r.name} — sera ignoré en géo")

    # Mapping region_name → region_obj_name (pour la table officielle)
    # Construire un index flexible : n(region_name) → obj.name
    reg_name_idx = {}
    for r in region_objs:
        reg_name_idx[n(r.name)] = r.name
        reg_name_idx[n(r.name).replace("'", "")] = r.name

    def resolve_region_name(target_str):
        """Résout un nom de région textuel vers le nom d'objet réel."""
        k = n(target_str)
        if k in reg_name_idx: return reg_name_idx[k]
        k2 = k.replace("'", "")
        if k2 in reg_name_idx: return reg_name_idx[k2]
        for rk, rv in reg_name_idx.items():
            if k in rk or rk in k: return rv
        return None

    # Assigner les districts
    print(f"\n── Association districts ({len(district_objs)}) ──")
    stats  = defaultdict(int)
    detail = []
    unassigned = []

    for dist in district_objs:
        region_name = None
        method      = ""

        # A : géométrique
        geo = geo_region(dist, region_objs, bvh_cache)
        if geo:
            region_name = geo
            method      = "GEO"
            stats["geo"] += 1

        # B : table officielle
        table_region_str = OFFICIAL_MAP.get(n(dist.name))
        if table_region_str:
            table_obj_name = resolve_region_name(table_region_str)
            if table_obj_name:
                if region_name is None:
                    region_name = table_obj_name
                    method      = "TABLE"
                    stats["table"] += 1
                elif n(region_name) != n(table_obj_name):
                    print(f"    [CONFLIT] '{dist.name}' GEO→'{region_name}' "
                          f"TABLE→'{table_obj_name}' → TABLE wins")
                    stats["geo"] -= 1
                    region_name = table_obj_name
                    method      = "TABLE(override)"
                    stats["table"] += 1

        if region_name is None:
            unassigned.append(dist)
            stats["unassigned"] += 1
            print(f"    [WARN] '{dist.name}' → introuvable")
            continue

        # Trouver la collection cible
        target_col = reg_cols.get(region_name)
        if target_col is None:
            # Correspondance partielle
            for rn, rc in reg_cols.items():
                if n(rn) == n(region_name) or n(region_name) in n(rn):
                    target_col = rc; break
        if target_col is None:
            unassigned.append(dist)
            stats["unassigned"] += 1
            continue

        unlink_all(dist)
        link_obj(dist, target_col)
        detail.append((dist.name, region_name, method))

    # Quarantaine
    if unassigned:
        col_q = get_or_create("Districts_Non_Assignes", parent=col_mad)
        for d in unassigned:
            unlink_all(d)
            link_obj(d, col_q)
            print(f"    [Q] '{d.name}'")

    # Nettoyer collections vides (Regions, Districts si encore là)
    for name in ["Regions", "Districts"]:
        src = bpy.data.collections.get(name)
        if src and len(src.objects) == 0 and len(list(src.children)) == 0:
            for parent in list(bpy.data.collections) + [bpy.context.scene.collection]:
                try:
                    if src.name in [c.name for c in parent.children]:
                        parent.children.unlink(src)
                        print(f"  ✓ Collection vide '{name}' retirée")
                        break
                except Exception:
                    pass

    # Rapport
    d_counts = defaultdict(int)
    for _, rn, _ in detail:
        d_counts[rn] += 1

    print("\n" + "="*68)
    print("  RAPPORT FINAL")
    print("="*68)
    print(f"\n  {'RÉGION':<35} {'DISTRICTS':>9}  MÉTHODES")
    print("  " + "-"*60)
    for r in sorted(region_objs, key=lambda x: x.name):
        cnt = d_counts.get(r.name, 0)
        # + already_done dans cette collection
        existing_rc = existing_reg_cols.get(reg_cols[r.name].name)
        if existing_rc:
            cnt += sum(1 for o in existing_rc.objects if o.name != r.name
                       and n(o.name) not in {n(rr.name) for rr in region_objs})
        geo_c  = sum(1 for _, rg, m in detail if rg == r.name and "GEO" in m)
        tbl_c  = sum(1 for _, rg, m in detail if rg == r.name and "TABLE" in m)
        mstr   = f"GEO:{geo_c} TBL:{tbl_c}" if (geo_c or tbl_c) else ""
        print(f"  {r.name:<35} {cnt:>9}  {mstr}")

    print("  " + "-"*60)
    total = len(detail) + len(already_done)
    total_new = len(detail)
    print(f"  {'Nouvellement assignés':<35} {total_new:>9}")
    print(f"  {'Déjà en place (v1)':<35} {len(already_done):>9}")
    if unassigned:
        print(f"  {'Non assignés (quarantaine)':<35} {len(unassigned):>9}")
    denom = len(district_objs) + len(already_done)
    pct   = 100 * (total_new + len(already_done)) / max(denom, 1)
    print(f"\n  Taux de réussite : {pct:.1f}%")
    print(f"\n✅ Organisation terminée !\n")

    bpy.ops.wm.save_mainfile()
    print(f"  ✓ Sauvegardé : {bpy.data.filepath}")
    print("="*68 + "\n")


if __name__ == "__main__":
    main()
