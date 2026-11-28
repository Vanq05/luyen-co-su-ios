/**
 * Hình học Thế Giới Mở, Va chạm Sông/Hồ/Bậc Thềm Đá & Tìm Đường A* qua Cầu/Bậc Thang.
 * Dùng chung cho cả MapRenderer, WorldMaps và WorldSimulation để hình ảnh khớp 100% với vật lý.
 */

export function getWaterRadiusScale(angle, seed = 0) {
  return (
    1 +
    0.055 * Math.sin(angle * 3 + seed) +
    0.035 * Math.cos(angle * 5 - seed * 0.7) +
    0.02 * Math.sin(angle * 7 + seed * 1.3)
  );
}

export function distToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);
  const b = c1 / c2;
  return Math.hypot(px - (x1 + b * vx), py - (y1 + b * vy));
}

function appendLinearSamples(out, x0, y0, x1, y1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len / 10));
  for (let i = out.length === 0 ? 0 : 1; i <= steps; i++) {
    const t = i / steps;
    out.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
  }
}

function appendQuadSamples(out, x0, y0, cx, cy, x1, y1) {
  const approxLen = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
  const steps = Math.max(2, Math.ceil(approxLen / 10));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    out.push({
      x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
      y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
    });
  }
}

/**
 * Rải mẫu đường cong dòng sông khớp với quadraticCurveTo của MapRenderer.
 * Kết quả trả về [{ x, y, tx, ty }] với (tx, ty) là vector đơn vị chiều dòng chảy.
 */
