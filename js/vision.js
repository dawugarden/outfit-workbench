/* ============================================================
 * vision.js —— 本地图像理解
 *   · 拍照后自动取色（真正的自动识别，不依赖网络）
 *   · 一句话文字的属性解析（类别 / 颜色 / 厚薄 / 材质 / 品牌色号）
 * ============================================================ */

/* ---------------- 图像工具 ---------------- */
function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("图片读取失败"));
    img.src = src;
  });
}

/* 压缩成合适大小，存 IndexedDB 不占空间 */
async function shrinkImage(src, maxDim, quality) {
  maxDim = maxDim || 760;
  quality = quality || 0.72;
  const img = await loadImage(src);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return cv.toDataURL("image/jpeg", quality);
}

/* ---------------- 颜色计算 ---------------- */
function hex2rgb(hex) {
  const h = String(hex).replace("#", "");
  const v = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h.padEnd(6, "0").slice(0, 6);
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16)
  };
}
function rgb2hex(r, g, b) {
  const f = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return "#" + f(r) + f(g) + f(b);
}
function srgb2lin(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function rgb2lab(r, g, b) {
  const R = srgb2lin(r), G = srgb2lin(g), B = srgb2lin(b);
  let x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  let y = (R * 0.2126729 + G * 0.7151522 + B * 0.0721750) / 1.00000;
  let z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}
function deltaE(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.L - c2.L, 2) + Math.pow(c1.a - c2.a, 2) + Math.pow(c1.b - c2.b, 2)
  );
}
function hex2lab(hex) {
  const c = hex2rgb(hex);
  return rgb2lab(c.r, c.g, c.b);
}

/* 把任意颜色归到色卡里最接近的那一个名字 */
function nearestColorName(hex) {
  const target = hex2lab(hex);
  let best = null, bestD = 1e9, second = null, secondD = 1e9;
  Object.keys(COLOR_DB).forEach((name) => {
    const d = deltaE(target, hex2lab(COLOR_DB[name].hex));
    if (d < bestD) { second = best; secondD = bestD; best = name; bestD = d; }
    else if (d < secondD) { second = name; secondD = d; }
  });
  return { name: best, hex: COLOR_DB[best] ? COLOR_DB[best].hex : hex, dist: bestD, alt: second };
}

/* 从照片里提取主色（取中心区域，避开纯白背景） */
async function dominantColors(src, maxN) {
  maxN = maxN || 4;
  const img = await loadImage(src);
  const W = 96, H = 96;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const side = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;

  const m = Math.round(W * 0.16); // 只分析中心 68%
  const buckets = new Map();
  for (let y = m; y < H - m; y++) {
    for (let x = m; x < W - m; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] < 125) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      let o = buckets.get(key);
      if (!o) { o = { n: 0, r: 0, g: 0, b: 0 }; buckets.set(key, o); }
      o.n++; o.r += r; o.g += g; o.b += b;
    }
  }

  let list = [...buckets.values()].map((o) => {
    const r = o.r / o.n, g = o.g / o.n, b = o.b / o.n;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    const light = (mx + mn) / 510;
    // 背景（近白 / 近黑且低饱和）降权
    let bgPenalty = 1;
    if (light > 0.93 && sat < 0.10) bgPenalty = 0.18;
    if (light < 0.10) bgPenalty = 0.45;
    const score = Math.pow(o.n, 0.82) * (0.55 + sat * 1.8) * bgPenalty;
    return { hex: rgb2hex(r, g, b), rgb: { r, g, b }, n: o.n, sat, light, score };
  }).sort((a, b) => b.score - a.score);

  const picked = [];
  list.forEach((c) => {
    if (picked.length >= maxN) return;
    const lab = rgb2lab(c.rgb.r, c.rgb.g, c.rgb.b);
    const dup = picked.some((p) => {
      const pl = rgb2lab(p.rgb.r, p.rgb.g, p.rgb.b);
      return deltaE(lab, pl) < 9;
    });
    if (!dup) picked.push(c);
  });
  return picked.length ? picked : list.slice(0, 1);
}

/* ---------------- 一句话解析 ---------------- */
function brandAliases(brandName) {
  // "MAC (魅可)" → ["mac","魅可","MAC (魅可)"]
  const out = [brandName];
  const m = brandName.match(/^(.+?)\s*[（(](.+?)[)）]\s*$/);
  if (m) {
    out.push(m[1].trim(), m[2].trim());
    out.push(m[1].trim().replace(/\s+/g, ""));
  }
  const extra = {
    mac: ["mac", "魅可", "子弹头"],
    ysl: ["ysl", "圣罗兰", "杨树林", "小金条", "黑管", "方管"],
    dior: ["dior", "迪奥", "烈艳蓝金"],
    armani: ["armani", "阿玛尼", "红管", "唇釉"],
    chanel: ["chanel", "香奈儿", "可可"],
    givenchy: ["givenchy", "纪梵希", "小羊皮"],
    "tom ford": ["tom ford", "tomford", "tf", "汤姆福特"],
    nars: ["nars", "纳斯"],
    "3ce": ["3ce", "三熹玉"],
    "完美日记": ["完美日记", "perfectdiary", "perfect diary"],
    "花西子": ["花西子", "florasis"],
    "intoyou": ["into you", "intoyou", "心慕与你"],
    "joocyee": ["joocyee", "酵色"],
    "橘朵": ["橘朵", "judydoll"],
    "毛戈平": ["毛戈平", "maogeping"],
    "卡姿兰": ["卡姿兰", "carslan"],
    "兰瑟": ["兰瑟", "lansur"]
  };
  const key = Object.keys(extra).find((k) => brandName.toLowerCase().indexOf(k) === 0 || brandName.toLowerCase().includes(k));
  if (key) out.push(...extra[key]);
  return [...new Set(out.map((s) => s.toLowerCase().trim()).filter(Boolean))];
}

