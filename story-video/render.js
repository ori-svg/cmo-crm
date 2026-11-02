// Deterministic frame renderer. Contract matches HyperFrames: a paused GSAP timeline at window.__timelines["main"].
// usage: node render.js frames <fps> [workers]   → out/frames/00000.jpg …
//        node render.js snap <t1,t2,…>           → out/snap_<t>.jpg
const { chromium } = require("playwright");
const fs = require("fs");
const PAGE = "file://" + __dirname + "/index.html";
const [,, mode = "frames", arg = "30", W = "3"] = process.argv;
async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", e => console.error("pageerror:", e.message));
  await page.goto(PAGE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__ready === true);
  return page;
}
// NOTE: never return the timeline from evaluate — Playwright would try to serialise the whole GSAP graph.
const shoot = async (page, t, path) => { await page.evaluate(t => { window.__timelines.main.seek(t, false); }, t); await page.screenshot({ path, type: "jpeg", quality: 95 }); };
(async () => {
  const b = await chromium.launch();
  if (mode === "snap") { const p = await open(b); for (const t of arg.split(",")) await shoot(p, +t, `out/snap_${t}.jpg`); await b.close(); return; }
  const fps = +arg, n = Math.round(30 * fps);
  fs.mkdirSync("out/frames", { recursive: true });
  const todo = []; for (let i = 0; i < n; i++) todo.push(i);
  const T0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: +W }, async () => {
    const p = await open(b);
    while (todo.length) { const i = todo.shift(); await shoot(p, i / fps, `out/frames/${String(i).padStart(5, "0")}.jpg`);
      if (++done % 90 === 0) console.log(`${done}/${n}  ${((Date.now() - T0) / 1000).toFixed(0)}s`); }
  }));
  await b.close(); console.log("all frames done", ((Date.now() - T0) / 1000).toFixed(0) + "s");
})();
