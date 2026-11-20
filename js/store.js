/* ============================================================
 * store.js —— 数据层
 *   状态：localStorage（结构化数据）
 *   照片：IndexedDB（体积大，不占 localStorage 配额）
 *   兼容：可导入旧版 outfit_makeup_station_v1
 * ============================================================ */

const LS_KEY = "outfit_station_v2";
const OLD_KEY = "outfit_makeup_station_v1";
let S = null;

function nid(p) {
  return (p || "i") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function blankState() {
  return {
    v: 2,
    sampled: false,
    wardrobe: [],
    accessories: [],
    makeup: { lip: [], blush: [], base: [], eye: [] },
    history: [],
    settings: {
      ai: { preset: "zhipu", baseUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions", model: "glm-4v-flash", key: "" },
      lastCat: { clothes: "上装", acc: "耳饰" }
    }
  };
}

function sampleState() {
  const st = blankState();
  st.sampled = true;
  st.wardrobe = [
    { id: nid("w"), cat: "上装", color: "藏蓝", note: "藏蓝色尖领衬衣", thick: 3 },
    { id: nid("w"), cat: "上装", color: "白", note: "白色基础T恤", thick: 1 },
    { id: nid("w"), cat: "上装", color: "米白", note: "米白套头针织衫", thick: 4 },
    { id: nid("w"), cat: "上装", color: "干枯玫瑰粉", note: "干枯玫瑰粉雪纺衬衫", thick: 1 },
    { id: nid("w"), cat: "外搭", color: "灰", note: "灰色针织开衫", thick: 4 },
    { id: nid("w"), cat: "外搭", color: "黑", note: "黑色西装外套", thick: 3 },
    { id: nid("w"), cat: "外搭", color: "驼", note: "驼色大衣", thick: 5 },
    { id: nid("w"), cat: "下装", color: "牛仔蓝", note: "蓝色直筒牛仔裤", thick: 3 },
    { id: nid("w"), cat: "下装", color: "黑", note: "黑色阔腿西裤", thick: 3 },
    { id: nid("w"), cat: "下装", color: "米白", note: "米白色伞裙", thick: 2 },
    { id: nid("w"), cat: "鞋子", color: "白", note: "白色运动鞋", thick: 2 },
    { id: nid("w"), cat: "鞋子", color: "黑", note: "黑色乐福鞋", thick: 2 },
    { id: nid("w"), cat: "鞋子", color: "棕", note: "棕色切尔西短靴", thick: 3 }
  ];
  st.makeup.lip = [
    { id: nid("m"), name: "MAC · 923 · 蜜桃奶咖", family: "裸色奶茶", hex: "#B98878" },
    { id: nid("m"), name: "YSL · 1966 · 小金条", family: "枫叶砖红", hex: "#8D4A3C" },
    { id: nid("m"), name: "Dior · 999 · 哑光正红", family: "正红", hex: "#B0252F" },
    { id: nid("m"), name: "3CE · TAUPE", family: "干燥玫瑰", hex: "#B58585" }
  ];
  st.makeup.blush = [
    { id: nid("m"), name: "NARS · GINA", family: "蜜桃", hex: "#F2B4A0" },
    { id: nid("m"), name: "倩碧 · 15 · 蝶舞", family: "玫瑰粉", hex: "#E8A4AC" }
  ];
  st.makeup.base = [
    { id: nid("m"), name: "DW 1W1（黄一白）" },
    { id: nid("m"), name: "兰蔻持妆 P-01" }
  ];
  st.accessories = [
    { id: nid("a"), cat: "耳饰", name: "银色小珍珠耳钉", color: "白", metal: "银色", material: "珍珠", style: "简约" },
    { id: nid("a"), cat: "耳饰", name: "金色圆环耳环", color: "", metal: "金色", material: "金属", style: "复古" },
    { id: nid("a"), cat: "项链", name: "银色细锁骨链", color: "", metal: "银色", material: "金属", style: "简约" },
    { id: nid("a"), cat: "发饰", name: "米色大肠发圈", color: "米白", metal: "", material: "", style: "甜美" },
    { id: nid("a"), cat: "发饰", name: "酒红抓夹", color: "酒红", metal: "", material: "亚克力", style: "" },
    { id: nid("a"), cat: "包袋", name: "黑色链条小包", color: "黑", metal: "金色", material: "皮革", style: "通勤" },
    { id: nid("a"), cat: "围巾", name: "驼色羊绒围巾", color: "驼", metal: "", material: "针织", style: "" }
  ];
  return st;
}

function normalize(st) {
  st.v = 2;
  st.wardrobe = st.wardrobe || [];
  st.accessories = st.accessories || [];
  st.makeup = st.makeup || {};
  ["lip", "blush", "base", "eye"].forEach((k) => { if (!st.makeup[k]) st.makeup[k] = []; });
  st.history = st.history || [];
  st.settings = st.settings || {};
  st.settings.ai = st.settings.ai || { preset: "zhipu", baseUrl: AI_PRESETS[0].baseUrl, model: AI_PRESETS[0].model, key: "" };
  st.settings.lastCat = st.settings.lastCat || { clothes: "上装", acc: "耳饰" };
  return st;
}

/* 旧版数据迁移 */
function migrateV1(old) {
  const st = blankState();
  st.sampled = !!old.sampled;
  (old.wardrobe || []).forEach((w) => {
    st.wardrobe.push({ id: nid("w"), cat: w.cat, color: w.color, note: w.note, thick: w.thick || 3 });
  });
  (old.lipsticks || []).forEach((l) => {
    st.makeup.lip.push({ id: nid("m"), name: l.name, family: l.family, hex: l.hex });
  });
  (old.blushes || []).forEach((l) => {
    st.makeup.blush.push({ id: nid("m"), name: l.name, family: l.family, hex: l.hex });
  });
  (old.foundations || []).forEach((l) => {
    st.makeup.base.push({ id: nid("m"), name: l.name });
  });
  (old.hairAccessories || []).forEach((h) => {
    st.accessories.push({ id: nid("a"), cat: "发饰", name: h.name, color: h.color, metal: "", material: "", style: "" });
  });
  (old.earrings || []).forEach((e) => {
    st.accessories.push({
      id: nid("a"), cat: e.type === "项链" ? "项链" : "耳饰", name: e.name,
      color: "", metal: e.metal || "", material: "", style: e.style || ""
    });
  });
  st.history = (old.history || []).map((h) => ({
    date: h.date, temp: h.temp, occ: h.occ, styleName: h.styleName,
    outfit: h.outfit, lips: h.lips || "", blush: h.blush || ""
  }));
  return st;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && (s.v === 2 || s.wardrobe)) return normalize(s);
    }
  } catch (e) { /* 忽略损坏数据 */ }
  try {
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const s = migrateV1(JSON.parse(old));
      localStorage.setItem(LS_KEY, JSON.stringify(s));
      return s;
    }
  } catch (e) { /* 忽略 */ }
  const s = sampleState();
  localStorage.setItem(LS_KEY, JSON.stringify(s));
  return s;
}

