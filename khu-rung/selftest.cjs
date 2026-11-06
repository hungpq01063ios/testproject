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
    for (const k of ['catch', 'sprout', 'sort', 'count', 'clouds', 'find', 'runner', 'race', 'river', 'flappy', 'maze']) minis[k] = await page.evaluate((k) => window.__forestMiniBot(k), k);
    const mean = Object.values(minis).reduce((a, b) => a + b, 0) / Object.keys(minis).length;
    add('mini-games', Object.values(minis).every((s) => s >= 1) && mean >= 2.3, `every game won by the bot, average ${mean.toFixed(2)}★: ${Object.entries(minis).map(([k, s]) => `${k} ${s}★`).join(', ')}`);

    const clear = await page.evaluate(() => window.__bridgeClear());
    add('bridges-clear', clear > 1.0, `nearest bridge plank is ${clear.toFixed(2)} from any tile centre (tile radius 0.95)`);
    await page.evaluate(() => { window.__rescueStars = 0; });
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
    let actions = 0, failSeen = null; const stormSeen = [], kinds = new Set(), forks = new Set();
    while (actions < 3000) {
      const st = await S(); if (st.phase === 'over') break; actions++;
      if (shot && actions === 40) await page.screenshot({ path: shot });
      if (st.phase === 'choice') { const c = st.choice; kinds.add(c.kind); let k = 0;
        if (c.kind === 'fork') { const sc = c.options.map((o) => { const z = st.zones[o.zone]; return (z.restored ? -9 : 0) + (st.need - z.trees) + (z.rescued ? 0 : 1.5); }); k = sc.indexOf(Math.max(...sc)); forks.add(c.options[k].icon); }
        if (c.kind === 'hop') k = 1;
        await page.click(`[data-choice="${k}"]`); }
      else if (st.phase === 'roll') await page.click('#rollBtn');
      else if (st.phase === 'done') { if (!failSeen && st.log.some((e) => /chưa giúp được/.test(e.text))) { failSeen = { zones: st.zones.map((z) => z.rescued) }; await page.evaluate(() => { window.__rescueStars = null; }); } const r0 = st.round; await page.click('#nextBtn'); const s2 = await S(); if (s2.round > r0) stormSeen.push(s2.storm); }
      await idle();
    }
    const end = await S(), view = await page.evaluate(() => window.__forest.view());
    add('zones', end.zones.filter((z) => z.restored).length >= 3, `zones restored ${end.zones.filter((z) => z.restored).length}/5 (${end.zones.map((z) => `${z.trees}🌳${z.rescued ? '+bạn' : ''}`).join(' · ')}); mini-games played ${end.minisPlayed}; decisions met: ${[...kinds].join(', ')}; routes ${[...forks].join(', ')}`);
    add('rescue-can-fail', failSeen && end.zones.some((z, k) => !failSeen.zones[k] && z.rescued), `a failed challenge left the friend lost (${failSeen ? failSeen.zones.map((r) => (r ? 'đã cứu' : 'còn lạc')).join(', ') : 'no failure seen'}); later visits rescued them`);
    add('storm-clock', stormSeen.length > 3, `storm after each round: ${stormSeen.join(' → ')}`);
    add('cinematics', ['rescue', 'restore', 'ending'].every((k) => view.cuts.includes(k)), `played: ${view.cuts.join(', ')}`);
    const endVis = await page.isVisible('#endOverlay'), badges = await page.locator('.badge').count();
    add('finish', end.phase === 'over' && endVis && badges === 3 && new Set(end.badges).size === 3, `${end.outcome === 'win' ? 'WIN' : 'storm'} after ${end.round} rounds; ending screen with ${badges} distinct badges (${end.badges.join(', ')}), ${end.stars} stars`);
    add('player-rolls', end.rolls === end.playerRolls && end.rolls > 10, `all ${end.rolls} dice rolls came from a tap`);
    add('no-errors', errors.length === 0, errors.length ? errors.join(' | ') : 'no script errors');
    // one message at a time: three banners fired together must queue up
    const p2 = await browser.newPage({ viewport: { width: 1200, height: 800 } }); await p2.route(/fonts\./, (r) => r.abort());
    await p2.goto(pathToFileURL(path.join(__dirname, 'index.html')).href + '?seed=3&q=low'); await p2.waitForFunction(() => window.__banner, null, { timeout: 120000 });
    await p2.evaluate(() => { window.__banner('Một'); window.__banner('Hai'); window.__banner('Ba'); });
    let maxShown = 0; for (let i = 0; i < 14; i++) { await p2.waitForTimeout(400); maxShown = Math.max(maxShown, (await p2.evaluate(() => window.__bannerQueue())).shown); }
    const left = await p2.evaluate(() => window.__bannerQueue()); await p2.close();
    add('one-message-at-a-time', maxShown === 1 && left.waiting === 0, `3 banners fired at once: at most ${maxShown} on screen at any moment, ${left.waiting} still waiting after 5.6 s`);
    // voice: two browsers' ways of loading voices; the opening story must be read in full and in order in both
    const story = ['Ngày xửa ngày xưa', 'Nhưng rồi cơn bão', 'Cây Mẹ nhờ các bạn', 'Cùng nhau, mình làm được'];
    async function listen(mode) {
      const pg = await browser.newPage({ viewport: { width: 1200, height: 800 } }); await pg.route(/fonts\./, (r) => r.abort());
      await pg.addInitScript((mode) => {
        const said = [], cut = []; window.__said = said; window.__cut = cut; window.__tones = 0;
        const EN = [{ lang: 'en-US', name: 'Microsoft David - English' }, { lang: 'en-US', name: 'Microsoft Brian Online (Natural)' }], VI = { lang: 'vi-VN', name: 'Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)' };
        let voices = mode === 'edge' ? EN.slice() : [], lastCancel = -1e9;
        const synth = { getVoices: () => voices, speaking: false, onvoiceschanged: null,
          speak(u) { if (mode === 'edge' && performance.now() - lastCancel < 100) return; // Chromium drops it
            if (mode === 'offline' && /Online/.test(u.voice && u.voice.name)) { window.__errs = (window.__errs || 0) + 1; setTimeout(() => u.onerror && u.onerror({ error: 'network' }), 60); return; } // online voice, no connection
            said.push((!u.voice || !/^vi/.test(u.voice.lang) ? '[wrong voice] ' : '') + u.text);
            synth.speaking = true; synth.cur = u; setTimeout(() => { if (synth.cur !== u) return; synth.speaking = false; u.onend && u.onend(); }, 300 + u.text.length * 15); },
          cancel() { if (synth.speaking && synth.cur) cut.push(synth.cur.text); synth.speaking = false; synth.cur = null; lastCancel = performance.now(); } };
        if (mode === 'edge') synth.resume = () => {};
        Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
        window.SpeechSynthesisUtterance = function (t) { this.text = t; };
        if (mode === 'offline') voices = [Object.assign({ localService: false }, VI), { lang: 'vi-VN', name: 'Microsoft An - Vietnamese (Vietnam)', localService: true }];
        else if (mode === 'edge') { setTimeout(() => synth.onvoiceschanged && synth.onvoiceschanged(), 300); setTimeout(() => voices.push(VI), 1500); } // Vietnamese arrives without an event
        else setTimeout(() => { voices = [VI]; synth.onvoiceschanged && synth.onvoiceschanged(); }, 1200);
        const AC = window.AudioContext; window.AudioContext = function () { const c = new AC(); const o = c.createOscillator.bind(c); c.createOscillator = () => { window.__tones++; return o(); }; return c; };
      }, mode);
      await pg.goto(pathToFileURL(path.join(__dirname, 'index.html')).href + '?seed=3&q=low'); await pg.waitForFunction(() => window.__forest, null, { timeout: 120000 });
      await pg.click('.acard[data-animal="bear"]'); await pg.click('#startBtn');
      await pg.waitForFunction(() => window.__forest.view().cuts.includes('intro') && !window.__forest.busy, null, { timeout: 180000 });
      await pg.waitForTimeout(2500);
      const h = await pg.evaluate(() => ({ said: window.__said, cut: window.__cut, tones: window.__tones, errs: window.__errs || 0, v: window.__voice() }));
      if (mode === 'offline') { await pg.click('#checkBtn'); await pg.waitForTimeout(300); h.panel = await pg.evaluate(() => ({ open: !document.getElementById('soundCheck').hidden, voices: document.querySelectorAll('#scVoices input').length, text: document.getElementById('scList').textContent })); }
      await pg.close(); return h;
    }
    for (const mode of ['edge', 'chrome', 'offline']) {
      const h = await listen(mode), order = story.map((k) => h.said.findIndex((x) => x.startsWith(k)));
      const ok = order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])) && !h.cut.some((x) => story.some((k) => x.startsWith(k))) && !h.said.some((x) => x.startsWith('[wrong')) && h.said.some((x) => x.startsWith('Đến lượt')) && h.tones >= 8;
      if (mode === 'offline') { const okp = ok && h.errs >= 1 && h.v.voice === 'Microsoft An - Vietnamese (Vietnam)' && h.panel && h.panel.open && h.panel.voices === 2;
        add('voice-fallback', okp, `online Vietnamese voice fails with "network" (${h.errs}×) → switched to local "${h.v.voice}"; heard ${h.said.length} lines, story in order: ${ok}; sound-check panel open=${h.panel && h.panel.open}, lists ${h.panel && h.panel.voices} voices: "${h.panel && h.panel.text.slice(0, 140)}…"`); continue; }
      add(`voice-${mode}`, ok, `${mode === 'edge' ? 'English voices first, Vietnamese added 1.5 s later without an event, speak() right after cancel() dropped' : 'voice list empty for 1.2 s, no resume()'}: heard ${h.said.length} lines (${h.said.slice(0, 5).map((x) => '"' + x.slice(0, 22) + '…"').join(', ')}); story lines cut: ${h.cut.filter((x) => story.some((k) => x.startsWith(k))).length}; tune notes ${h.tones}`);
    }
  } catch (e) { add('run', false, String(e && e.stack || e)); }
  await browser.close();
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify({ version: 1, steps }, null, 2));
  process.exit(steps.every((s) => s.passed) ? 0 : 1);
})();
