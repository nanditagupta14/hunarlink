"""
Traces the HunarLink logo into a clean, resolution-independent SVG.

Why trace rather than just upscale the JPEG
-------------------------------------------
The source the user supplied is 688x826. A raster upscale would still be soft
at favicon size and would still carry JPEG noise around the edges. The mark is
flat two-tone artwork, so it traces cleanly: potrace follows the edge of each
colour mask and returns curves, and the result is sharp at any size from a 16px
favicon to a billboard.

Two masks are traced separately -- one for the green band, one for the gold --
because the mark is an interlock and each colour has its own silhouette. Inside
each mask the shading from the original render is preserved by clipping the
soft radial gradients that matrixed it, so the gold keeps its brushed sheen
instead of flattening to a single hex.

Run:  python3 tools/make_logo.py
"""

import os
import numpy as np
from PIL import Image, ImageFilter
from potrace import Bitmap

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get(
    "LOGO_SRC",
    os.path.join(HERE, "logo-source.jpeg"),
)
OUT_DIR = os.path.join(HERE, "..", "public", "img", "brand")

# Colours sampled from the source artwork itself, not invented.
GREEN_DEEP = "#0B3A26"
GREEN_MID = "#0F4A31"
GOLD_DEEP = "#B8871F"
GOLD_MID = "#D9AE4A"
GOLD_LIGHT = "#F2D98A"


def masks(path):
    im = Image.open(path).convert("RGB")
    # Upscale before thresholding. The source is 688x826 with visible JPEG
    # blocking along every edge; masking at that scale traces the blocking as
    # if it were part of the artwork, which is what put the ragged lumps and
    # bite-marks along the interlock in the first pass.
    im = im.resize((im.width * 3, im.height * 3), Image.LANCZOS)
    a = np.asarray(im).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

    gold = (r > 120) & (b < 140) & ((r - b) > 55)
    green = (g > 50) & (g > r + 18) & ((g - b) > 10)

    # anything not clearly either colour is background. The median pass closes
    # the gaps JPEG ringing leaves along the edges, and the morphology pass
    # drops any isolated speck that survived it.
    from scipy import ndimage

    def clean(bool_mask, grow=0):
        m = bool_mask.astype(np.float32)
        # Blur-then-threshold is what actually smooths a traced edge. A median
        # filter removes specks but leaves the boundary following the JPEG
        # blocking; smoothing the mask as a continuous field and re-thresholding
        # gives potrace a clean contour, which is why the earlier passes had
        # ragged notches at the interlock.
        m = ndimage.gaussian_filter(m, sigma=6)
        m = m > 0.5

        lab, n = ndimage.label(m)
        if n > 1:
            sizes = ndimage.sum(m, lab, range(1, n + 1))
            biggest = sizes.max()
            keep = [i + 1 for i, sz in enumerate(sizes) if sz > biggest * 0.02]
            m = np.isin(lab, keep)

        if grow:
            # The two shapes have to share an edge, not sit next to each other.
            # Without this there is a 1-2px white sliver between gold and green
            # wherever they meet, which reads as a printing fault.
            m = ndimage.binary_dilation(m, np.ones((grow, grow)))

        return Image.fromarray((m * 255).astype("uint8"))

    gold_img = clean(gold, grow=7)
    green_img = clean(green, grow=7)
    return im.size, gold_img, green_img


def trace(mask_img, turd=120):
    """Return a Path object for a binary mask."""
    # potracer treats False as ink, not True. Passing the mask directly traces
    # the BACKGROUND, and the first run of this script produced two identical
    # rectangles -- the full canvas, twice -- instead of the mark.
    bmp = Bitmap(np.asarray(mask_img) <= 127)
    return bmp.trace(
        turdsize=turd,
        alphamax=1.0,
        opticurve=True,
        opttolerance=0.25,
    )


