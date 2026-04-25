import bpy

def hex_to_rgba(hex_color, alpha=1.0, is_dark=False):
    """
    Convertit un code hex en RGBA linéaire pour Blender.
    Pour les couleurs très sombres (comme #0a2a3f), on peut éviter la correction gamma stricte
    ou l'atténuer pour garder la vraie perception visuelle.
    """
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r, g, b = tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))
        if not is_dark:
            # Correction Gamma standard pour couleurs claires (sRGB -> Linéaire)
            r, g, b = (r**2.2, g**2.2, b**2.2)
        else:
            # Pour les lignes très sombres, une correction plus douce ou nulle 
            # évite qu'elles ne deviennent complètement noires/invisibles.
            r, g, b = (r**1.5, g**1.5, b**1.5)
        return (r, g, b, alpha)
    return (1.0, 1.0, 1.0, alpha)

def create_topo_material():
    mat_name = "Topographic_Map_Mat"
    
    if mat_name in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials[mat_name])
        
    mat = bpy.data.materials.new(name=mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    
    for node in nodes:
        nodes.remove(node)
        
    # --- NOEUDS DE BASE ---
    node_output = nodes.new(type='ShaderNodeOutputMaterial')
    node_output.location = (1600, 0)
    
    node_bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    node_bsdf.location = (1300, 0)
    node_bsdf.inputs['Roughness'].default_value = 1.0  # Papier ultra mat
    if 'Specular IOR Level' in node_bsdf.inputs:
        node_bsdf.inputs['Specular IOR Level'].default_value = 0.02
    elif 'Specular' in node_bsdf.inputs:
        node_bsdf.inputs['Specular'].default_value = 0.02

    # --- VARIATION DE COULEUR PAR REGION (Fond Administratif) ---
    node_obj_info = nodes.new(type='ShaderNodeObjectInfo')
    node_obj_info.location = (-200, 300)
    
    node_color_ramp = nodes.new(type='ShaderNodeValToRGB')
    node_color_ramp.location = (100, 300)
    node_color_ramp.color_ramp.interpolation = 'EASE'
    
    # Palette "Statskog" / Carte admin (papier mat, teintes subtiles)
    colors = [
        hex_to_rgba("#f4f1e1"), # Beige papier
        hex_to_rgba("#e3ebd3"), # Vert très pâle
        hex_to_rgba("#d9e6e6"), # Bleu-gris pâle
        hex_to_rgba("#f0e3df"), # Rose/terre pâle
        hex_to_rgba("#e8e6dd")  # Gris chaud clair
    ]
    
    elements = node_color_ramp.color_ramp.elements
    # Il y a 2 éléments par défaut, on en ajoute pour avoir la taille de la palette
    while len(elements) < len(colors):
        elements.new(0.0)
        
    for i, color in enumerate(colors):
        elements[i].position = i / (len(colors) - 1)
        elements[i].color = color

    links.new(node_obj_info.outputs['Random'], node_color_ramp.inputs['Fac'])

    # --- NOEUDS DE CONTRÔLE (Paramètres faciles à ajuster) ---
    # Échelle globale du bruit
    val_scale = nodes.new(type='ShaderNodeValue')
    val_scale.location = (-1200, 0)
    val_scale.label = "1. ECHELLE CARTE (Scale)"
    val_scale.outputs[0].default_value = 0.2  # Bruit très large pour faire de grandes courbes régulières
    
    # Densité des lignes
    val_density = nodes.new(type='ShaderNodeValue')
    val_density.location = (-500, -200)
    val_density.label = "2. DENSITE LIGNES (Multiply)"
    val_density.outputs[0].default_value = 15.0
    
    # Épaisseur des lignes
    val_thickness = nodes.new(type='ShaderNodeValue')
    val_thickness.location = (-100, -250)
    val_thickness.label = "3. EPAISSEUR LIGNES"
    val_thickness.outputs[0].default_value = 0.05

    # --- GENERATION DES LIGNES TOPOGRAPHIQUES ---
    node_tex_coord = nodes.new(type='ShaderNodeTexCoord')
    node_tex_coord.location = (-1200, -200)
    
    node_mapping = nodes.new(type='ShaderNodeMapping')
    node_mapping.location = (-1000, -200)
    links.new(val_scale.outputs[0], node_mapping.inputs['Scale'])
    
    node_noise = nodes.new(type='ShaderNodeTexNoise')
    node_noise.location = (-800, -200)
    node_noise.inputs['Detail'].default_value = 2.0     # Peu de détails pour des courbes lisses
    node_noise.inputs['Roughness'].default_value = 0.4
    
    node_math_mult = nodes.new(type='ShaderNodeMath')
    node_math_mult.location = (-500, -20)
    node_math_mult.operation = 'MULTIPLY'
    
    node_math_frac = nodes.new(type='ShaderNodeMath')
    node_math_frac.location = (-300, -20)
    node_math_frac.operation = 'FRACT'
    
    node_math_less = nodes.new(type='ShaderNodeMath')
    node_math_less.location = (-100, -20)
    node_math_less.operation = 'LESS_THAN'
    
    links.new(node_tex_coord.outputs['Object'], node_mapping.inputs['Vector'])
    links.new(node_mapping.outputs['Vector'], node_noise.inputs['Vector'])
    links.new(node_noise.outputs['Fac'], node_math_mult.inputs[0])
    links.new(val_density.outputs[0], node_math_mult.inputs[1])
    links.new(node_math_mult.outputs['Value'], node_math_frac.inputs[0])
    links.new(node_math_frac.outputs['Value'], node_math_less.inputs[0])
    links.new(val_thickness.outputs[0], node_math_less.inputs[1])
    
    # --- MELANGE FINAL ---
    color_line = hex_to_rgba("#0a2a3f", is_dark=True)
    
    if bpy.app.version >= (3, 4, 0):
        node_mix = nodes.new(type='ShaderNodeMix')
        node_mix.data_type = 'RGBA'
        node_mix.inputs['B'].default_value = color_line
        mix_fac_input = node_mix.inputs['Factor']
        mix_base_input = node_mix.inputs['A']
        mix_out = node_mix.outputs['Result']
    else:
        node_mix = nodes.new(type='ShaderNodeMixRGB')
        node_mix.inputs['Color2'].default_value = color_line
        mix_fac_input = node_mix.inputs['Fac']
        mix_base_input = node_mix.inputs['Color1']
        mix_out = node_mix.outputs['Color']

    node_mix.location = (600, 150)
    
    links.new(node_color_ramp.outputs['Color'], mix_base_input)
    links.new(node_math_less.outputs['Value'], mix_fac_input)
    links.new(mix_out, node_bsdf.inputs['Base Color'])
    links.new(node_bsdf.outputs['BSDF'], node_output.inputs['Surface'])
    
    return mat

def apply_material_to_target_objects(mat):
    count = 0
    # Liste de mots-clés stricts à exclure
    exclude_keywords = ['border', 'text', 'ocean', 'mer', 'fond', 'background', 'camera', 'light']
    
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
            
        obj_name_lower = obj.name.lower()
        if any(keyword in obj_name_lower for keyword in exclude_keywords):
            continue
            
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        count += 1
        
        # Le viewport affichera le même material (gris), mais au rendu ça sera varié
        obj.color = (0.04, 0.16, 0.25, 1.0)
            
    return count

def setup_scene():
    if "World" in bpy.data.worlds and bpy.data.worlds["World"].use_nodes:
        bg_node = bpy.data.worlds["World"].node_tree.nodes.get("Background")
        if bg_node:
            bg_node.inputs[0].default_value = hex_to_rgba("#f5f5f0")
    
    if bpy.context.scene.render.engine == 'EEVEE':
        if hasattr(bpy.context.scene.eevee, 'use_gtao'):
            bpy.context.scene.eevee.use_gtao = True
            bpy.context.scene.eevee.gtao_distance = 2.0
        if hasattr(bpy.context.scene.eevee, 'use_soft_shadows'):
            bpy.context.scene.eevee.use_soft_shadows = True

if __name__ == "__main__":
    mat = create_topo_material()
    count = apply_material_to_target_objects(mat)
    setup_scene()
    print(f"Material '{mat.name}' applied to {count} regions/districts objects.")
    print("Le matériau contient des noeuds 'Value' renommés pour facilement ajuster l'échelle, l'épaisseur et la densité des lignes.")
