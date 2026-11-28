/**
 * Bộ Dựng Sprite Quái Vật & Thú Vương Pixel-Art 64x64 / 76x72 (Chuẩn Dark Fantasy).
 * Ủy quyền toàn bộ sang PixelSpriteBaker.js (0 ctx.arc / 0 ctx.ellipse).
 */
import { bakeMonsterFrames64, drawPixelBanLongBoss } from "../engine/PixelSpriteBaker.js";

export function getMonsterSpriteFrames(typeId) {
  return bakeMonsterFrames64(typeId);
}

export function drawBanLongBossPixelArt(ctx, boss, time) {
  return drawPixelBanLongBoss(ctx, boss, time);
}
