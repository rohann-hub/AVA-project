import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   WHEEL GEOMETRY

   Cards are bolted to the rim of one big wheel whose hub sits directly
   below the viewport centre, R pixels down. Scrolling rotates the wheel.

       theta  > 0    -> card still climbing, on the RIGHT
       theta  = 0    -> card at top of wheel: centred, upright
       theta  < 0    -> card has swung past centre, exiting LEFT

       x   =  R * sin(theta)
       y   =  R * (1 - cos(theta))     ... rim drops away either side
       rot =  theta                    ... rigid, so it tilts with the rim

   theta counts DOWN as progress rises, which is what carries cards
   right to left. Flip the numerator in the theta expression below to
   reverse the wheel.

   The rigid part matters: every card reads theta off the SAME wheel
   rotation, offset by a fixed WHEEL_STEP per card. Nothing animates
   independently, which is what makes it feel like one turning object
   instead of cards sliding past each other.

   R is derived from WHEEL_STEP and the horizontal separation we want,
   so the curvature always matches the spacing. Decoupling those two is
   exactly what flattened the arc before.
------------------------------------------------------------------- */
const WHEEL_STEP = 16;    // degrees of rim between adjacent cards
const WHEEL_VISIBLE = 24; // beyond this many degrees a card is gone
const WHEEL_FULL = 7;     // within this many degrees a card is fully opaque

const DEG = Math.PI / 180;

/* Scroll windows -------------------------------------------------- */
const CARD_START = 0.105; // progress at which card 0 is dead-centre
const CARD_STEP = 0.0715; // progress per card

// One caption may only live inside a single CARD_STEP of rim, otherwise
// two consecutive captions are on screen together and print over each
// other. Expressed in degrees so it stays locked to the wheel.
const CAPTION_HALF_DEG = WHEEL_STEP * 0.48;
const CAPTION_HOLD_DEG = 2.5;

/* Card geometry ---------------------------------------------------- */
const CARD_W = 545;       // design width  at scale 1
const CARD_H = 525;       // design height at scale 1  -> 1.038:1
const CARD_MIN_SCALE = 0.62;
const CARD_RADIUS = 34;   // single radius — no inner shell, so no dark rim
const RIM_SCALE = 0.16;   // how much a card shrinks by the time it leaves

/* Caption block ---------------------------------------------------- */
const CAPTION_H = 165;    // measured height of tag + title + description
const CAPTION_GAP = 44;   // clears the corner of a rotated neighbour card
const GROUP_SHIFT = (CAPTION_H + CAPTION_GAP) / 2; // lifts card+caption as one unit

/* Timeline split --------------------------------------------------- */
const REVEAL_END = 0.10;  // clip-path reveal finishes here
const CARDS_START = 0.22;
const CARDS_END = 0.99;

