import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BONUS_TTL, DEATH_DELAY, DIFFICULTIES, DIFF_ORDER, GRID,
  addFloat, addRipple, burst, createGame, faNum, stepGame, updateFX,
  type Difficulty, type DifficultyId, type Game, type Phase, type Vec,
} from '../game/engine';
import { sfx } from '../game/audio';

/* ================= drawing ================= */

const HEAD_RGB: [number, number, number] = [217, 249, 157];
const TAIL_RGB: [number, number, number] = [4, 120, 87];

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function draw(ctx: CanvasRenderingContext2D, g: Game, css: number, now: number) {
  const cell = css / GRID;

  ctx.clearRect(0, 0, css, css);
  ctx.fillStyle = '#08170f';
  ctx.fillRect(0, 0, css, css);

  ctx.fillStyle = 'rgba(190,242,100,0.022)';
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      if ((x + y) % 2 === 0) ctx.fillRect(x * cell, y * cell, cell, cell);

  ctx.save();
  if (g.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  }

  /* ripples */
  for (const r of g.ripples) {
    const t = r.life / r.ttl;
    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = Math.max(1.5, cell * 0.08 * (1 - t));
    ctx.beginPath();
    ctx.arc((r.x + 0.5) * cell, (r.y + 0.5) * cell, (0.3 + t * r.max) * cell, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  /* food (firefly) */
  {
    const pulse = 1 + Math.sin(now / 170) * 0.13;
    const cx = (g.food.x + 0.5) * cell;
    const cy = (g.food.y + 0.5) * cell;
    ctx.shadowColor = '#fb7185';
    ctx.shadowBlur = cell * 0.9;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.3 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,228,230,0.95)';
    ctx.beginPath();
    ctx.arc(cx - cell * 0.09, cy - cell * 0.1, cell * 0.11 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  /* bonus firefly */
  if (g.bonus) {
    const frac = Math.max(0, Math.min(1, (g.bonus.until - now) / BONUS_TTL));
    const blink = frac < 0.25 && Math.floor(now / 130) % 2 === 0 ? 0.35 : 1;
    const cx = (g.bonus.pos.x + 0.5) * cell;
    const cy = (g.bonus.pos.y + 0.5) * cell;
    ctx.globalAlpha = blink;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = cell * 1.1;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(254,243,199,0.95)';
    ctx.beginPath();
    ctx.arc(cx - cell * 0.1, cy - cell * 0.11, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = Math.max(2, cell * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.48, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* snake */
  const n = g.snake.length;
  const pad = cell * 0.09;
  const dying = g.phase === 'dying';
  const flashOn = dying && Math.floor(now / 95) % 2 === 0;
  for (let i = n - 1; i >= 0; i--) {
    const s = g.snake[i];
    const t = n === 1 ? 0 : i / (n - 1);
    const isHead = i === 0;
    const p = isHead ? pad * 0.45 : pad;
    ctx.fillStyle = flashOn ? '#fb7185' : mix(HEAD_RGB, TAIL_RGB, t);
    if (isHead) {
      ctx.shadowColor = '#bef264';
      ctx.shadowBlur = cell * 0.7;
    }
    rr(ctx, s.x * cell + p, s.y * cell + p, cell - p * 2, cell - p * 2, cell * 0.3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /* eyes */
  if (!flashOn) {
    const h = g.snake[0];
    const cx = (h.x + 0.5) * cell;
    const cy = (h.y + 0.5) * cell;
    const px = g.dir.y;
    const py = -g.dir.x;
    for (const side of [1, -1]) {
      const ex = cx + g.dir.x * cell * 0.16 + px * side * cell * 0.17;
      const ey = cy + g.dir.y * cell * 0.16 + py * side * cell * 0.17;
      ctx.fillStyle = '#f7fee7';
      ctx.beginPath();
      ctx.arc(ex, ey, cell * 0.095, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a2e05';
      ctx.beginPath();
      ctx.arc(ex + g.dir.x * cell * 0.035, ey + g.dir.y * cell * 0.035, cell * 0.048, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* particles */
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc((p.x + 0.5) * cell, (p.y + 0.5) * cell, p.size * cell, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* floating texts */
  for (const f of g.floats) {
    const a = Math.max(0, 1 - f.life / f.ttl);
    ctx.globalAlpha = a;
    ctx.font = `900 ${Math.round(cell * 0.62)}px Vazirmatn, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, (f.x + 0.5) * cell, (f.y + 0.5) * cell);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  /* vignette */
  const vg = ctx.createRadialGradient(css / 2, css / 2, css * 0.32, css / 2, css / 2, css * 0.72);
  vg.addColorStop(0, 'rgba(4,12,9,0)');
  vg.addColorStop(1, 'rgba(3,10,7,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, css, css);
}

/* ================= icons ================= */

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
    <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.2-6.5a1 1 0 0 0 0-1.7L9.52 4.64A1 1 0 0 0 8 5.5Z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
    <rect x="6" y="4.5" width="4" height="15" rx="1.4" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.4" />
  </svg>
);
const RestartIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 3v5h-5" strokeLinejoin="round" />
  </svg>
);
const Chevron = ({ rotate }: { rotate: number }) => (
  <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
    <path d="m6 14 6-6 6 6" />
  </svg>
);

/* ================= component ================= */

interface Props {
  diff: Difficulty;
  best: number;
  onDiffChange: (id: DifficultyId) => void;
  onGameOver: (score: number) => void;
  onToggleMute: () => void;
}

const DIRS: Record<string, Vec> = {
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
};

export default function SnakeGame({ diff, best, onDiffChange, onGameOver, onToggleMute }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = createGame(diff);

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [hud, setHud] = useState({ len: 3, foods: 0, speed: 1 });
  const [newRecord, setNewRecord] = useState(false);

  const phaseRef = useRef<Phase>('idle');
  const diffRef = useRef(diff);
  const bestRef = useRef(best);
  const bestAtStartRef = useRef(best);
  const onGameOverRef = useRef(onGameOver);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  diffRef.current = diff;
  bestRef.current = best;
  onGameOverRef.current = onGameOver;

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const syncHud = useCallback((g: Game) => {
    setScore(g.score);
    setHud({ len: g.snake.length, foods: g.foods, speed: g.baseTick / g.tickMs });
  }, []);

  const reset = useCallback((toIdle: boolean) => {
    const g = createGame(diffRef.current);
    g.phase = toIdle ? 'idle' : 'running';
    gameRef.current = g;
    setPhaseBoth(g.phase);
    setNewRecord(false);
    syncHud(g);
    return g;
  }, [setPhaseBoth, syncHud]);

  const startGame = useCallback(() => {
    sfx.unlock();
    bestAtStartRef.current = bestRef.current;
    reset(false);
    sfx.start();
  }, [reset]);

  const restart = useCallback(() => {
    sfx.unlock();
    bestAtStartRef.current = bestRef.current;
    reset(false);
    sfx.start();
  }, [reset]);

  const pauseToggle = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'running') {
      setPhaseBoth('paused');
      sfx.pause();
    } else if (p === 'paused') {
      setPhaseBoth('running');
      sfx.ui();
    }
  }, [setPhaseBoth]);

  const queueDir = useCallback((d: Vec) => {
    const p = phaseRef.current;
    if (p === 'idle' || p === 'over') startGame();
    if (phaseRef.current !== 'running') return;
    const g = gameRef.current!;
    const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
    if (d.x === -last.x && d.y === -last.y) return;
    if (d.x === last.x && d.y === last.y) return;
    if (g.queue.length < 3) g.queue.push(d);
  }, [startGame]);

  /* difficulty change → fresh board */
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    reset(true);
  }, [diff, reset]);

  /* main loop */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const canvas = canvasRef.current;
      const g = gameRef.current;
      if (canvas && g) {
        const dt = Math.min(50, now - last) / 1000;

        if (g.phase === 'running') {
          g.acc += Math.min(50, now - last);
          while (g.acc >= g.tickMs && g.phase === 'running') {
            g.acc -= g.tickMs;
            const ev = stepGame(g, now);
            if (ev.ate) {
              sfx.eat();
              const fx = g.snake[0].x;
              const fy = g.snake[0].y;
              burst(g, fx, fy, ['#fda4af', '#f43f5e', '#bef264'], 14);
              addRipple(g, fx, fy, '#fb7185');
              addFloat(g, fx, fy, '+۱۰', '#fde68a');
              syncHud(g);
            }
            if (ev.bonusAte) {
              sfx.bonus();
              const fx = g.snake[0].x;
              const fy = g.snake[0].y;
              burst(g, fx, fy, ['#fde68a', '#fbbf24', '#fff7ed'], 22, 4.2);
              addRipple(g, fx, fy, '#fbbf24', 2.4);
              addFloat(g, fx, fy, '+۳۰', '#fbbf24');
              syncHud(g);
            }
            if (ev.died) {
              sfx.die();
              setPhaseBoth('dying');
              const h = g.snake[0];
              burst(g, h.x, h.y, ['#fb7185', '#f43f5e', '#d9f99d'], 26, 4.5);
              addRipple(g, h.x, h.y, '#f43f5e', 2.6);
            }
          }
          if (g.bonus && now > g.bonus.until) {
            addRipple(g, g.bonus.pos.x, g.bonus.pos.y, 'rgba(251,191,36,0.7)', 1.2);
            g.bonus = null;
          }
        }

        if (g.phase === 'dying' && !g.overFired && now - g.diedAt > DEATH_DELAY) {
          g.overFired = true;
          setPhaseBoth('over');
          const isRecord = g.score > bestAtStartRef.current && g.score > 0;
          setNewRecord(isRecord);
          onGameOverRef.current(g.score);
          if (isRecord) window.setTimeout(() => sfx.record(), 250);
        }

        if (g.phase !== 'paused') updateFX(g, dt);

        /* size buffer */
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cssSize = canvas.clientWidth;
        if (cssSize > 0) {
          const want = Math.round(cssSize * dpr);
          if (canvas.width !== want) {
            canvas.width = want;
            canvas.height = want;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            draw(ctx, g, cssSize, now);
          }
        }
      }
      last = now;
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [setPhaseBoth, syncHud]);

  /* keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = DIRS[e.code];
      if (d) {
        e.preventDefault();
        sfx.unlock();
        queueDir(d);
        return;
      }
      if (e.code === 'Space' || e.code === 'KeyP') {
        e.preventDefault();
        const p = phaseRef.current;
        if (p === 'idle' || p === 'over') startGame();
        else pauseToggle();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        const p = phaseRef.current;
        if (p === 'idle' || p === 'over') startGame();
        else restart();
      } else if (e.code === 'KeyR') {
        if (phaseRef.current !== 'idle') restart();
      } else if (e.code === 'KeyM') {
        onToggleMute();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queueDir, startGame, restart, pauseToggle, onToggleMute]);

  /* auto-pause when tab hidden */
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && phaseRef.current === 'running') setPhaseBoth('paused');
    };
    const onBlur = () => {
      if (phaseRef.current === 'running') setPhaseBoth('paused');
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onBlur);
    };
  }, [setPhaseBoth]);

  /* touch: swipe + tap */
  const onTouchStart = (e: React.TouchEvent) => {
    sfx.unlock();
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchRef.current;
    touchRef.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) {
      const onButton = (e.target as HTMLElement).closest('button');
      if (!onButton && (phaseRef.current === 'idle' || phaseRef.current === 'over')) startGame();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) queueDir({ x: dx > 0 ? 1 : -1, y: 0 });
    else queueDir({ x: 0, y: dy > 0 ? 1 : -1 });
  };

  const speedLabel = `${hud.speed.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}×`;
  const bestShown = Math.max(best, score);
  const running = phase === 'running';

  const chip = (label: string, value: string, popKey?: string | number, accent?: string) => (
    <div className="flex flex-col items-center rounded-lg border border-moss-300/10 bg-pine-800/70 px-3 py-1.5 min-w-[4.2rem]">
      <span className="text-[10px] font-medium text-mist-500">{label}</span>
      <span key={popKey} className={`font-display text-lg leading-6 ${accent ?? 'text-mist-100'} ${popKey !== undefined ? 'score-pop' : ''}`}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* HUD strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {chip('امتیاز', faNum(score), score, 'text-moss-300')}
          {chip('رکورد', faNum(bestShown), bestShown, 'text-firefly-400')}
          {chip('طول', faNum(hud.len))}
          <div className="hidden sm:flex flex-col items-center rounded-lg border border-moss-300/10 bg-pine-800/70 px-3 py-1.5 min-w-[4.2rem]">
            <span className="text-[10px] font-medium text-mist-500">سرعت</span>
            <span className="font-display text-lg leading-6 text-fern-400">{speedLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={pauseToggle}
            disabled={!running && phase !== 'paused'}
            aria-label={running ? 'مکث' : 'ادامه'}
            className="grid h-10 w-10 place-items-center rounded-lg border border-moss-300/15 bg-pine-800 text-moss-200 transition hover:border-moss-300/40 hover:bg-pine-700 active:scale-90 disabled:opacity-35 disabled:pointer-events-none"
          >
            {running ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            onClick={restart}
            aria-label="شروع دوباره"
            className="grid h-10 w-10 place-items-center rounded-lg border border-moss-300/15 bg-pine-800 text-moss-200 transition hover:border-moss-300/40 hover:bg-pine-700 active:scale-90"
          >
            <RestartIcon />
          </button>
        </div>
      </div>

      {/* board */}
      <div
        className="board-glow relative mx-auto w-full touch-none select-none overflow-hidden rounded-xl border border-moss-300/15 bg-pine-900"
        style={{ maxWidth: 'min(100%, 64vh, 540px)', aspectRatio: '1 / 1' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* IDLE overlay */}
        {phase === 'idle' && (
          <div className="overlay-in absolute inset-0 grid place-items-center bg-pine-950/80 p-4 backdrop-blur-[3px]">
            <div className="rise-in flex w-full max-w-sm flex-col items-center gap-4 text-center">
              <div className="bob relative grid h-16 w-16 place-items-center">
                <span className="absolute inline-block h-16 w-16 rounded-full bg-firefly-400/20 blur-xl" />
                <svg viewBox="0 0 64 64" className="relative h-14 w-14" aria-hidden>
                  <circle cx="32" cy="32" r="13" fill="#f59e0b" />
                  <circle cx="27" cy="27" r="4.5" fill="#fef3c7" />
                  <circle cx="32" cy="32" r="27" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 9" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="font-display text-4xl leading-tight text-moss-200 sm:text-5xl">مارِ شب‌تاب</h2>
                <p className="mt-1 text-sm text-mist-400">شب‌تاب‌ها را بخور، بزرگ شو، به دیوار و دُم خودت نخور!</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-moss-300/15 bg-pine-900/80 p-1.5">
                {DIFF_ORDER.map((id) => (
                  <button
                    key={id}
                    onClick={() => { sfx.ui(); onDiffChange(id); }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                      diff.id === id
                        ? 'bg-moss-300 text-pine-950 shadow-[0_0_18px_rgba(190,242,100,0.45)]'
                        : 'text-mist-400 hover:text-mist-100'
                    }`}
                  >
                    {DIFFICULTIES[id].label}
                  </button>
                ))}
              </div>
              <button
                onClick={startGame}
                className="font-display group relative rounded-xl bg-firefly-400 px-10 py-2.5 text-2xl text-pine-950 shadow-[0_6px_0_#b45309,0_0_40px_rgba(251,191,36,0.35)] transition hover:brightness-110 hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#b45309]"
              >
                شروع بازی
                <span className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-berry-500 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  <PlayIcon />
                </span>
              </button>
              <p className="text-xs text-mist-500">
                یا کلید <span className="kbd">Enter</span> را بزن — روی صفحه هم می‌توانی بکشی
              </p>
            </div>
          </div>
        )}

        {/* PAUSED overlay */}
        {phase === 'paused' && (
          <div className="overlay-in absolute inset-0 grid place-items-center bg-pine-950/80 p-4 backdrop-blur-[3px]">
            <div className="rise-in flex flex-col items-center gap-4 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-xl border border-moss-300/25 bg-pine-800 text-moss-300">
                <PauseIcon />
              </div>
              <h2 className="font-display text-4xl text-mist-100">مکث</h2>
              <p className="text-sm text-mist-400">مار منتظر توست…</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={pauseToggle}
                  className="font-display flex items-center gap-2 rounded-xl bg-moss-300 px-7 py-2 text-xl text-pine-950 shadow-[0_5px_0_#4d7c0f] transition hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#4d7c0f]"
                >
                  <PlayIcon /> ادامه
                </button>
                <button
                  onClick={restart}
                  className="font-display flex items-center gap-2 rounded-xl border border-moss-300/25 bg-pine-800 px-6 py-2 text-xl text-mist-100 transition hover:bg-pine-700 active:scale-95"
                >
                  <RestartIcon /> از اول
                </button>
              </div>
              <p className="text-xs text-mist-500">
                <span className="kbd">Space</span> برای ادامه
              </p>
            </div>
          </div>
        )}

        {/* GAME OVER overlay */}
        {phase === 'over' && (
          <div className="overlay-in absolute inset-0 grid place-items-center bg-pine-950/85 p-4 backdrop-blur-[3px]">
            <div className="rise-in flex w-full max-w-sm flex-col items-center gap-3.5 text-center">
              <h2 className="font-display text-4xl text-berry-400 sm:text-5xl">بازی تمام شد!</h2>
              {newRecord && (
                <span className="record-flash flex items-center gap-1.5 rounded-full bg-firefly-400 px-4 py-1 text-sm font-black text-pine-950">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                    <path d="M12 2l2.4 6.9L21 11l-6.6 2.1L12 20l-2.4-6.9L3 11l6.6-2.1L12 2z" />
                  </svg>
                  رکورد جدید!
                </span>
              )}
              <div>
                <div className="text-xs font-medium text-mist-500">امتیاز شما</div>
                <div className="font-display text-6xl leading-tight text-moss-300">{faNum(score)}</div>
              </div>
              <div className="flex items-center gap-5 text-sm text-mist-400">
                <span>بهترین: <b className="text-firefly-400">{faNum(bestShown)}</b></span>
                <span>شکار: <b className="text-mist-100">{faNum(hud.foods)}</b></span>
                <span>طول: <b className="text-mist-100">{faNum(hud.len)}</b></span>
              </div>
              <button
                onClick={restart}
                className="font-display mt-1 flex items-center gap-2 rounded-xl bg-firefly-400 px-9 py-2.5 text-2xl text-pine-950 shadow-[0_6px_0_#b45309,0_0_40px_rgba(251,191,36,0.3)] transition hover:brightness-110 hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#b45309]"
              >
                <RestartIcon /> دوباره بازی
              </button>
              <p className="text-xs text-mist-500">
                <span className="kbd">Enter</span> یا <span className="kbd">R</span> برای شروع فوری
              </p>
            </div>
          </div>
        )}
      </div>

      {/* legend + hints */}
      <div className="mx-auto flex w-full max-w-[540px] flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-mist-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-berry-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            شب‌تاب <b className="text-mist-100">۱۰+</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-firefly-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            شب‌تاب طلایی <b className="text-mist-100">۳۰+</b> (فقط چند ثانیه!)
          </span>
        </div>

        {/* desktop keys */}
        <div className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-mist-500 lg:flex">
          <span className="flex items-center gap-1">
            <span className="kbd">↑</span><span className="kbd">↓</span><span className="kbd">←</span><span className="kbd">→</span>
            <span className="ms-1">یا</span> <span className="kbd">WASD</span> حرکت
          </span>
          <span className="flex items-center gap-1"><span className="kbd">Space</span> مکث</span>
          <span className="flex items-center gap-1"><span className="kbd">R</span> شروع دوباره</span>
          <span className="flex items-center gap-1"><span className="kbd">M</span> صدا</span>
        </div>
      </div>

      {/* mobile d-pad */}
      <div className="mx-auto grid w-48 grid-cols-3 grid-rows-3 gap-2 lg:hidden" dir="ltr">
        <button aria-label="بالا" onPointerDown={(e) => { e.preventDefault(); queueDir({ x: 0, y: -1 }); }}
          className="col-start-2 row-start-1 grid h-14 place-items-center rounded-xl border border-moss-300/15 bg-pine-800 text-moss-200 transition active:scale-90 active:bg-pine-700">
          <Chevron rotate={0} />
        </button>
        <button aria-label="چپ" onPointerDown={(e) => { e.preventDefault(); queueDir({ x: -1, y: 0 }); }}
          className="col-start-1 row-start-2 grid h-14 place-items-center rounded-xl border border-moss-300/15 bg-pine-800 text-moss-200 transition active:scale-90 active:bg-pine-700">
          <Chevron rotate={-90} />
        </button>
        <button aria-label={running ? 'مکث' : 'ادامه'} onPointerDown={(e) => { e.preventDefault(); phase === 'idle' || phase === 'over' ? startGame() : pauseToggle(); }}
          className="col-start-2 row-start-2 grid h-14 place-items-center rounded-xl border border-firefly-400/30 bg-pine-700 text-firefly-300 transition active:scale-90">
          {running ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button aria-label="راست" onPointerDown={(e) => { e.preventDefault(); queueDir({ x: 1, y: 0 }); }}
          className="col-start-3 row-start-2 grid h-14 place-items-center rounded-xl border border-moss-300/15 bg-pine-800 text-moss-200 transition active:scale-90 active:bg-pine-700">
          <Chevron rotate={90} />
        </button>
        <button aria-label="پایین" onPointerDown={(e) => { e.preventDefault(); queueDir({ x: 0, y: 1 }); }}
          className="col-start-2 row-start-3 grid h-14 place-items-center rounded-xl border border-moss-300/15 bg-pine-800 text-moss-200 transition active:scale-90 active:bg-pine-700">
          <Chevron rotate={180} />
        </button>
      </div>
      <p className="text-center text-[11px] text-mist-500 lg:hidden">
        روی صفحه‌ی بازی بکشید (سُویپ) یا از دکمه‌های جهت استفاده کنید
      </p>
    </div>
  );
}
