
import os, json
base = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/钻石素材-单颗"
items = []
for sub, tag in [("插画水钻(白底)","i"), ("真实水钻(灰底)","r")]:
    d = os.path.join(base, sub)
    for f in sorted(os.listdir(d)):
        if not f.endswith(".png"): continue
        color = f.split("-")[1]
        from PIL import Image
        w, h = Image.open(os.path.join(d, f)).size
        items.append({"file": sub + "/" + f, "color": color, "w": w, "h": h})
PACKS = {
  "purple": ["purple", "lavender"],
  "blue": ["blue", "sky"],
  "gold": ["gold", "yellow"],
  "pink": ["pink", "magenta", "peach"],
  "green": ["green", "lime"],
  "red": ["red"],
  "silver": ["silver", "white"],
}
packs = {k: [] for k in PACKS}
for it in items:
    for pk, colors in PACKS.items():
        if it["color"] in colors:
            packs[pk].append(it["file"]); break
out = {"version": 1, "total": len(items), "gems": items, "packs": packs}
p = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/模板库/gems-manifest.json"
json.dump(out, open(p, "w"), ensure_ascii=False, indent=1)
print("total gems:", len(items))
for k, v in packs.items(): print(" pack", k, ":", len(v))
