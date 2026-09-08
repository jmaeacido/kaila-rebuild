"""Compose official KAILA brand assets onto the provider-invite poster base."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE = Path(
    r"C:\Users\jacid\.cursor\projects\c-laragon-www-kaila\assets\kaila-gadget-repair-hiring-poster-ai-base-v2.png"
)
WORDMARK = Path(r"c:\laragon\www\kaila\apps\web\public\brand\kaila-wordmark.png")
BULL = Path(
    r"c:\laragon\www\kaila\output\marketing\canva-provider-video-kit-v1\02-kaila-bull-mascot.png"
)
QR = Path(
    r"c:\laragon\www\kaila\output\marketing\canva-provider-video-kit-v1\04-registration-qr.png"
)
OUT_DIR = Path(r"c:\laragon\www\kaila\output\marketing\gadget-repair-recruitment")
OUT_BASE = OUT_DIR / "kaila-gadget-repair-provider-invite-poster-ai-base-v1.png"
OUT_FINAL = OUT_DIR / "kaila-gadget-repair-provider-invite-poster-v1.png"


def prepare_bull(path: Path, height: int) -> Image.Image:
    """
    Keep the full official Bull.
    The source PNG has horn tips flush with the top edge — pad matching
    backdrop blue above the head so tips aren't pressed against the plate rim.
    No chroma-key (cyan horns match the sky) and no circular crop.
    """
    src = Image.open(path).convert("RGBA")
    # Sample top-edge backdrop for seamless pad
    bg = src.getpixel((src.width // 2, 4))[:3]

    # Add ~8% headroom above the source so horns breathe
    pad_top = int(src.height * 0.10)
    pad_side = int(src.width * 0.02)
    canvas = Image.new(
        "RGBA",
        (src.width + pad_side * 2, src.height + pad_top + pad_side),
        (*bg, 255),
    )
    canvas.paste(src, (pad_side, pad_top))

    # Soft rounded plate AFTER headroom pad (horns sit safely inside)
    scale = height / canvas.height
    w = max(1, int(canvas.width * scale))
    canvas = canvas.resize((w, height), Image.Resampling.LANCZOS)
    edge = Image.new("L", canvas.size, 0)
    edraw = ImageDraw.Draw(edge)
    edraw.rounded_rectangle((0, 0, w - 1, height - 1), radius=28, fill=255)
    edge = edge.filter(ImageFilter.GaussianBlur(1.5))
    out = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    out.paste(canvas, (0, 0), edge)
    return out


def extract_qr_square(path: Path) -> Image.Image:
    qr = Image.open(path).convert("RGBA")
    crop_h = int(qr.height * 0.72)
    block = qr.crop((0, 0, qr.width, crop_h))
    px = block.load()
    w, h = block.size

    def mostly_white(x, y):
        r, g, b, a = px[x, y]
        return a < 20 or (r > 245 and g > 245 and b > 245)

    top = 0
    while top < h and all(mostly_white(x, top) for x in range(0, w, 4)):
        top += 1
    bottom = h - 1
    while bottom > top and all(mostly_white(x, bottom) for x in range(0, w, 4)):
        bottom -= 1
    left = 0
    while left < w and all(mostly_white(left, y) for y in range(top, bottom, 4)):
        left += 1
    right = w - 1
    while right > left and all(mostly_white(right, y) for y in range(top, bottom, 4)):
        right -= 1
    sq = block.crop((left, top, right + 1, bottom + 1))
    side = min(sq.width, sq.height)
    cx, cy = sq.width // 2, sq.height // 2
    half = side // 2
    return sq.crop((cx - half, cy - half, cx - half + side, cy - half + side))


def find_white_pad(im: Image.Image, x0, y0, x1, y1, thr=248):
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = im.getpixel((x, y))[:3]
            if r >= thr and g >= thr and b >= thr:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs), max(ys)


def main() -> None:
    base = Image.open(BASE).convert("RGBA")
    W, H = base.size
    draw = ImageDraw.Draw(base)
    rgb = base.convert("RGB")

    try:
        hint_font = ImageFont.truetype("arial.ttf", 15)
    except OSError:
        hint_font = ImageFont.load_default()

    # --- Logo pad ---
    logo_pad = find_white_pad(rgb, 15, 15, 420, 130) or (28, 24, 360, 100)
    lx0, ly0, lx1, ly1 = logo_pad
    ly1 = min(ly1, ly0 + 95)
    logo_box = (lx0, ly0, lx1, ly1)
    draw.rounded_rectangle(logo_box, radius=18, fill=(255, 255, 255, 255))

    wm = Image.open(WORDMARK).convert("RGBA")
    bbox = wm.getbbox()
    if bbox:
        wm = wm.crop(bbox)
    pad_w = logo_box[2] - logo_box[0] - 36
    pad_h = logo_box[3] - logo_box[1] - 20
    scale = min(pad_w / wm.width, pad_h / wm.height)
    wm = wm.resize(
        (max(1, int(wm.width * scale)), max(1, int(wm.height * scale))),
        Image.Resampling.LANCZOS,
    )
    wx = logo_box[0] + (logo_box[2] - logo_box[0] - wm.width) // 2
    wy = logo_box[1] + (logo_box[3] - logo_box[1] - wm.height) // 2
    base.alpha_composite(wm, (wx, wy))

    # --- Bull with headroom so horns aren't flush to the plate edge ---
    bull = prepare_bull(BULL, height=390)
    shadow = Image.new("RGBA", (bull.width + 40, bull.height + 40), (0, 0, 0, 0))
    mask = bull.split()[-1]
    sh = Image.new("RGBA", bull.size, (10, 18, 40, 45))
    shadow.paste(sh, (14, 18), mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    bx = W - bull.width - 22
    by = 105
    base.alpha_composite(shadow, (bx - 14, by - 14))
    base.alpha_composite(bull, (bx, by))

    # --- QR card: rebuild clean plate inside navy footer, above blue slogan ---
    # Blue slogan strip starts ~y=995 on this base; keep card fully above it.
    card_outer = (1272, 748, 1514, 988)
    card_inner = (1288, 760, 1498, 956)
    draw.rounded_rectangle(card_outer, radius=18, fill=(10, 18, 40, 255))
    draw.rounded_rectangle(card_inner, radius=12, fill=(255, 255, 255, 255))

    qr = extract_qr_square(QR)
    target = min(card_inner[2] - card_inner[0], card_inner[3] - card_inner[1]) - 18
    qr = qr.resize((target, target), Image.Resampling.LANCZOS)
    qx = card_inner[0] + (card_inner[2] - card_inner[0] - target) // 2
    qy = card_inner[1] + (card_inner[3] - card_inner[1] - target) // 2
    base.alpha_composite(qr, (qx, qy))

    hint = "I-scan aron magrehistro"
    caption_y = card_inner[3] + 6
    tw = draw.textlength(hint, font=hint_font) if hasattr(draw, "textlength") else len(hint) * 8
    tx = int(card_outer[0] + (card_outer[2] - card_outer[0] - tw) / 2)
    draw.text((tx, caption_y), hint, fill=(180, 220, 255, 255), font=hint_font)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    Image.open(BASE).convert("RGB").save(OUT_BASE, "PNG", optimize=True)
    final = base.convert("RGB")
    final.save(OUT_FINAL, "PNG", optimize=True)
    legacy = OUT_DIR / "kaila-gadget-repair-hiring-poster-v1.png"
    final.save(legacy, "PNG", optimize=True)
    print("saved", OUT_FINAL, final.size)
    print("bull at", (bx, by), bull.size)
    print("qr target", target, "at", (qx, qy), "card", card_outer)


if __name__ == "__main__":
    main()
