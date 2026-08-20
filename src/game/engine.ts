export type Vec = { x: number; y: number };
export type Phase = 'idle' | 'running' | 'paused' | 'dying' | 'over';
export type DifficultyId = 'easy' | 'normal' | 'hard' | 'hell';
export type ControlMode = 'touch' | 'pad' | 'keys';

export const CONTROL_MODES: { id: ControlMode; label: string; hint: string }[] = [
  { id: 'touch', label: 'لمسی', hint: 'کشیدن انگشت روی زمین بازی (موبایل)' },
  { id: 'pad', label: 'دسته', hint: 'فشار دکمه‌های جهت روی صفحه (موبایل)' },
  { id: 'keys', label: 'کیبورد', hint: 'بدون دسته — با جهت‌نماها (موبایل و دسکتاپ)' },
];

export interface Difficulty {
  id: DifficultyId;
  label: string;
  desc: string;
  tick: number;
  minTick: number;
  accel: number;
  dots: number;
}

export const GRID = 21;
export const BONUS_TTL = 6500;
export const BONUS_EVERY = 5;
export const DEATH_DELAY = 780;

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  easy:   { id: 'easy',   label: 'آسان',   desc: 'مارِ آرام و راحت',   tick: 150, minTick: 104, accel: 1.6, dots: 1 },
  normal: { id: 'normal', label: 'متوسط',  desc: 'تجربه‌ی کلاسیک',     tick: 114, minTick: 72,  accel: 2.0, dots: 2 },
  hard:   { id: 'hard',   label: 'سخت',    desc: 'فقط برای حرفه‌ای‌ها', tick: 80,  minTick: 50,  accel: 2.6, dots: 3 },
  hell:   { id: 'hell',   label: 'جهنمی',  desc: 'بدون تاچ و دسته — فقط کیبورد', tick: 62, minTick: 40, accel: 3.0, dots: 4 },
};
export const DIFF_ORDER: DifficultyId[] = ['easy', 'normal', 'hard', 'hell'];

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; ttl: number; size: number; color: string; grav: number;
}
export interface Ripple { x: number; y: number; life: number; ttl: number; color: string; max: number }
export interface FloatText { x: number; y: number; life: number; ttl: number; text: string; color: string }
export interface Bonus { pos: Vec; until: number }

export interface StepEvents { ate: boolean; bonusAte: boolean; died: boolean }

export interface Game {
  snake: Vec[];
  dir: Vec;
  queue: Vec[];
  food: Vec;
  bonus: Bonus | null;
  score: number;
  foods: number;
  baseTick: number;
  tickMs: number;
  accel: number;
  minTick: number;
  phase: Phase;
  acc: number;
  diedAt: number;
  overFired: boolean;
  particles: Particle[];
  ripples: Ripple[];
  floats: FloatText[];
  shake: number;
}

export const faNum = (n: number): string => n.toLocaleString('fa-IR');

export function createGame(d: Difficulty): Game {
  const mid = Math.floor(GRID / 2);
  const g: Game = {
    snake: [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }],
    dir: { x: 1, y: 0 },
    queue: [],
    food: { x: mid + 5, y: mid },
    bonus: null,
    score: 0,
    foods: 0,
    baseTick: d.tick,
    tickMs: d.tick,
    accel: d.accel,
    minTick: d.minTick,
    phase: 'idle',
    acc: 0,
    diedAt: 0,
    overFired: false,
    particles: [],
    ripples: [],
    floats: [],
    shake: 0,
  };
  g.food = randomEmpty(g);
  return g;
}

export function randomEmpty(g: Game): Vec {
  const occupied = new Set<number>();
  for (const s of g.snake) occupied.add(s.y * GRID + s.x);
  if (g.bonus) occupied.add(g.bonus.pos.y * GRID + g.bonus.pos.x);
  const free: Vec[] = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      if (!occupied.has(y * GRID + x)) free.push({ x, y });
  return free.length ? free[Math.floor(Math.random() * free.length)] : { x: 0, y: 0 };
}

export function stepGame(g: Game, now: number): StepEvents {
  const ev: StepEvents = { ate: false, bonusAte: false, died: false };

  while (g.queue.length) {
    const d = g.queue.shift()!;
    const reverse = d.x === -g.dir.x && d.y === -g.dir.y;
    const same = d.x === g.dir.x && d.y === g.dir.y;
    if (!reverse && !same) {
      g.dir = d;
      break;
    }
  }

  const head = g.snake[0];
  const nx = head.x + g.dir.x;
  const ny = head.y + g.dir.y;

  if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) {
    die(g, now);
    ev.died = true;
    return ev;
  }

  const eatsFood = nx === g.food.x && ny === g.food.y;
  const eatsBonus = !!g.bonus && nx === g.bonus.pos.x && ny === g.bonus.pos.y;
  const grow = eatsFood || eatsBonus;
  const limit = g.snake.length - (grow ? 0 : 1);
  for (let i = 0; i < limit; i++) {
    if (g.snake[i].x === nx && g.snake[i].y === ny) {
      die(g, now);
      ev.died = true;
      return ev;
    }
  }

  g.snake.unshift({ x: nx, y: ny });

  if (eatsFood) {
    ev.ate = true;
    g.score += 10;
    g.foods += 1;
    g.tickMs = Math.max(g.minTick, g.tickMs - g.accel);
    g.food = randomEmpty(g);
    if (g.foods % BONUS_EVERY === 0 && !g.bonus) {
      g.bonus = { pos: randomEmpty(g), until: now + BONUS_TTL };
    }
  } else if (eatsBonus) {
    ev.bonusAte = true;
    g.score += 30;
    g.bonus = null;
  }

  if (!grow) g.snake.pop();
  return ev;
}

function die(g: Game, now: number) {
  g.phase = 'dying';
  g.diedAt = now;
  g.shake = 15;
}

/* ---------- visual effects ---------- */

export function burst(g: Game, x: number, y: number, colors: string[], n = 14, speed = 3.4) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.9);
    g.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0,
      ttl: 0.4 + Math.random() * 0.45,
      size: 0.06 + Math.random() * 0.1,
      color: colors[i % colors.length],
      grav: 1.6,
    });
  }
}

export function addRipple(g: Game, x: number, y: number, color: string, max = 1.8) {
  g.ripples.push({ x, y, life: 0, ttl: 0.45, color, max });
}

export function addFloat(g: Game, x: number, y: number, text: string, color: string) {
  g.floats.push({ x, y, life: 0, ttl: 0.9, text, color });
}

export function updateFX(g: Game, dt: number) {
  for (const p of g.particles) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.grav * dt;
  }
  g.particles = g.particles.filter((p) => p.life < p.ttl);
  for (const r of g.ripples) r.life += dt;
  g.ripples = g.ripples.filter((r) => r.life < r.ttl);
  for (const f of g.floats) {
    f.life += dt;
    f.y -= 1.15 * dt;
  }
  g.floats = g.floats.filter((f) => f.life < f.ttl);
  g.shake = Math.max(0, g.shake - dt * 26);
}