export function sampleStreamPoints(stream) {
  if (stream._sampled) return stream._sampled;
  const pts = stream.points ?? [];
  const raw = [];
  if (pts.length === 2) {
    appendLinearSamples(raw, pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
  } else if (pts.length >= 3) {
    let curX = pts[0][0];
    let curY = pts[0][1];
    raw.push({ x: curX, y: curY });
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1][0] + pts[i][0]) * 0.5;
      const my = (pts[i - 1][1] + pts[i][1]) * 0.5;
      appendQuadSamples(raw, curX, curY, pts[i - 1][0], pts[i - 1][1], mx, my);
      curX = mx;
      curY = my;
    }
    const last = pts[pts.length - 1];
    appendLinearSamples(raw, curX, curY, last[0], last[1]);
  }

  for (let i = 0; i < raw.length; i++) {
    const prev = raw[Math.max(0, i - 1)];
    const next = raw[Math.min(raw.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    raw[i].tx = dx / len;
    raw[i].ty = dy / len;
  }

  stream._sampled = raw;
  return raw;
}

export function nearestStreamSample(stream, px, py) {
  const s = sampleStreamPoints(stream);
  let bestDist = Infinity;
  let bestX = px;
  let bestY = py;
  let bestTx = 1;
  let bestTy = 0;
  for (let i = 1; i < s.length; i++) {
    const ax = s[i - 1].x;
    const ay = s[i - 1].y;
    const bx = s[i].x;
    const by = s[i].y;
    const vx = bx - ax;
    const vy = by - ay;
    const c2 = vx * vx + vy * vy;
    let t = c2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / c2 : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + vx * t;
    const qy = ay + vy * t;
    const d = Math.hypot(px - qx, py - qy);
    if (d < bestDist) {
      bestDist = d;
      bestX = qx;
      bestY = qy;
      bestTx = s[i].tx;
      bestTy = s[i].ty;
    }
  }
  return { dist: bestDist, x: bestX, y: bestY, tx: bestTx, ty: bestTy };
}

export const BRIDGE_SPECS = {
  bridge_stone_h: { orient: "h", deckHalfW: 56, deckHalfH: 16, railOffset: 20, railHalfLen: 36 },
  wood_bridge_h: { orient: "h", deckHalfW: 50, deckHalfH: 15, railOffset: 18, railHalfLen: 32 },
  bridge_stone_v: { orient: "v", deckHalfW: 16, deckHalfH: 56, railOffset: 20, railHalfLen: 36 },
  wood_bridge_v: { orient: "v", deckHalfW: 15, deckHalfH: 50, railOffset: 18, railHalfLen: 32 },
  wood_pier: { orient: "h", deckHalfW: 42, deckHalfH: 14, railOffset: 0, railHalfLen: 0 },
  wood_pier_n: { orient: "v", deckHalfW: 14, deckHalfH: 42, railOffset: 0, railHalfLen: 0 },
  wood_pier_s: { orient: "v", deckHalfW: 14, deckHalfH: 42, railOffset: 0, railHalfLen: 0 },
};

export function isBridgeKind(kind) {
  return Boolean(BRIDGE_SPECS[kind]);
}

export function isPointOnBridgeDeck(mapDef, px, py, pad = 0) {
  for (const b of mapDef.buildings ?? []) {
    const spec = BRIDGE_SPECS[b.kind];
    if (!spec) continue;
    if (Math.abs(px - b.x) <= spec.deckHalfW + pad && Math.abs(py - b.y) <= spec.deckHalfH + pad) {
      return true;
    }
  }
  return false;
}

export function getBridgeRailBoxes(mapDef) {
  if (mapDef._bridgeRails) return mapDef._bridgeRails;
  const boxes = [];
  for (const b of mapDef.buildings ?? []) {
    const spec = BRIDGE_SPECS[b.kind];
    if (!spec || spec.railOffset <= 0) continue;
    if (spec.orient === "h") {
      boxes.push({
        x1: b.x - spec.railHalfLen,
        y1: b.y - spec.railOffset - 2,
        x2: b.x + spec.railHalfLen,
        y2: b.y - spec.railOffset + 2,
      });
      boxes.push({
        x1: b.x - spec.railHalfLen,
        y1: b.y + spec.railOffset - 2,
        x2: b.x + spec.railHalfLen,
        y2: b.y + spec.railOffset + 2,
      });
    } else {
      boxes.push({
        x1: b.x - spec.railOffset - 2,
        y1: b.y - spec.railHalfLen,
        x2: b.x - spec.railOffset + 2,
        y2: b.y + spec.railHalfLen,
      });
      boxes.push({
        x1: b.x + spec.railOffset - 2,
        y1: b.y - spec.railHalfLen,
        x2: b.x + spec.railOffset + 2,
        y2: b.y + spec.railHalfLen,
      });
    }
  }
  mapDef._bridgeRails = boxes;
  return boxes;
}

function splitSpanByGaps(start, end, gaps) {
  if (end <= start) return [];
  const sorted = gaps
    .map(([a, b]) => [Math.max(start, a), Math.min(end, b)])
    .filter(([a, b]) => b > a)
    .sort((u, v) => u[0] - v[0]);

  const segments = [];
  let cursor = start;
  for (const [ga, gb] of sorted) {
    if (ga > cursor + 2) segments.push([cursor, ga]);
    cursor = Math.max(cursor, gb);
  }
  if (end > cursor + 2) segments.push([cursor, end]);
  return segments;
}

export function getTerraceAndCliffWallBoxes(mapDef) {
  if (mapDef._wallBoxes) return mapDef._wallBoxes;
  const boxes = [];

  for (const t of mapDef.stoneTerraces ?? []) {
    const h = t.height ?? 12;
    if (t.style === "courtyard" && h < 8 && !t.fenced) continue;
    const left = t.x - t.rx;
    const right = t.x + t.rx;
    const top = t.y - t.ry;
    const deckBot = t.y + t.ry;
    const wallBot = deckBot + h;

    const gapsNorth = [];
    const gapsSouth = [];
    const gapsWest = [];
    const gapsEast = [];
    for (const s of t.stairs ?? []) {
      const wHalf = (s.width ?? 48) * 0.5 - 3;
      if (s.side === "north") {
        const cx = t.x + (s.offset ?? 0);
        gapsNorth.push([cx - wHalf, cx + wHalf]);
      } else if (s.side === "south") {
        const cx = t.x + (s.offset ?? 0);
        gapsSouth.push([cx - wHalf, cx + wHalf]);
      } else if (s.side === "west") {
        const cy = t.y + (s.offset ?? 0);
        gapsWest.push([cy - wHalf, cy + wHalf]);
      } else if (s.side === "east") {
        const cy = t.y + (s.offset ?? 0);
        gapsEast.push([cy - wHalf, cy + wHalf]);
      }
    }

    for (const [a, b] of splitSpanByGaps(left, right, gapsNorth)) {
      boxes.push({ x1: a, y1: top - 3, x2: b, y2: top + 3 });
    }
    for (const [a, b] of splitSpanByGaps(left, right, gapsSouth)) {
      boxes.push({ x1: a, y1: deckBot - 2, x2: b, y2: wallBot });
    }
    for (const [a, b] of splitSpanByGaps(top, wallBot, gapsWest)) {
      boxes.push({ x1: left - 3, y1: a, x2: left + 3, y2: b });
    }
    for (const [a, b] of splitSpanByGaps(top, wallBot, gapsEast)) {
      boxes.push({ x1: right - 3, y1: a, x2: right + 3, y2: b });
    }
  }

  for (const cl of mapDef.cliffLedges ?? []) {
    const h = cl.height ?? 14;
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const ax = cl.x1 + (cl.x2 - cl.x1) * t0;
      const bx = cl.x1 + (cl.x2 - cl.x1) * t1;
      const cy = cl.y1 + (cl.y2 - cl.y1) * ((t0 + t1) * 0.5) + h * 0.45;
      boxes.push({
        x1: Math.min(ax, bx),
        y1: cy - 5,
        x2: Math.max(ax, bx),
        y2: cy + 5,
      });
    }
  }

  mapDef._wallBoxes = boxes;
  return boxes;
}

