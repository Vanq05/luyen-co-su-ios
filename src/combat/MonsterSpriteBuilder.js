/**
 * Bộ Dựng Sprite Quái Vật & Thú Vương Pixel-Art 64x64 / 192x192 (Chuẩn Dark Fantasy).
 * Ủy quyền sang PixelSpriteBaker.js và BanLongAssets.js (0 ctx.arc / 0 ctx.ellipse).
 */
import { bakeMonsterFrames64 } from "../engine/PixelSpriteBaker.js";
import { bakeBanLongSentinelFrames, drawBanLongCoilingBoss } from "../world/BanLongAssets.js";

export function getMonsterSpriteFrames(typeId) {
  if (typeId === "ban_long_thach_ve") return bakeBanLongSentinelFrames();
  return bakeMonsterFrames64(typeId);
}

export function drawBanLongBossPixelArt(ctx, boss, time, breathWarn = 0) {
  return drawBanLongCoilingBoss(ctx, boss, time, breathWarn);
}
