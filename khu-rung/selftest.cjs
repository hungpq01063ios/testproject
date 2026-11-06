#!/usr/bin/env node
/* Craft Anything self-test contract: `node selftest.cjs --self-test <file.json> [--screenshot <file.png>]`
 * Plays a whole cooperative game through the real page with scripted taps and reports each step. */
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const args = process.argv.slice(2), argOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const out = argOf('--self-test'), shot = argOf('--screenshot');
if (!out) { console.error('Usage: node selftest.cjs --self-test <file.json> [--screenshot <file.png>]'); process.exit(2); }
const { chromium } = require('playwright');
(async () => {
  const steps = [], add = (step, passed, detail) => { steps.push({ step, passed: !!passed, detail }); console.log(`${passed ? 'PASS' : 'FAIL'} ${step}: ${detail}`); };
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1400, height: 950 } }), errors = [];
  page.on('pageerror', (e) => errors.push(String(e))); await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href + '?fast=1&seed=31');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  const S = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__forest.state)));
  const idle = () => page.waitForFunction(() => window.__forest.state && !window.__forest.busy, null, { polling: 25 });
  try {
    for (const a of ['bear', 'rabbit', 'squirrel']) await page.click(`.acard[data-animal="${a}"]`);
    await page.fill('#nm-bear', 'Na');
    await page.click('#startBtn'); await idle();
    const s0 = await S();
    add('setup', s0.players.length === 3 && s0.players[0].name === 'Na' && s0.goal === 7, `3 animals joined (${s0.players.map((p) => `${p.name}/${p.animal}`).join(', ')}), shared goal ${s0.goal} trees, storm 0/${s0.stormMax}`);

    // move + act: Na the bear rolls 2 and lands on the stream (tile 2)
    await page.evaluate(() => { window.__forceRoll = 2; }); await page.click('#rollBtn'); await idle();
    const s1 = await S(), v1 = await page.evaluate(() => window.__forest.view());
    add('move', s1.players[0].pos === 2 && v1.tokenTile[0] === 2, `rolled 2, the bear hopped from tile 0 to tile ${s1.players[0].pos} (${['Nhà Cây', 'Hạt giống', 'Suối mát'][s1.players[0].pos]})`);
    add('act', s1.players[0].water === s0.players[0].water + 2 && s1.phase === 'done', `water ${s0.players[0].water} → ${s1.players[0].water}; result "${s1.result}"`);

    // hud: cards and meters show the state
    const hud = await page.evaluate(() => ({ cards: [...document.querySelectorAll('[data-player]')].map((c) => [c.querySelector('[data-seeds]').textContent, c.querySelector('[data-water]').textContent, c.querySelector('[data-hearts]').textContent].map(Number)), trees: document.getElementById('treeTxt').textContent, storm: document.getElementById('stormTxt').textContent, who: document.getElementById('whoName').textContent }));
    const hudOk = hud.cards.every((c, i) => c[0] === s1.players[i].seeds && c[1] === s1.players[i].water && c[2] === s1.players[i].hearts) && hud.trees === `${s1.trees}/${s1.goal}` && hud.who.includes('Na');
    add('hud', hudOk, `"${hud.who}", trees ${hud.trees}, storm ${hud.storm}, cards ${JSON.stringify(hud.cards)}`);

    const png = await page.locator('#scene').screenshot(); const v2 = await page.evaluate(() => window.__forest.view());
    add('render-3d', v2.webgl && png.length > 40000 && v2.tokens.join() === 'bear,rabbit,squirrel', `WebGL on, ${v2.frames} frames, picture ${Math.round(png.length / 1024)} KB, animals ${v2.tokens.join(', ')}`);

    // hot-seat + rabbit power: the rabbit gets to choose how far to hop
    await page.click('#nextBtn'); await idle();
    await page.evaluate(() => { window.__forceRoll = 1; }); await page.click('#rollBtn'); await idle();
    const sh = await S();
    add('rabbit-hop', sh.turn === 1 && sh.phase === 'choice' && sh.choice.kind === 'hop', `turn passed to ${sh.players[1].name}; choice "${sh.choice && sh.choice.title}" with ${sh.choice && sh.choice.options.map((o) => o.label).join(' / ')}`);
    await page.click('[data-choice="1"]'); await idle();
    const sh2 = await S(); add('rabbit-moved', sh2.players[1].pos === 3, `the rabbit hopped 1+2 = 3 tiles to tile ${sh2.players[1].pos} (${['', '', '', 'Chỗ trồng cây'][sh2.players[1].pos] || sh2.players[1].pos})`);

    // play on: scripted taps until the game ends
    let actions = 0, stormSeen = [], gifts = 0;
    while (actions < 2000) {
      const st = await S(); if (st.outcome && st.phase === 'over') break; actions++;
      if (shot && actions === 25) await page.screenshot({ path: shot });
      if (st.phase === 'choice') { const c = st.choice; let k = 0; if (c.kind === 'help') k = 0; if (c.kind === 'hop') k = 1; await page.click(`[data-choice="${k}"]`); }
      else if (st.phase === 'roll') await page.click('#rollBtn');
      else if (st.phase === 'done') { const r0 = st.round; await page.click('#nextBtn'); const s2 = await S(); if (s2.round > r0) stormSeen.push(s2.storm); }
      await idle();
      const lg = await page.evaluate(() => window.__forest.state.lastEvent); if (lg && lg.kind === 'gift') gifts++;
    }
    const end = await S();
    add('storm-clock', stormSeen.length > 0 && stormSeen.every((v, i) => i === 0 || v >= stormSeen[i - 1] - 1), `storm after each round: ${stormSeen.join(' → ')}`);
    add('teamwork', end.players.reduce((n, p) => n + p.stats.gifts, 0) > 0, `gifts between friends: ${end.players.map((p) => `${p.name} ${p.stats.gifts}`).join(', ')}; trash cleaned ${end.players.reduce((n, p) => n + p.stats.cleaned, 0)}`);
    const endVis = await page.isVisible('#endOverlay'), badges = await page.locator('.badge').count();
    add('finish', end.phase === 'over' && endVis && badges === 3 && new Set(end.badges).size === 3, `${end.outcome === 'win' ? 'WIN' : 'storm'} after ${end.round} rounds with ${end.trees}/${end.goal} trees; ending screen with ${badges} distinct badges (${end.badges.join(', ')})`);
    const v3 = await page.evaluate(() => window.__forest.view());
    add('forest-grows', v3.trees === Math.min(end.trees, 18), `${v3.trees} trees standing in the clearing (state ${end.trees})`);
    add('player-rolls', end.rolls === end.playerRolls && end.rolls > 5, `all ${end.rolls} dice rolls came from a tap`);
    add('no-errors', errors.length === 0, errors.length ? errors.join(' | ') : 'no script errors');
  } catch (e) { add('run', false, String(e && e.stack || e)); }
  await browser.close();
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify({ version: 1, steps }, null, 2));
  process.exit(steps.every((s) => s.passed) ? 0 : 1);
})();
