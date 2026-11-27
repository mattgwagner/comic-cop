// Badge checks: old saves get credit for what they already beat, a clean chapter earns its badge, a messy one doesn't,
// and ?test=badges opens the collection. Screenshots go to the dir in argv[2] when given.
import { launch, pageUrl } from "./pw.mjs";
const out = process.argv[2];
const browser = await launch();
let fail = 0;
const check = (ok, name, got) => { console.log(ok ? "ok  " : "FAIL", name, got === undefined ? "" : JSON.stringify(got)); if (!ok) fail++; };
const open = async (seed, q = "?debug", vp = { width: 1920, height: 1045 }) => {
  const ctx = await browser.newContext({ viewport: vp });
  if (seed) await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("comiccop.v1", JSON.stringify(s)); sessionStorage.setItem("seeded", "1"); } }, seed);
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(pageUrl(q)); await page.waitForTimeout(250);
  return { ctx, page, errors };
};

// 1. Pre-badge save: Cases 1 and 2 solved, 5 homophones and 15 words at box 3+, one once-missed word now learned.
{
  const box = {}, miss = {};
  const { ctx, page } = await open(null);
  const keys = await page.evaluate(() => ({ h: __cc.HOMO.slice(0, 5).map(x => x.key), w: __cc.WORDS.slice(0, 15).map(x => x.key) }));
  await ctx.close();
  keys.h.forEach(k => box[k] = 3); keys.w.forEach(k => box[k] = 4); miss[keys.w[0]] = 2;
  const r = await open({ v: 3, solved: { 0: 2, 1: 1 }, caseIdx: 2, cases: 3, issue: 4, box, miss });
  const got = await r.page.evaluate(() => Object.keys(__cc.save.badges).sort());
  check(JSON.stringify(got) === JSON.stringify(["case1", "case2", "comeback", "homophone", "words"]), "old save gets retro badges", got);
  const stored = await r.page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("comiccop.v1")).badges).length);
  check(stored === 5, "retro badges persisted", stored);
  const btn = await r.page.textContent("#badgesBtn");
  check(/5\/31/.test(btn), "title shows badge count", btn);
  const toast = await r.page.evaluate(() => document.getElementById("badgeToast").classList.contains("on"));
  check(!toast, "retro badges award quietly");
  await r.ctx.close();
}
// 1b. A save that closed all four cases gets case4, both squad badges, and Need a Bigger Car; one with three doesn't get the van.
{
  const r = await open({ v: 3, solved: { 0: 1, 1: 1, 2: 1, 3: 1 }, caseIdx: 0, cases: 4 });
  const got = await r.page.evaluate(() => Object.keys(__cc.save.badges).sort());
  check(["case1", "case2", "case3", "case4", "squad", "van"].every(b => got.includes(b)), "four cases: case4 + squad + van", got);
  await r.ctx.close();
  const r3 = await open({ v: 3, solved: { 0: 1, 1: 1, 2: 1 }, caseIdx: 2, cases: 3 });
  const got3 = await r3.page.evaluate(() => Object.keys(__cc.save.badges).sort());
  check(got3.includes("squad") && !got3.includes("van") && !got3.includes("case4"), "three cases: squad, no van", got3);
  await r3.ctx.close();
}
// 2. Save with no badges key and nothing solved: badges defaults to {}; a junk value is replaced too.
for (const seed of [{ v: 3, caseIdx: 0, cases: 0 }, { v: 3, badges: null }, { v: 3, badges: "x" }]) {
  const r = await open(seed);
  const b = await r.page.evaluate(() => __cc.save.badges);
  check(b && typeof b === "object" && !Object.keys(b).length, "badges default to {} for " + JSON.stringify(seed), b);
  await r.ctx.close();
}
// 3. Chapter badges: finishing Pizza Palace with no misses earns it; with a miss it doesn't. A lost heart blocks Bot Buster.
{
  const r = await open(null);
  const run = (id, f) => r.page.evaluate(([id, f]) => {
    __cc.CASES.forEach((c, ci) => c.chapters.forEach((ch, i) => { if (ch.id === id) { __cc.S.case = ci; __cc.startChapter(i); } }));
    __cc.go(); Object.assign(__cc.CHR, f); __cc.finishChapter(); return !!__cc.save.badges[id];
  }, [id, f]);
  check(!(await run("pizza", { miss: 1, hurt: 0 })), "pizza with a miss: no badge");
  check(await run("pizza", { miss: 0, hurt: 0 }), "clean pizza: badge");
  check(!(await run("boss", { miss: 0, hurt: 1 })), "boss with a lost heart: no badge");
  check(await run("snipsub", { miss: 2, hurt: 0 }), "snipsub misses but no lost heart: badge");
  check(!(await run("claw", { miss: 1, hurt: 1 })), "claw with a miss: no badge");
  check(await run("claw", { miss: 0, hurt: 0 }), "clean claw: Prize Grabber");
  check(!(await run("podium", { miss: 1, hurt: 0 })), "podium with a miss: no badge");
  check(await run("podium", { miss: 0, hurt: 0 }), "clean podium: Top Step");
  check(!(await run("hideout", { miss: 0, hurt: 1 })), "hideout with a lost heart: no badge");
  check(await run("hideout", { miss: 3, hurt: 0 }), "hideout misses but no lost heart: Quiet Paws");
  check(!(await run("truck", { miss: 0, hurt: 1 })), "truck with a lost heart: no badge");
  check(await run("truck", { miss: 2, hurt: 0 }), "truck slips but no lost heart: Tug Champ");
  const names = await r.page.evaluate(() => __cc.BADGES.map(b => b.name));
  check(new Set(names).size === names.length, "badge names are unique", names.filter((n, i) => names.indexOf(n) !== i));
  const chs = await r.page.evaluate(() => { const ids = __cc.CASES.flatMap(c => c.chapters.map(ch => ch.id)); return ids.filter(id => !__cc.BADGES.some(b => b.id === id && b.ch)); });
  check(!chs.length, "every chapter has a badge", chs);
  if (out) { await r.page.waitForTimeout(150); await r.page.screenshot({ path: `${out}/badge-toast-desktop.png` }); }
  await r.ctx.close();
}
// 4. ?test=badges opens the collection; nothing overflows sideways at desktop or phone width.
for (const [w, h, tag] of [[1920, 1045, "desktop"], [400, 860, "phone"]]) {
  const r = await open({ v: 3, solved: { 0: 1 }, badges: { case1: Date.now(), pizza: Date.now(), streak10: Date.now() } }, "?debug&test=badges", { width: w, height: h });
  const st = await r.page.evaluate(() => {
    const card = document.querySelector("#sBadges .card"), grid = document.getElementById("badgeGrid");
    return { on: document.getElementById("sBadges").classList.contains("on"), n: grid.children.length, got: grid.querySelectorAll(".got").length,
      cardOver: card.scrollWidth - card.clientWidth, docOver: document.documentElement.scrollWidth - innerWidth,
      clip: [...grid.querySelectorAll(".bdg")].filter(d => d.scrollWidth > d.clientWidth + 1).length };
  });
  check(st.on && st.n === 31 && st.got === 3 && st.cardOver <= 0 && st.docOver <= 0 && !st.clip, `badge screen at ${w}px`, st);
  if (out) await r.page.screenshot({ path: `${out}/badges-${tag}.png` });
  check(!r.errors.length, `no page errors at ${w}px`, r.errors);
  await r.ctx.close();
}
await browser.close();
console.log(`badges: ${fail ? fail + " failed" : "all pass"}`);
if (fail) process.exit(1);
