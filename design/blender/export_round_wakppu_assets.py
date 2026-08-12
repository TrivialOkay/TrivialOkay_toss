import os
import sys

import bpy


ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from generate_wakppu_assets import VARIANTS, clear_scene, create_broken_sphere, create_intact


BALL_VARIANTS = ("ceramic", "crystal", "mochi", "dubai")


def export_scene(path):
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


def main():
    if "--" not in sys.argv:
        raise SystemExit("Pass output directory after --")
    output_dir = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
    os.makedirs(output_dir, exist_ok=True)

    for key in BALL_VARIANTS:
        cfg = VARIANTS[key]
        clear_scene()
        create_intact(key, cfg)
        export_scene(os.path.join(output_dir, f"{key}.glb"))

        clear_scene()
        create_broken_sphere(key, cfg)
        export_scene(os.path.join(output_dir, f"{key}-broken.glb"))
        print(f"EXPORTED {key}: original exterior and fracture materials")


if __name__ == "__main__":
    main()
