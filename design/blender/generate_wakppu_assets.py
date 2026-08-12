import bpy
import math
import os
from mathutils import Vector


ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.abspath(os.path.join(ROOT, "..", "..", "public", "models", "wakppu"))
TEXTURE_DIR = os.path.abspath(os.path.join(ROOT, "..", "..", "public", "textures", "wakppu"))
os.makedirs(MODEL_DIR, exist_ok=True)


VARIANTS = {
    "ceramic": {
        "label": "A Ceramic",
        "shape": "sphere",
        "outer": (0.94, 0.61, 0.07, 1.0),
        "inner": (0.55, 0.28, 0.04, 1.0),
        "roughness": 0.62,
    },
    "crystal": {
        "label": "B Crystal",
        "shape": "crystal",
        "outer": (0.48, 0.25, 0.86, 0.52),
        "inner": (1.0, 0.55, 0.04, 1.0),
        "roughness": 0.12,
    },
    "mochi": {
        "label": "C Mochi",
        "shape": "sphere",
        "outer": (0.62, 0.88, 0.67, 1.0),
        "inner": (0.29, 0.67, 0.42, 1.0),
        "roughness": 0.78,
    },
    "dubai": {
        "label": "E Dubai Chewy",
        "shape": "sphere",
        "outer": (0.20, 0.055, 0.025, 1.0),
        "inner": (0.48, 0.70, 0.08, 1.0),
        "roughness": 0.48,
    },
    "butter_rice_cake": {
        "label": "F Butter Rice Cake",
        "shape": "cube",
        "outer": (0.92, 0.43, 0.055, 1.0),
        "inner": (1.0, 0.78, 0.22, 1.0),
        "roughness": 0.66,
    },
    "brick_cake": {
        "label": "G Crispy Tiramisu",
        "shape": "tiramisu",
        "outer": (0.16, 0.045, 0.018, 1.0),
        "inner": (0.74, 0.46, 0.25, 1.0),
        "cream": (0.96, 0.84, 0.62, 1.0),
        "coffee": (0.30, 0.105, 0.045, 1.0),
        "cocoa": (0.075, 0.018, 0.008, 1.0),
        "roughness": 0.92,
    },
    "slice_cake": {
        "label": "H Strawberry Slice Cake",
        "shape": "slice_cake",
        "outer": (0.96, 0.78, 0.42, 1.0),
        "inner": (1.0, 0.91, 0.69, 1.0),
        "cream": (0.98, 0.93, 0.86, 1.0),
        "accent": (0.82, 0.055, 0.06, 1.0),
        "roughness": 0.68,
    },
}

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        if datablocks != bpy.data.materials:
            for block in list(datablocks):
                if block.users == 0:
                    datablocks.remove(block)


def material(name, color, roughness=0.6, metallic=0.0, emission=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if color[3] < 1:
        bsdf.inputs["Alpha"].default_value = color[3]
        mat.surface_render_method = "DITHERED"
    if emission:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = 1.8
    return mat


def add_normal_texture(mat, key, suffix, strength):
    texture_path = os.path.join(TEXTURE_DIR, f"{key}-{suffix}.webp")
    if not os.path.exists(texture_path):
        return
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    image = bpy.data.images.get(os.path.basename(texture_path)) or bpy.data.images.load(texture_path)
    image.colorspace_settings.name = "Non-Color"
    texture = nodes.get(f"{key}_{suffix}") or nodes.new("ShaderNodeTexImage")
    texture.name = f"{key}_{suffix}"
    texture.image = image
    normal = nodes.get(f"{key}_{suffix}_normal") or nodes.new("ShaderNodeNormalMap")
    normal.name = f"{key}_{suffix}_normal"
    normal.inputs["Strength"].default_value = strength
    mat.node_tree.links.new(texture.outputs["Color"], normal.inputs["Color"])
    mat.node_tree.links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])


def fracture_material(key, fallback_color):
    name = f"{key}_fracture_texture"
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.68
    texture_path = os.path.join(TEXTURE_DIR, f"{key}-interior.webp")
    if os.path.exists(texture_path):
        image = bpy.data.images.get(os.path.basename(texture_path)) or bpy.data.images.load(texture_path)
        texture = mat.node_tree.nodes.get(f"{key}_interior") or mat.node_tree.nodes.new("ShaderNodeTexImage")
        texture.name = f"{key}_interior"
        texture.image = image
        mat.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = fallback_color
    add_normal_texture(mat, key, "interior-normal", 0.48)
    return mat


