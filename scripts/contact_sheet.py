
import os
from PIL import Image
base = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/钻石素材-单颗"
for sub in ["插画水钻(白底)", "真实水钻(灰底)"]:
    d = os.path.join(base, sub)
    files = sorted(f for f in os.listdir(d) if f.endswith(".png"))
    cols, cell = 12, 72
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols*cell, rows*cell), (250,247,252))
    for i, f in enumerate(files):
        im = Image.open(os.path.join(d, f)).convert("RGBA")
        im.thumbnail((cell-8, cell-8))
        x = (i % cols) * cell + (cell - im.width)//2
        y = (i // cols) * cell + (cell - im.height)//2
        sheet.paste(im, (x, y), im)
    out = os.path.join(base, "总览-" + ("插画" if "插画" in sub else "真实") + ".png")
    sheet.save(out)
    print(sub, len(files), "gems ->", out)
