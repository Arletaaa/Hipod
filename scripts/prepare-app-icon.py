"""从设计稿生成应用图标与开屏素材（可重复运行）。

设计稿：`assets/brand/icon-source.png`（3D 黑轮盘 + 白色中键 + 金色音符）。

用法：
    python scripts/prepare-app-icon.py

产物（assets/images/）：
    icon.png                      1024  应用图标（保留设计稿的白色底与投影）
    android-icon-foreground.png   1024  自适应图标前景（抠掉外层白底，缩到安全区）
    android-icon-background.png   1024  自适应图标背景（近白微渐变）
    android-icon-monochrome.png   1024  单色图标（轮盘剪影 + 音符挖空）
    splash-icon.png                512  开屏图标（透明底）
    favicon.png                     48  Web 图标

抠图要点：**不能按亮度去白**——中键与 MENU/箭头/音符都是白色，
只把从画布边缘能连通到的白色区域设为透明（flood fill），内部白色一律保留。
"""

from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "brand", "icon-source.png")
OUT_DIR = os.path.join(ROOT, "assets", "images")

ICON_SIZE = 1024
SPLASH_SIZE = 512
# 自适应图标安全区：系统会裁掉外圈，前景内容控制在画布 ~60%
FOREGROUND_RATIO = 0.60
# 开屏图标相对画布占比
SPLASH_RATIO = 0.92


def _luma(rgb: np.ndarray) -> np.ndarray:
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def outer_background_mask(rgb: np.ndarray, scale: int = 4) -> np.ndarray:
    """求「与画布边界连通的浅色背景」掩膜。

    不能用 PIL 的 ImageDraw.floodfill：它的 thresh 是相对**填充值**而不是种子值
    （实测填充 0 像素）。这里用形态学重建（迭代膨胀 ∩ 候选）自己实现，
    并在 1/scale 分辨率上做，避免上千次全尺寸迭代。
    """
    h, w = rgb.shape[:2]
    lum = _luma(rgb)
    small = np.asarray(
        Image.fromarray(lum.astype(np.uint8), mode="L").resize(
            (max(1, w // scale), max(1, h // scale)), Image.BILINEAR
        )
    ).astype(np.float32)
    cand = small > 198

    cur = np.zeros_like(cand)
    cur[0, :] |= cand[0, :]
    cur[-1, :] |= cand[-1, :]
    cur[:, 0] |= cand[:, 0]
    cur[:, -1] |= cand[:, -1]
    while True:
        nxt = cur.copy()
        nxt[1:, :] |= cur[:-1, :]
        nxt[:-1, :] |= cur[1:, :]
        nxt[:, 1:] |= cur[:, :-1]
        nxt[:, :-1] |= cur[:, 1:]
        nxt &= cand
        if np.array_equal(nxt, cur):
            break
        cur = nxt

    grown = np.asarray(
        Image.fromarray((cur * 255).astype(np.uint8), mode="L").resize((w, h), Image.NEAREST)
    )
    # 放回全分辨率后再用亮度约束一次，避免膨胀溢出到主体边缘
    return (grown > 127) & (lum > 190)


def cut_out_background(img: Image.Image) -> Image.Image:
    """把与画布边缘连通的浅色背景（含柔和投影）抠成透明，内部白色一律保留。"""
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba)
    outside = outer_background_mask(arr[..., :3].astype(np.float32))

    out_arr = arr.copy()
    out_arr[..., 3] = np.where(outside, 0, 255).astype(np.uint8)
    out = Image.fromarray(out_arr, mode="RGBA")
    out.putalpha(out.split()[3].filter(ImageFilter.GaussianBlur(0.8)))
    return out


def subject_box(img: Image.Image, alpha_threshold: int = 200) -> tuple[int, int, int, int]:
    """取不透明主体的包围盒。"""
    a = np.asarray(img.split()[3])
    ys, xs = np.where(a > alpha_threshold)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def silver_white_background(size: int, top=(255, 255, 255), bottom=(243, 243, 245)) -> Image.Image:
    """近白微渐变（保持设计稿的白色基调，但不至于纯平）。"""
    strip = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(1, size - 1)
        strip.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return strip.resize((size, size), Image.BILINEAR).convert("RGBA")


def make_icon(source: Image.Image) -> Image.Image:
    """应用图标：直接用设计稿构图（白底 + 轮盘 + 投影）。"""
    return source.convert("RGBA").resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)