def smooth(obj, value=True):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = value


def add_uv_sphere(name, radius, location, mat, scale=(1, 1, 1), segments=48, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_rounded_cube(name, location, scale, mat, bevel=0.16):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Soft edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_cake_wedge(name, z_min, z_max, mat, inset=0.0, bevel=0.045):
    half_width = 0.9 - inset
    back_y = 0.76 - inset * 0.45
    tip_y = -1.02 + inset
    vertices = [
        (-half_width, back_y, z_min), (half_width, back_y, z_min), (0, tip_y, z_min),
        (-half_width, back_y, z_max), (half_width, back_y, z_max), (0, tip_y, z_max),
    ]
    faces = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    modifier = obj.modifiers.new("Soft cake edge", "BEVEL")
    modifier.width = bevel
    modifier.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    smooth(obj)
    return obj


def add_face(parent, face_mat, z_offset=0.0, mouth_z_offset=None):
    for x in (-0.30, 0.30):
        eye = add_uv_sphere("eye", 0.095, (x, -0.945, 0.22 + z_offset), face_mat, scale=(1.0, 0.28, 0.62), segments=20, rings=12)
        eye.parent = parent
    mouth_offset = z_offset if mouth_z_offset is None else mouth_z_offset
    mouth = add_rounded_cube("mouth", (0, -0.98, -0.08 + mouth_offset), (0.19, 0.035, 0.035), face_mat, bevel=0.035)
    mouth.parent = parent


def add_wedge_face(parent, face_mat):
    for x in (-0.105, 0.105):
        eye = add_uv_sphere("eye", 0.055, (x, -1.035, 0.12), face_mat, scale=(1.0, 0.22, 0.72), segments=16, rings=10)
        eye.parent = parent
    mouth = add_rounded_cube("mouth", (0, -1.045, -0.055), (0.09, 0.025, 0.022), face_mat, bevel=0.022)
    mouth.parent = parent


def create_intact(key, cfg):
    outer = material(f"{key}_outer", cfg["outer"], cfg["roughness"], metallic=0.04 if key == "crystal" else 0)
    add_normal_texture(outer, key, "surface-normal", 0.32 if key != "mochi" else 0.22)
    inner = material(f"{key}_inner", cfg["inner"], 0.38, emission=cfg["inner"] if key == "crystal" else None)
    face = material("face_dark", (0.055, 0.035, 0.025, 1), 0.72)

    if cfg["shape"] == "crystal":
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0)
        root = bpy.context.object
        root.name = f"wakppu_{key}"
        root.data.materials.append(outer)
        smooth(root, False)
        core = add_uv_sphere("golden_core", 0.49, (0, 0, 0), inner, segments=32, rings=16)
        core.parent = root
    elif cfg["shape"] == "cube":
        root = add_rounded_cube(f"wakppu_{key}", (0, 0, 0), (0.93, 0.88, 0.93), outer, bevel=0.22)
    elif cfg["shape"] == "tiramisu":
        cream = material(f"{key}_cream", cfg["cream"], 0.88)
        coffee = material(f"{key}_coffee_soak", cfg["coffee"], 0.8)
        cocoa = material(f"{key}_cocoa", cfg["cocoa"], 0.98)

        # Keep the root transform at the model origin so exported child layers retain
        # their intended positions. The base mesh itself is shifted down instead.
        root = add_rounded_cube(f"wakppu_{key}", (0, 0, 0), (0.92, 0.86, 0.12), cocoa, bevel=0.065)
        for vertex in root.data.vertices:
            vertex.co.z -= 0.76

        tiramisu_layers = (
            ("coffee_soak_low", -0.42, (0.925, 0.865, 0.03), coffee, 0.025),
            ("mascarpone_low", -0.27, (0.94, 0.88, 0.12), cream, 0.075),
            ("coffee_sponge_middle", -0.03, (0.92, 0.86, 0.14), coffee, 0.09),
            ("coffee_soak_high", 0.14, (0.925, 0.865, 0.03), coffee, 0.025),
            ("mascarpone_high", 0.31, (0.94, 0.88, 0.13), cream, 0.08),
            ("mascarpone_top", 0.505, (0.93, 0.87, 0.075), cream, 0.065),
            ("cocoa_powder_top", 0.602, (0.925, 0.865, 0.022), cocoa, 0.018),
        )
        for name, z, scale, layer_mat, bevel in tiramisu_layers:
            layer = add_rounded_cube(name, (0, 0, z), scale, layer_mat, bevel=bevel)
            layer.parent = root

        # Thin cocoa shells around the sides/back read as a crisp exterior while
        # leaving the front cross-section open to show the soft layered center.
        crisp_shells = (
            ("cocoa_shell_left", (-0.946, 0.0, -0.07), (0.026, 0.89, 0.66)),
            ("cocoa_shell_right", (0.946, 0.0, -0.07), (0.026, 0.89, 0.66)),
            ("cocoa_shell_back", (0.0, 0.886, -0.07), (0.92, 0.026, 0.66)),
        )
        for name, location, scale in crisp_shells:
            shell = add_rounded_cube(name, location, scale, cocoa, bevel=0.018)
            shell.parent = root

        # Sparse, low-poly cocoa grains break up the otherwise perfectly flat top.
        cocoa_grains = (
            (-0.64, -0.48, 0.632, 0.018), (-0.39, 0.18, 0.634, 0.014),
            (-0.12, -0.30, 0.631, 0.016), (0.16, 0.39, 0.633, 0.013),
            (0.43, -0.12, 0.632, 0.017), (0.66, 0.46, 0.631, 0.014),
            (-0.55, 0.52, 0.633, 0.012), (0.02, 0.04, 0.634, 0.015),
            (0.58, -0.52, 0.633, 0.012), (0.33, 0.62, 0.632, 0.014),
        )
        for index, (x, y, z, radius) in enumerate(cocoa_grains):
            grain = add_uv_sphere(f"cocoa_grain_{index:02d}", radius, (x, y, z), cocoa, scale=(1.2, 0.9, 0.35), segments=8, rings=4)
            grain.parent = root
    elif cfg["shape"] == "slice_cake":
        cream = material(f"{key}_cream", cfg["cream"], 0.76)
        strawberry = material(f"{key}_strawberry", cfg["accent"], 0.36)
        root = add_cake_wedge(f"wakppu_{key}", -0.82, -0.37, outer, bevel=0.055)
        cream_low = add_cake_wedge("cream_low", -0.34, -0.17, cream, inset=0.015, bevel=0.035)
        cream_low.parent = root
        middle = add_cake_wedge("sponge_middle", -0.14, 0.31, outer, bevel=0.055)
        middle.parent = root
        cream_top = add_cake_wedge("cream_top", 0.34, 0.56, cream, inset=0.01, bevel=0.04)
        cream_top.parent = root
        for x in (-0.37, 0.0, 0.37):
            berry = add_uv_sphere("strawberry", 0.16, (x, 0.24, 0.65), strawberry, scale=(0.92, 0.72, 1.15), segments=24, rings=14)
            berry.parent = root
    else:
        squash = (1, 1, 0.92) if key == "mochi" else (1, 1, 1)
        root = add_uv_sphere(f"wakppu_{key}", 1.0, (0, 0, 0), outer, scale=squash)

    if key == "mochi":
        cheek = material("mochi_cheek", (0.94, 0.63, 0.67, 0.72), 0.68)
        for x in (-0.52, 0.52):
            c = add_uv_sphere("cheek", 0.13, (x, -0.92, -0.02), cheek, scale=(1.0, 0.22, 0.75), segments=20, rings=12)
            c.parent = root
    if cfg["shape"] == "slice_cake":
        add_wedge_face(root, face)
    else:
        if cfg["shape"] in ("cake", "tiramisu"):
            add_face(root, face, z_offset=0.08, mouth_z_offset=0.25)
        else:
            add_face(root, face)
    return root


