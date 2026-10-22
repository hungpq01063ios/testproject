'use strict';
// =====================================================================
//  ENGINE: màn chạy kiểu Mario – gõ đúng phím để nhân vật nhảy qua
// =====================================================================

const GRAVITY = 1700, JUMP_V = -640, STOP_GAP = 85;

class TypingRun {
  /**
   * opts: { look, relax, name, onTarget(char|null), onKey(char, ok), onDone(result) }
   */
  constructor(canvas, level, opts) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.W = canvas.width; this.H = canvas.height; this.gy = this.H - 78;
    this.level = level; this.opts = opts;
    this.theme = WORLDS[level.world].theme;
    this.speedMode = level.speed > 0 && !opts.relax;
    this.runSpeed = this.speedMode ? level.speed : 240;

    let x = 640;
    this.targets = buildTexts(level).map((text, i) => {
      const t = {
        text, idx: 0, x, cleared: false, passed: false, errs: 0, bumped: false, hinted: false,
        shake: 0, bump: 0, popped: false,
        kind: text.length === 1 && i % 3 === 1 ? 'block' : 'ground', variant: i % 2
      };
      const len = text.length;
      x += this.speedMode ? Math.max(270, this.runSpeed * (1.4 + len * 0.62)) : 250 + len * 18;
      return t;
    });
    this.goalX = x + 160;

