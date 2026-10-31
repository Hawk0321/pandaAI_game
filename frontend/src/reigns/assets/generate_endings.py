"""Generate ending art with GPT Image, keeping masters outside the repository."""
import asyncio
import base64
import os
from pathlib import Path
import re
import tempfile

from openai import AsyncOpenAI
from pixelate import pixelate

ROOT = Path(__file__).resolve().parent
DOC = ROOT.parents[3] / "docs" / "reigns-assets" / "02-icons-and-endings.md"
SOURCE = Path(tempfile.gettempdir()) / "panda-ending-masters"
IDS = [
    *(f"{role}-{kind}-{slot}" for role in ("fund", "crypto", "stock") for slot in ("capital", "risk", "confidence", "reputation") for kind in ("low", "high")),
    *(f"sp-{role}-{key}" for role in ("fund", "crypto", "stock") for key in (("star", "unloved", "chaser") if role == "fund" else ("allin", "moon", "paper") if role == "crypto" else ("guru", "bagholder", "hermit"))),
    "sp-inertia", "sp-obsessive", "sp-adventurer", "sp-balanced", "sp-survivor",
]


def prompts():
    text = DOC.read_text(encoding="utf-8")
    for ending in IDS:
        match = re.search(rf"\| `{re.escape(ending)}`[^\n]*\| `([^`]+)` \|", text)
        if not match:
            raise ValueError(f"Missing ending prompt: {ending}")
        yield ending, match.group(1) + " Original fictional scene, no text, no logos, no watermark."


async def main():
    client = AsyncOpenAI()
    SOURCE.mkdir(exist_ok=True)
    semaphore = asyncio.Semaphore(20)

    async def generate(ending, prompt):
        final = ROOT / "endings" / f"ending-{ending}.png"
        source = SOURCE / f"{ending}.png"
        if final.exists():
            return
        async with semaphore:
            result = await client.images.generate(model="gpt-image-2.5", prompt=prompt, size="1024x1024", quality="high")
            source.write_bytes(base64.b64decode(result.data[0].b64_json))
            pixelate(source, final, size=128, height=96, max_colors=16)
            from PIL import Image
            with Image.open(final) as image:
                image.resize((384, 288), Image.Resampling.NEAREST).save(final)
            print(f"done {ending}", flush=True)

    results = await asyncio.gather(*(generate(*item) for item in prompts()), return_exceptions=True)
    errors = [str(item) for item in results if isinstance(item, Exception)]
    if errors:
        raise RuntimeError("\n".join(errors))


if __name__ == "__main__":
    asyncio.run(main())
