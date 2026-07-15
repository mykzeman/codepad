#!/usr/bin/env python3
"""
Rasterizes build/icons/stable/codium_cnl.svg into resources/win32/code.ico
inside the vendored VSCodium checkout.

This SVG's paths are all simple axis-aligned rectangles (`M x y h w v h -w Z`,
one optional per-path scale() transform, plus an optional wrapping <g>
translate()/scale() as used by codium_cnl_w80_b8.svg) - no curves - so a
small direct rasterizer here avoids needing the full ImageMagick/rsvg-convert/
icotool toolchain build_icons.sh expects, none of which are installed.

Usage: python3 generate-icons.py <vscodium-dir>
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw

ICO_SIZES = (16, 24, 32, 48, 256)


def parse_transform(transform_str):
    tx, ty, sx, sy = 0.0, 0.0, 1.0, 1.0
    if not transform_str:
        return tx, ty, sx, sy
    m = re.search(r"translate\(([-\d.]+)[,\s]+([-\d.]+)\)", transform_str)
    if m:
        tx, ty = float(m.group(1)), float(m.group(2))
    m = re.search(r"scale\(([-\d.]+)(?:[,\s]+([-\d.]+))?\)", transform_str)
    if m:
        sx = float(m.group(1))
        sy = float(m.group(2)) if m.group(2) else sx
    return tx, ty, sx, sy


def parse_rect(d):
    m = re.match(r"M\s*([-\d.]+)\s+([-\d.]+)\s+h\s*([-\d.]+)\s+v\s*([-\d.]+)\s+h\s*[-\d.]+\s+Z", d.strip())
    if not m:
        raise ValueError(f"Unsupported path data (expected a simple rect): {d}")
    x, y, w, h = (float(v) for v in m.groups())
    return x, y, w, h


def render(svg_path: Path, size: int) -> Image.Image:
    root = ET.parse(svg_path).getroot()
    vb = root.get("viewBox").split()
    vb_w = float(vb[2])
    scale = size / vb_w

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    def walk(elem, ptx, pty, psx, psy):
        tag = elem.tag.split("}")[-1]
        if tag in ("g", "svg"):
            tx, ty, sx, sy = parse_transform(elem.get("transform"))
            ctx, cty = ptx + tx * psx, pty + ty * psy
            csx, csy = psx * sx, psy * sy
            for child in elem:
                walk(child, ctx, cty, csx, csy)
        elif tag == "path":
            x, y, w, h = parse_rect(elem.get("d"))
            etx, ety, esx, esy = parse_transform(elem.get("transform"))
            lx, ly = x * esx + etx, y * esy + ety
            lw, lh = w * esx, h * esy
            fx, fy = lx * psx + ptx, ly * psy + pty
            fw, fh = lw * psx, lh * psy

            fill = elem.get("fill", "rgb(0,0,0)")
            rgb = tuple(int(v) for v in re.findall(r"\d+", fill))[:3]

            x0, y0 = fx * scale, fy * scale
            x1, y1 = (fx + fw) * scale, (fy + fh) * scale
            draw.rectangle([x0, y0, x1, y1], fill=(rgb[0], rgb[1], rgb[2], 255))

    walk(root, 0.0, 0.0, 1.0, 1.0)
    return img


def main():
    if len(sys.argv) != 2:
        print("Usage: generate-icons.py <vscodium-dir>", file=sys.stderr)
        sys.exit(1)

    vscodium_dir = Path(sys.argv[1])
    svg_path = Path(__file__).parent / "icons" / "stable" / "codium_cnl.svg"
    ico_path = vscodium_dir / "vscode" / "resources" / "win32" / "code.ico"

    if not svg_path.exists():
        print(f"No {svg_path} - nothing to generate, leaving stock icon in place.")
        return

    images = {size: render(svg_path, size) for size in ICO_SIZES}
    images[max(ICO_SIZES)].save(
        ico_path, format="ICO", sizes=[(s, s) for s in ICO_SIZES], append_images=list(images.values())
    )
    print(f"Generated {ico_path} from {svg_path}")


if __name__ == "__main__":
    main()
