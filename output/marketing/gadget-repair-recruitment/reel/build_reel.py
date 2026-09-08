"""Compose branded reel scenes and export MP4 for gadget-repair recruitment."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"c:\laragon\www\kaila")
ASSETS = Path(r"C:\Users\jacid\.cursor\projects\c-laragon-www-kaila\assets")
OUT = ROOT / "output" / "marketing" / "gadget-repair-recruitment" / "reel"
WM = ROOT / "apps" / "web" / "public" / "brand" / "kaila-wordmark-on-dark.png"
QR = ROOT / "output" / "marketing" / "canva-provider-video-kit-v1" / "04-registration-qr.png"

W, H = 1080, 1920
TARGET = (W, H)


def load_resize(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    return im.resize(TARGET, Image.Resampling.LANCZOS)


def official_wordmark(height: int = 72) -> Image.Image:
    wm = Image.open(WM).convert("RGBA")
    bbox = wm.getbbox()
    if bbox:
        wm = wm.crop(bbox)
    width = max(1, int(wm.width * (height / wm.height)))
    return wm.resize((width, height), Image.Resampling.LANCZOS)


def official_qr_square(size: int = 420) -> Image.Image:
    qr = Image.open(QR).convert("RGBA")
    crop_h = int(qr.height * 0.72)
    block = qr.crop((0, 0, qr.width, crop_h))
    side = min(block.width, block.height)
    left = (block.width - side) // 2
    top = (block.height - side) // 2
    sq = block.crop((left, top, left + side, top + side))
    return sq.resize((size, size), Image.Resampling.LANCZOS)


def scrub_top_left_logo_zone(scene: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Remove AI-invented logos by stretching a clean blue strip — no hard plate."""
    x0, y0, x1, y1 = box
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(W, x1), min(H, y1)
    # Prefer a thin clean band just above the zone; fall back to far-left edge
    ref_y0 = max(0, y0 - 36)
    ref_y1 = max(ref_y0 + 8, y0)
    if ref_y1 <= ref_y0:
        ref = scene.crop((8, 8, 48, 48))
    else:
        ref = scene.crop((x0, ref_y0, x1, ref_y1))
    scrub = ref.resize((x1 - x0, y1 - y0), Image.Resampling.BICUBIC)
    # Soft edge so the scrub does not read as a rectangle
    mask = Image.new("L", (x1 - x0, y1 - y0), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, x1 - x0 - 1, y1 - y0 - 1), radius=28, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(4))
    scene.paste(scrub, (x0, y0), mask)


def place_wordmark(scene: Image.Image) -> Image.Image:
    # Scrub typical AI logo / leftover plate zones (wider than wordmark)
    scrub_top_left_logo_zone(scene, (32, 32, 460, 175))
    wm = official_wordmark(68)
    scene.alpha_composite(wm, (56, 58))
    return scene


def scrub_region_with_blue(
    scene: Image.Image,
    box: tuple[int, int, int, int],
    *,
    soft: bool = True,
) -> None:
    """Fill a region with stretched nearby blue (removes AI QR placeholder plates)."""
    x0, y0, x1, y1 = [int(v) for v in box]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(W, x1), min(H, y1)
    if x1 <= x0 or y1 <= y0:
        return
    ref = scene.crop((12, min(900, max(12, y0 - 40)), 80, min(H - 12, max(40, y0 + 20))))
    if ref.height < 4 or ref.width < 4:
        ref = scene.crop((12, 200, 80, 280))
    fill = ref.resize((x1 - x0, y1 - y0), Image.Resampling.BICUBIC)
    if soft:
        mask = Image.new("L", (x1 - x0, y1 - y0), 0)
        md = ImageDraw.Draw(mask)
        md.rounded_rectangle((0, 0, x1 - x0 - 1, y1 - y0 - 1), radius=24, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(3))
        scene.paste(fill, (x0, y0), mask)
    else:
        scene.paste(fill, (x0, y0))