/* 在品牌色号库里找 "MAC 923" / "迪奥999" 这种写法 */
function matchShade(text) {
  const low = " " + text.toLowerCase() + " ";
  const tables = [["lip", SHADE_DB.lip], ["blush", SHADE_DB.blush]];
  let best = null;
  tables.forEach(([type, table]) => {
    Object.keys(table).forEach((brand) => {
      const aliases = brandAliases(brand);
      if (!aliases.some((a) => low.includes(a))) return;
      Object.keys(table[brand]).forEach((series) => {
        table[brand][series].forEach((sh) => {
          const code = String(sh.code).toLowerCase();
          const hitCode = low.includes(code) && code.length >= 2;
          const hitNick = sh.nick && text.includes(sh.nick);
          if (hitCode || hitNick) {
            const score = (hitCode ? 10 : 0) + code.length + (hitNick ? 4 : 0);
            if (!best || score > best.score) {
              best = {
                score, type, brand, series, code: sh.code, nick: sh.nick || "",
                family: sh.family, hex: sh.hex
              };
            }
          }
        });
      });
    });
  });
  return best;
}

/* 无品牌时，按色号唯一命中 */
function matchShadeGlobal(text) {
  const codes = [...text.matchAll(/(?:#|no\.?|号)?([0-9]{2,4}[a-z]?|[A-Z]{2,}[0-9]{0,3})/g)].map((m) => m[1]);
  if (!codes.length) return null;
  const hits = [];
  ["lip", "blush"].forEach((type) => {
    const table = SHADE_DB[type];
    Object.keys(table).forEach((brand) => {
      Object.keys(table[brand]).forEach((series) => {
        table[brand][series].forEach((sh) => {
          if (codes.some((c) => String(sh.code).toLowerCase() === c.toLowerCase())) {
            hits.push({ type, brand, series, code: sh.code, nick: sh.nick || "", family: sh.family, hex: sh.hex });
          }
        });
      });
    });
  });
  const brands = new Set(hits.map((h) => h.brand));
  if (hits.length && brands.size === 1) return hits[0];
  return null;
}

function detectColor(text) {
  let bestName = null, bestLen = 0;
  // 先查别名（更口语）
  Object.keys(COLOR_ALIAS).forEach((alias) => {
    if (text.includes(alias) && alias.length > bestLen) { bestName = COLOR_ALIAS[alias]; bestLen = alias.length; }
  });
  Object.keys(COLOR_DB).forEach((name) => {
    if (text.includes(name) && name.length > bestLen) { bestName = name; bestLen = name.length; }
  });
  return bestName;
}

function detectByKwList(text, list) {
  for (const pair of list) {
    const cat = pair[0], kws = pair[1];
    for (const k of kws) {
      if (text.toLowerCase().includes(k.toLowerCase())) return cat;
    }
  }
  return null;
}

function guessThick(text, cat) {
  for (const pair of THICK_KW) {
    const val = pair[0];
    if (pair[1].some((k) => text.toLowerCase().includes(k.toLowerCase()))) return val;
  }
  return { 上装: 3, 外搭: 4, 下装: 3, 连衣裙: 2, 鞋子: 2 }[cat] || 3;
}

/* 主入口：把一句话变成一条待确认的记录 */
function parseOneLine(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;

  // 1) 品牌色号（彩妆）
  const shade = matchShade(text) || matchShadeGlobal(text);
  if (shade && !/裙|裤|鞋|靴|外套|大衣/.test(text)) {
    const label = shade.brand + " · " + shade.code + (shade.nick ? " · " + shade.nick : "");
    return {
      kind: "makeup",
      makeupType: shade.type === "blush" ? "腮红" : "口红",
      name: label,
      brand: shade.brand, shade: String(shade.code), series: shade.series,
      family: shade.family, hex: shade.hex,
      matched: true, source: "色号库命中"
    };
  }

  const isClothesFirst = /裙|裤|鞋|靴|外套|大衣|衫|T恤|t恤|衣/.test(text) && !/项链|耳|手链|戒指/.test(text);
  const accCat = isClothesFirst ? null : detectByKwList(text, ACC_KW);

  if (accCat) {
    const metal = detectByKwList(text, METAL_KW) || "";
    const material = detectByKwList(text, MATERIAL_KW) || "";
    /* 配饰常只有金属色没有织物色，用金属色兜底，免得配色建议取不到颜色 */
    const color = detectColor(text) || (typeof METAL_COLOR !== "undefined" && METAL_COLOR[metal]) || "";
    return {
      kind: "acc",
      cat: accCat,
      name: text,
      color,
      metal, material,
      style: detectByKwList(text, STYLE_KW) || "",
      source: "文字识别"
    };
  }

  const cat = detectByKwList(text, CLOTHES_KW) || "上装";
  return {
    kind: "clothes",
    cat,
    name: text,
    color: detectColor(text) || "",
    thick: guessThick(text, cat),
    material: detectByKwList(text, MATERIAL_KW) || "",
    style: detectByKwList(text, STYLE_KW) || "",
    source: "文字识别"
  };
}

/* 只给建议名：把照片物品默认命名 */
function guessNameFromCat(cat, color) {
  const base = {
    上装: "上装", 外搭: "外套", 下装: "下装", 连衣裙: "连衣裙", 鞋子: "鞋子",
    耳饰: "耳饰", 项链: "项链", 戒指: "戒指", 手链: "手链", 手表: "手表",
    发饰: "发饰", 帽子: "帽子", 围巾: "围巾", 腰带: "腰带", 墨镜: "墨镜", 包袋: "包"
  }[cat] || "单品";
  return (color ? color : "") + base;
}
