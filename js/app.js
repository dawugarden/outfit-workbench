/* ============================================================
 * app.js —— 交互与渲染
 * ============================================================ */

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function colorOf(name) { return COLOR_DB[name] || { hex: "#D8D2C9", tone: "neutral", depth: 5 }; }

/* 安全滚动：部分 App 内置浏览器没有 scrollIntoView，直接调用会报错中断流程 */
function scrollTo_(el, opts) {
  if (!el) return;
  try {
    if (typeof el.scrollIntoView === "function") { el.scrollIntoView(opts); return; }
    const r = el.getBoundingClientRect();
    window.scrollTo(0, window.pageYOffset + r.top + (opts && opts.block === "center" ? -120 : -12));
  } catch (e) { /* 滚动失败不影响功能 */ }
}

let _toastTimer = null;
function toast(msg, type) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast" + (type === "warn" ? " warn" : "");
  t.hidden = false;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}
function buzz(ms) { if (navigator.vibrate) try { navigator.vibrate(ms || 12); } catch (e) { } }

/* ============================================================
 * 启动
 * ============================================================ */
S = loadState();

const TODAY_SEL = { occasion: "日常通勤", items: {} };

/* ---------- 路由 ---------- */
const PAGE_TITLES = { today: "今日", wardrobe: "衣橱", makeup: "彩妆", acc: "配饰", me: "我的" };
function setPage(name) {
  $$("#tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.page === name));
  $$(".page").forEach((p) => p.classList.toggle("show", p.id === "page-" + name));
  if (name === "wardrobe") renderWardrobe();
  if (name === "acc") renderAcc();
  if (name === "makeup") renderMakeup();
  if (name === "me") renderMe();
  window.scrollTo({ top: 0 });
}

/* ============================================================
 * 今日：温度 / 场合 / 选衣
 * ============================================================ */
const QUICK_TEMP = [
  ["❄️ 5°", 5], ["🧥 10°", 10], ["🍂 14°", 14], ["🌤️ 18°", 18],
  ["😊 22°", 22], ["☀️ 28°", 28], ["🥵 32°", 32]
];

function getTemp() {
  const v = parseInt($("#tempInput").value, 10);
  return isNaN(v) ? 20 : v;
}
function setTemp(v) {
  v = Math.max(-20, Math.min(45, v));
  $("#tempInput").value = v;
  onTempChange();
}
function onTempChange() {
  const t = getTemp(), b = tempBand(t);
  $("#tempBandLabel").textContent = b.name + " · " + b.range[0] + "~" + b.range[1] + " 最合适";
  renderPicker();
}

function renderQuickTemp() {
  $("#quickTemp").innerHTML = QUICK_TEMP.map(
    ([label, t]) => `<button class="chip mini" data-t="${t}">${label}</button>`
  ).join("");
}

function renderOccasions() {
  $("#occChips").innerHTML = Object.keys(OCCASIONS).map(
    (n) => `<button class="chip ${TODAY_SEL.occasion === n ? "on" : ""}" data-occ="${esc(n)}">${esc(n)}</button>`
  ).join("");
}

function itemFit(thick, t) {
  const band = tempBand(t);
  const lo = band.range[0], hi = band.range[1];
  if (thick >= lo && thick <= hi) return { cls: "ok", txt: "适温" };
  if (thick > hi) return { cls: "hot", txt: "偏热" };
  return { cls: "cold", txt: "偏冷" };
}

function renderPicker() {
  const t = getTemp();
  const dressMode = !!TODAY_SEL.items["连衣裙"];
  const hasDress = S.wardrobe.some((w) => w.cat === "连衣裙");
  let cats = dressMode ? ["连衣裙", "外搭", "鞋子"] : ["上装", "外搭", "下装", "鞋子"];
  if (!dressMode && hasDress) cats.push("连衣裙");

  const html = cats.map((cat) => {
    const items = S.wardrobe.filter((w) => w.cat === cat);
    const optional = cat === "外搭" || cat === "连衣裙";
    let chips = items.map((w) => {
      const on = TODAY_SEL.items[cat] === w.id;
      const f = itemFit(w.thick, t);
      return `<button class="chip ${on ? "on" : ""}" data-pick="${cat}" data-id="${w.id}">
        <span class="dot" style="background:${colorOf(w.color).hex}"></span>${esc(w.note || w.color)}
        <span class="fit ${f.cls}">${f.txt}</span></button>`;
    }).join("");
    if (!items.length) {
      chips = `<button class="chip mini" data-add="clothes">＋ 先去添加${esc(cat)}</button>`;
    }
    return `<div class="sec-title">${CAT_ICON[cat] || ""} ${esc(cat)}
      ${optional ? '<span class="tip">（可不选）</span>' : ""}</div><div class="chips">${chips}</div>`;
  }).join("");

  $("#pickerArea").innerHTML = html ||
    `<div class="empty">衣橱还是空的，点下面的「添加」把你自己的衣服拍进来吧</div>`;
}

/* ---------- 自动配一套 ---------- */
function autoPickOutfit() {
  const t = getTemp();
  if (!S.wardrobe.length) { toast("衣橱里还没有衣物，先去添加几件", "warn"); return; }
  const occVibes = (OCCASIONS[TODAY_SEL.occasion] || {}).vibes || [];
  const wantCold = occVibes.some((v) => ["正式", "气质", "清冷", "秋冬"].includes(v)) || t <= 10;

  const usedColors = () => Object.keys(TODAY_SEL.items).map((k) => {
    const w = findWardrobe(TODAY_SEL.items[k]);
    return w ? w.color : null;
  }).filter(Boolean);

  function pickOne(cat) {
    const pool = S.wardrobe.filter((w) => w.cat === cat);
    if (!pool.length) return null;
    const okPool = pool.filter((w) => itemFit(w.thick, t).cls === "ok");
    const cand = okPool.length ? okPool : pool;
    const used = usedColors();
    const scored = cand.map((w) => {
      const info = colorOf(w.color);
      const f = itemFit(w.thick, t);
      let s = f.cls === "ok" ? 3 : (f.cls === "hot" ? -1 : -2);
      if (used.indexOf(w.color) === -1) s += 2; else s -= .5;
      if (cat !== "外搭") {
        if (wantCold && info.tone === "cold") s += 2;
        if (!wantCold && info.tone === "warm") s += 1.5;
      }
      if (cat === "下装" && used.indexOf(w.color) !== -1) s -= 1;
      return { w, s: s + Math.random() * 0.8 };
    }).sort((a, b) => b.s - a.s);
    return scored[0] ? scored[0].w : null;
  }

  TODAY_SEL.items = {};
  const dress = S.wardrobe.filter((w) => w.cat === "连衣裙");
  const useDress = dress.length && Math.random() < 0.35 && tempBand(t).range[0] >= 2;
  if (useDress) {
    const w = pickOne("连衣裙"); if (w) TODAY_SEL.items["连衣裙"] = w.id;
  }
  if (!TODAY_SEL.items["连衣裙"]) {
    ["上装", "下装", "鞋子"].forEach((c) => { const w = pickOne(c); if (w) TODAY_SEL.items[c] = w.id; });
  } else {
    const w = pickOne("鞋子"); if (w) TODAY_SEL.items["鞋子"] = w.id;
  }
  if (tempBand(t).range[0] >= 3) {
    const w = pickOne("外搭");
    if (w) TODAY_SEL.items["外搭"] = w.id;
  }
  renderPicker();
  $("#resultBox").innerHTML = "";
  buzz();
  scrollTo_($("#pickerArea"), { behavior: "smooth", block: "center" });
}

/* ============================================================
 * 推荐引擎（在旧版基础上扩展：连衣裙 + 配饰 + 包袋）
 * ============================================================ */
function analyzeOutfit() {
  const pieces = [];
  [["上装", 1], ["连衣裙", 1], ["外搭", .9], ["下装", .6], ["鞋子", .4]].forEach(([cat, wgt]) => {
    if (TODAY_SEL.items[cat]) {
      const w = findWardrobe(TODAY_SEL.items[cat]);
      if (w) pieces.push({ w, weight: wgt });
    }
  });
  if (!pieces.length) return null;
  let tS = 0, tW = 0, dS = 0, dW = 0;
  const colors = [], hexes = [];
  pieces.forEach((p) => {
    const c = colorOf(p.w.color);
    tS += (c.tone === "cold" ? -1 : (c.tone === "warm" ? 1 : 0)) * p.weight;
    tW += p.weight;
    dS += c.depth * p.weight; dW += p.weight;
    colors.push(p.w.color); hexes.push(c.hex);
  });
  const tAvg = tS / tW;
  const tone = tAvg < -.28 ? "cold" : (tAvg > .28 ? "warm" : "neutral");
  return {
    tone, depth: Math.round(dS / dW), colors, hexes, pieces,
    allNeutral: colors.every((cn) => colorOf(cn).tone === "neutral")
  };
}

function scoreFamily(fam, tone, occ) {
  let s = 0; const reasons = [];
  if (fam.tone === tone) { s += 3; reasons.push(tone === "cold" ? "冷调配冷调，和谐" : (tone === "warm" ? "暖调配暖调，和谐" : "中性百搭")); }
  else if (fam.tone === "neutral") { s += 1.5; reasons.push("中性色不挑衣服冷暖"); }
  else { s -= 3; reasons.push("与衣服冷暖相冲，慎选"); }
  const od = OCCASIONS[occ] || { vibes: [], lipSat: [1, 5] };
  if (fam.vibes.some((v) => od.vibes.includes(v))) { s += 2; reasons.push("契合「" + occ + "」"); }
  const lo = od.lipSat[0], hi = od.lipSat[1];
  if (fam.sat >= lo && fam.sat <= hi) s += 1;
  else { s -= 1.5; reasons.push("饱和度与场合" + (fam.sat < lo ? "略淡" : "略重") + "，可薄涂/叠涂调整"); }
  return { score: s, reasons };
}

function recLip(analysis) {
  const occ = TODAY_SEL.occasion;
  const scored = S.makeup.lip.map((lp) => {
    const fam = LIP_FAMILIES[lp.family] || { tone: "neutral", sat: 3, vibes: [], desc: "" };
    return Object.assign({ type: "own", lp, fam }, scoreFamily(fam, analysis.tone, occ));
  }).sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  const fams = Object.keys(LIP_FAMILIES).map((k) =>
    Object.assign({ type: "suggest", famKey: k, fam: LIP_FAMILIES[k] }, scoreFamily(LIP_FAMILIES[k], analysis.tone, occ))
  ).sort((a, b) => b.score - a.score);
  const usedFams = top.map((t) => t.lp.family);
  return top.concat(fams.filter((f) => !usedFams.includes(f.famKey)).slice(0, 3 - top.length));
}

function recBlush(analysis) {
  const occ = TODAY_SEL.occasion;
  const scored = S.makeup.blush.map((bl) => {
    const fam = BLUSH_FAMILIES[bl.family] || { tone: "neutral", sat: 2, vibes: [], desc: "" };
    return Object.assign({ type: "own", bl, fam }, scoreFamily(fam, analysis.tone, occ));
  }).sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 2);
  if (top.length < 2) {
    const fams = Object.keys(BLUSH_FAMILIES).map((k) =>
      Object.assign({ type: "suggest", famKey: k, fam: BLUSH_FAMILIES[k] }, scoreFamily(BLUSH_FAMILIES[k], analysis.tone, occ))
    ).sort((a, b) => b.score - a.score);
    const usedFams = top.map((t) => t.bl.family);
    top.push(...fams.filter((f) => !usedFams.includes(f.famKey)).slice(0, 2 - top.length));
  }
  return top;
}

