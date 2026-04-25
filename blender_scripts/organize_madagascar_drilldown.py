"""
Script Blender Python : Organisation hiérarchique Madagascar pour Drill-down
=============================================================================
Fichier ciblé : Madagascar_region_district.blend
Collections détectées :
  - "Madagscar"  (collection principale, typo intentionnelle conservée)
  - "Regions"    (22 régions)
  - "Districts"  (119 districts)

Structure finale :
  📁 Madagscar
    📁 Region_Analamanga
       ├─ Analamanga  (objet région)
       ├─ Ambohidratrimo
       ├─ Andramasina
       ├─ Anjozorobe
       ├─ Ankazobe
       ├─ Antananarivo Atsimondrano
       ├─ Antananarivo Avaradrano
       ├─ Arivonimamo
       ├─ Manjakandriana
       └─ 1er~6e Arrondissement
    📁 Region_Vakinankaratra
       └─ ...
    ...

Usage : Blender --background file.blend --python ce_script.py
"""

import bpy
import re
from collections import defaultdict

# =============================================================================
# TABLE DE MAPPING : Région → liste de districts (noms exacts dans Blender)
# =============================================================================
# Source : découpage administratif de Madagascar (22 régions, 119 districts)

REGION_DISTRICT_MAP = {
    "Analamanga": [
        "1er Arrondissement", "2e Arrondissement", "3e Arrondissement",
        "4e Arrondissement", "5e Arrondissement", "6e Arrondissement",
        "Ambohidratrimo", "Andramasina", "Anjozorobe", "Ankazobe",
        "Antananarivo Atsimondrano", "Antananarivo Avaradrano",
        "Arivonimamo", "Manjakandriana",
    ],
    "Vakinankaratra": [
        "Ambatolampy", "Antanifotsy", "Antsirabe I", "Antsirabe II",
        "Betafo", "Faratsiho", "Mandoto",
    ],
    "Itasy": [
        "Arivonimamo", "Miarinarivo", "Soavinandriana",
    ],
    "Bongolava": [
        "Fenoarivobe", "Tsiroanomandidy",
    ],
    "Matsiatra Ambony": [
        "Ambalavao", "Ambohimahasoa", "Fandriana", "Fianarantsoa I",
        "Isandra", "Lalangina", "Vohibato",
    ],
    "Amoron'i Mania": [
        "Ambatofinandrahana", "Ambositra", "Fandriana", "Ikalamavony",
        "Manandriana",
    ],
    "Vatovavy-Fitovinany": [
        "Ifanadiana", "Ikongo", "Manakara Atsimo", "Mananjary",
        "Nosy-Varika", "Vohipeno",
    ],
    "Ihorombe": [
        "Ihosy", "Iakora", "Ivohibe",
    ],
    "Atsimo-Atsinanana": [
        "Befotaka", "Farafangana", "Midongy-Atsimo", "Vangaindrano",
        "Vondrozo",
    ],
    "Atsinanana": [
        "Antanambao Manampontsy", "Brickaville", "Mahanoro",
        "Marolambo", "Toamasina I", "Toamasina II", "Vatomandry",
    ],
    "Analanjirofo": [
        "Antalaha", "Fenerive Est", "Mananara-Avaratra",
        "Maroantsetra", "Sainte Marie", "Soanierana Ivongo", "Vavatenina",
    ],
    "Alaotra-Mangoro": [
        "Amparafaravola", "Andilamena", "Anosibe-An'ala",
        "Moramanga", "Ambatondrazaka",
    ],
    "Boeny": [
        "Ambato Boeni", "Mahajanga I", "Mahajanga II",
        "Marovoay", "Mitsinjo", "Soalala",
    ],
    "Sofia": [
        "Analalava", "Befandriana Nord", "Bealanana", "Kandreho",
        "Mampikony", "Mandritsara", "Port-Berge (Boriziny-Vaovao)", "Tsaratanana",
    ],
    "Betsiboka": [
        "Kandreho", "Maevatanana", "Tsaratanana",
    ],
    "Melaky": [
        "Ambatomainty", "Antsalova", "Besalampy",
        "Maintirano", "Morafenobe",
    ],
    "Atsimo-Andrefana": [
        "Ampanihy Ouest", "Ankazoabo", "Benenitra", "Beroroha",
        "Betioky Atsimo", "Mahabo", "Manja", "Morombe", "Sakaraha",
        "Toliary-I", "Toliary-II",
    ],
    "Androy": [
        "Ambovombe-Androy", "Bekily", "Beloha", "Tsihombe",
    ],
    "Anosy": [
        "Amboasary-Atsimo", "Betroka", "Taolagnaro",
    ],
    "Menabe": [
        "Belo Sur Tsiribihina", "Mahabo", "Miandrivazo",
        "Morondava", "Manja",
    ],
    "Diana": [
        "Ambanja", "Ambilobe", "Antsiranana I", "Antsiranana II",
        "Nosy-Be",
    ],
    "Sava": [
        "Andapa", "Antalaha", "Sambava", "Vohemar",
    ],
}

