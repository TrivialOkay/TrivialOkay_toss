"""Create two spherical Wakppu variants derived from the current ball silhouette.

Outputs:
  design/blender/themed-wakppu-balls.blend
  design/blender/themed-wakppu-balls-preview.png
  public/models/wakppu/dubai.glb
  public/models/wakppu/dubai-broken.glb
  public/models/wakppu/butter_bar.glb
  public/models/wakppu/butter_bar-broken.glb

`dubai` is kept as the exported compatibility key for the Korean 두쫀쿠 variant.
"""

from __future__ import annotations

import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "public" / "models" / "wakppu"
BLEND_PATH = HERE / "themed-wakppu-balls.blend"
PREVIEW_PATH = HERE / "themed-wakppu-balls-preview.png"

if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from generate_wakppu_assets import create_broken_sphere  # noqa: E402


VARIANTS = {
    "dubai": {
        "label": "두쫀쿠 왁뿌볼",
        "shape": "sphere",
        "outer": (0.145, 0.035, 0.014, 1.0),
        "inner": (0.46, 0.64, 0.07, 1.0),
        "roughness": 0.31,
    },
    "butter_bar": {
        "label": "버터바 왁뿌볼",
        "shape": "bar",
        "outer": (0.98, 0.61, 0.13, 1.0),
        "inner": (1.0, 0.79, 0.28, 1.0),
        "roughness": 0.46,
    },
}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
    metallic: float = 0.0,
    coat: float = 0.0,
    coat_roughness: float = 0.2,
) -> bpy.types.Material:
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
    if "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = coat_roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.32
    return mat


def smooth(obj: bpy.types.Object, value: bool = True) -> None:
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = value


