// Plays every case headless, back to back, and screenshots each chapter. Usage: node e2e/play.mjs [outDir]
// CASE=3 plays only Case 3 (any case number works), ONE=1 only Case 1. VW / VH set the viewport (default 1920×1045).
import { launch, pageUrl } from "./pw.mjs";
const out = process.argv[2] || "/tmp";
const url = pageUrl("?debug&speed=3");
const browser = await launch();
const page = await browser.newPage({ viewport: { width: +process.env.VW || 1920, height: +process.env.VH || 1045 } });
const only = process.env.CASE ? +process.env.CASE - 1 : process.env.ONE ? 0 : null;
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => m.type() === "error" && !/fonts\.g/.test(m.text()) && errors.push(m.text()));
await page.goto(url);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/0-title.png` });
const NCASES = await page.evaluate(() => __cc.CASES.length);
const firstCase = only ?? 0, lastCase = only ?? NCASES - 1;
if (firstCase > 0) await page.locator("#caseRow .btn").nth(firstCase).click();
await page.click("#startBtn");
// ev takes no argument on purpose. Pass data with page.evaluate(fn, arg): ev(fn, x) silently drops x.
const ev = (f, ...extra) => { if (extra.length) throw new Error("ev takes no argument: use page.evaluate(fn, arg)"); return page.evaluate(f); };
const toScreen = (x, y) => page.evaluate(([x, y]) => __cc.toScreen(x, y), [x, y]);
const clickAt = async (x, y) => { const [sx, sy] = await toScreen(x, y); await page.mouse.click(sx, sy); };
const played = new Set();
const shot = n => page.screenshot({ path: `${out}/${n}.png` });
const wait = ms => page.waitForTimeout(ms);
const shots = new Set();
let wrongs = { street: 0, train: 0, clanky: 0, boss: 0, truck: 0 };
let lastKey = "", stall = Date.now(), chKey = "", chStart = Date.now();
for (let i = 0; i < 20000; i++) {
  const st = await ev(() => { const c = window.__cc; const h = c.CH(); return { mode: c.S.mode, cs: c.S.case, ch: c.S.ch, id: h.id, hearts: c.S.hearts, qa: !!c.QA, x: h.x, st: h.state, n: h.n, room: h.room, hp: h.hp, car: h.car, t: Math.floor((h.t || 0) * 2) }; });
  const key = JSON.stringify(st);
  if (key !== lastKey) { lastKey = key; stall = Date.now(); }
  else if (Date.now() - stall > 20000) { console.log("STALL", key, errors); await shot("stall"); break; }
  if (`${st.cs}/${st.ch}` !== chKey) { chKey = `${st.cs}/${st.ch}`; chStart = Date.now(); }
  else if (Date.now() - chStart > 240000) { console.log("STALL (chapter over 4 min)", key, errors); await shot("stall"); break; }
  if (st.mode === "over") break;
  if (st.mode === "win") {
    played.add(st.cs);
    if (st.cs === lastCase) break;
    await shot(`6-end-case${st.cs + 1}`); await page.click("#againBtn"); await wait(150); continue;
  }
  if (st.mode === "card") {
    if (!shots.has("card" + st.id)) { shots.add("card" + st.id); await shot(`c${st.cs + 1}-${st.ch + 1}-card`); }
    await page.click("#cardGo"); await wait(100); continue;
  }

  if (st.id === "claw") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "claw" || !c.q) return null; return { state: c.state, ans: c.q.ans, n: c.n, missed: c.missed, caps: c.caps.filter(k => !k.gone).map(k => ({ team: k.team, x: k.x })) }; });
    if (!r) { await wait(60); continue; }
    if (r.state === "aim") {
      // Word 2: grab a wrong capsule once (robo-raccoon, lost heart, tip). Word 3: hover with the mouse, drop with SPACE. Else click to drop.
      const bad = r.n === 1 && !r.missed && !shots.has("clawoops");
      const cap = r.caps.find(k => bad ? k.team !== r.ans : k.team === r.ans);
      if (r.n === 0 && !shots.has("claw")) { shots.add("claw"); await shot("c4-1-claw"); }
      if (r.n === 2 && !shots.has("clawkey")) {
        shots.add("clawkey");
        const [sx, sy] = await toScreen(cap.x, 420); await page.mouse.move(sx, sy, { steps: 3 });
        await page.waitForFunction(x => Math.abs(__cc.CH().cx - x) < 2, cap.x, { timeout: 5000 });
        await page.keyboard.press(" ");
      } else await clickAt(cap.x, 420);
      await wait(150); continue;
    }
    if (r.state === "carry" && !shots.has("clawcarry")) { shots.add("clawcarry"); await shot("c4-1-claw-grab"); }
    if (r.state === "oops" && !shots.has("clawoops")) { shots.add("clawoops"); await wait(200); await shot("c4-1-claw-wrong"); }
    await wait(60); continue;
  }
  if (st.id === "podium") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "podium" || !c.q) return null; return { state: c.state, n: c.n, er: c.q.er, est: c.q.est, missed: c.missed, fill: Object.keys(c.fill), drag: !!c.drag, cards: c.cards.map(k => ({ w: k.w, x: k.x, y: k.y, placed: k.placed, bad: k.bad })) }; });
    if (!r) { await wait(60); continue; }
    if (r.state === "ask" && !r.drag) {
      if (r.cards.some(k => !k.placed && !k.bad && Math.abs(k.y - 838) > 3)) { await wait(60); continue; }
      if (!shots.has("pod")) { shots.add("pod"); await shot("c4-2-podium"); }
      const slot = r.fill.includes("2") ? 1 : 2, slotXY = slot === 2 ? [610, 494] : [880, 404];
      const bad = r.n === 1 && !r.missed && !shots.has("podw");
      const card = r.cards.find(k => !k.placed && !k.bad && (bad ? k.w !== r.er && k.w !== r.est : k.w === (slot === 2 ? r.er : r.est)));
      if (r.n === 3) { await clickAt(card.x, card.y); await wait(120); await clickAt(...slotXY); } // click a card, then its step
      else {
        const [sx, sy] = await toScreen(card.x, card.y), [tx, ty] = await toScreen(...slotXY);
        await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 8 });
        if (!shots.has("poddrag")) { shots.add("poddrag"); await shot("c4-2-podium-drag"); }
        await page.mouse.up();
      }
      if (bad) { shots.add("podw"); await wait(250); await shot("c4-2-podium-wrong"); }
      await wait(150); continue;
    }
    if (r.state === "cel" && !shots.has("podcel")) { shots.add("podcel"); await wait(200); await shot("c4-2-podium-done"); }
    await wait(60); continue;
  }
  if (st.id === "hideout") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "hideout") return null; return { state: c.state, rs: c.rs, stun: c.stun, n: c.n, ans: c.q && c.q.ans, tags: c.tags.map(t => ({ w: t.w, bad: t.bad })), missed: c.missed, down: __cc.S.down }; });
    if (!r) { await wait(60); continue; }
    if (r.state === "sneak") {
      // Hold the mouse button while he sleeps; let go when he stirs. On the second pile, keep holding once to get caught.
      const wantCaught = r.n === 1 && !shots.has("hidecaught");
      if (wantCaught && r.stun > 0) { shots.add("hidecaught"); await page.mouse.up(); await wait(120); await shot("c4-3-hideout-caught"); continue; }
      const go = r.stun <= 0 && (r.rs === "sleep" || (wantCaught && r.rs === "watch"));
      if (go && !r.down) { const [sx, sy] = await toScreen(800, 600); await page.mouse.move(sx, sy); await page.mouse.down(); }
      else if (!go && r.down) await page.mouse.up();
      if (r.n === 0 && r.down && !shots.has("hide")) { shots.add("hide"); await shot("c4-3-hideout"); }
      if (r.rs === "watch" && !shots.has("hidewatch")) { shots.add("hidewatch"); await shot("c4-3-hideout-freeze"); }
      await wait(20); continue;
    }
    if (r.down) await page.mouse.up();
    if (r.state === "tag") {
      await wait(250);
      if (!shots.has("hidetag")) { shots.add("hidetag"); await shot("c4-3-hideout-tag"); }
      const bad = r.n === 2 && !r.missed;
      const i = r.tags.findIndex(t => bad ? t.w !== r.ans && !t.bad : t.w === r.ans);
      if (r.n === 4) await page.keyboard.press(String(i + 1)); else await clickAt([660, 900, 1140][i], 818);
      if (bad) { await wait(250); await shot("c4-3-hideout-wrong"); }
      await wait(100); continue;
    }
    await wait(60); continue;
  }
  if (st.id === "truck") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "truck") return null; return { state: c.state, ans: c.q && c.q.ans, opts: c.cards.map(k => k.o), kind: c.q && c.q.kind, pos: c.pos }; });
    if (!r) continue;
    if (r.state === "ask") {
      await wait(300);
      if (!shots.has("tr4")) { shots.add("tr4"); await shot("c4-4-truck"); }
      if (r.kind === "poss" && !shots.has("tr4p")) { shots.add("tr4p"); await shot("c4-4-truck-poss"); }
      let i = r.opts.indexOf(r.ans);
      if (r.pos > .3 && !shots.has("trw")) { shots.add("trw"); i = r.opts.findIndex(o => o !== r.ans); await page.keyboard.press(String(i + 1)); await wait(300); await shot("c4-4-truck-wrong"); continue; }
      if (wrongs.truck++ % 2) await clickAt(600 + i * 290, 330); else await page.keyboard.press(String(i + 1));
    }
    if (r.state === "retry") { const i = await page.evaluate(() => { const c = __cc.CH(); return c.cards.findIndex(k => !k.gone && k.o === c.q.ans); }); if (i >= 0) await page.keyboard.press(String(i + 1)); }
    if (r.state === "dead" && !shots.has("trd")) { shots.add("trd"); await wait(900); await shot("c4-4-truck-dead"); }
    await wait(80); continue;
  }
  if (st.id === "glue") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "glue" || !c.q) return null; return { state: c.state, ans: c.q.ans, opts: c.pieces.map(p => p.a), bad: c.pieces.map(p => p.bad), glob: !!c.glob, n: c.n, xy: c.pieces.map(p => c.pieceXY(p)) }; });
    if (r && (r.state === "ask" || r.state === "retry") && !r.glob) {
      await wait(250);
      let i = r.opts.indexOf(r.ans);
      if (r.n === 2 && r.state === "ask" && !shots.has("gluew")) { shots.add("gluew"); i = r.bad.findIndex((b, k) => !b && k !== i); await page.keyboard.press(String(i + 1)); await wait(260); await shot("c3-1-glue-wrong"); continue; }
      if (r.n === 1 && !shots.has("glue")) { shots.add("glue"); await shot("c3-1-glue"); }
      if (r.n === 3 && !shots.has("gluetap")) { shots.add("gluetap"); await clickAt(r.xy[i][0], r.xy[i][1]); await wait(200); continue; }
      await page.keyboard.press(String(i + 1));
      if (r.n === 0 && !shots.has("gluefire")) { shots.add("gluefire"); await wait(80); await shot("c3-1-glue-fire"); }
    }
    await wait(80); continue;
  }
  if (st.id === "library") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "library" || !c.q) return null; return { state: c.state, ans: c.q.ans, n: c.n, letters: c.letters.map(L => ({ ch: L.ch, gone: L.gone, xy: c.pos(L) })) }; });
    if (r && r.state === "search") {
      const live = r.letters.filter(L => !L.gone);
      // On the second word, pick every wrong letter first: shush, tip, and the flying book.
      const L = r.n === 1 && live.some(L => L.ch !== r.ans) ? live.find(L => L.ch !== r.ans) : live.find(L => L.ch === r.ans);
      const [sx, sy] = await toScreen(L.xy[0], L.xy[1]);
      await page.mouse.move(sx, sy, { steps: 4 }); await wait(250);
      if (!shots.has("lib") && r.n === 0) { shots.add("lib"); await shot("c3-2-library"); }
      const [sx2, sy2] = await toScreen(...(await page.evaluate(ch => { const c = __cc.CH(); const L = c.letters.find(l => l.ch === ch && !l.gone); return L ? c.pos(L) : [0, 0]; }, L.ch)));
      await page.mouse.click(sx2, sy2);
      if (r.n === 1 && live.length === 2 && !shots.has("libtip")) { shots.add("libtip"); await wait(150); await shot("c3-2-library-shush"); }
      await wait(150);
    } else await wait(80);
    continue;
  }
  if (st.id === "coaster") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "coaster" || !c.q) return null; return { state: c.state, ans: c.q.ans, tracks: c.tracks, cx: c.cx, n: c.n, lever: c.lever, bad: !!c.res && !c.res.ok }; });
    if (r && r.state === "run" && r.cx > 150 && !r.lever) {
      let up = r.tracks[0] === r.ans;
      if (r.n === 2 && !shots.has("coastw")) { shots.add("coastw"); up = !up; }
      await page.keyboard.press(up ? "ArrowUp" : "ArrowDown");
      if (!shots.has("coast")) { shots.add("coast"); await wait(200); await shot("c3-3-coaster"); }
    } else if (r && r.state === "go" && r.bad && !shots.has("coastspook")) { const cx = await ev(() => __cc.CH().cx); if (cx > 1440) { shots.add("coastspook"); await shot("c3-3-coaster-spooky"); } }
    await wait(60); continue;
  }
  if (st.id === "snipsub") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "snipsub") return null; return { state: c.state, ans: c.q && c.q.ans, opts: c.pieces.map(p => p.o), gone: c.pieces.map(p => p.gone), hp: c.hp, p: c.pieces.map(p => p.p) }; });
    if (!r) continue;
    if (r.state === "ask" && r.p.every(p => p >= 1)) {
      await wait(300);
      if (!shots.has("ss")) { shots.add("ss"); await shot("c3-4-snipsub"); }
      let i = r.opts.indexOf(r.ans);
      if (r.hp === 4 && !shots.has("ssw")) { shots.add("ssw"); i = r.opts.findIndex(o => o !== r.ans); await page.keyboard.press(String(i + 1)); await wait(300); await shot("c3-4-snipsub-wrong"); continue; }
      await page.keyboard.press(String(i + 1));
    }
    if (r.state === "dead" && !shots.has("ssd")) { shots.add("ssd"); await wait(900); await shot("c3-4-snipsub-dead"); }
    await wait(80); continue;
  }
  if (st.id === "rooftop") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "rooftop" || !c.q) return null; return { state: c.state, ans: c.q.ans, n: c.n, wrong: c.wrong, drops: c.drops.map(d => ({ k: d.k, ch: d.ch, x: d.x, y: d.y })), x: c.x }; });
    if (r && r.state === "play") {
      const bad = r.n === 1 && r.wrong === 0;
      const tgt = r.drops.filter(d => d.k === "l" && (bad ? d.ch !== r.ans : d.ch === r.ans)).sort((a, b) => b.y - a.y)[0];
      const egg = r.drops.find(d => d.k === "egg" && d.y > 450 && Math.abs(d.x - r.x) < 160);
      const tx = egg && !tgt ? (r.x > 800 ? r.x - 300 : r.x + 300) : tgt ? tgt.x : r.x;
      await page.evaluate(x => __cc.CH().move(x), tx);
      if (!shots.has("roof") && r.n === 2) { shots.add("roof"); await shot("c2-1-rooftop"); }
    }
    await wait(40); continue;
  }
  if (st.id === "tower") {
    const r = await ev(() => { const c = __cc.CH(); return c.id === "tower" && c.q && { state: c.state, ans: c.q.ans, opts: c.opts.map(o => o.w), n: c.n }; });
    if (r && (r.state === "ask" || r.state === "retry")) {
      await wait(300);
      let i = r.opts.indexOf(r.ans);
      if (r.n === 3 && r.state === "ask" && !shots.has("towerw")) { shots.add("towerw"); i = (i + 1) % 3; await shot("c2-2-tower"); await page.keyboard.press(String(i + 1)); await wait(300); await shot("c2-2-tower-wrong"); continue; }
      await page.keyboard.press(String(i + 1));
    }
    await wait(80); continue;
  }
  if (st.id === "ghost") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "ghost") return null; return { state: c.state, ans: c.q.ans, opts: c.tix.map(t => t.w), g: c.g.state, hid: c.hid, car: c.car }; });
    if (!r) continue;
    if (r.g === "warn" && !r.hid) { await page.keyboard.press(" "); if (!shots.has("gw")) { shots.add("gw"); await wait(100); await shot("c2-3-ghost-hide"); } continue; }
    if (r.g === "sweep" && !shots.has("gs")) { await wait(500); shots.add("gs"); await shot("c2-3-ghost-sweep"); }
    if ((r.state === "ask" || r.state === "retry") && !r.hid && r.g === "away") {
      if (!shots.has("gq") && r.car === 1) { shots.add("gq"); await shot("c2-3-ghost"); }
      let i = r.opts.indexOf(r.ans);
      if (r.car === 2 && r.state === "ask" && !shots.has("gwr")) { shots.add("gwr"); i = (i + 1) % 3; }
      await wait(250); await page.keyboard.press(String(i + 1));
    }
    await wait(80); continue;
  }
  if (st.id === "blimp") {
    const r = await ev(() => { const c = __cc.CH(); if (c.id !== "blimp") return null; return { state: c.state, ans: c.q && c.q.ans, opts: c.balls.map(b => b.w), hp: c.hp }; });
    if (!r) continue;
    if (r.state === "ask") {
      await wait(500);
      if (!shots.has("bl")) { shots.add("bl"); await shot("c2-4-blimp"); }
      let i = r.opts.indexOf(r.ans);
      if (r.hp === 5 && !shots.has("blw")) { shots.add("blw"); i = (i + 1) % 3; await page.keyboard.press(String(i + 1)); await wait(300); await shot("c2-4-blimp-wrong"); continue; }
      await page.keyboard.press(String(i + 1));
    }
    if (r.state === "dead" && !shots.has("bd")) { shots.add("bd"); await wait(1800); await shot("c2-4-blimp-dead"); }
    await wait(80); continue;
  }
  if (st.id === "street") {
    if (st.qa) {
      const q = await ev(() => __cc.QA && ({ target: __cc.QA.target, ans: __cc.QA.q.ans, answered: __cc.QA.answered, step: __cc.QA.step }));
      if (!q || q.answered) { await wait(80); continue; }
      if (!shots.has("spot")) { shots.add("spot"); await shot("1-street-spot"); }
      if (q.step === 1) { await page.click(`.word[data-i="${q.target}"]`); await wait(80); }
      else {
        const bad = wrongs.street++ === 1;
        const opts = await page.locator(".opt").allTextContents();
        await page.locator(".opt").nth(bad ? opts.findIndex(o => o !== q.ans) : opts.indexOf(q.ans)).click();
        if (bad) { await wait(150); await shot("1-street-wrong"); }
      }
      continue;
    }
    const near = await ev(() => { const c = __cc.CH(); return !!c.objs && c.objs.some(o => o.k === "rat" && !o.hit && o.x - c.x > 60 && o.x - c.x < 190); });
    if (near) await page.keyboard.press(" ");
    if (!shots.has("run") && (await ev(() => __cc.CH().x || 0)) > 1400) { shots.add("run"); await shot("1-street-run"); }
    await wait(30); continue;
  }
  if (st.id === "pizza") {
    const p = await ev(() => { const c = __cc.CH(); return { state: c.state, word: c.word, typed: c.typed, n: c.n }; });
    if (p.state === "order") {
      if (!shots.has("pz") && p.n === 1) { shots.add("pz"); await shot("2-pizza"); }
      await page.keyboard.press(p.word[p.typed.length]); await wait(120);
    } else await wait(80);
    continue;
  }
  if (st.id === "train") {
    const t = await ev(() => { const c = __cc.CH(); return { state: c.state, labels: c.gates && c.gates.map(g => g.label), ans: c.q && c.q.ans, gx: c.gx, n: c.n }; });
    if (t.state === "gate" && t.gx < 1300) {
      let lane = t.labels.indexOf(t.ans);
      if (t.n === 2 && wrongs.train++ === 0) lane = (lane + 1) % 3;
      await page.keyboard.press(String(lane + 1));
      if (!shots.has("tr")) { shots.add("tr"); await wait(200); await shot("3-train"); }
      await wait(150);
    } else await wait(80);
    continue;
  }
  if (st.id === "clanky") {
    const c = await ev(() => { const c = __cc.CH(); if (c.id !== "clanky" || !c.doors || !c.q) return null; return { state: c.state, opts: c.doors.map(d => d.w), ans: c.q.ans, room: c.room, cl: c.cl }; });
    if (c && c.state === "choose") {
      if (!shots.has("cl") && c.room === 1) { shots.add("cl"); await page.mouse.move(900, 500); await wait(2500); await shot("4-clanky"); await page.mouse.click(1700, 600); await wait(100); await shot("4-clanky-flash"); }
      let i = c.opts.indexOf(c.ans);
      if (c.room === 2 && wrongs.clanky++ === 0) { i = (i + 1) % 3; await page.keyboard.press(String(i + 1)); await wait(300); await shot("4-clanky-wrong"); await page.keyboard.press(String(c.opts.indexOf(c.ans) + 1)); continue; }
      await wait(400); await page.keyboard.press(String(i + 1));
    } else await wait(80);
    continue;
  }
  if (st.id === "boss") {
    if (st.qa) {
      const q = await ev(() => __cc.QA && ({ ans: __cc.QA.q.ans, answered: !!__cc.QA.answered }));
      if (!q || q.answered) { await wait(80); continue; }
      await wait(600);
      if (!shots.has("boss")) { shots.add("boss"); await shot("5-boss"); }
      const bad = wrongs.boss++ === 1;
      const opts = await page.locator(".opt").allTextContents();
      const idx = bad ? opts.findIndex(o => o !== q.ans) : opts.indexOf(q.ans);
      await page.locator(".opt").nth(idx).click();
      await wait(250);
      if (!shots.has("boss" + (bad ? "w" : "r"))) { shots.add("boss" + (bad ? "w" : "r")); await shot(bad ? "5-boss-zap" : "5-boss-pow"); }
    } else {
      const s = await ev(() => __cc.CH().state);
      if (s === "dead" && !shots.has("dead")) { shots.add("dead"); await wait(700); await shot("5-boss-dead"); }
      await wait(80);
    }
    continue;
  }
}
const end = await ev(() => ({ cs: __cc.S.case, mode: __cc.S.mode, hearts: __cc.S.hearts, run: __cc.RUN, pizza: __cc.save.pizza, solved: __cc.save.solved, hats: __cc.save.hats, badges: Object.keys(__cc.save.badges) }));
await wait(300);
await shot("6-end");
console.log("end", JSON.stringify(end));
await page.click("#winLocker").catch(() => {});
await wait(200); await shot("7-locker");
await page.click("#lockerBack").catch(() => {});
await page.click("#adultBtn").catch(() => {});
await wait(200); await shot("8-adult");
console.log("errors", errors.length ? errors : "none");
await browser.close();
const want = []; for (let c = firstCase; c <= lastCase; c++) want.push(c);
const missing = want.filter(c => !played.has(c));
console.log(`play: closed ${want.length - missing.length}/${want.length} cases`, missing.length ? `(missing Case ${missing.map(c => c + 1).join(", ")})` : "");
const noBadge = want.filter(c => !end.badges.includes(`case${c + 1}`));
console.log(`play: case badges ${want.length - noBadge.length}/${want.length}`, noBadge.length ? `(missing case${noBadge.map(c => c + 1).join(", case")})` : "");
if (end.mode !== "win" || end.cs !== lastCase || missing.length || noBadge.length || errors.length) process.exit(1);
