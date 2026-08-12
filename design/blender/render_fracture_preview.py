import bpy
import math
import os
import sys
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from generate_wakppu_assets import (
    ROOT,
    VARIANTS,
    clear_scene,
    create_broken_cube,
    create_broken_slice,
    create_broken_sphere,
    material,
)


clear_scene()
positions = [(-5.1, 1.7, 0), (-1.7, 1.7, 0), (1.7, 1.7, 0), (5.1, 1.7, 0), (-3.4, -1.5, 0), (0, -1.5, 0), (3.4, -1.5, 0)]

for (key, cfg), position in zip(VARIANTS.items(), positions):
    before = set(bpy.context.scene.objects)
    if cfg["shape"] == "slice_cake":
        create_broken_slice(key, cfg)
    elif cfg["shape"] in ("cube", "cake"):
        create_broken_cube(key, cfg)
    else:
        create_broken_sphere(key, cfg)

    container = bpy.data.objects.new(f"fracture_preview_{key}", None)
    bpy.context.collection.objects.link(container)
    container.location = position
    for piece in set(bpy.context.scene.objects) - before - {container}:
        if piece.type != "MESH":
            continue
        if piece.location.length > 0.01:
            direction = piece.location.normalized()
        else:
            center = sum((vertex.co for vertex in piece.data.vertices), Vector()) / len(piece.data.vertices)
            direction = center.normalized()
        piece.location += direction * 0.22
        piece.parent = container

floor_mat = material("fracture_preview_floor", (0.92, 0.88, 0.78, 1), 0.9)
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1.12))
bpy.context.object.data.materials.append(floor_mat)

bpy.ops.object.camera_add(location=(0, -18.2, 8.2))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0.2)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 53
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=(-4, -6, 9))
bpy.context.object.data.energy = 1400
bpy.context.object.data.shape = "DISK"
bpy.context.object.data.size = 5
bpy.ops.object.light_add(type="AREA", location=(5, -1, 5))
bpy.context.object.data.energy = 900
bpy.context.object.data.size = 4

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1400
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(ROOT, "wakppu-fracture-preview.png")
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.055, 0.045, 0.035, 1)
background.inputs["Strength"].default_value = 0.34
bpy.ops.render.render(write_still=True)
