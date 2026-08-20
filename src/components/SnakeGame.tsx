import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createGame, stepGame, updateFX, burst, addRipple, addFloat, randomEmpty,
  faNum, DEATH_DELAY, GRID, CONTROL_MODES, GAME_MODES, getPowerUpIcon, POWERUP_COLORS,
  type Game, type Difficulty, type DifficultyId, type Vec, type ControlMode, type GameMode, type PowerUpType,
} from '../game/engine';
import { sfx } from '../game/audio';

const TICK_BASE = 130;

const PauseIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <rect x="6" y="4" width="4.5" height="16" rx="1.2" />
    <rect x="13.5" y="4" width="4.5" height="16" rx="1.2" />
  </svg>
);
const PlayIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
  </svg>
);
const RestartIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);
const SpeakerIcon = ({ muted, className = 'h-5 w-5' }: { muted: boolean; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none" />
    {muted ? (
      <>
        <path d="m16 9 5 6" />
        <path d="m21 9-5 6" />
      </>
    ) : (
      <>
        <path d="M15.5 9.5a4 4 0 0 1 0 5" />
        <path d="M18 7a8 8 0 0 1 0 10" />
      </>
    )}
  </svg>
);
const TapIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
    <path d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5" />
    <path d="M12 19.5A7.5 7.5 0 0 1 4.5 12" />
  </svg>
);
const GamepadIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6.8 6.5h10.4l2.3 7.8a2.55 2.55 0 0 1-2.4 3.2c-.9 0-1.8-.45-2.3-1.2l-.9-1.5H10.1l-.9 1.5a2.75 2.75 0 0 1-2.3 1.2 2.55 2.55 0 0 1-2.4-3.2l2.3-7.8Z" />
    <path d="M8.2 9.4v3M6.7 10.9h3" />
    <circle cx="15.2" cy="9.9" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="17.4" cy="11.9" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);
const KeyboardIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6.5 10h1M10 10h1M13.5 10h1M17 10h1M6.5 14h1M16.5 14h1M9.5 14h5" />
  </svg>
);
const LockIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
const FlameIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2s6 5.4 6 11a6 6 0 0 1-12 0c0-2.5 1-4.4 2.3-6 .4 1.1 1 1.9 1.9 2.4C10.1 7.6 10.8 4.8 12 2Z" />
  </svg>
);
const ClockIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);
const TrophyIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M8 21h8v-2H8v2ZM12 2a7 7 0 0 0-7 7v2.5c0 2.5 1.5 4.5 3.5 5.3V19h7v-2.2c2-.8 3.5-2.8 3.5-5.3V9a7 7 0 0 0-7-7Zm-5 9V9a5 5 0 0 1 5-5v10H7a2 2 0 0 1-2-2Zm10 2h-1V4a5 5 0 0 1 5 5v2.5a2 2 0 0 1-2 2h-2Z" />
  </svg>
);
const ComboIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2L9.5 9H2l6 4.5L5.5 22 12 17.5 18.5 22 16 13.5 22 9h-7.5L12 2Z" />
  </svg>
);
const ArrowIcon = ({ rot }: { rot: number }) => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" style={{ transform: `rotate(${rot}deg)` }} fill="currentColor" aria-hidden>
    <path d="M12 4.5 20 14h-5v5.5H9V14H4L12 4.5Z" />
  </svg>
);

const DPAD_ORDER: (string | null)[] = [null, 'up', null, 'left', null, 'right', null, 'down', null];
const DPAD_ROT: Record<string, number> = { up: 0, right: 90, down: 180, left: 270 };
const DPAD_LABEL: Record<string, string> = { up: 'بالا', right: 'راست', down: 'پایین', left: 'چپ' };

const COLORS = ['#fde047', '#fde68a', '#fbbf24', '#bef264'];

const CTRLS: Record<string, Vec> = {
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
};

const roundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
};

interface Props {
  diff: Difficulty;
  best: number;
  onDiffChange: (id: DifficultyId) => void;
  onGameOver: (score: number) => void;
  onToggleMute: () => void;
  gameMode?: GameMode;
}

