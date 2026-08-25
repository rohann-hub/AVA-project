import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   WHEEL GEOMETRY (verified against the segment paths)

     circle centre  = (500, -135) in viewBox units
                    = 50%, -25.9615% of the 1000x520 viewBox
     outer radius   = 790
     inner radius   = 240
     label radius   = 560, one every 36deg

   The container MUST keep the viewBox's 1000:520 ratio, otherwise the
   SVG letterboxes while the percentage-positioned labels do not, and
   the two drift apart. Widths are declared per breakpoint and the
   height comes from `aspect-[1000/520]` so the ratio can't be broken
   by editing one number.
------------------------------------------------------------------- */
const SEGMENT_COUNT = 10;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

const SEGMENT_PATHS = [
  'M 744.1234 616.3346 A 790 790 0 0 1 255.8766 616.3346 L 425.8359 93.2536 A 240 240 0 0 0 574.1641 93.2536 Z',
  'M 255.8766 616.3346 A 790 790 0 0 1 -139.1234 329.3503 L 305.8359 6.0685 A 240 240 0 0 0 425.8359 93.2536 Z',
  'M -139.1234 329.3503 A 790 790 0 0 1 -290.0000 -135.0000 L 260.0000 -135.0000 A 240 240 0 0 0 305.8359 6.0685 Z',
  'M -290.0000 -135.0000 A 790 790 0 0 1 -139.1234 -599.3503 L 305.8359 -276.0685 A 240 240 0 0 0 260.0000 -135.0000 Z',
  'M -139.1234 -599.3503 A 790 790 0 0 1 255.8766 -886.3346 L 425.8359 -363.2536 A 240 240 0 0 0 305.8359 -276.0685 Z',
  'M 255.8766 -886.3346 A 790 790 0 0 1 744.1234 -886.3346 L 574.1641 -363.2536 A 240 240 0 0 0 425.8359 -363.2536 Z',
  'M 744.1234 -886.3346 A 790 790 0 0 1 1139.1234 -599.3503 L 694.1641 -276.0685 A 240 240 0 0 0 574.1641 -363.2536 Z',
  'M 1139.1234 -599.3503 A 790 790 0 0 1 1290.0000 -135.0000 L 740.0000 -135.0000 A 240 240 0 0 0 694.1641 -276.0685 Z',
  'M 1290.0000 -135.0000 A 790 790 0 0 1 1139.1234 329.3503 L 694.1641 6.0685 A 240 240 0 0 0 740.0000 -135.0000 Z',
  'M 1139.1234 329.3503 A 790 790 0 0 1 744.1234 616.3346 L 574.1641 93.2536 A 240 240 0 0 0 694.1641 6.0685 Z'
];

const wheelItems = [
  {
    id: 0,
    title: 'Hospitality',
    desc: 'Reservations made easy, intelligent pre and post booking support and more!',
    icon: 'building-2',
    posStyle: { left: '50.0000%', top: '81.7308%' }
  },
  {
    id: 1,
    title: 'Real Estate',
    desc: 'Help customers discover properties, schedule viewings, answer buyer inquiries and guide them through every step.',
    icon: 'house',
    posStyle: { left: '17.0840%', top: '61.1634%' }
  },
  {
    id: 2,
    title: 'Education',
    desc: 'Simplify admissions, course inquiries and provide instant support with ease.',
    icon: 'graduation-cap',
    posStyle: { left: '-3.2592%', top: '7.3172%' }
  },
  {
    id: 3,
    title: 'Travel & Tourism',
    desc: 'From trip planning to bookings, LIA helps travelers explore, decide and book with ease.',
    icon: 'globe',
    posStyle: { left: '-3.2592%', top: '-59.2403%' }
  },
  {
    id: 4,
    title: 'Cruise Lines',
    desc: 'Ask LIA for cabin recommendations, promotions, and more!',
    icon: 'ship',
    posStyle: { left: '17.0840%', top: '-113.0864%' }
  },
  {
    id: 5,
    title: 'Airlines',
    desc: 'Hassle free flight bookings, live updates, and baggage information delivered instantly.',
    icon: 'plane',
    posStyle: { left: '50.0000%', top: '-133.6538%' }
  },
  {
    id: 6,
    title: 'FinTech',
    desc: 'Automate financial needs and handle inquiries with remarkable efficiency.',
    icon: 'landmark',
    posStyle: { left: '82.9160%', top: '-113.0864%' }
  },
  {
    id: 7,
    title: 'Healthcare',
    desc: 'Effortless appointment bookings, patient record management and smart FAQ handling!',
    icon: 'activity',
    posStyle: { left: '103.2592%', top: '-59.2403%' }
  },
  {
    id: 8,
    title: 'Others',
    desc: 'No matter the business, LIA adapts to any workflow, understands customer needs and provides instant, intelligent support.',
    icon: 'sparkles',
    posStyle: { left: '103.2592%', top: '7.3172%' }
  },
  {
    id: 9,
    title: 'Retail & eCommerce',
    desc: "Skyrocket sales with smart upselling and personalized promotions tailored to each shopper's preferences.",
    icon: 'shopping-bag',
    posStyle: { left: '82.9160%', top: '61.1634%' }
  }
];

