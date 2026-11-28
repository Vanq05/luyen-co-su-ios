import { getUiPixelIconDataUrl } from "../engine/PixelSpriteBaker.js";
import { getGuPixelImgHtml, getItemPixelImgHtml } from "./PixelGuIcons.js";

/**
 * Bộ Biểu Tượng Pixel Art 100% Cổ Phong Tiên Hiệp (0 SVG!):
 * - Toàn bộ nút tiện ích HUD dùng icon Pixel Art 24x24 nung sẵn bởi PixelSpriteBaker.
 * - Toàn bộ Cổ Trùng (32x32), Sát Chiêu (32x32) & Vật Phẩm (24x24) dùng Pixel Art sinh vật thực thụ.
 */
export function getUiIconSvg(name) {
  const url = getUiPixelIconDataUrl(name);
  return `<img class="ctl-pixel-icon" src="${url}" alt="" draggable="false" />`;
}

export function getGuIconSvg(gu) {
  return getGuPixelImgHtml(gu);
}

export function getItemIconSvg(item) {
  return getItemPixelImgHtml(item);
}
