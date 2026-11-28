/**
 * Bộ Dựng Sprite Quái Vật & Boss Pixel-Art Đa Trạng Thái (64x64 / 96x96 / 112x96 / 192x192).
 * Phân luồng chuẩn: Bàn Long (BanLongAssets), Boss lớn (MonsterArtBosses), Quái thường (MonsterArtRegular), Cọc Thảo Nhân (PixelSpriteBaker).
 */
import { bakeMonsterFrames64 } from "../engine/PixelSpriteBaker.js";
import { bakeBanLongSentinelFrames, drawBanLongCoilingBoss } from "../world/BanLongAssets.js";
import { getBossSpriteFrames, isBossSpriteType } from "./MonsterArtBosses.js";
import { getRegularMonsterFrames } from "./MonsterArtRegular.js";

export function getMonsterSpriteFrames(typeId, state = "idle") {
  if (typeId === "ban_long_thach_ve") return bakeBanLongSentinelFrames();
  if (typeId === "coc_thao_nhan") return bakeMonsterFrames64("coc_thao_nhan");
  if (isBossSpriteType(typeId)) return getBossSpriteFrames(typeId, state);
  return getRegularMonsterFrames(typeId, state);
}

export function drawBanLongBossPixelArt(ctx, boss, time, breathWarn = 0) {
  return drawBanLongCoilingBoss(ctx, boss, time, breathWarn);
}