// Item i sits at rim angle -36*i. A CSS rotate(W) moves it to -36*i - W.
// Whichever item lands nearest the bottom (angle 0) is the active one.
const mod = (n, m) => ((n % m) + m) % m;
const indexFromRotation = (deg) => mod(Math.round(-deg / SEGMENT_ANGLE), SEGMENT_COUNT);

export default function CinematicWheel() {
  const containerRef = useRef(null);
  const wheelRef = useRef(null);
  const detailsRef = useRef([]);

  // Live rotation, split into its two independent sources
  const rotationRef = useRef({ manual: 0, scroll: 0 });
  const reducedRef = useRef(false);

  const [activeSegment, setActiveSegment] = useState(0);

  // Only re-render when the index actually changes, not every scroll frame
  const syncActive = useCallback(() => {
    const { manual, scroll } = rotationRef.current;
    const next = indexFromRotation(manual + scroll);
    setActiveSegment((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const wheel = wheelRef.current;
    const details = detailsRef.current.filter(Boolean);

    if (!container || !wheel || details.length === 0) return;

    gsap.set(wheel, { '--scroll-rotation': '0deg', '--manual-rotation': '0deg' });
    gsap.set(details, { '--scroll-counter-rotation': '0deg', '--manual-counter-rotation': '0deg' });

    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedRef.current) return undefined;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: () =>
          `+=${
            window.innerWidth < 768
              ? Math.max(1.8 * window.innerHeight, 1100)
              : window.innerWidth < 1024
              ? Math.max(2.2 * window.innerHeight, 1500)
              : Math.max(2.65 * window.innerHeight, 1900)
          }`,
        scrub: 0.9,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // Mirrors the tween below: linear 0 -> -360 across the trigger
          rotationRef.current.scroll = -360 * self.progress;
          syncActive();
        }
      }
    });

    tl.to(wheel, { '--scroll-rotation': '-360deg', duration: 1 }, 0).to(
      details,
      { '--scroll-counter-rotation': '360deg', duration: 1 },
      0
    );

    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, [syncActive]);

  // Manual rotation is kept out of React state so rapid clicks can't queue
  // conflicting tweens; overwrite kills whatever is still running.
  const rotateBy = useCallback(
    (deltaDeg) => {
      const wheel = wheelRef.current;
      const details = detailsRef.current.filter(Boolean);
      if (!wheel || details.length === 0) return;

      rotationRef.current.manual += deltaDeg;
      const { manual } = rotationRef.current;
      const duration = reducedRef.current ? 0 : 0.95;

      gsap.to(wheel, {
        '--manual-rotation': `${manual}deg`,
        duration,
        ease: 'power3.out',
        overwrite: 'auto'
      });

      gsap.to(details, {
        '--manual-counter-rotation': `${-manual}deg`,
        duration,
        ease: 'power3.out',
        overwrite: 'auto'
      });

      syncActive();
    },
    [syncActive]
  );

  // Kill any in-flight manual tweens if the component goes away
  useEffect(
    () => () => {
      const targets = [wheelRef.current, ...detailsRef.current].filter(Boolean);
      if (targets.length) gsap.killTweensOf(targets);
    },
    []
  );

  const handleNext = () => rotateBy(-SEGMENT_ANGLE);
  const handlePrev = () => rotateBy(SEGMENT_ANGLE);

  const activeTitle = wheelItems[activeSegment]?.title ?? '';

  return (
    <section
      ref={containerRef}
      id="section-cinematic-project"
      className="relative isolate min-h-screen w-full overflow-hidden bg-[#231041] text-foreground light:bg-[#f3effc]"
    >
      <div className="relative h-screen w-full overflow-hidden bg-[#231041] light:bg-[#f3effc]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(63,24,188,0.92),transparent_28%),radial-gradient(circle_at_66%_36%,rgba(226,50,219,0.72),transparent_30%),linear-gradient(180deg,#231041_0%,#180d32_30%,#0a0518_58%,#000000_100%)] light:bg-[radial-gradient(circle_at_28%_22%,rgba(63,24,188,0.10),transparent_28%),radial-gradient(circle_at_66%_36%,rgba(226,50,219,0.08),transparent_30%),linear-gradient(180deg,#f8f6fc_0%,#f4f1fa_25%,#fbf9fd_55%,#ffffff_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-black via-black/90 to-transparent light:from-white light:via-white/90 light:to-transparent" />

        {/* Height is derived from the viewBox ratio — never hardcode it */}
        <div className="absolute left-1/2 top-[80px] aspect-[1000/520] w-[980px] -translate-x-1/2 sm:top-0 sm:w-[1180px] lg:top-[4px] lg:w-[1090px] 2xl:top-[-40px] 2xl:w-[1380px]">
          <div className="pointer-events-none absolute inset-x-[12%] bottom-[6%] h-40 rounded-[50%] bg-violet-700/18 light:bg-violet-400/12 blur-[70px]" />

          {/* THE WHEEL */}
          <div
            ref={wheelRef}
            data-cinematic-wheel="true"
            className="absolute inset-0"
            style={{
              '--manual-rotation': '0deg',
              '--scroll-rotation': '0deg',
              transform: 'rotate(calc(var(--manual-rotation) + var(--scroll-rotation)))',
              transformOrigin: '50% -25.9615%',
              willChange: 'transform'
            }}
          >
            <svg aria-hidden="true" className="h-full w-full overflow-visible" viewBox="0 0 1000 520">
              <defs>
                <linearGradient id="cinematicGlassBase" x1="0%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#060115" stopOpacity="0.62" />
                  <stop offset="100%" stopColor="#04010f" stopOpacity="0.56" />
                </linearGradient>
                <linearGradient id="cinematicColorBleed" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e232db" stopOpacity="0.20" />
                  <stop offset="50%" stopColor="#3f18bc" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#231041" stopOpacity="0.08" />
                </linearGradient>
                <linearGradient id="cinematicSpecular" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
                  <stop offset="10%" stopColor="#ffffff" stopOpacity="0.05" />
                  <stop offset="30%" stopColor="#ffffff" stopOpacity="0.01" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="cinematicRimGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                  <stop offset="38%" stopColor="#e232db" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#3f18bc" stopOpacity="0.18" />
                </linearGradient>
              </defs>

              {SEGMENT_PATHS.map((pathD, idx) => {
                const isActive = idx === activeSegment;
                return (
                  <g
                    key={idx}
                    className="cps-wheel-glass transition-opacity duration-300"
                    data-active={isActive ? 'true' : 'false'}
                    style={{ opacity: isActive ? 1 : 0.62 }}
                  >
                    <path d={pathD} fill="url(#cinematicGlassBase)" />
                    <path d={pathD} fill="url(#cinematicColorBleed)" />
                    <path d={pathD} fill="url(#cinematicSpecular)" />
                    <path
                      className="cps-wheel-divider"
                      d={pathD}
                      fill="none"
                      stroke="#231041"
                      strokeLinejoin="round"
                      strokeWidth="3"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="url(#cinematicRimGlow)"
                      strokeOpacity={isActive ? 1 : 0.9}
                      strokeWidth={isActive ? 1.4 : 0.7}
                    />
                    <path
                      className="cps-wheel-hairline"
                      d={pathD}
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity="0.07"
                      strokeWidth="0.4"
                    />
                  </g>
                );
              })}
            </svg>

            {/* SEGMENT DETAILS (UPRIGHT LABELS) */}
            {wheelItems.map((item, idx) => {
              const isActive = idx === activeSegment;
              return (
                <div
                  key={item.id}
                  ref={(el) => (detailsRef.current[idx] = el)}
                  className="pointer-events-none absolute w-[190px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 sm:w-[210px] lg:w-[220px] 2xl:w-[250px]"
                  style={{
                    ...item.posStyle,
                    '--manual-counter-rotation': '0deg',
                    '--scroll-counter-rotation': '0deg',
                    opacity: isActive ? 1 : 0.55
                  }}
                >
                  <div
                    className="flex flex-col items-center text-center text-foreground drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] light:drop-shadow-none"
                    style={{
                      transform:
                        'rotate(calc(var(--manual-counter-rotation) + var(--scroll-counter-rotation)))',
                      willChange: 'transform'
                    }}
                  >
                    <div
                      className={`mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-xl border bg-gradient-to-br from-[#3f18bc]/50 to-[#07030f]/80 transition-shadow duration-300 light:bg-gradient-to-br light:from-white light:to-[#f3effc] sm:h-[80px] sm:w-[80px] lg:h-[84px] lg:w-[84px] 2xl:h-[92px] 2xl:w-[92px] ${
                        isActive
                          ? 'border-violet-200/45 shadow-[inset_0_0_18px_rgba(177,92,255,0.22),0_0_38px_rgba(168,85,247,0.6)] light:border-violet-300 light:shadow-[inset_0_0_18px_rgba(177,92,255,0.12),0_6px_28px_rgba(120,80,200,0.28)]'
                          : 'border-violet-200/20 shadow-[inset_0_0_18px_rgba(177,92,255,0.12),0_0_24px_rgba(168,85,247,0.34)] light:border-violet-200/70 light:shadow-[inset_0_0_18px_rgba(177,92,255,0.06),0_4px_20px_rgba(120,80,200,0.16)]'
                      }`}
                    >
                      {renderIndustryIcon(item.icon)}
                    </div>

                    <h3 className="text-[0.95rem] font-semibold leading-tight tracking-[-0.02em] text-foreground light:text-[#1e1442] sm:text-[1.05rem] lg:text-[1.1rem] 2xl:text-[1.25rem]">
                      {item.title}
                    </h3>
                    <span className="mt-1.5 block h-0.5 w-10 bg-gradient-to-r from-[#ffb066] via-fuchsia-400 to-transparent" />
                    <p className="mt-1.5 max-w-[200px] text-[0.72rem] leading-[1.4] text-foreground/60 light:text-[#4b4560]/85 sm:text-[0.80rem] sm:leading-5 lg:text-[0.87rem] 2xl:text-[0.92rem]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core Central Display Node */}
          <div className="pointer-events-none absolute left-1/2 top-[-295px] h-[490px] w-[570px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#0c0422] via-[#080318] to-[#030110] shadow-[0_20px_80px_rgba(0,0,0,0.95),0_0_60px_rgba(63,24,188,0.10),inset_0_0_30px_rgba(63,24,188,0.05)] ring-1 ring-violet-900/15 light:from-white light:via-white light:to-white light:shadow-none light:ring-0 sm:top-[-352px] sm:h-[610px] sm:w-[695px] lg:top-[-322px] lg:h-[576px] lg:w-[628px] 2xl:top-[-420px] 2xl:h-[750px] 2xl:w-[830px]" />

          <div className="pointer-events-none absolute left-1/2 top-[10px] z-10 -translate-x-1/2 text-center sm:top-[95px] lg:top-[70px] 2xl:top-[110px]">
            <p className="text-[0.55rem] font-medium uppercase tracking-[0.32em] text-foreground/35 light:text-[#4b4560]/70 sm:text-[0.6rem]">
              Built for every industry
            </p>
            <div
              aria-label="LIA"
              className="mx-auto mt-6 h-[40px] w-[80px] bg-white light:bg-[#3f18bc] sm:h-[55px] sm:w-[110px] lg:h-[60px] lg:w-[120px] 2xl:h-[80px] 2xl:w-[160px]"
              role="img"
              style={{
                WebkitMaskImage: "url('/logo/lia white 1.png')",
                maskImage: "url('/logo/lia white 1.png')",
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center'
              }}
            />
            <p className="mt-5 text-[0.55rem] uppercase tracking-[0.22em] text-foreground/38 light:text-[#4b4560]/60 sm:mt-7 sm:text-[0.62rem]">
              Voice AI Platform
            </p>
          </div>
        </div>

        {/* Announce the active industry to assistive tech */}
        <p aria-live="polite" className="sr-only">
          {activeTitle}
        </p>

        {/* PREV & NEXT CONTROLS */}
        <div className="pointer-events-none absolute inset-x-0 top-[78%] z-20 flex items-center justify-between px-3 sm:px-6 lg:px-4">
          <button
            onClick={handlePrev}
            aria-label="Previous industry"
            className="pointer-events-auto flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-[0.78rem] font-semibold tracking-wide text-foreground/70 transition-all duration-300 hover:bg-violet-500/20 hover:text-foreground hover:shadow-[0_0_16px_rgba(139,92,246,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground sm:text-[0.88rem] lg:text-[0.95rem]"
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5 rotate-180 sm:h-4 sm:w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            <span>Prev</span>
          </button>
          <button
            onClick={handleNext}
            aria-label="Next industry"
            className="pointer-events-auto flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-[0.78rem] font-semibold tracking-wide text-foreground/70 transition-all duration-300 hover:bg-violet-500/20 hover:text-foreground hover:shadow-[0_0_16px_rgba(139,92,246,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground sm:text-[0.88rem] lg:text-[0.95rem]"
            type="button"
          >
            <span>Next</span>
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

const ICON_CLASS =
  'h-8 w-8 text-[#b15cff] drop-shadow-[0_0_12px_rgba(177,92,255,0.9)] light:text-[#7c3aed] light:drop-shadow-none sm:h-9 sm:w-9 2xl:h-10 2xl:w-10';

const ICON_PATHS = {
  'building-2': [
    'M10 12h4',
    'M10 8h4',
    'M14 21v-3a2 2 0 0 0-4 0v3',
    'M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2',
    'M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16'
  ],
  house: [
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'
  ],
  'graduation-cap': [
    'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z',
    'M22 10v6',
    'M6 12.5V16a6 3 0 0 0 12 0v-3.5'
  ],
  globe: ['M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20'],
  ship: [
    'M12 10.189V14',
    'M12 2v3',
    'M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6',
    'M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76',
    'M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1'
  ],
  plane: [
    'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'
  ],
  landmark: [
    'M10 18v-7',
    'M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z',
    'M14 18v-7',
    'M18 18v-7',
    'M3 22h18',
    'M6 18v-7'
  ],
  activity: [
    'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2'
  ],
  sparkles: [
    'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z',
    'M20 2v4',
    'M22 4h-4'
  ],
  'shopping-bag': [
    'M16 10a4 4 0 0 1-8 0',
    'M3.103 6.034h17.794',
    'M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z'
  ]
};

// The two icons that also need a <circle>
const ICON_CIRCLES = {
  globe: [{ cx: 12, cy: 12, r: 10 }],
  sparkles: [{ cx: 4, cy: 20, r: 2 }]
};

function renderIndustryIcon(iconName) {
  const paths = ICON_PATHS[iconName];
  if (!paths) return null;
  const circles = ICON_CIRCLES[iconName] || [];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON_CLASS}
    >
      {circles.map((c, i) => (
        <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} />
      ))}
      {paths.map((d, i) => (
        <path key={`p${i}`} d={d} />
      ))}
    </svg>
  );
}