function recHair(analysis) {
  const { tone, colors, allNeutral } = analysis;
  const cSet = new Set(colors);
  let want = [], strategy = "";
  if (allNeutral) {
    want = tone === "cold" ? ["酒红", "雾霾蓝", "干枯玫瑰粉", "黑", "白"] : ["驼", "卡其", "红", "棕", "米白"];
    strategy = "全身中性色，发饰可以做小面积点缀，选一个低饱和的有彩色最好看。";
  } else {
    want = ["白", "米白", "黑", "灰"].filter((c) => COLOR_DB[c]);
    const main = colorOf(colors[0]);
    if (main && main.depth >= 5) {
      const lighter = Object.keys(COLOR_DB).find((k) => COLOR_DB[k].tone === main.tone && COLOR_DB[k].depth <= main.depth - 3);
      if (lighter) want.unshift(lighter);
    }
    strategy = "衣服已经有彩色了，发饰从同色系浅一档或黑/白/米里选，别抢主色的戏。";
  }
  const own = S.accessories.filter((a) => a.cat === "发饰" && want.includes(a.color));
  return { want, own, strategy };
}

function recAccessories(analysis, temp) {
  const tone = analysis.tone;
  const wantMetal = tone === "cold" ? "银色" : (tone === "warm" ? "金色" : null);
  const metalOk = (a) => !wantMetal || !a.metal || a.metal === wantMetal;
  const by = (cat, filter) => S.accessories.filter((a) => a.cat === cat && (!filter || filter(a)));

  const toneTxt = tone === "cold"
    ? "整体偏冷调 → 银色 / 珍珠最有清冷感，金色会有点跳。"
    : tone === "warm"
      ? "整体偏暖调 → 金色 / 玫瑰金更衬气色，银色容易显割裂。"
      : "冷暖平衡 → 银金都行，看当天心情。";

  const shoe = TODAY_SEL.items["鞋子"] ? findWardrobe(TODAY_SEL.items["鞋子"]) : null;
  const shoeColor = shoe ? shoe.color : null;
  const neutralBags = ["黑", "咖", "驼", "米白", "棕", "白"];
  let bags = by("包袋");
  let bagStrategy = "";
  if (shoeColor) {
    const same = bags.filter((b) => b.color === shoeColor);
    if (same.length) { bags = same; bagStrategy = "包和鞋同色最稳，整个人看起来是有搭配的。"; }
    else {
      const neu = bags.filter((b) => neutralBags.includes(b.color));
      bags = neu.length ? neu : bags;
      bagStrategy = "没有和鞋同色的包，就选中性色（黑/驼/米白），永远不会错。";
    }
  } else if (bags.length) {
    bagStrategy = "选中性色包最百搭。";
  }

  const scarf = by("围巾", metalOk);
  const hat = by("帽子", metalOk);

  return {
    wantMetal, toneTxt,
    ear: by("耳饰", metalOk), neck: by("项链", metalOk),
    ring: by("戒指", metalOk), brace: by("手链", metalOk), watch: by("手表", metalOk),
    hair: by("发饰"), bags, bagStrategy,
    scarf, hat, temp
  };
}

function styleOf(analysis) {
  const { tone, depth, colors } = analysis;
  const has = (c) => colors.includes(c);
  const allNeutralDeep = colors.every((c) => colorOf(c).tone === "neutral") && depth >= 6;
  if ((has("藏蓝") || has("深灰") || has("灰") || has("雾霾蓝")) && (tone === "cold" || tone === "neutral"))
    return { name: "清冷知性风", txt: "藏蓝配灰是高级感天花板，安静但有力量，通勤和正式场合都压得住。" };
  if (allNeutralDeep) return { name: "极简高级风", txt: "黑白灰深色系，less is more，配一个红唇就是行走的杂志感。" };
  if (has("驼") || has("咖") || has("卡其") || (has("米白") && tone === "warm"))
    return { name: "温柔奶咖风", txt: "大地色系温柔挂，像加了奶的咖啡，亲和力满分。" };
  if (has("粉") || has("干枯玫瑰粉") || has("香芋紫"))
    return { name: "温柔甜妹风", txt: "粉色系自带柔光滤镜，妆容走水润元气路线最搭。" };
  if (has("军绿") || has("牛油果绿")) return { name: "美式休闲风", txt: "工装色系随性帅气，配小白鞋和金属耳环就很完整。" };
  if (has("牛仔蓝") && depth <= 6) return { name: "清爽学院风", txt: "丹宁色系干净清爽，减龄不出错的日常公式。" };
  if (has("黑") && depth >= 7) return { name: "酷感御姐风", txt: "黑色主场气场拿捏，唇色可以大胆一点。" };
  if (has("红") || has("酒红")) return { name: "复古港风", txt: "浓郁的红自带复古滤镜，配大红唇和金耳环，氛围感拉满。" };
  return { name: "自然日常风", txt: "舒适自然的组合，怎么穿都不出错。" };
}

