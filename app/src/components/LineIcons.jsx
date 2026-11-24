/* ==========================================================================
   LineIcons — the small set of single-stroke icons the account pages need.
   --------------------------------------------------------------------------
   These replace emoji, which was the main reason the sign-in page read as
   machine-assembled: a coloured emoji cannot inherit the type colour, sits on
   a different baseline in every browser, and clashes with a serif wordmark.

   Rules: 24x24 viewBox, no fill, stroke follows `currentColor`, stroke-width
   1.7 so they sit at the same optical weight as 13px Jakarta Sans labels.
   Callers set size with `width`/`height`; colour comes from CSS.
   ========================================================================== */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false'
};

const Svg = ({ size = 16, children, ...rest }) => (
  <svg {...base} width={size} height={size} {...rest}>
    {children}
  </svg>
);

/* ---- people ---- */
export const IconUser = (p) => (
  <Svg {...p}>
    <path d="M20 21v-1.6A4.4 4.4 0 0 0 15.6 15H8.4A4.4 4.4 0 0 0 4 19.4V21" />
    <circle cx="12" cy="7.5" r="3.7" />
  </Svg>
);

/* a four-point craft star: the artisan mark, drawn rather than emoji */
export const IconSpark = (p) => (
  <Svg {...p}>
    <path d="M12 3.2l1.9 5.1a3 3 0 0 0 1.8 1.8l5.1 1.9-5.1 1.9a3 3 0 0 0-1.8 1.8L12 20.8l-1.9-5.1a3 3 0 0 0-1.8-1.8L3.2 12l5.1-1.9a3 3 0 0 0 1.8-1.8z" />
  </Svg>
);

export const IconLogin = (p) => (
  <Svg {...p}>
    <path d="M14.5 3.5h3.2A2.3 2.3 0 0 1 20 5.8v12.4a2.3 2.3 0 0 1-2.3 2.3h-3.2" />
    <path d="M9.5 16.5 14 12 9.5 7.5M14 12H3.5" />
  </Svg>
);

export const IconUserPlus = (p) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8" r="3.6" />
    <path d="M2.8 20.5v-1.4A4.2 4.2 0 0 1 7 14.9h5a4.2 4.2 0 0 1 4.2 4.2v1.4" />
    <path d="M19 7.2v5M21.5 9.7h-5" />
  </Svg>
);

/* ---- the two verification marks ---- */
export const IconHandshake = (p) => (
  <Svg {...p}>
    <path d="m10.2 12.6 1.7 1.7a1.6 1.6 0 0 0 2.3-2.3l-3-3a2.4 2.4 0 0 0-3.4 0L6 10.8" />
    <path d="M2.5 9.5 6 6h4l2.2 2.2M21.5 9.5 18 6h-2.5" />
    <path d="m13.9 15.9 1.4 1.4M12.2 17.6l1.4 1.4" />
  </Svg>
);

export const IconBadgeCheck = (p) => (
  <Svg {...p}>
    <path d="M12 2.8l2.4 1.7 2.9-.3 1.2 2.7 2.5 1.5-1 2.8 1 2.8-2.5 1.5-1.2 2.7-2.9-.3L12 21.2l-2.4-1.7-2.9.3-1.2-2.7-2.5-1.5 1-2.8-1-2.8 2.5-1.5 1.2-2.7 2.9.3z" />
    <path d="m8.9 12.2 2 2 4.2-4.4" />
  </Svg>
);

export const IconSeedling = (p) => (
  <Svg {...p}>
    <path d="M12 21v-7.5" />
    <path d="M12 13.5C12 10 9.4 7.6 5.5 7.6c0 3.6 2.6 5.9 6.5 5.9z" />
    <path d="M12 13.5c0-3 2.2-5.2 5.6-5.2 0 3.1-2.2 5.2-5.6 5.2z" />
  </Svg>
);

/* ---- perk rail ---- */
export const IconTruck = (p) => (
  <Svg {...p}>
    <path d="M2.5 6.5h10.2v9.8H2.5zM12.7 10h4l3 3.2v3.1h-7z" />
    <circle cx="6.4" cy="18.4" r="1.7" />
    <circle cx="16.6" cy="18.4" r="1.7" />
  </Svg>
);