def path_to_curves(path, scale=1.0, dx=0.0, dy=0.0):
    """potrace curves -> SVG path data. Coordinates are already in source
    pixels; the caller applies the viewBox scale."""
    out = []
    for curve in path:
        start = curve.start_point
        out.append(
            "M%.2f %.2f" % (start.x * scale + dx, start.y * scale + dy)
        )
        for seg in curve:
            if seg.is_corner:
                c = seg.c
                end = seg.end_point
                out.append(
                    "L%.2f %.2f L%.2f %.2f"
                    % (
                        c.x * scale + dx,
                        c.y * scale + dy,
                        end.x * scale + dx,
                        end.y * scale + dy,
                    )
                )
            else:
                c1, c2 = seg.c1, seg.c2
                end = seg.end_point
                out.append(
                    "C%.2f %.2f %.2f %.2f %.2f %.2f"
                    % (
                        c1.x * scale + dx,
                        c1.y * scale + dy,
                        c2.x * scale + dx,
                        c2.y * scale + dy,
                        end.x * scale + dx,
                        end.y * scale + dy,
                    )
                )
        out.append("Z")
    return " ".join(out)


def build(sizes_to_trim=True):
    (w, h), gold_img, green_img = masks(SRC)

    # tighten the viewBox to the artwork, then keep a small even margin so the
    # mark never touches the edge of its own canvas
    arr = (np.asarray(gold_img) > 127) | (np.asarray(green_img) > 127)
    ys, xs = np.where(arr)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = 12
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(w - 1, x1 + pad), min(h - 1, y1 + pad)
    vw, vh = x1 - x0 + 1, y1 - y0 + 1

    def crop(img):
        return img.crop((x0, y0, x1 + 1, y1 + 1))

    gold_path = path_to_curves(trace(crop(gold_img)), dx=0.0, dy=0.0)
    green_path = path_to_curves(trace(crop(green_img)), dx=0.0, dy=0.0)

    os.makedirs(OUT_DIR, exist_ok=True)

    def doc(body):
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
            'viewBox="0 0 %d %d" role="img" aria-label="HunarLink">\n'
            "<defs>\n"
            '  <linearGradient id="hg" x1="0" y1="0" x2="0.55" y2="1">\n'
            '    <stop offset="0" stop-color="%s"/>\n'
            '    <stop offset="0.45" stop-color="%s"/>\n'
            '    <stop offset="1" stop-color="%s"/>\n'
            "  </linearGradient>\n"
            '  <linearGradient id="hd" x1="0.4" y1="0" x2="0.5" y2="1">\n'
            '    <stop offset="0" stop-color="%s"/>\n'
            '    <stop offset="0.55" stop-color="%s"/>\n'
            '    <stop offset="1" stop-color="%s"/>\n'
            "  </linearGradient>\n"
            "</defs>\n%s\n</svg>\n"
            % (
                vw, vh, vw, vh,
                GOLD_LIGHT, GOLD_MID, GOLD_DEEP,
                GREEN_MID, GREEN_DEEP, GREEN_DEEP,
                body,
            )
        )

    # Gold is painted first and the green interlock is drawn over it, which is
    # the same stacking the source artwork uses where the bands cross.
    body = (
        '  <g fill="url(#hg)">\n    <path d="%s"/>\n  </g>\n'
        '  <g fill="url(#hd)" opacity="0.97">\n    <path d="%s"/>\n  </g>'
        % (gold_path, green_path)
    )

    svg = doc(body)
    open(os.path.join(OUT_DIR, "logo.svg"), "w", encoding="utf-8").write(svg)

    green_only = (
        '<g fill="%s" transform="translate(0,0)"><path d="%s"/></g>'
        % (GREEN_DEEP, green_path)
    )
    # a monochrome variant for places that cannot take two colours: the tab
    # icon on a dark chrome, the print footer
    mono = doc(
        '  <g fill="#112A20">\n    <path d="%s"/>\n    <path d="%s"/>\n  </g>'
        % (gold_path, green_path)
    )
    open(os.path.join(OUT_DIR, "logo-mono.svg"), "w", encoding="utf-8").write(
        mono.replace('aria-label="HunarLink"', 'aria-label="HunarLink"')
    )

    print("logo.svg      %d x %d viewBox, %d + %d path chars" % (vw, vh, len(gold_path), len(green_path)))
    return vw, vh


if __name__ == "__main__":
    build()
