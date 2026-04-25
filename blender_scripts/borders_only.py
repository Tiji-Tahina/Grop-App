"""
borders_only.py — Création collection Borders_Only style Statskog
==================================================================
Objectif : contours épais, nettoyés, couleur #0a2a3f, style cartographique élégant.

Modificateurs appliqués (dans l'ordre) :
  1. Decimate  → Planar, angle 10°
  2. Smooth    → Factor=1.0, Iterations=4
  3. Solidify  → Thickness=0.012, Offset=1.0, Even=True
  4. Bevel     → Width=0.0015, Segments=2, Limit=Angle

Usage : Blender --background file.blend --python borders_only.py
"""

import bpy
import mathutils

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
BORDERS_COL_NAME = "Borders_Only"
REGION_PREFIX    = "Region_"
BORDER_PREFIX    = "Border_"

MATERIAL_NAME    = "Border_Material"
# #0a2a3f → sRGB linéaire
BASE_COLOR       = (0.0392, 0.1647, 0.2471, 1.0)
METALLIC         = 0.0
ROUGHNESS        = 0.3
EMISSION_STRENGTH = 0.08

# Modificateurs
DECIMATE_ANGLE   = 0.1745    # 10°
SMOOTH_FACTOR    = 1.0
SMOOTH_ITER      = 4
SOLIDIFY_THICK   = 0.012
SOLIDIFY_OFFSET  = 1.0
BEVEL_WIDTH      = 0.0015
BEVEL_SEGMENTS   = 2

# ─────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────

def find_col(*names):
    for name in names:
        c = bpy.data.collections.get(name)
        if c:
            return c
    # fuzzy
    target = names[0].lower()
    for c in bpy.data.collections:
        if target in c.name.lower() or c.name.lower() in target:
            return c
    return None

def get_or_create_col(name, parent=None):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        print(f"  [CRÉÉ] Collection '{name}'")
    else:
        print(f"  [EXISTANT] Collection '{name}' — réutilisée")
    if parent and c.name not in [x.name for x in parent.children]:
        parent.children.link(c)
    return c

def link_to_scene_if_needed(col):
    """S'assure que la collection est visible dans la scène."""
    sc = bpy.context.scene.collection
    if col.name not in [c.name for c in sc.children]:
        # Chercher dans les enfants récursifs
        def in_tree(parent, target):
            for child in parent.children:
                if child.name == target.name:
                    return True
                if in_tree(child, target):
                    return True
            return False
        if not in_tree(sc, col):
            sc.children.link(col)

def unlink_all(obj):
    for c in bpy.data.collections:
        if obj.name in c.objects:
            c.objects.unlink(obj)

def link_obj(obj, col):
    if obj.name not in [o.name for o in col.objects]:
        col.objects.link(obj)

# ─────────────────────────────────────────────
# MATÉRIAU
# ─────────────────────────────────────────────

def get_or_create_material():
    mat = bpy.data.materials.get(MATERIAL_NAME)
    if mat is None:
        mat = bpy.data.materials.new(name=MATERIAL_NAME)
        print(f"  [CRÉÉ] Matériau '{MATERIAL_NAME}'")
    else:
        print(f"  [EXISTANT] Matériau '{MATERIAL_NAME}' — mis à jour")

    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # Principled BSDF
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    bsdf.inputs['Base Color'].default_value   = BASE_COLOR
    bsdf.inputs['Metallic'].default_value     = METALLIC
    bsdf.inputs['Roughness'].default_value    = ROUGHNESS

    # Emission (glow léger)
    emit = nodes.new(type='ShaderNodeEmission')
    emit.location = (0, -250)
    emit.inputs['Color'].default_value    = BASE_COLOR
    emit.inputs['Strength'].default_value = EMISSION_STRENGTH

    # Mix Shader
    mix = nodes.new(type='ShaderNodeMixShader')
    mix.location = (300, 0)
    mix.inputs['Fac'].default_value = 0.05   # 5% émission

    # Output
    out = nodes.new(type='ShaderNodeOutputMaterial')
    out.location = (550, 0)

    links.new(bsdf.outputs['BSDF'], mix.inputs[1])
    links.new(emit.outputs['Emission'], mix.inputs[2])
    links.new(mix.outputs['Shader'], out.inputs['Surface'])

    # Paramètres matériau
    mat.use_backface_culling = False
    mat.blend_method         = 'OPAQUE'

    return mat

# ─────────────────────────────────────────────
# MODIFICATEURS
# ─────────────────────────────────────────────

def apply_modifiers(obj):
    """Ajoute les 4 modificateurs en ordre."""
    mods = obj.modifiers

    # Nettoyer les anciens modificateurs Border_* si réexécution
    to_remove = [m.name for m in mods if m.name.startswith("Border_")]
    for mname in to_remove:
        mods.remove(mods[mname])

    # 1. Decimate
    dec = mods.new(name="Border_Decimate", type='DECIMATE')
    dec.decimate_type = 'DISSOLVE'    # = Planar dans l'UI
    dec.angle_limit   = DECIMATE_ANGLE
    dec.use_dissolve_boundaries = False

    # 2. Smooth
    smt = mods.new(name="Border_Smooth", type='SMOOTH')
    smt.factor     = SMOOTH_FACTOR
    smt.iterations = SMOOTH_ITER

    # 3. Solidify
    sol = mods.new(name="Border_Solidify", type='SOLIDIFY')
    sol.thickness           = SOLIDIFY_THICK
    sol.offset              = SOLIDIFY_OFFSET
    sol.use_even_offset     = True
    sol.use_quality_normals = True

    # 4. Bevel
    bvl = mods.new(name="Border_Bevel", type='BEVEL')
    bvl.width         = BEVEL_WIDTH
    bvl.segments      = BEVEL_SEGMENTS
    bvl.limit_method  = 'ANGLE'
    bvl.angle_limit   = 0.5236   # 30° — évite de biseauter les arêtes plates

