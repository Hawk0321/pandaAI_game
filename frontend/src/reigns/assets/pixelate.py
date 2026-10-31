"""Offline palette mapping for approved concept art; requires Pillow, no credentials."""
from argparse import ArgumentParser
from collections import Counter
from pathlib import Path

from PIL import Image

PALETTE = [
    "#0a0d15", "#10141f", "#161b2a", "#1d2336", "#272d42", "#3a4260",
    "#f1ece0", "#f7d9b8", "#eab98f", "#c98f65", "#8e5a3c", "#5b3a2a",
    "#f7d98f", "#f2c261", "#c99a3d", "#7a5a1f", "#f0766b", "#c24d45",
    "#7d2f2f", "#3fcf9f", "#2a9a77", "#1d5e4d", "#8fa0ff", "#5b6bd0",
    "#36408a", "#7ee7f2", "#3bb8c6", "#b9b8b1", "#8e8f9a",
]


def lab(rgb):
    linear = [v / 255 / 12.92 if v / 255 <= 0.04045 else ((v / 255 + 0.055) / 1.055) ** 2.4 for v in rgb]
    x, y, z = [v / d for v, d in zip((linear[0] * .4124 + linear[1] * .3576 + linear[2] * .1805,
                                      linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722,
                                      linear[0] * .0193 + linear[1] * .1192 + linear[2] * .9505), (.95047, 1, 1.08883))]
    f = lambda v: v ** (1 / 3) if v > .008856 else 7.787 * v + 16 / 116
    x, y, z = f(x), f(y), f(z)
    return 116 * y - 16, 500 * (x - y), 200 * (y - z)


PALETTE_RGB = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in PALETTE]
PALETTE_LAB = [lab(c) for c in PALETTE_RGB]
LAB_CACHE = {}


def nearest(rgb):
    if rgb not in LAB_CACHE:
        LAB_CACHE[rgb] = min(range(len(PALETTE)), key=lambda i: sum((a - b) ** 2 for a, b in zip(lab(rgb), PALETTE_LAB[i])))
    return LAB_CACHE[rgb]


def pixelate(source, output, size=64, max_colors=16):
    im = Image.open(source).convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    colors = Counter()
    for y in range(size):
        for x in range(size):
            r, g, b, a = im.getpixel((x, y))
            if a < 128:
                im.putpixel((x, y), (0, 0, 0, 0))
                continue
            index = nearest((r, g, b))
            color = PALETTE_RGB[index]
            im.putpixel((x, y), (*color, 255))
            colors[index] += 1
    if len(colors) > max_colors:
        # Merge the smallest accidental color groups into their nearest used colors.
        for unused, _ in sorted(colors.items(), key=lambda item: item[1])[:len(colors) - max_colors]:
            replacement = min((i for i in colors if i != unused), key=lambda i: sum((a - b) ** 2 for a, b in zip(PALETTE_LAB[i], PALETTE_LAB[unused])))
            for y in range(size):
                for x in range(size):
                    if im.getpixel((x, y))[:3] == PALETTE_RGB[unused]:
                        im.putpixel((x, y), (*PALETTE_RGB[replacement], 255))
            del colors[unused]
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    im.save(output)
    return len(colors)


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("output")
    parser.add_argument("--size", type=int, default=64)
    parser.add_argument("--colors", type=int, default=16)
    args = parser.parse_args()
    print(f"Saved {args.output} with {pixelate(args.source, args.output, args.size, args.colors)} colors")
