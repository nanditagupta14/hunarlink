/* ==========================================================================
   Artisan showcase data
   --------------------------------------------------------------------------
   Six real artisans from the catalogue. Everything except the portrait and
   the review quotes is derived from data/products.js at runtime, so the
   "top sold product" on a card can never drift out of sync with the listing
   it links to: change a price in the catalogue and the showcase follows.

   What lives here is only what the catalogue cannot know: which portrait
   belongs to whom, the guild credential, and a couple of buyer reviews.
   ========================================================================== */

export const ARTISAN_SHOWCASE = [
  {
    name: 'Ustad Nazir Ahmad Bhat',
    portrait: 'img/artisans/artisan-01.jpg',
    craft: 'Kani & Jamawar Weaving',
    guild: 'pashmina',
    credential: 'GI Registry #46 \u00b7 Third-generation pit-loom master',
    since: 1979,
    bio:
      'Learned the kani bobbin from his father at fourteen. Still weaves on the same deodar pit-loom, at roughly one inch a day.',
    reviews: [
      {
        author: 'Ananya R.',
        city: 'Bengaluru',
        stars: 5,
        text:
          'The weave is so tight the pattern reads on the reverse. Four months of waiting and worth every week of it.'
      },
      {
        author: 'Devika M.',
        city: 'Mumbai',
        stars: 5,
        text:
          'Came with the GI certificate and the loom hours written by hand. My mother has not taken it off since.'
      }
    ]
  },
  {
    name: 'Ustadani Ruksana Naqshbandi',
    portrait: 'img/artisans/artisan-02.jpg',
    craft: 'Sozni Needlework',
    guild: 'pashmina',
    credential: 'GI Registry #51 \u00b7 Sozni needlework, Zadibal',
    since: 1998,
    bio:
      'One needle, one thread, no frame. Ruksana works the border of a single shawl for six months without a printed guide.',
    reviews: [
      {
        author: 'Priya S.',
        city: 'New Delhi',
        stars: 5,
        text:
          'You can feel the stitch density change where the light hits the motif. No machine produces that.'
      },
      {
        author: 'Harleen K.',
        city: 'Chandigarh',
        stars: 5,
        text:
          'Ordered a plain wrap and came back for the embroidered one a month later. The difference is not subtle.'
      }
    ]
  },
  {
    name: 'Ustad Bashir Tarkhan',
    portrait: 'img/artisans/artisan-03.jpg',
    craft: 'Walnut Woodcarving',
    guild: 'walnut',
    credential: 'GI Registered Craft \u00b7 Anantnag tarkhan lineage',
    since: 1985,
    bio:
      'Carves only seasoned root walnut, cut from trees felled at 5,500 feet. Chinar leaf and pinjrakari lattice, chisel only.',
    reviews: [
      {
        author: 'Rohit V.',
        city: 'Pune',
        stars: 5,
        text:
          'The lattice undercut is a single piece of wood. I have had three people refuse to believe it is not joined.'
      },
      {
        author: 'Sunanda P.',
        city: 'Hyderabad',
        stars: 4,
        text:
          'Heavy, dense, and the grain smells of walnut when the room warms up. Shipped in a wooden crate.'
      }
    ]
  },
  {
    name: 'Master Ali Mohammad',
    portrait: 'img/artisans/artisan-04.jpg',
    craft: 'Papier-M\u00e2ch\u00e9 Naqash',
    guild: 'papier-mache',
    credential: '24K gold leaf \u00b7 Hazara floral school',
    since: 2004,
    bio:
      'Paints with a brush of three squirrel hairs. A single Guldan vessel carries roughly eleven thousand individual strokes.',
    reviews: [
      {
        author: 'Meera J.',
        city: 'Ahmedabad',
        stars: 5,
        text:
          'The gold leaf catches light across the room. It is a small piece that behaves like a large one.'
      },
      {
        author: 'Thomas L.',
        city: 'London',
        stars: 5,
        text:
          'Arrived intact to the UK, wrapped in three layers. The floral work is finer than the photos suggest.'
      }
    ]
  },
  {
    name: 'Ustadani Ruksana Rashid',
    portrait: 'img/artisans/artisan-05.jpg',
    craft: 'Silk-on-Silk Carpets',
    guild: 'silk-rugs',
    credential: 'Up to 900 knots / sq.in \u00b7 Budgam loom',
    since: 2001,
    bio:
      'Ties up to nine hundred knots to the square inch. A six-foot carpet leaves her loom after two full years.',
    reviews: [
      {
        author: 'Karan B.',
        city: 'Gurugram',
        stars: 5,
        text:
          'The medallion shifts colour as you walk past it. Two years of someone\u2019s life is in this rug.'
      },
      {
        author: 'Iffat S.',
        city: 'Srinagar',
        stars: 5,
        text:
          'Bought locally after seeing the loom myself. The reverse is as clean as the front.'
      }
    ]
  },
  {
    name: 'Master Ghulam Qadir Mir',
    portrait: 'img/artisans/artisan-06.jpg',
    craft: 'Khudrang Pashmina',
    guild: 'pashmina',
    credential: '14.2 micron Changthangi \u00b7 45 years at the loom',
    since: 1978,
    bio:
      'Works only unbleached natural Khudrang fleece, spun by hand in Ladakh and woven without a single dye bath.',
    reviews: [
      {
        author: 'Aditi N.',
        city: 'Kolkata',
        stars: 5,
        text:
          'Passes through my ring, and warm enough that I stopped carrying a coat. The natural shade is the point.'
      },
      {
        author: 'Faisal A.',
        city: 'Dubai',
        stars: 5,
        text:
          'Third purchase from this workshop. The weight and the handle are consistent every time.'
      }
    ]
  }
];
