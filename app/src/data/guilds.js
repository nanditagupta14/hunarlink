/* The five heritage craft clusters shown on the storefront, and the filters
   used by the marketplace. Copy is lifted from the static guild bento grid;
   the trailing "Discover Looms →" in the rug card was part of the original
   description text, so it is kept. */

/* ==========================================================================
   The guild taxonomy
   --------------------------------------------------------------------------
   A guild is a *craft family*: one material, one workshop tradition. Before
   this file was rewritten the storefront had five "guilds", two of which were
   not guilds at all — "Kani Jamawar & Sozni" filed a weave and an embroidery
   technique as if they were separate product families, alongside a pashmina
   guild whose own name also said "Kani". A visitor could pick "Kani" from the
   filter list and get zero results, because no product was ever filed under it.

   The fix is one axis, not two:

     guild      the family a piece belongs to  (pashmina, walnut, …)
     technique  how a pashmina piece was made  (handwoven, kani, sozni)

   Kani and Sozni are techniques applied to a pashmina base, so they now live
   inside the pashmina guild as a second filter. Walnut, papier-mâché and silk
   rugs are material-defined and carry no technique.
   ========================================================================== */

export const GUILDS = [
  {
    id: 'pashmina',
    label: 'Pashmina Textiles',
    short: 'Pashmina',
    blurb: 'Hand-spun Ladakhi Changthangi fleece on wooden pit looms.',
    story:
      'Changthangi fleece from the high pastures of Ladakh, hand-spun on a wooden charkha '
        + 'and woven on a Srinagar pit loom. Whether the cloth stays bare or takes Kani or '
        + 'Sozni work, the micron count of the yarn decides everything that follows.',
    techniques: ['handwoven', 'kani', 'sozni']
  },
  {
    id: 'walnut',
    label: 'Walnut Woodcarving',
    short: 'Walnut Wood',
    blurb: 'Seasoned walnut timber, hand-chiselled Chinar and Pinjrakari relief.',
    story:
      'Juglans regia timber seasoned for years before it is touched, then carved by hand '
        + 'into deep Chinar relief or pierced with Pinjrakari jali. No lathe, no stencil and '
        + 'no power tool — a chisel, a mallet and a family workshop.',
    techniques: [],
    techniques: []
  },
  {
    id: 'papier-mache',
    label: 'Papier-M\u00e2ch\u00e9 Art',
    short: 'Papier-M\u00e2ch\u00e9',
    blurb: 'Sakhta pulp vessels illuminated with Hazara and Guldan naqashi.',
    story:
      'Sakhta paper pulp pressed into vessels by hand, lacquered, then lit up with naqashi '
        + 'miniature painting in real gold and stone colour. The Hazara and Guldan patterns '
        + 'carry Persian lineage into a Kashmiri hand.',
    techniques: []
  },
  {
    id: 'silk-rugs',
    label: 'Silk-on-Silk Rugs',
    short: 'Silk Rugs',
    blurb: 'Hand-knotted mulberry silk carpets from Srinagar and Budgam.',
    story:
      'Mulberry silk on a cotton warp, knotted by hand at up to a thousand knots to the '
        + 'square inch. A single carpet can hold a family at the loom for eighteen months, '
        + 'and the back of it should read as cleanly as the front.',
    techniques: []
  }
];

/* The techniques that can appear inside the pashmina guild. Kept separate from
   GUILDS because they are not filterable on their own — a technique filter
   only makes sense once a guild is chosen, otherwise it mixes a Kani shawl
   with a walnut box that has no weave at all. */
export const TECHNIQUES = [
  {
    id: 'handwoven',
    label: 'Handwoven',
    blurb: 'Plain hand-loomed pashmina, no figuring.',
    story:
      'Woven plain on a pit loom with no embroidery and no tapestry inlay. The weave itself '
        + 'is the ornament, which is why the cloth — not the motif — has to be perfect.',
  },
  {
    id: 'kani',
    label: 'Kani',
    blurb: 'Wooden-bobbin tapestry weave worked from Talim code. The slowest, and the Kani name.',
    story:
      'Thousands of small wooden bobbins, each carrying one colour, woven in twill tapestry '
        + 'from a Talim code read aloud by a naqash. Two weavers can sit at one shawl for a '
        + 'year. The pattern is not printed or embroidered on — it is the cloth itself.',
  },
  {
    id: 'sozni',
    label: 'Sozni',
    blurb: 'Fine single-needle embroidery, mirrored front and reverse.',
    story:
      'Fine single-needle embroidery worked in silk thread on a hand-spun base, dense enough '
        + 'that a single shawl can take years. Done properly it is mirrored on the reverse, '
        + 'which is the test most machine work fails.',
  }
];

/* Filter chips for the marketplace toolbar. `id` matches a guild above. */
export const CRAFT_FILTERS = GUILDS.map((g) => ({ id: g.id, label: g.short }));

/* Sort options. */
export const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top Rated' },
  { id: 'loom', label: 'Loom Hours' }
];

/* Price bands. */
export const PRICE_BANDS = [
  { id: 'all', label: 'Any Price', min: 0, max: Infinity },
  { id: 'u5', label: 'Under \u20b95,000', min: 0, max: 5000 },
  { id: '5-15', label: '\u20b95,000 \u2013 \u20b915,000', min: 5000, max: 15000 },
  { id: '15-50', label: '\u20b915,000 \u2013 \u20b950,000', min: 15000, max: 50000 },
  { id: '50p', label: '\u20b950,000 +', min: 50000, max: Infinity }
];

/* Look-ups used by the product page and the crumbs. */
export const guildById = (id) => GUILDS.find((g) => g.id === id) || null;
export const techniqueById = (id) => TECHNIQUES.find((t) => t.id === id) || null;

/* The label printed on a product card and crumb. Falls back to the family name
   if a record is missing its technique, so a partial record cannot crash a
   render. */
export const CRAFT_ORDER = ['pashmina', 'walnut', 'papier-mache', 'silk-rugs'];

export function describeCraft(guildId, techniqueId) {
  const guild = guildById(guildId);
  const tech = techniqueById(techniqueId);
  if (!guild) return 'Valley Craft';
  if (!tech) return guild.label;
  return `${guild.label.replace(/ (Shawls|Textiles)$/, '')} \u00b7 ${tech.label}`;
}