def spherical_sector_mesh(name, lon0, lon1, lat0, lat1, outer_radius, inner_radius, mat_outer, mat_inner, squash=1.0):
    lon_steps = 5
    lat_steps = 4
    verts = []
    faces = []
    materials = []

    def point(radius, lon, lat):
        s = math.sin(lat)
        return (radius * s * math.cos(lon), radius * s * math.sin(lon), radius * math.cos(lat) * squash)

    for radius in (outer_radius, inner_radius):
        for j in range(lat_steps + 1):
            lat = lat0 + (lat1 - lat0) * j / lat_steps
            for i in range(lon_steps + 1):
                lon = lon0 + (lon1 - lon0) * i / lon_steps
                verts.append(point(radius, lon, lat))

    stride = lon_steps + 1
    layer_size = stride * (lat_steps + 1)
    for layer in range(2):
        offset = layer * layer_size
        for j in range(lat_steps):
            for i in range(lon_steps):
                a = offset + j * stride + i
                quad = (a, a + 1, a + 1 + stride, a + stride)
                faces.append(quad if layer == 0 else tuple(reversed(quad)))
                materials.append(0 if layer == 0 else 1)

    for edge_i in (0, lon_steps):
        for j in range(lat_steps):
            a = j * stride + edge_i
            b = (j + 1) * stride + edge_i
            faces.append((a, b, b + layer_size, a + layer_size))
            materials.append(1)
    for edge_j in (0, lat_steps):
        for i in range(lon_steps):
            a = edge_j * stride + i
            b = a + 1
            faces.append((a, a + layer_size, b + layer_size, b))
            materials.append(1)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat_outer)
    mesh.materials.append(mat_inner)
    for polygon, mat_index in zip(mesh.polygons, materials):
        polygon.material_index = mat_index
        polygon.use_smooth = polygon.material_index == 0
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def create_broken_sphere(key, cfg):
    outer = material(f"{key}_outer", cfg["outer"], cfg["roughness"])
    add_normal_texture(outer, key, "surface-normal", 0.3)
    inner = fracture_material(key, cfg["inner"])
    squash = 0.92 if key == "mochi" else 1.0

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0)
    source = bpy.context.object
    source_vertices = [vertex.co.copy() for vertex in source.data.vertices]
    source_faces = [tuple(polygon.vertices) for polygon in source.data.polygons]
    bpy.data.objects.remove(source, do_unlink=True)

    fragment_count = 16
    golden_angle = math.pi * (3 - math.sqrt(5))
    seeds = []
    for index in range(fragment_count):
        z = 1 - 2 * (index + 0.5) / fragment_count
        radius = math.sqrt(max(0, 1 - z * z))
        angle = index * golden_angle
        seeds.append(Vector((math.cos(angle) * radius, math.sin(angle) * radius, z)))

    clusters = [[] for _ in range(fragment_count)]
    for face in source_faces:
        center = sum((source_vertices[i] for i in face), Vector()) / len(face)
        center.normalize()
        cluster_index = max(range(fragment_count), key=lambda index: center.dot(seeds[index]))
        clusters[cluster_index].append(face)

    for index, cluster_faces in enumerate(clusters):
        used = sorted({vertex_index for face in cluster_faces for vertex_index in face})
        remap = {source_index: local_index for local_index, source_index in enumerate(used)}
        outer_vertices = [source_vertices[source_index].copy() for source_index in used]
        for vertex in outer_vertices:
            vertex.z *= squash
        # Keep the same vertex/face count, but let a few shards reach farther into
        # the core. This reads as a partly solid interior without extra draw calls
        # or additional physics bodies in the mobile mini-app.
        core_depths = (0.62, 0.55, 0.64, 0.48, 0.59, 0.52, 0.61, 0.44)
        inner_radius = core_depths[index % len(core_depths)]
        inner_vertices = [
            Vector((vertex.x * inner_radius, vertex.y * inner_radius, vertex.z * inner_radius))
            for vertex in outer_vertices
        ]
        vertices = [tuple(vertex) for vertex in outer_vertices + inner_vertices]
        layer_size = len(outer_vertices)
        faces = []
        material_indices = []
        edge_counts = {}

        for face in cluster_faces:
            mapped = tuple(remap[vertex_index] for vertex_index in face)
            faces.append(mapped)
            material_indices.append(0)
            faces.append(tuple(reversed(tuple(vertex_index + layer_size for vertex_index in mapped))))
            material_indices.append(1)
            for edge in ((mapped[0], mapped[1]), (mapped[1], mapped[2]), (mapped[2], mapped[0])):
                canonical = tuple(sorted(edge))
                edge_counts[canonical] = edge_counts.get(canonical, 0) + 1

        for (a, b), count in edge_counts.items():
            if count != 1:
                continue
            faces.append((a, b, b + layer_size, a + layer_size))
            material_indices.append(1)

        mesh = bpy.data.meshes.new(f"fragment_{index:02d}")
        mesh.from_pydata(vertices, [], faces)
        mesh.materials.append(outer)
        mesh.materials.append(inner)
        for polygon, material_index in zip(mesh.polygons, material_indices):
            polygon.material_index = material_index
            polygon.use_smooth = material_index == 0

        uv_layer = mesh.uv_layers.new(name="fracture_uv")
        for polygon in mesh.polygons:
            for loop_index in polygon.loop_indices:
                coordinate = mesh.vertices[mesh.loops[loop_index].vertex_index].co.normalized()
                u = 0.5 + math.atan2(coordinate.y, coordinate.x) / math.tau
                v = math.acos(max(-1, min(1, coordinate.z))) / math.pi
                uv_layer.data[loop_index].uv = (u * 2.7, v * 2.7)

        obj = bpy.data.objects.new(f"fragment_{index:02d}", mesh)
        bpy.context.collection.objects.link(obj)
        obj["fragmentIndex"] = index
        obj["wakppuKind"] = key