const featuresData = [
  {
    index: 0,
    title: 'Ultra-Low Latency Engine',
    tag: 'PERFORMANCE',
    desc: 'Engineered with a proprietary pipeline executing turn-taking at under 120ms. Completely eliminates awkward conversational pauses.',
    tone: 0.10,
    cardType: 'latency'
  },
  {
    index: 1,
    title: 'Human-Grade Emulation',
    tag: 'CONVERSATION',
    desc: 'Simulates natural breath cycles, thoughtful pauses, and tone variations. Our agents sound warm, professional, and completely organic.',
    tone: 0.40,
    cardType: 'humanvoice'
  },
  {
    index: 2,
    title: 'Dynamic CRM Synchrony',
    tag: 'INTEGRATIONS',
    desc: 'Plugs directly into Salesforce, HubSpot, and custom REST databases to fetch and update client records live during calls.',
    tone: 0.00,
    cardType: 'crm'
  },
  {
    index: 3,
    title: 'Autonomic Scheduling',
    tag: 'SCHEDULING',
    desc: 'Seamlessly negotiates calendar conflicts and books hotel reservations, restaurant tables, or property tours directly into your scheduler.',
    tone: 0.85,
    cardType: 'scheduling'
  },
  {
    index: 4,
    title: 'Compliance & Security',
    tag: 'SECURITY',
    desc: 'Built-in compliance with HIPAA, PCI-DSS, and GDPR regulations. Fully encrypted call storage and biometric verification options.',
    tone: 0.95,
    cardType: 'security'
  },
  {
    index: 5,
    title: 'Omnichannel Integrations',
    tag: 'OMNICHANNEL',
    desc: 'Deploys across standard telephone trunks, VoIP infrastructures, browser WebRTC networks, and global calling APIs instantly.',
    tone: 0.55,
    cardType: 'omnichannel'
  },
  {
    index: 6,
    title: 'Call Monitoring',
    tag: 'MONITORING',
    desc: 'Gain full visibility into every live and recorded call. Real-time transcription, sentiment scoring, and keyword flagging keep your supervisors in complete command.',
    tone: 0.30,
    cardType: 'monitoring'
  },
  {
    index: 7,
    title: 'Appointment Scheduler',
    tag: 'APPOINTMENTS',
    desc: 'Intelligently negotiates availability, confirms bookings, and sends automated reminders—syncing seamlessly with Google Calendar, Outlook, and custom scheduling APIs.',
    tone: 0.70,
    cardType: 'appointments'
  },
  {
    index: 8,
    title: 'Virtual Call Center',
    tag: 'CALL CENTER',
    desc: 'Deploy an always-on AI-powered call center with intelligent queue routing, agent escalation protocols, and multi-agent parallel dialing at unlimited scale.',
    tone: 0.45,
    cardType: 'callcenter'
  }
];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ------------------------------------------------------------------
   CARD SURFACE

   One palette for all twelve cards. A card face is never a flat fill —
   it's a vertical violet-to-indigo ramp with a bright highlight bloomed
   in from the top edge, plus a violet/blue glow spilling past the rim.

     #9B45F5  highlight  top bloom
     #6A22F2  bright     upper face
     #3510C8  base       main body
     #211080  deep       lower face
     #16065A  shadow     bottom edge

   `tone` (0..1) slides a card along the family: 0 leans violet, 1 leans
   deep indigo. Every card stays inside the same five colours, so the set
   reads as one material rather than twelve unrelated swatches.
------------------------------------------------------------------- */
const HIGHLIGHT = [155, 69, 245]; // #9B45F5
const BRIGHT = [106, 34, 242]; // #6A22F2
const BASE = [53, 16, 200]; // #3510C8
const DEEP = [33, 16, 128]; // #211080
const SHADOW = [22, 6, 90]; // #16065A

const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = ([r, g, b], a) => (a === undefined ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${a})`);

function cardBackground(tone = 0.5) {
  const top = lerp(BRIGHT, BASE, tone * 0.55);
  const mid = lerp(BASE, DEEP, tone * 0.5);
  const low = lerp(DEEP, SHADOW, 0.35 + tone * 0.4);

  return [
    // top bloom — this is what keeps the face from reading as flat
    `radial-gradient(125% 82% at 50% -12%, ${rgb(HIGHLIGHT, 0.55 - tone * 0.22)} 0%, ${rgb(HIGHLIGHT, 0)} 58%)`,
    // faint cool wash bottom-left so the ramp isn't purely vertical
    `radial-gradient(90% 60% at 12% 108%, ${rgb(BASE, 0.35)} 0%, ${rgb(BASE, 0)} 60%)`,
    `linear-gradient(178deg, ${rgb(top)} 0%, ${rgb(mid)} 46%, ${rgb(low)} 78%, ${rgb(SHADOW)} 100%)`
  ].join(', ');
}

function cardGlow(tone = 0.5) {
  const halo = lerp(BRIGHT, BASE, tone);
  return [
    `0 34px 90px -24px ${rgb(halo, 0.62)}`, // drop
    `0 0 68px -14px ${rgb(BRIGHT, 0.42 - tone * 0.14)}`, // violet bloom
    `inset 0 1px 0 ${rgb([255, 255, 255], 0.16)}`, // top rim light
    `0 0 0 1px ${rgb([255, 255, 255], 0.07)}` // hairline
  ].join(', ');
}

/* ------------------------------------------------------------------
   GLOBAL KEYFRAMES — injected once
------------------------------------------------------------------- */
const KEYFRAMES_ID = 'features-reveal-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes fr-pulse-ring {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.15); opacity: 0; }
    }
    @keyframes fr-eq-bar {
      0%, 100% { transform: scaleY(0.35); }
      50% { transform: scaleY(1); }
    }
    @keyframes fr-orbit {
      0% { transform: rotate(0deg) translateX(var(--fr-orbit-r)) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(var(--fr-orbit-r)) rotate(-360deg); }
    }
    @keyframes fr-scan {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100%); }
    }
    @keyframes fr-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes fr-dash-flow {
      0% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: -20; }
    }
    @keyframes fr-glow-breathe {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
  `;
  document.head.appendChild(style);
}

