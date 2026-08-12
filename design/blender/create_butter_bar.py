from __future__ import annotations

import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
BLEND_PATH = ROOT / "design" / "blender" / "butter-bar.blend"
PREVIEW_PATH = ROOT / "design" / "blender" / "butter-bar-preview.png"
GLB_PATH = ROOT / "public" / "models" / "wakppu" / "butter_bar.glb"
BROKEN_GLB_PATH = ROOT / "public" / "models" / "wakppu" / "butter_bar-broken.glb"

WIDTH = 2.66
DEPTH = 0.78
HEIGHT = 0.66
CENTER_Z = HEIGHT / 2


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.materials,
        bpy.data.curves,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.images,
    ):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def simple_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = 0
    return mat


def paper_material() -> bpy.types.Material:
    # Flat Principled input survives GLB export reliably; the visible paper detail
    # comes from the layered collars, end flaps, seams and crease geometry.
    return simple_material("Warm ivory wax-paper wrapper", (0.93, 0.86, 0.70, 1), 0.76)


def rounded_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    bevel: float,
    mat: bpy.types.Material,
    segments: int = 5,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Soft paper edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    # Keep broad wrapper faces flat. Smoothing the entire beveled cuboid bends the
    # face normals toward its sides and makes pale wax paper render nearly black.
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    obj.data.materials.append(mat)
    return obj


