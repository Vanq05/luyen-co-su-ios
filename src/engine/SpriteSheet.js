/**
 * Vẽ frame từ sprite sheet PNG + JSON xuất bởi patch-gg/pixelfx.
 * Tôn trọng pivot gốc (meta.pixelfx.pivot), hỗ trợ flipX, xoay góc, scale và alpha.
 */
export function drawSheetFrame(ctx, sheet, frameIndex, worldX, worldY, opts = {}) {
  if (!sheet || !sheet.image || !sheet.frames || sheet.frames.length === 0) return;

  const {
    flipX = false,
    rotation = 0,
    scale = 1,
    alpha = 1,
    pivotOverride = null,
  } = opts;

  const idx = ((frameIndex % sheet.frames.length) + sheet.frames.length) % sheet.frames.length;
  const entry = sheet.frames[idx];
  const r = entry.frame;
  const pivot = pivotOverride ?? sheet.pixelfx?.pivot ?? [r.w * 0.5, r.h * 0.5];

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(Math.round(worldX), Math.round(worldY));
  if (rotation !== 0) ctx.rotate(rotation);
  const sx = flipX ? -scale : scale;
  if (sx !== 1 || scale !== 1) ctx.scale(sx, scale);

  ctx.drawImage(
    sheet.image,
    r.x,
    r.y,
    r.w,
    r.h,
    -Math.round(pivot[0]),
    -Math.round(pivot[1]),
    r.w,
    r.h
  );
  ctx.restore();
}

export function getSheetFrameIndex(sheet, timeSeconds, loopOverride = null) {
  if (!sheet || !sheet.frames || sheet.frames.length === 0) return 0;
  const fps = sheet.pixelfx?.fps ?? 12;
  const loop = loopOverride ?? sheet.pixelfx?.loop ?? true;
  const raw = Math.floor(Math.max(0, timeSeconds) * fps);
  if (loop) return raw % sheet.frames.length;
  return Math.min(sheet.frames.length - 1, raw);
}

export async function loadManifestAssets(assetLoader, manifestUrl = "./assets/manifest.json") {
  const manifest = await assetLoader.loadJson(manifestUrl);
  const entries = Object.entries(manifest.assets ?? {});
  await Promise.all(
    entries.map(([key, item]) => assetLoader.loadSpriteSheet(key, item.png, item.json))
  );
  return manifest;
}
