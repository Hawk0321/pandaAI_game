"""Draw the six survival badges at 32px, then export nearest-neighbor 96px PNGs."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).parent
INK, GOLD, LIGHT, DARK, SILVER, COPPER = "#0a0d15", "#f2c261", "#f7d98f", "#7a5a1f", "#b9b8b1", "#c98f65"


def flame(d, x=16, y=13, scale=1):
    d.polygon([(x, y - 8 * scale), (x + 4 * scale, y - 2 * scale), (x + 3 * scale, y + 3 * scale), (x, y + 5 * scale), (x - 3 * scale, y + 3 * scale), (x - 4 * scale, y - 2 * scale)], fill=GOLD, outline=INK)
    d.polygon([(x, y - 3 * scale), (x + 2 * scale, y + 1 * scale), (x, y + 3 * scale), (x - 2 * scale, y + 1 * scale)], fill=LIGHT)


def badge(tier):
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if tier == 1:
        d.line((11, 25, 19, 14), fill=COPPER, width=3)
        flame(d, 20, 12)
    elif tier == 2:
        d.rectangle((12, 13, 20, 25), fill=LIGHT, outline=INK)
        d.rectangle((9, 26, 23, 29), fill=GOLD, outline=INK)
        flame(d)
    else:
        color = COPPER if tier == 3 else SILVER if tier == 4 else GOLD
        if tier < 5:
            d.ellipse((3, 3, 29, 29), fill=color, outline=INK)
            d.ellipse((5, 5, 27, 27), fill=DARK, outline=INK)
        else:
            d.polygon([(16, 1), (28, 6), (27, 20), (23, 27), (16, 31), (9, 27), (5, 20), (4, 6)], fill=color, outline=INK)
            d.polygon([(16, 4), (25, 8), (24, 20), (16, 27), (8, 20), (7, 8)], fill=DARK, outline=INK)
        if tier == 3:
            d.rectangle((11, 13, 21, 24), fill=GOLD, outline=INK)
            d.arc((9, 6, 23, 20), 180, 360, fill=LIGHT, width=2)
            flame(d, 16, 17)
        elif tier == 4:
            d.polygon([(11, 24), (12, 11), (20, 11), (22, 24)], fill=LIGHT, outline=INK)
            d.rectangle((10, 9, 22, 12), fill=GOLD, outline=INK)
            d.polygon([(21, 13), (27, 10), (27, 13), (21, 16)], fill=LIGHT)
            d.line((5, 26, 10, 24, 16, 26, 22, 24, 27, 26), fill="#5b6bd0", width=2)
        elif tier == 5:
            d.polygon([(11, 25), (12, 11), (20, 11), (22, 25)], fill=LIGHT, outline=INK)
            d.rectangle((10, 9, 22, 12), fill=GOLD, outline=INK)
            d.line((7, 8, 4, 14, 7, 13, 4, 20), fill=LIGHT, width=2)
            d.polygon([(22, 14), (27, 11), (27, 15), (22, 18)], fill=LIGHT)
        else:
            d.arc((6, 11, 26, 28), 0, 180, fill=GOLD, width=3)
            flame(d, 16, 19, 2)
            d.polygon([(10, 7), (12, 1), (16, 5), (20, 1), (23, 7)], fill=GOLD, outline=INK)
            for x, y in [(5, 4), (27, 4), (4, 13), (28, 13)]:
                d.line((x - 1, y, x + 1, y), fill=LIGHT)
                d.line((x, y - 1, x, y + 1), fill=LIGHT)
    return im


for tier in range(1, 7):
    image = badge(tier)
    assert len({pixel for pixel in image.get_flattened_data() if pixel[3]}) <= 12
    image.resize((96, 96), Image.Resampling.NEAREST).save(OUT / f"badge-survival-tier-{tier}.png")
print("Generated six survival badges")
