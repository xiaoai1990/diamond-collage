
import os
from PIL import Image
base = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/可爱元素-单颗"
for sub in ["像素爱心条","像素图标粉紫","像素图标蓝紫","粉色按钮"]:
    d = os.path.join(base, sub)
    files = sorted(f for f in os.listdir(d) if f.endswith(".png"))
    if not files: print(sub, "EMPTY"); continue
    cols, cell = 8, 90
    rows = (len(files)+cols-1)//cols
    sheet = Image.new("RGB", (cols*cell, rows*cell), (60,50,80))
    for i,f in enumerate(files):
        im = Image.open(os.path.join(d,f)).convert("RGBA")
        im.thumbnail((cell-10,cell-10))
        sheet.paste(im, ((i%cols)*cell+(cell-im.width)//2, (i//cols)*cell+(cell-im.height)//2), im)
    out = os.path.join(base, "总览-"+sub+".png")
    sheet.save(out)
    print(sub, len(files))
