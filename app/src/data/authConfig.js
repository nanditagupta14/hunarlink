/* Copy for the three states of the auth page, lifted from AUTH_CONFIG in the
   static build. The headline carries inline markup in the original, so it is
   stored as segments rather than an HTML string. */

export const AUTH_CONFIG = {
  login_artisan: {
    headline: ['Your Craft.', 'Your Identity.', 'Your Marketplace.'],
    subtext:
      'Take your traditional craftsmanship beyond borders. Build your digital storefront, connect with buyers and grow your business.',
    cards: [
      { icon: '\u{1F3EA}', title: 'Create Your Store', desc: 'Showcase your craftsmanship' },
      { icon: '\u{1F4C8}', title: 'Grow Your Business', desc: 'Track orders and earnings' },
      { icon: '\u{1F6E1}\uFE0F', title: 'Verify Your Craft', desc: 'Get authenticity & GI recognition' },
      { icon: '\u{1F310}', title: 'Reach New Markets', desc: 'Connect with buyers worldwide' }
    ],
    title: 'Welcome, Artisan',
    subtitle: 'Access to your HunarLink Artisan Workspace',
    artisanPillText: 'Artisan Login',
    submitBtnText: 'Sign In to Workspace \u2192',
    footerText: 'New to HunarLink?',
    footerLinkText: 'Register as an Artisan',
    footerAction: 'register'
  },
  register_artisan: {
    headline: ['Join HunarLink', 'as an Artisan'],
    subtext:
      'List your crafts, obtain verified GI credentials, and connect directly with connoisseurs worldwide without middlemen.',
    cards: [
      { icon: '\u{1F3EA}', title: 'Create Your Store', desc: 'Showcase your craftsmanship' },
      { icon: '\u{1F4C8}', title: 'Grow Your Business', desc: 'Track orders and earnings' },
      { icon: '\u{1F6E1}\uFE0F', title: 'Verify Your Craft', desc: 'Get authenticity & GI recognition' },
      { icon: '\u{1F310}', title: 'Reach New Markets', desc: 'Connect with buyers worldwide' }
    ],
    title: 'Create Artisan Account',
    subtitle: 'List your crafts - Get verified - Reach new markets',
    artisanPillText: 'Artisan Register',
    submitBtnText: 'Create Artisan Account \u2192',
    footerText: 'Already have an account?',
    footerLinkText: 'Login',
    footerAction: 'login'
  },
  forgot: {
    headline: ['Reset Your', 'Password'],
    subtext:
      "Don't worry, it happens to everyone. Enter your registered email and we'll send you a secure link to reset your password",
    cards: [
      { icon: '\u{1F6E1}\uFE0F', title: 'Secure & Private', desc: 'Your data is always protected' },
      { icon: '\u2709\uFE0F', title: 'Quick Recovery', desc: 'Get a reset link in seconds' },
      { icon: '\u{1F512}', title: 'Account Safety', desc: 'Regain access securely' }
    ],
    title: 'Forgot Password?',
    subtitle: 'No worries. Let\u2019s get you back to HunarLink.',
    submitBtnText: 'Send reset link \u2192',
    footerText: 'Remembered your password?',
    footerLinkText: 'Login Now',
    footerAction: 'login'
  }
};

/* The two one-tap demo artisans the evaluator pills sign in as. */
export const DEMO_ARTISANS = {
  artisan_mir: {
    name: 'Master Ghulam Qadir Mir',
    email: 'ghulam.mir@zadibalpashmina.com',
    phone: '+91 94190 88210',
    business: 'Mir Heritage Loom Guild',
    craft: 'pashmina',
    district: 'Srinagar',
    giId: 'GI-JK-PASH-8821',
    badge: 'GM',
    title: 'Master Artisan \u2022 Srinagar Pashmina Guild'
  },
  artisan_wani: {
    name: 'Fayaz Ahmad Wani',
    email: 'fayaz.wani@anantnagcrafts.org',
    phone: '+91 94190 55218',
    business: 'Wani Woodcraft Atelier',
    craft: 'walnut',
    district: 'Anantnag',
    giId: 'GI #JK-WNT-1180',
    badge: 'FA',
    title: 'Master Artisan \u2022 Anantnag Walnut Guild'
  }
};