/* ---------- 生成结果 ---------- */
function generate() {
  const temp = getTemp();
  if (!TODAY_SEL.items["上装"] && !TODAY_SEL.items["连衣裙"]) {
    toast("至少选一件上装或连衣裙", "warn"); return;
  }
  const analysis = analyzeOutfit();
  if (!analysis) { toast("没找到选中的衣物", "warn"); return; }

  const occ = TODAY_SEL.occasion;
  const style = styleOf(analysis);
  const band = tempBand(temp);
  const lips = recLip(analysis);
  const blushes = recBlush(analysis);
  const hair = recHair(analysis);
  const acc = recAccessories(analysis, temp);

  const warns = [];
  ["上装", "外搭", "下装", "连衣裙", "鞋子"].forEach((cat) => {
    const id = TODAY_SEL.items[cat];
    if (!id) return;
    const w = findWardrobe(id);
    if (!w) return;
    const f = itemFit(w.thick, temp);
    if (f.cls === "hot") warns.push("「" + (w.note || w.color) + "」今天穿可能偏热");
    if (f.cls === "cold") warns.push("「" + (w.note || w.color) + "」今天穿可能偏冷");
  });

  const fdTxt = temp >= 26
    ? "持妆控油款优先，薄涂 + 定妆喷雾。"
    : (temp <= 15 ? "保湿妆前乳打底，粉底少量多次，防卡粉起皮。" : "底妆正常上，轻薄服帖即可。");
  const fdOcc = occ === "正式场合" ? "正式场合建议全脸妆感统一、遮瑕到位。"
    : (occ === "休闲出游" ? "出游可以省掉全脸粉底，局部遮瑕 + 防晒更轻便。" : "");

  const pills = analysis.pieces.map((p) =>
    `<span class="outfit-pill"><span class="dot" style="background:${colorOf(p.w.color).hex}"></span>${esc(p.w.cat)} · ${esc(p.w.note || p.w.color)}</span>`
  ).join("");

  let h = "";
  h += `<div class="style-head">
    <div class="name">🎀 ${esc(style.name)}</div>
    <div class="tagline">${esc(style.txt)}</div>
    <div class="outfit-line">${pills}
      <span class="outfit-pill">🌡️ ${temp}℃ · ${esc(band.name)}</span>
      <span class="outfit-pill">📍 ${esc(occ)}</span>
    </div></div>`;

  h += warns.length
    ? `<div class="warn-box">🌡️ ${warns.map(esc).join("；")}。${esc(band.tip)}</div>`
    : `<div class="warn-box good">🌡️ ${esc(band.tip)}</div>`;

  /* 口红 */
  h += `<div class="sec-title">💄 口红</div><div class="rec-grid">`;
  lips.forEach((r, i) => {
    const name = r.type === "own" ? r.lp.name : "建议入一支「" + r.famKey + "」";
    const hex = r.type === "own" ? r.lp.hex : r.fam.ex;
    h += `<div class="rec"><div class="sw" style="background:${hex}"></div><div>
      <h4>${esc(name)}</h4>
      <div class="why">${r.type === "own" ? "色系 " + esc(r.lp.family) + " · " : ""}${esc(r.reasons.slice(0, 2).join("；"))}</div>
      ${i === 0 ? '<span class="badge">首推</span>' : ""}</div></div>`;
  });
  h += `</div>`;

  /* 腮红 */
  h += `<div class="sec-title">🌸 腮红</div><div class="rec-grid">`;
  blushes.forEach((r) => {
    const name = r.type === "own" ? r.bl.name : "建议补一块「" + r.famKey + "」";
    const hex = r.type === "own" ? r.bl.hex : r.fam.ex;
    h += `<div class="rec"><div class="sw" style="background:${hex}"></div><div>
      <h4>${esc(name)}</h4><div class="why">${esc(r.reasons.slice(0, 2).join("；"))}</div></div></div>`;
  });
  h += `</div>`;

  /* 配饰 */
  const line = (label, arr, emptyTxt) => `<div style="margin-top:5px">${label}：${
    arr.length ? "<b>" + esc(arr.map((x) => x.name).join("、")) + "</b>" : `<span style="color:#A9A19C">${emptyTxt}</span>`
  }</div>`;

  h += `<div class="sec-title">💎 首饰</div><div class="tip-box">
    ${esc(acc.toneTxt)}
    ${line("耳饰", acc.ear, acc.wantMetal ? "还没有" + acc.wantMetal + "耳饰，可补一对小耳钉" : "还没有耳饰")}
    ${line("项链", acc.neck, "建议补一条细锁骨链，几乎万能")}
    ${acc.ring.length ? line("戒指", acc.ring, "") : ""}
    ${acc.brace.length ? line("手链", acc.brace, "") : ""}
    ${acc.watch.length ? line("手表", acc.watch, "") : ""}
  </div>`;

  h += `<div class="sec-title">🎀 发饰</div><div class="tip-box">${esc(hair.strategy)}
    <div style="margin-top:5px">推荐颜色：${hair.want.map((c) => `<span class="dot" style="background:${colorOf(c).hex};vertical-align:-2px"></span> ${esc(c)}`).join("　")}</div>
    <div style="margin-top:5px">你的发饰：${hair.own.length ? "<b>" + esc(hair.own.map((x) => x.name).join("、")) + "</b>" : '<span style="color:#A9A19C">没有合适的，可补一个</span>'}</div>
  </div>`;

  /* 包袋 */
  h += `<div class="sec-title">👜 包袋</div><div class="tip-box">${esc(acc.bagStrategy || "选中性色包最百搭。")}
    <div style="margin-top:5px">今天可以背：${acc.bags.length ? "<b>" + esc(acc.bags.slice(0, 3).map((x) => x.name).join("、")) + "</b>" : '<span style="color:#A9A19C">包柜里还没有记录</span>'}</div>
  </div>`;

  /* 帽子围巾按温度 */
  if (temp <= 16 || acc.scarf.length || acc.hat.length) {
    const parts = [];
    if (temp <= 16) parts.push(temp <= 8 ? "今天冷，围巾 + 帽子都要，护住脖子和耳朵。" : "早晚凉，加条围巾会舒服很多。");
    h += `<div class="sec-title">🧣 帽子 / 围巾</div><div class="tip-box">${esc(parts.join(""))}
      ${line("围巾", acc.scarf, "还没记录围巾")}
      ${line("帽子", acc.hat, "还没记录帽子")}
    </div>`;
  }

  /* 底妆 + 小贴士 */
  h += `<div class="two-col" style="margin-top:16px">
    <div><div class="sec-title">🧴 底妆</div><div class="tip-box">${esc(fdTxt + " " + fdOcc)}
      ${S.makeup.base.length ? "<br>你的底妆：<b>" + esc(S.makeup.base.map((f) => f.name).join(" / ")) + "</b>" : ""}
    </div></div>
    <div><div class="sec-title">💡 小贴士</div><div class="tip-box">${
      analysis.tone === "cold" ? "整体偏<b>冷调</b>，唇颊保持玫瑰/梅子系最显贵，配饰走银色。"
        : analysis.tone === "warm" ? "整体偏<b>暖调</b>，唇颊用珊瑚/蜜桃/砖红系最提气色，配饰走金色。"
          : "冷暖<b>平衡</b>，妆容怎么配都和谐，是试新口红的好日子。"
    } 口红薄涂是日常感，厚涂叠深色就是气场感，一支两用。</div></div>
  </div>`;

  h += `<div class="btn-row"><button class="btn ghost block" id="saveHistBtn">📖 保存这套到记录</button></div>`;

  $("#resultBox").innerHTML = `<div class="card">${h}</div>`;
  $("#saveHistBtn").onclick = () => {
    S.history.unshift({
      date: new Date().toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", weekday: "short" }),
      temp, occ, styleName: style.name,
      outfit: analysis.pieces.map((p) => p.w.cat + "·" + (p.w.note || p.w.color)).join(" / "),
      lips: lips.filter((l) => l.type === "own").map((l) => l.lp.name).slice(0, 3).join("、"),
      blush: (blushes.find((b) => b.type === "own") || {}).bl ? blushes.find((b) => b.type === "own").bl.name : ""
    });
    saveState(); buzz();
    toast("已保存到搭配记录");
    renderMe();
  };
  scrollTo_($("#resultBox"), { behavior: "smooth", block: "start" });
}

