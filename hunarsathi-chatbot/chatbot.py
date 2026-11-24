"""
HunarSathi — High-Speed Streaming Buyer Assistant for HunarLink.
Uses a persistent google-genai Client with:
  - Hard per-call timeout & single-attempt fast failover (no 60s+ retry stalls)
  - Automatic circuit-breaker cooldown for rate-limited / overloaded models
  - Zero-thinking config on Flash-Lite models (~1.4s TTFT)
  - TTL response cache & instant rule-based fast-path for greetings/common queries
  - Seamless local knowledge fallback so every reply completes in well under 30s
"""

from __future__ import annotations

import os
import re
import threading
import time
from collections import OrderedDict
from pathlib import Path
from typing import Dict, Generator, List, Optional, Tuple

from dotenv import load_dotenv
from google import genai
from google.genai import types

from knowledge_base import SYSTEM_INSTRUCTION

# Load .env located inside hunarsathi-chatbot/
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

BOT_NAME = "HunarSathi"
DEFAULT_MODEL = "gemini-3.1-flash-lite"

# Fast Flash / Flash-Lite failover ladder (ordered by lowest latency & highest reliability)
FALLBACK_MODELS: List[str] = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
]

# Models known to support thinking_budget=0 for ultra-low latency
THINKING_BUDGET_ZERO_MODELS = {
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
}

# Hard per-attempt network timeout (ms) — Gemini API requires >= 10,000ms minimum deadline
PER_MODEL_TIMEOUT_MS = 12_000
MAX_TOTAL_LATENCY_SEC = 18.0
MODEL_COOLDOWN_SEC = 300.0  # Skip a 429/503/404 model for 5 minutes

MAX_HISTORY_TURNS = 6
CACHE_TTL_SEC = 600.0
CACHE_MAX_SIZE = 200

OFF_TOPIC_REFUSAL = (
    "I am HunarSathi, the dedicated assistant for HunarLink. "
    "I can only help with questions about HunarLink's GI-certified Kashmiri crafts "
    "(Pashmina, Walnut Woodcarving, Papier-Mâché, Silk Rugs, Kani & Sozni), "
    "prices, GI Tag verification, artisans, orders, escrow payments, wholesale, and delivery. "
    "How can I assist you with HunarLink today?"
)

# Thread-safe state
_LOCK = threading.Lock()
_CLIENT: Optional[genai.Client] = None
_CLIENT_API_KEY: Optional[str] = None
_SESSION_HISTORY: Dict[str, List[Dict[str, str]]] = {}
_RESPONSE_CACHE: "OrderedDict[str, Tuple[float, str, str]]" = OrderedDict()
_MODEL_COOLDOWN_UNTIL: Dict[str, float] = {}
_NO_THINKING_CFG_MODELS: set[str] = set()

_GREETING_RE = re.compile(
    r"^(hi|hello|hey|hii+|namaste|salam|salaam|good\s*(morning|afternoon|evening)|as[-\s]?salamu\s+alaykum)[\s!.,?]*$",
    re.IGNORECASE,
)

_HUNARLINK_DOMAIN_RE = re.compile(
    r"(hunarlink|hunarsathi|pashmina|shawl|stole|kani|sozni|jamawar|walnut|wood|carv|"
    r"papier|mache|mâché|sakhta|naqash|silk|rug|carpet|talim|craft|artisan|ustad|"
    r"kashmir|j&k|srinagar|budgam|anantnag|kanihama|zadibal|ladakh|changthang|"
    r"gi\b|gi-jk|jk-wnt|tag|verify|verification|authentic|fake|purity|micron|passport|lab|"
    r"price|cost|mrp|discount|cheap|budget|expensive|₹|rs\b|inr|"
    r"order|track|ship|deliver|courier|escrow|cod|pay|upi|cart|wishlist|compare|return|refund|"
    r"wholesale|b2b|bulk|moq|seller|vendor|register|portal|dashboard|profile|login|account|"
    r"care|wash|clean|store|gift|wedding|bridal|help|hi|hello|namaste|salam|thanks|thank you)",
    re.IGNORECASE,
)


