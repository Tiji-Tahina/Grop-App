# =============================================================================
# Madagascar map — clean / flatten / gap / solidify / bevel / export
# Run this script INSIDE Blender (Text Editor > Open > Run Script).
# Outputs:
#   public/models/madagascar_adm1.glb   (22 regions)
#   public/models/madagascar_adm2.glb   (~119 districts)
#   public/madagascar.glb               (everything, with kind/region_id userData)
# =============================================================================
import bpy
import bmesh
import math
import os

REGIONS = {
    'Atsinanana','Analanjirofo','Atsimo-Atsinanana','Vatovavy-Fitovinany',
    'Diana','Sava','Analamanga','Vakinankaratra',"Amoron'i Mania",
    'Itasy','Bongolava','Matsiatra Ambony','Alaotra-Mangoro','Ihorombe',
    'Boeny','Sofia','Melaky','Menabe','Betsiboka',
    'Atsimo-Andrefana','Androy','Anosy',
}

ADM2_PARENT = {
    '1er Arrondissement':'Analamanga','2e Arrondissement':'Analamanga','3e Arrondissement':'Analamanga',
    '4e Arrondissement':'Analamanga','5e Arrondissement':'Analamanga','6e Arrondissement':'Analamanga',
    'Antananarivo Atsimondrano':'Analamanga','Antananarivo Avaradrano':'Analamanga',
    'Ambohidratrimo':'Analamanga','Andramasina':'Analamanga','Anjozorobe':'Analamanga',
    'Ankazobe':'Analamanga','Manjakandriana':'Analamanga',
    'Ambatondrazaka':'Alaotra-Mangoro','Amparafaravola':'Alaotra-Mangoro','Andilamena':'Alaotra-Mangoro',
    "Anosibe-An'ala":'Alaotra-Mangoro','Moramanga':'Alaotra-Mangoro',
    'Ambositra':"Amoron'i Mania",'Ambatofinandrahana':"Amoron'i Mania",
    'Fandriana':"Amoron'i Mania",'Manandriana':"Amoron'i Mania",
    'Fenerive Est':'Analanjirofo','Mananara-Avaratra':'Analanjirofo','Maroantsetra':'Analanjirofo',
    'Sainte Marie':'Analanjirofo','Soanierana Ivongo':'Analanjirofo','Vavatenina':'Analanjirofo',
    'Ambovombe-Androy':'Androy','Bekily':'Androy','Beloha':'Androy','Tsihombe':'Androy',
    'Amboasary-Atsimo':'Anosy','Betroka':'Anosy','Taolagnaro':'Anosy',
    'Ankazoabo':'Atsimo-Andrefana','Ampanihy Ouest':'Atsimo-Andrefana','Benenitra':'Atsimo-Andrefana',
    'Beroroha':'Atsimo-Andrefana','Betioky Atsimo':'Atsimo-Andrefana','Morombe':'Atsimo-Andrefana',
    'Sakaraha':'Atsimo-Andrefana','Toliary-I':'Atsimo-Andrefana','Toliary-II':'Atsimo-Andrefana',
    'Befotaka':'Atsimo-Atsinanana','Farafangana':'Atsimo-Atsinanana','Midongy-Atsimo':'Atsimo-Atsinanana',
    'Vangaindrano':'Atsimo-Atsinanana','Vondrozo':'Atsimo-Atsinanana',
    'Antanambao Manampontsy':'Atsinanana','Brickaville':'Atsinanana','Mahanoro':'Atsinanana',
    'Marolambo':'Atsinanana','Toamasina I':'Atsinanana','Toamasina II':'Atsinanana','Vatomandry':'Atsinanana',
    'Kandreho':'Betsiboka','Maevatanana':'Betsiboka','Tsaratanana':'Betsiboka',
    'Ambato Boeni':'Boeny','Mahajanga I':'Boeny','Mahajanga II':'Boeny','Marovoay':'Boeny',
    'Mitsinjo':'Boeny','Soalala':'Boeny',
    'Fenoarivobe':'Bongolava','Tsiroanomandidy':'Bongolava',
    'Ambanja':'Diana','Ambilobe':'Diana','Antsiranana I':'Diana','Antsiranana II':'Diana','Nosy-Be':'Diana',
    'Iakora':'Ihorombe','Ihosy':'Ihorombe','Ivohibe':'Ihorombe',
    'Arivonimamo':'Itasy','Miarinarivo':'Itasy','Soavinandriana':'Itasy',
    'Ambalavao':'Matsiatra Ambony','Ambohimahasoa':'Matsiatra Ambony','Fianarantsoa I':'Matsiatra Ambony',
    'Ikalamavony':'Matsiatra Ambony','Isandra':'Matsiatra Ambony','Lalangina':'Matsiatra Ambony',
    'Vohibato':'Matsiatra Ambony',
    'Ambatomainty':'Melaky','Antsalova':'Melaky','Besalampy':'Melaky','Maintirano':'Melaky','Morafenobe':'Melaky',
    'Belo Sur Tsiribihina':'Menabe','Mahabo':'Menabe','Manja':'Menabe','Miandrivazo':'Menabe','Morondava':'Menabe',
    'Andapa':'Sava','Antalaha':'Sava','Sambava':'Sava','Vohemar':'Sava',
    'Analalava':'Sofia','Antsohihy':'Sofia','Bealanana':'Sofia','Befandriana Nord':'Sofia',
    'Mampikony':'Sofia','Mandritsara':'Sofia','Port-Berge (Boriziny-Vaovao)':'Sofia',
    'Ambatolampy':'Vakinankaratra','Antanifotsy':'Vakinankaratra','Antsirabe I':'Vakinankaratra',
    'Antsirabe II':'Vakinankaratra','Betafo':'Vakinankaratra','Faratsiho':'Vakinankaratra','Mandoto':'Vakinankaratra',
    'Ifanadiana':'Vatovavy-Fitovinany','Ikongo':'Vatovavy-Fitovinany','Manakara Atsimo':'Vatovavy-Fitovinany',
    'Mananjary':'Vatovavy-Fitovinany','Nosy-Varika':'Vatovavy-Fitovinany','Vohipeno':'Vatovavy-Fitovinany',
}