/* ============================================================
 * 衣橱 / 配饰 / 彩妆 列表
 * ============================================================ */
let W_FILTER = "全部";
let A_FILTER = "全部";
let M_TAB = "lip";

function itemCard(o) {
  const sub = o.sub ? `<div class="sub">${o.sub}</div>` : "";
  return `<div class="item" data-open="${o.id}">
    <div class="thumb">
      <img alt="" loading="lazy">
      <div class="ph" style="background:${o.colorHex || "#F1EAE1"}">${o.icon || ""}</div>
      ${o.tag ? `<span class="tag">${esc(o.tag)}</span>` : ""}
      <button class="fav" data-del="${o.id}" data-kind="${o.kind}">✕</button>
    </div>
    <div class="meta"><b>${esc(o.title)}</b>${sub}</div>
  </div>`;
}

async function paintPhotos(scope) {
  const imgs = $$(".item .thumb img", scope);
  for (const img of imgs) {
    const wrap = img.parentElement;
    const id = wrap.parentElement.dataset.open;
    const url = await PhotoDB.get(id);
    if (url) { img.src = url; wrap.classList.add("has-photo"); }
  }
}

function emptyBox(html) { return `<div class="empty">${html}</div>`; }

function renderWardrobe() {
  const cats = ["全部"].concat(CAT_CLOTHES);
  $("#wFilter").innerHTML = cats.map((c) =>
    `<button class="chip mini ${W_FILTER === c ? "on" : ""}" data-wf="${esc(c)}">${c === "全部" ? "全部" : (CAT_ICON[c] + " " + c)}</button>`
  ).join("");

  const list = S.wardrobe.filter((w) => W_FILTER === "全部" || w.cat === W_FILTER);
  const box = $("#wGrid");
  if (!list.length) {
    box.className = "";
    box.innerHTML = emptyBox(S.wardrobe.length
      ? "这个分类下还没有东西"
      : `衣橱空空的<br>点右上角 <b>＋ 添加</b>，对着衣服拍一张就自动入库了`);
    return;
  }
  box.className = "grid";
  box.innerHTML = list.map((w) => itemCard({
    id: w.id, kind: "wardrobe", icon: CAT_ICON[w.cat] || "👕",
    colorHex: colorOf(w.color).hex,
    title: w.note || w.color,
    tag: w.cat,
    sub: `<span class="dot" style="background:${colorOf(w.color).hex}"></span>${esc(w.color)} · 厚薄${w.thick}`
  })).join("");
  paintPhotos(box);
}

function renderAcc() {
  const cats = ["全部"].concat(CAT_ACC);
  $("#aFilter").innerHTML = cats.map((c) =>
    `<button class="chip mini ${A_FILTER === c ? "on" : ""}" data-af="${esc(c)}">${c === "全部" ? "全部" : (CAT_ICON[c] + " " + c)}</button>`
  ).join("");

  const list = S.accessories.filter((a) => A_FILTER === "全部" || a.cat === A_FILTER);
  const box = $("#aGrid");
  if (!list.length) {
    box.className = "";
    box.innerHTML = emptyBox(S.accessories.length
      ? "这个分类下还没有东西"
      : `还没有配饰记录<br>耳环、项链、帽子、包……拍一张就能加进来`);
    return;
  }
  box.className = "grid";
  box.innerHTML = list.map((a) => itemCard({
    id: a.id, kind: "acc", icon: CAT_ICON[a.cat] || "💎",
    colorHex: a.color ? colorOf(a.color).hex : "#F1EAE1",
    title: a.name, tag: a.cat,
    sub: [a.color, a.metal, a.material].filter(Boolean).map(esc).join(" · ")
  })).join("");
  paintPhotos(box);
}

const M_TABS = { lip: "口红", blush: "腮红", base: "底妆", eye: "眼影" };
function renderMakeup() {
  const list = S.makeup[M_TAB] || [];
  $("#mSeg").innerHTML = Object.keys(M_TABS).map((k) =>
    `<button class="${M_TAB === k ? "on" : ""}" data-mt="${k}">${
      { lip: "💄", blush: "🌸", base: "🧴", eye: "🎨" }[k]} ${M_TABS[k]} ${(S.makeup[k] || []).length}</button>`
  ).join("");
  $("#mCount").textContent = list.length ? "共 " + list.length + " 件" : "";

  const box = $("#mList");
  if (!list.length) {
    box.className = "";
    box.innerHTML = emptyBox(`还没有${M_TABS[M_TAB]}记录<br>上面打一句 <b>品牌 + 色号</b> 就能自动识别属性`);
    return;
  }
  box.className = "grid";
  box.innerHTML = list.map((m) => itemCard({
    id: m.id, kind: "makeup", icon: { lip: "💄", blush: "🌸", base: "🧴", eye: "🎨" }[M_TAB],
    colorHex: m.hex || "#F1EAE1",
    title: m.name, tag: M_TABS[M_TAB],
    sub: m.family ? esc(m.family) + " 系" : (m.hex ? esc(m.hex) : "无颜色")
  })).join("");
  paintPhotos(box);
}

/* ============================================================
 * 一句话速录
 * ============================================================ */
function quickParse(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  const shade = matchShade(t) || matchShadeGlobal(t);

  let type = null;
  if (/粉底|气垫|遮瑕|隔离|粉霜|BB霜|bb霜|散粉|定妆/.test(t)) type = "base";
  else if (/眼影/.test(t)) type = "eye";
  else if (/腮红|腮/.test(t)) type = "blush";
  else if (/口红|唇釉|唇泥|唇膏|唇彩|染唇|唇露/.test(t)) type = "lip";

  if (shade && (!type || type === "lip" || type === "blush")) {
    const st = type || (shade.type === "blush" ? "blush" : "lip");
    return {
      type: st,
      name: shade.brand + " · " + shade.code + (shade.nick ? " · " + shade.nick : ""),
      family: shade.family, hex: shade.hex, hit: true
    };
  }
  if (type === "base") {
    return { type: "base", name: t, hit: false };
  }
  // 只有色系名
  if (type === "lip" || type === "blush") {
    const FAM = type === "lip" ? LIP_FAMILIES : BLUSH_FAMILIES;
    const key = Object.keys(FAM).find((k) => t.includes(k));
    if (key) return { type, name: t, family: key, hex: FAM[key].ex, hit: true, byFamily: true };
    return { type, name: t, family: Object.keys(FAM)[0], hex: FAM[Object.keys(FAM)[0]].ex, hit: false };
  }
  if (type === "eye") {
    return { type: "eye", name: t, hex: "#B08A76", hit: false };
  }
  return null;
}

