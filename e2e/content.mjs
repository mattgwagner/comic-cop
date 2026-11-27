// Content check (node, no deps). Evaluates the case 3 and case 4 content blocks of public/index.html and checks every bank row.
import fs from "node:fs";
import vm from "node:vm";
const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const m = html.match(/\/\/ ===== case 3 content[^\n]*\n([\s\S]*?)\/\/ ===== end case 3 content/);
if (!m) { console.error("content: case 3 content block not found"); process.exit(1); }
const c = vm.runInNewContext(m[1] + ";({AFFIX_SRC,SILENT_SRC,ENDING_SRC,AFFIX,SILENT,ENDING,PREFIXES,SUFFIXES,SILENT_LETTERS,SILENT_BLOCK,silentWrongs,affixLabel})");
const fails = [];
const bad = (bank, row, why) => fails.push(`${bank} row ${row}: ${why}`);
const once = (opts, ans) => opts.filter(o => o === ans).length === 1;
const lines = src => src.trim().split("\n");
const tierOk = t => /^[123]$/.test(t);
const tally = {};
const count = (bank, t) => { tally[bank] = tally[bank] || { 1: 0, 2: 0, 3: 0 }; tally[bank][t]++; };

const AFF = [...c.PREFIXES, ...c.SUFFIXES];
lines(c.AFFIX_SRC).forEach((l, i) => {
  const f = l.split("|"); if (f.length !== 6) return bad("AFFIX", i + 1, `${f.length} fields, want 6: ${l}`);
  const [base, a, o, t, clue, s] = f, wrong = o.split(","), opts = [a, ...wrong];
  if (!base || !clue) bad("AFFIX", i + 1, "empty base or clue");
  if (!AFF.includes(a)) bad("AFFIX", i + 1, `unknown affix ${a}`);
  for (const w of wrong) if (!AFF.includes(w)) bad("AFFIX", i + 1, `unknown wrong affix ${w}`);
  if (wrong.length < 2) bad("AFFIX", i + 1, "needs two wrong affixes");
  if (!once(opts, a)) bad("AFFIX", i + 1, "right affix not shown exactly once");
  if (wrong.includes(a)) bad("AFFIX", i + 1, "a wrong option equals the right one");
  if (new Set(opts.map(c.affixLabel)).size !== opts.length) bad("AFFIX", i + 1, "duplicate shown options");
  if (!s.includes("*")) bad("AFFIX", i + 1, "sentence has no *");
  if (!tierOk(t)) bad("AFFIX", i + 1, `tier ${t}`); else count("AFFIX", t);
});
lines(c.SILENT_SRC).forEach((l, i) => {
  const f = l.split("|"); if (f.length !== 5) return bad("SILENT", i + 1, `${f.length} fields, want 5: ${l}`);
  const [w, letter, p, t, s] = f, it = c.SILENT[i], wrongs = c.silentWrongs(it), opts = [letter, ...wrongs];
  if (!/^\d+$/.test(p) || w[+p] !== letter) bad("SILENT", i + 1, `${w}[${p}] is not ${letter}`);
  if (!c.SILENT_LETTERS.includes(letter)) bad("SILENT", i + 1, `${letter} is not a ghost letter`);
  if (wrongs.length < 3) bad("SILENT", i + 1, `only ${wrongs.length} wrong letters left after blocks`);
  if (!once(opts, letter)) bad("SILENT", i + 1, "right letter not shown exactly once");
  if (wrongs.includes(letter)) bad("SILENT", i + 1, "a wrong option equals the right one");
  if (!s.includes("*")) bad("SILENT", i + 1, "sentence has no *");
  if (!tierOk(t)) bad("SILENT", i + 1, `tier ${t}`); else count("SILENT", t);
});
for (const k of Object.keys(c.SILENT_BLOCK)) if (!c.SILENT.some(x => x.w === k)) fails.push(`SILENT_BLOCK: ${k} is not a bank word`);
lines(c.ENDING_SRC).forEach((l, i) => {
  const f = l.split("|"); if (f.length !== 6) return bad("ENDING", i + 1, `${f.length} fields, want 6: ${l}`);
  const [base, right, wrong, rule, t, s] = f, opts = [right, wrong];
  if (!["double", "drop-e", "y-to-i", "plain"].includes(rule)) bad("ENDING", i + 1, `rule ${rule}`);
  if (!/(ed|ing)$/.test(right)) bad("ENDING", i + 1, `${right} does not end in -ed or -ing`);
  if (!once(opts, right)) bad("ENDING", i + 1, "right spelling not shown exactly once");
  if (wrong === right) bad("ENDING", i + 1, "the wrong option equals the right one");
  if (!base) bad("ENDING", i + 1, "empty base");
  if (!s.includes("*")) bad("ENDING", i + 1, "sentence has no *");
  if (!tierOk(t)) bad("ENDING", i + 1, `tier ${t}`); else count("ENDING", t);
});
for (const [bank, list, min] of [["AFFIX", c.AFFIX, 30], ["SILENT", c.SILENT, 24], ["ENDING", c.ENDING, 30]]) {
  if (list.length < min) fails.push(`${bank}: ${list.length} rows, want at least ${min}`);
  const keys = list.map(x => x.key), dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (dup.length) fails.push(`${bank}: duplicate keys ${dup.join(", ")}`);
  for (const t of ["1", "2", "3"]) if (!tally[bank] || !tally[bank][t]) fails.push(`${bank}: no tier ${t} rows`);
}
const keyOk = [["AFFIX", c.AFFIX, "a:"], ["SILENT", c.SILENT, "s:"], ["ENDING", c.ENDING, "e:"]].every(([b, l, p]) => l.every(x => x.key.startsWith(p)) || (fails.push(`${b}: key prefix is not ${p}`), false));

