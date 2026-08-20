export type Vec = { x: number; y: number };
export type Phase = 'idle' | 'running' | 'paused' | 'dying' | 'over';
export type DifficultyId = 'easy' | 'normal' | 'hard' | 'hell';
export type ControlMode = 'touch' | 'pad' | 'keys';
export type GameMode = 'classic' | 'timeattack' | 'survival';
export type PowerUpType = 'slow' | 'double' | 'shield' | 'ghost';

export const CONTROL_MODES: { id: ControlMode; label: string; hint: string }[] = [
  { id: 'touch', label: 'لمسی', hint: 'کشیدن انگشت روی زمین بازی (موبایل)' },
  { id: 'pad', label: 'دسته', hint: 'فشار دکمه‌های جهت روی صفحه (موبایل)' },
  { id: 'keys', label: 'کیبورد', hint: 'بدون دسته — با جهت‌نماها (موبایل و دسکتاپ)' },
];

export const GAME_MODES: { id: GameMode; label: string; desc: string; icon: string }[] = [
  { id: 'classic', label: 'کلاسیک', desc: 'بازی معمولی بدون محدودیت زمانی', icon: '🎮' },
  { id: 'timeattack', label: 'حمله زمان', desc: 'بیشترین امتیاز در ۲ دقیقه', icon: '⏱️' },
  { id: 'survival', label: 'بقا', desc: 'تا چه مدت زنده می‌مانید؟', icon: '💀' },
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
export interface PowerUp { pos: Vec; type: PowerUpType; until: number }

export interface StepEvents { ate: boolean; bonusAte: boolean; died: boolean; powerUpAte?: boolean }

export interface Game {
  snake: Vec[];
  dir: Vec;
  queue: Vec[];
  food: Vec;
  bonus: Bonus | null;
  powerUp: PowerUp | null;
  activePowerUps: Map<PowerUpType, number>;
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
  timeLeft: number | null;
  survivalTime: number;
  combo: number;
  maxCombo: number;
  mode: GameMode;
  lastPowerUpSound: number;
}

export const faNum = (n: number): string => n.toLocaleString('fa-IR');

export function createGame(d: Difficulty, mode: GameMode = 'classic'): Game {
  const mid = Math.floor(GRID / 2);
  const g: Game = {
    snake: [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }],
    dir: { x: 1, y: 0 },
    queue: [],
    food: { x: mid + 5, y: mid },
    bonus: null,
    powerUp: null,
    activePowerUps: new Map(),
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
    timeLeft: mode === 'timeattack' ? 120000 : null,
    survivalTime: 0,
    combo: 0,
    maxCombo: 0,
    mode: mode,
    lastPowerUpSound: 0,
  };
  g.food = randomEmpty(g);
  return g;
}

export function randomEmpty(g: Game): Vec {
  const occupied = new Set<number>();
  for (const s of g.snake) occupied.add(s.y * GRID + s.x);
  if (g.bonus) occupied.add(g.bonus.pos.y * GRID + g.bonus.pos.x);
  if (g.powerUp) occupied.add(g.powerUp.pos.y * GRID + g.powerUp.pos.x);
  const free: Vec[] = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      if (!occupied.has(y * GRID + x)) free.push({ x, y });
  return free.length ? free[Math.floor(Math.random() * free.length)] : { x: 0, y: 0 };
}

const POWERUP_COLORS: Record<PowerUpType, string> = {
  slow: '#34d399',
  double: '#fbbf24',
  shield: '#60a5fa',
  ghost: '#a78bfa',
};

export const POWERUP_ICONS: Record<PowerUpType, string> = {
  slow: '🐢',
  double: '✖️',
  shield: '🛡️',
  ghost: '👻',
};

export function getPowerUpIcon(type: PowerUpType): string {
  return POWERUP_ICONS[type];
}

export { POWERUP_COLORS };

export function spawnPowerUp(g: Game, now: number): PowerUp | null {
  const types: PowerUpType[] = ['slow', 'double', 'shield', 'ghost'];
  const type = types[Math.floor(Math.random() * types.length)];
  const pos = randomEmpty(g);
  return { pos, type, until: now + 8000 };
}

