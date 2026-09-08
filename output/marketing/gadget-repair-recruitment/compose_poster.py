from PIL import Image, ImageDraw, ImageFont

base_path = r"C:\Users\jacid\.cursor\projects\c-laragon-www-kaila\assets\kaila-gadget-repair-facebook-post-v1.png"
wm_path = r"c:\laragon\www\kaila\apps\web\public\brand\kaila-wordmark-on-dark.png"
qr_path = r"c:\laragon\www\kaila\output\marketing\canva-provider-video-kit-v1\04-registration-qr.png"
out_path = r"c:\laragon\www\kaila\output\marketing\gadget-repair-recruitment\kaila-gadget-repair-facebook-post-v1.png"

base = Image.open(base_path).convert("RGBA")
W, H = base.size
draw = ImageDraw.Draw(base)

# Sample background blue near top-left for seamless patch
sample = base.getpixel((80, 90))[:3]

# Cover AI wordmark (top-left)
draw.rectangle((18, 18, 340, 118), fill=(*sample, 255))

# Cover AI QR + label region (bottom-right) with navy matching CTA bar
navy = (10, 18, 40, 255)
draw.rounded_rectangle((W - 268, H - 292, W - 18, H - 18), radius=22, fill=navy)
# Inner white QR plate
draw.rounded_rectangle((W - 250, H - 274, W - 36, H - 72), radius=16, fill=(255, 255, 255, 255))

# Official wordmark
wm = Image.open(wm_path).convert("RGBA")
bbox = wm.getbbox()
if bbox:
    wm = wm.crop(bbox)
wm_h = 52
wm_w = int(wm.width * (wm_h / wm.height))
wm = wm.resize((wm_w, wm_h), Image.Resampling.LANCZOS)
base.alpha_composite(wm, (36, 42))

# Official registration QR — take upper square of asset
qr = Image.open(qr_path).convert("RGBA")
# Crop tightly around QR modules: top ~72% is QR + margin
crop_h = int(qr.height * 0.72)
qr_block = qr.crop((0, 0, qr.width, crop_h))
# Make square from center
side = min(qr_block.width, qr_block.height)
left = (qr_block.width - side) // 2
top = (qr_block.height - side) // 2
qr_sq = qr_block.crop((left, top, left + side, top + side))
target = 178
qr_sq = qr_sq.resize((target, target), Image.Resampling.LANCZOS)
qx = W - 36 - target - 18
qy = H - 72 - target - 18
base.alpha_composite(qr_sq, (qx, qy))

# Scan hint under QR on navy
try:
    font = ImageFont.truetype("arial.ttf", 16)
except OSError:
    font = ImageFont.load_default()
hint = "I-scan aron magrehistro"
# Approximate center under QR plate
tw = draw.textlength(hint, font=font) if hasattr(draw, "textlength") else len(hint) * 8
tx = int(W - 36 - (214 + tw) / 2)
ty = H - 58
draw.text((tx, ty), hint, fill=(180, 220, 255, 255), font=font)

final = base.convert("RGB")
final.save(out_path, "PNG", optimize=True)
print("saved", out_path, final.size)