// ---- Case 4: vowel teams, -er/-est, possessives ----
const m4 = html.match(/\/\/ ===== case 4 content[^\n]*\n([\s\S]*?)\/\/ ===== end case 4 content/);
if (!m4) { console.error("content: case 4 content block not found"); process.exit(1); }
const d = vm.runInNewContext(m4[1] + ";({VOWEL_SRC,COMPARE_SRC,POSS_SRC,VOWEL,COMPARE,POSS,VOWEL_TEAMS,VOWEL_BLOCK,COMPARE_BLOCK,OWN_ICON,THING_ICON,possPlural})");
lines(d.VOWEL_SRC).forEach((l, i) => {
  const f = l.split("|"); if (f.length !== 5) return bad("VOWEL", i + 1, `${f.length} fields, want 5: ${l}`);
  const [w, team, o, t, s] = f, wrong = o.split(","), opts = [team, ...wrong], it = d.VOWEL[i];
  if (!w.includes(team)) bad("VOWEL", i + 1, `${w} has no ${team}`);
  if (!d.VOWEL_TEAMS.includes(team)) bad("VOWEL", i + 1, `unknown team ${team}`);
  for (const x of wrong) if (!d.VOWEL_TEAMS.includes(x)) bad("VOWEL", i + 1, `unknown wrong team ${x}`);
  if (wrong.length < 2) bad("VOWEL", i + 1, "needs two wrong teams");
  if (!once(opts, team)) bad("VOWEL", i + 1, "right team not shown exactly once");
  if (wrong.includes(team)) bad("VOWEL", i + 1, "a wrong option equals the right one");
  if (new Set(opts).size !== opts.length) bad("VOWEL", i + 1, "duplicate shown options");
  if (it.pre + team + it.post !== w) bad("VOWEL", i + 1, "gap does not rebuild the word");
  for (const x of wrong) { const made = it.pre + x + it.post; if (d.VOWEL_BLOCK.includes(made) || made === w) bad("VOWEL", i + 1, `wrong team ${x} makes the real word ${made}`); }
  if (!s.includes("*")) bad("VOWEL", i + 1, "sentence has no *");
  if (!tierOk(t)) bad("VOWEL", i + 1, `tier ${t}`); else count("VOWEL", t);
});
lines(d.COMPARE_SRC).forEach((l, i) => {
  const f = l.split("|"); if (f.length !== 7) return bad("COMPARE", i + 1, `${f.length} fields, want 7: ${l}`);
  const [base, er, est, rule, o, t, s] = f, wrong = o.split(","), cards = [er, est, ...wrong];
  if (!["double", "drop-e", "y-to-i", "plain", "irregular"].includes(rule)) bad("COMPARE", i + 1, `rule ${rule}`);
  if (rule === "irregular" && t !== "3") bad("COMPARE", i + 1, "irregulars are tier 3 only");
  if (rule !== "irregular" && (!er.endsWith("er") || !est.endsWith("est"))) bad("COMPARE", i + 1, `${er}/${est} do not end in -er/-est`);
  if (wrong.length !== 2) bad("COMPARE", i + 1, "needs a wrong -er and a wrong -est");
  if (!once(cards, er) || !once(cards, est)) bad("COMPARE", i + 1, "right card not shown exactly once");
  if (wrong.includes(er) || wrong.includes(est)) bad("COMPARE", i + 1, "a wrong card equals a right one");
  if (new Set(cards).size !== 4) bad("COMPARE", i + 1, "duplicate cards");
  for (const x of wrong) if (d.COMPARE_BLOCK.includes(x)) bad("COMPARE", i + 1, `wrong card ${x} is a real word`);
  if (!s.includes("*") || s.startsWith("*")) bad("COMPARE", i + 1, "sentence needs a * (not at the start)");
  if (!tierOk(t)) bad("COMPARE", i + 1, `tier ${t}`); else count("COMPARE", t);
});
lines(d.POSS_SRC).forEach((l, i) => {
  const f = l.split("|"); if (f.length !== 7) return bad("POSS", i + 1, `${f.length} fields, want 7: ${l}`);
  const [owner, plural, thing, cnt, right, o, t] = f, wrong = o.split(","), opts = [right, ...wrong];
  if (cnt !== "1" && cnt !== "many") bad("POSS", i + 1, `count ${cnt}`);
  const want = cnt === "1" ? owner + "'s" : d.possPlural(plural);
  if (right !== want) bad("POSS", i + 1, `right tag ${right}, want ${want}`);
  if (wrong.length < 2) bad("POSS", i + 1, "needs two wrong tags");
  if (!once(opts, right)) bad("POSS", i + 1, "right tag not shown exactly once");
  if (wrong.includes(right)) bad("POSS", i + 1, "a wrong option equals the right one");
  if (new Set(opts).size !== opts.length) bad("POSS", i + 1, "duplicate tags");
  if (!(owner in d.OWN_ICON)) bad("POSS", i + 1, `no picture for ${owner}`);
  if (!d.THING_ICON[thing]) bad("POSS", i + 1, `no picture for ${thing}`);
  if (/^(it|its|it's)$/.test(owner)) bad("POSS", i + 1, "its/it's belongs to Case 1");
  if (!tierOk(t)) bad("POSS", i + 1, `tier ${t}`); else count("POSS", t);
});
for (const [bank, list, min, pre] of [["VOWEL", d.VOWEL, 30, "v:"], ["COMPARE", d.COMPARE, 30, "c:"], ["POSS", d.POSS, 24, "p:"]]) {
  if (list.length < min) fails.push(`${bank}: ${list.length} rows, want at least ${min}`);
  const keys = list.map(x => x.key), dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (dup.length) fails.push(`${bank}: duplicate keys ${dup.join(", ")}`);
  for (const t of ["1", "2", "3"]) if (!tally[bank] || !tally[bank][t]) fails.push(`${bank}: no tier ${t} rows`);
  if (!list.every(x => x.key.startsWith(pre))) fails.push(`${bank}: key prefix is not ${pre}`);
}
if (!d.POSS.some(x => x.many) || !d.POSS.some(x => !x.many)) fails.push("POSS: needs both one-owner and many-owner rows");
console.log("content", JSON.stringify(tally), keyOk ? "keys ok" : "");
if (fails.length) { console.error(fails.join("\n")); console.log(`content: ${fails.length} failed`); process.exit(1); }
console.log("content: all rows pass");