def add_uv_sphere(
    name: str,
    radius: float,
    location: tuple[float, float, float],
    mat: bpy.types.Material,
    scale: tuple[float, float, float] = (1, 1, 1),
    segments: int = 48,
    rings: int = 24,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=radius,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_rounded_cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    bevel: float,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    modifier = obj.modifiers.new("soft_edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    smooth(obj)
    return obj


def curve_tube(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    mat: bpy.types.Material,
    cyclic: bool = False,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name + "Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinates in zip(spline.points, points):
        point.co = (*coordinates, 1.0)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    obj.name = name
    obj.select_set(False)
    return obj


def front_surface_point(x: float, z: float, offset: float = 0.014) -> tuple[float, float, float]:
    y = -math.sqrt(max(0.02, 1.0 - x * x - z * z)) - offset
    return (x, y, z)


def add_face(root: bpy.types.Object, face_mat: bpy.types.Material, z_offset: float = 0.0) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    for side, x in (("L", -0.275), ("R", 0.275)):
        eye = add_uv_sphere(
            f"{root.name}_eye_{side}",
            0.083,
            (x, -0.972, 0.18 + z_offset),
            face_mat,
            scale=(1.0, 0.25, 0.64),
            segments=20,
            rings=12,
        )
        eye.parent = root
        objects.append(eye)
    mouth = add_rounded_cube(
        f"{root.name}_mouth",
        (0, -0.991, -0.095 + z_offset),
        (0.15, 0.026, 0.026),
        face_mat,
        0.026,
    )
    mouth.parent = root
    objects.append(mouth)
    return objects


def add_text(
    name: str,
    body: str,
    size: float,
    location: tuple[float, float, float],
    mat: bpy.types.Material,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name + "Curve", "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.002
    curve.bevel_depth = 0.0008
    curve.bevel_resolution = 1
    text = bpy.data.objects.new(name, curve)
    text.location = location
    text.rotation_euler.x = math.pi / 2
    bpy.context.collection.objects.link(text)
    curve.materials.append(mat)
    bpy.context.view_layer.objects.active = text
    text.select_set(True)
    bpy.ops.object.convert(target="MESH")
    text = bpy.context.object
    text.name = name
    text.select_set(False)
    return text


def spherical_band(
    name: str,
    z_min: float,
    z_max: float,
    mat: bpy.types.Material,
    radius_offset: float = 0.012,
    segments: int = 64,
    rows: int = 5,
) -> bpy.types.Object:
    vertices = []
    faces = []
    for row in range(rows + 1):
        z = z_min + (z_max - z_min) * row / rows
        radius = math.sqrt(max(0.02, 1.0 - z * z)) + radius_offset
        for index in range(segments):
            angle = math.tau * index / segments
            vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, z))
    for row in range(rows):
        for index in range(segments):
            next_index = (index + 1) % segments
            a = row * segments + index
            b = row * segments + next_index
            c = (row + 1) * segments + next_index
            d = (row + 1) * segments + index
            faces.append((a, b, c, d))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    smooth(obj)
    return obj


def build_dujjonku() -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    chocolate = material("dujjonku_dark_chocolate", (0.14, 0.027, 0.010, 1), 0.29, coat=0.62, coat_roughness=0.16)
    chocolate_highlight = material("dujjonku_milk_chocolate", (0.31, 0.078, 0.026, 1), 0.39, coat=0.38)
    pistachio = material("dujjonku_pistachio", (0.49, 0.66, 0.10, 1), 0.54)
    kataifi = material("dujjonku_kataifi_gold", (0.78, 0.43, 0.06, 1), 0.63, metallic=0.08)
    face = material("wakppu_face_dark", (0.035, 0.015, 0.009, 1), 0.64)

    root = bpy.data.objects.new("wakppu_dujjonku", None)
    bpy.context.collection.objects.link(root)
    root["wakppuKind"] = "dubai"
    root["displayName"] = "두쫀쿠 왁뿌볼"
    root["state"] = "intact"
    objects: list[bpy.types.Object] = [root]

    body = add_uv_sphere("Dujjonku_ChocolateShell", 1.0, (0, 0, 0), chocolate, scale=(1, 1, 0.98), segments=64, rings=32)
    body.parent = root
    objects.append(body)

    # Projected zig-zag drizzle and thin kataifi strands keep the shared sphere
    # silhouette intact while making the flavour obvious from the front camera.
    for line_index, z_base in enumerate((0.63, 0.48)):
        points = []
        for index in range(13):
            x = -0.72 + index * 0.12
            z = z_base + (0.045 if index % 2 == 0 else -0.045)
            points.append(front_surface_point(x, z, 0.020))
        drizzle = curve_tube(f"Dujjonku_PistachioDrizzle_{line_index + 1}", points, 0.024, pistachio)
        drizzle.parent = root
        objects.append(drizzle)

    strand_specs = (
        (-0.72, -0.41, -0.34, 0.02),
        (-0.50, -0.33, -0.42, 0.03),
        (0.42, 0.70, -0.37, -0.01),
        (0.21, 0.53, -0.48, 0.02),
    )
    for index, (x0, x1, z, bend) in enumerate(strand_specs):
        points = []
        for step in range(7):
            ratio = step / 6
            x = x0 + (x1 - x0) * ratio
            zz = z + math.sin(ratio * math.pi) * bend
            points.append(front_surface_point(x, zz, 0.019))
        strand = curve_tube(f"Dujjonku_Kataifi_{index + 1}", points, 0.012, kataifi)
        strand.parent = root
        objects.append(strand)

    crumb_specs = (
        (-0.62, 0.26, 0.042, pistachio),
        (0.62, 0.30, 0.036, kataifi),
        (-0.48, -0.62, 0.032, kataifi),
        (0.52, -0.58, 0.040, pistachio),
        (0.72, 0.05, 0.028, chocolate_highlight),
    )
    for index, (x, z, size, crumb_mat) in enumerate(crumb_specs):
        px, py, pz = front_surface_point(x, z, 0.024)
        crumb = add_uv_sphere(
            f"Dujjonku_Crumb_{index + 1}",
            size,
            (px, py, pz),
            crumb_mat,
            scale=(1.35, 0.58, 0.72),
            segments=12,
            rings=6,
        )
        crumb.parent = root
        objects.append(crumb)

    objects.extend(add_face(root, face))
    return root, objects


def build_butter_bar() -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    butter = material("butter_bar_golden_butter", (0.98, 0.62, 0.14, 1), 0.43, coat=0.36, coat_roughness=0.24)
    butter_edge = material("butter_bar_scored_edge", (0.79, 0.36, 0.055, 1), 0.62)
    wrapper = material("butter_bar_wax_paper", (0.94, 0.87, 0.70, 1), 0.76, coat=0.08)
    wrapper_shadow = material("butter_bar_wrapper_fold", (0.72, 0.62, 0.46, 1), 0.84)
    red = material("butter_bar_red_ink", (0.72, 0.035, 0.022, 1), 0.54)
    face = material("wakppu_face_dark", (0.035, 0.015, 0.009, 1), 0.64)

    root = bpy.data.objects.new("wakppu_butter_bar", None)
    bpy.context.collection.objects.link(root)
    root["wakppuKind"] = "butter_bar"
    root["displayName"] = "버터바 왁뿌볼"
    root["state"] = "intact"
    objects: list[bpy.types.Object] = [root]

    # Long rounded stick: this is deliberately not constrained to the spherical
    # Wakppu silhouette. The dimensions stay compact enough for the same camera.
    body = add_rounded_cube("ButterBar_ButterCore", (0, 0, 0), (1.28, 0.46, 0.37), butter, 0.13)
    body.parent = root
    objects.append(body)

    # A central wax-paper sleeve leaves both golden ends visible and reads clearly
    # as a wrapped butter stick even at the app's small render size.
    sleeve = add_rounded_cube("ButterBar_WaxPaperSleeve", (0, 0, 0), (0.91, 0.475, 0.385), wrapper, 0.075)
    sleeve.parent = root
    objects.append(sleeve)
    for side, x in (("L", -0.92), ("R", 0.92)):
        collar = add_rounded_cube(f"ButterBar_WrapperCollar_{side}", (x, 0, 0), (0.055, 0.47, 0.34), wrapper_shadow, 0.035)
        collar.parent = root
        objects.append(collar)
        crease = curve_tube(
            f"ButterBar_FrontCrease_{side}",
            [(x, -0.482, -0.25), (x + (-0.025 if x < 0 else 0.025), -0.487, 0), (x, -0.482, 0.25)],
            0.009,
            wrapper_shadow,
        )
        crease.parent = root
        objects.append(crease)

    top_seam = add_rounded_cube("ButterBar_TopPaperSeam", (0, 0.39, 0.355), (0.68, 0.035, 0.018), wrapper_shadow, 0.012)
    top_seam.rotation_euler.x = math.radians(-8)
    top_seam.parent = root
    objects.append(top_seam)

    label = add_text("ButterBar_Label", "BUTTER", 0.112, (0, -0.487, -0.205), red)
    label.parent = root
    objects.append(label)
    for index, z in enumerate((-0.295, -0.115)):
        rule = curve_tube(
            f"ButterBar_LabelRule_{index + 1}",
            [(-0.38, -0.488, z), (0.38, -0.488, z)],
            0.008,
            red,
        )
        rule.parent = root
        objects.append(rule)

    for side, x in (("L", -1.105), ("R", 1.105)):
        groove = curve_tube(
            f"ButterBar_ExposedScore_{side}",
            [(x, -0.24, 0.382), (x, 0.24, 0.382)],
            0.011,
            butter_edge,
        )
        groove.parent = root
        objects.append(groove)

    for side, x in (("L", -0.245), ("R", 0.245)):
        eye = add_uv_sphere(
            f"ButterBar_eye_{side}",
            0.067,
            (x, -0.488, 0.115),
            face,
            scale=(1.0, 0.24, 0.66),
            segments=18,
            rings=10,
        )
        eye.parent = root
        objects.append(eye)
    mouth = add_rounded_cube("ButterBar_mouth", (0, -0.492, -0.030), (0.125, 0.020, 0.022), face, 0.022)
    mouth.parent = root
    objects.append(mouth)
    return root, objects


def build_broken_butter_bar() -> None:
    butter_outer = material("butter_bar_outer", (0.98, 0.61, 0.13, 1), 0.46)
    wrapper_outer = material("butter_bar_wax_paper", (0.94, 0.87, 0.70, 1), 0.76)
    butter_inner = material("butter_bar_fracture_texture", (1.0, 0.79, 0.28, 1), 0.68)
    xs = (-1.28, -0.64, 0.0, 0.64, 1.28)
    ys = (-0.46, 0.0, 0.46)
    zs = (-0.37, 0.0, 0.37)

    def grid_point(x_index: int, y_index: int, z_index: int) -> tuple[float, float, float]:
        x, y, z = xs[x_index], ys[y_index], zs[z_index]
        seed = (x_index + 1) * 17.31 + (y_index + 1) * 31.77 + (z_index + 1) * 47.13
        if 0 < x_index < len(xs) - 1:
            x += math.sin(seed) * 0.045
        if 0 < y_index < len(ys) - 1:
            y += math.cos(seed * 1.19) * 0.032
        if 0 < z_index < len(zs) - 1:
            z += math.sin(seed * 0.83) * 0.030
        return (x, y, z)

    fragment_index = 0
    for z_index in range(len(zs) - 1):
        for y_index in range(len(ys) - 1):
            for x_index in range(len(xs) - 1):
                vertices = [
                    grid_point(x_index, y_index, z_index),
                    grid_point(x_index + 1, y_index, z_index),
                    grid_point(x_index + 1, y_index + 1, z_index),
                    grid_point(x_index, y_index + 1, z_index),
                    grid_point(x_index, y_index, z_index + 1),
                    grid_point(x_index + 1, y_index, z_index + 1),
                    grid_point(x_index + 1, y_index + 1, z_index + 1),
                    grid_point(x_index, y_index + 1, z_index + 1),
                ]
                faces = [
                    (0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                    (3, 7, 6, 2), (0, 4, 7, 3), (1, 2, 6, 5),
                ]
                outer_faces = (
                    z_index == 0,
                    z_index == len(zs) - 2,
                    y_index == 0,
                    y_index == len(ys) - 2,
                    x_index == 0,
                    x_index == len(xs) - 2,
                )
                wrapped_cell = x_index in (1, 2)
                mesh = bpy.data.meshes.new(f"fragment_{fragment_index:02d}")
                mesh.from_pydata(vertices, [], faces)
                mesh.materials.append(butter_outer)
                mesh.materials.append(wrapper_outer)
                mesh.materials.append(butter_inner)
                for polygon, is_outer in zip(mesh.polygons, outer_faces):
                    polygon.material_index = (1 if wrapped_cell else 0) if is_outer else 2
                fragment = bpy.data.objects.new(f"fragment_{fragment_index:02d}", mesh)
                bpy.context.collection.objects.link(fragment)
                fragment["fragmentIndex"] = fragment_index
                fragment["wakppuKind"] = "butter_bar"
                bevel = fragment.modifiers.new("fresh_butter_edge", "BEVEL")
                bevel.width = 0.012
                bevel.segments = 1
                bpy.context.view_layer.objects.active = fragment
                fragment.select_set(True)
                bpy.ops.object.modifier_apply(modifier=bevel.name)
                fragment.select_set(False)
                fragment_index += 1


def selected_hierarchy(root: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root


def export_intact(key: str, builder) -> None:
    clear_scene()
    root, _ = builder()
    selected_hierarchy(root)
    output = MODEL_DIR / f"{key}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=False,
    )
    print(f"EXPORTED {output} ({output.stat().st_size} bytes)")


def export_broken(key: str) -> None:
    clear_scene()
    if key == "butter_bar":
        build_broken_butter_bar()
    else:
        create_broken_sphere(key, VARIANTS[key])
    bpy.ops.object.select_all(action="SELECT")
    output = MODEL_DIR / f"{key}-broken.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=False,
    )
    print(f"EXPORTED {output} ({output.stat().st_size} bytes)")


def aim_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def build_preview() -> None:
    clear_scene()
    dujjonku_root, _ = build_dujjonku()
    butter_root, _ = build_butter_bar()
    dujjonku_root.location.x = -1.45
    butter_root.location.x = 1.05
    butter_root.location.z = -0.57

    floor_mat = material("preview_floor", (0.075, 0.058, 0.052, 1), 0.82)
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -1.02))
    floor = bpy.context.object
    floor.name = "StudioFloor"
    floor.data.materials.append(floor_mat)

    bpy.ops.object.camera_add(location=(4.35, -7.65, 3.25))
    camera = bpy.context.object
    camera.name = "ThemedWakppuCamera"
    camera.data.lens = 62
    aim_at(camera, (0, 0, 0.02))
    bpy.context.scene.camera = camera

    for name, location, energy, size, color in (
        ("Key", (-4.3, -4.2, 6.0), 1050, 4.0, (1.0, 0.82, 0.63)),
        ("Fill", (4.7, -2.2, 3.2), 820, 3.5, (0.70, 0.83, 1.0)),
        ("Rim", (0.8, 4.2, 4.8), 960, 3.0, (1.0, 0.72, 0.40)),
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

    world = bpy.data.worlds.new("ThemedWakppuWorld") if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.012, 0.010, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)
    print(f"BLEND {BLEND_PATH}")
    print(f"PREVIEW {PREVIEW_PATH}")


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    export_intact("dubai", build_dujjonku)
    export_broken("dubai")
    export_intact("butter_bar", build_butter_bar)
    export_broken("butter_bar")
    build_preview()


if __name__ == "__main__":
    main()
