"""Local-only image production queue. Credentials stay in environment variables."""
import asyncio
import json
import os
from pathlib import Path
import re
import sys

from openai import AsyncOpenAI

ROOT = Path(__file__).resolve().parent
DOC = ROOT.parents[3] / "docs" / "reigns-assets" / "01-event-card-characters.md"
STYLE = " Single original fictional character, head and shoulders, big head, crisp square pixels, 16 colors max, flat shading, no gradients, no text, no logos, no watermark, simple flat dark navy background, square composition."
JOBS = [
    "npc-newbie", "npc-researcher", "npc-mentor", "npc-stranger", "npc-market-ticker",
    "npc-client-manager", "npc-fund-cio", "npc-fund-sales-director", "npc-fund-boss",
    "npc-fund-compliance", "npc-crypto-anon-dev", "npc-crypto-kol",
    "npc-crypto-onchain-analyst", "npc-crypto-chain-feed", "npc-stock-auntie",
    "npc-stock-screen-watcher", "npc-stock-veteran", "self-fund", "self-crypto", "self-stock",
]


def prompt_for(character):
    text = DOC.read_text(encoding="utf-8")
    match = re.search(rf"\*\*{re.escape(character)}[^*]*\*\*\s*```\s*(.*?)```", text, re.S)
    if not match:
        raise ValueError(f"No prompt for {character}")
    return match.group(1).strip() + STYLE


async def main():
    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("Set OPENAI_API_KEY and OPENAI_BASE_URL in the local shell only")
    client = AsyncOpenAI()
    semaphore = asyncio.Semaphore(20)

    async def generate(character):
        output = ROOT / "_source" / f"{character}-neutral.png"
        if output.exists():
            print(f"skip {character}", flush=True)
            return
        async with semaphore:
            print(f"start {character}", flush=True)
            result = await client.images.generate(model="gpt-image-2.5", prompt=prompt_for(character), size="1024x1024", quality="medium")
            output.parent.mkdir(exist_ok=True)
            import base64
            output.write_bytes(base64.b64decode(result.data[0].b64_json))
            print(f"done {character}", flush=True)

    results = await asyncio.gather(*(generate(job) for job in JOBS), return_exceptions=True)
    errors = [str(error) for error in results if isinstance(error, Exception)]
    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
