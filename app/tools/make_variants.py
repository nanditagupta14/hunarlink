#!/usr/bin/env python3
"""Generate the WebP variants the site's <picture> elements ask for.

    python3 tools/make_variants.py            # generate
    python3 tools/make_variants.py --check    # report only, write nothing
    python3 tools/make_variants.py --prune    # also delete orphans

Why
---
Every catalogue image was shipped exactly as photographed: 106 JPEGs, most
1400 px tall, rendered into cards about 311 px wide. The browser had no smaller
file to ask for and no way to know which it needed, so a phone downloaded ~200 KB
to paint a thumbnail. Lighthouse measured ~1.9 MB of avoidable image weight on a
single home-page visit.

What it writes
--------------
For each source JPEG it writes <stem>-<width>.webp for every width the source is
genuinely big enough to support. It also rewrites src/data/imageVariants.js, the
manifest the components read. That manifest exists because the first version of
this optimisation built srcSet strings by *assuming* every image had a 400 and
an 800 variant; two narrow hero images only went up to 400, so their srcSet
advertised files that did not exist and the cards rendered blank. The manifest
means the components only ever ask for files that are on disk.

Widths are chosen per directory from what the layout actually renders, not from
a single global rule, because a 420 px portrait variant is useless for a product
card and a 1040 px product variant is waste for a thumbnail.
"""
import argparse
import glob
import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")

PUBLIC = os.path.join(os.path.dirname(__file__), "..", "public")
PUBLIC = os.path.normpath(PUBLIC)
MANIFEST = os.path.join(os.path.dirname(__file__), "..", "src", "data", "imageVariants.js")
MANIFEST = os.path.normpath(MANIFEST)

# (directory relative to public/, [widths in px])
TARGETS = [
    ("assets/products", [520, 1040]),
    ("assets", [400, 800]),
    ("img/artisans", [420, 840]),
]

# Quality 78 is the point where a shawl's weave still reads at card size.
# Method 6 is the slowest and best encoder; these are build artefacts, so the
# extra seconds are free.
QUALITY = 78
METHOD = 6

# Skip generating a width when the source is within 5% of it — upscaling adds
# bytes for no detail.
MIN_RATIO = 1.05


def variants_for(path, widths):
    """Widths this source can honestly serve."""
    with Image.open(path) as im:
        actual = im.width
    return [w for w in widths if actual >= w * MIN_RATIO]


def make(src, width):
    out = os.path.join(os.path.dirname(src), f"{os.path.splitext(os.path.basename(src))[0]}-{width}.webp")
    if not CHECK_ONLY:
        with Image.open(src) as im:
            im = im.convert("RGB")
            h = round(im.height * width / im.width)
            im.resize((width, h), Image.LANCZOS).save(out, "WEBP", quality=QUALITY, method=METHOD)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="report, do not write")
    parser.add_argument("--prune", action="store_true", help="delete orphaned variants")
    args = parser.parse_args()

    global CHECK_ONLY
    CHECK_ONLY = args.check

    manifest = {}
    made = skipped = 0

    for reldir, widths in TARGETS:
        for src in sorted(glob.glob(os.path.join(PUBLIC, reldir, "*.jpg"))):
            reldir_key = reldir.replace(os.sep, "/")
            key = f"{reldir_key}/{os.path.basename(src)}"
            available = variants_for(src, widths)
            if not available:
                continue
            for w in available:
                out = make(src, w)
                if args.check:
                    if not os.path.exists(out):
                        print(f"  MISSING  {os.path.relpath(out, PUBLIC)}")
                        skipped += 1
                else:
                    made += 1
            manifest[key] = available

    # Prune: any *-<digits>.webp with no manifest entry is stale.
    if args.prune:
        valid = {f"{os.path.splitext(k)[0]}-{w}.webp" for k, ws in manifest.items() for w in ws}
        removed = 0
        for reldir, _ in TARGETS:
            for f in glob.glob(os.path.join(PUBLIC, reldir, "*-*.webp")):
                name = f"{reldir.replace(os.sep, '/')}/{os.path.basename(f)}"
                stem, _, tail = os.path.basename(f).rpartition("-")
                if not tail.replace(".webp", "").isdigit():
                    continue
                if name not in valid:
                    print(f"  prune {name}")
                    if not args.check:
                        os.remove(f)
                    removed += 1
        print(f"pruned {removed}")

    if not args.check:
        write_manifest(manifest)

    print(f"{'would write' if args.check else 'wrote'} {made if not args.check else 0} variants "
          f"for {len(manifest)} source images"
          + (f", {skipped} missing" if args.check else ""))
    return 1 if (args.check and skipped) else 0


def write_manifest(manifest):
    lines = [
        "/* ==========================================================================",
        "   imageVariants",
        "   --------------------------------------------------------------------------",
        "   Generated by tools/make_variants.py — do not edit by hand.",
        "",
        "   A manifest of which WebP widths actually exist on disk for each original",
        "   image. Earlier the srcSet strings were built by guessing that every image",
        "   had a 400 and an 800 variant; two narrow hero images only went up to 400,",
        "   so their srcSet advertised files that did not exist and the card rendered",
        "   blank. Reading the real inventory removes that whole class of bug.",
        "   ========================================================================== */",
        "",
        "const VARIANTS = {",
    ]
    for key in sorted(manifest):
        lines.append(f"  '{key}': {json.dumps(manifest[key])},")
    lines += [
        "};",
        "",
        "/* All widths available for a path, or [] when there are none. */",
        "export function widthsFor(path) {",
        "  return VARIANTS[path] || [];",
        "}",
        "",
        "/* A ready-to-use srcSet string, or null when the path has no variants. */",
        "export function srcSetFor(path) {",
        "  const widths = VARIANTS[path];",
        "  if (!widths || !widths.length) return null;",
        "  const stem = path.replace(/\\.(jpe?g|png)$/i, '');",
        "  return widths.map((w) => `${stem}-${w}.webp ${w}w`).join(', ');",
        "}",
        "",
        "export default VARIANTS;",
    ]
    with open(MANIFEST, "w") as fh:
        fh.write("\n".join(lines) + "\n")


CHECK_ONLY = False

if __name__ == "__main__":
    sys.exit(main())
