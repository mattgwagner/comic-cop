// Migration check: a save from before Case 3 that has closed Case 2 opens on Case 3, a save from before Case 4 that has
// closed Case 3 opens on Case 4; ones that haven't stay put.
import { launch, pageUrl } from "./pw.mjs";
const browser = await launch();
const cases = [
  { name: "solved Case 2, queued on Case 2", seed: { solved: { 0: 1, 1: 1 }, caseIdx: 1, cases: 2, issue: 3 }, want: 2 },
  { name: "solved Case 2, wrapped to Case 1", seed: { solved: { 0: 1, 1: 1 }, caseIdx: 0, cases: 2, issue: 3 }, want: 2 },
  { name: "only Case 1 solved", seed: { solved: { 0: 1 }, caseIdx: 1, cases: 1, issue: 2 }, want: 1 },
  { name: "pre-Case 2 save", seed: { cases: 1, issue: 2 }, want: 1 },
  { name: "already on v3, picked Case 1", seed: { v: 3, solved: { 0: 1, 1: 1 }, caseIdx: 0, cases: 2 }, want: 0 },
  { name: "v3, solved Case 3, wrapped to Case 1", seed: { v: 3, solved: { 0: 1, 1: 1, 2: 1 }, caseIdx: 0, cases: 3, issue: 4 }, want: 3 },
  { name: "v3, only solved through Case 2", seed: { v: 3, solved: { 0: 1, 1: 1 }, caseIdx: 2, cases: 2, issue: 3 }, want: 2 },
  { name: "pre-v3 save that solved Case 3", seed: { solved: { 0: 1, 1: 1, 2: 1 }, caseIdx: 0, cases: 3 }, want: 3 },
  { name: "already on v4, picked Case 1", seed: { v: 4, solved: { 0: 1, 1: 1, 2: 1 }, caseIdx: 0, cases: 3 }, want: 0 },
  { name: "v3, all four solved", seed: { v: 3, solved: { 0: 1, 1: 1, 2: 1, 3: 1 }, caseIdx: 0, cases: 4 }, want: 0 },
];
let fail = 0;
for (const c of cases) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("comiccop.v1", JSON.stringify(s)); sessionStorage.setItem("seeded", "1"); } }, c.seed);
  const page = await ctx.newPage();
  await page.goto(pageUrl("?debug"));
  await page.waitForTimeout(200);
  const got = await page.evaluate(() => ({ idx: __cc.save.caseIdx, title: document.getElementById("titleCase").textContent, on: document.querySelector("#caseRow .on")?.textContent }));
  const wantTitle = await page.evaluate(i => "and " + __cc.CASES[i].name, c.want);
  const ok = got.idx === c.want && got.title === wantTitle && got.on.startsWith(`Case ${c.want + 1}`);
  console.log(ok ? "ok  " : "FAIL", c.name, JSON.stringify(got));
  if (!ok) fail++;
  await ctx.close();
}
await browser.close();
console.log(`migrate: ${cases.length - fail}/${cases.length} pass`);
if (fail) process.exit(1);
