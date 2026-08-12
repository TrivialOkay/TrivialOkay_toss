from pathlib import Path
import math
import random

from PIL import Image, ImageEnhance, ImageFilter


PROJECT = Path(__file__).resolve().parents[2]
OUTPUT = PROJECT / "public" / "textures" / "wakppu"
OUTPUT.mkdir(parents=True, exist_ok=True)
for legacy_normal in OUTPUT.glob("*-normal.png"):
    legacy_normal.unlink()

SOURCES = {
    "ceramic": Path(r"C:\Users\Json\.codex\generated_images\019ff630-3d27-7db3-9cea-157c32c8656b\exec-884c79e5-5f37-475d-a005-461ec5c2f8db.png"),
    "crystal": Path(r"C:\Users\Json\.codex\generated_images\019ff630-3d27-7db3-9cea-157c32c8656b\exec-2e8e2825-d914-47d3-b829-1a4fc6a9de49.png"),
    "mochi": Path(r"C:\Users\Json\.codex\generated_images\019ff630-3d27-7db3-9cea-157c32c8656b\exec-a3bbbbb0-d3c3-4341-ad4f-7efd22e36e2f.png"),
    "dubai": Path(r"C:\Users\Json\.codex\generated_images\019ff630-3d27-7db3-9cea-157c32c8656b\exec-e1203bd8-f039-4d87-9e7f-6e5e542fa5fa.png"),
    "butter_rice_cake": Path(r"C:\Users\Json\.codex\generated_images\019ff630-3d27-7db3-9cea-157c32c8656b\exec-22f73d0a-da2c-42eb-bcb4-8919de2c89f4.png"),
    "brick_cake": Path(r"C:\Users\Json\.codex\generated_images\019ff630-3d27-7db3-9cea-157c32c8656b\exec-5e855434-801e-44bd-a742-5a318e17f2e8.png"),
    "slice_cake": Path(r"C:\Users\Json\.codex\generated_images\019ff630-3d27-7db3-9cea-157c32c8656b\exec-8254dcc9-6fd8-49bc-b55c-dff3d2335e12.png"),
}


def normal_map(height, strength=2.4):
    height = height.convert("L").filter(ImageFilter.GaussianBlur(0.55))
    horizontal = height.filter(ImageFilter.Kernel((3, 3), (-1, 0, 1, -2, 0, 2, -1, 0, 1), scale=1, offset=128))
    vertical = height.filter(ImageFilter.Kernel((3, 3), (-1, -2, -1, 0, 0, 0, 1, 2, 1), scale=1, offset=128))
    output = Image.new("RGB", height.size)
    pixels = []
    for dx, dy in zip(horizontal.getdata(), vertical.getdata()):
        nx = (dx - 128) / 127 * strength
        ny = (dy - 128) / 127 * strength
        nz = 1.0 / math.sqrt(nx * nx + ny * ny + 1)
        pixels.append((int((nx * nz * 0.5 + 0.5) * 255), int((-ny * nz * 0.5 + 0.5) * 255), int((nz * 0.5 + 0.5) * 255)))
    output.putdata(pixels)
    return output


def surface_detail(name):
    rng = random.Random(name)
    noise = Image.new("L", (256, 256))
    values = [rng.randrange(96, 160) for _ in range(256 * 256)]
    noise.putdata(values)
    if name in {"ceramic", "crystal"}:
        noise = noise.filter(ImageFilter.GaussianBlur(1.25))
    elif name in {"mochi", "slice_cake"}:
        noise = noise.filter(ImageFilter.GaussianBlur(0.55))
    return normal_map(noise, 1.25)


for name, source in SOURCES.items():
    image = Image.open(source).convert("RGB")
    side = int(min(image.size) * 0.78)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    image = image.resize((512, 512), Image.Resampling.LANCZOS)
    image = ImageEnhance.Contrast(image).enhance(1.06)
    image = ImageEnhance.Sharpness(image).enhance(1.16)
    target = OUTPUT / f"{name}-interior.webp"
    image.save(target, "WEBP", quality=88, method=6)
    normal_map(image.resize((256, 256), Image.Resampling.LANCZOS)).save(
        OUTPUT / f"{name}-interior-normal.webp", "WEBP", quality=78, method=6
    )
    surface_detail(name).save(OUTPUT / f"{name}-surface-normal.webp", "WEBP", quality=76, method=6)
    print(f"{name}: {target} ({target.stat().st_size} bytes)")

preview = Image.new("RGB", (1024, 512), "#f4efe5")
for index, name in enumerate(SOURCES):
    tile = Image.open(OUTPUT / f"{name}-interior.webp").resize((256, 256), Image.Resampling.LANCZOS)
    preview.paste(tile, ((index % 4) * 256, (index // 4) * 256))
preview.save(Path(__file__).with_name("wakppu-interior-textures-preview.webp"), "WEBP", quality=90, method=6)
