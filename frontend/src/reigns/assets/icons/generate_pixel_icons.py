"""Deterministic 16x16 pixel icons: small UI symbols should not depend on AI raster cleanup."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).parent
INK, IVORY, GRAY, DARK_RED = "#0a0d15", "#f1ece0", "#8e8f9a", "#c24d45"
GOLD, LIGHT_GOLD, RED, GREEN = "#f2c261", "#f7d98f", "#f0766b", "#3fcf9f"
THEMES = {"fund": "#5b6bd0", "crypto": "#3bb8c6", "stock": "#f2c261"}
SLOTS = {
    "fund": {"capital": "chart", "risk": "shield", "confidence": "compass", "reputation": "medal"},
    "crypto": {"capital": "wallet", "risk": "jar", "confidence": "diamond", "reputation": "bubble"},
    "stock": {"capital": "notes", "risk": "helmet", "confidence": "cup", "reputation": "thumb"},
}


def base():
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def save(im, name):
    colors = {pixel for pixel in im.get_flattened_data() if pixel[3]}
    assert len(colors) <= 6, (name, len(colors))
    if name.startswith("hint-"):
        im = im.crop((0, 0, 8, 8))
    im.save(OUT / f"{name}.png")


def rect(d, box, color, outline=INK):
    d.rectangle(box, fill=color, outline=outline)


def crack(d):
    d.line([(11, 3), (9, 6), (12, 8), (9, 12)], fill=DARK_RED)
    d.point((2, 13), fill=DARK_RED)


def sparkles(d):
    for x, y in [(13, 2), (2, 3), (13, 12)]:
        d.line([(x - 1, y), (x + 1, y)], fill=LIGHT_GOLD)
        d.point((x, y - 1), fill=LIGHT_GOLD)
        d.point((x, y + 1), fill=LIGHT_GOLD)


def icon(role, slot, state):
    kind = SLOTS[role][slot]
    color = GRAY if state == "low" else GOLD if state == "high" else THEMES[role]
    im, d = base()
    if kind == "chart":
        rect(d, (2, 3, 13, 13), INK, color)
        points = [(4, 10), (6, 7), (8, 9), (11, 5)] if state != "low" else [(4, 5), (6, 8), (8, 6), (11, 11)]
        d.line(points, fill=GREEN if state == "low" else RED, width=1)
        if state == "high":
            d.line([(11, 5), (13, 1)], fill=RED)
            sparkles(d)
    elif kind == "shield":
        d.polygon([(4, 3), (12, 3), (13, 8), (11, 12), (8, 14), (5, 12), (3, 8)], fill=color, outline=INK)
        d.line((5, 7, 11, 7), fill=IVORY)
    elif kind == "compass":
        d.ellipse((2, 2, 13, 13), fill=color, outline=INK)
        d.polygon([(8, 3), (10, 8), (8, 7), (6, 8)], fill=IVORY if state != "low" else DARK_RED)
        d.point((8, 8), fill=INK)
    elif kind == "medal":
        d.polygon([(5, 10), (4, 15), (7, 13), (8, 15), (9, 13), (12, 15), (11, 10)], fill=color, outline=INK)
        d.ellipse((3, 2, 12, 11), fill=color, outline=INK)
        d.line([(6, 6), (7, 5), (8, 6), (9, 5), (10, 6), (8, 9), (6, 6)], fill=RED if state != "low" else DARK_RED)
    elif kind == "wallet":
        rect(d, (2, 5, 13, 13), color)
        d.line((4, 5, 5, 2, 9, 2, 10, 5), fill=GOLD, width=2)
        rect(d, (9, 8, 14, 11), GOLD)
    elif kind == "jar":
        rect(d, (4, 3, 12, 14), INK, GRAY)
        level = 12 if state == "low" else 4 if state == "high" else 8
        d.rectangle((5, level, 11, 13), fill=DARK_RED if state == "low" else THEMES[role])
        d.line((5, 2, 11, 2), fill=GOLD if state == "high" else IVORY, width=2)
    elif kind == "diamond":
        if state == "low":
            d.polygon([(4, 5), (8, 3), (12, 5), (13, 10), (9, 13), (4, 11), (2, 8)], fill=GRAY, outline=INK)
            d.line((4, 6, 10, 10, 6, 11), fill=INK)
        else:
            d.polygon([(3, 5), (6, 2), (10, 2), (13, 5), (8, 14)], fill=color, outline=INK)
            d.line((3, 5, 13, 5), fill=IVORY)
            d.line((6, 2, 8, 5, 10, 2), fill=IVORY)
    elif kind == "bubble":
        d.polygon([(2, 3), (13, 3), (13, 11), (7, 11), (4, 14), (4, 11), (2, 11)], fill=color, outline=INK)
        if state == "high":
            rect(d, (7, 5, 9, 8), INK, INK)
        else:
            for x in (5, 8, 11):
                d.point((x, 7), fill=IVORY)
    elif kind == "notes":
        for y in (5, 8, 11) if state != "high" else (2, 5, 8, 11):
            rect(d, (2, y, 13, y + 3), GREEN if state != "low" else GRAY)
            d.line((7, y, 7, y + 3), fill=GOLD)
    elif kind == "helmet":
        d.pieslice((2, 2, 13, 15), 180, 360, fill=color, outline=INK)
        d.rectangle((2, 9, 14, 11), fill=color, outline=INK)
        d.line((8, 3, 8, 8), fill=IVORY if state != "low" else DARK_RED)
    elif kind == "cup":
        rect(d, (4, 4, 12, 14), color)
        d.rectangle((3, 2, 13, 4), fill=GRAY, outline=INK)
        d.line((6, 1, 6, 0), fill=IVORY)
        d.line((10, 1, 10, 0), fill=IVORY)
    elif kind == "thumb":
        d.polygon([(4, 7), (7, 7), (9, 2), (11, 2), (10, 7), (14, 7), (13, 13), (4, 13)], fill=color, outline=INK)
        d.line((6, 8, 6, 12), fill=IVORY if state != "low" else DARK_RED)
    if state == "low":
        crack(d)
    elif state == "high":
        sparkles(d)
    return im


for role, slots in SLOTS.items():
    for slot in slots:
        for state in ("normal", "low", "high"):
            save(icon(role, slot, state), f"icon-{role}-{slot}-{state}")

for slot, shape in [("capital", "circle"), ("risk", "square"), ("confidence", "diamond"), ("reputation", "triangle")]:
    for frame in ("a", "b"):
        im, d = base()
        color = GOLD if frame == "a" else "#7a5a1f"
        if shape == "circle":
            d.ellipse((1, 1, 6, 6), fill=color, outline=INK)
        elif shape == "square":
            d.polygon([(2, 1), (5, 1), (6, 2), (6, 5), (5, 6), (2, 6), (1, 5), (1, 2)], fill=color, outline=INK)
        elif shape == "diamond":
            d.polygon([(4, 0), (7, 4), (4, 7), (0, 4)], fill=color, outline=INK)
        else:
            d.polygon([(4, 0), (7, 6), (0, 6)], fill=color, outline=INK)
        d.point((3, 2), fill=LIGHT_GOLD)
        save(im, f"hint-{slot}-{frame}")

im, d = base()
d.polygon([(8, 1), (12, 2), (14, 5), (14, 9), (12, 11), (3, 11), (1, 14), (1, 5), (4, 2)], fill="#3a4260", outline=INK)
d.arc((6, 3, 10, 8), 180, 360, fill=GRAY)
rect(d, (5, 6, 11, 11), GRAY)
im = im.resize((64, 64), Image.Resampling.NEAREST)
im.save(OUT.parent / "avatars" / "avatar-locked.png")
print("Generated 36 icons, 8 hint frames and locked avatar")
