#!/usr/bin/env node
/* Craft Anything self-test contract: `node selftest.cjs --self-test <file.json> [--screenshot <file.png>]`
 * Plays a whole cooperative game through the real page with scripted taps, bot-plays every mini-game, reports each step. */
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
  const idle = () => page.waitForFunction(() => window.__forest.state && !window.__forest.busy, null, { polling: 25, timeout: 60000 });
  try {
    // mini-games: a bot plays each one through the real canvas game
    const minis = {};
    for (const k of ['catch', 'sprout', 'sort', 'count', 'clouds', 'find']) minis[k] = await page.evaluate((k) => window.__forestMiniBot(k), k);
    add('mini-games', Object.values(minis).every((s) => s >= 2), `bot stars: ${Object.entries(minis).map(([k, s]) => `${k} ${s}★`).join(', ')}`);

    for (const a of ['bear', 'rabbit', 'squirrel']) await page.click(`.acard[data-animal="${a}"]`);
    await page.fill('#nm-bear', 'Na');
    await page.click('#startBtn'); await idle();
    const s0 = await S();
    add('setup', s0.players.length === 3 && s0.players[0].name === 'Na' && s0.zones.length === 5 && s0.need === 2, `3 animals (${s0.players.map((p) => `${p.name}/${p.animal}`).join(', ')}); 5 zones to restore, ${s0.need} trees + 1 rescue each; storm 0/${s0.stormMax}`);

    // move: from the Mother Tree the bear picks Rừng Tre, rolls 3 and lands on the stream (zone tile 2)
    await page.evaluate(() => { window.__forceRoll = 3; }); await page.click('#rollBtn'); await idle();
    const sf = await S();
    add('fork', sf.phase === 'choice' && sf.choice.kind === 'fork' && sf.choice.options.length === 5, `at the Mother Tree: "${sf.choice && sf.choice.title}" → ${sf.choice && sf.choice.options.map((o) => o.label).join(' / ')}`);
    await page.click('[data-choice="0"]'); await idle();
    const s1 = await S(), v1 = await page.evaluate(() => window.__forest.view());
    add('move', s1.players[0].pos === 3 && v1.tokenTile[0] === 3, `the bear hopped into Rừng Tre to tile ${s1.players[0].pos} (${['Cây Mẹ', 'Hạt giống', 'Hứng hạt dẻ', 'Suối mát'][s1.players[0].pos]})`);
    add('act', s1.players[0].water === s0.players[0].water + 2 && s1.phase === 'done', `water ${s0.players[0].water} → ${s1.players[0].water}; "${s1.result}"`);
    const hud = await page.evaluate(() => ({ cards: [...document.querySelectorAll('[data-player]')].map((c) => [c.querySelector('[data-seeds]').textContent, c.querySelector('[data-water]').textContent, c.querySelector('[data-hearts]').textContent].map(Number)), zones: document.querySelectorAll('.zchip').length, storm: document.getElementById('stormTxt').textContent, time: document.getElementById('timeTxt').textContent }));
    add('hud', hud.zones === 5 && hud.cards.every((c, i) => c[0] === s1.players[i].seeds && c[1] === s1.players[i].water && c[2] === s1.players[i].hearts), `${hud.zones} zone chips, storm ${hud.storm}, "${hud.time}", cards ${JSON.stringify(hud.cards)}`);
    const png = await page.locator('#scene').screenshot(); const v2 = await page.evaluate(() => window.__forest.view());
    add('render-3d', v2.webgl && png.length > 40000, `WebGL on, ${v2.frames} frames, picture ${Math.round(png.length / 1024)} KB, animals ${v2.tokens.join(', ')}`);

    // play on with scripted taps until the end
    let actions = 0; const stormSeen = [], kinds = new Set(), forks = new Set();
    while (actions < 3000) {
      const st = await S(); if (st.phase === 'over') break; actions++;
      if (shot && actions === 40) await page.screenshot({ path: shot });
      if (st.phase === 'choice') { const c = st.choice; kinds.add(c.kind); let k = 0;
        if (c.kind === 'fork') { const sc = c.options.map((o) => { const z = st.zones[o.zone]; return (z.restored ? -9 : 0) + (st.need - z.trees) + (z.rescued ? 0 : 1.5); }); k = sc.indexOf(Math.max(...sc)); forks.add(c.options[k].icon); }
        if (c.kind === 'hop') k = 1;
        await page.click(`[data-choice="${k}"]`); }
      else if (st.phase === 'roll') await page.click('#rollBtn');
      else if (st.phase === 'done') { const r0 = st.round; await page.click('#nextBtn'); const s2 = await S(); if (s2.round > r0) stormSeen.push(s2.storm); }
      await idle();
    }
    const end = await S(), view = await page.evaluate(() => window.__forest.view());
    add('zones', end.zones.filter((z) => z.restored).length >= 3, `zones restored ${end.zones.filter((z) => z.restored).length}/5 (${end.zones.map((z) => `${z.trees}🌳${z.rescued ? '+bạn' : ''}`).join(' · ')}); mini-games played ${end.minisPlayed}; decisions met: ${[...kinds].join(', ')}; routes ${[...forks].join(', ')}`);
    add('storm-clock', stormSeen.length > 3, `storm after each round: ${stormSeen.join(' → ')}`);
    add('cinematics', ['rescue', 'restore', 'ending'].every((k) => view.cuts.includes(k)), `played: ${view.cuts.join(', ')}`);
    const endVis = await page.isVisible('#endOverlay'), badges = await page.locator('.badge').count();
    add('finish', end.phase === 'over' && endVis && badges === 3 && new Set(end.badges).size === 3, `${end.outcome === 'win' ? 'WIN' : 'storm'} after ${end.round} rounds; ending screen with ${badges} distinct badges (${end.badges.join(', ')}), ${end.stars} stars`);
    add('player-rolls', end.rolls === end.playerRolls && end.rolls > 10, `all ${end.rolls} dice rolls came from a tap`);
    add('no-errors', errors.length === 0, errors.length ? errors.join(' | ') : 'no script errors');
  } catch (e) { add('run', false, String(e && e.stack || e)); }
  await browser.close();
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify({ version: 1, steps }, null, 2));
  process.exit(steps.every((s) => s.passed) ? 0 : 1);
})();
