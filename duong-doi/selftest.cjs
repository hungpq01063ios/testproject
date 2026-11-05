#!/usr/bin/env node
/*
 * Craft Anything self-test contract: `node selftest.cjs --self-test <file.json>`
 * Starts a game the way players would (setup screen, real button clicks), plays it with scripted
 * input, measures each core-loop step from the game's own state, writes the report and exits.
 * Optional: --screenshot <file.png> saves a picture of the board mid-game.
 */
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const args = process.argv.slice(2);
const argOf = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const out = argOf('--self-test');
const shot = argOf('--screenshot');
if (!out) { console.error('Usage: node selftest.cjs --self-test <file.json> [--screenshot <file.png>]'); process.exit(2); }

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is required for the self-test (npm i -D playwright).'); process.exit(2); }

(async () => {
  const steps = [];
  const add = (step, passed, detail) => { steps.push({ step, passed: !!passed, detail }); console.log(`${passed ? 'PASS' : 'FAIL'} ${step}: ${detail}`); };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Fonts come from Google; offline runs fall back to system fonts.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const url = pathToFileURL(path.join(__dirname, 'index.html')).href + '?fast=1&seed=20261105';
  await page.goto(url);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

  const S = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__duongdoi.state)));
  const idle = () => page.waitForFunction(() => window.__duongdoi.state && !window.__duongdoi.busy);

  try {
    // Setup: 3 players, as a group would type them.
    await page.click('#count3');
    const names = ['Lan', 'Minh', 'Tuấn'];
    for (let i = 0; i < 3; i++) await page.fill(`#pname${i}`, names[i]);
    await page.click('#startBtn');
    await idle();

    // ---- move: player 1 spins (forced 6), picks the university branch at the start fork ----
    let s0 = await S();
    await page.evaluate(() => { window.__forceSpin = 6; });
    await page.click('#spinBtn');
    await page.waitForSelector('[data-choice="0"]');
    const forkTitle = await page.textContent('#choices .choice-title');
    await page.click('[data-choice="0"]'); // Học đại học
    await idle();
    let s1 = await S();
    const p1 = s1.players[0];
    const tokenPos = await page.getAttribute('[data-player="0"]', 'data-pos');
    add('move', p1.pos !== s0.players[0].pos && p1.pos === 6 && tokenPos === String(p1.pos),
      `spun 6 at "${forkTitle}", ${p1.name} moved from tile ${s0.players[0].pos} to tile ${p1.pos} ("${await page.evaluate((i) => window.__duongdoi.tiles[i].label, p1.pos)}"), token drawn there`);

    // ---- act: the main action resolves — tuition paid (loan taken) and the landing tile applied ----
    const tuitionOk = p1.degree && p1.loans >= 1;
    add('act', tuitionOk && s1.phase === 'done' && s1.log.length > s0.log.length,
      `university fork charged 50 tr (cash ${s0.players[0].cash} → ${p1.cash}, loans ${p1.loans}); landing result: "${s1.result}"`);

    // ---- hud: names, cash, salary, stars for every player, plus the turn card ----
    const hud = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#hud tbody tr')];
      return { rows: rows.map((r) => ({ name: r.querySelector('.pname').textContent.trim(), cash: r.querySelector('[data-cash]').textContent, salary: r.querySelector('[data-salary]').textContent, stars: r.querySelector('[data-stars]').textContent })),
        turn: document.getElementById('turnName').textContent, tokens: document.querySelectorAll('#tokens .token').length, tiles: document.querySelectorAll('#board .tile').length };
    });
    const hudOk = hud.rows.length === 3 && hud.rows.every((r, i) => r.name === names[i] && r.cash.startsWith(String(s1.players[i].cash)) && r.stars === String(s1.players[i].stars)) && hud.turn === names[0] && hud.tokens === 3;
    add('hud', hudOk, `turn card shows ${hud.turn}; table shows ${hud.rows.map((r) => `${r.name} ${r.cash.split('nợ')[0].trim()} / ${r.stars}★`).join(', ')}; ${hud.tokens} tokens on ${hud.tiles} tiles`);

    // ---- hot-seat: end turn passes the device to player 2, who takes the other branch ----
    await page.click('#endTurnBtn');
    await idle();
    let s2 = await S();
    await page.evaluate(() => { window.__forceSpin = 3; });
    await page.click('#spinBtn');
    await page.waitForSelector('[data-choice="1"]');
    await page.click('[data-choice="1"]'); // Đi làm ngay
    await idle();
    let s3 = await S();
    add('hot-seat', s2.turn === 1 && s3.players[1].branches[0] === 'work' && s3.players[0].pos === p1.pos,
      `turn passed to ${s3.players[1].name}, who took the work branch to tile ${s3.players[1].pos}; ${names[0]} stayed on tile ${s3.players[0].pos}`);

    if (shot) { await page.click('#endTurnBtn'); await idle(); }

    // ---- full game: keep clicking whatever the game offers until everyone retires ----
    let actions = 0, choicesMade = 0;
    while (actions < 3000) {
      const st = await S();
      if (st.phase === 'over') break;
      actions++;
      if (shot && actions === 40) await page.screenshot({ path: shot, fullPage: true });
      if (st.phase === 'choice') { const n = st.choice.options.length; await page.click(`[data-choice="${actions % n}"]`); choicesMade++; }
      else if (st.phase === 'spin') await page.click('#spinBtn');
      else if (st.phase === 'done') await page.click('#endTurnBtn');
      await idle();
    }
    const end = await S();
    const overVisible = await page.isVisible('#gameover');
    const winner = await page.textContent('#winnerTitle');
    add('retire', end.phase === 'over' && end.players.every((p) => p.retired) && overVisible && end.final.length === 3,
      `${actions} scripted actions (${choicesMade} choices), ${end.round} rounds; final screen: "${winner}" with ${end.final.map((f) => `${f.name} ${f.score}`).join(', ')}`);
    add('no-errors', errors.length === 0, errors.length ? errors.join(' | ') : 'no script errors in the page');
  } catch (e) {
    add('run', false, String(e && e.stack || e));
  } finally {
    await browser.close();
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ version: 1, steps }, null, 2));
  process.exit(steps.every((s) => s.passed) ? 0 : 1);
})();