let _saveTimer = null;
function saveState() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); }
    catch (e) { toast("本地空间不足，建议清理一些照片", "warn"); }
  }, 120);
}
function saveNow() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { }
}

/* ---------------- 照片存储（IndexedDB） ---------------- */
const PhotoDB = (function () {
  let dbp = null;
  const cache = new Map();

  function open() {
    if (dbp) return Promise.resolve(dbp);
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("no idb"));
      const req = indexedDB.open("outfit_photos", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("ph")) db.createObjectStore("ph");
      };
      req.onsuccess = (e) => { dbp = e.target.result; res(dbp); };
      req.onerror = () => rej(req.error);
    });
  }

  function tx(mode) {
    return open().then((db) => db.transaction("ph", mode).objectStore("ph"));
  }

  return {
    async put(id, dataUrl) {
      cache.set(id, dataUrl);
      try {
        const st = await tx("readwrite");
        st.put(dataUrl, id);
      } catch (e) { /* 无 IndexedDB 时退化为仅内存 */ }
    },
    async get(id) {
      if (cache.has(id)) return cache.get(id);
      try {
        const st = await tx("readonly");
        const v = await new Promise((res, rej) => {
          const r = st.get(id);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        if (v) cache.set(id, v);
        return v || null;
      } catch (e) { return null; }
    },
    async del(id) {
      cache.delete(id);
      try { const st = await tx("readwrite"); st.delete(id); } catch (e) { }
    },
    async all() {
      try {
        const st = await tx("readonly");
        const [keys, vals] = await Promise.all([
          new Promise((res) => { const r = st.getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => res([]); }),
          new Promise((res) => { const r = st.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => res([]); })
        ]);
        const map = {};
        keys.forEach((k, i) => { map[k] = vals[i]; });
        return map;
      } catch (e) { return {}; }
    }
  };
})();

/* 给 <img> 挂照片（异步） */
async function applyPhoto(imgEl, id) {
  if (!id) return;
  const url = await PhotoDB.get(id);
  if (url) {
    imgEl.src = url;
    imgEl.style.display = "";
    const holder = imgEl.parentElement;
    if (holder) holder.classList.add("has-photo");
  }
}

/* ---------------- 增删改 ---------------- */
function addWardrobe(item) {
  item.id = item.id || nid("w");
  item.createdAt = Date.now();
  S.wardrobe.unshift(item);
  saveState();
  return item;
}
function delWardrobe(id) {
  S.wardrobe = S.wardrobe.filter((x) => x.id !== id);
  PhotoDB.del(id);
  saveState();
}
function addAcc(item) {
  item.id = item.id || nid("a");
  item.createdAt = Date.now();
  S.accessories.unshift(item);
  saveState();
  return item;
}
function delAcc(id) {
  S.accessories = S.accessories.filter((x) => x.id !== id);
  PhotoDB.del(id);
  saveState();
}
function addMakeup(type, item) {
  item.id = item.id || nid("m");
  item.createdAt = Date.now();
  S.makeup[type].unshift(item);
  saveState();
  return item;
}
function delMakeup(type, id) {
  S.makeup[type] = S.makeup[type].filter((x) => x.id !== id);
  PhotoDB.del(id);
  saveState();
}
function findWardrobe(id) { return S.wardrobe.find((x) => x.id === id); }

/* ---------------- 备份 / 迁移 ---------------- */
async function exportAll() {
  const photos = await PhotoDB.all();
  const payload = { v: 2, exportedAt: new Date().toISOString(), state: S, photos };
  return JSON.stringify(payload);
}

async function importAll(text) {
  const obj = JSON.parse(text);
  let st, photos = null;
  if (obj && obj.state) { st = obj.state; photos = obj.photos || null; }
  else if (obj && obj.v === 2) st = obj;
  else st = migrateV1(obj);
  st = normalize(st);
  S = st;
  saveNow();
  if (photos) {
    for (const k of Object.keys(photos)) await PhotoDB.put(k, photos[k]);
  }
  return S;
}
