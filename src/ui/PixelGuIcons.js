/**
 * Bộ Họa Tiết Pixel-Art Sinh Vật Cổ Trùng Thực Thụ (28x28) & Vật Phẩm (24x24)
 * - Vẽ từng chấm pixel sắc nét có viền tối 1px, cánh côn trùng, râu, chân, vân giáp và ánh sáng nổi.
 * - Cache theo `id` (tuyệt đối không cache theo `uid`) để đạt 60fps tuyệt đối trên Web & iOS.
 */

const ICON_DATA_URL_CACHE = new Map();

function makeIconCanvas(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { canvas: c, ctx };
}

/** Vẽ lưới ký tự 14x14 phóng đúng 2x (hoặc vẽ trực tiếp lên canvas 28x28) có đối xứng trục dọc nếu mirror=true. */
function drawSpriteGrid(ctx, rows, palette, scale = 2, ox = 0, oy = 0) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const col = palette[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

/** Tự động thêm viền tối 1px xung quanh các pixel đã vẽ trên canvas. */
function addPixelOutline(ctx, size, outlineCol = "#120c08") {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const copy = new Uint8ClampedArray(d);
  const isOpaque = (x, y) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return false;
    return copy[(y * size + x) * 4 + 3] > 20;
  };
  ctx.fillStyle = outlineCol;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isOpaque(x, y)) continue;
      if (isOpaque(x - 1, y) || isOpaque(x + 1, y) || isOpaque(x, y - 1) || isOpaque(x, y + 1)) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function paintGuCreature(ctx, gu) {
  const id = gu.id || "";
  const col = gu.color || "#5ef2d6";
  const path = gu.path || "";

  // 1. Nguyệt Quang / Nguyệt Nghê / Hoàng Kim Nguyệt -> Bọ Cánh Cứng / Ve Sầu Ánh Trăng có ấn trăng khuyết
  if (id === "nguyet_quang" || id === "nguyet_nghe" || id === "hoang_kim_nguyet" || path === "nguyet_dao") {
    const isGold = id === "hoang_kim_nguyet";
    const isRank2 = id === "nguyet_nghe";
    const pal = {
      d: isGold ? "#6b470c" : "#0e4d46",
      m: isGold ? "#e0a526" : isRank2 ? "#27b8a8" : "#188f84",
      b: col,
      w: isGold ? "#fff5c4" : "#d9fff9",
      c: isGold ? "#ffffff" : "#99fff0",
      e: "#ffeb85",
    };
    const rows = isGold
      ? [
          "....e....e....",
          "...d.mmmm.d...",
          ".ww.dddddd.ww.",
          "wccwmmmmmmwccw",
          "wbbmbbbbbbmbbw",
          ".wwmbbwwbbmww.",
          "..dmbwwwwbmd..",
          "..dmbwddwbmd..",
          ".d.mbbwwbbm.d.",
          "...mbbbbbbm...",
          "..d.mmmmmm.d..",
          "....dddddd....",
          ".....dddd.....",
          "..............",
        ]
      : [
          "....e....e....",
          "....dmmmmd....",
          "...dmmbbmmd...",
          "..dmbbwwbbmd..",
          ".ddmbwwwwbmdd.",
          "..dmbwddwbmd..",
          "..dmbbwwbbmd..",
          ".d.mbbbbbbm.d.",
          "...dmmmmmmdd..",
          "..d.dddddd.d..",
          "....dd..dd....",
          "..............",
          "..............",
          "..............",
        ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 1);
    return;
  }

  // 2. Tửu Trùng / Tứ Vị Tửu Trùng -> Con Tằm Trắng Béo Múp Cuộn Tròn + Đốm Ngũ Sắc
  if (id === "tuu_trung" || id === "tu_vi_tuu_trung" || path === "thuc_dao") {
    const isQuad = id === "tu_vi_tuu_trung";
    const pal = {
      d: "#7a633b",
      m: "#e8d6ad",
      b: "#fff7e2",
      w: "#ffffff",
      e: "#1e120a",
      p: isQuad ? "#ff6b6b" : "#f2c14e",
      g: isQuad ? "#5ef2d6" : "#f5d782",
      v: isQuad ? "#b86bff" : "#e6b84c",
    };
    const rows = [
      "..............",
      "....dddd......",
      "...dbbbbmd....",
      "..dbwwbebbmd..",
      "..dbbbbbbbmd..",
      "..dmmppppmd...",
      "...ddbbbbbbmd.",
      "....dbwwwwbmd.",
      "...dbbbggbbbmd",
      "..dbwwbbbbvvmd",
      "..dbbbbbbbmdd.",
      "...dmmmmmmdd..",
      "....dddddd....",
      "..............",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 0);
    return;
  }

  // 3. Hắc Thỉ / Bạch Thỉ / Hùng Lực / Toàn Lực Ứng Phó / Vạn Ngã -> Bọ Ngà Răng Lợn / Kìm Sừng Lực Đạo
  if (id === "hac_thi" || id === "bach_thi" || id === "hung_luc" || id === "toan_luc_ung_pho" || id === "van_nga_huyen_anh" || path === "luc_dao") {
    const isBlackBoar = id === "hac_thi";
    const isBoar = id === "bach_thi" || isBlackBoar;
    const isGold = id === "toan_luc_ung_pho" || id === "van_nga_huyen_anh";
    const pal = {
      t: "#fff6e5",
      d: isBlackBoar ? "#1c1412" : isBoar ? "#5c3b20" : isGold ? "#73420a" : "#4a2410",
      m: isBlackBoar ? "#45332b" : isBoar ? "#b87439" : isGold ? "#e09422" : "#9c5323",
      b: isBlackBoar ? "#6b5044" : col,
      w: isBlackBoar ? "#c9a684" : "#ffe8ad",
      e: "#ff4757",
    };
    const rows = isBoar
      ? [
          "...tt....tt...",
          "...td....dt...",
          "....dmmmmmd...",
          "..ddmbbbbbmdd.",
          ".d.mbbwwwbbm.d",
          "...mbbbbbbbm..",
          ".d.mbbdddbbm.d",
          "...mbbmmmbbm..",
          "..d.mmmmmmm.d.",
          "....ddddddd...",
          "..............",
          "..............",
        ]
      : [
          "..t........t..",
          "..tt..dd..tt..",
          "...tddmmddt...",
          "..ddmbbbbbmdd.",
          ".d.mbwwwwwbm.d",
          "...mbbdddbbm..",
          ".d.mbbwwwbbm.d",
          "...mbbbbbbbm..",
          ".d..mmmmmmm..d",
          "....dd.d.dd...",
          "..............",
          "..............",
        ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
    return;
  }

  // 4. Đồng Bì / Thú Bì / Ngọc Bì / Bạch Ngọc / Thiên Bồng / Huyền Cốt -> Bọ Rùa Giáp Vảy / Giáp Ngọc & Xương
  if (
    id === "dong_bi" ||
    id === "ngoc_bi" ||
    id === "thu_bi" ||
    id === "bach_ngoc" ||
    id === "thien_bong" ||
    id === "huyen_cot_giap" ||
    path === "tho_dao"
  ) {
    const isBone = id === "huyen_cot_giap";
    const isJade = id === "ngoc_bi";
    const isWhite = id === "bach_ngoc" || id === "thien_bong";
    const pal = {
      d: isJade ? "#125243" : isWhite ? "#5a6b82" : isBone ? "#4d453d" : "#593b1a",
      m: isJade ? "#38ab8d" : isWhite ? "#a8c1db" : isBone ? "#9e9384" : "#996c34",
      b: col,
      w: "#ffffff",
      g: isBone ? "#d0573c" : "#ffe15c",
    };
    const rows = [
      ".....dddd.....",
      "...ddmmmmdd...",
      "..dmbbwwbbmd..",
      ".dmbwbbbbwbmd.",
      ".dmbdgmmgdbmd.",
      ".dmbbgwwgbbmd.",
      ".dmbbmmmmbbmd.",
      ".d.mbbwwbbm.d.",
      "..dmbbbbbbmd..",
      "...ddmmmmdd...",
      "....dd..dd....",
      "..............",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 1);
    return;
  }

  // 5. Sinh Cơ Thảo / Quang Vũ / Cửu Diệp Sinh Cơ / Thiên Thanh Liên -> Bọ Lá Mộc Đạo & Hoa Sen Bảo Liên
  if (
    id === "tieu_sinh_co" ||
    id === "quang_vu" ||
    id === "cuu_diep_sinh_co" ||
    id === "thien_thanh_lien" ||
    path === "moc_dao"
  ) {
    const isLotus = id === "thien_thanh_lien" || id === "cuu_diep_sinh_co";
    const isRain = id === "quang_vu";
    const pal = {
      d: isRain ? "#5c4d14" : "#124227",
      m: isRain ? "#c4a32b" : "#2b8a52",
      b: col,
      w: "#d6ffe5",
      y: "#ffe66d",
      e: "#ff99c8",
    };
    const rows = isLotus
      ? [
          "......ww......",
          "....wwbbww....",
          "..wwbbbbbbww..",
          ".wbbbyyybbbw..",
          ".dmmbyyybmmd..",
          "..ddmbbbmdd...",
          ".dmmbbwbbmmd..",
          "..ddmmmmmdd...",
          "....ddddd.....",
          "..............",
        ]
      : [
          "....d....d....",
          ".....d..d.....",
          "....dmmmmdd...",
          "...dmbbwwbmd..",
          "..dmbwbbbbwmd.",
          ".dmmbbmbbmmbmd",
          "..ddmbbbbbmdd.",
          "...d.mmmmm.d..",
          "....d.....d...",
          "..............",
        ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
    return;
  }

  // 6. Hỏa Thán / Xích Viêm Long Tức / Thái Cổ Long Tức -> Kiến Lửa / Rết Rồng Hỏa Diệm
  if (id === "dan_khieu_hoa_than" || id === "xich_viem_long_tuc" || id === "thai_co_long_tuc" || path === "viem_dao") {
    const isDrake = id === "thai_co_long_tuc" || id === "xich_viem_long_tuc";
    const pal = {
      d: "#541106",
      m: "#b82d0f",
      b: col,
      y: "#ffd84d",
      w: "#fff6bd",
    };
    const rows = isDrake
      ? [
          "..y........y..",
          "...yd.dd.dy...",
          "..yyddddddyy..",
          ".ybdmmbbmmdby.",
          "ybddmbyybmddby",
          ".y.dmbyybmdd.y",
          "...dmmbbmmdd..",
          "..d.mbyybm.d..",
          "....dmmbmdd...",
          "...d.mbbm.d...",
          ".....dddd.....",
          "..............",
        ]
      : [
          "....y....y....",
          ".....d..d.....",
          "....dmmmmdd...",
          "..ddmbwwbmdd..",
          ".d.mbyyybm.d..",
          "...dmbbbbmd...",
          ".d.mbywwybm.d.",
          "...mbyyyybm...",
          "..d.dmmmmdd.d.",
          ".....dddd.....",
          "..............",
        ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
    return;
  }

  // 7. Thanh Độc / Chướng Khí Bộc -> Bọ Cạp Độc Xanh Đuôi Cong / Nhện Chướng Khí
  if (id === "thanh_doc" || id === "chuong_khi_boc" || path === "doc_dao") {
    const isMiasma = id === "chuong_khi_boc";
    const pal = {
      d: "#144012",
      m: "#319428",
      b: col,
      w: "#d4ffbf",
      p: "#b86bff",
      e: "#ff4757",
    };
    const rows = isMiasma
      ? [
          "....pppppp....",
          "..ppbbbbbbpp..",
          ".d.mbbwwbbm.d.",
          "d..mbpeepbm..d",
          "d.dmbbbbbbmd.d",
          "..d.mbbwwbm.d.",
          ".d..dmmmmdd..d",
          ".....d..d.....",
          "..............",
        ]
      : [
          ".......wbb....",
          "......dbbd....",
          "..d..dbbd.....",
          ".dmd.dbmd..d..",
          "d.bdmbbbmd.bd.",
          "..dmmbebbmdd..",
          ".d.mbbwwbbm.d.",
          "d..dmmmmmmdd.d",
          "....dd..dd....",
          "..............",
        ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
    return;
  }

  // 8. Huyết Nha / Huyết Nguyệt / Huyết Lô -> Muỗi Huyết Cánh Dơi / Sọ Huyết Lô
  if (id === "huyet_nha" || id === "huyet_nguyet" || id === "huyet_lo" || path === "huyet_dao") {
    const isFurnace = id === "huyet_lo";
    const pal = {
      d: "#470610",
      m: "#991125",
      b: col,
      w: "#ffd1d9",
      g: "#ffe15c",
    };
    const rows = isFurnace
      ? [
          "....dd..dd....",
          "...dmmwwmmd...",
          "..dmbbggbbmd..",
          "..dmbdwwdbmd..",
          "..dmbdwwdbmd..",
          "...dmbbbbmd...",
          "...dmmddmmd...",
          "..dmmbbbbmmd..",
          "..d.dddddd.d..",
          "..............",
        ]
      : [
          ".dd........dd.",
          "dmmdd....ddmmd",
          "dmbmmd..dmmbmd",
          ".dmbbmbbmbbmd.",
          "..ddmwwwwmdd..",
          "...dmbddbmdd..",
          "...dmbbbbmd...",
          "..d..mbbm..d..",
          "......dd......",
          "......dd......",
        ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
    return;
  }

  // 9. Ngư Lân / Thủy Tráo -> Bọ Vảy Cá Ngọc Bích & Ốc Xoáy Thủy Đạo
  if (id === "ngu_lan" || id === "thuy_trao" || path === "thuy_dao") {
    const isDome = id === "thuy_trao";
    const pal = {
      d: "#0d3b66",
      m: "#1d74b8",
      b: col,
      w: "#d9f7ff",
      s: "#7ef5e1",
    };
    const rows = isDome
      ? [
          "....dddddd....",
          "..ddmwwwwmdd..",
          ".dmwwbbbbwwmd.",
          ".dmbssmmssbmd.",
          ".dmbsmwwmsbmd.",
          ".dmbssmmssbmd.",
          "..dmbbbbbbmd..",
          "...dddddddd...",
          "..............",
        ]
      : [
          "....d....d....",
          "....dmbbmd....",
          "..ddmbwwbmdd..",
          ".d.mbsbbsbm.d.",
          "...mbbssbbm...",
          ".d.msbssbsm.d.",
          "...mbbbbbbm...",
          "..d.dmmmmdd.d.",
          ".....dddd.....",
          "..............",
        ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
    return;
  }

  // 10. Điện Nhãn / Lôi Khiếu / Lôi Dực / Cửu Tiêu Lôi Ngục -> Ong Bắp Cày Sấm / Bọ Thần Lôi 1 Mắt
  if (id === "dien_nhan" || id === "loi_khieu" || id === "loi_duc" || id === "cuu_tieu_loi_nguc" || path === "loi_dao") {
    const pal = {
      d: "#473406",
      m: "#bd8b15",
      b: col,
      w: "#ffffff",
      c: "#78e6ff",
      e: "#ff385c",
    };
    const rows = [
      ".cc........cc.",
      "cwwc..dd..cwwc",
      ".cccdmbbmdccc.",
      "...dmbwwbmd...",
      "..dmbwddwbmd..",
      "...dmbeebmd...",
      "..dmbbwwbbmd..",
      "..d.dmmmmdd.d.",
      "....dbbbbd....",
      ".....dmmd.....",
      "......dd......",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 1);
    return;
  }

  // 11. Kiếm Ảnh / Sương Trúc Kiếm / Vạn Kiếm Quy Tông -> Bọ Ngựa Kiếm Lưỡi Liềm
  if (id === "kiem_anh" || id === "suong_truc_kiem" || id === "van_kiem_quy_tong" || path === "kiem_dao") {
    const isBamboo = id === "suong_truc_kiem";
    const pal = {
      d: isBamboo ? "#124d43" : "#2e4459",
      m: isBamboo ? "#36a693" : "#6ea2cc",
      b: col,
      w: "#ffffff",
      e: "#ffe15c",
    };
    const rows = [
      ".w..........w.",
      ".ww..d..d..ww.",
      "..ww.dmmd.ww..",
      "...wmmebmmw...",
      "...dmmbbmmd...",
      "....dmwwmd....",
      "..ddmbbbbmdd..",
      ".d..mbbwwm..d.",
      "....dmbbmd....",
      ".....dddd.....",
      "..............",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
    return;
  }

  // 12. Hàn Băng Tiễn / Băng Phách Tuyết Hoa -> Bướm Tuyết Băng Phách / Ong Băng
  if (id === "han_bang_tien" || id === "bang_phach_tuyet_hoa" || path === "bang_tuyet_dao") {
    const pal = {
      d: "#18537a",
      m: "#4aa6db",
      b: col,
      w: "#ffffff",
    };
    const rows = [
      ".ww........ww.",
      "wbbw..dd..wbbw",
      "wbmwwmbbmwwmbw",
      ".wmmmbwwbmmmw.",
      "..ddmwwwwmdd..",
      ".wbbmbbbbmbbw.",
      "wbbw.dmmd.wbbw",
      ".ww..dmmd..ww.",
      "......dd......",
      "..............",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
    return;
  }

  // 13. Thính Phong / Thanh Phong Luân / Ám Lân / Ảnh Bộ / Bạch Cốt Độn / Cốt Thương
  if (
    id === "thinh_phong" ||
    id === "thanh_phong_luan" ||
    id === "an_lan" ||
    id === "anh_bo" ||
    id === "bach_cot_don" ||
    id === "cot_thuong"
  ) {
    const isBone = id === "bach_cot_don" || id === "cot_thuong";
    const pal = {
      d: isBone ? "#3d3530" : "#1f2e47",
      m: isBone ? "#9e9384" : "#5e4ca6",
      b: col,
      w: "#ffffff",
      e: "#ffeb78",
    };
    const rows = isBone
      ? [
          ".....wwww.....",
          "....dmmmmdd...",
          "..d.mbbwwbm.d.",
          ".d..dmbbbbmd.d",
          "..d.mbbwwbm.d.",
          ".d..dmmmmmd..d",
          "..d.mbbwwbm.d.",
          ".....ddddd....",
          "..............",
        ]
      : [
          "www........www",
          "wbbw..dd..wbbw",
          ".wwbdmbbmdww..",
          "..ddmbeebmdd..",
          ".wbbmbwwbmbbw.",
          "..dd.dmmd.dd..",
          ".....dmmd.....",
          ".....dmmd.....",
          "......dd......",
        ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
    return;
  }

  // 14. Đệ Nhị Không Khiếu & Mặc định -> Bọ Hung Thần Khiếu Vòng Đôi
  const pal = {
    d: "#4d320b",
    m: "#b37d24",
    b: col,
    w: "#ffffff",
    c: "#5ef2d6",
  };
  const rows = [
    "....c....c....",
    "...d.mmmm.d...",
    "..dmbbwwbbmd..",
    ".dmbbccccbbmd.",
    ".dmbbcwwcbbmd.",
    ".dmbbccccbbmd.",
    "..dmmbbbbmmd..",
    "...ddmmmmdd...",
    ".....dddd.....",
    "..............",
  ];
  drawSpriteGrid(ctx, rows, pal, 2, 0, 2);
}

export function getGuPixelCanvas(guOrId) {
  const id = typeof guOrId === "string" ? guOrId : guOrId?.id || "nguyet_quang";
  const cacheKey = `gu_cvs32_${id}`;
  if (ICON_DATA_URL_CACHE.has(cacheKey)) return ICON_DATA_URL_CACHE.get(cacheKey);
  const gu = typeof guOrId === "object" && guOrId ? guOrId : { id };
  const { canvas, ctx } = makeIconCanvas(32);
  ctx.save();
  ctx.translate(2, 2);
  paintGuCreature(ctx, gu);
  ctx.restore();
  addPixelOutline(ctx, 32, "#120c08");
  ICON_DATA_URL_CACHE.set(cacheKey, canvas);
  return canvas;
}

export function getGuPixelImgHtml(gu) {
  if (!gu) {
    return `<span class="ctl-empty-slot-dot"></span>`;
  }
  const cacheKey = `gu32_${gu.id}`;
  let dataUrl = ICON_DATA_URL_CACHE.get(cacheKey);
  if (!dataUrl) {
    dataUrl = getGuPixelCanvas(gu).toDataURL("image/png");
    ICON_DATA_URL_CACHE.set(cacheKey, dataUrl);
  }
  return `<img class="ctl-pixel-icon" src="${dataUrl}" alt="" draggable="false" />`;
}

export function getKillerMovePixelImgHtml(km) {
  if (!km) return "";
  const cacheKey = `km32_${km.id}`;
  let dataUrl = ICON_DATA_URL_CACHE.get(cacheKey);
  if (!dataUrl) {
    const { canvas, ctx } = makeIconCanvas(32);
    const col = km.color || "#ff9e3d";
    const pal = {
      d: "#3d120c",
      m: "#992f1c",
      b: col,
      w: "#ffffff",
      g: "#ffd970",
    };
    const rows =
      km.kind === "burst_projectiles"
        ? [
            ".........www..",
            ".......wwbbw..",
            ".....wwbbmm...",
            "...wwbbmm.....",
            "..wbbmm.g.....",
            "..wbm.gww.....",
            "...d.wwbbw....",
            "....wwbbm.....",
            "..wbbmm.......",
            ".dg........... ",
          ]
        : km.kind === "phantom_stampede"
          ? [
              "..ww......ww..",
              "..wbd....dbw..",
              "...dbmmmmbd...",
              "..dmbbbbbbmd..",
              ".dmbwddwddwmd.",
              ".dmbbggggbbmd.",
              "..dmmbbbbmmd..",
              "..d..dddd..d..",
              "..............",
            ]
          : [
              "......ww......",
              "....wwbbww....",
              "..wwbggggbww..",
              ".wbbgwwwwgbbw.",
              ".dbgwwddwwgbd.",
              ".wbbgwwwwgbbw.",
              "..wwbggggbww..",
              "....wwbbww....",
              "......ww......",
            ];
    drawSpriteGrid(ctx, rows, pal, 2, 2, 5);
    addPixelOutline(ctx, 32, "#140b08");
    dataUrl = canvas.toDataURL("image/png");
    ICON_DATA_URL_CACHE.set(cacheKey, dataUrl);
  }
  return `<img class="ctl-pixel-icon" src="${dataUrl}" alt="" draggable="false" />`;
}

function paintPixelItem(ctx, item) {
  const id = typeof item === "string" ? item : item?.id || "";
  const col = item?.color || "#d9b25f";

  // 1. Xá Lợi Cổ (Quả cầu xá lợi rực sáng đặc trưng cotienlo.com)
  if (id.startsWith("xa_loi_")) {
    const pal = {
      d: "#3b2814",
      m: col,
      b: "#fff6d6",
      w: "#ffffff",
      g: "#ffd970",
    };
    const rows = [
      "....gggg....",
      "..ggmmmmgg..",
      ".gmbbwwwwmg.",
      ".gmbwwbbwmg.",
      ".gmbbbbbbmg.",
      ".gmbbmmbbmg.",
      "..ggmmmmgg..",
      "....gggg....",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 3);
    return;
  }

  // 2. Mao Thạch (Đá thô đổ thạch có khe phát sáng) / Ngọc vụn / Tinh
  if (id.includes("mao_thach") || id.includes("ngoc") || id.includes("tinh") || id.includes("cat") || id.includes("sa")) {
    const pal = { d: "#363b40", m: "#6b737a", l: "#99a3ab", c: col, w: "#ffffff" };
    const rows = [
      "....dddd....",
      "..ddmllmd...",
      ".dmllccclmd.",
      ".dmccwcccmd.",
      ".dmmccmmcmd.",
      "..ddmmmmdd..",
      "....dddd....",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 4);
    return;
  }

  // 3. Đan dược / Rượu / Mật ong / Linh lộ
  if (id.includes("dan") || id.includes("ruou") || id.includes("mat_ong") || id.includes("linh_lo")) {
    const pal = { k: "#8a5329", w: "#fff3d6", d: "#2d3b42", b: col, l: "#ffffff" };
    const rows = [
      "....kkkk....",
      "....wwww....",
      "...ddkkdd...",
      "..ddbbbbdd..",
      ".ddbbllbbdd.",
      ".ddbbbbbbdd.",
      "..ddbbbbdd..",
      "...dddddd...",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 3);
    return;
  }

  // 3b. Hạt giống linh thảo Dược Điền
  if (id.startsWith("hat_")) {
    const pal = { d: "#1a1410", b: "#5c4028", l: "#8a623f", s: col, w: "#e2fff3" };
    const rows = [
      "....dddd....",
      "...dbbbbd...",
      "..ddllllld..",
      "..dssssssd..",
      ".dssssssssd.",
      ".dswwsssssd.",
      "..dssssssd..",
      "...dddddd...",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 3);
    return;
  }

  // 4. Thảo dược / Hồi Huyết Thảo
  if (id.includes("thao")) {
    const pal = { d: "#1d4f29", m: "#45ad5c", b: col, f: "#ffe66d", r: "#7a532e" };
    const rows = [
      ".....ff.....",
      "..bb.mm.bb..",
      ".bmmbmmbmmb.",
      "..ddmmmmdd..",
      "....mmmm....",
      ".....rr.....",
      "....r..r....",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 4);
    return;
  }

  // 5. Cá linh
  if (id.includes("ca_")) {
    const pal = { d: "#134e5e", m: col, w: "#ffffff", e: "#111" };
    const rows = [
      "............",
      "....dddd....",
      ".d.dmmmmdd..",
      "dmdmmwwmemd.",
      ".d.dmmmmdd..",
      "....dddd....",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 5);
    return;
  }

  // 6. Thịt thú / Nanh / Vảy / Bờm / Đá cường hóa
  if (id.includes("thit") || id.includes("nanh")) {
    const pal = { w: "#fff7e6", d: "#6e1c16", m: "#c9382c", b: col };
    const rows = [
      "...ww.......",
      "..w..dddd...",
      "....dmmmmdd.",
      "...dmmwwbmmd",
      "...dmmmmmmdd",
      "....dddddd..",
    ];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 5);
    return;
  }

  // 7. Hộ Cụ 4 ô (Áo / Giày / Bao tay / Bội sức)
  if (id.startsWith("armor_")) {
    const slot = id.replace("armor_", "");
    const pal = { d: "#2e2418", m: col, w: "#fff7de" };
    const rows =
      slot === "ao"
        ? ["..dd....dd..", ".dmmddddmmd.", "dmmwmmmmwmmd", ".ddmmmmmmdd.", "..dmmmmmmmd.", "..dddddddd.."]
        : slot === "giay"
          ? ["..ddd.......", "..dmd.......", "..dmd.......", "..dmmdddd...", "..dmmmmwmd..", "..dddddddd.."]
          : slot === "bao_tay"
            ? ["...ddddd....", "..dmwmmmd...", "..dmmmmmd...", "..ddmmmdd...", "...ddddd...."]
            : ["....dddd....", "...dmwwmd...", "..dmmbbmmd..", "...dmmmmd...", "....dddd...."];
    drawSpriteGrid(ctx, rows, pal, 2, 0, 4);
    return;
  }

  // Mặc định: Túi gấm / Mồi câu / Khối bảo vật
  const pal = { d: "#3d2914", m: col, w: "#fff4d1" };
  const rows = [
    "....dddd....",
    "...dmmmmdd..",
    "..dmwwwwmd..",
    "..dmmmmmmdd.",
    "...dddddd...",
  ];
  drawSpriteGrid(ctx, rows, pal, 2, 0, 6);
}

export function getItemPixelImgHtml(item) {
  const id = typeof item === "string" ? item : item?.id || "generic";
  const col = item?.color || "#d9b25f";
  const cacheKey = `it_${id}_${col}`;
  let dataUrl = ICON_DATA_URL_CACHE.get(cacheKey);
  if (!dataUrl) {
    const { canvas, ctx } = makeIconCanvas(24);
    paintPixelItem(ctx, item);
    addPixelOutline(ctx, 24, "#120c08");
    dataUrl = canvas.toDataURL("image/png");
    ICON_DATA_URL_CACHE.set(cacheKey, dataUrl);
  }
  return `<img class="ctl-pixel-icon" src="${dataUrl}" alt="" draggable="false" />`;
}
