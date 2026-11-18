from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math
import random

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "raster"
OUT.mkdir(parents=True, exist_ok=True)


def glow_layer(size, draw_fn, blur=10, alpha=160):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw_fn(draw)
    blurred = layer.filter(ImageFilter.GaussianBlur(blur))
    blurred.putalpha(blurred.getchannel("A").point(lambda p: min(alpha, p)))
    return blurred


def save_bg_light():
    w, h = 1536, 864
    img = Image.new("RGB", (w, h), "#cfefff")
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(h):
        t = y / h
        r = int(207 * (1 - t) + 142 * t)
        g = int(239 * (1 - t) + 196 * t)
        b = int(255 * (1 - t) + 213 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    draw.ellipse((150, 90, 300, 240), fill=(255, 241, 168, 235))
    for radius, alpha in [(110, 80), (155, 45), (210, 24)]:
        draw.ellipse((225 - radius, 165 - radius, 225 + radius, 165 + radius), outline=(255, 241, 168, alpha), width=8)

    for i in range(20):
        x = i * 110 - 70
        y = 160 + math.sin(i * 1.7) * 35
        draw.ellipse((x, y, x + 180, y + 50), fill=(255, 255, 255, 80))
        draw.ellipse((x + 60, y - 20, x + 230, y + 45), fill=(255, 255, 255, 70))

    for i in range(12):
        x = i * 150 + 30
        draw.rectangle((x + 44, 390, x + 76, 850), fill=(232, 215, 155, 130))
        draw.rectangle((x + 22, 376, x + 100, 392), fill=(255, 241, 168, 145))
        draw.line((x + 60, 405, x + 60, 820), fill=(255, 255, 255, 45), width=3)

    for i in range(8):
        x = i * 240 - 40
        draw.polygon([(x, h), (x + 110, 440), (x + 180, h)], fill=(214, 226, 232, 95))
        draw.polygon([(x + 80, h), (x + 220, 410), (x + 340, h)], fill=(185, 216, 238, 85))

    img.save(OUT / "background-light.png")


def save_bg_shadow():
    w, h = 1536, 864
    img = Image.new("RGB", (w, h), "#06050b")
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(h):
        t = y / h
        r = int(6 * (1 - t) + 58 * t)
        g = int(5 * (1 - t) + 13 * t)
        b = int(11 * (1 - t) + 13 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    rng = random.Random(7)
    for i in range(160):
        x = rng.randrange(w)
        y = rng.randrange(40, 620)
        color = (255, 112, 72, rng.randrange(55, 150)) if i % 3 else (162, 109, 242, rng.randrange(45, 120))
        draw.ellipse((x, y, x + rng.randrange(2, 6), y + rng.randrange(2, 6)), fill=color)

    for i in range(14):
        x = i * 125 - 40
        peak = 300 + math.sin(i * 1.3) * 90
        draw.polygon([(x, h), (x + 78, peak), (x + 165, h)], fill=(24, 8, 15, 230))
        draw.line((x + 78, peak + 55, x + 86, h), fill=(255, 112, 72, 75), width=5)

    for i in range(10):
        x = i * 180 + 10
        draw.polygon([(x, h), (x + 30, 520), (x + 64, h)], fill=(80, 16, 18, 120))
        draw.line((x + 31, 560, x + 48, h), fill=(255, 112, 72, 90), width=3)

    for y in range(660, 864, 26):
        draw.line((0, y, w, y + math.sin(y) * 8), fill=(255, 112, 72, 38), width=2)

    img.save(OUT / "background-shadow.png")


def save_hero_light():
    size = (192, 240)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    img.alpha_composite(glow_layer(size, lambda d: d.ellipse((35, 58, 157, 178), fill=(255, 241, 168, 180)), 16, 120))
    draw = ImageDraw.Draw(img, "RGBA")
    draw.ellipse((68, 12, 124, 28), outline=(255, 241, 168, 230), width=5)
    draw.polygon([(73, 72), (12, 118), (64, 182), (88, 116)], fill=(250, 252, 255, 215))
    draw.polygon([(119, 72), (180, 118), (128, 182), (104, 116)], fill=(250, 252, 255, 215))
    for i in range(5):
        draw.line((72, 90 + i * 12, 25, 130 + i * 10), fill=(214, 176, 89, 120), width=3)
        draw.line((120, 90 + i * 12, 167, 130 + i * 10), fill=(214, 176, 89, 120), width=3)
    draw.rounded_rectangle((67, 58, 125, 174), radius=25, fill=(255, 241, 168, 255))
    draw.ellipse((72, 42, 120, 86), fill=(255, 247, 216, 255))
    draw.rectangle((82, 118, 110, 132), fill=(214, 176, 89, 255))
    draw.rectangle((77, 170, 91, 214), fill=(233, 223, 190, 255))
    draw.rectangle((102, 170, 116, 214), fill=(233, 223, 190, 255))
    draw.rectangle((105, 82, 116, 93), fill=(73, 213, 255, 255))
    img.save(OUT / "hero-light.png")


def save_hero_shadow():
    size = (192, 240)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    img.alpha_composite(glow_layer(size, lambda d: d.ellipse((32, 74, 160, 190), fill=(255, 112, 72, 160)), 18, 120))
    draw = ImageDraw.Draw(img, "RGBA")
    draw.polygon([(74, 74), (12, 124), (68, 190), (90, 116)], fill=(42, 7, 16, 230))
    draw.polygon([(118, 74), (180, 124), (124, 190), (102, 116)], fill=(42, 7, 16, 230))
    draw.rounded_rectangle((65, 58, 127, 184), radius=18, fill=(22, 8, 10, 255))
    draw.ellipse((72, 42, 120, 86), fill=(26, 8, 11, 255))
    draw.polygon([(77, 46), (46, 6), (89, 42)], fill=(255, 112, 72, 220))
    draw.polygon([(115, 46), (146, 6), (103, 42)], fill=(255, 112, 72, 220))
    draw.rectangle((104, 82, 116, 94), fill=(255, 112, 72, 255))
    draw.rectangle((78, 128, 114, 142), fill=(189, 47, 47, 255))
    draw.line((74, 170, 38, 198, 62, 220), fill=(189, 47, 47, 230), width=7)
    draw.rectangle((76, 178, 92, 222), fill=(13, 5, 8, 255))
    draw.rectangle((101, 178, 117, 222), fill=(13, 5, 8, 255))
    img.save(OUT / "hero-shadow.png")


def save_enemy(name, shadow=False):
    size = (160, 120)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, "RGBA")
    if shadow:
        img.alpha_composite(glow_layer(size, lambda d: d.ellipse((18, 18, 142, 104), fill=(255, 112, 72, 150)), 12, 100))
        draw.ellipse((22, 78, 138, 108), fill=(0, 0, 0, 70))
        draw.rounded_rectangle((22, 30, 138, 92), radius=26, fill=(189, 47, 47, 255))
        draw.polygon([(38, 34), (16, 6), (64, 28)], fill=(58, 13, 13, 255))
        draw.polygon([(122, 34), (144, 6), (96, 28)], fill=(58, 13, 13, 255))
        draw.rectangle((92, 50, 110, 66), fill=(12, 4, 7, 255))
        draw.rounded_rectangle((30, 38, 130, 86), radius=20, outline=(255, 112, 72, 150), width=4)
    else:
        img.alpha_composite(glow_layer(size, lambda d: d.ellipse((18, 18, 142, 104), fill=(255, 241, 168, 150)), 12, 90))
        draw.ellipse((22, 78, 138, 108), fill=(0, 0, 0, 55))
        draw.rounded_rectangle((24, 28, 136, 90), radius=30, fill=(198, 154, 66, 255))
        draw.ellipse((34, 20, 76, 50), fill=(255, 241, 168, 120))
        draw.ellipse((84, 20, 126, 50), fill=(255, 241, 168, 120))
        draw.rectangle((92, 50, 110, 64), fill=(18, 21, 28, 255))
        draw.line((44, 86, 30, 110), fill=(116, 85, 29, 220), width=5)
        draw.line((116, 86, 130, 110), fill=(116, 85, 29, 220), width=5)
    img.save(OUT / name)


def save_feather(name, shadow=False):
    size = (160, 72)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    color = (155, 232, 255, 255) if shadow else (255, 241, 168, 255)
    glow = (73, 213, 255, 150) if shadow else (255, 241, 168, 150)
    img.alpha_composite(glow_layer(size, lambda d: d.ellipse((10, 12, 150, 58), fill=glow), 10, 120))
    draw = ImageDraw.Draw(img, "RGBA")
    draw.ellipse((22, 22, 132, 50), fill=color)
    draw.polygon([(148, 36), (72, 8), (88, 36)], fill=(255, 255, 255, 235))
    draw.polygon([(148, 36), (72, 64), (88, 36)], fill=(255, 255, 255, 220))
    draw.line((18, 36, 136, 36), fill=(214, 176, 89, 230) if not shadow else (100, 217, 210, 230), width=4)
    img.save(OUT / name)


save_bg_light()
save_bg_shadow()
save_hero_light()
save_hero_shadow()
save_enemy("enemy-light.png", False)
save_enemy("enemy-shadow.png", True)
save_feather("feather-light.png", False)
save_feather("feather-shadow.png", True)
print(f"Generated raster assets in {OUT}")