def make_foreground(cutout: Image.Image, box) -> Image.Image:
    """自适应前景：抠图后按安全区比例居中放置。"""
    subject = cutout.crop(box)
    target = int(ICON_SIZE * FOREGROUND_RATIO)
    scale = target / max(subject.size)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.LANCZOS
    )
    canvas = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(
        subject, ((ICON_SIZE - subject.width) // 2, (ICON_SIZE - subject.height) // 2)
    )
    return canvas


def make_splash(cutout: Image.Image, box) -> Image.Image:
    subject = cutout.crop(box)
    target = int(SPLASH_SIZE * SPLASH_RATIO)
    scale = target / max(subject.size)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.LANCZOS
    )
    canvas = Image.new("RGBA", (SPLASH_SIZE, SPLASH_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(
        subject, ((SPLASH_SIZE - subject.width) // 2, (SPLASH_SIZE - subject.height) // 2)
    )
    return canvas


def make_monochrome(source: Image.Image) -> Image.Image:
    """单色图标：暗部（轮盘）取椭圆剪影，音符位置挖空。"""
    rgb = np.asarray(source.convert("RGB")).astype(np.int16)
    dark = rgb.max(axis=2) < 120
    ys, xs = np.where(dark)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())

    canvas = Image.new("RGBA", source.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    # 缩放后统一到 1024 画布：先把剪影画在原尺寸，再整体缩放
    draw.ellipse((x0, y0, x1, y1), fill=(255, 255, 255, 255))

    # 金色音符 → 挖空（略微膨胀，保证小尺寸下也能看清）
    gold = (
        (rgb[..., 0] > 150)
        & (rgb[..., 1] > 100)
        & (rgb[..., 2] < 130)
        & ((rgb[..., 0] - rgb[..., 2]) > 50)
    ).astype(np.uint8) * 255
    gold_img = Image.fromarray(gold, mode="L").filter(ImageFilter.MaxFilter(9))
    hole = Image.new("L", source.size, 0)
    hole.paste(gold_img, (0, 0))
    canvas.putalpha(Image.composite(Image.new("L", canvas.size, 0), canvas.split()[3], hole))

    target = int(ICON_SIZE * FOREGROUND_RATIO)
    scale = target / max(canvas.size)
    resized = canvas.resize(
        (max(1, round(canvas.width * scale)), max(1, round(canvas.height * scale))), Image.LANCZOS
    )
    out = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    out.alpha_composite(resized, ((ICON_SIZE - resized.width) // 2, (ICON_SIZE - resized.height) // 2))
    return out


def main() -> None:
    if not os.path.exists(SRC):
        raise SystemExit(f"找不到设计稿：{SRC}")
    source = Image.open(SRC).convert("RGBA")
    cutout = cut_out_background(source)
    box = subject_box(cutout)

    items = {
        "icon.png": make_icon(source),
        "android-icon-foreground.png": make_foreground(cutout, box),
        "android-icon-background.png": silver_white_background(ICON_SIZE),
        "android-icon-monochrome.png": make_monochrome(source),
        "splash-icon.png": make_splash(cutout, box),
        "favicon.png": make_icon(source).resize((48, 48), Image.LANCZOS),
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, img in items.items():
        path = os.path.join(OUT_DIR, name)
        img.save(path, optimize=True)
        print(f"  {name:32s} {img.size[0]}x{img.size[1]}  {os.path.getsize(path) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
