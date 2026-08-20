import { useEffect, useMemo, useState } from 'react';
import SnakeGame from './components/SnakeGame';
import { DIFFICULTIES, DIFF_ORDER, faNum, type DifficultyId } from './game/engine';
import { sfx } from './game/audio';

type Bests = Record<DifficultyId, number>;

const loadBests = (): Bests => {
  const out: Bests = { easy: 0, normal: 0, hard: 0, hell: 0 };
  for (const id of DIFF_ORDER) {
    try {
      const v = parseInt(localStorage.getItem(`shabtab-best-${id}`) || '0', 10);
      if (!Number.isNaN(v)) out[id] = v;
    } catch { /* ignore */ }
  }
  return out;
};

const LogoMark = () => (
  <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden>
    <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#0f2a1f" stroke="rgba(190,242,100,0.35)" strokeWidth="1.5" />
    <path d="M12 34 Q12 22 24 22 Q36 22 36 13" stroke="#bef264" strokeWidth="6.5" strokeLinecap="round" fill="none" />
    <circle cx="36" cy="13" r="4.6" fill="#d9f99d" />
    <circle cx="37.6" cy="11.8" r="1.1" fill="#1a2e05" />
    <circle cx="13" cy="36" r="3" fill="#fb7185" />
    <circle cx="12" cy="35" r="1" fill="#ffe4e6" />
  </svg>
);

const SpeakerIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" className="fill-current" stroke="none" />
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

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" className="flame-flicker h-4 w-4 fill-berry-400" aria-hidden>
    <path d="M12 2s6 5.4 6 11a6 6 0 0 1-12 0c0-2.5 1-4.4 2.3-6 .4 1.1 1 1.9 1.9 2.4C10.1 7.6 10.8 4.8 12 2Z" />
  </svg>
);