def create_broken_cube(key, cfg):
    outer = material(f"{key}_outer", cfg["outer"], cfg["roughness"])
    add_normal_texture(outer, key, "surface-normal", 0.3)
    inner = fracture_material(key, cfg["inner"])
    xs = (-0.94, 0.0, 0.94)
    ys = (-0.88, 0.0, 0.88)
    zs = (-0.9, -0.3, 0.3, 0.9)

    def grid_vertex(gx, gy, gz):
        seed = (gx + 1) * 17.13 + (gy + 2) * 31.77 + (gz + 3) * 47.21
        x, y, z = xs[gx], ys[gy], zs[gz]
        if gx == 1:
            x += math.sin(seed) * 0.12
        if gy == 1:
            y += math.cos(seed * 1.31) * 0.11
        if 0 < gz < len(zs) - 1:
            z += math.sin(seed * 0.83) * 0.1
        return (x, y, z)

    index = 0
    for gz in range(len(zs) - 1):
        for gy in range(len(ys) - 1):
            for gx in range(len(xs) - 1):
                vertices = [
                    grid_vertex(gx, gy, gz),
                    grid_vertex(gx + 1, gy, gz),
                    grid_vertex(gx + 1, gy + 1, gz),
                    grid_vertex(gx, gy + 1, gz),
                    grid_vertex(gx, gy, gz + 1),
                    grid_vertex(gx + 1, gy, gz + 1),
                    grid_vertex(gx + 1, gy + 1, gz + 1),
                    grid_vertex(gx, gy + 1, gz + 1),
                ]
                faces = [
                    (0, 3, 2, 1), (4, 5, 6, 7),
                    (0, 1, 5, 4), (3, 7, 6, 2),
                    (0, 4, 7, 3), (1, 2, 6, 5),
                ]
                outer_faces = (
                    gz == 0,
                    gz == len(zs) - 2,
                    gy == 0,
                    gy == len(ys) - 2,
                    gx == 0,
                    gx == len(xs) - 2,
                )
                mesh = bpy.data.meshes.new(f"fragment_{index:02d}")
                mesh.from_pydata(vertices, [], faces)
                mesh.materials.append(outer)
                mesh.materials.append(inner)
                for polygon, is_outer in zip(mesh.polygons, outer_faces):
                    polygon.material_index = 0 if is_outer else 1

                uv_layer = mesh.uv_layers.new(name="fracture_uv")
                for polygon in mesh.polygons:
                    for loop_index in polygon.loop_indices:
                        coordinate = mesh.vertices[mesh.loops[loop_index].vertex_index].co
                        uv_layer.data[loop_index].uv = (
                            (coordinate.x + coordinate.z * 0.32) * 1.45,
                            (coordinate.y + coordinate.z * 0.21) * 1.45,
                        )

                obj = bpy.data.objects.new(f"fragment_{index:02d}", mesh)
                bpy.context.collection.objects.link(obj)
                bevel = obj.modifiers.new("fracture_edge", "BEVEL")
                bevel.width = 0.018
                bevel.segments = 1
                obj["fragmentIndex"] = index
                obj["wakppuKind"] = key
                index += 1


