/* Service Worker —— 让工作台可以离线使用，并可安装到桌面
 *
 * 设计要点（2026-11 修订）：
 *  - 导航请求改为「缓存优先」：装好的图标永远先打开本地缓存，不再依赖服务器活着
 *  - 网络返回的内容必须通过「真伪校验」才会覆盖缓存：
 *    线上网关在链接失效时会返回一个 200 的「链接不完整」错误页，旧版会把它当成
 *    正常页面显示、甚至写进缓存 → 图标从此永久打不开。现在非本应用的页面一律丢弃。
 *  - 发布新版本时改 VER，安装阶段会重新抓取整套外壳
 */
const VER = "outfit-v3.0.0";
const MARK = "每日穿搭工作台"; // 用页面里的字做真伪标记
const SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/data.js",
  "./js/data_extra.js",
  "./js/store.js",
  "./js/vision.js",
  "./js/ai.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VER)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** 判断一个网络响应是不是「真的我们的页面」 */
async function isOurPage(res) {
  if (!res || !res.ok) return false;
  const type = res.headers.get("content-type") || "";
  if (!/text\/html/i.test(type)) return false;
  try {
    const text = await res.clone().text();
    return text.indexOf(MARK) !== -1;
  } catch (e) {
    return false;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 第三方（AI 接口）不缓存

  // 导航：缓存优先，后台静默校验更新
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const cache = await caches.open(VER);
        const cached = (await cache.match("./index.html")) || (await cache.match("./"));

        // 后台拉一次真页面，通过校验才更新缓存（失败/错误页直接忽略，绝不动缓存）
        const revalidate = fetch(req, { cache: "no-store" })
          .then(async (res) => {
            if (await isOurPage(res)) {
              await cache.put("./index.html", res.clone());
              return res;
            }
            return null;
          })
          .catch(() => null);

        if (cached) return cached; // 有缓存就直接开，永远不白屏
        const fresh = await revalidate;
        if (fresh) return fresh;

        return new Response(
          "<!doctype html><meta charset=\"utf-8\"><title>暂未缓存</title>" +
          "<body style=\"font-family:system-ui;padding:40px;color:#5A5450\">" +
          "<h2>还没缓存好</h2><p>请联网打开一次这个地址，之后就能离线使用了。</p></body>",
          { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }
        );
      })()
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VER).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
