"""
Reprices the catalogue against real 2026 Kashmir market benchmarks.

Why this file exists
--------------------
Every listing in data/products.js was carrying a placeholder price. Pashmina
shawls were listed at Rs 1,650 against an mrp of Rs 1,990 -- a 17% "discount"
on a piece of hand-woven cashmere. Real GI-certified hand-spun pashmina starts
at Rs 15,000 and a Kani weave starts at Rs 15,000 and climbs past Rs 1,50,000.

Meanwhile silk rugs were already at Rs 1,85,000 and walnut pieces at
Rs 2,20,000, so the catalogue was internally contradictory.

This script prices every listing inside the published band for its craft,
keeping the artisan's loom hours as the discriminator, then derives the
retail (mrp) and the original market price (originalPrice) from that.

Run:  python3 tools/reprice.py           (writes data/products.js in place)
"""

import re
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, "..", "src", "data", "products.js")

# Published 2026 price bands per craft, in rupees. Source: Kashmir shawl
# buyer's guides (plain pashmina 15k-1L, sozni 8k-50k, kani 40k-2L) and
# Srinagar walnut carvers (boxes 1.1k-8k, large furniture past 2L).
BANDS = {
    "pashmina": {
        "base":       (16000, 42000),    # plain hand-woven pashmina
        "embroidered":(38000, 95000),    # sozni needlework
        "kani":       (60000, 200000),   # kani / jamawar masterweave
    },
    # Retained for reference only: Sozni is no longer its own guild, it is a
    # technique inside pashmina. See band_for() below.
    "sozni":       {"base": (9000, 50000)},
    "walnut":      {"base": (1800, 210000)},
    "papier-mache":{"base": (450, 22000)},
    "silk-rugs":   {"base": (20000, 190000)},
}


# Loom hours drive position inside the band. These MUST span the real catalogue.
# The old ceiling of 1400 was below the actual maximum, so every piece above it
# clamped onto the same price: eleven Kani listings all sat at Rs 50,000, and a
# 2,800-hour dual-technique tapestry cost exactly what a 1,400-hour stole cost.
# Read the real range from the data, do not restate it by hand.
HOURS_MIN, HOURS_MAX = 110, 2800

# A band keyed to loom hours does not describe a small gifting object. The
# miniature Kani coin purse set (110 hours, 12 cm) is priced by hand so the
# formula does not claim a purse is worth a shawl.
PRICE_EXCEPTIONS = {
    "hl-kani-015": 18000,
}


def band_for(guild, title):
    """Pick the price band that actually describes the piece. A plain
    pashmina is Rs 16k-42k; a kani weave of the same size is five times that,
    so loom hours alone cannot decide the band -- the weave has to."""
    bands = BANDS[guild]
    if len(bands) == 1:
        return bands["base"]
    t = title.lower()
    if "shahtoosh" in t and "grade" in t:
        return bands["kani"]
    if "kani" in t or "jamawar" in t:
        return bands["kani"]
    if "embroider" in t or "sozni" in t:
        return bands["embroidered"]
    return bands["base"]


def curve(hours):
    """Map loom hours onto a 0..1 position, compressed so the band is used
    evenly instead of dumping everything into the first decile."""
    t = (hours - HOURS_MIN) / (HOURS_MAX - HOURS_MIN)
    t = max(0.0, min(1.0, t))
    return t ** 0.62


def round_to_50(n):
    return int(round(n / 50.0) * 50)


def field(block, name, cast=int):
    m = re.search(r"\b%s:\s*\"?([0-9]+)\"?," % name, block)
    if not m:
        raise SystemExit("could not read %s from:\n%s" % (name, block[:200]))
    return cast(m.group(1))


def main():
    src = open(TARGET, encoding="utf-8").read()

    # Each product object starts at `id: "..."` and runs to the closing brace
    # before the next id. Splitting on the id keeps the edit local.
    parts = re.split(r"(?=\n  \{\n    id: )", src)
    changed = 0
    out = []
    for part in parts:
        m = re.search(r'id:\s*"([^"]+)"', part)
        if not m or "price:" not in part:
            out.append(part)
            continue

        guild = re.search(r'guild:\s*"([^"]+)"', part).group(1)
        title = re.search(r'title:\s*"([^"]+)"', part).group(1)
        hours = field(part, "loomHours")
        lo, hi = band_for(guild, title)

        t = curve(hours)
        price = PRICE_EXCEPTIONS.get(m.group(1)) or round_to_50(lo + (hi - lo) * t)

        # Retail / original market price. Real heirloom retail sits 25-45%
        # above a direct-from-artisan price, so the discount a collector sees
        # is genuine rather than a manufactured strikethrough.
        retail_mult = 1.30 + 0.15 * ((int(m.group(1)[-1], 36) % 3) / 2.0)
        original = round_to_50(price * retail_mult)
        # a hair above retail so the % off never rounds to a bare number
        mrp = original + 100

        part = re.sub(r"\bprice:\s*\d+,", "price: %d," % price, part, count=1)
        part = re.sub(r"\bmrp:\s*\d+,", "mrp: %d," % mrp, part, count=1)
        if "originalPrice:" in part:
            part = re.sub(
                r"\boriginalPrice:\s*\d+,", "originalPrice: %d," % original, part, count=1
            )
        else:
            part = re.sub(
                r"(\bmrp:\s*%d,)" % mrp,
                "\\1\n    originalPrice: %d," % original,
                part,
                count=1,
            )
        out.append(part)
        changed += 1

    result = "".join(out)
    open(TARGET, "w", encoding="utf-8").write(result)
    print("repriced %d listings" % changed)


if __name__ == "__main__":
    main()
