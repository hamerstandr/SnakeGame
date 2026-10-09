/**
 * TicTacToe — بازی دوز (X / O)
 * ----------------------------
 * نسخه‌ی سالمِ «اجرا نشدن بازی tictactoe»:
 * مشکل قبلی این بود که با کلیک روی خانه یا دکمه‌ی «شروع دوباره» در حالی که
 * بازی در حالت PLAYING بود، رویداد START به GameLifecycle ارسال می‌شد و
 * گذار «PLAYING -> START» رد می‌گشت؛ در نتیجه هیچ حرکتی ثبت نمی‌شد.
 *
 * در این نسخه:
 *  - تمام تغییرات حالت فقط از طریق GameLifecycle انجام می‌شود.
 *  - start() اگر بازی همین حالا در حال اجرا باشد، بی‌اثر است (بدون خطا).
 *  - restart() همیشه امن است: RESET سپس START.
 */

import { GameLifecycle, GameState, LifecycleEvent } from './GameLifecycle.js';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // سطرها
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // ستون‌ها
  [0, 4, 8], [2, 4, 6],            // قطرها
];

export function findWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}

export function isBoardFull(board) {
  return board.every((cell) => cell !== null);
}

export class TicTacToe {
  constructor(options = {}) {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.scores = { X: 0, O: 0, draw: 0 };
    this.winningLine = null;
    this.lifecycle = new GameLifecycle({ initial: GameState.BOOT });
    this.onChange = options.onChange || null; // callback برای UI

    // BOOT -> READY تا اولین گامِ start() مجاز باشد
    this.lifecycle.load();

    this.lifecycle.on(LifecycleEvent.RESET, () => this.#newRound());
  }

  get state() {
    return this.lifecycle.state;
  }

  #emit() {
    if (this.onChange) this.onChange(this);
  }

  #newRound() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winningLine = null;
  }

  /** شروع بازی. اگر همین حالا در حال اجراست، بی‌اثر است (رفع خطای PLAYING -> START) */
  start() {
    if (this.lifecycle.state === GameState.PLAYING) {
      console.info('[TicTacToe] already playing — start() ignored (no error)');
      return false;
    }
    const ok = this.lifecycle.start();
    if (ok) this.#emit();
    return ok;
  }

  /** شروع دوباره‌ی امن از هر حالتی */
  restart() {
    const ok = this.lifecycle.restart();
    this.#emit();
    return ok;
  }

  pause() {
    const ok = this.lifecycle.pause();
    if (ok) this.#emit();
    return ok;
  }

  resume() {
    const ok = this.lifecycle.resume();
    if (ok) this.#emit();
    return ok;
  }

  /**
   * ثبت حرکت در خانه‌ی index.
   * @returns {{moved:boolean, reason?:string}}
   */
  move(index) {
    if (!Number.isInteger(index) || index < 0 || index > 8) {
      return { moved: false, reason: 'invalid-index' };
    }
    if (this.lifecycle.state !== GameState.PLAYING) {
      // به‌جای خطا، اگر بازی آماده است خودکار شروع شود
      if (this.lifecycle.state === GameState.READY) {
        this.lifecycle.start();
      } else if (this.lifecycle.state === GameState.PAUSED) {
        return { moved: false, reason: 'paused' };
      } else if (this.lifecycle.state === GameState.GAME_OVER) {
        return { moved: false, reason: 'game-over' };
      } else {
        return { moved: false, reason: `bad-state:${this.lifecycle.state}` };
      }
    }
    if (this.board[index]) {
      return { moved: false, reason: 'occupied' };
    }

    this.board[index] = this.currentPlayer;

    const win = findWinner(this.board);
    if (win) {
      this.winningLine = win.line;
      this.scores[win.player] += 1;
      this.lifecycle.finish();
      this.#emit();
      return { moved: true, winner: win.player, line: win.line };
    }
    if (isBoardFull(this.board)) {
      this.scores.draw += 1;
      this.lifecycle.finish();
      this.#emit();
      return { moved: true, winner: 'draw' };
    }

    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    this.#emit();
    return { moved: true };
  }

  /* ---------- هوش مصنوعی ساده (حریف کامپیوتر) ---------- */

  bestMove(player = this.currentPlayer) {
    const opponent = player === 'X' ? 'O' : 'X';
    const empty = this.board.map((c, i) => (c ? null : i)).filter((i) => i !== null);

    // 1) برد فوری
    for (const i of empty) {
      const copy = [...this.board];
      copy[i] = player;
      if (findWinner(copy)?.player === player) return i;
    }
    // 2) بلاک کردن برد حریف
    for (const i of empty) {
      const copy = [...this.board];
      copy[i] = opponent;
      if (findWinner(copy)?.player === opponent) return i;
    }
    // 3) مرکز، سپس گوشه‌ها
    if (empty.includes(4)) return 4;
    const corners = [0, 2, 6, 8].filter((i) => empty.includes(i));
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    return empty[Math.floor(Math.random() * empty.length)];
  }

  aiMove(player = this.currentPlayer) {
    const idx = this.bestMove(player);
    return this.move(idx);
  }
}

export { GameLifecycle, GameState, LifecycleEvent };
export default TicTacToe;
