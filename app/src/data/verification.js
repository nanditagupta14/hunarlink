/* The three steps of the Valley Verification Flow, lifted verbatim from the
   static build's VERIFICATION_STEPS table. */

export const VERIFICATION_STEPS = {
  1: {
    kicker: 'STEP 01 OF 03 \u2022 LOOM ORIGIN CHECK',
    heading: 'How We Verify the Artisan & Workshop',
    checks: [
      "Every craft is photographed and logged at the artisan's actual workshop in Srinagar, Budgam, or Anantnag.",
      "We verify the artisan's Government of J&K Handicrafts Registry ID and family guild lineage.",
      'Exact GPS coordinates and loom hours are recorded so middlemen cannot swap in factory copies.'
    ],
    proofTitle: 'Sample Origin Record',
    proofBadge: 'GPS VERIFIED',
    proof: [
      { label: 'Master Artisan', value: 'Ustad Ghulam Qadir Mir' },
      { label: 'Workshop Cluster', value: 'Kanihama, Budgam (J&K)' },
      { label: 'Guild Registry', value: 'JK-HANDLOOM #019' },
      { label: 'Crafting Time', value: '1,420 Hand-Loom Hours' }
    ]
  },
  2: {
    kicker: 'STEP 02 OF 03 \u2022 CERTIFIED LAB TESTING',
    heading: 'How We Test Fiber & Material Purity',
    checks: [
      'Microscopic fiber testing confirms authentic Ladakhi Changthangi Pashmina (under 16 microns \u2014 5x finer than human hair).',
      'AI macro weave inspection verifies hand-spun irregularity, real mulberry silk knot density, and seasoned walnut wood grain.',
      'Natural mineral and vegetable dyes are checked to ensure heirloom longevity and skin-safe comfort.'
    ],
    proofTitle: 'Sample Lab Purity Report',
    proofBadge: '99.4% PURE',
    proof: [
      { label: 'Fiber Diameter', value: '14.2 Microns (\u00b5m)' },
      { label: 'Weave Type', value: '100% Hand-Spun Kani' },
      { label: 'Synthetic Blends', value: '0.0% Detected (Pass)' },
      { label: 'Testing Authority', value: 'Pashmina Testing & Quality Lab' }
    ]
  },
  3: {
    kicker: 'STEP 03 OF 03 \u2022 LIFETIME BUYER PROTECTION',
    heading: 'How Your GI Tag & Digital Passport Work',
    checks: [
      'Once approved, a tamper-evident Government Geographical Indication (GI) laser seal is attached to the craft.',
      'Each seal links to a permanent Digital Craft Passport storing the artisan profile, origin map, and lab certificate.',
      'Simply scan the QR code or enter the GI ID anytime \u2014 even years later \u2014 to prove authenticity and heirloom value.'
    ],
    proofTitle: 'Sample Digital Passport',
    proofBadge: 'GI SEALED',
    proof: [
      { label: 'GI Certificate ID', value: 'GI-JK-PASH-8821' },
      { label: 'Seal Type', value: 'Tamper-Proof Laser QR' },
      { label: 'Registry Status', value: 'Active \u2022 Govt. GI #46' },
      { label: 'Buyer Guarantee', value: '100% Authenticity Refund' }
    ]
  }
};

/* Card copy for the three flow cards. Kept separate from the detail table
   above because the original had them inline in markup. */
export const VERIFICATION_CARDS = [
  {
    n: 1,
    icon: 'map-pin',
    title: 'Artisan Geo-Verification',
    body:
      'Each piece is logged right at the artisan\u2019s loom in Srinagar, Budgam, or Anantnag with verified GPS location and family workshop credentials.',
    benefit: 'Proves your craft was handmade in Kashmir',
    meterLabel: 'ARTISAN CLUSTER GPS',
    meterValue: 'SRINAGAR & BUDGAM \u2022 100%',
    meterPct: 100,
    meterGold: false
  },
  {
    n: 2,
    icon: 'scan',
    title: 'Material Purity Lab Review',
    body:
      'Certified fiber and weave testing confirms authentic sub-16-micron Changthangi Pashmina, pure mulberry silk knot density, and natural organic dyes.',
    benefit: 'Guarantees zero synthetic blends or machine fakes',
    meterLabel: 'SUB-16 MICRON (\u00b5m) PASHMINA',
    meterValue: '99.4% PURITY VERIFIED',
    meterPct: 99,
    meterGold: false
  },
  {
    n: 3,
    icon: 'shield',
    title: 'GI Tag & Laser Seal',
    body:
      'Approved crafts receive a tamper-proof Government GI laser tag and a scannable Digital Craft Passport so you can verify provenance anytime on your phone.',
    benefit: 'Instant phone scan confirms lifetime authenticity',
    meterLabel: 'GI REGISTRY CROSS-CHECK',
    meterValue: 'TAMPER-PROOF QR SEAL',
    meterPct: 100,
    meterGold: true
  }
];

export const VERIFY_SAMPLES = [
  { code: 'GI-JK-PASH-8821', label: 'GI-JK-PASH-8821 (Pashmina)' },
  { code: 'GI #JK-WNT-1180', label: 'GI #JK-WNT-1180 (Walnut)' },
  { code: 'GI-JK-PAPR-3109', label: 'GI-JK-PAPR-3109 (Papier-M\u00e2ch\u00e9)' }
];
