/* ==========================================================================
   HunarSathi — High-Speed Streaming Buyer Chatbot Widget for HunarLink
   Features: Live SSE Token Streaming, Animated Typing Wave, Hard <20s Cap,
             Client-Side Micro-Cache, and Instant HunarLink Knowledge Fallback
   ========================================================================== */
(function () {
  const API_BASE = "http://127.0.0.1:5050";
  const SESSION_KEY = "hunarsathi_session_id";
  const HEALTH_TIMEOUT_MS = 2200;
  const STREAM_TIMEOUT_MS = 20000;

  function getSessionId() {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = "buyer-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  let backendOnline = false;
  let supportsStreaming = true;
  let isBusy = false;
  let lastHealthCheck = 0;

  const WELCOME_MSG =
    "Namaste! I am HunarSathi, your dedicated HunarLink buyer assistant.\n\n" +
    "Ask me about Kashmiri crafts, prices, GI Tag verification, wholesale orders, payments, or tracking!";

  const OFF_TOPIC_MSG =
    "I am HunarSathi, the dedicated assistant for HunarLink. I can only answer questions related to the HunarLink platform — such as Kashmiri crafts, prices, artisans, GI Tag verification, orders, escrow payments, wholesale, and delivery. How can I help you on HunarLink today?";

  /* Safe lightweight formatter: renders **bold** and `code` via DOM nodes (zero XSS) */
  function renderFormattedText(container, text) {
    container.textContent = "";
    const parts = String(text || "").split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        const strong = document.createElement("strong");
        strong.textContent = part.slice(2, -2);
        container.appendChild(strong);
      } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        const code = document.createElement("code");
        code.className = "hs-inline-code";
        code.textContent = part.slice(1, -1);
        container.appendChild(code);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    }
  }

  /* Strict HunarLink-only instant fallback when local backend is offline or times out */
  function offlineHunarLinkFallback(text) {
    const q = (text || "").trim().toLowerCase();
    const isHunarLinkRelated = /(hunarlink|hunarsathi|pashmina|shawl|stole|kani|sozni|jamawar|walnut|wood|carv|papier|mache|mâché|sakhta|naqash|silk|rug|carpet|craft|artisan|ustad|kashmir|srinagar|budgam|anantnag|gi\b|gi-jk|jk-wnt|tag|verify|verification|authentic|purity|micron|passport|price|cost|mrp|order|track|ship|deliver|escrow|cod|pay|upi|cart|wishlist|compare|return|refund|wholesale|b2b|bulk|moq|seller|register|profile|login|care|wash|hi|hello|namaste|salam|thanks|help)/i.test(q);

    if (!isHunarLinkRelated) {
      return OFF_TOPIC_MSG;
    }
    if (/^(hi|hello|hey|hii+|namaste|salam|salaam)\b/i.test(q)) {
      return "Namaste! Welcome to HunarLink — Valley Craft Guild. How can I help you explore our GI-certified Kashmiri crafts, check prices, verify a GI Tag, or track an order today?";
    }
    if (/^(thanks|thank\s+you|shukriya)\b/i.test(q)) {
      return "Shukriya! Let me know anytime you need help with HunarLink crafts, GI verification, or your orders.";
    }
    if (/papier|mache|mâché|sakhta|naqash|urn|gulab/i.test(q)) {
      return "HunarLink's **Papier-Mâché Art** collection features 20 GI-certified pieces priced between **₹450 and ₹7,250**, hand-molded from Sakhta pulp with 24K gold leaf Naqash in Zadibal & Budgam.";
    }
    if (/pashmina|shawl|stole|micron/i.test(q)) {
      return "All **16 GI-certified Kashmiri Pashmina & Kani shawls** on HunarLink are priced between **₹19,900 and ₹2,00,000**, crafted from authentic sub-16-micron Changthangi fleece:\n• **Royal Khudrang Pashmina Shawl** — ₹26,600 (`GI-JK-PASH-8821`)\n• **Natural Ivory Ring Pashmina** — ₹25,200 (`GI-JK-PASH-8830`)\n• **Jamawar Heirloom Stole** — ₹169,400 (`GI-JK-PASH-8810`)";
    }
    if (/gi\b|gi-jk|jk-wnt|verify|verification|authentic|fake|lab|passport|seal/i.test(q)) {
      return "Every HunarLink craft passes our **3-Step Valley Verification Flow**:\n1. **Artisan Geo-Verification** (GPS-logged J&K workshop)\n2. **Material Purity Lab Review** (sub-16µm Pashmina & 99.4% purity test)\n3. **GI Tag & Tamper-Proof QR Laser Seal**\n\nTest any code live in the **Verify GI Tag** box (try `GI-JK-PASH-8821` or `GI #JK-WNT-1180`) — backed by our 100% Authenticity Refund Guarantee.";
    }
    if (/wholesale|b2b|bulk|moq|local seller/i.test(q)) {
      return "HunarLink's **Wholesale Trade Portal** supports both **Bulk Buyers** (inquiries transfer directly to the specified HunarLink Artisan) and **Local Sellers** (inquiries transfer to HunarLink Admin), with tiered discounts (**12%** for 10+ units, **18%** for 25+, **25%** for 50+) and batch GI export seals. Click **Wholesale** in the top navigation bar to start.";
    }
    if (/order|track|ship|deliver|escrow|pay|cod|upi|refund|return/i.test(q)) {
      return "HunarLink protects every order with **UPI Escrow, Card Escrow, and Insured Verify-on-Delivery (COD) Escrow** — scan the physical GI QR tag at your doorstep before payment release. Track all 5 stages (**Confirmed → GI Seal Verified → Packed at Loom → Insured Transit → Delivered**) anytime on your **My Orders** page.";
    }
    if (/walnut|wood|silk|rug|carpet|sozni|kani/i.test(q)) {
      return "HunarLink curates **5 Heritage Craft Guilds** direct from J&K workshops with 100% artisan payout:\n• **Pashmina & Kani Shawls** (₹19,900–₹2,00,000)\n• **Walnut Woodcarving** (₹1,800–₹2,10,000)\n• **Papier-Mâché Art** (₹450–₹7,250)\n• **Silk-on-Silk Rugs** (₹1,10,150–₹1,90,000)\n• **Kani Jamawar & Sozni Needlework** (₹9,000–₹50,000)";
    }
    if (/care|wash|clean|store/i.test(q)) {
      return "Dry-clean **Pashmina, Kani & Sozni** gently and store in breathable cotton/muslin. Wipe **Walnut Woodcarving & Papier-Mâché** with a soft dry cloth away from moisture.";
    }
    if (/seller|artisan|register|portal|dashboard/i.test(q)) {
      return "J&K artisans can register via the **Artisan Portal** with GI Certification (GI ID, live certificate photo, workshop video & passport photo) or as a Standard Artisan to manage listings, retail orders, and wholesale requests.";
    }
    return "On HunarLink, you can shop GI-certified Kashmiri crafts directly from 2,400+ verified J&K artisans with zero middleman cut. Ask me about Pashmina or Papier-Mâché prices, GI verification, Walnut/Silk Rugs, Wholesale bulk orders, escrow payments, or order tracking!";
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const merged = Object.assign({}, options || {}, { signal: controller.signal });
    return fetch(url, merged).finally(() => clearTimeout(timer));
  }

  function injectWidget() {
    if (document.getElementById("hunarsathi-launcher")) return;

    const launcher = document.createElement("button");
    launcher.id = "hunarsathi-launcher";
    launcher.type = "button";
    launcher.className = "hunarsathi-launcher";
    launcher.setAttribute("aria-label", "Open HunarSathi Buyer Assistant");
    launcher.innerHTML = `
      <span class="hs-launcher-inner">
        <span class="hunarsathi-launcher-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="15" height="15"><path d="M12 3.2l1.9 5.1a3 3 0 0 0 1.8 1.8l5.1 1.9-5.1 1.9a3 3 0 0 0-1.8 1.8L12 20.8l-1.9-5.1a3 3 0 0 0-1.8-1.8L3.2 12l5.1-1.9a3 3 0 0 0 1.8-1.8z"/></svg></span>
        <span class="hunarsathi-launcher-text">HunarSathi</span>
        <span class="hunarsathi-launcher-pulse" aria-hidden="true"></span>
      </span>
    `;

    const win = document.createElement("section");
    win.id = "hunarsathi-window";
    win.className = "hunarsathi-window";
    win.setAttribute("aria-label", "HunarSathi Buyer Chatbot");
    win.innerHTML = `
      <div class="hs-header">
        <div class="hs-header-left">
          <div class="hs-bot-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="19" height="19"><path d="M12 3.2l1.9 5.1a3 3 0 0 0 1.8 1.8l5.1 1.9-5.1 1.9a3 3 0 0 0-1.8 1.8L12 20.8l-1.9-5.1a3 3 0 0 0-1.8-1.8L3.2 12l5.1-1.9a3 3 0 0 0 1.8-1.8z"/></svg></div>
          <div>
            <div class="hs-bot-name">HunarSathi</div>
            <div class="hs-bot-sub">
              <span class="hs-status-dot" id="hs-status-dot"></span>
              <span id="hs-status-text">HunarLink Assistant • Online</span>
            </div>
          </div>
        </div>
        <div class="hs-header-actions">
          <button type="button" class="hs-icon-btn" id="hs-reset-btn" title="Reset Chat">↺</button>
          <button type="button" class="hs-icon-btn" id="hs-close-btn" title="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"/></svg></button>
        </div>
      </div>

      <div class="hs-scope-bar">
        <span>HunarLink Buyer Guide Only</span>
      </div>

      <div class="hs-messages" id="hs-messages"></div>

      <div class="hs-chips-bar">
        <button type="button" class="hs-chip" data-q="What are the Pashmina prices on HunarLink?">Pashmina Prices</button>
        <button type="button" class="hs-chip" data-q="How does HunarLink GI verification work?">GI Verification</button>
        <button type="button" class="hs-chip" data-q="How do escrow payment and order tracking work?">Orders &amp; Escrow</button>
        <button type="button" class="hs-chip" data-q="Tell me about Papier-Mâché and Wholesale bulk orders.">Papier-Mâché &amp; Bulk</button>
      </div>

      <form class="hs-composer" id="hs-composer">
        <div class="hs-input-wrap">
          <input type="text" id="hs-input" class="hs-input" aria-label="Ask HunarSathi a question" placeholder="Ask HunarSathi about HunarLink..." autocomplete="off" required>
        </div>
        <button type="submit" id="hs-send-btn" class="hs-send-btn">
          <span class="hs-send-inner">Ask</span>
        </button>
      </form>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(win);

    appendMessage("bot", WELCOME_MSG);

    launcher.addEventListener("click", () => {
      win.classList.toggle("open");
      if (win.classList.contains("open")) {
        checkBackendHealth(false);
        document.getElementById("hs-input")?.focus();
      }
    });

    document.getElementById("hs-close-btn").addEventListener("click", () => {
      win.classList.remove("open");
    });

    document.getElementById("hs-reset-btn").addEventListener("click", async () => {
      const box = document.getElementById("hs-messages");
      if (box) box.innerHTML = "";
      appendMessage("bot", WELCOME_MSG);
      if (!backendOnline) return;
      try {
        await fetchWithTimeout(
          `${API_BASE}/api/reset`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: getSessionId() }),
          },
          2500
        );
      } catch (e) {}
    });

    win.querySelectorAll(".hs-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (!isBusy) sendUserMessage(chip.dataset.q);
      });
    });

    document.getElementById("hs-composer").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("hs-input");
      const msg = (input?.value || "").trim();
      if (!msg || isBusy) return;
      input.value = "";
      sendUserMessage(msg);
    });

    // Lightweight background health + warmup check on page load
    checkBackendHealth(true);
  }

  async function checkBackendHealth(alsoWarmup) {
    const now = Date.now();
    if (!alsoWarmup && now - lastHealthCheck < 15000) return backendOnline;
    lastHealthCheck = now;

    const dot = document.getElementById("hs-status-dot");
    const txt = document.getElementById("hs-status-text");
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/health`, { method: "GET" }, HEALTH_TIMEOUT_MS);
      if (!res.ok) throw new Error("not ok");
      const data = await res.json();
      backendOnline = true;
      supportsStreaming = data.streaming !== false;
      if (alsoWarmup) {
        fetchWithTimeout(`${API_BASE}/api/warmup`, { method: "GET" }, 2500).catch(() => {});
      }
    } catch (e) {
      backendOnline = false;
    }
    if (dot) dot.classList.remove("offline");
    if (txt) txt.textContent = "HunarLink Assistant • Online";
    return backendOnline;
  }

  function scrollMessagesToBottom() {
    const box = document.getElementById("hs-messages");
    if (box) box.scrollTop = box.scrollHeight;
  }

  function appendMessage(role, text, extraClass) {
    const box = document.getElementById("hs-messages");
    if (!box) return null;
    const div = document.createElement("div");
    div.className = `hs-msg ${role}${extraClass ? " " + extraClass : ""}`;
    if (role === "bot" && !extraClass) {
      renderFormattedText(div, text);
    } else {
      div.textContent = text;
    }
    box.appendChild(div);
    scrollMessagesToBottom();
    return div;
  }

  function appendTypingIndicator() {
    const box = document.getElementById("hs-messages");
    if (!box) return null;
    const div = document.createElement("div");
    div.className = "hs-msg bot typing";
    div.innerHTML = `<span class="hs-typing-dots" aria-label="HunarSathi is typing"><span></span><span></span><span></span></span>`;
    box.appendChild(div);
    scrollMessagesToBottom();
    return div;
  }

  async function streamFromBackend(message, typingEl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);
    let botBubble = null;
    let accumulated = "";

    try {
      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          session_id: getSessionId(),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payloadStr = line.slice(5).trim();
          if (!payloadStr) continue;

          let evt;
          try {
            evt = JSON.parse(payloadStr);
          } catch {
            continue;
          }

          if (evt.type === "chunk" && evt.text) {
            if (typingEl && typingEl.parentNode) typingEl.remove();
            if (!botBubble) {
              botBubble = appendMessage("bot", "", "streaming");
            }
            accumulated += evt.text;
            renderFormattedText(botBubble, accumulated);
            scrollMessagesToBottom();
          } else if (evt.type === "done") {
            const finalText = (evt.reply || accumulated || "").trim();
            if (finalText) {
              if (typingEl && typingEl.parentNode) typingEl.remove();
              if (!botBubble) botBubble = appendMessage("bot", "");
              botBubble.classList.remove("streaming");
              renderFormattedText(botBubble, finalText);
              scrollMessagesToBottom();
              return true;
            }
          }
        }
      }

      if (botBubble) botBubble.classList.remove("streaming");
      return accumulated.trim().length > 0;
    } finally {
      clearTimeout(timeoutId);
      if (botBubble) botBubble.classList.remove("streaming");
    }
  }

  async function fetchJsonFromBackend(message, typingEl) {
    const res = await fetchWithTimeout(
      `${API_BASE}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          session_id: getSessionId(),
        }),
      },
      STREAM_TIMEOUT_MS
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.reply) {
      if (typingEl && typingEl.parentNode) typingEl.remove();
      appendMessage("bot", data.reply);
      return true;
    }
    return false;
  }

  async function sendUserMessage(message) {
    if (isBusy) return;
    isBusy = true;

    const sendBtn = document.getElementById("hs-send-btn");
    if (sendBtn) sendBtn.disabled = true;

    appendMessage("user", message);
    const typingEl = appendTypingIndicator();

    try {
      // Quick re-check if previously offline (capped at 1.2s so offline replies stay instant)
      if (!backendOnline) {
        try {
          const probe = await fetchWithTimeout(`${API_BASE}/api/health`, { method: "GET" }, 1200);
          if (probe.ok) {
            const info = await probe.json().catch(() => ({}));
            backendOnline = true;
            supportsStreaming = info.streaming !== false;
          }
        } catch (e) {
          backendOnline = false;
        }
      }

      let delivered = false;
      if (backendOnline) {
        try {
          if (supportsStreaming) {
            delivered = await streamFromBackend(message, typingEl);
          } else {
            delivered = await fetchJsonFromBackend(message, typingEl);
          }
        } catch (streamErr) {
          // If streaming endpoint failed (e.g. older server), try standard JSON once within short budget
          if (supportsStreaming) {
            try {
              delivered = await fetchJsonFromBackend(message, typingEl);
            } catch (e2) {
              backendOnline = false;
            }
          } else {
            backendOnline = false;
          }
        }
      }

      if (!delivered) {
        if (typingEl && typingEl.parentNode) typingEl.remove();
        appendMessage("bot", offlineHunarLinkFallback(message));
      }
    } catch (err) {
      if (typingEl && typingEl.parentNode) typingEl.remove();
      appendMessage("bot", offlineHunarLinkFallback(message));
    } finally {
      isBusy = false;
      if (sendBtn) sendBtn.disabled = false;
      document.getElementById("hs-input")?.focus();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectWidget);
  } else {
    injectWidget();
  }
})();
