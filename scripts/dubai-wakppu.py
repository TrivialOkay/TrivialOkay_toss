import bpy
import math
import os
from mathutils import Vector


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(ROOT, "public", "models", "wakppu")
BLEND_PATH = os.path.join(ROOT, "artifacts", "dubai-wakppu.blend")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def make_material(name, color, roughness, metallic=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1.0)
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*color, 1.0)
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return material


def surface_radius(direction, base=1.0):
    x, y, z = direction
    low = math.sin(x * 4.1 + z * 2.2) * 0.012
    grain = math.sin(y * 13.7 - x * 9.2) * math.sin(z * 11.3 + y * 5.1) * 0.007
    return base + low + grain


def make_outer_shell(material):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1.0, location=(0, 0, 0))
    shell = bpy.context.object
    shell.name = "dubai_outer_shell"
    for vertex in shell.data.vertices:
        direction = vertex.co.normalized()
        vertex.co = direction * surface_radius(direction)
    shell.data.materials.append(material)
    for polygon in shell.data.polygons:
        polygon.use_smooth = True
    bevel = shell.modifiers.new("subtle_hard_shell_edge", "BEVEL")
    bevel.width = 0.006
    bevel.segments = 1
    return shell


def make_eye(name, x, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=1, location=(x, -0.974, 0.22))
    eye = bpy.context.object
    eye.name = name
    eye.scale = (0.105, 0.025, 0.075)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    eye.data.materials.append(material)
    for polygon in eye.data.polygons:
        polygon.use_smooth = True
    return eye


def make_mouth(material):
    curve = bpy.data.curves.new("dubai_mouth_curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = 0.026
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(2)
    for point, coordinate in zip(
        spline.bezier_points,
        ((-0.19, -0.993, -0.07), (0.0, -1.012, -0.14), (0.19, -0.993, -0.07)),
    ):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    mouth = bpy.data.objects.new("dubai_mouth", curve)
    bpy.context.collection.objects.link(mouth)
    mouth.data.materials.append(material)
    bpy.context.view_layer.objects.active = mouth
    mouth.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


def sphere_point(latitude, longitude, radius):
    direction = Vector((
        math.cos(latitude) * math.cos(longitude),
        math.cos(latitude) * math.sin(longitude),
        math.sin(latitude),
    ))
    return direction * surface_radius(direction, radius)


def make_shard(name, source_vertices, source_faces, outer_material, inner_material):
    used_indices = sorted({index for face in source_faces for index in face})
    index_map = {source_index: local_index for local_index, source_index in enumerate(used_indices)}
    outer_vertices = []
    inner_vertices = []
    for source_index in used_indices:
        direction = source_vertices[source_index].normalized()
        outer_vertices.append(tuple(direction * surface_radius(direction, 0.995)))
        inner_vertices.append(tuple(direction * surface_radius(direction, 0.885)))
    vertices = outer_vertices + inner_vertices
    layer_size = len(outer_vertices)

    faces = []
    material_indices = []
    edge_counts = {}
    directed_edges = {}
    for source_face in source_faces:
        face = tuple(index_map[index] for index in source_face)
        faces.append(face)
        material_indices.append(0)
        faces.append(tuple(reversed([index + layer_size for index in face])))
        material_indices.append(1)
        for edge_index in range(len(face)):
            a = face[edge_index]
            b = face[(edge_index + 1) % len(face)]
            key = tuple(sorted((a, b)))
            edge_counts[key] = edge_counts.get(key, 0) + 1
            directed_edges[key] = (a, b)

    for key, count in edge_counts.items():
        if count != 1:
            continue
        a, b = directed_edges[key]
        faces.append((a, b, b + layer_size, a + layer_size))
        material_indices.append(1)

    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(outer_material)
    mesh.materials.append(inner_material)
    for polygon, material_index in zip(mesh.polygons, material_indices):
        polygon.material_index = material_index

    shard = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(shard)
    bevel = shard.modifiers.new("sharp_chipped_edges", "BEVEL")
    bevel.width = 0.009
    bevel.segments = 1
    return shard


def make_broken_shell(outer_material, inner_material):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0)
    source = bpy.context.object
    source_vertices = [vertex.co.copy() for vertex in source.data.vertices]
    source_faces = [tuple(polygon.vertices) for polygon in source.data.polygons]
    bpy.data.objects.remove(source, do_unlink=True)

    shard_count = 27
    golden_angle = math.pi * (3 - math.sqrt(5))
    seeds = []
    for index in range(shard_count):
        z = 1 - 2 * (index + 0.5) / shard_count
        radius = math.sqrt(max(0, 1 - z * z))
        angle = index * golden_angle + math.sin(index * 2.31) * 0.13
        seeds.append(Vector((radius * math.cos(angle), radius * math.sin(angle), z)))

    clusters = [[] for _ in seeds]
    for face in source_faces:
        center = sum((source_vertices[index] for index in face), Vector()).normalized()
        seed_index = max(range(len(seeds)), key=lambda index: center.dot(seeds[index]))
        clusters[seed_index].append(face)

    shards = []
    for index, faces in enumerate(clusters):
        shards.append(make_shard(
            f"dubai_shell_shard_{index:02d}",
            source_vertices,
            faces,
            outer_material,
            inner_material,
        ))
    return shards


def make_dough_core(material):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=0.86, location=(0, 0, -0.035))
    core = bpy.context.object
    core.name = "dubai_dough_core"
    for vertex in core.data.vertices:
        point = vertex.co
        direction = point.normalized()
        x, y, z = direction
        organic = (
            math.sin(x * 5.4 + z * 2.1) * 0.018
            + math.sin(y * 7.3 - x * 3.8) * 0.012
            + math.sin((x + y - z) * 11.0) * 0.006
        )
        radius = 0.86 + organic
        point = direction * radius
        point.x *= 1.015
        point.y *= 0.985
        point.z *= 0.96
        if point.z < -0.56:
            point.z = -0.56 + (point.z + 0.56) * 0.18
        vertex.co = point
    core.data.materials.append(material)
    for polygon in core.data.polygons:
        polygon.use_smooth = True
    return core


def export_selected(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=False,
    )
    print("exported", path, os.path.getsize(path))


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
    clear_scene()

    shell_material = make_material("dubai_shell_chocolate", (0.19, 0.055, 0.022), 0.24)
    shell_inner_material = make_material("dubai_shell_inner", (0.44, 0.19, 0.075), 0.68)
    face_material = make_material("dubai_face_dark", (0.018, 0.008, 0.004), 0.52)
    dough_material = make_material("dubai_dough", (0.48, 0.23, 0.09), 0.9)

    shell = make_outer_shell(shell_material)
    eyes = [make_eye("dubai_eye_left", -0.3, face_material), make_eye("dubai_eye_right", 0.3, face_material)]
    mouth = make_mouth(face_material)
    shards = make_broken_shell(shell_material, shell_inner_material)
    core = make_dough_core(dough_material)

    export_selected(os.path.join(MODEL_DIR, "dubai.glb"), [shell, *eyes, mouth])
    export_selected(os.path.join(MODEL_DIR, "dubai-broken.glb"), shards)
    export_selected(os.path.join(MODEL_DIR, "dubai-core.glb"), [core])

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    print("saved", BLEND_PATH)


if __name__ == "__main__":
    main()