    this.p = { x: 200, y: 0, vy: 0, air: false, hurt: 0, st: 'idle', jumpOb: null };
    this.camX = 0;
    this.hearts = this.speedMode ? 3 : 0;
    this.stats = { correct: 0, errors: 0, gems: 0, maxCombo: 0, perKey: {} };
    this.combo = 0; this.lastPraiseAt = -10;
    this.parts = []; this.floaters = [];
    this.time = 0; this.activeTime = 0; this.typingTime = 0; this.lastMark = 0;
    this.state = 'countdown'; this.countdown = 3.2; this.endT = 0;
    this.gemPulse = 0; this.paused = false;
    this.raf = null; this.prevTs = null;
    this.fontReady = true;
  }

  start() {
    const loop = ts => {
      if (this.prevTs == null) this.prevTs = ts;
      const dt = Math.min(0.05, (ts - this.prevTs) / 1000);
      this.prevTs = ts;
      if (!this.paused) this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    Voice.speak('Sẵn sàng nào!');
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = null; }
  setPaused(b) { this.paused = b; this.prevTs = null; }

  current() { return this.targets.find(t => !t.cleared) || null; }
  nextObstacle() { return this.targets.find(t => !t.passed) || null; }
  visible(t) { return t.x - this.camX < this.W - 30; }
  expected() { const t = this.current(); return t && this.visible(t) ? t.text[t.idx] : null; }

  // ---------------- Bàn phím ----------------
  handleKey(k) {
    if (this.state !== 'play' || this.paused) return;
    const t = this.current();
    if (!t || !this.visible(t)) return;
    const exp = t.text[t.idx];
    const rec = this.stats.perKey[exp] || (this.stats.perKey[exp] = { hit: 0, miss: 0, time: 0, timed: 0 });

    if (k === exp) {
      const gap = this.activeTime - this.lastMark;
      if (gap < 8) { rec.time += gap; rec.timed++; }
      this.lastMark = this.activeTime;
      rec.hit++; t.idx++;
      this.stats.correct++; this.combo++;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
      Sfx.key(this.combo);
      this.opts.onKey(k, true);
      this.sparkle(t.x, this.bubbleY(t), 5);
      if (t.idx >= t.text.length) this.clearTarget(t);
    } else {
      rec.miss++; t.errs++;
      this.stats.errors++; this.combo = 0; t.shake = 0.3;
      Sfx.oops();
      this.opts.onKey(k, false);
      if (t.errs === 2 || (t.errs > 2 && t.errs % 3 === 0)) Voice.speak(fingerHint(exp));
    }
    this.opts.onTarget(this.expected());
  }

  clearTarget(t) {
    t.cleared = true;
    const gems = 1 + Math.floor(t.text.trim().length / 4);
    this.stats.gems += gems; this.gemPulse = 1;
    Sfx.gem();
    this.floater(t.x, this.bubbleY(t) - 30, '+' + gems + ' 💎', '#7b5cff');
    if (this.combo > 0 && this.combo % 5 === 0) {
      this.floater(t.x, this.bubbleY(t) - 64, pick(PRAISE), '#ff4f9a', 30);
      if (this.activeTime - this.lastPraiseAt > 6) {
        this.lastPraiseAt = this.activeTime;
        Voice.speak(pick(VOICE_PRAISE).replace('{n}', this.opts.name || 'Bé'), { interrupt: false });
      }
    }
    this.lastMark = this.activeTime;
  }

  bubbleY(t) { return t.kind === 'block' ? this.gy - 175 : this.gy - (this.speedMode ? 105 : 95); }

  // ---------------- Cập nhật ----------------
  update(dt) {
    this.time += dt;
    const p = this.p;

    if (this.state === 'countdown') {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const after = Math.ceil(this.countdown);
      if (after !== before && after > 0 && after <= 3) Sfx.beep(false);
      if (this.countdown <= 0) {
        this.state = 'play'; Sfx.beep(true);
        this.floater(p.x + 120, this.gy - 160, 'Bắt đầu!', '#ff4f9a', 40, true);
        this.opts.onTarget(this.expected());
      }
    }

    if (this.state === 'play') {
      this.activeTime += dt;
      const cur = this.current();
      if (cur && this.visible(cur)) {
        this.typingTime += dt;
        // Bé đang lưỡng lự lâu → nhắc phím và ngón tay
        if (!this.speedMode && !cur.hinted && this.activeTime - this.lastMark > 5 && p.st === 'idle') {
          cur.hinted = true;
          Voice.speak(fingerHint(cur.text[cur.idx]));
        }
      }
      const prevExp = this._lastExp;
      const exp = this.expected();
      if (exp !== prevExp) { this._lastExp = exp; this.opts.onTarget(exp); }
    }

    // ---- Nhân vật ----
    if (this.state === 'play' || this.state === 'goal') {
      const ob = this.nextObstacle();
      if (p.air) {
        p.x += Math.max(this.runSpeed, 250) * dt;
        p.vy += GRAVITY * dt; p.y += p.vy * dt;
        const jo = p.jumpOb;
        if (jo && jo.kind === 'block' && !jo.popped && p.x >= jo.x - 14) {
          jo.popped = true; jo.bump = 12;
          this.sparkle(jo.x, this.gy - 175, 12, true);
        }
        if (p.y >= 0) { p.y = 0; p.vy = 0; p.air = false; p.st = 'run'; }
      } else if (p.hurt > 0) {
        p.hurt -= dt; p.st = 'hurt';
        if (p.hurt <= 0) p.st = 'idle';
      } else if (ob) {
        const stopX = ob.x - STOP_GAP;
        if (p.x < stopX) {
          p.x = Math.min(stopX, p.x + this.runSpeed * dt); p.st = 'run';
        } else if (ob.cleared) {
          this.jump(ob);
        } else {
          p.st = 'idle';
          if (this.speedMode && !ob.bumped) this.bumpInto(ob);
        }
      } else if (this.state === 'play') {
        this.state = 'goal';
      }
      if (this.state === 'goal' && !p.air) {
        if (p.x < this.goalX - 40) { p.x += 230 * dt; p.st = 'run'; }
        else this.win();
      }
    } else if (this.state === 'win') {
      this.endT += dt;
      p.st = 'win';
      if (!p.air && this.endT < 2.2) { p.air = true; p.vy = -420; }
      if (p.air) { p.vy += GRAVITY * dt; p.y += p.vy * dt; if (p.y >= 0) { p.y = 0; p.air = false; } }
      if (Math.random() < 0.25) this.firework();
      if (this.endT > 2.6) this.finish(false);
    } else if (this.state === 'fail') {
      this.endT += dt; p.st = 'hurt';
      if (this.endT > 1.8) this.finish(true);
    }

    // camera
    const target = this.p.x - 230;
    this.camX += (target - this.camX) * Math.min(1, dt * 5);

    for (const t of this.targets) {
      if (t.shake > 0) t.shake -= dt;
      if (t.bump > 0) t.bump = Math.max(0, t.bump - dt * 60);
    }
    this.gemPulse = Math.max(0, this.gemPulse - dt * 3);
    for (const q of this.parts) { q.vy += (q.g || 300) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    this.parts = this.parts.filter(q => q.life > 0);
    for (const f of this.floaters) { f.y -= 40 * dt; f.life -= dt; }
    this.floaters = this.floaters.filter(f => f.life > 0);
  }

  jump(ob) {
    const p = this.p;
    p.air = true; p.vy = JUMP_V; p.st = 'jump'; p.jumpOb = ob;
    ob.passed = true;
    Sfx.jump();
  }

  bumpInto(ob) {
    ob.bumped = true;
    this.hearts--; this.combo = 0;
    this.p.hurt = 0.7;
    Sfx.bump();
    this.floater(this.p.x, this.gy - 110, 'Ối!', '#ff6b8b', 30);
    if (this.hearts <= 0) {
      this.state = 'fail'; this.endT = 0;
      Sfx.sad();
      this.opts.onTarget(null);
    } else {
      Voice.speak(this.hearts === 1 ? 'Còn một trái tim, cẩn thận nhé!' : 'Không sao, cố lên!');
    }
  }

  win() {
    this.state = 'win'; this.endT = 0;
    Sfx.win();
    this.opts.onTarget(null);
  }

  finish(failed) {
    if (this.state === 'done') return;
    this.state = 'done';
    const s = this.stats;
    const total = s.correct + s.errors;
    const minutes = Math.max(this.typingTime, 1) / 60;
    this.stop();
    this.opts.onDone({
      failed,
      correct: s.correct, errors: s.errors,
      acc: total ? s.correct / total : 0,
      wpm: (s.correct / 5) / minutes,
      gems: s.gems, maxCombo: s.maxCombo, perKey: s.perKey,
      seconds: this.activeTime
    });
  }

  // ---------------- Hiệu ứng ----------------
  sparkle(x, y, n, big) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * PI2, v = (big ? 160 : 90) + Math.random() * 80;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.7 + Math.random() * 0.4,
        color: pick(RAINBOW), shape: pick(['star', 'heart', 'dot']), size: big ? 7 : 5 });
    }
  }
  firework() {
    const x = this.camX + 100 + Math.random() * (this.W - 200), y = 40 + Math.random() * 120;
    const c = pick(RAINBOW);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * PI2;
      this.parts.push({ x, y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, g: 120, life: 0.9, color: c, shape: i % 3 ? 'dot' : 'star', size: 5 });
    }
  }
  floater(x, y, text, color, size = 26, screen = false) {
    this.floaters.push({ x, y, text, color, size, life: 1.2, screen });
  }

  // ---------------- Vẽ ----------------
  draw() {
    const { ctx, W, H, gy, theme } = this;
    const cam = Math.round(this.camX);
    Draw.scene(ctx, W, H, gy, theme, cam, this.time);

    ctx.save(); ctx.translate(-cam, 0);
    if (this.goalX - cam < W + 150) Draw.castle(ctx, this.goalX + 60, gy, this.time, theme.accent);

    const cur = this.current();
    const fs = this.level.type === 'letters' ? 38 : 30;
    for (const t of this.targets) {
      if (t.x - cam < -120 || t.x - cam > W + 160) continue;
      if (t.kind === 'block') {
        Draw.block(ctx, t.x, gy - 175, t.bump, t.popped);
        if (!t.cleared) Draw.bubble(ctx, t.x, gy - 175, t.text, t.idx, t === cur, t.shake, this.time, theme.accent, fs);
      } else {
        Draw.obstacle(ctx, theme.obstacle, t.x, gy, t.variant);
        if (!t.cleared) Draw.bubble(ctx, t.x, this.bubbleY(t), t.text, t.idx, t === cur, t.shake, this.time, theme.accent, fs);
        else if (!t.passed) { Draw.star(ctx, t.x, this.bubbleY(t) + Math.sin(this.time * 6) * 4, 12, '#ffd84d'); }
      }
    }

    const p = this.p;
    const look = this.opts.look;
    Draw.pet(ctx, look.pet, p.x - 46, gy + Math.min(0, p.y * 0.6), this.time, 1, p.st === 'run' || p.st === 'jump');
    Draw.girl(ctx, p.x, gy + p.y, look, p.st, this.time, 1.15);

    for (const q of this.parts) {
      ctx.globalAlpha = Math.min(1, q.life * 2);
      if (q.shape === 'star') Draw.star(ctx, q.x, q.y, q.size, q.color);
      else if (q.shape === 'heart') Draw.heart(ctx, q.x, q.y, q.size, q.color);
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size * 0.6, 0, PI2); ctx.fillStyle = q.color; ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.font = `800 ${f.size}px "Baloo 2", sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    ctx.restore();

    this.drawHud();
  }

  drawHud() {
    const { ctx, W } = this;
    ctx.save();
    // kim cương
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; Draw.rr(ctx, 14, 12, 120, 40, 20); ctx.fill();
    const sc = 1 + this.gemPulse * 0.3;
    ctx.font = `700 ${Math.round(22 * sc)}px "Baloo 2", sans-serif`; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7b5cff'; ctx.fillText('💎 ' + this.stats.gems, 28, 33);

    // trái tim (chỉ ở màn thử thách)
    if (this.speedMode) {
      for (let i = 0; i < 3; i++) Draw.heart(ctx, 160 + i * 34, 34, 13, i < this.hearts ? '#ff4f7f' : 'rgba(255,255,255,0.8)');
    }

    // thanh tiến độ
    const done = this.targets.filter(t => t.cleared).length;
    const bx = W / 2 - 160, bw = 320;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; Draw.rr(ctx, bx, 20, bw, 18, 9); ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    RAINBOW.forEach((c, i) => g.addColorStop(i / 5, c));
    ctx.fillStyle = g; Draw.rr(ctx, bx + 3, 23, Math.max(12, (bw - 6) * done / this.targets.length), 12, 6); ctx.fill();
    ctx.font = '22px sans-serif'; ctx.fillText('🏰', bx + bw + 6, 30);

    // combo
    if (this.combo >= 3) {
      ctx.textAlign = 'right';
      ctx.font = '800 24px "Baloo 2", sans-serif';
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff';
      const txt = 'Combo x' + this.combo + ' ✨';
      ctx.strokeText(txt, W - 20, 34); ctx.fillStyle = '#ff4f9a'; ctx.fillText(txt, W - 20, 34);
    }

    // đếm ngược
    if (this.state === 'countdown') {
      const n = Math.ceil(this.countdown);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(80,40,120,0.25)'; ctx.fillRect(0, 0, W, this.H);
      ctx.font = '800 110px "Baloo 2", sans-serif';
      ctx.lineWidth = 10; ctx.strokeStyle = '#fff';
      const s = n > 3 ? 3 : n;
      ctx.strokeText(s, W / 2, this.H / 2 - 20); ctx.fillStyle = '#ff4f9a'; ctx.fillText(s, W / 2, this.H / 2 - 20);
      ctx.font = '700 26px "Baloo 2", sans-serif';
      ctx.fillStyle = '#fff'; ctx.fillText('Đặt ngón tay lên hàng phím nhà: A S D F – J K L ;', W / 2, this.H / 2 + 60);
    }
    if (this.state === 'win') {
      ctx.textAlign = 'center';
      ctx.font = '800 54px "Baloo 2", sans-serif'; ctx.lineWidth = 8; ctx.strokeStyle = '#fff';
      ctx.strokeText('Hoàn thành! 🎉', W / 2, 110); ctx.fillStyle = '#ff4f9a'; ctx.fillText('Hoàn thành! 🎉', W / 2, 110);
    }
    ctx.restore();
  }
}
