
import sys, os
from collections import deque
import numpy as np
from PIL import Image

COLORS = {
 "pink":(240,110,170),"magenta":(220,60,140),"purple":(150,90,210),"lavender":(200,170,230),
 "blue":(70,130,220),"sky":(120,190,235),"green":(90,180,110),"lime":(150,210,90),
 "yellow":(235,200,70),"gold":(215,170,60),"orange":(235,150,80),"red":(215,70,80),
 "silver":(200,200,210),"white":(245,245,248),"black":(40,40,45),"peach":(245,180,160)
}
def color_name(rgb):
    r,g,b = rgb
    if r>235 and g>235 and b>235: return "white"
    best, bd = "silver", 1e9
    for n,(cr,cg,cb) in COLORS.items():
        d = (r-cr)**2+(g-cg)**2+(b-cb)**2
        if d < bd: bd, best = d, n
    return best

def process(img_path, out_dir, thr0=20, thr1=70, min_area=350):
    im = Image.open(img_path).convert("RGB")
    a = np.asarray(im).astype(int)
    H, W = a.shape[:2]
    corners = np.concatenate([a[:20,:20].reshape(-1,3), a[:20,-20:].reshape(-1,3), a[-20:,:20].reshape(-1,3), a[-20:,-20:].reshape(-1,3)])
    bg = np.median(corners, axis=0)
    dist = np.sqrt(((a - bg)**2).sum(axis=2))
    alpha = np.clip((dist - thr0) / (thr1 - thr0) * 255, 0, 255).astype(np.uint8)
    fg = alpha > 25
    visited = np.zeros((H,W), bool)
    count = 0
    os.makedirs(out_dir, exist_ok=True)
    for yy in range(H):
        row = fg[yy]
        for xx in range(W):
            if row[xx] and not visited[yy,xx]:
                q = deque([(yy,xx)]); visited[yy,xx] = True
                pix = []
                while q:
                    y,x = q.popleft(); pix.append((y,x))
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx_ = y+dy,x+dx
                        if 0<=ny<H and 0<=nx_<W and fg[ny,nx_] and not visited[ny,nx_]:
                            visited[ny,nx_] = True; q.append((ny,nx_))
                if len(pix) < min_area: continue
                ys = [p[0] for p in pix]; xs = [p[1] for p in pix]
                y0,y1,x0,x1 = max(min(ys)-3,0), min(max(ys)+4,H), max(min(xs)-3,0), min(max(xs)+4,W)
                sub_a = alpha[y0:y1, x0:x1].copy()
                m = np.zeros((H,W), bool)
                for (py,px_) in pix: m[py,px_] = True
                sub_m = m[y0:y1, x0:x1]
                sub_a[~sub_m] = 0
                rgbm = a[y0:y1, x0:x1]
                med = np.median(rgbm[sub_m], axis=0).astype(int)
                cname = color_name(med)
                count += 1
                name = f"gem-{cname}-{count:03d}.png"
                rgba = np.dstack([rgbm.astype(np.uint8), sub_a])
                Image.fromarray(rgba, "RGBA").save(os.path.join(out_dir, name))
    return count

src = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/钻石素材-原图"
outbase = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/钻石素材-单颗"
for fname, sub, t0 in [("素材图2-插画水钻(白底).png","插画水钻(白底)",28),("素材图1-真实水钻散落(灰底).png","真实水钻(灰底)",16)]:
    p = os.path.join(src, fname)
    arr = np.asarray(Image.open(p).convert("RGB"))
    if arr.mean() < 25:
        print(fname, "-> skipped (nearly black)"); continue
    n = process(p, os.path.join(outbase, sub), thr0=t0)
    print(fname, "-> gems:", n)