# ── Project paths (adjust here if your repo lives elsewhere) ────────
ROOT = '/home/zafinii/Documents/Project/Grop-App/public/'
OUT  = ROOT + 'models/'
SKIP = {'Plane', 'Cam_TopDown'}

# Tunables — change if you want different look
GAP_REGION    = 0.985   # 1.5% shrink → visible gap between adjacent regions
GAP_DISTRICT  = 0.978   # 2.2% shrink → slightly bigger gap when zoomed on districts
TH_REGION     = 0.06    # region plate Z thickness
TH_DISTRICT   = 0.04    # district plate Z thickness
DISTRICT_LIFT = TH_REGION + 0.005   # districts sit just above region plates
BEVEL_W       = 0.004
BEVEL_SEG     = 2

print("\n" + "="*60)
print("MADAGASCAR MAP CLEANUP — START")
print("="*60)

# ── 0) Object mode + deselect all ─────────────────────────────────────
if bpy.context.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')

all_meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in SKIP]
regions    = [o for o in all_meshes if o.name in REGIONS]
districts  = [o for o in all_meshes if o.name not in REGIONS]
print(f"Found {len(all_meshes)} meshes  ({len(regions)} regions / {len(districts)} districts)")

# ── 1) Per-mesh bmesh cleanup: flatten Z=0, weld close vertices, recalc normals ──
print("\n[1/6] Cleaning geometry...")
for i, obj in enumerate(all_meshes):
    obj.modifiers.clear()
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for v in bm.verts:
        v.co.z = 0.0
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.dissolve_limit(
        bm, angle_limit=math.radians(4),
        verts=bm.verts, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.update()
    if (i+1) % 25 == 0:
        print(f"   cleaned {i+1}/{len(all_meshes)}")
print(f"   done — {len(all_meshes)} meshes cleaned")

# ── 2) Origin → BOUNDS, then uniform shrink toward own center for clean gaps ──
print("\n[2/6] Creating clean separation gaps...")
for obj in all_meshes:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    g = GAP_REGION if obj.name in REGIONS else GAP_DISTRICT
    obj.scale = (g, g, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
print(f"   done — gaps applied (region={GAP_REGION}, district={GAP_DISTRICT})")

# ── 3) Solidify (uniform thin Z) + Bevel (soft edges), apply both ────
print("\n[3/6] Adding Solidify + Bevel modifiers...")
for obj in all_meshes:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    is_r = obj.name in REGIONS

    sol = obj.modifiers.new('Solidify', 'SOLIDIFY')
    sol.thickness = TH_REGION if is_r else TH_DISTRICT
    sol.offset = 1.0

    bev = obj.modifiers.new('Bevel', 'BEVEL')
    bev.width = BEVEL_W
    bev.segments = BEVEL_SEG
    bev.limit_method = 'ANGLE'
    bev.angle_limit = math.radians(35)

    bpy.ops.object.modifier_apply(modifier='Solidify')
    bpy.ops.object.modifier_apply(modifier='Bevel')
print(f"   done — solidify+bevel applied")

# ── 4) Lift districts above region plate (so they pop visually) ──────
print("\n[4/6] Lifting districts above regions...")
for obj in districts:
    obj.location.z += DISTRICT_LIFT
bpy.ops.object.select_all(action='DESELECT')
for obj in districts:
    obj.select_set(True)
if districts:
    bpy.context.view_layer.objects.active = districts[0]
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
print(f"   done — districts lifted by {DISTRICT_LIFT}")

# ── 5) Custom properties → preserved as gltf 'extras' = userData in three.js ──
print("\n[5/6] Setting custom userData...")
for obj in all_meshes:
    if obj.name in REGIONS:
        obj['kind'] = 'region'
        obj['region_id'] = obj.name
        obj['region_label'] = obj.name
    else:
        obj['kind'] = 'district'
        obj['region_id'] = ADM2_PARENT.get(obj.name, '')
        obj['district_label'] = obj.name
print(f"   done — userData written to {len(all_meshes)} meshes")

# ── 6) Materials: warm earth for regions, fresh sage for districts ───
print("\n[6/6] Assigning materials + exporting...")
def make_mat(name, color, roughness, metal=0.04):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        if 'Metallic' in bsdf.inputs:
            bsdf.inputs['Metallic'].default_value = metal
    return m

mat_region   = make_mat('Region_Earth',  (0.74, 0.65, 0.46), 0.78)
mat_district = make_mat('District_Sage', (0.42, 0.74, 0.50), 0.55)
for obj in all_meshes:
    obj.data.materials.clear()
    obj.data.materials.append(mat_region if obj.name in REGIONS else mat_district)

# ── Export 3 GLBs ────────────────────────────────────────────────────
plane = bpy.data.objects.get('Plane')
plane_was_visible = None
if plane:
    plane_was_visible = plane.hide_viewport
    plane.hide_viewport = True

def export_glb(filepath, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_extras=True,
        export_apply=False,
        export_yup=True,
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )

os.makedirs(OUT, exist_ok=True)
export_glb(OUT + 'madagascar_adm1.glb', regions)
print(f"   wrote {OUT}madagascar_adm1.glb  ({os.path.getsize(OUT + 'madagascar_adm1.glb'):,} bytes)")
export_glb(OUT + 'madagascar_adm2.glb', districts)
print(f"   wrote {OUT}madagascar_adm2.glb  ({os.path.getsize(OUT + 'madagascar_adm2.glb'):,} bytes)")
export_glb(ROOT + 'madagascar.glb', all_meshes)
print(f"   wrote {ROOT}madagascar.glb  ({os.path.getsize(ROOT + 'madagascar.glb'):,} bytes)")

if plane and plane_was_visible is not None:
    plane.hide_viewport = plane_was_visible

print("\n" + "="*60)
print("DONE — GLB files updated. Reload your dev server to see.")
print("="*60 + "\n")
