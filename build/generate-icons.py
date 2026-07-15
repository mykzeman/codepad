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


def render_tile(svg_path: Path, canvas_size: int, logo_size: int, offset: tuple[int, int]) -> Image.Image:
    """Matches build_icons.sh's build_windows_type: logo rendered at logo_size,
    composited onto a transparent canvas_size canvas at a NorthWest offset -
    not necessarily centered. The 150x150 tile in particular is deliberately
    biased toward the top, since Windows overlays ShortDisplayName text below
    the logo when ShowNameOnSquare150x150Logo="on"."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    logo = render(svg_path, logo_size)
    canvas.alpha_composite(logo, offset)
    return canvas


def generate_letterpress(svg_path: Path, color: str, base_opacity: float, key_opacity_ratio: float = 0.4) -> str:
    """Builds one of the four editor-empty-state watermark variants
    (light/dark/hcLight/hcDark) as real vector SVG - a plain color/opacity
    swap, not a rasterize. The original letterpress art is one solid
    silhouette path; ours is two-tone (black body + white key-cutouts), so
    flattening both to one opacity would lose the keyboard shape entirely.
    Keeping the "keys" at a fraction of the body's opacity preserves that
    detail while staying within the same monochrome watermark look."""
    root = ET.parse(svg_path).getroot()
    vb = root.get("viewBox").split()
    parts = ['<?xml version="1.0" encoding="UTF-8"?>', f'<svg xmlns="http://www.w3.org/2000/svg" width="{vb[2]}" height="{vb[3]}" viewBox="0 0 {vb[2]} {vb[3]}">']

    def walk(elem):
        tag = elem.tag.split("}")[-1]
        if tag in ("g", "svg"):
            for child in elem:
                walk(child)
        elif tag == "path":
            fill = elem.get("fill", "rgb(0,0,0)")
            is_black = "0,0,0" in fill
            opacity = base_opacity if is_black else base_opacity * key_opacity_ratio
            transform = elem.get("transform")
            transform_attr = f' transform="{transform}"' if transform else ""
            parts.append(f'  <path d="{elem.get("d")}" fill="{color}" fill-opacity="{opacity:.3f}"{transform_attr} />')

    walk(root)
    parts.append("</svg>")
    return "\n".join(parts) + "\n"


def main():
    if len(sys.argv) != 2:
        print("Usage: generate-icons.py <vscodium-dir>", file=sys.stderr)
        sys.exit(1)

    vscodium_dir = Path(sys.argv[1])
    svg_path = Path(__file__).parent / "icons" / "stable" / "codium_cnl.svg"
    win32_dir = vscodium_dir / "vscode" / "resources" / "win32"

    if not svg_path.exists():
        print(f"No {svg_path} - nothing to generate, leaving stock icon in place.")
        return

    ico_path = win32_dir / "code.ico"
    images = {size: render(svg_path, size) for size in ICO_SIZES}
    images[max(ICO_SIZES)].save(
        ico_path, format="ICO", sizes=[(s, s) for s in ICO_SIZES], append_images=list(images.values())
    )
    print(f"Generated {ico_path} from {svg_path}")

    # Start Menu/taskbar tile assets (win32/VisualElementsManifest.xml) - sizes
    # and offsets match build_icons.sh's build_windows_types exactly.
    render_tile(svg_path, 70, 45, (12, 12)).save(win32_dir / "code_70x70.png")
    render_tile(svg_path, 150, 64, (44, 25)).save(win32_dir / "code_150x150.png")
    print(f"Generated {win32_dir / 'code_70x70.png'} and code_150x150.png")

    # Empty-editor-area "letterpress" watermark, one per theme. Colors/base
    # opacities match VSCodium's own stock files exactly.
    letterpress_dir = vscodium_dir / "vscode" / "src" / "vs" / "workbench" / "browser" / "parts" / "editor" / "media"
    letterpress_variants = {
        "letterpress-light.svg": ("#B2B2B2", 0.1),
        "letterpress-dark.svg": ("#B2B2B2", 0.3),
        "letterpress-hcLight.svg": ("#B2B2B2", 1.0),
        "letterpress-hcDark.svg": ("#3C3C3C", 1.0),
    }
    for filename, (color, opacity) in letterpress_variants.items():
        (letterpress_dir / filename).write_text(generate_letterpress(svg_path, color, opacity), encoding="utf-8")
    print(f"Generated {len(letterpress_variants)} letterpress watermark variants in {letterpress_dir}")


if __name__ == "__main__":
    main()