export const IconShield = (p) => (
  <Svg {...p}>
    <path d="M12 3.2 4.6 6v5.6c0 4.3 3 7.5 7.4 9.2 4.4-1.7 7.4-4.9 7.4-9.2V6z" />
    <path d="m9 11.9 2.1 2.1 4-4.1" />
  </Svg>
);

export const IconBookmark = (p) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-6-4.2-6 4.2z" />
  </Svg>
);

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path d="M4.5 12h14.2M13 6.2l5.7 5.8-5.7 5.8" />
  </Svg>
);

export const IconCheck = ({ size = 11, ...p }) => (
  <svg {...base} width={size} height={size} strokeWidth={2.8} {...p}>
    <path d="m4.5 12.5 5 5 10-10" />
  </svg>
);

export const IconX = ({ size = 11, ...p }) => (
  <svg {...base} width={size} height={size} strokeWidth={2.6} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/* ==========================================================================
   Navigation and console icons
   --------------------------------------------------------------------------
   Added when the portal chrome still used emoji as interface icons. These
   stay single-stroke on the same 24x24 grid so a sidebar of them reads as one
   set rather than a row of borrowed stickers.
   ========================================================================== */

/* ---- navigation ---- */
export const IconHome = (p) => (
  <Svg {...p}>
    <path d="M3.5 10.4 12 3.8l8.5 6.6" />
    <path d="M5.6 9.4V20h12.8V9.4" />
    <path d="M10 20v-5.2h4V20" />
  </Svg>
);

export const IconPackage = (p) => (
  <Svg {...p}>
    <path d="M20.5 7.6 12 3.2 3.5 7.6v8.8l8.5 4.4 8.5-4.4V7.6Z" />
    <path d="M3.5 7.6 12 12l8.5-4.4" />
    <path d="M12 12v8.8" />
  </Svg>
);

export const IconLogout = (p) => (
  <Svg {...p}>
    <path d="M14.5 20.2H6.2A1.7 1.7 0 0 1 4.5 18.5V5.5a1.7 1.7 0 0 1 1.7-1.7h8.3" />
    <path d="M16.4 16.1 20.5 12l-4.1-4.1" />
    <path d="M20.5 12H9.6" />
  </Svg>
);

/* ---- console ---- */
export const IconGrid = (p) => (
  <Svg {...p}>
    <rect x="3.6" y="3.6" width="7" height="7" rx="1.4" />
    <rect x="13.4" y="3.6" width="7" height="7" rx="1.4" />
    <rect x="3.6" y="13.4" width="7" height="7" rx="1.4" />
    <rect x="13.4" y="13.4" width="7" height="7" rx="1.4" />
  </Svg>
);

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9.4" cy="8.4" r="3.2" />
    <path d="M3.6 20v-1.3a4.6 4.6 0 0 1 4.6-4.6h2.4a4.6 4.6 0 0 1 4.6 4.6V20" />
    <path d="M16.2 5.6a3.2 3.2 0 0 1 0 5.9" />
    <path d="M17.6 14.4a4.4 4.4 0 0 1 2.8 4.1V20" />
  </Svg>
);

export const IconPalette = (p) => (
  <Svg {...p}>
    <path d="M12 20.4a8.4 8.4 0 1 1 8.4-8.4c0 1.9-1.3 2.9-2.9 2.9h-1.6a1.9 1.9 0 0 0-1.4 3.2 1.6 1.6 0 0 1-1.2 2.7Z" />
    <circle cx="8.2" cy="9.6" r="1" />
    <circle cx="12" cy="7.4" r="1" />
    <circle cx="15.6" cy="9.6" r="1" />
  </Svg>
);

export const IconSearchScan = (p) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.4" />
    <path d="M15.6 15.6 20.4 20.4" />
  </Svg>
);

export const IconMapPin = (p) => (
  <Svg {...p}>
    <path d="M12 21s6.4-5.6 6.4-10.4A6.4 6.4 0 0 0 5.6 10.6C5.6 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.4" r="2.4" />
  </Svg>
);

export const IconReceipt = (p) => (
  <Svg {...p}>
    <path d="M6.2 3.6h11.6v16.8l-2.9-1.7-2.9 1.7-2.9-1.7-2.9 1.7Z" />
    <path d="M9 8.4h6" />
    <path d="M9 12.2h6" />
  </Svg>
);