def remove_ai_qr_placeholder(scene: Image.Image) -> None:
    """Erase the large white AI QR plate + footer remnants by row-matching side blues."""
    px = scene.load()
    assert px is not None
    for y in range(1250, H - 8):
        left = scene.getpixel((36, y))[:3]
        right = scene.getpixel((W - 36, y))[:3]
        # Footer URL / globe sit under the plate — wipe the center strip harder
        footer = y >= 1835
        x0, x1 = (120, W - 120) if footer else (50, W - 50)
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            bright = r > 185 and g > 185 and b > 185
            pale_blue_white = r > 160 and g > 190 and b > 210 and min(r, g, b) > 150
            # cyan dashed stub / light ghost text on blue
            cyan_line = b > 190 and g > 150 and r < 140 and (g + b) > 340
            ghost = footer and (r + g + b) > 280 and abs(r - left[0]) + abs(g - left[1]) + abs(b - left[2]) > 80
            if bright or pale_blue_white or cyan_line or ghost:
                t = (x - x0) / max(1, (x1 - x0))
                fill = tuple(int(left[i] * (1 - t) + right[i] * t) for i in range(3))
                px[x, y] = (*fill, a)


def place_official_registration_card(scene: Image.Image) -> Image.Image:
    """Official registration QR card below CTA copy — no extra white plate / seam."""
    remove_ai_qr_placeholder(scene)

    card = Image.open(QR).convert("RGBA")
    target_w = 460
    target_h = int(card.height * (target_w / card.width))
    card = card.resize((target_w, target_h), Image.Resampling.LANCZOS)

    px = (W - card.width) // 2
    py = 1310
    if py + card.height > H - 48:
        py = H - 48 - card.height
    scene.alpha_composite(card, (px, py))
    return scene


def tighten_scene2(scene: Image.Image) -> Image.Image:
    """Pull content upward to kill the large empty blue void under the logo."""
    header_h = 150
    content = scene.crop((0, 220, W, H))
    content = content.resize((W, H - header_h), Image.Resampling.LANCZOS)
    blue = scene.getpixel((20, 20))[:3]
    out = Image.new("RGBA", (W, H), (*blue, 255))
    top = scene.crop((0, 0, W, 80)).resize((W, header_h), Image.Resampling.BICUBIC)
    out.paste(top, (0, 0))
    out.paste(content, (0, header_h))
    return out


def compose_scene(index: int, src: Path) -> Path:
    scene = load_resize(src)
    if index == 2:
        scene = tighten_scene2(scene)
    scene = place_wordmark(scene)
    if index == 4:
        scene = place_official_registration_card(scene)
    out = OUT / f"scene-{index}.png"
    scene.convert("RGB").save(out, "PNG", optimize=True)
    return out


def build_video(scenes: list[Path]) -> Path:
    durs = [5.2, 5.6, 6.0, 7.5]
    fade = 0.25
    inputs: list[str] = []
    for path, dur in zip(scenes, durs, strict=True):
        inputs.extend(["-loop", "1", "-t", str(dur), "-i", str(path)])

    offsets = []
    running = durs[0]
    for i in range(1, len(durs)):
        offsets.append(running - fade)
        running = running + durs[i] - fade
    total = running

    parts = []
    for i in range(len(scenes)):
        parts.append(
            f"[{i}:v]fps=30,scale={W}:{H}:flags=lanczos,format=yuv420p,settb=AVTB[v{i}]"
        )
    prev = "v0"
    for i in range(1, len(scenes)):
        out = "v" if i == len(scenes) - 1 else f"xf{i}"
        parts.append(
            f"[{prev}][v{i}]xfade=transition=fade:duration={fade}:offset={offsets[i - 1]:.3f}[{out}]"
        )
        prev = out

    mp4 = OUT / "kaila-gadget-repair-reel-v1.mp4"
    cmd = [
        "ffmpeg",
        "-y",
        *inputs,
        "-filter_complex",
        ";".join(parts),
        "-map",
        "[v]",
        "-t",
        f"{total:.3f}",
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(mp4),
    ]
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        raise SystemExit(f"ffmpeg failed: {result.returncode}")
    return mp4


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sources = [
        ASSETS / "gadget-repair-reel-scene-1.png",
        ASSETS / "gadget-repair-reel-scene-2.png",  # tighten_scene2 fills the void
        ASSETS / "gadget-repair-reel-scene-3.png",
        ASSETS / "gadget-repair-reel-scene-4.png",
    ]
    scenes = [compose_scene(i + 1, src) for i, src in enumerate(sources)]
    mp4 = build_video(scenes)
    print("scenes:", ", ".join(str(p.name) for p in scenes))
    print("video:", mp4)


if __name__ == "__main__":
    main()