function quickPreview() {
  const text = $("#quickInput").value;
  const p = quickParse(text);
  const box = $("#quickResult");
  if (!text.trim()) { box.innerHTML = ""; return; }
  if (!p) {
    box.innerHTML = `<span class="miss">没认出是哪一类。可以带关键词，比如「口红」「腮红」「粉底」。</span>`;
    return;
  }
  const fam = p.family ? (p.type === "lip" ? LIP_FAMILIES[p.family] : (p.type === "blush" ? BLUSH_FAMILIES[p.family] : null)) : null;
  const swHex = p.hex || "#D8D2C9";
  box.innerHTML = `<span class="${p.hit ? "ok" : "miss"}">${p.hit ? "✓ 识别到" : "✗ 色号库没收录，按颜色关键词估算"}</span>
    <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
      <span style="width:24px;height:24px;border-radius:50%;border:1px solid rgba(0,0,0,.1);background:${swHex}"></span>
      <b>${esc(p.name)}</b>
      <span style="color:#8A8380">→ ${esc(M_TABS[p.type] || p.type)}${p.family ? " · " + esc(p.family) + "系" : ""}${fam ? " · " + esc(fam.vibes.join("/")) : ""}</span>
    </div>`;
}

function quickAdd() {
  const p = quickParse($("#quickInput").value);
  if (!p) { toast("没认出这一条，试试带上「口红 / 腮红 / 粉底」", "warn"); return; }
  addMakeup(p.type, { name: p.name, family: p.family || "", hex: p.hex || "" });
  $("#quickInput").value = "";
  $("#quickResult").innerHTML = "";
  M_TAB = p.type;
  renderMakeup(); buzz();
  toast("已加入「" + M_TABS[p.type] + "」");
}

/* ============================================================
 * 添加 / 拍照识别 弹层
 * ============================================================ */
const ADD = {
  kind: "clothes",      // clothes | acc | makeup
  step: "choose",       // choose | text | form
  photo: null,          // 压缩后的 dataURL
  draft: null,
  makeupType: "lip",
  busy: false
};

function openSheet(kind) {
  ADD.kind = kind || "clothes";
  ADD.step = "choose";
  ADD.photo = null;
  ADD.draft = null;
  $("#sheetTitle").textContent = kind === "makeup" ? "添加彩妆" : (kind === "acc" ? "添加配饰" : "添加衣物");
  renderSheet();
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeSheet() {
  $("#sheet").hidden = true;
  document.body.style.overflow = "";
  ADD.photo = null; ADD.draft = null; ADD.busy = false;
}

function renderSheet() {
  const body = $("#sheetBody");
  if (ADD.step === "choose") body.innerHTML = sheetChoose();
  else if (ADD.step === "text") body.innerHTML = sheetText();
  else if (ADD.step === "form") body.innerHTML = sheetForm();
  if (ADD.step === "form") bindForm();
}

function sheetChoose() {
  const isMakeup = ADD.kind === "makeup";
  return `
    <div class="cap-grid">
      <button class="cap-btn solid" data-act="camera"><span>📷</span>拍一张</button>
      <button class="cap-btn" data-act="album"><span>🖼️</span>从相册选</button>
    </div>
    <p class="mini-tip">拍照后会<b>自动取出主色</b>${aiReady() ? "，并用 AI 认出品类和材质" : "；在「我的」里填个 AI Key 还能直接认出品类和厚薄"}。</p>
    <div style="margin-top:16px">
      <button class="cap-btn" style="width:100%" data-act="text"><span>✍️</span>不打字/不拍照，直接一句话</button>
    </div>`;
}

function sheetText() {
  const ph = ADD.kind === "makeup"
    ? "例：MAC 923 / 香奈儿58 / 番茄色唇釉 / 粉底 DW 1W1"
    : (ADD.kind === "acc" ? "例：银色小珍珠耳钉 / 驼色羊绒围巾 / 黑色链条包" : "例：米白针织开衫 / 藏蓝直筒牛仔裤");
  return `
    <div class="field">
      <label>一句话描述（颜色、材质、类别都可以写进去）</label>
      <input type="text" id="txtInput" placeholder="${ph}" autocomplete="off">
    </div>
    <div id="txtPreview" class="status-line"></div>
    <div class="btn-row" style="justify-content:flex-start">
      <button class="btn mini" data-act="parse">识别并填写</button>
      <button class="btn mini ghost" data-act="back">返回</button>
    </div>`;
}

function colorSwatchesHtml(selected) {
  const fams = COLOR_FAM_ORDER;
  return fams.map((fam) => {
    const keys = Object.keys(COLOR_DB).filter((k) => COLOR_DB[k].fam === fam);
    return `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px">
      <span style="font-size:10.5px;color:#B0A8A3;width:26px;text-align:right">${fam}</span>
      ${keys.map((k) => `<button class="swatch ${selected === k ? "on" : ""}" data-color="${esc(k)}">
        <i style="background:${COLOR_DB[k].hex}"></i>${esc(k)}</button>`).join("")}
    </div>`;
  }).join("");
}

function sheetForm() {
  const d = ADD.draft || {};
  const preview = ADD.photo
    ? `<div class="preview-wrap"><img src="${ADD.photo}" alt=""><span class="scan" id="scanLine"></span></div>`
    : "";

  if (ADD.kind === "makeup") {
    const type = d.makeupType || ADD.makeupType || "lip";
    const fams = type === "lip" ? LIP_FAMILIES : (type === "blush" ? BLUSH_FAMILIES : null);
    return `${preview}
      <div class="field"><label>类型</label><div class="chips">
        ${[["lip", "💄 口红"], ["blush", "🌸 腮红"], ["base", "🧴 底妆"], ["eye", "🎨 眼影"]].map(([k, n]) =>
          `<button class="chip ${type === k ? "on" : ""}" data-mtype="${k}">${n}</button>`).join("")}
      </div></div>
      <div class="field"><label>名称 / 色号</label>
        <input type="text" id="fName" value="${esc(d.name || "")}" placeholder="如 MAC 923 蜜桃奶咖"></div>
      ${fams ? `<div class="field"><label>色系（影响冷暖搭配建议）</label>
        <select id="fFamily">${Object.keys(fams).map((k) =>
          `<option value="${esc(k)}" ${d.family === k ? "selected" : ""}>${esc(k)} · ${esc(fams[k].desc)}</option>`).join("")}</select></div>
        <div class="field"><label>色块</label>
          <input type="color" id="fHex" value="${d.hex || "#B4766E"}" style="width:64px;height:38px;border:1px solid #E5DDD3;border-radius:8px;background:#fff;padding:2px">
        </div>`
      : (type === "eye" ? `<div class="field"><label>色块</label>
          <input type="color" id="fHex" value="${d.hex || "#C0A08C"}" style="width:64px;height:38px;border:1px solid #E5DDD3;border-radius:8px;background:#fff;padding:2px">
        </div>` : `<div class="field"><label>色号 / 备注</label>
          <input type="text" id="fFamily" value="${esc(d.family || "")}" placeholder="如 1W1 黄一白 / 滋润版">
        </div>`)}
      <div class="status-line" id="formStatus"></div>
      <div class="btn-row"><button class="btn block" data-act="save">保存</button></div>`;
  }

  const isAcc = ADD.kind === "acc";
  const cats = isAcc ? CAT_ACC : CAT_CLOTHES;
  const cat = d.cat || (isAcc ? S.settings.lastCat.acc : S.settings.lastCat.clothes);

  return `${preview}
    <div class="field"><label>类别</label><div class="chips">
      ${cats.map((c) => `<button class="chip ${cat === c ? "on" : ""}" data-cat="${esc(c)}">${CAT_ICON[c] || ""} ${esc(c)}</button>`).join("")}
    </div></div>
    <div class="field"><label>名称</label>
      <input type="text" id="fName" value="${esc(d.name || "")}" placeholder="如 米白针织开衫"></div>

    <div class="field"><label>颜色 <span style="font-weight:400;color:#B0A8A3">（拍照时自动取色，可改）</span></label>
      <div style="max-height:150px;overflow-y:auto;border:1px solid #EFE9E1;border-radius:12px;padding:8px;background:#FDFBF7">
        ${colorSwatchesHtml(d.color || "")}
      </div>
    </div>

    ${isAcc ? `
      <div class="field"><label>金属色</label><div class="chips">
        ${["", "银色", "金色", "玫瑰金"].map((m) =>
          `<button class="chip mini ${(d.metal || "") === m ? "on" : ""}" data-metal="${esc(m)}">${m || "无"}</button>`).join("")}
      </div></div>
      <div class="field"><label>材质</label><div class="chips">
        ${["", "皮革", "金属", "珍珠", "针织", "牛仔", "丝绸", "雪纺", "亚克力", "木质", "棉麻"].map((m) =>
          `<button class="chip mini ${(d.material || "") === m ? "on" : ""}" data-material="${esc(m)}">${m || "无"}</button>`).join("")}
      </div></div>
      <div class="field"><label>风格</label><div class="chips">
        ${["", "简约", "通勤", "复古", "甜美", "休闲", "运动"].map((m) =>
          `<button class="chip mini ${(d.style || "") === m ? "on" : ""}" data-style="${esc(m)}">${m || "无"}</button>`).join("")}
      </div></div>
    ` : `
      <div class="field"><label>厚薄度 <span class="range-val" id="thickVal">${d.thick || 3} · ${THICK_LABEL[d.thick || 3]}</span></label>
        <input type="range" id="fThick" min="1" max="5" step="1" value="${d.thick || 3}">
        <div style="display:flex;justify-content:space-between;font-size:10.5px;color:#B0A8A3;margin-top:2px">
          <span>1 吊带</span><span>3 衬衫</span><span>5 羽绒</span></div>
      </div>
    `}

    <div class="status-line" id="formStatus"></div>
    <div class="btn-row"><button class="btn block" data-act="save">保存到${isAcc ? "配饰柜" : "衣橱"}</button></div>`;
}

function bindForm() {
  const range = $("#fThick");
  if (range) {
    range.oninput = () => {
      $("#thickVal").textContent = range.value + " · " + THICK_LABEL[range.value];
    };
  }
}

/* ---------- 表单交互 ---------- */
function sheetClick(e) {
  const t = e.target.closest("[data-act],[data-cat],[data-color],[data-metal],[data-material],[data-style],[data-mtype]");
  if (!t) return;
  syncInputs();
  const d = ADD.draft || (ADD.draft = {});

  if (t.dataset.act === "back") { ADD.step = "choose"; renderSheet(); return; }
  if (t.dataset.act === "text") { ADD.step = "text"; renderSheet(); return; }
  if (t.dataset.act === "camera" || t.dataset.act === "album") {
    pickImage(t.dataset.act === "camera");
    return;
  }
  if (t.dataset.act === "parse") {
    const raw = $("#txtInput").value;
    const p = parseOneLine(raw);
    if (!p) { toast("没太看懂，换个说法试试", "warn"); return; }
    if (p.kind === "makeup") {
      ADD.makeupType = p.makeupType === "腮红" ? "blush" : "lip";
      ADD.draft = { makeupType: ADD.makeupType, name: p.name, family: p.family, hex: p.hex };
    } else if (p.kind === "acc") {
      ADD.draft = { cat: p.cat, name: p.name, color: p.color, metal: p.metal, material: p.material, style: p.style };
    } else {
      ADD.draft = { cat: p.cat, name: p.name, color: p.color, thick: p.thick, material: p.material, style: p.style };
    }
    ADD.step = "form";
    renderSheet();
    toast("已按文字填好，确认一下就能保存");
    return;
  }
  if (t.dataset.act === "save") { saveDraft(); return; }
  if (t.dataset.cat) { d.cat = t.dataset.cat; ADD.draft = d; renderSheet(); return; }
  if (t.dataset.mtype) { d.makeupType = t.dataset.mtype; ADD.makeupType = t.dataset.mtype; ADD.draft = d; renderSheet(); return; }

  // 下面三类就地切换，不重绘（避免输入内容丢失 / 列表回到顶部）
  const groups = [["color", "color"], ["metal", "metal"], ["material", "material"], ["style", "style"]];
  for (const [attr, key] of groups) {
    if (t.dataset[attr] !== undefined) {
      d[key] = t.dataset[attr];
      ADD.draft = d;
      const sel = `[data-${attr}]`;
      $$(sel, $("#sheetBody")).forEach((b) => b.classList.toggle("on", b.dataset[attr] === d[key]));
      return;
    }
  }
}

/* 把当前表单里手填的内容收回草稿，防止重绘丢数据 */
function syncInputs() {
  if (!ADD.draft) ADD.draft = {};
  const n = $("#fName"); if (n) ADD.draft.name = n.value;
  const h = $("#fHex"); if (h) ADD.draft.hex = h.value;
  const f = $("#fFamily"); if (f) ADD.draft.family = f.value;
  const th = $("#fThick"); if (th) ADD.draft.thick = parseInt(th.value, 10) || 3;
}

/* ---------- 拍照 → 识别 ---------- */
function pickImage(useCamera) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  if (useCamera) input.capture = "environment";
  input.style.display = "none";
  document.body.appendChild(input);
  input.onchange = async () => {
    const f = input.files && input.files[0];
    document.body.removeChild(input);
    if (f) await handlePhoto(f);
  };
  input.click();
}

