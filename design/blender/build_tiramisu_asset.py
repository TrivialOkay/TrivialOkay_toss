import os
import runpy

import bpy


HERE = os.path.dirname(os.path.abspath(__file__))
GENERATOR_PATH = os.path.join(HERE, "generate_wakppu_assets.py")
MODEL_DIR = os.path.abspath(os.path.join(HERE, "..", "..", "public", "models", "wakppu"))


def export_current_scene(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=False,
    )
    print(f"Exported {path}: {os.path.getsize(path)} bytes")


def main():
    generator = runpy.run_path(GENERATOR_PATH, run_name="wakppu_generator")
    cfg = generator["VARIANTS"]["brick_cake"]

    generator["clear_scene"]()
    root = generator["create_intact"]("brick_cake", cfg)
    root["wakppuKind"] = "brick_cake"
    root["state"] = "intact"
    export_current_scene(os.path.join(MODEL_DIR, "brick_cake.glb"))

    generator["clear_scene"]()
    generator["create_broken_cube"]("brick_cake", cfg)
    export_current_scene(os.path.join(MODEL_DIR, "brick_cake-broken.glb"))

    # Rebuild the canonical preview scene after the previous interactive MCP
    # session was interrupted during review rendering.
    generator["build_blend_and_preview"]()


if __name__ == "__main__":
    main()