const SpeedDots = ({ n, hot }: { n: number; hot?: boolean }) => (
  <span className="flex items-center gap-1" aria-hidden>
    {[1, 2, 3, 4].map((i) => (
      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= n ? (hot ? 'bg-berry-400' : 'bg-firefly-400') : 'bg-moss-300/15'}`} />
    ))}
  </span>
);

export default function App() {
  const [diffId, setDiffId] = useState<DifficultyId>(() => {
    try {
      const v = localStorage.getItem('shabtab-diff') as DifficultyId | null;
      return v && DIFF_ORDER.includes(v) ? v : 'normal';
    } catch { return 'normal'; }
  });
  const [bests, setBests] = useState<Bests>(loadBests);
  const [muted, setMuted] = useState<boolean>(() => {
    try { return localStorage.getItem('shabtab-muted') === '1'; } catch { return false; }
  });

  useEffect(() => { sfx.muted = muted; try { localStorage.setItem('shabtab-muted', muted ? '1' : '0'); } catch { /* ignore */ } }, [muted]);
  useEffect(() => { try { localStorage.setItem('shabtab-diff', diffId); } catch { /* ignore */ } }, [diffId]);

  const handleGameOver = (score: number) => {
    setBests((prev) => {
      if (score <= prev[diffId]) return prev;
      const next = { ...prev, [diffId]: score };
      try { localStorage.setItem(`shabtab-best-${diffId}`, String(score)); } catch { /* ignore */ }
      return next;
    });
  };

  const fireflies = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        left: `${6 + ((i * 37) % 88)}%`,
        top: `${18 + ((i * 53) % 70)}%`,
        dur: `${11 + (i % 5) * 2.4}s`,
        delay: `${(i * 1.7) % 8}s`,
        scale: 0.7 + ((i * 13) % 10) / 12,
      })),
    [],
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient layers */}
      <div className="bg-dots pointer-events-none fixed inset-0 z-0" />
      <div className="orb orb-emerald -top-32 left-[-10rem] h-[30rem] w-[30rem]" />
      <div className="orb orb-amber right-[-8rem] top-1/3 h-[26rem] w-[26rem]" />
      <div className="orb orb-teal bottom-[-10rem] left-1/4 h-[24rem] w-[24rem]" />
      <div className="orb orb-rose right-1/4 top-[-8rem] h-[20rem] w-[20rem]" />
      {fireflies.map((f, i) => (
        <span
          key={i}
          className="firefly"
          style={{ left: f.left, top: f.top, transform: `scale(${f.scale})`, ['--dur' as string]: f.dur, ['--delay' as string]: f.delay }}
        />
      ))}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-6 pt-5 sm:px-6">
        {/* header */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <h1 className="font-display text-2xl leading-7 text-mist-100 sm:text-3xl sm:leading-8">
                مارِ <span className="text-moss-300">شب‌تاب</span>
              </h1>
              <p className="text-[11px] text-mist-500 sm:text-xs">بازی کلاسیک مار در جنگلِ شب‌تاب‌ها — حالا با حالت جهنمی!</p>
            </div>
          </div>
          <button
            onClick={() => { sfx.unlock(); setMuted((m) => !m); }}
            aria-label={muted ? 'پخش صدا' : 'قطع صدا'}
            title={muted ? 'پخش صدا (M)' : 'قطع صدا (M)'}
            className={`grid h-10 w-10 place-items-center rounded-lg border transition active:scale-90 ${
              muted
                ? 'border-berry-500/40 bg-berry-500/10 text-berry-400'
                : 'border-moss-300/15 bg-pine-800 text-moss-200 hover:border-moss-300/40 hover:bg-pine-700'
            }`}
          >
            <SpeakerIcon muted={muted} />
          </button>
        </header>

        {/* main */}
        <main className="grid flex-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <SnakeGame
            diff={DIFFICULTIES[diffId]}
            best={bests[diffId]}
            onDiffChange={setDiffId}
            onGameOver={handleGameOver}
            onToggleMute={() => setMuted((m) => !m)}
          />

          {/* sidebar */}
          <aside className="flex flex-col gap-4">
            {/* difficulty */}
            <section className="rounded-xl border border-moss-300/10 bg-pine-900/80 p-4">
              <h3 className="font-display mb-3 text-xl text-mist-100">دشواری</h3>
              <div className="flex flex-col gap-2">
                {DIFF_ORDER.map((id) => {
                  const d = DIFFICULTIES[id];
                  const active = id === diffId;
                  const hot = id === 'hell';
                  return (
                    <button
                      key={id}
                      onClick={() => { sfx.unlock(); sfx.ui(); setDiffId(id); }}
                      className={`group flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-start transition active:scale-[0.98] ${
                        active
                          ? hot
                            ? 'border-berry-500/50 bg-pine-700 shadow-[0_0_24px_rgba(244,63,94,0.16)]'
                            : 'border-moss-300/50 bg-pine-700 shadow-[0_0_24px_rgba(190,242,100,0.12)]'
                          : 'border-moss-300/10 bg-pine-800/60 hover:border-moss-300/30 hover:bg-pine-800'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${active ? (hot ? 'border-berry-400' : 'border-moss-300') : 'border-mist-500/50'}`}>
                          {active && <span className={`h-2 w-2 rounded-full ${hot ? 'bg-berry-400' : 'bg-moss-300'}`} />}
                        </span>
                        <span>
                          <span className={`flex items-center gap-1.5 text-sm font-black ${active ? (hot ? 'text-berry-400' : 'text-moss-200') : 'text-mist-100'}`}>
                            {hot && <FlameIcon />}
                            {d.label}
                          </span>
                          <span className="block text-[11px] text-mist-500">{d.desc}</span>
                        </span>
                      </span>
                      <SpeedDots n={d.dots} hot={hot} />
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-mist-500">
                تغییر دشواری، زمین بازی را از نو می‌چیند. هر شکار کمی به سرعت مار اضافه می‌کند!
              </p>
            </section>

            {/* records */}
            <section className="rounded-xl border border-moss-300/10 bg-pine-900/80 p-4">
              <h3 className="font-display mb-3 flex items-center gap-2 text-xl text-mist-100">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-firefly-400" aria-hidden>
                  <path d="M5 3h14v2h3v3a5 5 0 0 1-4.5 4.97A6 6 0 0 1 13 16.9V19h3v2H8v-2h3v-2.1a6 6 0 0 1-4.5-3.93A5 5 0 0 1 2 8V5h3V3Zm0 4H4v1a3 3 0 0 0 1 2.24V7Zm14 0v3.24A3 3 0 0 0 20 8V7h-1Z" />
                </svg>
                رکوردها
              </h3>
              <ul className="flex flex-col gap-1.5">
                {DIFF_ORDER.map((id) => {
                  const active = id === diffId;
                  const b = bests[id];
                  return (
                    <li
                      key={id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                        active ? 'bg-pine-700/80 text-moss-200' : 'text-mist-400'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {id === 'hell' && <FlameIcon />}
                        {DIFFICULTIES[id].label}
                      </span>
                      <span key={b} className={`font-display text-lg ${b > 0 ? 'score-pop text-firefly-300' : 'text-mist-500'}`}>
                        {b > 0 ? faNum(b) : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11px] text-mist-500">رکوردها روی همین مرورگر ذخیره می‌شوند.</p>
            </section>

            {/* guide */}
            <section className="rounded-xl border border-moss-300/10 bg-pine-900/80 p-4">
              <h3 className="font-display mb-3 text-xl text-mist-100">راهنمای کنترل</h3>
              <ul className="flex flex-col gap-2.5 text-xs text-mist-400">
                <li className="flex items-center justify-between gap-2">
                  <span>حرکت مار</span>
                  <span className="flex items-center gap-1">
                    <span className="kbd">↑↓←→</span>
                    <span className="text-mist-500">/</span>
                    <span className="kbd">WASD</span>
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>مکث و ادامه</span>
                  <span className="flex items-center gap-1"><span className="kbd">Space</span><span className="kbd">P</span></span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>شروع دوباره</span>
                  <span className="flex items-center gap-1"><span className="kbd">R</span><span className="kbd">Enter</span></span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>قطع و وصل صدا</span>
                  <span className="kbd">M</span>
                </li>
                <li className="mt-1 flex items-start gap-2 rounded-lg bg-pine-800/70 p-2.5 leading-5">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 fill-none stroke-fern-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
                    <path d="M11 18h2" />
                  </svg>
                  <span>
                    روی موبایل سه شیوه‌ی کنترل داری: <b className="text-mist-100">لمسی</b> (سُویپ روی زمین)،{' '}
                    <b className="text-mist-100">دسته‌ی مجازی</b> (دکمه‌های جهت) و <b className="text-mist-100">فقط کیبورد</b>.
                  </span>
                </li>
                <li className="flex items-start gap-2 rounded-lg border border-berry-500/20 bg-berry-500/8 p-2.5 leading-5 text-berry-400/90">
                  <FlameIcon />
                  <span>
                    <b className="text-berry-400">حالت جهنمی:</b> تاچ و دسته‌ی مجازی قفل می‌شوند؛ فقط با جهت‌نمای کیبورد بازی کن!
                  </span>
                </li>
              </ul>
            </section>
          </aside>
        </main>

        {/* footer */}
        <footer className="mt-6 flex items-center justify-between border-t border-moss-300/10 pt-4 text-[11px] text-mist-500">
          <span>مارِ شب‌تاب — ساخته‌شده برای مرورگر، دسکتاپ و موبایل</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-fern-400" />
            آماده‌ی بازی
          </span>
        </footer>
      </div>
    </div>
  );
}