async function handlePhoto(file) {
  const status = () => $("#formStatus");
  try {
    ADD.step = "form";
    ADD.draft = ADD.draft || {};
    renderSheet();
    if (status()) status().innerHTML = '<span class="spin"></span>正在读图…';

    const raw = await readAsDataURL(file);
    const small = await shrinkImage(raw, 760, 0.72);
    ADD.photo = small;
    renderSheet();

    // 1) 本地取色（离线也能用）
    const cols = await dominantColors(small, 4);
    const primary = cols[0];
    const near = nearestColorName(primary.hex);
    const dftCat = ADD.kind === "acc" ? S.settings.lastCat.acc : S.settings.lastCat.clothes;
    ADD.draft.cat = ADD.draft.cat || dftCat;
    ADD.draft.color = near.name;
    ADD.draft.colorHex = primary.hex;
    ADD.draft.palette = cols.map((c) => c.hex);
    if (!ADD.draft.name) ADD.draft.name = guessNameFromCat(ADD.draft.cat, near.name);
    if (!ADD.draft.thick) {
      ADD.draft.thick = { 上装: 3, 外搭: 4, 下装: 3, 连衣裙: 2, 鞋子: 2 }[ADD.draft.cat] || 3;
    }
    renderSheet();
    if (status()) {
      status().innerHTML = `<span style="color:#5A725A">✓ 已取出主色：<b>${esc(near.name)}</b>　（${cols.slice(0, 3).map((c) => c.hex).join(" ")}）</span>`;
    }

    // 2) 有 AI 就继续精修
    if (aiReady()) {
      if (status()) status().innerHTML = '<span class="spin"></span>AI 正在识别品类和材质…';
      try {
        const r = await aiRecognize(small, ADD.kind === "makeup" ? "makeup" : "clothes");
        applyAiResult(r);
        renderSheet();
        if (status()) status().innerHTML = '<span style="color:#5A725A">✓ AI 识别完成，确认或修改后保存</span>';
        buzz();
      } catch (err) {
        if (status()) status().innerHTML = `<span style="color:#A05A4E">AI 识别没成功（${esc(err.message || err)}），已用本地取色结果，可手动改。</span>`;
      }
    } else {
      if (status()) status().innerHTML += '<br><span style="color:#B0A8A3">没配 AI，只做了自动取色；品类和厚薄确认一下就行。</span>';
    }
    const scan = $("#scanLine");
    if (scan) scan.remove();
  } catch (e) {
    toast("图片处理失败：" + (e.message || e), "warn");
  }
}

