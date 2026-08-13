"""Génère les cinq masters Freev et leurs masques de symbole pour le pipeline V2.7."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math

ROOT = Path(__file__).resolve().parents[1]
INCOMING = ROOT / "packages" / "freev-icon-system" / "incoming"
SIZE = 1024


def gradient_background(primary: tuple[int, int, int], secondary: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGBA", (SIZE, SIZE))
    pixels = image.load()
    for y in range(SIZE):
        for x in range(SIZE):
            mix = min(1.0, math.hypot(x - SIZE * .18, y - SIZE * .12) / (SIZE * 1.18))
            pixels[x, y] = tuple(int(primary[i] * (1 - mix) + secondary[i] * mix) for i in range(3)) + (255,)
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((170, 160, 854, 844), fill=(34, 211, 238, 42))
    return Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(90)))


def rounded_panel(image: Image.Image) -> None:
    panel = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(panel)
    draw.rounded_rectangle((116, 116, 908, 908), radius=214, fill=(7, 18, 36, 150), outline=(255, 255, 255, 48), width=10)
    draw.rounded_rectangle((154, 154, 870, 870), radius=176, outline=(34, 211, 238, 45), width=5)
    image.alpha_composite(panel)


def save_icon(name: str, symbol_drawer, colors=((4, 19, 43), (36, 14, 75))) -> None:
    image = gradient_background(*colors)
    rounded_panel(image)
    symbol = Image.new("L", (SIZE, SIZE), 0)
    symbol_drawer(ImageDraw.Draw(symbol))
    glow = Image.new("RGBA", (SIZE, SIZE), (46, 126, 255, 0))
    glow.putalpha(symbol.filter(ImageFilter.GaussianBlur(34)).point(lambda value: int(value * .65)))
    image.alpha_composite(glow)
    white = Image.new("RGBA", (SIZE, SIZE), (235, 248, 255, 0))
    white.putalpha(symbol)
    image.alpha_composite(white)
    image.save(INCOMING / f"{name}.png")
    Image.merge("RGBA", (symbol, symbol, symbol, symbol)).save(INCOMING / f"{name}.mask.png")


def qr(draw: ImageDraw.ImageDraw) -> None:
    def finder(x: int, y: int) -> None:
        draw.rounded_rectangle((x, y, x + 164, y + 164), radius=24, fill=255)
        draw.rounded_rectangle((x + 36, y + 36, x + 128, y + 128), radius=16, fill=0)
        draw.rounded_rectangle((x + 62, y + 62, x + 102, y + 102), radius=8, fill=255)
    finder(292, 292); finder(568, 292); finder(292, 568)
    for box in [(568, 568, 630, 630), (660, 568, 732, 640), (568, 674, 640, 746), (678, 682, 732, 736), (646, 646, 680, 680)]:
        draw.rounded_rectangle(box, radius=8, fill=255)


def markdown(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((246, 300, 778, 724), radius=58, outline=255, width=42)
    draw.line((326, 610, 326, 416, 414, 520, 502, 416, 502, 610), fill=255, width=42, joint="curve")
    draw.line((596, 416, 596, 586), fill=255, width=42)
    draw.polygon([(536, 548), (656, 548), (596, 626)], fill=255)


def csv(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((260, 252, 764, 772), radius=52, outline=255, width=38)
    for x in (428, 596): draw.line((x, 280, x, 744), fill=255, width=28)
    for y in (420, 580): draw.line((288, y, 736, y), fill=255, width=28)
    draw.rounded_rectangle((288, 280, 736, 392), radius=18, fill=255)


def signature(draw: ImageDraw.ImageDraw) -> None:
    points = [(250, 646), (332, 554), (394, 426), (424, 366), (442, 428), (410, 584), (398, 654), (448, 588), (500, 490), (510, 570), (536, 626), (580, 548), (620, 494), (630, 586), (668, 626), (712, 568), (770, 530)]
    draw.line(points, fill=255, width=38, joint="curve")
    draw.ellipse((230, 626, 790, 680), fill=255)


def crop(draw: ImageDraw.ImageDraw) -> None:
    draw.line((316, 250, 316, 682, 748, 682), fill=255, width=50)
    draw.line((250, 316, 682, 316, 682, 748), fill=255, width=50)
    draw.rounded_rectangle((398, 398, 596, 574), radius=24, outline=255, width=30)
    draw.ellipse((442, 430, 488, 476), fill=255)
    draw.polygon([(424, 548), (486, 486), (524, 524), (558, 486), (584, 548)], fill=255)


if __name__ == "__main__":
    INCOMING.mkdir(parents=True, exist_ok=True)
    save_icon("QR_Studio", qr, ((2, 28, 48), (10, 44, 78)))
    save_icon("Markdown_Studio", markdown, ((27, 11, 61), (58, 20, 86)))
    save_icon("CSV_Explorer", csv, ((2, 43, 42), (6, 70, 61)))
    save_icon("Signature_Studio", signature, ((49, 10, 50), (87, 18, 58)))
    save_icon("Crop_Studio", crop, ((58, 24, 7), (92, 37, 9)))
    print("Cinq sources d’icônes Freev générées.")