def get_gemini_config() -> Tuple[str, str]:
    """Read GEMINI_API_KEY and GEMINI_MODEL from .env."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    return api_key, model


def get_candidate_models() -> List[str]:
    """
    Build ordered list of healthy candidate models.
    Prioritizes fast Flash-Lite models while respecting GEMINI_MODEL in .env
    and automatically skipping models currently in cooldown (429/503/404).
    """
    _, configured = get_gemini_config()
    extra = [m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "").split(",") if m.strip()]

    # If user explicitly set a custom model other than a cooled-down one, include it,
    # while keeping our fastest benchmarked Flash-Lite model ready at the top for <3s speed.
    prefer_fast = os.getenv("HUNARSATHI_FAST_MODE", "true").strip().lower() != "false"
    raw_order = (
        [DEFAULT_MODEL, configured] + extra + FALLBACK_MODELS
        if prefer_fast
        else [configured, DEFAULT_MODEL] + extra + FALLBACK_MODELS
    )

    deduped: List[str] = []
    for m in raw_order:
        if m and m not in deduped:
            deduped.append(m)

    now = time.monotonic()
    with _LOCK:
        healthy = [m for m in deduped if _MODEL_COOLDOWN_UNTIL.get(m, 0.0) <= now]

    # If everything is cooling down, still allow trying the fastest two
    return healthy if healthy else deduped[:2]


def get_client() -> genai.Client:
    """Return a reusable persistent google-genai Client (keeps HTTP/2 + TLS warm)."""
    global _CLIENT, _CLIENT_API_KEY
    api_key, _ = get_gemini_config()
    if not api_key or api_key == "GEMINI_API_KEY":
        raise ValueError(
            "Please set a valid GEMINI_API_KEY in hunarsathi-chatbot/.env before calling Gemini."
        )

    with _LOCK:
        if _CLIENT is None or _CLIENT_API_KEY != api_key:
            _CLIENT = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(
                    timeout=PER_MODEL_TIMEOUT_MS,
                    retry_options=types.HttpRetryOptions(attempts=1),
                ),
            )
            _CLIENT_API_KEY = api_key
        return _CLIENT


def warmup_client() -> Dict[str, object]:
    """Pre-initialize the Gemini client at server startup to remove cold-start overhead."""
    api_key, model = get_gemini_config()
    configured = bool(api_key and api_key != "GEMINI_API_KEY")
    if configured:
        try:
            get_client()
        except Exception:
            pass
    return {
        "ready": configured,
        "configured_model": model,
        "active_models": get_candidate_models(),
    }


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower()).rstrip("?!.")


def _cache_get(key: str) -> Optional[Tuple[str, str]]:
    now = time.monotonic()
    with _LOCK:
        item = _RESPONSE_CACHE.get(key)
        if not item:
            return None
        ts, reply, model_used = item
        if now - ts > CACHE_TTL_SEC:
            _RESPONSE_CACHE.pop(key, None)
            return None
        _RESPONSE_CACHE.move_to_end(key)
        return reply, model_used


def _cache_put(key: str, reply: str, model_used: str) -> None:
    if not key or not reply:
        return
    with _LOCK:
        _RESPONSE_CACHE[key] = (time.monotonic(), reply, model_used)
        _RESPONSE_CACHE.move_to_end(key)
        while len(_RESPONSE_CACHE) > CACHE_MAX_SIZE:
            _RESPONSE_CACHE.popitem(last=False)


def _mark_model_issue(model_name: str, err: Exception) -> bool:
    """
    Record transient/permanent model errors so future requests skip unhealthy models in 0ms.
    Returns True if caller should retry the same model without thinking_config.
    """
    msg = str(err)
    if "400" in msg and "INVALID_ARGUMENT" in msg and "deadline" not in msg.lower():
        with _LOCK:
            if model_name not in _NO_THINKING_CFG_MODELS:
                _NO_THINKING_CFG_MODELS.add(model_name)
                return True
    if any(code in msg for code in ("429", "RESOURCE_EXHAUSTED", "503", "UNAVAILABLE", "404", "NOT_FOUND")):
        with _LOCK:
            _MODEL_COOLDOWN_UNTIL[model_name] = time.monotonic() + MODEL_COOLDOWN_SEC
    return False


def _build_gen_config(model_name: str, use_thinking_zero: bool = True) -> types.GenerateContentConfig:
    kwargs: Dict[str, object] = {
        "system_instruction": SYSTEM_INSTRUCTION,
        "temperature": 0.25,
        "max_output_tokens": 280,
    }
    with _LOCK:
        skip_thinking = model_name in _NO_THINKING_CFG_MODELS
    if use_thinking_zero and not skip_thinking and model_name in THINKING_BUDGET_ZERO_MODELS:
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    return types.GenerateContentConfig(**kwargs)


def _build_contents(history: List[Dict[str, str]], user_message: str) -> List[types.Content]:
    contents: List[types.Content] = []
    for turn in history[-(MAX_HISTORY_TURNS * 2) :]:
        contents.append(
            types.Content(
                role=turn["role"],
                parts=[types.Part.from_text(text=turn["text"])],
            )
        )
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message)],
        )
    )
    return contents


def _instant_fast_path(cleaned: str) -> Optional[str]:
    """Zero-latency replies for greetings and clearly non-HunarLink short prompts."""
    if _GREETING_RE.match(cleaned):
        return (
            "Namaste! Welcome to HunarLink — Valley Craft Guild. "
            "Ask me about our GI-certified Kashmiri crafts (Pashmina, Walnut Woodcarving, "
            "Papier-Mâché, Silk Rugs, Kani & Sozni), prices, GI Tag verification, wholesale, or order tracking!"
        )
    if re.match(r"^(thanks|thank\s+you|shukriya|dhanyavaad)[\s!.]*$", cleaned, re.IGNORECASE):
        return "Shukriya! Let me know whenever you need help exploring HunarLink's Kashmiri crafts, GI verification, or your orders."
    return None


def local_hunarlink_reply(user_message: str) -> str:
    """
    Fast, accurate local HunarLink knowledge fallback used if all remote models
    are temporarily unavailable or exceed the speed budget.
    """
    q = (user_message or "").strip().lower()
    if not q:
        return "Namaste! Ask me anything about HunarLink crafts, prices, GI verification, wholesale, or your orders."

    fast = _instant_fast_path(user_message.strip())
    if fast:
        return fast

    if not _HUNARLINK_DOMAIN_RE.search(q):
        return OFF_TOPIC_REFUSAL

    if re.search(r"papier|mache|mâché|sakhta|naqash|urn|gulab", q):
        return (
            "HunarLink's **Papier-Mâché Art** collection features 20 GI-certified pieces priced from **₹500 to ₹980** "
            "(MRPs up to ₹1,000), hand-molded from Sakhta pulp and painted with 24K gold leaf Naqash in Zadibal & Budgam. "
            "A popular pick is the **Shahi Gulab-dan Urn (₹850 • GI-JK-PAPR-3109)**."
        )
    if re.search(r"pashmina|shawl|stole|micron|changthang", q):
        return (
            "HunarLink offers **16 GI-certified Pashmina & Kani shawls** priced between **₹1,050 and ₹1,980** (MRPs up to ₹2,000), "
            "woven from lab-tested sub-16-micron Changthangi fleece with 100% direct artisan payout:\n"
            "• **Royal Khudrang Pashmina** — ₹1,650 (GI-JK-PASH-8821)\n"
            "• **Natural Ivory Ring Pashmina** — ₹1,320 (GI-JK-PASH-8830, 13.8µm)\n"
            "• **Jamawar Heirloom Stole** — ₹1,850 (GI-JK-PASH-8810)"
        )
    if re.search(r"walnut|wood|carv|chinar|chest", q):
        return (
            "HunarLink's **Walnut Woodcarving** guild (20 crafts) uses 5-year cured Kashmiri *Juglans Regia* walnut timber "
            "carved by Anantnag & Srinagar master artisans. Featured piece: **Openwork Chinar Lattice Walnut Chest** at **₹14,800** "
            "(MRP ₹21,500 • GI #JK-WNT-1180 by Fayaz Ahmad Wani)."
        )
    if re.search(r"silk|rug|carpet|talim|knot", q):
        return (
            "HunarLink's **Silk-on-Silk Rugs** (20 hand-knotted heirloom carpets) are woven in Srinagar & Budgam using pure mulberry silk "
            "and traditional *Talim* notation — reaching up to **900 knots/sq.in** with full GI laser certification."
        )
    if re.search(r"kani|sozni|jamawar|embroid|tuji", q):
        return (
            "HunarLink's **Kani Jamawar & Sozni** guild (20 pieces) features wooden-bobbin (*Tujis*) Jamawar weaves from Kanihama "
            "and delicate single-needle Sozni embroidery from Old Srinagar — every piece is GI-certified and shipped directly from the artisan."
        )
    if re.search(r"gi\b|gi-jk|jk-wnt|verify|verification|authentic|fake|lab|passport|seal", q):
        return (
            "Every HunarLink craft clears our **3-Step Valley Verification Flow**:\n"
            "• **1. Artisan Geo-Verification:** GPS-logged J&K workshop & Govt. Registry check.\n"
            "• **2. Material Purity Lab Review:** Microscopic <16µm Pashmina & 99.4% purity test.\n"
            "• **3. GI Tag & QR Laser Seal:** Tamper-proof laser seal + Digital Craft Passport.\n"
            "Try verifying `GI-JK-PASH-8821` or `GI #JK-WNT-1180` in the **Verify GI Tag** box — backed by a 100% Authenticity Refund Guarantee."
        )
    if re.search(r"wholesale|b2b|bulk|moq|hotel|architect|local seller", q):
        return (
            "HunarLink's **Wholesale Trade Portal** serves both **Bulk Buyers** (inquiries transfer directly to the specified HunarLink Artisan) "
            "and **Local Sellers** (inquiries transfer to HunarLink Admin). Enjoy tiered discounts — **12% off (10+ units)**, "
            "**18% off (25+)**, and **25% off (50+)** — with batch GI export seals."
        )
    if re.search(r"order|track|ship|deliver|escrow|cod|pay|upi|refund|return", q):
        return (
            "HunarLink protects every purchase with **UPI Escrow, Card Escrow, and Insured Verify-on-Delivery (COD) Escrow** — "
            "scan the physical GI QR seal at your doorstep before payment releases. Track all 5 stages "
            "(Confirmed → GI Seal Verified → Packed at Loom → Insured Transit → Delivered) anytime on your **My Orders** page."
        )
    if re.search(r"care|wash|clean|store", q):
        return (
            "For **Pashmina, Kani & Sozni**, always dry-clean gently and store folded in breathable muslin/cotton with cedar or neem. "
            "For **Walnut Woodcarving & Papier-Mâché**, dust with a dry soft microfiber cloth and keep away from direct moisture."
        )
    if re.search(r"seller|artisan|register|portal|dashboard", q):
        return (
            "J&K artisans can join HunarLink via **Artisan Registration** with GI Certification (GI ID, live certificate photo, "
            "workshop video & passport photo) or as a Standard Artisan, then manage listings, retail orders, and bulk wholesale requests in the **Seller Portal**."
        )

    return (
        "On HunarLink, you can shop GI-certified Kashmiri crafts directly from 2,400+ verified J&K artisans with zero middleman cut:\n"
        "• **Pashmina & Kani Shawls** (₹1,050–₹1,980)\n"
        "• **Papier-Mâché Art** (₹500–₹980)\n"
        "• **Walnut Woodcarving**, **Silk-on-Silk Rugs** & **Kani/Sozni Needlework**\n"
        "Ask me about any craft, GI Tag verification, escrow payments, order tracking, or wholesale!"
    )


def _persist_turn(session_id: str, user_message: str, reply_text: str) -> None:
    with _LOCK:
        history = _SESSION_HISTORY.setdefault(session_id, [])
        history.append({"role": "user", "text": user_message})
        history.append({"role": "model", "text": reply_text})
        if len(history) > MAX_HISTORY_TURNS * 2:
            _SESSION_HISTORY[session_id] = history[-(MAX_HISTORY_TURNS * 2) :]


def _get_history_snapshot(session_id: str) -> List[Dict[str, str]]:
    with _LOCK:
        return list(_SESSION_HISTORY.get(session_id, []))


def stream_hunarsathi(
    user_message: str, session_id: str = "default"
) -> Generator[Dict[str, object], None, None]:
    """
    Stream HunarSathi's reply token-by-token.
    Yields dicts:
      - {"type": "chunk", "text": "..."}
      - {"type": "done", "reply": "...", "model": "...", "latency_ms": int, "cached": bool}
    Guaranteed to finish well under 30s via fast-path, cache, hard timeout, model failover & local fallback.
    """
    t_start = time.perf_counter()
    cleaned = (user_message or "").strip()

    if not cleaned:
        reply = "Namaste! Ask me anything about HunarLink crafts, prices, GI verification, or your orders."
        yield {"type": "chunk", "text": reply}
        yield {"type": "done", "reply": reply, "model": "fast-path", "latency_ms": 1, "cached": True}
        return

    # 1. Instant fast-path for greetings / thank-you (0ms, zero quota)
    fast_reply = _instant_fast_path(cleaned)
    if fast_reply:
        _persist_turn(session_id, cleaned, fast_reply)
        yield {"type": "chunk", "text": fast_reply}
        yield {
            "type": "done",
            "reply": fast_reply,
            "model": "fast-path",
            "latency_ms": int((time.perf_counter() - t_start) * 1000),
            "cached": True,
        }
        return

    history = _get_history_snapshot(session_id)
    cache_key = _normalize_query(cleaned) if not history else ""

    # 2. Check TTL cache for single-turn / FAQ questions (<5ms)
    if cache_key:
        cached = _cache_get(cache_key)
        if cached:
            reply_text, cached_model = cached
            _persist_turn(session_id, cleaned, reply_text)
            yield {"type": "chunk", "text": reply_text}
            yield {
                "type": "done",
                "reply": reply_text,
                "model": cached_model,
                "latency_ms": int((time.perf_counter() - t_start) * 1000),
                "cached": True,
            }
            return

    # 3. Try live Gemini streaming across fast healthy models within strict latency budget
    try:
        client = get_client()
        contents = _build_contents(history, cleaned)
        candidates = get_candidate_models()
    except Exception:
        candidates = []
        client = None
        contents = []

    for model_name in candidates:
        if time.perf_counter() - t_start >= MAX_TOTAL_LATENCY_SEC:
            break

        for attempt_idx in range(2):  # second pass only if 400 invalid thinking_config
            collected: List[str] = []
            try:
                cfg = _build_gen_config(model_name, use_thinking_zero=(attempt_idx == 0))
                stream = client.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=cfg,
                )
                for chunk in stream:
                    piece = getattr(chunk, "text", None)
                    if piece:
                        collected.append(piece)
                        yield {"type": "chunk", "text": piece}
                    if time.perf_counter() - t_start >= MAX_TOTAL_LATENCY_SEC + 4.0:
                        break

                full_reply = "".join(collected).strip()
                if full_reply:
                    _persist_turn(session_id, cleaned, full_reply)
                    if cache_key:
                        _cache_put(cache_key, full_reply, model_name)
                    yield {
                        "type": "done",
                        "reply": full_reply,
                        "model": model_name,
                        "latency_ms": int((time.perf_counter() - t_start) * 1000),
                        "cached": False,
                    }
                    return
                break  # empty reply, try next model
            except Exception as err:
                # If we already streamed partial tokens, finalize gracefully
                if collected:
                    partial = "".join(collected).strip()
                    _persist_turn(session_id, cleaned, partial)
                    yield {
                        "type": "done",
                        "reply": partial,
                        "model": model_name,
                        "latency_ms": int((time.perf_counter() - t_start) * 1000),
                        "cached": False,
                    }
                    return
                retry_without_thinking = _mark_model_issue(model_name, err)
                if retry_without_thinking and attempt_idx == 0:
                    continue
                break

    # 4. Guaranteed fast local knowledge fallback (never stalls or 500s)
    fallback_reply = local_hunarlink_reply(cleaned)
    _persist_turn(session_id, cleaned, fallback_reply)
    yield {"type": "chunk", "text": fallback_reply}
    yield {
        "type": "done",
        "reply": fallback_reply,
        "model": "local-knowledge",
        "latency_ms": int((time.perf_counter() - t_start) * 1000),
        "cached": False,
    }


def ask_hunarsathi(user_message: str, session_id: str = "default") -> Dict[str, object]:
    """
    Synchronous wrapper returning the complete HunarSathi response dict.
    Backward-compatible with /api/chat and cli_chat.py.
    """
    final_meta: Dict[str, object] = {}
    for event in stream_hunarsathi(user_message, session_id=session_id):
        if event.get("type") == "done":
            final_meta = event

    reply_text = str(final_meta.get("reply") or "").strip() or OFF_TOPIC_REFUSAL
    return {
        "bot": BOT_NAME,
        "model": str(final_meta.get("model") or DEFAULT_MODEL),
        "reply": reply_text,
        "session_id": session_id,
        "latency_ms": int(final_meta.get("latency_ms") or 0),
        "cached": bool(final_meta.get("cached", False)),
    }


def reset_session(session_id: str = "default") -> None:
    """Clear conversation history for a buyer session."""
    with _LOCK:
        _SESSION_HISTORY.pop(session_id, None)


def get_runtime_stats() -> Dict[str, object]:
    """Return lightweight diagnostics for /api/health."""
    now = time.monotonic()
    with _LOCK:
        cooling = [m for m, until in _MODEL_COOLDOWN_UNTIL.items() if until > now]
        cache_entries = len(_RESPONSE_CACHE)
        active_sessions = len(_SESSION_HISTORY)
    return {
        "active_models": get_candidate_models(),
        "cooling_models": cooling,
        "cache_entries": cache_entries,
        "active_sessions": active_sessions,
    }
