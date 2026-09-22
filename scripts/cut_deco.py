
import os
from collections import deque
import numpy as np
from PIL import Image

src = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/可爱元素-原图"
out = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/可爱元素-单颗"

def cut(img_path, out_dir, mode, min_area=250, crop_bottom=0.0):
    im = Image.open(img_path).convert("RGB")
    if crop_bottom > 0:
        w, h = im.size
        im = im.crop((0, 0, w, int(h * (1 - crop_bottom))))
    a = np.asarray(im).astype(int)
    H, W = a.shape[:2]
    if mode == "dark-bg":
        lum = a.mean(axis=2)
        alpha = np.clip((lum - 28) / 40 * 255, 0, 255).astype(np.uint8)
    else:
        corners = np.concatenate([a[:15,:15].reshape(-1,3), a[:15,-15:].reshape(-1,3), a[-15,:15].reshape(1,3) if False else a[-15:,:15].reshape(-1,3)])
        bg = np.median(corners, axis=0)
        dist = np.sqrt(((a - bg)**2).sum(axis=2))
        alpha = np.clip((dist - 22) / 55 * 255, 0, 255).astype(np.uint8)
    fg = alpha > 30
    visited = np.zeros((H,W), bool)
    count = 0
    os.makedirs(out_dir, exist_ok=True)
    for yy in range(H):
        for xx in range(W):
            if fg[yy,xx] and not visited[yy,xx]:
                q = deque([(yy,xx)]); visited[yy,xx]=True
                pix=[]
                while q:
                    y,x = q.popleft(); pix.append((y,x))
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx_=y+dy,x+dx
                        if 0<=ny<H and 0<=nx_<W and fg[ny,nx_] and not visited[ny,nx_]:
                            visited[ny,nx_]=True; q.append((ny,nx_))
                if len(pix) < min_area: continue
                ys=[p[0] for p in pix]; xs=[p[1] for p in pix]
                y0,y1,x0,x1 = max(min(ys)-2,0), min(max(ys)+3,H), max(min(xs)-2,0), min(max(xs)+3,W)
                sub_a = alpha[y0:y1, x0:x1].copy()
                m = np.zeros((H,W), bool)
                for (py,px_) in pix: m[py,px_]=True
                sub_a[~m[y0:y1,x0:x1]] = 0
                count += 1
                rgba = np.dstack([a[y0:y1,x0:x1].astype(np.uint8), sub_a])
                Image.fromarray(rgba,"RGBA").save(os.path.join(out_dir, f"deco-{count:03d}.png"))
    return count

jobs = [
 ("可爱元素2-像素爱心条(黑底).png","像素爱心条","dark-bg",400,0),
 ("可爱元素3-粉紫像素图标(黑底).png","像素图标粉紫","dark-bg",250,0),
 ("可爱元素4-蓝紫像素图标(黑底).png","像素图标蓝紫","dark-bg",250,0),
 ("可爱元素1-粉色游戏按钮集(白底).png","粉色按钮","light-bg",800,0.08),
]
for f, sub, mode, ma, cb in jobs:
    n = cut(os.path.join(src,f), os.path.join(out,sub), mode, ma, cb)
    print(sub, "->", n)