def create_text(
    name: str,
    body: str,
    size: float,
    location: tuple[float, float, float],
    mat: bpy.types.Material,
    extrude: float = 0.0022,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = extrude
    curve.bevel_depth = 0.0007
    curve.bevel_resolution = 1
    text = bpy.data.objects.new(name, curve)
    text.location = location
    # Text starts in XY with +Z normal. +90 degrees around X faces it toward -Y.
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


def create_line(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinates in zip(spline.points, points):
        point.co = (*coordinates, 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    return obj


def triangular_end_flap(
    name: str,
    x: float,
    direction: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    outside_x = x + direction * 0.012
    inset_x = x - direction * 0.055
    vertices = [
        (outside_x, -0.31, 0.08),
        (outside_x, -0.31, 0.58),
        (outside_x, 0.31, 0.58),
        (outside_x, 0.31, 0.08),
        (inset_x, 0.0, 0.33),
    ]
    faces = [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def aim_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def build_asset() -> list[bpy.types.Object]:
    wrapper = paper_material()
    folded_paper = simple_material("Folded wrapper shadow", (0.79, 0.73, 0.61, 1), 0.83)
    crease = simple_material("Pressed paper creases", (0.68, 0.60, 0.48, 1), 0.9)
    butter = simple_material("Butter peeking through wrapper", (0.93, 0.66, 0.19, 1), 0.62)
    ink = simple_material("Classic red wrapper ink", (0.68, 0.035, 0.028, 1), 0.54)

    root = bpy.data.objects.new("WrappedButterStick", None)
    bpy.context.collection.objects.link(root)
    root["asset_type"] = "butter_bar"
    root["description"] = "An ivory wax-paper wrapped unsalted butter stick with red type"

    objects: list[bpy.types.Object] = [root]

    # A tiny butter core catches warm light at the wrapper seams.
    core = rounded_box("Butter_Core", (2.48, 0.67, 0.56), (0, 0, CENTER_Z), 0.055, butter, 4)
    body = rounded_box("WaxPaper_Wrapper", (2.58, DEPTH, HEIGHT), (0, 0, CENTER_Z), 0.075, wrapper, 7)
    objects.extend((core, body))

    # Pinched paper ends: slightly narrower than the body and layered like the photo.
    for side, direction in (("L", -1.0), ("R", 1.0)):
        x = direction * 1.27
        collar = rounded_box(
            f"Wrapper_EndCollar_{side}",
            (0.19, 0.735, 0.58),
            (x, 0, CENTER_Z),
            0.045,
            wrapper,
            4,
        )
        cap = rounded_box(
            f"Wrapper_PinchedEnd_{side}",
            (0.075, 0.60, 0.47),
            (direction * 1.325, 0, CENTER_Z),
            0.028,
            folded_paper,
            3,
        )
        flap = triangular_end_flap(f"Wrapper_FoldFlap_{side}", direction * 1.345, direction, wrapper)
        objects.extend((collar, cap, flap))

        front_x = direction * 1.205
        objects.append(create_line(
            f"Front_EndCrease_{side}",
            [(front_x, -0.396, 0.10), (front_x + direction * 0.025, -0.405, 0.33), (front_x, -0.396, 0.57)],
            0.006,
            crease,
        ))
        objects.append(create_line(
            f"Top_EndCrease_{side}",
            [(front_x, -0.28, 0.667), (front_x + direction * 0.03, 0, 0.679), (front_x, 0.28, 0.667)],
            0.005,
            crease,
        ))

    # The unmistakable red face from the reference.
    front_y = -DEPTH / 2 - 0.012
    objects.extend((
        create_text("Label_Unsalted", "UNSALTED", 0.075, (0, front_y, 0.493), ink),
        create_text("Label_Butter", "BUTTER", 0.235, (0, front_y - 0.004, 0.335), ink, 0.0028),
        create_text("Label_Weight", "NET WT 4 OZ (113 g)", 0.060, (0, front_y, 0.172), ink),
    ))

    # Thin red rules make it read as printed packaging even at mobile size.
    objects.extend((
        create_line("Label_Rule_Top", [(-0.56, front_y - 0.002, 0.555), (0.56, front_y - 0.002, 0.555)], 0.005, ink),
        create_line("Label_Rule_Bottom", [(-0.48, front_y - 0.002, 0.115), (0.48, front_y - 0.002, 0.115)], 0.004, ink),
    ))

    # A raised overlap on the back/top suggests a wax-paper seam.
    seam = rounded_box("Wrapper_BackSeam", (1.88, 0.055, 0.022), (0.0, 0.365, 0.625), 0.011, folded_paper, 2)
    seam.rotation_euler.x = math.radians(-10)
    objects.append(seam)

    for obj in objects[1:]:
        obj.parent = root
    return objects


def set_up_studio() -> None:
    ground_mat = simple_material("Cool marble-like studio floor", (0.69, 0.72, 0.72, 1), 0.8)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.015))
    ground = bpy.context.object
    ground.name = "StudioFloor"
    ground.data.materials.append(ground_mat)

    bpy.ops.object.camera_add(location=(4.1, -5.9, 3.15))
    camera = bpy.context.object
    camera.name = "WrappedButterCamera"
    camera.data.lens = 62
    aim_at(camera, (0, 0, 0.32))
    bpy.context.scene.camera = camera

    for name, location, energy, size, color in (
        ("Key", (-3.7, -4.1, 5.4), 980, 4.1, (1.0, 0.91, 0.76)),
        ("Fill", (4.0, -1.5, 2.9), 760, 3.5, (0.68, 0.82, 1.0)),
        ("Rim", (1.4, 4.2, 4.0), 720, 2.8, (1.0, 0.82, 0.58)),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = color
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        bpy.context.collection.objects.link(light)
        aim_at(light, (0, 0, CENTER_Z))

    world = bpy.data.worlds.new("WrappedButterWorld") if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.055, 0.07, 0.085, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.42


def build_broken_export() -> None:
    clear_scene()
    butter = simple_material("Fresh yellow butter interior", (0.93, 0.63, 0.14, 1), 0.65)
    wrapper = simple_material("Ivory wrapper fragments", (0.91, 0.85, 0.71, 1), 0.79)
    red_wrapper = simple_material("Red printed wrapper fragments", (0.69, 0.045, 0.03, 1), 0.6)
    x_bounds = (-WIDTH / 2, -0.67, 0.0, 0.67, WIDTH / 2)
    y_bounds = (-DEPTH / 2, 0.0, DEPTH / 2)
    z_bounds = (-HEIGHT / 2, 0.0, HEIGHT / 2)

    def grid_point(x_index: int, y_index: int, z_index: int) -> tuple[float, float, float]:
        x = x_bounds[x_index]
        y = y_bounds[y_index]
        z = z_bounds[z_index]
        seed = (x_index + 1) * 17.31 + (y_index + 1) * 31.77 + (z_index + 1) * 47.13
        if 0 < x_index < len(x_bounds) - 1:
            x += math.sin(seed) * 0.055
        if 0 < y_index < len(y_bounds) - 1:
            y += math.cos(seed * 1.19) * 0.035
        if 0 < z_index < len(z_bounds) - 1:
            z += math.sin(seed * 0.83) * 0.032
        return (x, y, z)

    fragment_index = 0
    for z_index in range(len(z_bounds) - 1):
        for y_index in range(len(y_bounds) - 1):
            for x_index in range(len(x_bounds) - 1):
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
                mesh = bpy.data.meshes.new(f"WrappedButterFragment_{fragment_index:02d}")
                mesh.from_pydata(vertices, [], faces)
                # One material per chunk preserves exactly one rigid body per GLB mesh.
                if fragment_index in (3, 8, 11):
                    chunk_material = red_wrapper
                elif fragment_index in (0, 7, 12, 15):
                    chunk_material = wrapper
                else:
                    chunk_material = butter
                mesh.materials.append(chunk_material)
                fragment = bpy.data.objects.new(f"fragment_{fragment_index:02d}", mesh)
                bpy.context.collection.objects.link(fragment)
                fragment["fragmentIndex"] = fragment_index
                fragment["wakppuKind"] = "butter_bar"
                bevel = fragment.modifiers.new("Fresh broken butter edge", "BEVEL")
                bevel.width = 0.016
                bevel.segments = 1
                fragment_index += 1

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(BROKEN_GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=False,
    )


def save_outputs(asset_objects: list[bpy.types.Object]) -> None:
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 620
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in asset_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = asset_objects[0]
    # Runtime physics expects the model around the GLB origin.
    asset_objects[0].location.z = -CENTER_Z
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=False,
    )
    asset_objects[0].location.z = 0
    build_broken_export()


if __name__ == "__main__":
    clear_scene()
    asset = build_asset()
    set_up_studio()
    save_outputs(asset)
    print(f"BLEND={BLEND_PATH}")
    print(f"GLB={GLB_PATH}")
    print(f"BROKEN_GLB={BROKEN_GLB_PATH}")
    print(f"PREVIEW={PREVIEW_PATH}")
