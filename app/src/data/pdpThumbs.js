/* Gallery construction for the product page, ported from renderPdpThumbnails()
   in the static build. The rules matter: never repeat the hero shot in the
   strip, never reuse a tile twice, and always end on the GI certificate. */

const CERT = 'assets/products/thumb_cert.jpg';

export function buildThumbnails(product, catalogue) {
  const { id, guild, technique, image } = product;
  /* Prefer siblings made with the same technique, so a Kani shawl's strip does
     not fill up with Sozni embroidery. Fall back to the wider guild when there
     are too few technique siblings to fill the strip. */
  const siblings = (sameTechnique) =>
    catalogue
      .filter(
        (x) =>
          x.guild === guild &&
          x.id !== id &&
          x.image !== image &&
          (!sameTechnique || x.technique === technique)
      )
      .map((x) => x.image);
  const pool = (exclude) => {
    const tight = siblings(true);
    return tight.length >= 2 ? tight : siblings(false);
  };

  if (id === 'hl-waln-001') {
    return [
      { label: 'Editorial View', img: 'assets/products/walnut_01.jpg' },
      { label: 'Carving Detail', img: 'assets/products/thumb_detail.jpg' },
      { label: 'Workshop', img: 'assets/products/thumb_workshop.jpg' },
      { label: 'Artisan', img: 'assets/products/thumb_artisan.jpg' },
      { label: 'Certificate', img: CERT }
    ];
  }

  if (guild === 'pashmina') {
    /* The detail shot depends on HOW the shawl was made. Kani is a tapestry
       weave, Sozni is needle embroidery, and a plain handwoven shawl is neither
       — using the Kani border shot on a plain weave is a small lie a textile
       judge would spot instantly. */
    const detail =
      technique === 'kani'
        ? { label: 'Kani Weave Detail', img: 'assets/products/kani_03.jpg' }
        : technique === 'sozni'
        ? { label: 'Sozni Stitch Detail', img: 'assets/products/sozni_01.jpg' }
        : { label: 'Weave Detail', img: 'assets/products/pashmina_detail.jpg' };

    const spread = pool(id).slice(0, 2);
    return [
      { label: 'Draped Look', img: image },
      detail,
      ...spread.map((img, i) => ({
        label: i === 0 ? 'Full Styling' : 'Border Detail',
        img
      })),
      { label: 'GI Certificate', img: CERT }
    ];
  }

  if (guild === 'papier-mache') {
    /* Pull from the piece's own guild so twenty listings do not show the same
       four vessels. */
    const picked = [];
    for (const cand of catalogue) {
      if (picked.length >= 3) break;
      if (cand.guild !== guild || cand.id === id) continue;
      if (cand.image === image || picked.includes(cand.image)) continue;
      picked.push(cand.image);
    }
    return [
      { label: 'Craft View', img: image },
      { label: 'Guild Study I', img: picked[0] || image },
      { label: 'Guild Study II', img: picked[1] || image },
      { label: 'Gold Leaf Art', img: picked[2] || 'assets/products/papier_05.jpg' },
      { label: 'GI Certificate', img: CERT }
    ];
  }

  /* Fallback: borrow from the same guild rather than repeating the hero image
     in two of five tiles, which read as a rendering fault. */
  const p = pool(id);
  const walnut = guild === 'walnut';
  return [
    { label: walnut ? 'Editorial View' : 'Full View', img: image },
    {
      label: walnut ? 'Carving Detail' : guild === 'silk-rugs' ? 'Knot Detail' : 'Craft Detail',
      img: p[0] || image
    },
    { label: 'Styling View', img: p[1] || 'assets/image_1.jpg' },
    { label: 'Heritage Look', img: p[2] || 'assets/image_6.jpg' },
    { label: 'GI Certificate', img: CERT }
  ];
}

/* Technique and specification strings, likewise lifted from initPDP(). */
export function techniqueTag(guild, technique) {
  if (guild === 'walnut') return 'HAND-CARVED';
  if (guild === 'silk-rugs') return 'HAND-KNOTTED';
  if (guild === 'papier-mache') return 'NAQASH-LACQUERED';
  /* A pashmina product is one of three things, and the badge should say which.
     Labelling a Kani tapestry "HAND-WOVEN" is technically true and useless. */
  if (technique === 'kani') return 'KANI TAPESTRY WEAVE';
  if (technique === 'sozni') return 'SOZNI NEEDLE EMBROIDERY';
  if (guild === 'pashmina' && technique === 'handwoven') return 'HAND-WOVEN PASHMINA';
  return 'HAND-WOVEN';
}

export function techniqueSpec(guild, purityMetric, technique) {
  if (guild === 'walnut') return 'Deep Relief & Openwork Jali / Pinjrakari';
  if (technique === 'kani') return 'Twilled Tapestry Weave, 1,200 Shuttle Hours or Longer';
  if (technique === 'sozni') return 'Fine Needle Embroidery in Silk Thread on Hand-Spun Base';
  if (guild === 'pashmina') return '100% Hand-Spun Loom Weave';
  return purityMetric;
}
