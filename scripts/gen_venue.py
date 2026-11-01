#!/usr/bin/env python3
"""
gen_venue.py — 程序化生成原创球场夜景背景 public/data/venue.png

俯视碗状球场,几何与 pitch.svg 球场板实测对齐:
  画布 1485x1050 (= 297:210 与 .field-wrap 同比例,1:1 叠加)
  球场板: 中心 x≈706, 后缘 y≈328, 前缘 y≈570, 板底色 #24284b
全部内容为程序生成(随机人群噪声/渐变/辉光),无第三方素材。
重新生成: python3 scripts/gen_venue.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1485, 1050
CX = 706  # 球场板中心
OUT = "public/data/venue.png"
rng = np.random.default_rng(20261023)


def qbez(p0, p1, p2, n=80):
    t = np.linspace(0, 1, n)[:, None]
    return ((1 - t) ** 2) * np.array(p0) + 2 * t * (1 - t) * np.array(p1) + t ** 2 * np.array(p2)


def vgrad(w, h, top, bottom):
    """垂直渐变 RGB float 数组"""
    t = np.linspace(0, 1, h)[:, None, None]
    return np.array(top) * (1 - t) + np.array(bottom) * t * np.ones((h, w, 3))


def mask_of(polys):
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([tuple(pt) for pt in p], fill=255)
    return np.array(m, dtype=bool)


# ---------- 几何 ----------
C1 = qbez((-20, 115), (CX, 205), (1505, 115))       # 屋顶下缘/灯带
C2 = qbez((-20, 210), (CX, 320), (1505, 210))       # 上层看台下缘/LED 环
APRON = [(340, 322), (1070, 322), (1275, 592), (140, 592)]

roof_poly = [(-20, 0), (1505, 0)] + [tuple(p) for p in C1[::-1]]
upper_poly = list(map(tuple, C1)) + list(map(tuple, C2[::-1]))
farlow_poly = (list(map(tuple, C2)) + [(1505, 460)]
               + [tuple(p) for p in qbez((1505, 460), (1240, 400), (1070, 322))]
               + [(340, 322)]
               + [tuple(p) for p in qbez((340, 322), (240, 400), (-20, 460))])
side_r = ([tuple(p) for p in qbez((1505, 460), (1240, 400), (1070, 322))]
          + [(1275, 592)] + [tuple(p) for p in qbez((1275, 592), (1400, 665), (1505, 715))])
side_l = ([tuple(p) for p in qbez((-20, 460), (240, 400), (340, 322))]
          + [(140, 592)] + [tuple(p) for p in qbez((140, 592), (60, 665), (-20, 715))])
strip_top = ([tuple(p) for p in qbez((-20, 715), (60, 665), (140, 592))]
             + [(1275, 592)] + [tuple(p) for p in qbez((1275, 592), (1400, 665), (1505, 715))])
strip_bot = ([tuple(p) for p in qbez((-20, 743), (60, 693), (140, 620))]
             + [(1275, 620)] + [tuple(p) for p in qbez((1275, 620), (1400, 693), (1505, 743))])
strip_poly = strip_top + strip_bot[::-1]
fore_poly = strip_bot + [(1505, H + 20), (-20, H + 20)]

MASK_UPPER = mask_of([upper_poly])
MASK_FARLOW = mask_of([farlow_poly])
MASK_SIDE = mask_of([side_l, side_r])
MASK_APRON = mask_of([APRON])
MASK_STRIP = mask_of([strip_poly])
MASK_FORE = mask_of([fore_poly])

# ---------- 底色 ----------
img = vgrad(W, H, (4, 7, 15), (10, 18, 38))  # 夜空

def blend_region(base, mask, grad_top, grad_bot):
    g = vgrad(W, H, grad_top, grad_bot)
    base[mask] = g[mask]

blend_region(img, mask_of([roof_poly]), (20, 29, 54), (31, 44, 78))
blend_region(img, MASK_UPPER, (28, 39, 69), (21, 31, 58))
blend_region(img, MASK_FARLOW, (24, 34, 57), (18, 27, 48))
blend_region(img, MASK_SIDE, (21, 30, 51), (14, 22, 38))
blend_region(img, MASK_APRON, (39, 44, 80), (29, 33, 56))   # 与 pitch 板底色一致
blend_region(img, MASK_FORE, (16, 24, 44), (5, 8, 15))

# ---------- 人群 ----------
def crowd(base, mask, density, rmin, rmax, row_period, dark=(0, 0, 0), bright=120, sparkle=0.012, warm=0.08):
    """在看台区域撒不规则人群点: 颜色随机偏蓝+少量暖色, 零星手机闪光; 正弦排椅密度"""
    ys, xs = np.nonzero(mask)
    n = int(len(xs) * density)
    idx = rng.choice(len(xs), size=min(n * 3, len(xs)), replace=True)
    x, y = xs[idx], ys[idx]
    band = 0.65 + 0.35 * np.sin(2 * np.pi * y / row_period)
    keep = rng.random(len(x)) < band
    x, y = x[keep][:n], y[keep][:n]
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for xi, yi in zip(x, y):
        r = rng.uniform(rmin, rmax)
        u = rng.random()
        if u < sparkle:  # 手机/相机闪光(小而亮)
            r *= 0.55
            c = (230, 240, 255) if rng.random() < 0.7 else (255, 224, 138)
            a = int(rng.uniform(190, 240))
        elif u < sparkle + warm:  # 暖色衣服
            b = rng.uniform(0.3, 1)
            c = (int(dark[0] + b * bright * 0.95),
                 int(dark[1] + b * bright * 0.7),
                 int(dark[2] + b * bright * 0.5))
            a = int(rng.uniform(170, 240))
        else:
            b = rng.uniform(0, 1)
            c = (int(dark[0] + b * bright * 0.55),
                 int(dark[1] + b * bright * 0.7),
                 int(dark[2] + b * bright))
            a = int(rng.uniform(170, 245))
        d.ellipse([xi - r, yi - r, xi + r, yi + r], fill=(*c, a))
    ov = ov.filter(ImageFilter.GaussianBlur(0.5))
    arr = np.array(ov).astype(float)
    alpha = arr[..., 3:4] / 255.0
    base[:] = arr[..., :3] * alpha + base * (1 - alpha)

crowd(img, MASK_UPPER, 0.10, 0.7, 1.4, 7, bright=150)
crowd(img, MASK_FARLOW, 0.09, 0.8, 1.6, 8, bright=140)
crowd(img, MASK_SIDE, 0.05, 1.1, 2.1, 11, bright=115)
crowd(img, MASK_FORE, 0.02, 1.8, 3.4, 18, bright=85, sparkle=0.006)

# ---------- 发光元素(单独图层 + 模糊) ----------
glow = Image.new("RGB", (W, H), (0, 0, 0))
g = ImageDraw.Draw(glow)

def glow_curve(pts, width, color, blur, alpha=1.0):
    layer = Image.new("RGB", (W, H), (0, 0, 0))
    dd = ImageDraw.Draw(layer)
    dd.line([tuple(p) for p in pts], fill=tuple(int(c * alpha) for c in color), width=width, joint="curve")
    return layer.filter(ImageFilter.GaussianBlur(blur))

# 泛光灯带(屋顶下缘)
glow_arr = np.array(glow_curve(C1, 4, (225, 238, 255), 5)).astype(float)
glow_arr += np.array(glow_curve(C1, 10, (150, 180, 240), 14, 0.5)).astype(float)
# 灯位亮点
for t in (0.08, 0.24, 0.4, 0.56, 0.72, 0.88):
    p = qbez((-20, 115), (CX, 205), (1505, 115), 200)[int(t * 199)]
    lamp = Image.new("RGB", (W, H), (0, 0, 0))
    ImageDraw.Draw(lamp).ellipse([p[0] - 42, p[1] - 10, p[0] + 42, p[1] + 10], fill=(190, 210, 250))
    glow_arr += np.array(lamp.filter(ImageFilter.GaussianBlur(14))).astype(float)

# LED 环(上层看台下缘, 彩色分段)
led_cols = [(62, 198, 255), (127, 159, 255), (200, 107, 255), (127, 159, 255)]
led = Image.new("RGB", (W, H), (0, 0, 0))
dl = ImageDraw.Draw(led)
for i in range(len(C2) - 1):
    t = i / (len(C2) - 1)
    seg = t * (len(led_cols) - 1)
    k, f = int(seg), seg - int(seg)
    c = tuple(int(led_cols[k][j] * (1 - f) + led_cols[min(k + 1, 3)][j] * f) for j in range(3))
    dl.line([tuple(C2[i]), tuple(C2[i + 1])], fill=c, width=4)
glow_arr += np.array(led).astype(float) + np.array(led.filter(ImageFilter.GaussianBlur(6))).astype(float) * 0.6

# LED 广告板(场边, 蓝色渐变 + 分段)
board = np.zeros((H, W, 3))
xg = np.linspace(0, 1, W)[None, :, None]
board_col = np.array([11, 63, 143]) * (1 - xg) + np.array([90, 166, 255]) * np.sin(xg * np.pi) ** 1.5 + np.array([20, 60, 130]) * xg * 0.3
board[:] = board_col
img[MASK_STRIP] = board[MASK_STRIP] * 0.9
bimg = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
db = ImageDraw.Draw(bimg)
for lx in (160, 360, 560, 708, 856, 1056, 1256):
    db.line([(lx, 592), (lx, 622)], fill=(10, 42, 94), width=2)
img = np.array(bimg).astype(float)

# ---------- 大气/收尾 ----------
# 远景气雾
haze = vgrad(W, H, (35, 55, 110), (35, 55, 110))
ha = np.clip(1 - np.arange(H) / 420, 0, 1)[:, None, None] * 0.28
img = img * (1 - ha) + haze * ha

# 球场上方灯光光池
yy, xx = np.mgrid[0:H, 0:W]
pool = np.exp(-(((xx - CX) / 520) ** 2 + ((yy - 430) / 260) ** 2)) * 26
img += pool[..., None] * np.array([0.5, 0.7, 1.0]) * MASK_APRON[..., None]

# 辉光叠加(滤色)
img = 255 - (255 - np.clip(img, 0, 255)) * (255 - np.clip(glow_arr, 0, 255)) / 255

# 暗角
r = np.sqrt(((xx - W * 0.48) / (W * 0.62)) ** 2 + ((yy - H * 0.47) / (H * 0.62)) ** 2)
img *= (1 - 0.55 * np.clip(r - 0.55, 0, None) ** 1.8)[..., None]

# 胶片颗粒
img += rng.normal(0, 2.2, (H, W, 1))

Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(OUT, optimize=True)
print("written", OUT)
