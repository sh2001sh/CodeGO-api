import io
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import requests
from openai import OpenAI
from PIL import Image
from rembg import remove


ROOT = Path(__file__).resolve().parents[2]
SAMPLE_FILE = ROOT / "图.txt"
OUTPUT_DIR = ROOT / "new-api" / "web" / "default" / "public" / "pets" / "generated"
WORK_DIR = ROOT / "new-api" / "tmp" / "pet-generation"
RAW_DIR = WORK_DIR / "raw"


@dataclass(frozen=True)
class PetPrompt:
    pet_id: str
    species: str
    prompt: str


PETS: list[PetPrompt] = [
    PetPrompt(
        "spark-dog",
        "火花犬",
        "Draw a cute original pixel-art pet sprite named 火花犬, a cheerful starter fire puppy with an oversized head, asymmetrical flame-shaped ears, tiny paws, short muzzle, glowing flame tail tip, polished retro handheld RPG monster sprite, slightly goofy and highly readable, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "byte-otter",
        "字节獭",
        "Draw a cute original pixel-art pet sprite named 字节獭, a small nerdy otter mascot with a round head, tiny ears, creamy belly, flat paddle tail, hugging a keyboard keycap, retro handheld RPG monster sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "echo-cat",
        "回声猫",
        "Draw a cute original pixel-art pet sprite named 回声猫, a calm intelligent cat spirit with large triangle ears, forked tail tip, echo-wave markings on the forehead and chest, slightly smug face, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "night-owl",
        "夜巡枭",
        "Draw a cute original pixel-art pet sprite named 夜巡枭, a chubby night owl with a big masked face, glowing round eyes, tiny talons, short cloak-like wings, vigilant but cute, retro handheld RPG monster sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "mint-lizard",
        "薄荷蜥",
        "Draw a cute original pixel-art pet sprite named 薄荷蜥, an agile mint-colored fantasy lizard with leaf-like crest, curled tail tip, large clever eyes, slender small body and fresh herbal patterns, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "cocoa-boar",
        "可可豚",
        "Draw a cute original pixel-art pet sprite named 可可豚, a goofy dependable chubby boar creature with a cocoa-bean shaped body, short legs, tiny tusks, rounded ears, warm brown palette, retro handheld RPG monster sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "forge-tiger",
        "铸光虎机",
        "Draw a cute original pixel-art pet sprite named 铸光虎机, a heroic tiger cub monster with broad chest, geometric glowing stripes, forge spark markings on the forehead, thick glowing tail tip, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "contract-turtle",
        "契约龟",
        "Draw a cute original pixel-art pet sprite named 契约龟, a steady guardian turtle mascot with an ornate shell emblem, contract seal motif, soft rounded limbs, reliable friendly face, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "ribbon-fox",
        "缎带狐",
        "Draw a cute original pixel-art pet sprite named 缎带狐, an elegant fox spirit with ribbon-like fur around the neck and tail, large fluffy tail, stylish but playful expression, retro handheld RPG monster sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "gummy-shark",
        "软糖鲨",
        "Draw a cute original pixel-art pet sprite named 软糖鲨, an adorable gummy shark with oversized head, rounded fins, tiny visible teeth, jelly-like layered body and energetic expression, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "prism-slime",
        "棱团怪",
        "Draw a cute original pixel-art pet sprite named 棱团怪, a bouncy prism slime with chunky crystal bumps, translucent bright core, wide goofy eyes and a compact readable silhouette, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "lucky-bird",
        "流星啾",
        "Draw a cute original pixel-art pet sprite named 流星啾, a tiny legendary star bird with a comet-shaped crest, sparkling wing edges, trailing starlight tail and confident bright eyes, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "social-parrot",
        "联机鹦",
        "Draw a cute original pixel-art pet sprite named 联机鹦, a lively social parrot with a rounded beak, chat-bubble crest, welcoming wing pose, friendly energetic face and colorful feathers, retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "confetti-capybara",
        "彩纸豚",
        "Draw a cute original pixel-art pet sprite named 彩纸豚, a festive capybara mascot with confetti decorations, calm smile, chunky healing body and celebration vibe, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "cloud-rabbit",
        "云团兔",
        "Draw a cute original pixel-art pet sprite named 云团兔, a soft cloud rabbit with fluffy cloud-like long ears, cotton body, dreamy gentle face and misty trim details, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
    PetPrompt(
        "companion-dragon",
        "像素龙",
        "Draw a cute original pixel-art pet sprite named 像素龙, a baby guardian dragon with short horns, tiny wings, glowing chest scale, sturdy upright pose, reliable but adorable expression, polished retro handheld RPG sprite, centered on a pure solid white background, single character only, no frame, no text.",
    ),
]


def load_credentials() -> tuple[str, str]:
    if not SAMPLE_FILE.exists():
        raise FileNotFoundError(f"Missing sample file: {SAMPLE_FILE}")
    sample = SAMPLE_FILE.read_text(encoding="utf-8")
    api_key_match = re.search(r'api_key="([^"]+)"', sample)
    base_url_match = re.search(r'base_url="([^"]+)"', sample)
    if not api_key_match or not base_url_match:
        raise RuntimeError("Could not parse api_key/base_url from 图.txt")
    return api_key_match.group(1), base_url_match.group(1)


def crop_transparent(img: Image.Image, padding: int = 24) -> Image.Image:
    rgba = img.convert("RGBA")
    bbox = rgba.getbbox()
    if bbox is None:
        return rgba
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(rgba.width, bbox[2] + padding)
    bottom = min(rgba.height, bbox[3] + padding)
    return rgba.crop((left, top, right, bottom))


def square_canvas(img: Image.Image, size: int = 1024) -> Image.Image:
    rgba = img.convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ratio = min(size / rgba.width, size / rgba.height)
    target = (
        max(1, int(rgba.width * ratio * 0.86)),
        max(1, int(rgba.height * ratio * 0.86)),
    )
    resized = rgba.resize(target, Image.Resampling.LANCZOS)
    x = (size - resized.width) // 2
    y = (size - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def save_png_bytes(data: bytes, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def save_webp(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    webp = img.resize((512, 512), Image.Resampling.LANCZOS)
    webp.save(path, format="WEBP", quality=92, method=6)


def generate_one(client: OpenAI, pet: PetPrompt) -> None:
    print(f"[generate] {pet.pet_id} / {pet.species}")
    response = client.images.generate(
        model="gpt-image-2",
        prompt=pet.prompt,
        size="1024x1024",
        quality="high",
        response_format="url",
    )
    image_url = response.data[0].url
    image_bytes = requests.get(image_url, timeout=180).content

    raw_path = RAW_DIR / f"{pet.pet_id}-raw.png"
    final_path = OUTPUT_DIR / f"{pet.pet_id}.png"
    webp_path = OUTPUT_DIR / f"{pet.pet_id}.webp"
    save_png_bytes(image_bytes, raw_path)

    removed = remove(image_bytes)
    img = Image.open(io.BytesIO(removed)).convert("RGBA")
    img = crop_transparent(img)
    img = square_canvas(img, 1024)
    img.save(final_path, format="PNG")
    save_webp(img, webp_path)
    print(f"[saved] {final_path}")
    print(f"[saved] {webp_path}")


def main() -> int:
    api_key, base_url = load_credentials()
    client = OpenAI(api_key=api_key, base_url=base_url)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    for index, pet in enumerate(PETS, start=1):
        try:
            print(f"[{index}/{len(PETS)}] start")
            generate_one(client, pet)
            time.sleep(1.5)
        except Exception as error:
            print(f"[error] {pet.pet_id}: {error}", file=sys.stderr)
            return 1

    print("[done] all pet assets generated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