export function resolveCircleVsAABB(x, y, r, box) {
  const cx = Math.max(box.x1, Math.min(box.x2, x));
  const cy = Math.max(box.y1, Math.min(box.y2, y));
  const dx = x - cx;
  const dy = y - cy;
  const dist2 = dx * dx + dy * dy;
  if (dist2 >= r * r) return { x, y };

  if (dist2 > 0.0001) {
    const dist = Math.sqrt(dist2);
    return {
      x: cx + (dx / dist) * r,
      y: cy + (dy / dist) * r,
    };
  }
  const dL = Math.abs(x - box.x1);
  const dR = Math.abs(box.x2 - x);
  const dT = Math.abs(y - box.y1);
  const dB = Math.abs(box.y2 - y);
  const m = Math.min(dL, dR, dT, dB);
  if (m === dT) return { x, y: box.y1 - r };
  if (m === dB) return { x, y: box.y2 + r };
  if (m === dL) return { x: box.x1 - r, y };
  return { x: box.x2 + r, y };
}

/**
 * Giải quyết toàn bộ va chạm bản đồ: sông ngòi (bắt buộc qua cầu), hồ nước,
 * thành bậc thềm đá, lan can cầu, vách đá, công trình và gốc cây.
 */
export function resolveWorldMovement(mapDef, rawX, rawY, radius, getSolidPropInfo) {
  let x = Math.max(24, Math.min(mapDef.width - 24, rawX));
  let y = Math.max(28, Math.min(mapDef.height - 24, rawY));

  const onBridge = isPointOnBridgeDeck(mapDef, x, y, 2);

  if (!onBridge) {
    for (const st of mapDef.streams ?? []) {
      const ns = nearestStreamSample(st, x, y);
      const minDist = (st.width ?? 42) * 0.5 + radius * 0.55;
      if (ns.dist < minDist) {
        if (ns.dist < 0.01) {
          x += -ns.ty * minDist;
          y += ns.tx * minDist;
        } else {
          const ux = (x - ns.x) / ns.dist;
          const uy = (y - ns.y) / ns.dist;
          x = ns.x + ux * minDist;
          y = ns.y + uy * minDist;
        }
      }
    }

    for (let wi = 0; wi < (mapDef.waterRegions ?? []).length; wi++) {
      const w = mapDef.waterRegions[wi];
      const dx = x - w.x;
      const dy = y - w.y;
      const ang = Math.atan2(dy, dx);
      const sc = getWaterRadiusScale(ang, wi * 1.7 + 0.5);
      const nx = dx / Math.max(1, w.rx * sc);
      const ny = dy / Math.max(1, w.ry * sc);
      const normDist = Math.hypot(nx, ny);
      if (normDist > 0 && normDist < 0.99) {
        const push = 0.99 / normDist;
        x = w.x + dx * push;
        y = w.y + dy * push;
      }
    }
  }

  const wallR = radius * 0.65;
  for (const box of getBridgeRailBoxes(mapDef)) {
    const p = resolveCircleVsAABB(x, y, wallR, box);
    x = p.x;
    y = p.y;
  }

  for (const box of getTerraceAndCliffWallBoxes(mapDef)) {
    const p = resolveCircleVsAABB(x, y, wallR, box);
    x = p.x;
    y = p.y;
  }

  for (const b of mapDef.buildings ?? []) {
    if (b.kind === "arena_ring" || b.kind === "banners" || b.kind === "stone_arch" || isBridgeKind(b.kind)) continue;

    const spr = getSolidPropInfo?.(b.kind);
    if (!spr) continue;
    if (spr.solidRx && spr.solidRy) {
      const dx = x - b.x;
      const dy = y - (b.y - 12);
      const rx = spr.solidRx + radius;
      const ry = spr.solidRy + radius * 0.6;
      const d = Math.hypot(dx / rx, dy / ry);
      if (d > 0 && d < 1) {
        x = b.x + dx / d;
        y = b.y - 12 + dy / d;
      }
    } else if (spr.solidRadius > 0) {
      const oy = b.kind === "pavilion" ? b.y - 6 : b.y;
      const minR = spr.solidRadius + radius;
      const dx = x - b.x;
      const dy = y - oy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < minR) {
        x = b.x + (dx / dist) * minR;
        y = oy + (dy / dist) * minR;
      }
    }
  }

  for (const t of mapDef.trees ?? []) {
    const spr = getSolidPropInfo?.(t.kind);
    if (!spr?.solidRadius) continue;
    const minR = spr.solidRadius + radius * 0.7;
    const dx = x - t.x;
    const dy = y - t.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < minR) {
      x = t.x + (dx / dist) * minR;
      y = t.y + (dy / dist) * minR;
    }
  }

  for (const p of mapDef.portals ?? []) {
    const pR = 8 + radius * 0.55;
    const isEW = p.x < 240 || p.x > mapDef.width - 240 || mapDef.id === "giac_mo";
    const pillars = isEW
      ? [
          [p.x, p.y - 28],
          [p.x, p.y + 28],
        ]
      : [
          [p.x - 42, p.y - 4],
          [p.x + 42, p.y - 4],
        ];
    for (const [px, py] of pillars) {
      const dx = x - px;
      const dy = y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < pR) {
        x = px + (dx / dist) * pR;
        y = py + (dy / dist) * pR;
      }
    }
  }

  return {
    x: Math.max(24, Math.min(mapDef.width - 24, x)),
    y: Math.max(28, Math.min(mapDef.height - 24, y)),
  };
}

