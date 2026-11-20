/* ============================================================
 * ai.js —— 可选的大模型识图（OpenAI 兼容格式）
 *   没配 Key 也能用：本地取色 + 一句话解析照样能录
 * ============================================================ */

function aiCfg() { return (S.settings && S.settings.ai) || {}; }
function aiReady() {
  const a = aiCfg();
  return !!(a.key && a.baseUrl && a.model);
}

function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || 30000);
  return fetch(url, Object.assign({}, opts, { signal: ctrl.signal }))
    .finally(() => clearTimeout(t));
}

function colorNameList() {
  return Object.keys(COLOR_DB).join(",");
}

function buildPrompt(kind) {
  if (kind === "makeup") {
    return [
      "你是彩妆识别助手。看图片，识别画面里最主要的一件彩妆产品（口红管、腮红盘、粉底瓶等），忽略手、背景、包装盒子。",
      "只输出一个 JSON 对象，不要解释，不要 markdown 代码块。",
      "{",
      '  "type": "从[口红,腮红,底妆,眼影]里选一个",',
      '  "brand": "品牌，识别不到就空字符串",',
      '  "shade": "色号，识别不到就空字符串",',
      '  "name": "中文完整名称，20字以内",',
      '  "family": "若type是口红，从[' + Object.keys(LIP_FAMILIES).join(",") + ']选一个；若是腮红，从[' + Object.keys(BLUSH_FAMILIES).join(",") + ']选一个；其他类型填空字符串",',
      '  "hex": "#RRGGBB，产品膏体/液体的实际颜色"',
      "}"
    ].join("\n");
  }
  return [
    "你是私人衣橱整理助手。看图片，识别画面中最主要的那一件单品（忽略人、模特、衣架、背景）。",
    "只输出一个 JSON 对象，不要解释，不要 markdown 代码块。",
    "{",
    '  "kind": "clothes 或 acc",',
    '  "cat": "衣物从[上装,外搭,下装,连衣裙,鞋子]选一个；配饰从[耳饰,项链,戒指,手链,手表,发饰,帽子,围巾,腰带,墨镜,包袋]选一个",',
    '  "name": "中文简短名称，12字以内，形如 米白色针织开衫 / 银色小珍珠耳钉",',
    '  "color": "必须严格从这些颜色名里选最接近的一个：' + colorNameList() + '",',
    '  "colorHex": "#RRGGBB 该单品主色",',
    '  "thick": "1到5的整数，1很薄(吊带) 2薄(短袖) 3适中(衬衫牛仔) 4厚(针织毛衣) 5很厚(羽绒大衣)；配饰填0",',
    '  "metal": "银色/金色/玫瑰金/无（只看金属件，没有就填无）",',
    '  "material": "棉麻/针织/牛仔/皮革/金属/珍珠/丝绸/雪纺/亚克力/木质/其他",',
    '  "style": "简约/通勤/复古/甜美/休闲/运动",',
    '  "desc": "一句话描述，15字以内"',
    "}"
  ].join("\n");
}

function parseAiJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  const body = s.slice(a, b + 1);
  try { return JSON.parse(body); } catch (e) { }
  // 容错：去掉尾逗号
  try { return JSON.parse(body.replace(/,\s*([}\]])/g, "$1")); } catch (e) { }
  return null;
}

async function aiRecognize(dataUrl, kind) {
  if (!aiReady()) throw new Error("还没配置 AI 识图（可到「我的 → AI 识图」里填 Key）");
  const a = aiCfg();
  const body = {
    model: a.model,
    temperature: 0.1,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: dataUrl } },
        { type: "text", text: buildPrompt(kind) }
      ]
    }]
  };
  const resp = await fetchWithTimeout(a.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + a.key },
    body: JSON.stringify(body)
  }, 40000);

  if (!resp.ok) {
    let detail = "";
    try { detail = (await resp.text()).slice(0, 200); } catch (e) { }
    throw new Error("接口返回 " + resp.status + (detail ? "：" + detail : ""));
  }
  const data = await resp.json();
  const msg = data && data.choices && data.choices[0] && data.choices[0].message;
  let content = msg && msg.content;
  if (Array.isArray(content)) content = content.map((c) => c.text || "").join("");
  const obj = parseAiJson(content);
  if (!obj) throw new Error("模型没有返回可用的 JSON，可再试一次");
  return obj;
}

async function aiPing() {
  const a = aiCfg();
  if (!a.key || !a.baseUrl || !a.model) return { ok: false, msg: "地址 / 模型 / Key 三项都要填" };
  try {
    const resp = await fetchWithTimeout(a.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + a.key },
      body: JSON.stringify({
        model: a.model,
        max_tokens: 16,
        messages: [{ role: "user", content: "回复两个字：可用" }]
      })
    }, 20000);
    if (!resp.ok) {
      const t = await resp.text();
      return { ok: false, msg: "HTTP " + resp.status + " " + t.slice(0, 160) };
    }
    return { ok: true, msg: "连接正常，识别功能可用" };
  } catch (e) {
    return { ok: false, msg: "连不上：" + (e.message || e) + "（若提示 CORS/网络错误，多为服务商不允许浏览器直连）" };
  }
}
