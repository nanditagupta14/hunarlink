import React, { useEffect } from 'react';
import { asset } from '../utils/legacy.js';

/* ==========================================================================
   ChatWidget — HunarSathi
   --------------------------------------------------------------------------
   This one is deliberately a small island: the widget script builds its own
   launcher and panel under a fixed root and never touches anything the React
   tree owns. That is a different proposition from the previous attempt, where
   the legacy code rewrote nodes React had already rendered.

   The script guards itself with an element probe, so StrictMode's double
   effect cannot mount it twice.
   ========================================================================== */

const SCRIPT_ID = 'hunarsathi-widget-script';

export default function ChatWidget() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = asset('hunarsathi-chatbot/widget.js');
    s.defer = true;
    document.body.appendChild(s);
  }, []);

  return null;
}