const NAV_CELL = 20;

function isPointWalkable(mapDef, x, y, getSolidPropInfo) {
  const res = resolveWorldMovement(mapDef, x, y, 12, getSolidPropInfo);
  return Math.hypot(res.x - x, res.y - y) < 0.5;
}

function getOrBuildNavGrid(mapDef, getSolidPropInfo) {
  if (mapDef._navGrid) return mapDef._navGrid;
  const cols = Math.ceil(mapDef.width / NAV_CELL);
  const rows = Math.ceil(mapDef.height / NAV_CELL);
  const walk = new Uint8Array(cols * rows);
  const cost = new Float32Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    const cy = r * NAV_CELL + NAV_CELL * 0.5;
    for (let c = 0; c < cols; c++) {
      const cx = c * NAV_CELL + NAV_CELL * 0.5;
      const idx = r * cols + c;
      const ok = isPointWalkable(mapDef, cx, cy, getSolidPropInfo);
      walk[idx] = ok ? 1 : 0;
      let cellCost = 1.0;
      if (ok) {
        if (isPointOnBridgeDeck(mapDef, cx, cy, 4)) {
          cellCost = 0.75;
        } else {
          for (const p of mapDef.paths ?? []) {
            if (distToSegment(cx, cy, p.x1, p.y1, p.x2, p.y2) <= p.w * 0.55) {
              cellCost = 0.8;
              break;
            }
          }
          if (cellCost === 1.0) {
            for (const t of mapDef.stoneTerraces ?? []) {
              for (const s of t.stairs ?? []) {
                const sx = s.side === "west" ? t.x - t.rx : s.side === "east" ? t.x + t.rx : t.x + (s.offset ?? 0);
                const sy = s.side === "north" ? t.y - t.ry : s.side === "south" ? t.y + t.ry : t.y + (s.offset ?? 0);
                if (Math.hypot(cx - sx, cy - sy) <= 26) {
                  cellCost = 0.78;
                  break;
                }
              }
            }
          }
        }
      }
      cost[idx] = cellCost;
    }
  }

  mapDef._navGrid = { cols, rows, walk, cost };
  return mapDef._navGrid;
}

function findNearestWalkableCell(grid, c0, r0, maxRadius = 8) {
  const clampC = Math.max(0, Math.min(grid.cols - 1, c0));
  const clampR = Math.max(0, Math.min(grid.rows - 1, r0));
  if (grid.walk[clampR * grid.cols + clampC]) return { c: clampC, r: clampR };
  let best = null;
  let bestD2 = Infinity;
  for (let rad = 1; rad <= maxRadius; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      const nr = clampR + dr;
      if (nr < 0 || nr >= grid.rows) continue;
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
        const nc = clampC + dc;
        if (nc < 0 || nc >= grid.cols) continue;
        if (grid.walk[nr * grid.cols + nc]) {
          const d2 = dr * dr + dc * dc;
          if (d2 < bestD2) {
            bestD2 = d2;
            best = { c: nc, r: nr };
          }
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function hasClearWalkLine(mapDef, x0, y0, x1, y1, getSolidPropInfo) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!isPointWalkable(mapDef, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, getSolidPropInfo)) {
      return false;
    }
  }
  return true;
}

