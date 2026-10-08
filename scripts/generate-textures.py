"""材质贴图生成器（程序化、可重复运行）。

用法（需要 Pillow + numpy）：
    python scripts/generate-textures.py

输出到 assets/textures/，全部为无缝可平铺贴图：

- silicone-grain.png  哑光硅胶颗粒：透明底 + 极淡黑白斑点（旋转时可见颗粒随动）
- brushed-metal.png   阳极氧化铝拉丝：横向细纹 + 低频明暗起伏
- sheen.png           柔和高光：径向衰减光斑，用于金属/玻璃上被陀螺仪驱动移动的高光
- glass-streak.png    屏幕玻璃反射：斜向柔光带
- noise-overlay.png   整机细微噪点：消除渐变色带、增加真实感

说明：react-native-svg 15 在 Android 上未实现 feTurbulence（源码调用
warnUnimplementedFilter），因此颗粒/拉丝这类程序化纹理只能用位图。
"""

from __future__ import annotations

import os

import numpy as np
from PIL import Image, ImageFilter

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "textures")
RNG = np.random.default_rng(20261008)  # 固定种子，保证可复现


def _save(img: Image.Image, name: str) -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    img.save(path, optimize=True)
    print(f"  {name:24s} {img.size[0]}x{img.size[1]}  {os.path.getsize(path) / 1024:.1f} KB")


def _wrap_blur(arr: np.ndarray, radius: float) -> np.ndarray:
    """环绕模糊，保证结果在平铺时接缝不可见。"""
    img = Image.fromarray(arr.astype(np.uint8), mode="L")
    # 先四方向平铺再模糊再裁中心，等效于环绕卷积
    tiled = Image.new("L", (arr.shape[1] * 3, arr.shape[0] * 3))
    for dx in range(3):
        for dy in range(3):
            tiled.paste(img, (dx * arr.shape[1], dy * arr.shape[0]))
    blurred = tiled.filter(ImageFilter.GaussianBlur(radius))
    w, h = arr.shape[1], arr.shape[0]
    return np.asarray(blurred.crop((w, h, w * 2, h * 2)), dtype=np.float32)


def make_silicone_grain(size: int = 256) -> Image.Image:
    """哑光硅胶颗粒：细密、低对比、无缝。"""
    fine = RNG.normal(0.0, 1.0, (size, size))
    medium = _wrap_blur((RNG.normal(0.0, 1.0, (size, size)) * 40 + 128), 0.9)
    mid = (medium - 128.0) / 40.0

    value = fine * 0.75 + mid * 0.55
    value = np.clip(value, -3.0, 3.0) / 3.0  # 归一到 [-1,1]

    # 亮斑点（白）与暗斑点（黑）分别给 alpha，形成"颗粒"而非单纯噪声
    light_alpha = np.clip(value, 0, 1) ** 1.25 * 46.0
    dark_alpha = np.clip(-value, 0, 1) ** 1.25 * 52.0

    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    is_light = value >= 0
    rgba[..., 0] = np.where(is_light, 255, 0)
    rgba[..., 1] = np.where(is_light, 255, 0)
    rgba[..., 2] = np.where(is_light, 255, 0)
    rgba[..., 3] = np.where(is_light, light_alpha, dark_alpha).astype(np.uint8)
    return Image.fromarray(rgba, mode="RGBA")


def make_brushed_metal(width: int = 512, height: int = 512) -> Image.Image:
    """阳极氧化铝拉丝：横向细纹（每行一个亮度，横向平铺天然无缝）。"""
    rows = RNG.normal(0.0, 1.0, height)
    fine = RNG.normal(0.0, 1.0, (height, width))
    # 低频起伏：让拉丝有疏密变化
    low = _wrap_blur((RNG.normal(0.0, 1.0, (height, 8)) * 30 + 128), 1.2)[:, :1]
    low = np.repeat(low, width, axis=1)
    low = (low - 128.0) / 30.0

    streak = rows[:, None] * 0.9 + fine * 0.35 + low * 0.8
    streak = np.clip(streak, -3.2, 3.2) / 3.2

    light_alpha = np.clip(streak, 0, 1) ** 1.2 * 20.0
    dark_alpha = np.clip(-streak, 0, 1) ** 1.2 * 22.0

    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    is_light = streak >= 0
    rgb = np.where(is_light, 255, 0)
    rgba[..., 0] = rgb
    rgba[..., 1] = rgb
    rgba[..., 2] = rgb
    rgba[..., 3] = np.where(is_light, light_alpha, dark_alpha).astype(np.uint8)
    return Image.fromarray(rgba, mode="RGBA")


def make_sheen(size: int = 256, peak: float = 0.55) -> Image.Image:
    """柔和高光光斑：中心亮、边缘完全透明（用于被光照驱动的移动高光）。"""
    yy, xx = np.mgrid[0:size, 0:size]
    cx = cy = (size - 1) / 2.0
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (size / 2.0)
    falloff = np.clip(1.0 - r, 0.0, 1.0) ** 2.2
    alpha = (falloff * peak * 255.0).astype(np.uint8)
    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    rgba[..., 0:3] = 255
    rgba[..., 3] = alpha
    return Image.fromarray(rgba, mode="RGBA")


def make_glass_streak(size: int = 512) -> Image.Image:
    """屏幕玻璃反射：斜向柔光带。"""
    yy, xx = np.mgrid[0:size, 0:size]
    # 与水平成 ~35° 的斜向位置量
    pos = (xx * 0.82 + yy * 0.57) / size
    band = np.exp(-((pos - 0.38) ** 2) / (2 * 0.055**2))
    band *= 0.35 + 0.65 * np.clip(1.0 - yy / size * 1.2, 0.0, 1.0)  # 越靠下越弱
    alpha = (np.clip(band, 0, 1) * 46.0).astype(np.uint8)
    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    rgba[..., 0:3] = 255
    rgba[..., 3] = alpha
    img = Image.fromarray(rgba, mode="RGBA")
    return img.filter(ImageFilter.GaussianBlur(6))


def make_noise_overlay(size: int = 128, peak: float = 7.0) -> Image.Image:
    """极淡全表面噪点：消除大面积渐变的色带。"""
    v = RNG.normal(0.0, 1.0, (size, size))
    v = np.clip(v, -2.6, 2.6) / 2.6
    alpha = (np.abs(v) * peak).astype(np.uint8)
    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    is_light = v >= 0
    gray = np.where(is_light, 255, 0).astype(np.uint8)[..., None]
    rgba[..., 0:3] = np.repeat(gray, 3, axis=2)
    rgba[..., 3] = alpha
    return Image.fromarray(rgba, mode="RGBA")


def main() -> None:
    print("生成材质贴图 →", OUT_DIR)
    _save(make_silicone_grain(), "silicone-grain.png")
    _save(make_brushed_metal(), "brushed-metal.png")
    _save(make_sheen(), "sheen.png")
    _save(make_glass_streak(), "glass-streak.png")
    _save(make_noise_overlay(), "noise-overlay.png")
    print("完成。")


if __name__ == "__main__":
    main()
