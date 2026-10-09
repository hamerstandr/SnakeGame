/**
 * GameLifecycle — ماشین حالت (State Machine) چرخه‌ی حیات بازی
 * -----------------------------------------------------------
 * رفع خطای:
 *   [Lifecycle] rejected invalid transition PLAYING -> START
 *
 * علت خطا: تابع start() بدون توجه به حالت فعلی، همیشه رویداد START را
 * ارسال می‌کرد. وقتی بازی در حالت PLAYING بود (مثلاً کاربر دوباره روی
 * دکمه‌ی «شروع» کلیک می‌کرد یا ری‌رندر باعث فراخوانی مجدد start می‌شد)،
 * گذار PLAYING -> START غیرمجاز بوده و خطا ثبت و بازی اجرا نمی‌شد.
 *
 * راه‌حل:
 *  1) جدول گذارهای مجاز (TRANSITIONS) تعریف شده است.
 *  2) گذارهای بی‌اثر (idempotent) مثل START در حالت PLAYING خطا نیستند؛
 *     فقط نادیده گرفته می‌شوند (بدون لاگ خطا).
 *  3) برای شروع دوباره از حالت PLAYING باید ابتدا RESET/STOP شود
 *     (متد restart() همین کار را به‌صورت امن انجام می‌دهد).
 */

export const GameState = Object.freeze({
  BOOT: 'BOOT',         // بارگذاری اولیه / منوی اصلی
  READY: 'READY',       // آماده‌ی شروع (نقشه/منطق ساخته شده)
  PAUSED: 'PAUSED',     // مکث
  PLAYING: 'PLAYING',   // در حال اجرا
  GAME_OVER: 'GAME_OVER', // بازی تمام شد (برد/باخت/اتمام وقت)
});

export const LifecycleEvent = Object.freeze({
  LOAD: 'LOAD',     // BOOT -> READY
  START: 'START',   // READY | GAME_OVER | PAUSED -> PLAYING
  PAUSE: 'PAUSE',   // PLAYING -> PAUSED
  RESUME: 'RESUME', // PAUSED -> PLAYING
  STOP: 'STOP',     // PLAYING | PAUSED -> READY
  FINISH: 'FINISH', // PLAYING -> GAME_OVER
  RESET: 'RESET',   // هر حالت -> READY
});

// جدول گذارهای مجاز: { [رویداد]: [حالت‌های مبدأ مجاز] }
const TRANSITIONS = {
  [LifecycleEvent.LOAD]: [GameState.BOOT],
  [LifecycleEvent.START]: [GameState.READY, GameState.PAUSED, GameState.GAME_OVER],
  [LifecycleEvent.PAUSE]: [GameState.PLAYING],
  [LifecycleEvent.RESUME]: [GameState.PAUSED],
  [LifecycleEvent.STOP]: [GameState.PLAYING, GameState.PAUSED],
  [LifecycleEvent.FINISH]: [GameState.PLAYING],
  [LifecycleEvent.RESET]: [
    GameState.BOOT, GameState.READY, GameState.PAUSED,
    GameState.PLAYING, GameState.GAME_OVER,
  ], // RESET از هر حالتی مجاز است — کلید رفع بن‌بست «PLAYING -> START»
};

// رویدادهایی که اگر در حالت فعلی «بی‌اثر» باشند، خطا نیست؛ فقط نادیده گرفته می‌شوند
const IDEMPOTENT_NO_OPS = {
  [LifecycleEvent.START]: [GameState.PLAYING], // START هنگام PLAYING => تکراری، نه خطا
  [LifecycleEvent.PAUSE]: [GameState.PAUSED],
  [LifecycleEvent.RESUME]: [GameState.PLAYING],
  [LifecycleEvent.LOAD]: [GameState.READY],
  [LifecycleEvent.RESET]: [GameState.READY],
};

export class GameLifecycle {
  /**
   * @param {object} [options]
   * @param {string} [options.initial] حالت اولیه
   * @param {(from:string, to:string, event:string) => void} [options.onTransition]
   * @param {(message:string, extra?:object) => void} [options.onError]
   */
  constructor(options = {}) {
    this.state = options.initial || GameState.BOOT;
    this.onTransition = options.onTransition || null;
    this.onError = options.onError || null;
    this.listeners = new Map(); // event -> Set<handler>
  }

  /** گوش دادن به یک رویداد خاص */
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  canDispatch(event) {
    const allowed = TRANSITIONS[event];
    return Array.isArray(allowed) && allowed.includes(this.state);
  }

  /**
   * ارسال یک رویداد چرخه‌ی حیات.
   * @returns {boolean} true اگر گذار انجام شد
   */
  dispatch(event) {
    const target = this.nextState(event);

    if (target === null) {
      // گذار بی‌اثر (idempotent no-op)؟ خطا نیست، فقط نادیده بگیر.
      const noop = IDEMPOTENT_NO_OPS[event];
      if (Array.isArray(noop) && noop.includes(this.state)) {
        console.info(`[Lifecycle] ignored redundant event ${event} in state ${this.state}`);
        return false;
      }
      // گذار واقعاً نامعتبر
      const message = `[Lifecycle] rejected invalid transition ${this.state} -> ${event}`;
      console.warn(message);
      if (this.onError) this.onError(message, { from: this.state, event });
      return false;
    }

    const from = this.state;
    this.state = target;
    console.debug(`[Lifecycle] ${from} -${event}-> ${target}`);
    if (this.onTransition) this.onTransition(from, target, event);
    this.listeners.get(event)?.forEach((fn) => {
      try { fn(from, target); } catch (e) { console.error('[Lifecycle] listener error:', e); }
    });
    return true;
  }

  nextState(event) {
    const allowed = TRANSITIONS[event];
    if (!allowed || !allowed.includes(this.state)) return null;
    switch (event) {
      case LifecycleEvent.LOAD: return GameState.READY;
      case LifecycleEvent.START:
      case LifecycleEvent.RESUME: return GameState.PLAYING;
      case LifecycleEvent.PAUSE: return GameState.PAUSED;
      case LifecycleEvent.STOP: return GameState.READY;
      case LifecycleEvent.FINISH: return GameState.GAME_OVER;
      case LifecycleEvent.RESET: return GameState.READY;
      default: return null;
    }
  }

  /* ---------- متد‌های راحتی ---------- */

  load()   { return this.dispatch(LifecycleEvent.LOAD); }
  /**
   * شروع بازی. اگر در حالت PLAYING باشیم، به‌جای ثبت خطای
   * "PLAYING -> START"، یک restart امن انجام می‌دهد (اختیاری).
   */
  start(autoRestart = false) {
    if (autoRestart && this.state === GameState.PLAYING) {
      return this.restart();
    }
    return this.dispatch(LifecycleEvent.START);
  }
  pause()  { return this.dispatch(LifecycleEvent.PAUSE); }
  resume() { return this.dispatch(LifecycleEvent.RESUME); }
  stop()   { return this.dispatch(LifecycleEvent.STOP); }
  finish() { return this.dispatch(LifecycleEvent.FINISH); }

  /** شروع دوباره از هر حالتی: RESET سپس START (همیشه مجاز) */
  restart() {
    this.dispatch(LifecycleEvent.RESET);
    return this.dispatch(LifecycleEvent.START);
  }

  get isPlaying()  { return this.state === GameState.PLAYING; }
  get isPaused()   { return this.state === GameState.PAUSED; }
  get isReady()    { return this.state === GameState.READY; }
  get isGameOver() { return this.state === GameState.GAME_OVER; }
}

export default GameLifecycle;
