
import os
from PIL import Image
d = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/钻石画作品参考"
files = sorted(f for f in os.listdir(d) if f.lower().endswith((".jpg",".png",".jpeg")))
cols, cell = 5, 220
rows = (len(files)+cols-1)//cols
sheet = Image.new("RGB", (cols*cell, rows*cell), (245,242,250))
from PIL import ImageDraw
draw = ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im = Image.open(os.path.join(d,f)).convert("RGB")
    im.thumbnail((cell-10, cell-26))
    x = (i%cols)*cell; y = (i//cols)*cell
    sheet.paste(im, (x+(cell-im.width)//2, y+(cell-24-im.height)//2))
    draw.text((x+6, y+cell-20), str(i)+": "+f[:18]+"...", fill=(80,60,110))
out = "/Users/xiaoaijiang/Desktop/Cursor/小游戏/钻石拼贴/素材库/钻石画作品参考/_总览.png"
sheet.save(out)
print(len(files), "refs ->", out)
