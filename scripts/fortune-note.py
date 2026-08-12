"""Build a realistic folded fortune-cookie paper slip and export it as GLB.

The model deliberately returns to the original app silhouette: one continuous,
narrow paper strip folded back on itself.  The geometry adds a compressed round
crease, unequal free ends, slight hand-made warping, visible paper thickness,
and muted printed ink without turning the slip into a fantasy envelope.

Run:
  & "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background `
      --python scripts/fortune-note.py -- --out public/models/fortune-note.glb `
      --blend design/blender/fortune-note.blend
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector


WIDTH = 0.84
FRONT_LENGTH = 0.60
BACK_LENGTH = 0.535
FOLD_RADIUS = 0.031
PAPER_THICKNESS = 0.0055
EDGE_BEVEL = 0.0011
TRANSVERSE_SEGMENTS = 18
FRONT_SEGMENTS = 42
FOLD_SEGMENTS = 18
BACK_SEGMENTS = 38
Y_CENTER = (FRONT_LENGTH - FOLD_RADIUS) * 0.5


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def rgba(hex_color):
    value = hex_color.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def make_principled_material(name, color, roughness, sheen=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba(color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.22
    if "Sheen Weight" in bsdf.inputs:
        bsdf.inputs["Sheen Weight"].default_value = sheen
    if "Sheen Roughness" in bsdf.inputs:
        bsdf.inputs["Sheen Roughness"].default_value = 0.92
    return material


def edge_variation(progress, side):
    # Deterministic sub-millimetre-ish cut variation; no random export drift.
    return side * (
        math.sin(progress * math.pi * 7.0 + side * 0.7) * 0.0017
        + math.sin(progress * math.pi * 17.0 + side * 1.3) * 0.0007
    )


def front_surface(x, y):
    width_ratio = x / (WIDTH * 0.5)
    free = max(0.0, min(1.0, y / FRONT_LENGTH))
    camber = 0.0058 * width_ratio * width_ratio * (0.35 + free * 0.65)
    long_warp = 0.0050 * math.sin(free * math.pi * 1.15 + 0.3) * (0.2 + free * 0.8)
    diagonal = 0.0040 * width_ratio * free
    return FOLD_RADIUS + 0.012 * free * free + camber + long_warp + diagonal


def back_surface(x, y):
    width_ratio = x / (WIDTH * 0.5)
    free = max(0.0, min(1.0, y / BACK_LENGTH))
    camber = -0.0042 * width_ratio * width_ratio * (0.3 + free * 0.7)
    long_warp = -0.0085 * free * free + 0.0025 * math.sin(free * math.pi * 1.7)
    diagonal = -0.0030 * width_ratio * free
    return -FOLD_RADIUS + camber + long_warp + diagonal


def build_path_rows():
    rows = []

    # Front free edge -> compressed fold.
    for index in range(FRONT_SEGMENTS + 1):
        ratio = index / FRONT_SEGMENTS
        y = FRONT_LENGTH * (1.0 - ratio)
        rows.append(("front", ratio, y))

    # The fold is a true semicircular bridge, not two intersecting sheets.
    for index in range(1, FOLD_SEGMENTS + 1):
        ratio = index / FOLD_SEGMENTS
        angle = ratio * math.pi
        rows.append(("fold", ratio, angle))

    # Fold -> slightly shorter back free edge.
    for index in range(1, BACK_SEGMENTS + 1):
        ratio = index / BACK_SEGMENTS
        y = BACK_LENGTH * ratio
        rows.append(("back", ratio, y))

    return rows


def surface_point(section, section_value, across):
    side = -1 if across < 0 else 1
    x = across * WIDTH * 0.5
    if section == "front":
        y = section_value
        progress = 1.0 - y / FRONT_LENGTH
        x += edge_variation(progress, side) * abs(across) ** 7
        z = front_surface(x, y)
    elif section == "fold":
        angle = section_value
        y = -math.sin(angle) * FOLD_RADIUS
        progress = angle / math.pi
        x += edge_variation(progress, side) * abs(across) ** 7
        transverse = 0.0022 * (x / (WIDTH * 0.5)) ** 2
        z = math.cos(angle) * FOLD_RADIUS + transverse * math.cos(angle)
    else:
        y = section_value
        progress = y / BACK_LENGTH
        # The rear leaf sits a little off-centre like a real machine-fed slip.
        x += 0.010 * progress + edge_variation(progress, side) * abs(across) ** 7
        z = back_surface(x, y)
    return (x, y - Y_CENTER, z)


def build_paper_mesh():
    rows = build_path_rows()
    vertices = []
    faces = []

    for section, _, section_value in rows:
        for column in range(TRANSVERSE_SEGMENTS + 1):
            across = column / TRANSVERSE_SEGMENTS * 2.0 - 1.0
            vertices.append(surface_point(section, section_value, across))

    stride = TRANSVERSE_SEGMENTS + 1
    for row in range(len(rows) - 1):
        for column in range(TRANSVERSE_SEGMENTS):
            a = row * stride + column
            b = a + 1
            c = a + stride + 1
            d = a + stride
            faces.append((a, d, c, b))

    mesh = bpy.data.meshes.new("FortuneSlip_PaperMesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update(calc_edges=True)
    paper = bpy.data.objects.new("FortuneSlip_Paper", mesh)
    bpy.context.collection.objects.link(paper)

    paper.data.materials.append(make_principled_material("fortune_paper", "#F3E8CC", 0.86, 0.18))
    paper.data.materials.append(make_principled_material("fortune_paper_edge", "#D4C49F", 0.92, 0.05))

    bpy.context.view_layer.objects.active = paper
    paper.select_set(True)
    solidify = paper.modifiers.new("real_paper_thickness", "SOLIDIFY")
    solidify.thickness = PAPER_THICKNESS
    solidify.offset = 0.0
    solidify.use_even_offset = True
    solidify.material_offset_rim = 1
    bevel = paper.modifiers.new("soft_cut_edges", "BEVEL")
    bevel.width = EDGE_BEVEL
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(24)
    for modifier in list(paper.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    for polygon in paper.data.polygons:
        polygon.use_smooth = True
    return paper


def build_ink_strip(name, y, half_width, thickness=0.009, x_offset=0.0):
    segments = 16
    vertices = []
    faces = []
    for row, y_offset in enumerate((-thickness * 0.5, thickness * 0.5)):
        for index in range(segments + 1):
            ratio = index / segments
            x = x_offset + (ratio * 2.0 - 1.0) * half_width
            yy = y + y_offset
            z = front_surface(x, yy) + PAPER_THICKNESS * 0.58
            # Slightly irregular ink edge, still flat enough to read as printing.
            z += math.sin(index * 1.9 + row) * 0.00015
            vertices.append((x, yy - Y_CENTER, z))
    stride = segments + 1
    for index in range(segments):
        faces.append((index, index + 1, stride + index + 1, stride + index))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def add_printed_fortune():
    ink_material = make_principled_material("fortune_ink", "#85463A", 0.72, 0.0)
    specs = (
        ("FortuneSlip_Ink_01", 0.405, 0.235, 0.010, -0.018),
        ("FortuneSlip_Ink_02", 0.350, 0.180, 0.009, 0.028),
        ("FortuneSlip_Ink_03", 0.296, 0.112, 0.008, -0.070),
    )
    objects = []
    for name, y, half_width, thickness, x_offset in specs:
        obj = build_ink_strip(name, y, half_width, thickness, x_offset)
        obj.data.materials.append(ink_material)
        objects.append(obj)
    return objects


def orient_for_gltf(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.transform.rotate(value=math.radians(90), orient_axis="X")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def build_note(clear=True):
    if clear:
        clear_scene()
    else:
        for obj in list(bpy.data.objects):
            if obj.name.startswith("FortuneSlip_"):
                bpy.data.objects.remove(obj, do_unlink=True)

    paper = build_paper_mesh()
    ink = add_printed_fortune()
    objects = [paper, *ink]
    orient_for_gltf(objects)

    root = bpy.data.objects.new("fortune_note", None)
    bpy.context.collection.objects.link(root)
    for obj in objects:
        obj.parent = root

    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = paper
    return root, objects


def bounds(objects):
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    low = Vector(tuple(min(c[index] for c in corners) for index in range(3)))
    high = Vector(tuple(max(c[index] for c in corners) for index in range(3)))
    return low, high


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--blend")
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return parser.parse_args(values)


def main():
    args = parse_args()
    root, objects = build_note(clear=True)
    low, high = bounds(objects)
    print("NOTE_BBOX_MIN %.4f %.4f %.4f" % tuple(low))
    print("NOTE_BBOX_MAX %.4f %.4f %.4f" % tuple(high))
    print("NOTE_VERTS %d" % sum(len(obj.data.vertices) for obj in objects if obj.type == "MESH"))

    if args.blend:
        blend_path = os.path.abspath(args.blend)
        os.makedirs(os.path.dirname(blend_path), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        print("NOTE_BLEND_SAVED %s" % blend_path)

    output_path = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=False,
    )
    print("NOTE_EXPORTED %s (%d bytes)" % (output_path, os.path.getsize(output_path)))


if __name__ == "__main__":
    main()