def create_broken_slice(key, cfg):
    outer = material(f"{key}_outer", cfg["outer"], cfg["roughness"])
    add_normal_texture(outer, key, "surface-normal", 0.3)
    inner = fracture_material(key, cfg["inner"])
    a = Vector((0, -1.02))
    b = Vector((-0.9, 0.76))
    c = Vector((0.9, 0.76))
    ab, bc, ca = (a + b) / 2, (b + c) / 2, (c + a) / 2
    center = (a + b + c) / 3
    sectors = [
        ((a, ab, center), (0, 1)),
        ((a, center, ca), (2, 0)),
        ((b, center, ab), (2, 0)),
        ((b, bc, center), (0, 1)),
        ((c, center, bc), (2, 0)),
        ((c, ca, center), (0, 1)),
    ]
    index = 0
    for layer, (z_min, z_max) in enumerate(((-0.82, -0.02), (-0.02, 0.78))):
        for points, boundary_edge in sectors:
            vertices = [(point.x, point.y, z_min) for point in points] + [(point.x, point.y, z_max) for point in points]
            faces = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)]
            edge_order = ((0, 1), (1, 2), (2, 0))
            material_indices = [0 if layer == 0 else 1, 0 if layer == 1 else 1]
            material_indices.extend(0 if edge == boundary_edge else 1 for edge in edge_order)
            mesh = bpy.data.meshes.new(f"fragment_{index:02d}")
            mesh.from_pydata(vertices, [], faces)
            mesh.materials.append(outer)
            mesh.materials.append(inner)
            for polygon, material_index in zip(mesh.polygons, material_indices):
                polygon.material_index = material_index

            uv_layer = mesh.uv_layers.new(name="fracture_uv")
            for polygon in mesh.polygons:
                for loop_index in polygon.loop_indices:
                    coordinate = mesh.vertices[mesh.loops[loop_index].vertex_index].co
                    uv_layer.data[loop_index].uv = ((coordinate.x + coordinate.z * 0.3) * 1.5, (coordinate.y + coordinate.z * 0.2) * 1.5)

            obj = bpy.data.objects.new(f"fragment_{index:02d}", mesh)
            bpy.context.collection.objects.link(obj)
            bevel = obj.modifiers.new("fracture_edge", "BEVEL")
            bevel.width = 0.015
            bevel.segments = 1
            obj["fragmentIndex"] = index
            obj["wakppuKind"] = key
            index += 1


