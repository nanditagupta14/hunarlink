# HunarSathi — Buyer Assistant for HunarLink

The assistant that sits in the bottom-right of every storefront page.

**It works out of the box with no setup.** With no backend running, the widget answers
using an on-device knowledge base built from the live catalogue — GI verification,
pricing ranges, the 3-step verification flow, wholesale/B2B, orders and shipping. That is
the mode used in the demo, and it cannot fail mid-presentation because it makes no
network calls.

This folder also contains an **optional** Python service that upgrades the assistant to
token-by-token streaming answers from Google Gemini. Running it is not required.

---

## Default: offline mode (nothing to do)

Just open the storefront. The widget loads, the launcher shows a green dot, and answers
arrive instantly from the local knowledge base.

---

## Optional: streaming LLM mode

Only needed if you want live model-generated answers.

1. **Configure `.env`** inside `hunarsathi-chatbot/.env`:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   GEMINI_MODEL=gemini-3.1-flash-lite
   PORT=5050
   ```

2. **Create a virtual environment and install dependencies:**
   ```bash
   cd hunarsathi-chatbot
   python -m venv .venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Start the service:**
   ```bash
   python server.py
   ```

4. Reload the storefront. The widget probes `http://127.0.0.1:5050/api/health` on load
   and switches to streaming mode automatically when the service is up.

If the service is down, unreachable, or slow (>2.2s health timeout), the widget silently
stays in offline mode — no error is shown to the buyer.

---

## Files

| File | Purpose |
|---|---|
| `widget.js` | Browser widget — UI, streaming client, offline knowledge base |
| `widget.css` | Widget styles |
| `server.py` | Optional FastAPI service exposing `/api/chat/stream` |
| `chatbot.py` | Gemini client, caching, model failover, latency cap |
| `knowledge_base.py` | HunarLink-specific grounding content |
| `cli_chat.py` | Terminal client for testing without the browser |
| `requirements.txt` | Python dependencies |

---

## Notes for evaluation

- The widget is **HunarLink-only** by design: if a question is off-topic it redirects to
  craft, verification or ordering topics.
- Latency in offline mode is effectively instant (no network).
- In streaming mode the service enforces a hard response cap so a slow model can never
  stall the demo.