export const IconTag = (p) => (
  <Svg {...p}>
    <path d="M11.4 3.6H20.4v9l-8.9 8.9a1.6 1.6 0 0 1-2.3 0L3.5 15.8a1.6 1.6 0 0 1 0-2.3Z" />
    <circle cx="16.2" cy="7.8" r="1.3" />
  </Svg>
);

export const IconCamera = (p) => (
  <Svg {...p}>
    <path d="M3.6 8.6A1.9 1.9 0 0 1 5.5 6.7h2.2l1.3-2h6l1.3 2h2.2a1.9 1.9 0 0 1 1.9 1.9v8.6a1.9 1.9 0 0 1-1.9 1.9H5.5a1.9 1.9 0 0 1-1.9-1.9Z" />
    <circle cx="12" cy="12.9" r="3.3" />
  </Svg>
);

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M12 4.2 21 19.8H3Z" />
    <path d="M12 9.6v4.2" />
    <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconInfo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11v5.2" />
    <circle cx="12" cy="8.1" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconUpload = (p) => (
  <Svg {...p}>
    <path d="M12 15.8V4.6" />
    <path d="M8 8.6 12 4.6l4 4" />
    <path d="M4.6 15.4v2.6a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8v-2.6" />
  </Svg>
);

export const IconHammer = (p) => (
  <Svg {...p}>
    <path d="M14.4 4.6l5 5-2.1 2.1-5-5Z" />
    <path d="M12.3 6.7 4.2 14.8a1.7 1.7 0 0 0 0 2.4l2.6 2.6a1.7 1.7 0 0 0 2.4 0l8.1-8.1" />
  </Svg>
);

/* ---- console, second batch ---- */
export const IconFile = (p) => (
  <Svg {...p}>
    <path d="M13.4 3.6H6.8A1.8 1.8 0 0 0 5 5.4v13.2a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8V9Z" />
    <path d="M13.4 3.6V9h5.6" />
  </Svg>
);

export const IconBuilding = (p) => (
  <Svg {...p}>
    <path d="M4.4 20.4V5.2a1.6 1.6 0 0 1 1.6-1.6h6.4a1.6 1.6 0 0 1 1.6 1.6v15.2" />
    <path d="M14 20.4V10h4a1.6 1.6 0 0 1 1.6 1.6v8.8" />
    <path d="M3 20.4h18" />
    <path d="M7.4 7.6h3.2M7.4 11.2h3.2M7.4 14.8h3.2" />
  </Svg>
);

export const IconLog = (p) => (
  <Svg {...p}>
    <path d="M5 4.4h14v15.2H5Z" />
    <path d="M8.2 8.4h7.6M8.2 12h7.6M8.2 15.6h4.4" />
  </Svg>
);

export const IconGear = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.2 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a1.9 1.9 0 1 1-3.8 0v-.2a1.6 1.6 0 0 0-2.7-1.2l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a1.9 1.9 0 1 1 0-3.8h.2a1.6 1.6 0 0 0 1.2-2.7l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a1.9 1.9 0 1 1 3.8 0v.2a1.6 1.6 0 0 0 2.7 1.2l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a1.9 1.9 0 1 1 0 3.8h-.2a1.6 1.6 0 0 0-1.4 1Z" />
  </Svg>
);

/* ---- toasts ---- */
export const IconCheckCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M8.3 12.2 11 14.9l4.8-5.2" />
  </Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5.2v13.6M5.2 12h13.6" />
  </Svg>
);

export const IconChat = (p) => (
  <Svg {...p}>
    <path d="M20.4 12.4a7.6 7.6 0 0 1-7.6 7.6H8.2L4.2 22v-4.4a7.6 7.6 0 0 1-1-3.8v-.4A7.6 7.6 0 0 1 10.8 5.8h2a7.6 7.6 0 0 1 7.6 7.6Z" />
  </Svg>
);

export const IconHeart = (p) => (
  <Svg {...p}>
    <path d="M12 20.2s-7.6-4.6-7.6-9.6a4.2 4.2 0 0 1 7.6-2.4 4.2 4.2 0 0 1 7.6 2.4c0 5-7.6 9.6-7.6 9.6Z" />
  </Svg>
);
