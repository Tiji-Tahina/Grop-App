"""Script de diagnostic : liste toutes les collections et objets de la scène."""
import bpy

print("\n" + "="*60)
print("  DIAGNOSTIC - COLLECTIONS ET OBJETS")
print("="*60)

def print_collection(col, indent=0):
    prefix = "  " * indent
    obj_names = [o.name for o in col.objects]
    print(f"{prefix}📁 [{col.name}] ({len(obj_names)} objets)")
    for o in col.objects:
        print(f"{prefix}  ├─ {o.name} (type={o.type})")
    for child in col.children:
        print_collection(child, indent + 1)

# Collection maître de la scène
print_collection(bpy.context.scene.collection)

print("\n--- Toutes les collections (bpy.data) ---")
for col in bpy.data.collections:
    print(f"  • {col.name}")

print("\n--- Tous les objets ---")
for obj in bpy.data.objects:
    print(f"  • {obj.name} (type={obj.type})")

print("="*60 + "\n")
