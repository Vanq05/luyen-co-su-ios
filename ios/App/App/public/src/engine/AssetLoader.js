/**
 * Bộ nạp tài nguyên sprite sheet PNG + JSON xuất từ patch-gg/pixelfx.
 * Chuẩn bị sẵn cho Bước 2 khi sinh nhân vật, tileset, quái và VFX.
 */
export class AssetLoader {
  constructor() {
    this.cache = new Map();
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Không tải được ảnh: ${url}`));
      img.src = url;
    });
  }

  async loadJson(url) {
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
    const [image, data] = await Promise.all([
      this.loadImage(pngUrl),
      this.loadJson(jsonUrl),
    ]);
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