export default function FeaturesReveal() {
  const sectionRef = useRef(null);
  const revealRef = useRef(null);
  const textLeftRef = useRef(null);
  const textRightRef = useRef(null);
  const cardRefs = useRef([]);
  const captionRefs = useRef([]);
  const layoutRef = useRef(null);

  useEffect(() => {
    injectKeyframes();

    const section = sectionRef.current;
    const reveal = revealRef.current;
    if (!section || !reveal) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* --- Layout: recomputed on resize, written straight to the DOM --- */
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Shrink uniformly if the viewport can't fit the design size.
      // Vertical budget also has to hold the caption block below the card.
      const scale = Math.max(
        CARD_MIN_SCALE,
        Math.min(1, (vh - CAPTION_H - CAPTION_GAP - 56) / CARD_H, (vw * 0.42) / CARD_W)
      );

      const cardW = Math.round(CARD_W * scale);
      const cardH = Math.round(CARD_H * scale);

      // How far apart adjacent cards should sit horizontally, then solve
      // for the rim radius that produces exactly that at WHEEL_STEP.
      // R falls out of the spacing, so curvature and spacing can never
      // drift apart the way separate ampX/ampY values did.
      const separation = Math.max(cardW * 1.5, Math.min(1100, vw * 0.58));
      const radius = separation / Math.sin(WHEEL_STEP * DEG);

      layoutRef.current = {
        cardW,
        cardH,
        radius,
        yOffset: -GROUP_SHIFT,
        captionTop: -GROUP_SHIFT + cardH / 2 + CAPTION_GAP
      };

      cardRefs.current.forEach((el) => {
        if (!el) return;
        el.style.width = `${cardW}px`;
        el.style.height = `${cardH}px`;
        el.style.marginLeft = `${-cardW / 2}px`;
        el.style.marginTop = `${-cardH / 2}px`;
      });
    };

    /* --- Per-frame write. No React re-render, no layout thrash. --- */
    const applyFrame = (raw) => {
      const L = layoutRef.current;
      if (!L) return;

      // Clip-path reveal
      const revealT = clamp01(raw / REVEAL_END);
      const eased = 1 - Math.pow(1 - revealT, 2);
      reveal.style.clipPath = `circle(${18 + 137 * eased}% at 50% 50%)`;
      reveal.style.opacity = String(Math.min(1, revealT * 6));
      reveal.style.visibility = revealT > 0 ? 'visible' : 'hidden';

      // Card sequence progress
      const progress = clamp01((raw - CARDS_START) / (CARDS_END - CARDS_START));

      if (textLeftRef.current) {
        textLeftRef.current.style.transform = `translate3d(${progress * -250 + 50}px,0,0)`;
      }
      if (textRightRef.current) {
        textRightRef.current.style.transform = `translate3d(${progress * 250 - 50}px,0,0)`;
      }

      for (let t = 0; t < featuresData.length; t++) {
        const el = cardRefs.current[t];
        const cap = captionRefs.current[t];
        if (!el || !cap) continue;

        // Every card reads its angle off the SAME wheel rotation, offset
        // by a fixed WHEEL_STEP. One rigid object, not 12 independent ones.
        // Numerator is (centre - progress) so theta counts down: positive
        // (right) before the card arrives, negative (left) after it leaves.
        const theta = ((CARD_START + CARD_STEP * t - progress) / CARD_STEP) * WHEEL_STEP;
        const absTheta = Math.abs(theta);

        if (absTheta >= WHEEL_VISIBLE) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          cap.style.opacity = '0';
          cap.style.visibility = 'hidden';
          continue;
        }

        const rad = theta * DEG;
        const x = L.radius * Math.sin(rad);
        const y = L.radius * (1 - Math.cos(rad)) + L.yOffset;

        // Depth: cards shrink and fade as they run off down the rim
        const along = absTheta / WHEEL_VISIBLE;
        const scale = 1 - RIM_SCALE * along;
        const cardOpacity = clamp01(
          (WHEEL_VISIBLE - absTheta) / (WHEEL_VISIBLE - WHEEL_FULL)
        );

        // Caption: locked to the rim, narrower than one WHEEL_STEP, so
        // exactly one is ever on screen
        let textOpacity = 0;
        if (absTheta <= CAPTION_HALF_DEG) {
          textOpacity =
            absTheta <= CAPTION_HOLD_DEG
              ? 1
              : (CAPTION_HALF_DEG - absTheta) / (CAPTION_HALF_DEG - CAPTION_HOLD_DEG);
        }

        // Whichever card is nearest the top of the wheel sits on top
        const z = 1 + Math.round((1 - along) * 100);

        el.style.opacity = String(cardOpacity);
        el.style.zIndex = String(z);
        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${theta}deg) scale(${scale})`;
        el.style.pointerEvents = absTheta < WHEEL_FULL ? 'auto' : 'none';

        cap.style.opacity = String(textOpacity);
        cap.style.transform = `translate3d(-50%, ${L.captionTop}px, 0)`;
        cap.style.visibility = textOpacity > 0.01 ? 'visible' : 'hidden';
      }
    };

    /* --- Desktop only. Mobile falls through to the static list. --- */
    const mm = gsap.matchMedia();

    mm.add('(min-width: 640px)', () => {
      measure();
      applyFrame(0);

      const st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: prefersReduced ? true : 1.05,
        invalidateOnRefresh: true,
        onRefresh: measure,
        onUpdate: (self) => applyFrame(self.progress)
      });

      return () => st.kill();
    });

    return () => mm.revert();
  }, []);

  return (
    /* overflow-hidden removed here — it was fighting position: sticky */
    <div ref={sectionRef} className="relative h-[600vh] bg-background">
      {/* Sticky viewport. Sticky does the pinning; GSAP only reports progress. */}
      <div
        ref={revealRef}
        className="sticky top-0 h-screen overflow-hidden bg-background hidden sm:block"
        style={{
          perspective: '1600px',
          clipPath: 'circle(18% at 50% 50%)',
          opacity: 0,
          visibility: 'hidden'
        }}
      >
        {/* Background gradients */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(80,33,172,0.12),transparent_55%),radial-gradient(circle_at_20%_70%,rgba(241,61,232,0.05),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(50,125,255,0.05),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-background to-transparent" />

        {/* Drifting outline type */}
        <div className="pointer-events-none select-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div
            ref={textLeftRef}
            className="font-poppins font-black block text-transparent will-change-transform"
            style={{
              fontSize: 'clamp(72px, 17vw, 260px)',
              lineHeight: 0.9,
              whiteSpace: 'nowrap',
              WebkitTextStroke: '1.5px rgba(135,54,247,0.35)'
            }}
          >
            OUR FEATURES &nbsp; ✦ &nbsp; OUR FEATURES &nbsp; ✦ &nbsp; OUR FEATURES
          </div>
          <div
            ref={textRightRef}
            className="font-poppins font-black block text-transparent will-change-transform"
            style={{
              fontSize: 'clamp(72px, 17vw, 260px)',
              lineHeight: 0.9,
              whiteSpace: 'nowrap',
              WebkitTextStroke: '1.5px rgba(135,54,247,0.35)'
            }}
          >
            POWERED BY AI &nbsp; ✦ &nbsp; POWERED BY AI &nbsp; ✦ &nbsp; POWERED BY AI
          </div>
        </div>

        {/* Cards — rendered once, animated by direct style writes */}
        <div className="absolute inset-0 z-20">
          {featuresData.map((f, t) => (
            <React.Fragment key={f.index}>
              <div
                ref={(el) => (cardRefs.current[t] = el)}
                className="absolute will-change-transform"
                style={{
                  left: '50%',
                  top: '50%',
                  opacity: 0,
                  pointerEvents: 'none',
                  transition: 'opacity 0.05s linear'
                }}
              >
                <div
                  className="w-full h-full overflow-hidden flex flex-col items-center justify-center p-6 text-white relative"
                  style={{
                    borderRadius: CARD_RADIUS,
                    background: cardBackground(f.tone),
                    boxShadow: cardGlow(f.tone)
                  }}
                >
                  {renderMockupContent(f.cardType)}
                </div>
              </div>

              <div
                ref={(el) => (captionRefs.current[t] = el)}
                className="absolute left-1/2 top-1/2 pointer-events-none z-[200] flex flex-col items-center text-center px-4 will-change-transform"
                style={{
                  width: '600px',
                  height: CAPTION_H,
                  opacity: 0,
                  visibility: 'hidden',
                  transition: 'opacity 0.1s linear'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-px w-4 bg-[#ffb066]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#ffb066]">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-poppins text-3xl font-bold uppercase text-foreground mb-4">
                  {f.title}
                </h3>
                <p className="max-w-md font-inter text-[0.85rem] leading-relaxed text-foreground/70">
                  {f.desc}
                </p>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile: plain vertical list */}
      <div className="block sm:hidden py-16 px-6 space-y-12 bg-background relative z-10">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#a855f7]">Features</span>
          <h2 className="text-3xl font-black font-poppins uppercase text-foreground mt-2">
            What LIA Can Do
          </h2>
        </div>

        {featuresData.map((f) => (
          <div key={f.index} className="space-y-4">
            <div
              className="w-full overflow-hidden flex flex-col items-center justify-center p-6 text-white relative"
              style={{
                aspectRatio: `${CARD_W} / ${CARD_H}`,
                borderRadius: CARD_RADIUS,
                background: cardBackground(f.tone),
                boxShadow: cardGlow(f.tone)
              }}
            >
              {renderMockupContent(f.cardType)}
            </div>

            <div className="text-left px-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-px w-3 bg-[#ffb066]" />
                <span className="text-[10px] font-bold uppercase text-[#ffb066]">{f.tag}</span>
              </div>
              <h3 className="font-poppins text-xl font-bold text-foreground">{f.title}</h3>
              <p className="font-inter text-xs text-foreground/60 mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ==================================================================
   CARD MOCKUP CONTENT
   Each card is a self-contained illustration that communicates the
   feature at a glance. Visual language: glass panels on dark, thin
   borders at white/10, accent pops from the card palette, subtle
   CSS-only animation for life.
   ================================================================== */

function renderMockupContent(type) {
  switch (type) {

    /* ──────────────────── 0 · LATENCY ──────────────────── */
    case 'latency':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-5 relative overflow-hidden">
          {/* Concentric pulse rings */}
          <div className="relative h-28 w-28 flex items-center justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border border-blue-400/25"
                style={{
                  animation: `fr-pulse-ring 2.4s ease-out infinite ${i * 0.8}s`,
                }}
              />
            ))}
            <div className="h-20 w-20 rounded-full bg-gradient-to-b from-blue-500/20 to-blue-600/5 border border-blue-400/30 flex items-center justify-center backdrop-blur-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>

          {/* Metric */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-[42px] font-black tracking-tight leading-none bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">120</span>
              <span className="text-sm font-medium text-white/50">ms</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-2">
              Turn-Taking Latency
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/30 border border-white/[0.06]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium text-emerald-300/90">Pipeline Active</span>
            <span className="h-3 w-px bg-white/10" />
            <span className="text-[11px] text-white/40">Zero-lag</span>
          </div>
        </div>
      );

    /* ──────────────────── 1 · HUMAN VOICE ──────────────────── */
    case 'humanvoice':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-5 px-2">
          {/* Header chip */}
          <div className="flex items-center justify-center gap-2">
            <div className="h-6 w-6 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.9)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Natural Voice Engine</span>
          </div>

          {/* Waveform visualizer */}
          <div className="flex items-end justify-center gap-[3px] h-20 px-4">
            {[0.3, 0.55, 0.85, 0.45, 0.7, 1, 0.6, 0.35, 0.75, 0.9, 0.5, 0.4, 0.65, 0.8, 0.3, 0.55, 0.45].map((h, i) => (
              <span
                key={i}
                className="w-[5px] rounded-full"
                style={{
                  height: `${h * 100}%`,
                  background: `linear-gradient(to top, rgba(139,92,246,0.3), rgba(139,92,246,0.8))`,
                  animation: `fr-eq-bar ${1.2 + (i % 5) * 0.15}s ease-in-out infinite ${i * 0.08}s`,
                  transformOrigin: 'bottom',
                }}
              />
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: 'Breath Cycles', icon: '🌬' },
              { label: 'Tone Shifts', icon: '🎵' },
              { label: 'Natural Pauses', icon: '⏸' },
            ].map(({ label, icon }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] font-medium text-white/70"
              >
                <span className="text-[10px]">{icon}</span>
                {label}
              </span>
            ))}
          </div>

          {/* Confidence bar */}
          <div className="mx-auto w-48">
            <div className="flex justify-between text-[9px] text-white/30 mb-1">
              <span>Organic Score</span>
              <span>98.6%</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: '98.6%' }} />
            </div>
          </div>
        </div>
      );

    /* ──────────────────── 2 · CRM ──────────────────── */
    case 'crm':
      return (
        <div className="w-full h-full flex items-center justify-center relative">
          {/* Centre hub */}
          <div className="h-[72px] w-[72px] rounded-2xl bg-gradient-to-br from-blue-600/80 to-indigo-700/80 border border-blue-300/20 flex items-center justify-center z-10 shadow-lg shadow-blue-500/20">
            <span className="text-base font-black tracking-tight">AVA</span>
          </div>

          {/* Orbiting connectors */}
          {[
            { name: 'Salesforce', angle: 225, color: 'from-sky-500/20 to-sky-600/10', borderColor: 'border-sky-400/25' },
            { name: 'HubSpot', angle: 315, color: 'from-orange-500/20 to-orange-600/10', borderColor: 'border-orange-400/25' },
            { name: 'REST API', angle: 90, color: 'from-emerald-500/20 to-emerald-600/10', borderColor: 'border-emerald-400/25' },
          ].map(({ name, angle, color, borderColor }) => {
            const rad = (angle * Math.PI) / 180;
            const r = 105;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            return (
              <div
                key={name}
                className={`absolute px-3.5 py-2 rounded-xl bg-gradient-to-b ${color} border ${borderColor} text-[10px] font-semibold text-white/80 backdrop-blur-sm`}
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                {name}
              </div>
            );
          })}

          {/* Animated connection lines (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {[225, 315, 90].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const r = 22;
              const ex = 50 + Math.cos(rad) * r;
              const ey = 50 + Math.sin(rad) * r;
              return (
                <line
                  key={angle}
                  x1="50" y1="50"
                  x2={ex} y2={ey}
                  stroke="rgba(147,197,253,0.15)"
                  strokeWidth="0.3"
                  strokeDasharray="2 2"
                  style={{ animation: 'fr-dash-flow 2s linear infinite' }}
                />
              );
            })}
          </svg>

          {/* Status */}
          <div className="absolute bottom-7 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/30 border border-white/[0.06]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-emerald-300/80">Live Data Sync</span>
          </div>
        </div>
      );

    /* ──────────────────── 3 · SCHEDULING ──────────────────── */
    case 'scheduling':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-3 px-3">
          {/* Mini calendar header */}
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Today's Schedule</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-medium text-emerald-300">Auto-resolved</span>
            </div>
          </div>

          {/* Timeline entries */}
          {[
            { time: '09:30', event: 'Client Discovery Call', status: 'done', accent: 'bg-blue-400' },
            { time: '11:00', event: 'Restaurant — Table for 4', status: 'done', accent: 'bg-violet-400' },
            { time: '14:30', event: 'Property Tour · Westside', status: 'next', accent: 'bg-amber-400' },
          ].map(({ time, event, status, accent }) => (
            <div
              key={time}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-colors ${
                status === 'next'
                  ? 'bg-white/[0.06] border-white/[0.1]'
                  : 'bg-black/30 border-white/[0.05]'
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${accent} shrink-0`} />
              <span className="text-[11px] font-bold text-blue-300/80 w-10 shrink-0">{time}</span>
              <div className="h-5 w-px bg-white/[0.08]" />
              <span className="text-[12px] text-white/80 flex-1">{event}</span>
              {status === 'done' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="text-[8px] font-bold uppercase tracking-wider text-amber-300/70 px-1.5 py-0.5 rounded bg-amber-400/10">Next</span>
              )}
            </div>
          ))}

          {/* Footer */}
          <div className="text-center text-[9px] text-white/30 mt-1">
            2 conflicts resolved · 0 pending
          </div>
        </div>
      );

    /* ──────────────────── 4 · SECURITY ──────────────────── */
    case 'security':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-5 relative overflow-hidden">
          {/* Shield icon with scan effect */}
          <div className="relative h-24 w-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/[0.06] border border-emerald-400/20" />
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{ mask: 'linear-gradient(transparent 40%, white 50%, transparent 60%)' }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-400/15 to-transparent"
                style={{ animation: 'fr-scan 3s ease-in-out infinite' }}
              />
            </div>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>

          {/* Title */}
          <div className="text-center">
            <div className="text-[13px] font-bold text-white/90">Secure Call Environment</div>
            <div className="flex items-center justify-center gap-2 mt-2.5">
              {['HIPAA', 'PCI-DSS', 'GDPR'].map((badge) => (
                <span
                  key={badge}
                  className="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider bg-emerald-500/[0.08] border border-emerald-500/15 text-emerald-300/80"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Status pills */}
          <div className="flex gap-2.5">
            {[
              { icon: '🔒', label: 'E2E Encrypted' },
              { icon: '✦', label: 'Bio-Verified' },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/[0.06] border border-emerald-500/15 text-[10px] font-medium text-emerald-300/80"
              >
                <span className="text-[9px]">{icon}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      );

    /* ──────────────────── 5 · OMNICHANNEL ──────────────────── */
    case 'omnichannel':
      return (
        <div className="w-full h-full flex flex-col justify-center items-center gap-5 relative">
          {/* Channel pills in orbit layout */}
          <div className="relative w-[280px] h-[200px] flex items-center justify-center">
            {/* Centre node */}
            <div className="absolute h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/25 to-indigo-600/15 border border-blue-400/25 flex items-center justify-center z-10 shadow-lg shadow-blue-500/10">
              <span className="text-[10px] font-black tracking-tight">AVA</span>
            </div>

            {/* Channel nodes at compass points */}
            {[
              { label: '☎ Phone', x: 0, y: -75, glow: 'shadow-blue-500/10' },
              { label: '🌐 VoIP', x: 95, y: 0, glow: 'shadow-violet-500/10' },
              { label: '📡 WebRTC', x: 0, y: 75, glow: 'shadow-cyan-500/10' },
              { label: '⚡ API', x: -95, y: 0, glow: 'shadow-emerald-500/10' },
            ].map(({ label, x, y, glow }) => (
              <div
                key={label}
                className={`absolute px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-[10px] font-semibold text-white/75 ${glow} shadow-md`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  animation: 'fr-float 4s ease-in-out infinite',
                  animationDelay: `${Math.random() * 2}s`,
                }}
              >
                {label}
              </div>
            ))}

            {/* Cross-hair lines */}
            <div className="absolute w-[180px] h-px bg-gradient-to-r from-transparent via-blue-400/15 to-transparent" />
            <div className="absolute h-[140px] w-px bg-gradient-to-b from-transparent via-blue-400/15 to-transparent" />
          </div>

          {/* Footer tag */}
          <div className="text-[9px] uppercase tracking-[0.2em] text-blue-300/60 font-medium">
            Connected Everywhere
          </div>
        </div>
      );

    /* ──────────────────── 6 · MONITORING ──────────────────── */
    case 'monitoring':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-3.5 px-2">
          {/* Header bar */}
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              Live Call Monitor
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-400/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-60" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-red-400" />
              </span>
              <span className="text-[9px] font-bold text-red-300">REC</span>
            </span>
          </div>

          {/* Transcript panel */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/[0.06]">
            <div className="text-[8px] uppercase tracking-widest text-white/25 mb-2">
              Live Transcript
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-[9px] font-bold text-blue-300/60 shrink-0">Caller</span>
                <span className="text-[11px] text-white/70 leading-relaxed italic">
                  "I'd like to reschedule my Friday reservation..."
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-[9px] font-bold text-violet-300/60 shrink-0">AVA</span>
                <span className="text-[11px] text-white/70 leading-relaxed italic">
                  "Of course — let me check availability for you."
                </span>
              </div>
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sentiment', value: 'Positive', color: 'text-emerald-300' },
              { label: 'Keywords', value: '3 flagged', color: 'text-blue-300' },
              { label: 'Duration', value: '02:34', color: 'text-white/60' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-2.5 rounded-xl bg-black/25 border border-white/[0.05] text-center">
                <div className="text-[8px] uppercase tracking-wider text-white/25">{label}</div>
                <div className={`text-[11px] font-bold mt-1 ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      );

    /* ──────────────────── 7 · APPOINTMENTS ──────────────────── */
    case 'appointments':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-4 px-3">
          {/* Header */}
          <div className="flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Appointment Scheduler</span>
          </div>

          {/* Booking card */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] uppercase tracking-wider text-white/30">Confirmed Booking</span>
              <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-300/80">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                Synced
              </span>
            </div>
            <div className="text-lg font-bold text-white/90">Tomorrow · 3:30 PM</div>
            <div className="flex items-center gap-2 mt-2">
              {['Google Cal', 'Outlook'].map((cal) => (
                <span key={cal} className="text-[9px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/40">{cal}</span>
              ))}
            </div>
          </div>

          {/* Action confirmation */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/[0.08] border border-blue-400/15">
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.7)" strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
              </svg>
              <span className="text-[11px] text-white/65">Reminder scheduled</span>
            </div>
            <span className="text-[9px] text-white/30">24h before</span>
          </div>

          {/* Stats footer */}
          <div className="flex justify-center gap-6 text-center">
            <div>
              <div className="text-[16px] font-bold text-white/80">24</div>
              <div className="text-[8px] text-white/25 uppercase tracking-wider">This Week</div>
            </div>
            <div className="h-8 w-px bg-white/[0.06]" />
            <div>
              <div className="text-[16px] font-bold text-emerald-300/80">97%</div>
              <div className="text-[8px] text-white/25 uppercase tracking-wider">Show Rate</div>
            </div>
          </div>
        </div>
      );

    /* ──────────────────── 8 · CALL CENTER ──────────────────── */
    case 'callcenter':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-3 px-2">
          {/* Header */}
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              Virtual Call Center
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-medium text-emerald-300">Online</span>
            </span>
          </div>

          {/* Agent rows */}
          {[
            { id: 'α', agent: 'Agent Alpha', caller: '+1 ••• 4821', status: 'Active', statusColor: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/15' },
            { id: 'β', agent: 'Agent Beta', caller: '+44 ••• 7290', status: 'Active', statusColor: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/15' },
            { id: 'γ', agent: 'Agent Gamma', caller: 'Queue #12', status: 'Routing', statusColor: 'text-amber-300 bg-amber-500/10 border-amber-500/15' },
          ].map(({ id, agent, caller, status, statusColor }) => (
            <div
              key={id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-black/25 border border-white/[0.05]"
            >
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/15 border border-violet-400/15 flex items-center justify-center text-[11px] font-bold text-violet-300/80">
                {id}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-white/80">{agent}</div>
                <div className="text-[9px] text-white/30 mt-0.5">{caller}</div>
              </div>
              <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>
                {status}
              </span>
            </div>
          ))}

          {/* Capacity bar */}
          <div className="px-1 mt-1">
            <div className="flex justify-between text-[8px] text-white/25 mb-1">
              <span>Capacity</span>
              <span>3 / ∞ agents</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500/60 to-blue-400/60"
                style={{ width: '12%', animation: 'fr-glow-breathe 3s ease-in-out infinite' }}
              />
            </div>
            <div className="text-center text-[8px] text-white/20 mt-2">
              Unlimited parallel dialing
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