/**
 * Tìm đường A* 8 hướng băng qua cầu & bậc thang, có rút gọn đường thẳng không đi chệch vào sông/vách.
 */
export function findNavigationPath(mapDef, startX, startY, goalX, goalY, getSolidPropInfo) {
  const clampedGoal = resolveWorldMovement(mapDef, goalX, goalY, 12, getSolidPropInfo);
  if (hasClearWalkLine(mapDef, startX, startY, clampedGoal.x, clampedGoal.y, getSolidPropInfo)) {
    return [clampedGoal];
  }

  const grid = getOrBuildNavGrid(mapDef, getSolidPropInfo);
  const startCell = findNearestWalkableCell(grid, Math.floor(startX / NAV_CELL), Math.floor(startY / NAV_CELL), 6);
  const goalCell = findNearestWalkableCell(grid, Math.floor(clampedGoal.x / NAV_CELL), Math.floor(clampedGoal.y / NAV_CELL), 8);
  if (!startCell || !goalCell) return [clampedGoal];

  const total = grid.cols * grid.rows;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const inOpen = new Uint8Array(total);

  const startIdx = startCell.r * grid.cols + startCell.c;
  const goalIdx = goalCell.r * grid.cols + goalCell.c;
  gScore[startIdx] = 0;
  fScore[startIdx] = Math.hypot(goalCell.c - startCell.c, goalCell.r - startCell.r);
  const open = [startIdx];
  inOpen[startIdx] = 1;

  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];

  let found = false;
  while (open.length > 0) {
    let bestPos = 0;
    let bestF = fScore[open[0]];
    for (let i = 1; i < open.length; i++) {
      const f = fScore[open[i]];
      if (f < bestF) {
        bestF = f;
        bestPos = i;
      }
    }
    const cur = open[bestPos];
    open[bestPos] = open[open.length - 1];
    open.pop();
    inOpen[cur] = 0;
    if (cur === goalIdx) {
      found = true;
      break;
    }
    closed[cur] = 1;
    const cr = Math.floor(cur / grid.cols);
    const cc = cur % grid.cols;

    for (const [dc, dr, stepLen] of dirs) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= grid.cols || nr < 0 || nr >= grid.rows) continue;
      const nIdx = nr * grid.cols + nc;
      if (closed[nIdx] || !grid.walk[nIdx]) continue;
      if (dc !== 0 && dr !== 0) {
        if (!grid.walk[cr * grid.cols + nc] || !grid.walk[nr * grid.cols + cc]) continue;
      }
      const tentG = gScore[cur] + stepLen * grid.cost[nIdx];
      if (tentG < gScore[nIdx]) {
        cameFrom[nIdx] = cur;
        gScore[nIdx] = tentG;
        fScore[nIdx] = tentG + Math.hypot(goalCell.c - nc, goalCell.r - nr);
        if (!inOpen[nIdx]) {
          open.push(nIdx);
          inOpen[nIdx] = 1;
        }
      }
    }
  }

  if (!found) return [clampedGoal];

  const rawPoints = [];
  let trace = goalIdx;
  while (trace !== -1 && trace !== startIdx) {
    const r = Math.floor(trace / grid.cols);
    const c = trace % grid.cols;
    rawPoints.push({ x: c * NAV_CELL + NAV_CELL * 0.5, y: r * NAV_CELL + NAV_CELL * 0.5 });
    trace = cameFrom[trace];
  }
  rawPoints.reverse();
  if (rawPoints.length === 0) return [clampedGoal];
  rawPoints[rawPoints.length - 1] = clampedGoal;

  // Rút gọn dây cung đường đi giữ nguyên các điểm rẽ qua cầu & bậc thang
  const smoothed = [];
  let anchorX = startX;
  let anchorY = startY;
  let i = 0;
  while (i < rawPoints.length) {
    let farthest = i;
    for (let j = rawPoints.length - 1; j > i; j--) {
      if (hasClearWalkLine(mapDef, anchorX, anchorY, rawPoints[j].x, rawPoints[j].y, getSolidPropInfo)) {
        farthest = j;
        break;
      }
    }
    smoothed.push(rawPoints[farthest]);
    anchorX = rawPoints[farthest].x;
    anchorY = rawPoints[farthest].y;
    i = farthest + 1;
  }
  return smoothed;
}
