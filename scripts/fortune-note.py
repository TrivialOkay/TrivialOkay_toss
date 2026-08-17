"""Build a decorated folded fortune-cookie paper slip and export it as GLB.

The model keeps the original app silhouette: one continuous narrow paper strip
folded back on itself.  The old gold-star and coral-seal art direction is brought
back as thin inlaid decoration so the asset still reads as actual paper at the
small size used inside the Wakppu ball.

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


def make_principled_material(name, color, roughness, sheen=0.0, metallic=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba(color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
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


def build_vertical_strip(name, x, y_start, y_end, thickness=0.007):
    vertices = []
    faces = []
    segments = 16
    for index in range(segments + 1):
        ratio = index / segments
        y = y_start + (y_end - y_start) * ratio
        for side in (-1.0, 1.0):
            xx = x + side * thickness * 0.5
            z = front_surface(xx, y) + PAPER_THICKNESS * 0.59
            vertices.append((xx, y - Y_CENTER, z))
    for index in range(segments):
        a = index * 2
        faces.append((a, a + 2, a + 3, a + 1))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def build_star(name, x, y, radius, material, points=5, rotation=math.pi * 0.5):
    vertices = [(x, y - Y_CENTER, front_surface(x, y) + PAPER_THICKNESS * 0.62)]
    for index in range(points * 2):
        angle = rotation + index * math.pi / points
        point_radius = radius if index % 2 == 0 else radius * 0.42
        xx = x + math.cos(angle) * point_radius
        yy = y + math.sin(angle) * point_radius
        zz = front_surface(xx, yy) + PAPER_THICKNESS * 0.63
        vertices.append((xx, yy - Y_CENTER, zz))
    faces = []
    for index in range(points * 2):
        faces.append((0, index + 1, (index + 1) % (points * 2) + 1))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def build_seal(x, y, seal_material, gold_material):
    z = front_surface(x, y) + PAPER_THICKNESS * 0.8
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.066, depth=0.009, location=(x, y - Y_CENTER, z))
    seal = bpy.context.object
    seal.name = "FortuneSlip_CoralSeal"
    seal.data.materials.append(seal_material)
    bevel = seal.modifiers.new("soft_wax_edge", "BEVEL")
    bevel.width = 0.003
    bevel.segments = 2
    bpy.context.view_layer.objects.active = seal
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    star = build_star("FortuneSlip_SealStar", x, y, 0.028, gold_material)
    star.location.z += 0.009
    return [seal, star]


def add_printed_fortune():
    ink_material = make_principled_material("fortune_ink", "#85463A", 0.72, 0.0)
    gold_material = make_principled_material("fortune_gold_foil", "#D7A64B", 0.38, 0.0, 0.34)
    seal_material = make_principled_material("fortune_coral_seal", "#F08F83", 0.52, 0.0)
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

    # Thin foil framing and the asymmetric star/seal composition echo the
    # original Blender mock-up without turning the slip into a thick plaque.
    border_specs = (
        ("FortuneSlip_GoldTop", 0.520, 0.342, 0.006, 0.0),
        ("FortuneSlip_GoldBottom", 0.185, 0.342, 0.006, 0.0),
    )
    for name, y, half_width, thickness, x_offset in border_specs:
        obj = build_ink_strip(name, y, half_width, thickness, x_offset)
        obj.data.materials.append(gold_material)
        objects.append(obj)
    for name, x in (("FortuneSlip_GoldLeft", -0.342), ("FortuneSlip_GoldRight", 0.342)):
        obj = build_vertical_strip(name, x, 0.185, 0.520)
        obj.data.materials.append(gold_material)
        objects.append(obj)

    objects.extend((
        build_star("FortuneSlip_MainStar", -0.105, 0.258, 0.057, gold_material),
        build_star("FortuneSlip_TinyStar", -0.244, 0.254, 0.025, gold_material, rotation=0.0),
        build_star("FortuneSlip_TinyStar02", 0.045, 0.228, 0.019, gold_material, rotation=0.2),
    ))
    objects.extend(build_seal(0.245, 0.250, seal_material, gold_material))
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


def aim_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_preview(path):
    floor_material = make_principled_material("fortune_preview_floor", "#2A1C1B", 0.82)
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -0.285))
    floor = bpy.context.object
    floor.name = "FortunePreviewFloor"
    floor.data.materials.append(floor_material)

    bpy.ops.object.camera_add(location=(1.15, -2.35, 1.05))
    camera = bpy.context.object
    camera.name = "FortunePreviewCamera"
    camera.data.lens = 68
    aim_at(camera, (0, 0, 0.02))
    bpy.context.scene.camera = camera

    for name, location, energy, size, color in (
        ("FortuneKey", (-2.0, -2.2, 3.0), 680, 2.8, (1.0, 0.83, 0.67)),
        ("FortuneFill", (2.2, -1.0, 1.7), 520, 2.4, (0.74, 0.86, 1.0)),
        ("FortuneRim", (0.3, 2.2, 2.4), 620, 2.0, (1.0, 0.67, 0.46)),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = color
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        bpy.context.collection.objects.link(light)
        aim_at(light, (0, 0, 0))

    world = bpy.data.worlds.new("FortunePreviewWorld") if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.011, 0.012, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.28

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.abspath(path)
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)
    print("NOTE_PREVIEW %s" % scene.render.filepath)


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--blend")
    parser.add_argument("--preview")
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
    if args.preview:
        render_preview(args.preview)


if __name__ == "__main__":
    main()
