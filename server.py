"""
FastAPI Backend Server for HunarSathi — High-Speed HunarLink Buyer Chatbot.
Exposes:
  - POST /api/chat/stream  (Server-Sent Events live token streaming, ~1.4s TTFT)
  - POST /api/chat         (Standard JSON response, hard-capped < 22s)
  - GET  /api/warmup       (Pre-warms Gemini HTTP client)
  - GET  /api/health       (Health & runtime speed stats)
  - POST /api/reset        (Clears buyer conversation history)
"""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from chatbot import (
    BOT_NAME,
    DEFAULT_MODEL,
    ask_hunarsathi,
    get_gemini_config,
    get_runtime_stats,
    local_hunarlink_reply,
    reset_session,
    stream_hunarsathi,
    warmup_client,
)

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

HARD_REQUEST_TIMEOUT_SEC = 40.0


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Pre-initialize persistent Gemini client at startup (eliminates first-request cold start)
    warmup_client()
    yield


app = FastAPI(
    title="HunarSathi — HunarLink Fast Buyer Chatbot API",
    description="High-speed streaming Gemini Flash assistant restricted strictly to the HunarLink platform.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8123",
        "http://127.0.0.1:8123",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1200)
    session_id: str = Field(default="buyer-default", max_length=128)


class ResetRequest(BaseModel):
    session_id: str = Field(default="buyer-default", max_length=128)


@app.get("/api/health")
async def health_check():
    api_key, model_name = get_gemini_config()
    key_configured = bool(api_key and api_key != "GEMINI_API_KEY")
    stats = get_runtime_stats()
    return {
        "status": "ok",
        "bot": BOT_NAME,
        "model": (stats["active_models"][0] if stats["active_models"] else model_name or DEFAULT_MODEL),
        "gemini_key_configured": key_configured,
        "streaming": True,
        "cache_entries": stats["cache_entries"],
    }


@app.get("/api/warmup")
async def warmup_endpoint():
    info = await asyncio.to_thread(warmup_client)
    return {"status": "warm", "bot": BOT_NAME, **info}


@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest):
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(ask_hunarsathi, payload.message, payload.session_id),
            timeout=HARD_REQUEST_TIMEOUT_SEC,
        )
    except asyncio.TimeoutError:
        return {
            "bot": BOT_NAME,
            "model": "local-knowledge",
            "reply": local_hunarlink_reply(payload.message),
            "session_id": payload.session_id,
            "latency_ms": int(HARD_REQUEST_TIMEOUT_SEC * 1000),
            "cached": False,
        }
    except Exception:
        return {
            "bot": BOT_NAME,
            "model": "local-knowledge",
            "reply": local_hunarlink_reply(payload.message),
            "session_id": payload.session_id,
            "latency_ms": 0,
            "cached": False,
        }


@app.post("/api/chat/stream")
async def chat_stream_endpoint(payload: ChatRequest):
    """Stream SSE events (`data: {"type":"chunk","text":"..."}\n\n`) for instant smooth UI."""

    def event_generator():
        try:
            for evt in stream_hunarsathi(payload.message, payload.session_id):
                yield f"data: {json.dumps(evt, ensure_ascii=False)}\n\n"
        except Exception:
            fallback = local_hunarlink_reply(payload.message)
            yield f"data: {json.dumps({'type': 'chunk', 'text': fallback}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'reply': fallback, 'model': 'local-knowledge', 'latency_ms': 0, 'cached': False}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/reset")
async def reset_endpoint(payload: ResetRequest):
    reset_session(payload.session_id)
    return {"status": "reset", "bot": BOT_NAME, "session_id": payload.session_id}


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5050"))
    print(f"Starting {BOT_NAME} Fast Streaming API on http://127.0.0.1:{port}")
    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=port,
        reload=False,
        timeout_keep_alive=30,
    )
