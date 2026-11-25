/**
 * Bộ nạp tài nguyên sprite sheet PNG + JSON (nhúng sẵn JSON từ patch-gg/pixelfx).
 * Không dùng fetch() cục bộ trên iOS capacitor://localhost để tránh treo hoặc màn hình đen.
 */
import { EMBEDDED_SHEETS } from "../generated/embeddedAssets.js";

export class AssetLoader {
  constructor() {
    this.cache = new Map();
  }

  loadImage(url, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`Timeout tải ảnh (${timeoutMs}ms): ${url}`));
      }, timeoutMs);

      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Không tải được ảnh: ${url}`));
      };
      img.src = url;
    });
  }

  async loadJson(url, embeddedKey = null) {
    if (embeddedKey && EMBEDDED_SHEETS[embeddedKey]) {
      return EMBEDDED_SHEETS[embeddedKey];
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Không tải được JSON (${res.status}): ${url}`);
    }
    return res.json();
  }

  async loadSpriteSheet(key, pngUrl, jsonUrl) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const data = EMBEDDED_SHEETS[key] ?? (await this.loadJson(jsonUrl));
    const image = await this.loadImage(pngUrl, 4000);
    const sheet = {
      key,
      image,
      frames: data.frames ?? [],
      meta: data.meta ?? {},
      pixelfx: data.meta?.pixelfx ?? {},
    };
    this.cache.set(key, sheet);
    return sheet;
  }

  get(key) {
    return this.cache.get(key) ?? null;
  }
}