export default function SnakeGame({ diff, best, onDiffChange, onGameOver, onToggleMute, gameMode = 'classic' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game>(createGame(diff, gameMode));
  const dirRef = useRef<Vec>({ x: 1, y: 0 });
  const prevTickRef = useRef<number | null>(null);
  const phaseRef = useRef(gameRef.current.phase);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const [phase, setPhase] = useState(gameRef.current.phase);
  const [hud, setHud] = useState({ score: 0, len: 3, speed: 1, combo: 0, maxCombo: 0, timeLeft: 0, survivalTime: 0 });
  const [isNewBest, setIsNewBest] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activePowerUps, setActivePowerUps] = useState<Map<PowerUpType, number>>(new Map());
  const [controlMode, setControlMode] = useState<ControlMode>(() => {
    try {
      const v = localStorage.getItem('shabtab-control');
      return v === 'pad' || v === 'keys' ? v : 'touch';
    } catch {
      return 'touch';
    }
  });

  const isCoarse = useMemo(
    () =>
      (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
      false,
    [],
  );
  const isHell = diff.id === 'hell';
  const effectiveMode: ControlMode = isHell ? 'keys' : controlMode;
  const showPad = isCoarse && (effectiveMode === 'pad' || isHell);
  const padLocked = isHell;

  const bestRef = useRef(best);
  useEffect(() => {
    bestRef.current = best;
  }, [best]);

  useEffect(() => {
    try { localStorage.setItem('shabtab-control', controlMode); } catch { /* ignore */ }
  }, [controlMode]);

  const modeRef = useRef<ControlMode>(effectiveMode);
  useEffect(() => {
    modeRef.current = effectiveMode;
  }, [effectiveMode]);

  /* prevent page scroll while swiping on the board (React listeners are passive) */
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (modeRef.current === 'touch') e.preventDefault();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  const setPhaseBoth = (p: Game['phase']) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const syncHud = (g: Game) => {
    setHud({ 
      score: g.score, 
      len: g.snake.length, 
      speed: g.baseTick / g.tickMs,
      combo: g.combo,
      maxCombo: g.maxCombo,
      timeLeft: g.timeLeft || 0,
      survivalTime: g.survivalTime,
    });
    setActivePowerUps(new Map(g.activePowerUps));
  };

  const queueDir = (d: Vec) => {
    const g = gameRef.current;
    const last = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
    const reverse = d.x === -last.x && d.y === -last.y;
    const same = d.x === last.x && d.y === last.y;
    if (reverse || same || g.queue.length >= 3) return;
    g.queue.push(d);
  };

  const startGame = () => {
    const g = createGame(diff, gameMode);
    g.phase = 'running';
    gameRef.current = g;
    dirRef.current = { ...g.dir };
    setPhaseBoth('running');
    setIsNewBest(false);
    syncHud(g);
    sfx.start();
  };

  const togglePause = () => {
    const g = gameRef.current;
    if (g.phase === 'running') {
      g.phase = 'paused';
      setPhaseBoth('paused');
      sfx.pause();
    } else if (g.phase === 'paused') {
      g.phase = 'running';
      setPhaseBoth('running');
      sfx.ui();
    }
  };

  /* reset on difficulty change */
  useEffect(() => {
    const g = createGame(diff, gameMode);
    gameRef.current = g;
    dirRef.current = { ...g.dir };
    prevTickRef.current = null;
    setPhaseBoth('idle');
    setIsNewBest(false);
    syncHud(g);
  }, [diff, gameMode]);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = e.code;
      if (c === 'Space' || c.startsWith('Arrow')) e.preventDefault();
      sfx.unlock();
      if (c === 'Space' || c === 'KeyP') {
        const ph = phaseRef.current;
        if (ph === 'running' || ph === 'paused') togglePause();
        else if (ph === 'idle' || ph === 'over') startGame();
        return;
      }
      if (c === 'Enter' || c === 'KeyR') {
        const ph = phaseRef.current;
        if (ph !== 'dying') startGame();
        return;
      }
      if (c === 'KeyM') {
        setMuted((m) => !m);
        onToggleMute();
        return;
      }
      const d = CTRLS[c];
      if (d) {
        const ph = phaseRef.current;
        if (ph === 'idle' || ph === 'over') startGame();
        if (ph === 'paused') return;
        queueDir(d);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff, onToggleMute]);

  /* ---------- touch: swipe (only in touch mode) + tap-to-start ---------- */
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
    if (effectiveMode !== 'touch') return; // swipe steering is touch-mode only
    e.preventDefault();
    if (phaseRef.current === 'idle' || phaseRef.current === 'over') {
      startGame();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) queueDir({ x: dx > 0 ? 1 : -1, y: 0 });
    else queueDir({ x: 0, y: dy > 0 ? 1 : -1 });
  };

  const handleDirKey = (k: string) => {
    const map: Record<string, Vec> = {
      up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    };
    queueDir(map[k]);
  };

  /* ---------- main loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const draw = (g: Game, cs: number, now: number) => {
      const W = GRID * cs;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);

      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          if ((x + y) % 2 === 0) continue;
          ctx.fillStyle = 'rgba(190,242,100,0.028)';
          ctx.fillRect(x * cs, y * cs, cs, cs);
        }
      }

      // food
      {
        const fx = (g.food.x + 0.5) * cs;
        const fy = (g.food.y + 0.5) * cs;
        const pulse = 1 + Math.sin(now / 260) * 0.12;
        const r = cs * 0.3 * pulse;
        const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 2.6);
        glow.addColorStop(0, 'rgba(251,113,133,0.5)');
        glow.addColorStop(1, 'rgba(251,113,133,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(fx, fy, r * 2.6, 0, Math.PI * 2);
        ctx.fill();
        const body = ctx.createRadialGradient(fx - r / 3, fy - r / 3, r * 0.15, fx, fy, r);
        body.addColorStop(0, '#fecdd3');
        body.addColorStop(1, '#f43f5e');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a3e635';
        ctx.lineWidth = Math.max(1.5, cs * 0.05);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fx, fy - r * 0.9);
        ctx.quadraticCurveTo(fx + r * 0.5, fy - r * 1.7, fx + r * 0.95, fy - r * 1.35);
        ctx.stroke();
      }

      // bonus firefly
      if (g.bonus) {
        const remain = g.bonus.until - now;
        const frac = Math.max(0, remain / 6500);
        const bx = (g.bonus.pos.x + 0.5) * cs;
        const by = (g.bonus.pos.y + 0.5) * cs;
        const blink = remain < 1600 ? (Math.sin(now / 90) > 0 ? 1 : 0.35) : 1;
        const r = cs * 0.32;
        ctx.save();
        ctx.globalAlpha = blink;
        const glow = ctx.createRadialGradient(bx, by, 0, bx, by, r * 3);
        glow.addColorStop(0, 'rgba(253,230,138,0.55)');
        glow.addColorStop(1, 'rgba(253,230,138,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(bx, by, r * 3, 0, Math.PI * 2);
        ctx.fill();
        const body = ctx.createRadialGradient(bx - r / 3, by - r / 3, r * 0.1, bx, by, r);
        body.addColorStop(0, '#fefce8');
        body.addColorStop(1, '#f59e0b');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(253,230,138,0.9)';
        ctx.lineWidth = Math.max(1.5, cs * 0.06);
        ctx.beginPath();
        ctx.arc(bx, by, r * 1.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
        ctx.restore();
      }

      // power-ups on grid
      if (g.powerUp) {
        const px = (g.powerUp.pos.x + 0.5) * cs;
        const py = (g.powerUp.pos.y + 0.5) * cs;
        const remain = g.powerUp.until - now;
        const pulse = 1 + Math.sin(now / 150) * 0.15;
        const r = cs * 0.35 * pulse;
        
        ctx.save();
        const color = POWERUP_COLORS[g.powerUp.type];
        const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 2.5);
        glow.addColorStop(0, color.replace(')', ', 0.5)').replace('rgb', 'rgba'));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw icon background
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw emoji icon
        ctx.font = `bold ${cs * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(getPowerUpIcon(g.powerUp.type), px, py);
        ctx.restore();
      }

      // snake
      const n = g.snake.length;
      const dprCap = cs;
      for (let i = n - 1; i >= 0; i--) {
        const s = g.snake[i];
        const t = n === 1 ? 0 : i / (n - 1);
        const cx = (s.x + 0.5) * cs;
        const cy = (s.y + 0.5) * cs;
        let alpha = 1 - t * 0.55;
        let color = `rgba(16,185,129,${alpha})`;
        let size = cs * (0.8 - 0.22 * t);
        let glowC = 'rgba(16,185,129,0.28)';
        if (i === 0) {
          color = '#bef264';
          glowC = 'rgba(190,242,100,0.5)';
          size = cs * 0.88;
        } else if (i === 1) {
          color = '#a3e635';
          glowC = 'rgba(163,230,53,0.4)';
          size = cs * 0.84;
        }
        if (g.phase === 'dying' || g.phase === 'over') {
          const fade = g.phase === 'over' ? 0.45 : Math.max(0.35, 1 - (now - g.diedAt) / 900);
          ctx.globalAlpha = fade;
        }
        ctx.save();
        ctx.shadowColor = glowC;
        ctx.shadowBlur = i === 0 ? dprCap * 0.55 : dprCap * 0.22;
        ctx.fillStyle = color;
        roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.36);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;

        if (i === 0) {
          const ex = g.dir.x, ey = g.dir.y;
          const px = -ey, py = ex;
          const off = cs * 0.17, fwd = cs * 0.13, er = cs * 0.085;
          for (const sgn of [1, -1]) {
            const exx = cx + ex * fwd + px * off * sgn;
            const eyy = cy + ey * fwd + py * off * sgn;
            ctx.fillStyle = '#0a1c15';
            ctx.beginPath();
            ctx.arc(exx, eyy, er, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#eaf6ef';
            ctx.beginPath();
            ctx.arc(exx + ex * er * 0.35, eyy + ey * er * 0.35, er * 0.38, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // particles / ripples / floats
      for (const p of g.particles) {
        const a = Math.max(0, 1 - p.life / p.ttl);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc((p.x + 0.5) * cs, (p.y + 0.5) * cs, Math.max(0.5, p.size * cs * a), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const r of g.ripples) {
        const k = r.life / r.ttl;
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = Math.max(1, cs * 0.09 * (1 - k));
        ctx.beginPath();
        ctx.arc((r.x + 0.5) * cs, (r.y + 0.5) * cs, cs * (0.3 + r.max * k), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const f of g.floats) {
        const k = f.life / f.ttl;
        ctx.globalAlpha = 1 - k;
        ctx.font = `700 ${Math.round(cs * 0.72)}px Vazirmatn, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = f.color;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 6;
        ctx.fillText(f.text, (f.x + 0.5) * cs, (f.y + 0.35) * cs);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // vignette
      const vg = ctx.createRadialGradient(W / 2, W / 2, W * 0.35, W / 2, W / 2, W * 0.78);
      vg.addColorStop(0, 'rgba(6,17,13,0)');
      vg.addColorStop(1, 'rgba(4,12,9,0.5)');
      ctx.fillStyle = vg;
      ctx.fillRect(-20, -20, W + 40, W + 40);

      ctx.restore();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const g = gameRef.current;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;

      let prevTick: number | null = null;
      if (prevTickRef.current !== null) {
        const p = prevTickRef.current;
        if (p > g.tickMs + 1) prevTick = p;
      }
      prevTickRef.current = g.tickMs;

      if (g.phase === 'running') {
        g.acc += dt * 1000;
        let guard = 0;
        while (g.acc >= g.tickMs && g.phase === 'running' && guard < 6) {
          g.acc -= g.tickMs;
          guard++;
          const ev = stepGame(g, now);
          if (ev.ate) {
            sfx.eat();
            const hx = g.snake[0].x;
            const hy = g.snake[0].y;
            burst(g, hx, hy, ['#fda4af', '#f43f5e', '#bef264'], 14);
            addRipple(g, hx, hy, '#fb7185');
            addFloat(g, hx, hy, '+۱۰', '#fde68a');
            syncHud(g);
          }
          if (ev.bonusAte && g.bonus === null) {
            sfx.bonus();
            const hx = g.snake[0].x;
            const hy = g.snake[0].y;
            burst(g, hx, hy, ['#fde68a', '#fbbf24', '#fef9c3'], 20, 4.2);
            addRipple(g, hx, hy, '#fbbf24', 2.6);
            addFloat(g, hx, hy, '+۳۰', '#fbbf24');
            syncHud(g);
          }
          if (ev.died) {
            const hx = g.snake[0].x + g.dir.x * 0.5;
            const hy = g.snake[0].y + g.dir.y * 0.5;
            burst(g, hx, hy, COLORS, 30, 5.5);
            addRipple(g, hx, hy, '#ef4444', 3.2);
            sfx.die();
            syncHud(g);
          }
        }
        if (g.bonus && now >= g.bonus.until) {
          addRipple(g, g.bonus.pos.x, g.bonus.pos.y, 'rgba(253,230,138,0.8)', 1.2);
          g.bonus = null;
        }
        if (prevTick !== null && g.tickMs < prevTick) {
          addFloat(g, g.snake[0].x, g.snake[0].y - 1, 'تندتر!', '#34d399');
          addRipple(g, g.snake[0].x, g.snake[0].y, '#34d399', 1.4);
        }
      } else if (g.phase === 'dying') {
        if (now - g.diedAt >= DEATH_DELAY && !g.overFired) {
          g.overFired = true;
          g.phase = 'over';
          setPhaseBoth('over');
          const nb = g.score > bestRef.current && g.score > 0;
          setIsNewBest(nb);
          if (nb) sfx.record();
          onGameOver(g.score);
        }
      }

      updateFX(g, dt);

      const c = canvasRef.current;
      if (c) {
        const rect = c.getBoundingClientRect();
        if (rect.width > 0) {
          const dpr = window.devicePixelRatio || 1;
          const bw = Math.round(rect.width * dpr);
          if (c.width !== bw) {
            c.width = bw;
            c.height = bw;
          }
          draw(g, c.width / GRID, now);
        }
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff, onGameOver]);

  const speedX = hud.speed.toFixed(1).replace('.', '٫');
  const overlayBtn =
    'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-display text-lg transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95';

  const hintText = isHell
    ? 'حالت جهنمی: فقط جهت‌نمای کیبورد • Space برای مکث'
    : effectiveMode === 'touch'
      ? 'سُویپ روی زمین یا کیبورد برای جهت • Space برای مکث'
      : effectiveMode === 'pad'
        ? 'دسته‌ی مجازی یا کیبورد برای جهت • Space برای مکث'
        : 'جهت‌نمای کیبورد برای حرکت • Space برای مکث';

  return (
    <section className="flex flex-col items-center">
      {/* HUD */}
      <div className="mb-3 grid w-full max-w-[560px] grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-xl border border-moss-300/10 bg-pine-900/80 px-3 py-2">
          <p className="text-[10px] font-medium text-mist-500">امتیاز</p>
          <p key={hud.score} className={`font-display text-2xl leading-7 text-mist-100 ${hud.score ? 'score-pop' : ''}`}>
            {faNum(hud.score)}
          </p>
        </div>
        <div className="rounded-xl border border-moss-300/10 bg-pine-900/80 px-3 py-2">
          <p className="text-[10px] font-medium text-mist-500">بهترین رکورد</p>
          <p className={`font-display text-2xl leading-7 ${isNewBest ? 'record-flash rounded-lg text-firefly-300' : 'text-firefly-300'}`}>
            {faNum(Math.max(best, hud.score))}
          </p>
        </div>
        <div className="rounded-xl border border-moss-300/10 bg-pine-900/80 px-3 py-2">
          <p className="text-[10px] font-medium text-mist-500">کمبو</p>
          <p className={`font-display text-2xl leading-7 flex items-center gap-1 ${hud.combo >= 5 ? 'text-amber-400' : 'text-fern-400'}`}>
            <ComboIcon className="h-4 w-4" />
            {faNum(hud.combo)}
          </p>
        </div>
        <div className="rounded-xl border border-moss-300/10 bg-pine-900/80 px-3 py-2">
          <p className="text-[10px] font-medium text-mist-500">سرعت</p>
          <p className="font-display text-2xl leading-7 text-fern-400">×{speedX}</p>
        </div>
      </div>

      {/* Extended HUD for game modes and power-ups */}
      {(gameMode !== 'classic' || activePowerUps.size > 0) && (
        <div className="mb-3 grid w-full max-w-[560px] grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {gameMode === 'timeattack' && (
            <div className={`rounded-xl border border-moss-300/10 bg-pine-900/80 px-3 py-2 ${hud.timeLeft < 10000 ? 'animate-pulse border-berry-500/30' : ''}`}>
              <p className="text-[10px] font-medium text-mist-500 flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                زمان باقی‌مانده
              </p>
              <p className={`font-display text-2xl leading-7 ${hud.timeLeft < 10000 ? 'text-berry-400' : 'text-sky-400'}`}>
                {Math.ceil(hud.timeLeft / 1000)}ث
              </p>
            </div>
          )}
          {gameMode === 'survival' && (
            <div className="rounded-xl border border-moss-300/10 bg-pine-900/80 px-3 py-2">
              <p className="text-[10px] font-medium text-mist-500 flex items-center gap-1">
                <TrophyIcon className="h-3 w-3" />
                زمان بقا
              </p>
              <p className="font-display text-2xl leading-7 text-purple-400">
                {(hud.survivalTime / 1000).toFixed(1)}ث
              </p>
            </div>
          )}
          {activePowerUps.size > 0 && (
            <div className="col-span-2 sm:col-span-2 rounded-xl border border-moss-300/10 bg-pine-900/80 px-3 py-2">
              <p className="text-[10px] font-medium text-mist-500 mb-1">قدرت‌های فعال</p>
              <div className="flex gap-2 flex-wrap">
                {Array.from(activePowerUps.entries()).map(([type, until]) => {
                  const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
                  return (
                    <span 
                      key={type} 
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: POWERUP_COLORS[type] + '33', color: POWERUP_COLORS[type] }}
                    >
                      {getPowerUpIcon(type)} {remaining}ث
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* board */}
      <div
        ref={boardRef}
        className={`relative select-none overflow-hidden rounded-2xl border ${
          isHell ? 'board-glow-hell border-berry-500/25' : 'board-glow border-moss-300/15'
        }`}
        style={{ touchAction: 'none', width: 'min(92vw, 560px)' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas ref={canvasRef} className="block h-auto w-full" style={{ aspectRatio: '1 / 1' }} />

        {/* overlays */}
        {phase === 'idle' && (
          <div className="overlay-in absolute inset-0 flex flex-col items-center justify-center gap-4 bg-pine-950/80 p-6 text-center backdrop-blur-[3px]">
            <div className="bob">
              <svg viewBox="0 0 64 40" className="h-14 w-24" aria-hidden>
                <path d="M6 30 Q10 10 22 16 Q34 22 40 12 Q44 5 52 8" stroke="#a3e635" strokeWidth="9" strokeLinecap="round" fill="none" />
                <circle cx="52" cy="8" r="7" fill="#bef264" />
                <circle cx="54.5" cy="6.2" r="1.7" fill="#0a1c15" />
                <circle cx="12" cy="26" r="3.4" fill="#fb7185" />
              </svg>
            </div>
            <h2 className="font-display text-4xl text-moss-200 sm:text-5xl">مارِ شب‌تاب</h2>
            <p className="max-w-[34ch] text-sm leading-6 text-mist-400">
              شب‌تاب‌ها را بگیر تا مار بزرگ‌تر و تندتر شود؛ مواظب باش به دیوار و دُم خودت نخوری!
            </p>
            <p className="rise-in flex items-center gap-2 rounded-full border border-moss-300/20 bg-pine-800 px-4 py-1 text-sm text-moss-200" style={{ animationDelay: '60ms' }}>
              سطح: <b>{diff.label}</b>
              {isHell && <FlameIcon className="flame-flicker h-4 w-4 text-berry-400" />}
            </p>
            {isHell && (
              <p className="rise-in inline-flex items-center gap-1.5 rounded-full border border-berry-500/40 bg-berry-500/10 px-3 py-1 text-xs font-bold text-berry-400" style={{ animationDelay: '120ms' }}>
                <LockIcon className="h-3.5 w-3.5" />
                تاچ و دسته در این حالت قفل است — فقط کیبورد
              </p>
            )}
            <button
              onClick={() => { sfx.unlock(); startGame(); }}
              className={`${overlayBtn} rise-in mt-1 bg-moss-300 text-pine-950 shadow-[0_0_35px_rgba(190,242,100,0.35)] hover:bg-moss-200`}
              style={{ animationDelay: '160ms' }}
            >
              <PlayIcon />
              شروع بازی
            </button>
            <p className="text-[11px] text-mist-500">{hintText}</p>
          </div>
        )}

        {phase === 'paused' && (
          <div className="overlay-in absolute inset-0 flex flex-col items-center justify-center gap-4 bg-pine-950/80 p-6 text-center backdrop-blur-[3px]">
            <PauseIcon className="h-10 w-10 text-moss-300" />
            <h2 className="font-display text-4xl text-mist-100">مکث</h2>
            <p className="text-sm text-mist-400">مار نفسی تازه می‌کند…</p>
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <button onClick={togglePause} className={`${overlayBtn} bg-moss-300 text-pine-950 hover:bg-moss-200`}>
                <PlayIcon />
                ادامه
              </button>
              <button
                onClick={() => { sfx.ui(); startGame(); }}
                className={`${overlayBtn} border border-moss-300/25 bg-pine-800 text-mist-100 hover:bg-pine-700`}
              >
                <RestartIcon />
                شروع دوباره
              </button>
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div className="overlay-in absolute inset-0 flex flex-col items-center justify-center gap-3 bg-pine-950/85 p-6 text-center backdrop-blur-[3px]">
            <h2 className="font-display text-4xl text-berry-400 sm:text-5xl">باختی!</h2>
            {isNewBest && (
              <p className="record-flash rise-in rounded-full border border-firefly-400/50 bg-firefly-400/10 px-4 py-1 text-sm font-bold text-firefly-300">
                رکورد جدید!
              </p>
            )}
            {isHell && (
              <p className="text-xs text-berry-400/90">حالت جهنمی — فقط کیبورد؛ دوباره جرئت داری؟</p>
            )}
            <div className="mt-1 flex items-stretch gap-3">
              <div className="rounded-xl border border-moss-300/15 bg-pine-800/80 px-6 py-3">
                <p className="text-[11px] text-mist-500">امتیاز شما</p>
                <p className="font-display text-3xl text-mist-100">{faNum(hud.score)}</p>
              </div>
              <div className="rounded-xl border border-moss-300/15 bg-pine-800/80 px-6 py-3">
                <p className="text-[11px] text-mist-500">بهترین رکورد</p>
                <p className="font-display text-3xl text-firefly-300">{faNum(Math.max(best, hud.score))}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <button onClick={() => { sfx.unlock(); startGame(); }} className={`${overlayBtn} bg-moss-300 text-pine-950 hover:bg-moss-200`}>
                <RestartIcon />
                دوباره بازی کن
              </button>
              <button
                onClick={() => { sfx.ui(); onDiffChange('easy'); }}
                className={`${overlayBtn} border border-moss-300/25 bg-pine-800 text-mist-100 hover:bg-pine-700`}
              >
                تغییر سطح
              </button>
            </div>
            <p className="text-[11px] text-mist-500">Enter یا R برای شروع فوری</p>
          </div>
        )}
      </div>

      {/* toolbar */}
      <div className="mt-3 flex w-full max-w-[560px] items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { sfx.unlock(); togglePause(); }}
            disabled={phase !== 'running' && phase !== 'paused'}
            aria-label="مکث / ادامه"
            className="flex items-center gap-1.5 rounded-lg border border-moss-300/15 bg-pine-800 px-3 py-2 text-sm text-mist-100 transition hover:border-moss-300/40 hover:bg-pine-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase === 'paused' ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
            {phase === 'paused' ? 'ادامه' : 'مکث'}
          </button>
          <button
            onClick={() => { sfx.ui(); startGame(); }}
            aria-label="شروع دوباره"
            className="flex items-center gap-1.5 rounded-lg border border-moss-300/15 bg-pine-800 px-3 py-2 text-sm text-mist-100 transition hover:border-moss-300/40 hover:bg-pine-700 active:scale-95"
          >
            <RestartIcon className="h-4 w-4" />
            دوباره
          </button>
        </div>
        <button
          onClick={() => { sfx.unlock(); setMuted((m) => !m); onToggleMute(); }}
          aria-label={muted ? 'پخش صدا' : 'قطع صدا'}
          className={`rounded-lg border px-3 py-2 text-sm transition active:scale-95 ${
            muted
              ? 'border-berry-500/40 bg-berry-500/10 text-berry-400'
              : 'border-moss-300/15 bg-pine-800 text-mist-100 hover:border-moss-300/40 hover:bg-pine-700'
          }`}
        >
          <SpeakerIcon muted={muted} className="h-4 w-4" />
        </button>
      </div>

      {/* control scheme selector */}
      <div className="mt-3 w-full max-w-[560px] rounded-xl border border-moss-300/10 bg-pine-900/70 px-3 py-2.5">
        <div className={`flex flex-wrap items-center justify-center gap-1.5 ${isHell ? 'pointer-events-none opacity-45' : ''}`}>
          <span className="ml-1 text-[11px] font-bold text-mist-500">شیوه‌ی کنترل:</span>
          {CONTROL_MODES.map((m) => {
            const active = effectiveMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { sfx.unlock(); sfx.ui(); setControlMode(m.id); }}
                title={m.hint}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                  active
                    ? 'border-moss-300/50 bg-pine-700 text-moss-200 shadow-[0_0_16px_rgba(190,242,100,0.15)]'
                    : 'border-moss-300/10 bg-pine-800/70 text-mist-400 hover:border-moss-300/30 hover:text-mist-100'
                }`}
              >
                {m.id === 'touch' ? <TapIcon /> : m.id === 'pad' ? <GamepadIcon /> : <KeyboardIcon />}
                {m.label}
              </button>
            );
          })}
        </div>
        {isHell && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-berry-400">
            <LockIcon className="h-3.5 w-3.5" />
            در حالت جهنمی تاچ و دسته قفل است — فقط جهت‌نمای کیبورد
          </p>
        )}
      </div>

      {/* on-screen d-pad (mobile, pad mode — locked in hell) */}
      {showPad && (
        <div className="mx-auto mt-4 grid max-w-[290px] grid-cols-3 gap-2 sm:hidden">
          {DPAD_ORDER.map((k, idx) => {
            if (k) {
              return (
                <button
                  key={k}
                  disabled={padLocked}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (padLocked) return;
                    sfx.unlock();
                    if (phase === 'idle' || phase === 'over') startGame();
                    handleDirKey(k);
                  }}
                  aria-label={DPAD_LABEL[k]}
                  className={`grid h-[68px] place-items-center rounded-xl border transition ${
                    padLocked
                      ? 'border-berry-500/15 bg-pine-800/40 text-mist-500/40'
                      : 'border-moss-300/15 bg-pine-800/90 text-moss-200 shadow-[0_4px_0_rgba(0,0,0,0.35)] hover:border-moss-300/35 hover:bg-pine-700 active:translate-y-[2px] active:scale-95 active:shadow-none'
                  }`}
                >
                  <ArrowIcon rot={DPAD_ROT[k]} />
                </button>
              );
            }
            if (idx === 4) {
              return (
                <div key="c" className="flex items-center justify-center">
                  {padLocked ? (
                    <span className="grid h-16 w-16 place-items-center rounded-full border border-berry-500/25 bg-pine-800/60 text-berry-400/80">
                      <LockIcon className="h-6 w-6" />
                    </span>
                  ) : (
                    <button
                      onClick={() => { sfx.unlock(); togglePause(); }}
                      aria-label="مکث / ادامه"
                      className="grid h-16 w-16 place-items-center rounded-full border border-moss-300/20 bg-pine-800 text-moss-200 transition hover:border-moss-300/40 hover:bg-pine-700 active:scale-90"
                    >
                      {phase === 'running' ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
                    </button>
                  )}
                </div>
              );
            }
            return <div key={`e${idx}`} />;
          })}
        </div>
      )}

      <p className="mt-3 text-center text-[11px] leading-5 text-mist-500">{hintText}</p>
    </section>
  );
}
