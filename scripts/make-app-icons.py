"""生成应用图标与开屏素材（程序化绘制、可重复运行）。

设计：**黑色点击轮 + 中间一个音乐图标**（呼应应用内的 iPod 外观）。
用 4 倍超采样绘制再降采样，得到干净的边缘。

用法：
    python scripts/make-app-icons.py

产物（assets/images/）：
    icon.png                      1024  应用图标（不透明，银色底 + 黑轮盘）
    android-icon-foreground.png   1024  自适应图标前景（透明，轮盘缩到安全区）
    android-icon-background.png   1024  自适应图标背景（银色渐变）
    android-icon-monochrome.png   1024  单色图标（白色轮盘 + 挖空的音符）
    splash-icon.png                512  开屏图标（透明底）
    favicon.png                     48  Web 图标
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "images"
)

SS = 4  # 超采样倍数
NOTE_SCALE = 0.46  # 音符相对轮盘半径的大小
WHEEL_BLACK = (11, 11, 14, 255)
WHEEL_EDGE = (38, 38, 44, 255)
RING = (44, 44, 50, 255)
NOTE_LIGHT = (244, 244, 241, 255)
SILVER_TOP = (236, 234, 230)
SILVER_BOTTOM = (176, 174, 170)


def draw_note(
    img: Image.Image,
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    color: tuple[int, int, int, int],
) -> None:
    """双八分音符（♫）：两根符干 + 一条符杠 + 两个倾斜符头。"""
    stem_w = size * 0.14
    gap_x = size * 0.88
    stem_h = size * 1.26
    head_w = size * 0.50
    head_h = size * 0.36

    left_x = cx - gap_x / 2
    right_x = cx + gap_x / 2
    base_y = cy + size * 0.40
    top_y = base_y - stem_h

    for x in (left_x, right_x):
        draw.rectangle((x - stem_w / 2, top_y, x + stem_w / 2, base_y), fill=color)

    beam_h = size * 0.30
    draw.polygon(
        [
            (left_x - stem_w / 2, top_y),
            (right_x + stem_w / 2, top_y - size * 0.09),
            (right_x + stem_w / 2, top_y - size * 0.09 + beam_h),
            (left_x - stem_w / 2, top_y + beam_h),
        ],
        fill=color,
    )

    head = Image.new("RGBA", (max(2, int(head_w)), max(2, int(head_h))), (0, 0, 0, 0))
    ImageDraw.Draw(head).ellipse((0, 0, head.size[0] - 1, head.size[1] - 1), fill=color)
    head = head.rotate(-20, resample=Image.BICUBIC, expand=True)
    for x in (left_x, right_x):
        img.paste(head, (int(x - head.size[0] / 2), int(base_y - head.size[1] / 2)), head)


def draw_wheel(
    img: Image.Image,
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    r: float,
    note_color: tuple[int, int, int, int],
) -> None:
    """画一个点击轮：黑盘 + 中键同心环 + 顶部柔光 + 中间音符。"""
    draw.ellipse(
        (cx - r, cy - r, cx + r, cy + r),
        fill=WHEEL_BLACK,
        outline=WHEEL_EDGE,
        width=max(1, int(r * 0.02)),
    )

    r_center = r * 0.48
    draw.ellipse(
        (cx - r_center, cy - r_center, cx + r_center, cy + r_center),
        outline=RING,
        width=max(1, int(r * 0.022)),
    )

    # 顶部柔光（硅胶受光）
    for i in range(3):
        rr = r * (0.985 - i * 0.035)
        draw.arc(
            (cx - rr, cy - rr, cx + rr, cy + rr),
            start=196,
            end=252,
            fill=(255, 255, 255, 30 - i * 8),
            width=max(1, int(r * 0.03)),
        )

    draw_note(img, draw, cx, cy, r * NOTE_SCALE, note_color)


def silver_background(size: int) -> Image.Image:
    """阳极氧化铝银色渐变（与设备机身一致）。"""
    strip = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(1, size - 1)
        strip.putpixel(
            (0, y),
            tuple(int(SILVER_TOP[i] + (SILVER_BOTTOM[i] - SILVER_TOP[i]) * t) for i in range(3)),
        )
    return strip.resize((size, size), Image.BILINEAR).convert("RGBA")


def _canvas(size: int, bg):
    img = Image.new("RGBA", (size * SS, size * SS), bg)
    return img, ImageDraw.Draw(img)


def make_icon(size: int = 1024) -> Image.Image:
    img, draw = _canvas(size, (0, 0, 0, 0))
    img.alpha_composite(silver_background(size * SS))
    draw_wheel(img, draw, size * SS / 2, size * SS / 2, size * SS * 0.355, NOTE_LIGHT)
    return img.resize((size, size), Image.LANCZOS)


def make_foreground(size: int = 1024) -> Image.Image:
    """自适应图标前景：内容缩到安全区（约 60%），四周透明。"""
    img, draw = _canvas(size, (0, 0, 0, 0))
    draw_wheel(img, draw, size * SS / 2, size * SS / 2, size * SS * 0.30, NOTE_LIGHT)
    return img.resize((size, size), Image.LANCZOS)


def make_monochrome(size: int = 1024) -> Image.Image:
    """单色图标：白色轮盘，中间音符挖空（由系统着色）。"""
    img, draw = _canvas(size, (0, 0, 0, 0))
    cx = cy = size * SS / 2
    r = size * SS * 0.30
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 255))

    hole = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_note(hole, ImageDraw.Draw(hole), cx, cy, r * NOTE_SCALE, (255, 255, 255, 255))
    img.putalpha(Image.composite(Image.new("L", img.size, 0), img.split()[3], hole.split()[3]))
    return img.resize((size, size), Image.LANCZOS)


def make_splash(size: int = 512) -> Image.Image:
    img, draw = _canvas(size, (0, 0, 0, 0))
    draw_wheel(img, draw, size * SS / 2, size * SS / 2, size * SS * 0.42, NOTE_LIGHT)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    items = {
        "icon.png": make_icon(),
        "android-icon-foreground.png": make_foreground(),
        "android-icon-background.png": silver_background(1024),
        "android-icon-monochrome.png": make_monochrome(),
        "splash-icon.png": make_splash(),
        "favicon.png": make_icon(48),
    }
    for name, img in items.items():
        path = os.path.join(OUT_DIR, name)
        img.save(path, optimize=True)
        print(f"  {name:32s} {img.size[0]}x{img.size[1]}  {os.path.getsize(path) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