function applyAiResult(r) {
  const d = ADD.draft;
  if (ADD.kind === "makeup") {
    const map = { 口红: "lip", 腮红: "blush", 底妆: "base", 眼影: "eye" };
    d.makeupType = map[r.type] || d.makeupType || "lip";
    ADD.makeupType = d.makeupType;
    if (r.name) d.name = r.name;
    if (r.family && (d.makeupType === "lip" ? LIP_FAMILIES[r.family] : BLUSH_FAMILIES[r.family])) d.family = r.family;
    if (/^#[0-9a-f]{6}$/i.test(r.hex || "")) d.hex = r.hex;
    return;
  }
  if (r.cat && (CAT_CLOTHES.includes(r.cat) || CAT_ACC.includes(r.cat))) {
    d.cat = r.cat;
    if (CAT_ACC.includes(r.cat)) ADD.kind = "acc";
    else if (ADD.kind === "acc") ADD.kind = "clothes";
  }
  if (r.name) d.name = r.name;
  if (r.color && COLOR_DB[r.color]) d.color = r.color;
  if (/^#[0-9a-f]{6}$/i.test(r.colorHex || "")) d.colorHex = r.colorHex;
  if (r.thick) d.thick = Math.max(1, Math.min(5, parseInt(r.thick, 10) || 3));
  if (r.metal && r.metal !== "无") d.metal = r.metal;
  if (r.material && r.material !== "其他") d.material = r.material;
  if (r.style) d.style = r.style;
}

/* ---------- 保存 ---------- */
async function saveDraft() {
  const nameEl = $("#fName");
  const name = nameEl ? nameEl.value.trim() : "";
  if (!name) { toast("给这件东西起个名字吧", "warn"); if (nameEl) nameEl.focus(); return; }
  const d = ADD.draft || {};
  const photoId = nid("p");

  if (ADD.kind === "makeup") {
    const type = d.makeupType || ADD.makeupType || "lip";
    const famSel = $("#fFamily");
    const hexEl = $("#fHex");
    const item = addMakeup(type, {
      name,
      family: famSel ? famSel.value : (d.family || ""),
      hex: hexEl ? hexEl.value : (d.hex || "")
    });
    if (ADD.photo) await PhotoDB.put(item.id, ADD.photo);
    M_TAB = type;
  } else if (ADD.kind === "acc") {
    const item = addAcc({
      cat: d.cat || S.settings.lastCat.acc,
      name,
      color: d.color || "",
      metal: d.metal || "",
      material: d.material || "",
      style: d.style || ""
    });
    if (ADD.photo) await PhotoDB.put(item.id, ADD.photo);
    S.settings.lastCat.acc = item.cat;
  } else {
    const thickEl = $("#fThick");
    const item = addWardrobe({
      cat: d.cat || S.settings.lastCat.clothes,
      name, note: name,
      color: d.color || "灰",
      thick: thickEl ? parseInt(thickEl.value, 10) : (d.thick || 3)
    });
    if (ADD.photo) await PhotoDB.put(item.id, ADD.photo);
    S.settings.lastCat.clothes = item.cat;
  }
  saveNow();
  buzz();
  closeSheet();
  toast("已入库 ✓");
  renderWardrobe(); renderAcc(); renderMakeup();
  renderPicker();
}

/* ============================================================
 * 我的
 * ============================================================ */
let deferredPrompt = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function renderInstall() {
  const box = $("#installBox");
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const btnTop = $("#btnInstallTop");

  if (isStandalone()) {
    box.innerHTML = `<div class="hint" style="color:#5A725A">✓ 已经在桌面独立运行了，数据和浏览器是同一份。</div>`;
    btnTop.hidden = true;
    return;
  }
  if (deferredPrompt) {
    box.innerHTML = `<div class="hint" style="margin-bottom:10px">装到桌面后可以全屏打开，没网也能用。</div>
      <button class="btn block" id="btnInstallNow">添加到桌面</button>`;
    $("#btnInstallNow").onclick = async () => {
      deferredPrompt.prompt();
      const r = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (r.outcome === "accepted") toast("已添加到桌面");
      renderInstall();
    };
    btnTop.hidden = false;
    btnTop.onclick = () => $("#btnInstallNow") && $("#btnInstallNow").click();
    return;
  }
  btnTop.hidden = true;
  box.innerHTML = isIOS
    ? `<div class="hint" style="margin-bottom:8px">iPhone / iPad 用 Safari 打开这个网址，然后：</div>
       <ol><li>点底部的「分享」按钮（方框向上箭头）</li>
       <li>往下找到「添加到主屏幕」</li>
       <li>右上角「添加」，桌面上就有图标了</li></ol>`
    : `<div class="hint" style="margin-bottom:8px">电脑 / 安卓用 Chrome、Edge 打开后：</div>
       <ol><li>地址栏右侧的「安装」图标（或 ⋮ 菜单 → 应用 → 安装此站点）</li>
       <li>确认后桌面会出现独立窗口的图标</li></ol>
       <div class="hint" style="margin-top:8px">如果没看到安装入口，通常是当前不是 https 或浏览器不支持，用 Chrome 打开即可。</div>`;
}

function syncAiForm() {
  const a = S.settings.ai;
  const sel = $("#aiPreset");
  sel.innerHTML = AI_PRESETS.map((p) => `<option value="${p.id}" ${a.preset === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("");
  $("#aiBaseUrl").value = a.baseUrl || "";
  $("#aiModel").value = a.model || "";
  $("#aiKey").value = a.key || "";
  const p = AI_PRESETS.find((x) => x.id === a.preset);
  $("#aiPresetTip").textContent = p ? p.tip : "";
  const st = $("#aiState");
  st.textContent = aiReady() ? "已配置" : "未配置";
  st.classList.toggle("on", aiReady());
}

function renderMe() {
  renderInstall();
  syncAiForm();
  const st = $("#statBox");
  st.innerHTML = `
    <div><b>${S.wardrobe.length}</b><span>衣物</span></div>
    <div><b>${S.accessories.length}</b><span>配饰</span></div>
    <div><b>${S.makeup.lip.length + S.makeup.blush.length + S.makeup.base.length + S.makeup.eye.length}</b><span>彩妆</span></div>
    <div><b>${S.history.length}</b><span>记录</span></div>`;

  const box = $("#histList");
  if (!S.history.length) { box.innerHTML = `<div class="hint">还没有保存过搭配，去「今日」生成一套吧。</div>`; return; }
  box.innerHTML = S.history.map((h, i) => `
    <div class="hist">
      <b>${esc(h.styleName || "")}</b> · ${esc(h.date || "")} · ${h.temp}℃ · ${esc(h.occ || "")}
      <button class="x" data-hist="${i}">✕</button>
      <div style="color:#6B625E">👕 ${esc(h.outfit || "")}</div>
      ${h.lips ? `<div style="color:#6B625E">💄 ${esc(h.lips)}</div>` : ""}
      ${h.blush ? `<div style="color:#6B625E">🌸 ${esc(h.blush)}</div>` : ""}
    </div>`).join("");
}

/* ============================================================
 * 事件绑定
 * ============================================================ */
function bindEvents() {
  /* 路由 */
  $("#tabbar").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-page]");
    if (b) { buzz(8); setPage(b.dataset.page); }
  });

  /* 顶栏滚动阴影 */
  window.addEventListener("scroll", () => {
    $(".topbar").classList.toggle("scrolled", window.scrollY > 4);
  }, { passive: true });

  /* 温度 */
  $("#tempMinus").onclick = () => setTemp(getTemp() - 1);
  $("#tempPlus").onclick = () => setTemp(getTemp() + 1);
  $("#tempInput").addEventListener("input", onTempChange);
  $("#quickTemp").addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]");
    if (b) setTemp(parseInt(b.dataset.t, 10));
  });

  /* 场合 */
  $("#occChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-occ]");
    if (!b) return;
    TODAY_SEL.occasion = b.dataset.occ;
    renderOccasions();
  });

  /* 选衣 */
  $("#pickerArea").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (b) {
      const cat = b.dataset.pick, id = b.dataset.id;
      if (TODAY_SEL.items[cat] === id) delete TODAY_SEL.items[cat];
      else {
        TODAY_SEL.items[cat] = id;
        if (cat === "连衣裙") { delete TODAY_SEL.items["上装"]; delete TODAY_SEL.items["下装"]; }
        if (cat === "上装" || cat === "下装") delete TODAY_SEL.items["连衣裙"];
      }
      buzz(8); renderPicker();
      return;
    }
    if (e.target.closest("[data-add]")) openSheet("clothes");
  });

  $("#autoPickBtn").onclick = autoPickOutfit;
  $("#goBtn").onclick = generate;

  /* 列表筛选 */
  $("#wFilter").addEventListener("click", (e) => {
    const b = e.target.closest("[data-wf]");
    if (b) { W_FILTER = b.dataset.wf; renderWardrobe(); }
  });
  $("#aFilter").addEventListener("click", (e) => {
    const b = e.target.closest("[data-af]");
    if (b) { A_FILTER = b.dataset.af; renderAcc(); }
  });
  $("#mSeg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mt]");
    if (b) { M_TAB = b.dataset.mt; renderMakeup(); }
  });

  /* 添加按钮 */
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add && !e.target.closest("#pickerArea")) { openSheet(add.dataset.add); }
  });

  /* 删除 */
  document.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del]");
    if (!del) return;
    e.stopPropagation();
    const id = del.dataset.del, kind = del.dataset.kind;
    if (!confirm("确定删掉这一件吗？")) return;
    if (kind === "wardrobe") delWardrobe(id);
    else if (kind === "acc") delAcc(id);
    else delMakeup(M_TAB, id);
    Object.keys(TODAY_SEL.items).forEach((k) => { if (TODAY_SEL.items[k] === id) delete TODAY_SEL.items[k]; });
    renderWardrobe(); renderAcc(); renderMakeup(); renderPicker();
    toast("已删除");
  });

  /* 点图看大图 */
  document.addEventListener("click", async (e) => {
    const card = e.target.closest(".item");
    if (!card || e.target.closest("[data-del]")) return;
    const id = card.dataset.open;
    const url = await PhotoDB.get(id);
    if (!url) return;
    $("#viewerImg").src = url;
    $("#viewer").hidden = false;
  });
  $("#viewer").onclick = () => { $("#viewer").hidden = true; };

  /* 弹层 */
  $("#sheet").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { closeSheet(); return; }
    sheetClick(e);
  });
  $("#sheetBody").addEventListener("input", (e) => {
    if (e.target.id === "txtInput") {
      const p = parseOneLine(e.target.value);
      const box = $("#txtPreview");
      if (!p) { box.innerHTML = ""; return; }
      const hex = p.hex || (p.color ? colorOf(p.color).hex : "#E0D8CF");
      box.innerHTML = `<span style="color:#5A725A">识别：</span>
        <b>${esc(p.kind === "makeup" ? p.name : (p.cat + " · " + (p.color || "颜色未识别")))}</b>
        ${p.kind === "clothes" ? " · 厚薄 " + p.thick : ""}
        ${p.metal ? " · " + esc(p.metal) : ""}${p.material ? " · " + esc(p.material) : ""}
        <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${hex};vertical-align:-2px;margin-left:6px"></span>`;
    }
  });
  $("#sheetBody").addEventListener("keydown", (e) => {
    if (e.target.id === "txtInput" && e.key === "Enter") {
      $("#sheetBody").querySelector('[data-act="parse"]').click();
    }
  });

  /* 一句话速录 */
  $("#quickInput").addEventListener("input", quickPreview);
  $("#quickInput").addEventListener("keydown", (e) => { if (e.key === "Enter") quickAdd(); });
  $("#quickAdd").onclick = quickAdd;

  /* AI 设置 */
  $("#aiPreset").addEventListener("change", () => {
    const p = AI_PRESETS.find((x) => x.id === $("#aiPreset").value);
    if (p && p.id !== "custom") {
      $("#aiBaseUrl").value = p.baseUrl;
      $("#aiModel").value = p.model;
      $("#aiPresetTip").textContent = p.tip;
    } else {
      $("#aiPresetTip").textContent = "填自己的 OpenAI 兼容地址与模型名。";
    }
  });
  $("#aiSave").onclick = () => {
    S.settings.ai = {
      preset: $("#aiPreset").value,
      baseUrl: $("#aiBaseUrl").value.trim(),
      model: $("#aiModel").value.trim(),
      key: $("#aiKey").value.trim()
    };
    saveNow(); syncAiForm();
    toast(aiReady() ? "已保存，拍照时自动启用 AI 识别" : "已保存（Key 为空，暂用本地识别）");
  };
  $("#aiTest").onclick = async () => {
    $("#aiTestMsg").innerHTML = '<span class="spin"></span>测试中…';
    const r = await aiPing();
    $("#aiTestMsg").innerHTML = `<span style="color:${r.ok ? "#5A725A" : "#A05A4E"}">${esc(r.msg)}</span>`;
  };

  /* 数据 */
  $("#btnExport").onclick = async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "穿搭工作台备份-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast("备份已导出");
  };
  $("#btnImport").onclick = () => {
    const tip = prompt("把备份 JSON 粘贴到这里（或点「取消」后用文件导入）");
    if (tip && tip.trim()) {
      importAll(tip.trim()).then(() => {
        toast("导入成功");
        renderMe(); renderWardrobe(); renderAcc(); renderMakeup(); renderPicker();
      }).catch((e) => toast("导入失败：" + e.message, "warn"));
      return;
    }
    if (tip === "") return;
    $("#importFile").click();
  };
  $("#importFile").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      await importAll(await f.text());
      toast("导入成功");
      renderMe(); renderWardrobe(); renderAcc(); renderMakeup(); renderPicker();
    } catch (err) { toast("导入失败：" + err.message, "warn"); }
    e.target.value = "";
  });
  $("#btnClearSample").onclick = () => {
    if (!confirm("清空所有示例数据？只清示例，你自己加的不动（示例是没有照片的那些）。")) return;
    // 更稳妥：示例数据整体清空（首次使用时全量都是示例）
    if (S.sampled) {
      S.wardrobe = []; S.accessories = []; S.makeup = { lip: [], blush: [], base: [], eye: [] };
      S.sampled = false;
    }
    saveNow(); renderMe(); renderWardrobe(); renderAcc(); renderMakeup(); renderPicker();
    $("#sampleBanner").hidden = true;
    toast("已清空，可以开始拍自己的衣服了");
  };
  $("#btnCopyCode").onclick = async () => {
    const code = $("#migrateCode").textContent;
    try { await navigator.clipboard.writeText(code); toast("已复制"); }
    catch (e) { toast("复制失败，请手动长按选择", "warn"); }
  };

  /* 记录删除 */
  $("#histList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-hist]");
    if (!b) return;
    S.history.splice(parseInt(b.dataset.hist, 10), 1);
    saveNow(); renderMe();
  });

  /* 安装事件 */
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const top = $("#btnInstallTop");
    top.hidden = false;
    top.onclick = () => { deferredPrompt.prompt(); };
    renderInstall();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    $("#btnInstallTop").hidden = true;
    renderInstall();
    toast("已添加到桌面");
  });

  window.addEventListener("error", (e) => {
    console.error(e.message);
  });
}

/* ============================================================
 * 初始化
 * ============================================================ */
function init() {
  renderQuickTemp();
  renderOccasions();
  $("#tempInput").value = 18;
  onTempChange();
  if (S.sampled) $("#sampleBanner").hidden = false;
  renderWardrobe(); renderAcc(); renderMakeup(); renderMe();
  bindEvents();

  /* 离线 / 安装 */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { });
  }
  if (location.hash === "#add") setTimeout(() => openSheet("clothes"), 300);
}

init();
