import React, { useEffect } from 'react';
import { useStore } from '../state/StoreContext.jsx';

/* ==========================================================================
   Toasts
   --------------------------------------------------------------------------
   Bottom-right stack, auto-dismissing after 3.2s — same timing as the static
   build. Each toast owns its own timer so a burst of added pieces does not
   cancel the earlier messages.
   ========================================================================== */

const LIFETIME = 3200;

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), LIFETIME);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`toast-item${toast.tone && toast.tone !== 'default' ? ` toast-${toast.tone}` : ''}`}
      role="status"
      onClick={() => onDismiss(toast.id)}
    >
      {toast.message}
    </div>
  );
}

export default function Toasts() {
  const { toasts, dismissToast } = useStore();

  return (
    <div className="toast-stack" id="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
