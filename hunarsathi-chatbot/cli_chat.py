"""
Interactive Streaming Terminal Runner for HunarSathi.
Run: python cli_chat.py
"""

from chatbot import BOT_NAME, get_candidate_models, reset_session, stream_hunarsathi, warmup_client


def main():
    warmup_client()
    active = get_candidate_models()
    print("=" * 64)
    print(f"  {BOT_NAME} — HunarLink Fast Streaming Assistant ({active[0] if active else 'auto'})")
    print("  Ask anything about HunarLink crafts, GI tags, prices, wholesale & orders.")
    print("  Type 'reset' to clear chat, or 'exit' to quit.")
    print("=" * 64)

    session_id = "cli-buyer"
    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n{BOT_NAME}: Shukriya! Visit HunarLink anytime.")
            break

        if not user_input:
            continue
        if user_input.lower() in {"exit", "quit"}:
            print(f"{BOT_NAME}: Shukriya! Happy exploring Kashmiri heritage on HunarLink.")
            break
        if user_input.lower() == "reset":
            reset_session(session_id)
            print(f"{BOT_NAME}: Chat history cleared. How can I help you with HunarLink?")
            continue

        try:
            print(f"\n{BOT_NAME}: ", end="", flush=True)
            latency_ms = 0
            for evt in stream_hunarsathi(user_input, session_id=session_id):
                if evt.get("type") == "chunk":
                    print(evt.get("text", ""), end="", flush=True)
                elif evt.get("type") == "done":
                    latency_ms = int(evt.get("latency_ms") or 0)
            print(f"\n  [{latency_ms / 1000:.2f}s]")
        except Exception as err:
            print(f"\n[Error] {err}")


if __name__ == "__main__":
    main()