def export_scene(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
    )


def build_exports():
    for key, cfg in VARIANTS.items():
        clear_scene()
        root = create_intact(key, cfg)
        root["wakppuKind"] = key
        root["state"] = "intact"
        export_scene(os.path.join(MODEL_DIR, f"{key}.glb"))

        clear_scene()
        if cfg["shape"] == "slice_cake":
            create_broken_slice(key, cfg)
        elif cfg["shape"] in ("cube", "cake", "tiramisu"):
            create_broken_cube(key, cfg)
        else:
            create_broken_sphere(key, cfg)
        export_scene(os.path.join(MODEL_DIR, f"{key}-broken.glb"))


def build_blend_and_preview():
    clear_scene()
    positions = [(-5.1, 1.7, 0), (-1.7, 1.7, 0), (1.7, 1.7, 0), (5.1, 1.7, 0), (-3.4, -1.5, 0), (0, -1.5, 0), (3.4, -1.5, 0)]
    for (key, cfg), position in zip(VARIANTS.items(), positions):
        root = create_intact(key, cfg)
        container = bpy.data.objects.new(f"preview_{key}", None)
        bpy.context.collection.objects.link(container)
        root.parent = container
        container.location = position
        root["wakppuKind"] = key

    floor_mat = material("preview_floor", (0.92, 0.88, 0.78, 1), 0.9)
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1.06))
    floor = bpy.context.object
    floor.data.materials.append(floor_mat)

    bpy.ops.object.camera_add(location=(0, -18.2, 8.2), rotation=(math.radians(67), 0, 0))
    camera = bpy.context.object
    direction = Vector((0, 0, 0.2)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 53
    bpy.context.scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-4, -6, 9))
    bpy.context.object.data.energy = 1300
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 5
    bpy.ops.object.light_add(type="AREA", location=(5, -1, 5))
    bpy.context.object.data.energy = 850
    bpy.context.object.data.size = 4

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.join(ROOT, "wakppu-model-preview.png")
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    world_background = scene.world.node_tree.nodes.get("Background")
    world_background.inputs["Color"].default_value = (0.055, 0.045, 0.035, 1)
    world_background.inputs["Strength"].default_value = 0.34
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "wakppu-assets.blend"))
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    build_exports()
    build_blend_and_preview()
    print(f"Generated Wakppu assets in {MODEL_DIR}")