export function stepGame(g: Game, now: number): StepEvents {
  const ev: StepEvents = { ate: false, bonusAte: false, died: false };

  // Update time for game modes
  if (g.timeLeft !== null && g.phase === 'running') {
    g.timeLeft -= 16.67; // Approximate frame time
    if (g.timeLeft <= 10000 && g.timeLeft > 9000) {
      // 10 second warning
      sfx.timeWarning();
    }
    if (g.timeLeft <= 0) {
      g.phase = 'over';
      g.overFired = true;
      return ev;
    }
  }
  
  // Update survival time
  if (g.mode === 'survival' && g.phase === 'running') {
    g.survivalTime += 16.67;
  }

  // Update active power-ups
  for (const [type, until] of g.activePowerUps.entries()) {
    if (now > until) {
      g.activePowerUps.delete(type);
    }
  }

  // Expire power-up on grid
  if (g.powerUp && now >= g.powerUp.until) {
    g.powerUp = null;
  }

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

  // Ghost power-up allows passing through walls
  const hasGhost = g.activePowerUps.has('ghost');
  if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) {
    if (hasGhost) {
      // Wrap around
      g.snake.unshift({ x: (nx + GRID) % GRID, y: (ny + GRID) % GRID });
      g.snake.pop();
      return ev;
    }
    die(g, now);
    ev.died = true;
    return ev;
  }

  // Shield power-up prevents death from self-collision
  const hasShield = g.activePowerUps.has('shield');
  const eatsFood = nx === g.food.x && ny === g.food.y;
  const eatsBonus = !!g.bonus && nx === g.bonus.pos.x && ny === g.bonus.pos.y;
  const eatsPowerUp = !!g.powerUp && nx === g.powerUp.pos.x && ny === g.powerUp.pos.y;
  const grow = eatsFood || eatsBonus || eatsPowerUp;
  const limit = g.snake.length - (grow ? 0 : 1);
  for (let i = 0; i < limit; i++) {
    if (g.snake[i].x === nx && g.snake[i].y === ny) {
      if (hasShield) {
        // Consume shield and continue
        g.activePowerUps.delete('shield');
        addFloat(g, nx, ny, '🛡️', '#60a5fa');
        break;
      }
      die(g, now);
      ev.died = true;
      return ev;
    }
  }

  g.snake.unshift({ x: nx, y: ny });

  if (eatsFood) {
    ev.ate = true;
    const multiplier = g.activePowerUps.has('double') ? 2 : 1;
    const comboBonus = Math.min(g.combo, 10);
    g.score += (10 + comboBonus) * multiplier;
    g.foods += 1;
    g.combo++;
    if (g.combo > g.maxCombo) g.maxCombo = g.combo;
    
    // Play combo sound
    if (g.combo >= 5 && g.combo % 5 === 0) {
      sfx.combo(g.combo);
    }
    
    g.tickMs = Math.max(g.minTick, g.tickMs - g.accel);
    g.food = randomEmpty(g);
    if (g.foods % BONUS_EVERY === 0 && !g.bonus) {
      g.bonus = { pos: randomEmpty(g), until: now + BONUS_TTL };
    }
    // Random power-up spawn chance (15%)
    if (!g.powerUp && Math.random() < 0.15) {
      g.powerUp = spawnPowerUp(g, now);
    }
  } else if (eatsBonus) {
    ev.bonusAte = true;
    g.score += 30;
    g.bonus = null;
    g.combo++;
    if (g.combo > g.maxCombo) g.maxCombo = g.combo;
  } else if (eatsPowerUp) {
    ev.powerUpAte = true;
    const type = g.powerUp!.type;
    g.activePowerUps.set(type, now + 10000); // 10 seconds duration
    addFloat(g, nx, ny, getPowerUpIcon(type), POWERUP_COLORS[type]);
    g.powerUp = null;
    g.combo++;
    if (g.combo > g.maxCombo) g.maxCombo = g.combo;
    
    // Play power-up sound (throttled)
    if (now - g.lastPowerUpSound > 500) {
      sfx.powerUp(type);
      g.lastPowerUpSound = now;
    }
  } else {
    g.combo = 0; // Reset combo if no food eaten
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
