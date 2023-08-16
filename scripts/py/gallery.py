from ascii_magic import AsciiArt
import asyncio
from pyodide.http import pyfetch
from PIL import Image
from io import BytesIO
from js import term, window, document
from itertools import cycle


async def main():
    base_path = window.location.protocol + "//" + window.location.host + "/images/"
    images_data = await pyfetch(base_path + "image_meta.json")
    images_data = await images_data.json()
    for image in cycle(list(images_data.values())):
        resp = await pyfetch(base_path + image["path"])
        pil_img = Image.open(BytesIO(await resp.bytes()))
        ascii_out = AsciiArt.from_pillow_image(pil_img).to_ascii(columns=180)
        ascii_out_list = ascii_out.split("\n")
        ascii_out = "\n\r".join(ascii_out_list)
        term.clear()
        term.write(ascii_out)
        document.querySelector(
            ".title"
        ).innerHTML = f"{image['caption']} | View original image by clicking <a href={base_path+ image['path']} target='_blank'>here</a>"
        await asyncio.sleep(7)


asyncio.ensure_future(main())