# ─────────────────────────────────────────────
# DUPLICATION
# ─────────────────────────────────────────────

def duplicate_object(src_obj):
    """Copie profonde d'un objet mesh (mesh, modifiers, transform)."""
    # Copie le mesh
    new_mesh = src_obj.data.copy()
    new_mesh.name = BORDER_PREFIX + src_obj.data.name

    # Crée le nouvel objet
    new_obj = bpy.data.objects.new(
        name = BORDER_PREFIX + src_obj.name,
        object_data = new_mesh
    )

    # Copie la transform monde
    new_obj.matrix_world = src_obj.matrix_world.copy()

    return new_obj

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    print("\n" + "="*68)
    print("  BORDERS_ONLY — Style Statskog  #0a2a3f")
    print("="*68)

    # Parent Madagascar
    col_mad = find_col("Madagascar", "Madagscar")
    if col_mad is None:
        raise RuntimeError("Collection Madagascar/Madagscar introuvable !")
    print(f"\n✓ Parent : '{col_mad.name}'")

    # Collecter tous les Region_* enfants
    region_cols = [c for c in col_mad.children if c.name.startswith(REGION_PREFIX)]
    if not region_cols:
        raise RuntimeError(f"Aucune collection '{REGION_PREFIX}*' trouvée sous '{col_mad.name}' !")
    print(f"✓ {len(region_cols)} collections Region_* trouvées")

    # Créer / réutiliser Borders_Only
    print(f"\n── Collection Borders_Only ──")
    col_borders = get_or_create_col(BORDERS_COL_NAME, parent=col_mad)
    link_to_scene_if_needed(col_borders)

    # Matériau
    print(f"\n── Matériau ──")
    mat = get_or_create_material()
    print(f"  Base Color : #0a2a3f  Roughness : {ROUGHNESS}  Emission : {EMISSION_STRENGTH}")

    # Collecter les objets sources (tous les MESH dans les Region_*)
    src_objects = []
    for rc in region_cols:
        for obj in rc.objects:
            if obj.type == 'MESH':
                src_objects.append(obj)

    print(f"\n── Duplication ({len(src_objects)} objets) ──")

    ok_count  = 0
    err_count = 0
    skipped   = 0

    for src in src_objects:
        border_name = BORDER_PREFIX + src.name
        try:
            # Si l'objet border existe déjà, on le supprime pour recréer proprement
            existing = bpy.data.objects.get(border_name)
            if existing:
                # Retirer de toutes les collections
                for c in bpy.data.collections:
                    if existing.name in c.objects:
                        c.objects.unlink(existing)
                bpy.data.objects.remove(existing, do_unlink=True)
                skipped += 1

            # Dupliquer
            border_obj = duplicate_object(src)

            # Lier à Borders_Only
            col_borders.objects.link(border_obj)

            # Modificateurs
            apply_modifiers(border_obj)

            # Matériau (remplacer tous)
            border_obj.data.materials.clear()
            border_obj.data.materials.append(mat)

            # Non sélectionnable (sécurité web)
            border_obj.hide_select = True

            # Display as wire en viewport (optionnel, aide à voir les contours)
            border_obj.display_type = 'SOLID'

            print(f"  ✓ {border_name}")
            ok_count += 1

        except Exception as e:
            print(f"  ✗ ERREUR '{border_name}': {e}")
            err_count += 1

    # Rapport
    print("\n" + "="*68)
    print("  RAPPORT")
    print("="*68)
    print(f"\n  Objets traités    : {len(src_objects)}")
    if skipped:
        print(f"  Recréés (existaient) : {skipped}")
    print(f"  ✓ Succès          : {ok_count}")
    if err_count:
        print(f"  ✗ Erreurs         : {err_count}")
    print(f"\n  Collection        : '{BORDERS_COL_NAME}'")
    print(f"  Matériau          : '{MATERIAL_NAME}'")
    print(f"  Couleur           : #0a2a3f")
    print(f"  hide_select       : True (tous les borders)")
    print(f"\n  Modificateurs appliqués :")
    print(f"    Decimate  → Planar, angle={DECIMATE_ANGLE:.4f} rad (10°)")
    print(f"    Smooth    → factor={SMOOTH_FACTOR}, iter={SMOOTH_ITER}")
    print(f"    Solidify  → thickness={SOLIDIFY_THICK}, offset={SOLIDIFY_OFFSET}")
    print(f"    Bevel     → width={BEVEL_WIDTH}, segments={BEVEL_SEGMENTS}")

    # Sauvegarde
    print(f"\n── Sauvegarde ──")
    bpy.ops.wm.save_mainfile()
    print(f"  ✓ Sauvegardé : {bpy.data.filepath}")

    if err_count == 0:
        print("\n✅ Contours style Statskog (#0a2a3f) créés avec succès")
    else:
        print(f"\n⚠️  Terminé avec {err_count} erreur(s). Vérifier les logs ci-dessus.")
    print("="*68 + "\n")


if __name__ == "__main__":
    main()
