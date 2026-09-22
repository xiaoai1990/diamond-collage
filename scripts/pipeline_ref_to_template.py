"""参考图 → 可玩密铺模板 管线
用法: python3 pipeline_ref_to_template.py
规则详见 模板规范-v1.md(A/B/C 三档生成,本脚本为 B/C 档自动部分)
"""
import os, json, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CANVAS = 360
TIERS = [("L", 30), ("M", 22), ("S", 15)]
TRIALS = [60000, 40000, 24000]
CAPS = {"L": 26, "M": 34, "S": 44}

def extract_mask(img_path, roi=None, subject=None):
    im = Image.open(img_path).convert("RGB")
    if roi:
        W0, H0 = im.size
        im = im.crop((int(roi[0]*W0), int(roi[1]*H0), int(roi[2]*W0), int(roi[3]*H0)))
    a = np.asarray(im).astype(int)
    lum = a.mean(axis=2)
    bright = a[lum >= np.percentile(lum, 88)]
    bg = np.median(bright, axis=0)
    dist = np.sqrt(((a-bg)**2).sum(axis=2))
    mask = dist > 55
    m = Image.fromarray((mask*255).astype(np.uint8)).resize((CANVAS, CANVAS))
    m2 = m.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.MinFilter(15))
    m3 = m2.filter(ImageFilter.GaussianBlur(1.5))
    mask360 = np.asarray(m3) > 105
    if subject:
        sx0, sy0, sx1, sy1 = [int(v*CANVAS) for v in subject]
        box = np.zeros_like(mask360)
        box[sy0:sy1, sx0:sx1] = True
        mask360 = mask360 & box
    return mask360

def ok_spot(mask, x, y, r):
    if x-r < 2 or y-r < 2 or x+r >= CANVAS-2 or y+r >= CANVAS-2: return False
    for k in range(12):
        ang = k * math.pi / 6
        px, py = int(x + r*math.cos(ang)), int(y + r*math.sin(ang))
        if not mask[py, px]: return False
    return True

def pack(mask):
    spots = []
    for (tier, r), trials in zip(TIERS, TRIALS):
        placed = 0
        for _ in range(trials):
            x = random.uniform(r, CANVAS-r); y = random.uniform(r, CANVAS-r)
            if not mask[int(y), int(x)]: continue
            if not ok_spot(mask, x, y, r): continue
            good = True
            for s in spots:
                if math.hypot(s["x"]-x, s["y"]-y) < s["r"] + r - 3: good = False; break
            if good:
                spots.append({"x": round(x,1), "y": round(y,1), "r": r, "tier": tier}); placed += 1
            if placed >= CAPS[tier]: break
    return spots

def relax(mask, spots, iters=2):
    for _ in range(iters):
        for i, s in enumerate(spots):
            neigh = [o for j,o in enumerate(spots) if j!=i and math.hypot(o["x"]-s["x"], o["y"]-s["y"]) < s["r"]+o["r"]+14]
            if not neigh: continue
            nx = sum(o["x"] for o in neigh)/len(neigh); ny = sum(o["y"] for o in neigh)/len(neigh)
            tx, ty = s["x"]+(nx-s["x"])*0.28, s["y"]+(ny-s["y"])*0.28
            if ok_spot(mask, tx, ty, s["r"]): s["x"], s["y"] = round(tx,1), round(ty,1)
    return spots

def run(ref_path, out_dir, tpl_id, name, color_hint, roi=None, subject=None):
    mask = extract_mask(ref_path, roi, subject)
    spots = relax(mask, pack(mask))
    by = {}
    for s in spots: by[s["tier"]] = by.get(s["tier"], 0)+1
    tpl = {"id": tpl_id, "name": name, "canvas": CANVAS, "colorHint": color_hint,
           "source": os.path.basename(ref_path), "spots": spots,
           "counts": by, "total": len(spots)}
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, tpl_id + ".json"), "w") as f:
        json.dump(tpl, f, ensure_ascii=False, indent=1)
    im = Image.open(ref_path).convert("RGB")
    if roi:
        W0, H0 = im.size
        im = im.crop((int(roi[0]*W0), int(roi[1]*H0), int(roi[2]*W0), int(roi[3]*H0)))
    im = im.resize((CANVAS, CANVAS))
    dr = ImageDraw.Draw(im)
    for s in spots:
        col = (180,120,235) if s["tier"]=="L" else (240,130,190) if s["tier"]=="M" else (120,200,240)
        dr.ellipse([s["x"]-s["r"], s["y"]-s["r"], s["x"]+s["r"], s["y"]+s["r"]], outline=col, width=2)
    im.save(os.path.join(out_dir, tpl_id + "-preview.png"))
    return tpl

if __name__ == "__main__":
    ref_dir = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/钻石画作品参考"
    out = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/templates"
    jobs = [
        ("01-苹果.jpg", "apple", "apple", "red", (0.06,0.06,0.94,0.92), (0.18,0.12,0.82,0.90)),
        ("11-雨伞雨滴.jpg", "umbrella", "umbrella", "blue", (0.04,0.06,0.96,0.86), (0.12,0.10,0.88,0.95)),
        ("12-海豚.jpg", "dolphin", "dolphin", "blue", (0.10,0.10,0.80,0.70), (0.15,0.15,0.85,0.95)),
        ("10-薄荷冰淇淋.jpg", "icecream", "ice cream", "blue", (0.06,0.06,0.94,0.90), (0.15,0.10,0.85,0.95)),
        ("07-四叶草.jpg", "clover", "clover", "green", (0.08,0.11,0.62,0.72), (0.10,0.14,0.95,0.98)),
        ("13-爆米花桶.jpg", "popcorn", "pop corn", "red", (0.10,0.10,0.90,0.80), (0.12,0.10,0.90,0.98)),
    ]
    for ref, tid, nm, hint, roi, subj in jobs:
        r = run(os.path.join(ref_dir, ref), out, tid, nm, hint, roi=roi, subject=subj)
        print(tid, "spots:", r["total"], r["counts"])