# =============================================================================
# CONFIG
# =============================================================================
COLLECTION_MADAGASCAR    = "Madagscar"   # Typo conservée telle quelle dans Blender
COLLECTION_REGIONS       = "Regions"
COLLECTION_DISTRICTS     = "Districts"
REGION_COLLECTION_PREFIX = "Region_"

# =============================================================================
# UTILITAIRES
# =============================================================================

def normalize(name: str) -> str:
    return name.strip().lower()

def get_col(name):
    return bpy.data.collections.get(name)

def get_or_create_col(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        print(f"  [CRÉÉ]     📁 {name}")
    else:
        print(f"  [EXISTANT] 📁 {name}")
    if parent and col.name not in [c.name for c in parent.children]:
        parent.children.link(col)
    return col

def unlink_from_all(obj):
    for col in bpy.data.collections:
        if obj.name in col.objects:
            col.objects.unlink(obj)

def link_to(obj, col):
    if obj.name not in [o.name for o in col.objects]:
        col.objects.link(obj)

def bbox_overlap_area(obj_a, obj_b):
    """Calcule l'aire de chevauchement XY entre deux objets."""
    try:
        import mathutils
        def bbox(o):
            pts = [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
            xs = [p.x for p in pts]; ys = [p.y for p in pts]
            return min(xs), min(ys), max(xs), max(ys)
        a = bbox(obj_a); b = bbox(obj_b)
        ix = min(a[2], b[2]) - max(a[0], b[0])
        iy = min(a[3], b[3]) - max(a[1], b[1])
        return max(0, ix) * max(0, iy)
    except Exception:
        return 0.0

# =============================================================================
# MAIN
# =============================================================================

def main():
    print("\n" + "="*70)
    print("  ORGANISATION DRILL-DOWN MADAGASCAR — DÉMARRAGE")
    print("="*70)

    # 1. Collections sources
    col_mad  = get_col(COLLECTION_MADAGASCAR)
    col_reg  = get_col(COLLECTION_REGIONS)
    col_dist = get_col(COLLECTION_DISTRICTS)

    if col_mad is None:
        raise RuntimeError(f"Collection '{COLLECTION_MADAGASCAR}' introuvable !")
    if col_reg is None:
        raise RuntimeError(f"Collection '{COLLECTION_REGIONS}' introuvable !")
    if col_dist is None:
        raise RuntimeError(f"Collection '{COLLECTION_DISTRICTS}' introuvable !")

    region_objs   = list(col_reg.objects)
    district_objs = list(col_dist.objects)

    print(f"\n✓ {len(region_objs)} régions   dans '{COLLECTION_REGIONS}'")
    print(f"✓ {len(district_objs)} districts dans '{COLLECTION_DISTRICTS}'")

    # 2. Indexer les objets par nom normalisé
    region_by_norm   = {normalize(o.name): o for o in region_objs}
    district_by_norm = {normalize(o.name): o for o in district_objs}

    # 3. Créer une collection par région + placer l'objet région dedans
    print(f"\n── Création des collections régionales ──")
    reg_collections = {}  # nom_region_obj → collection
    unlinked_regions = set()

    for reg_obj in region_objs:
        col_name = f"{REGION_COLLECTION_PREFIX}{reg_obj.name}"
        col_name = col_name.replace(" ", "_").replace("'", "").replace("/", "-")
        rc = get_or_create_col(col_name, parent=col_mad)
        reg_collections[reg_obj.name] = rc

        unlink_from_all(reg_obj)
        link_to(reg_obj, rc)
        unlinked_regions.add(reg_obj.name)
        print(f"    → Région '{reg_obj.name}' ✓ dans '{col_name}'")

    # 4. Associer les districts via la table de mapping
    print(f"\n── Association districts → régions (table de mapping) ──")
    district_assigned   = {}  # nom_district → nom_region
    district_counts     = defaultdict(int)

    for region_name, district_names in REGION_DISTRICT_MAP.items():
        rc = reg_collections.get(region_name)
        if rc is None:
            print(f"  [WARN] Région '{region_name}' pas dans les collections créées — skip")
            continue

        for d_name in district_names:
            # Chercher l'objet district (correspondance exacte puis normalisée)
            dist_obj = bpy.data.objects.get(d_name)
            if dist_obj is None:
                # Tentative normalisée
                d_norm = normalize(d_name)
                for o in district_objs:
                    if normalize(o.name) == d_norm:
                        dist_obj = o
                        break
            if dist_obj is None:
                print(f"    [WARN] District '{d_name}' introuvable dans la scène")
                continue
            if dist_obj.name in district_assigned:
                # Déjà assigné — on garde le premier mapping
                print(f"    [INFO] District '{dist_obj.name}' déjà assigné à '{district_assigned[dist_obj.name]}' → skip '{region_name}'")
                continue

            unlink_from_all(dist_obj)
            link_to(dist_obj, rc)
            district_assigned[dist_obj.name] = region_name
            district_counts[rc.name] += 1

    # 5. Districts non assignés → fallback par bounding box
    print(f"\n── Fallback bbox pour les districts non assignés ──")
    unassigned = [o for o in district_objs if o.name not in district_assigned]
    print(f"  {len(unassigned)} districts sans mapping direct")

    still_unassigned = []
    for dist_obj in unassigned:
        best_reg = None
        best_area = 0.0
        for reg_obj in region_objs:
            area = bbox_overlap_area(dist_obj, reg_obj)
            if area > best_area:
                best_area = area
                best_reg  = reg_obj

        if best_reg and best_area > 0:
            rc = reg_collections[best_reg.name]
            unlink_from_all(dist_obj)
            link_to(dist_obj, rc)
            district_assigned[dist_obj.name] = best_reg.name
            district_counts[rc.name] += 1
            print(f"    [BBOX] '{dist_obj.name}' → '{best_reg.name}' (overlap={best_area:.4f})")
        else:
            still_unassigned.append(dist_obj)
            print(f"    [WARN] '{dist_obj.name}' → aucune région trouvée par bbox")

    # 6. Districts vraiment non assignés → collection séparée
    if still_unassigned:
        col_na = get_or_create_col("Districts_Non_Assignes", parent=col_mad)
        for dist_obj in still_unassigned:
            unlink_from_all(dist_obj)
            link_to(dist_obj, col_na)
            print(f"    [FALLBACK] '{dist_obj.name}' → 'Districts_Non_Assignes'")

    # 7. Nettoyer les collections sources si vides
    print(f"\n── Nettoyage des collections sources vides ──")
    for src_name in [COLLECTION_REGIONS, COLLECTION_DISTRICTS]:
        src = get_col(src_name)
        if src and len(src.objects) == 0 and len(list(src.children)) == 0:
            for parent in list(bpy.data.collections) + [bpy.context.scene.collection]:
                try:
                    if src.name in [c.name for c in parent.children]:
                        parent.children.unlink(src)
                        print(f"  ✓ Collection vide '{src_name}' retirée de '{parent.name}'")
                        break
                except Exception:
                    pass

    # 8. Rapport
    print("\n" + "="*70)
    print("  RAPPORT FINAL")
    print("="*70)
    print(f"\n  {'RÉGION':<40} {'DISTRICTS':>10}")
    print("  " + "-"*50)
    for reg_name, rc in sorted(reg_collections.items()):
        count = district_counts.get(rc.name, 0)
        print(f"  {reg_name:<40} {count:>10}")
    print("  " + "-"*50)
    total_assigned = sum(district_counts.values())
    print(f"  {'TOTAL ASSIGNÉS':<40} {total_assigned:>10}")
    if still_unassigned:
        print(f"  {'NON ASSIGNÉS':<40} {len(still_unassigned):>10}")
    print(f"\n  Total districts : {len(district_objs)}")
    print(f"  Total régions   : {len(region_objs)}")

    print(f"\n✅ Organisation terminée ! Structure prête pour export par région.")

    # 9. Sauvegarde
    print(f"\n── Sauvegarde ──")
    bpy.ops.wm.save_mainfile()
    print(f"  ✓ Fichier sauvegardé : {bpy.data.filepath}")
    print("\n" + "="*70 + "\n")

# =============================================================================
if __name__ == "__main__":
    main()
