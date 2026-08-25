import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------
   WHEEL GEOMETRY

   Cards are bolted to the rim of one big wheel whose hub sits directly
   below the viewport centre, R pixels down. Scrolling rotates the wheel.

       theta  = 0    -> card at top of wheel: centred, upright
       theta  > 0    -> card has swung past centre, exiting left
       theta  < 0    -> card still climbing, entering from the right

       x   =  R * sin(theta)
       y   =  R * (1 - cos(theta))     ... rim drops away either side
       rot =  theta                    ... rigid, so it tilts with the rim

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
const CARD_RADIUS = 34;   // outer shell
const CARD_RADIUS_INNER = 32; // inner face (outer minus the 2px p-0.5 rim)
const RIM_SCALE = 0.16;   // how much a card shrinks by the time it leaves

/* Caption block ---------------------------------------------------- */
const CAPTION_H = 165;    // measured height of tag + title + description
const CAPTION_GAP = 44;   // clears the corner of a rotated neighbour card
const GROUP_SHIFT = (CAPTION_H + CAPTION_GAP) / 2; // lifts card+caption as one unit

/* Timeline split --------------------------------------------------- */
const REVEAL_END = 0.10;  // clip-path reveal finishes here
const CARDS_START = 0.14;
const CARDS_END = 0.99;

const featuresData = [
  {
    index: 0,
    title: 'Conversational AI',
    tag: 'CONVERSATIONAL',
    desc: 'Engage customers with natural, human-like conversations powered by advanced AI.',
    color: 'from-[#5a18e8] via-[#4010c8] to-[#1c0888]',
    shadow: 'rgba(90,20,200,0.50)',
    cardType: 'chat'
  },
  {
    index: 1,
    title: 'End-to-End Transactions',
    tag: 'TRANSACTIONS',
    desc: 'Automate the entire booking flow from inquiry to confirmation with real-time availability.',
    color: 'from-[#3c1ce0] via-[#2a10c8] to-[#100880]',
    shadow: 'rgba(60,20,180,0.48)',
    cardType: 'booking'
  },
  {
    index: 2,
    title: 'Multilingual Support',
    tag: 'LANGUAGES',
    desc: 'Break language barriers by engaging customers in their own language, anywhere.',
    color: 'from-[#6012c8] via-[#7a18e0] to-[#3510a8]',
    shadow: 'rgba(100,20,180,0.50)',
    cardType: 'multilingual'
  },
  {
    index: 3,
    title: 'Voice Search',
    tag: 'VOICE',
    desc: 'Enable hands-free discovery through natural voice commands for faster, effortless bookings.',
    color: 'from-[#1a1060] via-[#100c40] to-[#070520]',
    shadow: 'rgba(30,20,90,0.45)',
    cardType: 'voicesearch'
  },
  {
    index: 4,
    title: 'Mobile App & Human Handover',
    tag: 'SUPPORT',
    desc: 'Seamlessly transfer conversations to your team when needed, with full access via a mobile app.',
    color: 'from-[#22223a] via-[#151525] to-[#0a0a14]',
    shadow: 'rgba(40,40,60,0.4)',
    cardType: 'handover'
  },
  {
    index: 5,
    title: 'Omnichannel Support',
    tag: 'OMNICHANNEL',
    desc: 'Connect with customers across WhatsApp, Instagram, Messenger and more all in one place.',
    color: 'from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a]',
    shadow: 'rgba(37,99,235,0.45)',
    cardType: 'omnichannel'
  },
  {
    index: 6,
    title: 'Smart Negotiation',
    tag: 'NEGOTIATION',
    desc: 'Guide every conversation to a win-win outcome with personalized offers that balance margin and customer satisfaction.',
    color: 'from-[#10b981] via-[#047857] to-[#064e3b]',
    shadow: 'rgba(16,185,129,0.4)',
    cardType: 'negotiation'
  },
  {
    index: 7,
    title: 'Cross-selling & Upselling',
    tag: 'REVENUE',
    desc: 'Increase revenue by recommending relevant add-ons and upgrades at the right moment in the journey.',
    color: 'from-[#d97706] via-[#b45309] to-[#78350f]',
    shadow: 'rgba(217,119,6,0.4)',
    cardType: 'upselling'
  },
  {
    index: 8,
    title: 'Built to Fit Business Workflows',
    tag: 'WORKFLOWS',
    desc: 'Integrate LIA with your existing tools CRM, Booking, Payments, Slack and more.',
    color: 'from-[#4f46e5] via-[#4338ca] to-[#312e81]',
    shadow: 'rgba(79,70,229,0.4)',
    cardType: 'workflows'
  },
  {
    index: 9,
    title: 'Interactive Dashboard',
    tag: 'ANALYTICS',
    desc: 'Track performance, analyze customer interactions and uncover insights through powerful dashboards.',
    color: 'from-[#db2777] via-[#b11556] to-[#831843]',
    shadow: 'rgba(219,39,119,0.4)',
    cardType: 'dashboard'
  },
  {
    index: 10,
    title: 'Easy Customization',
    tag: 'BRANDING',
    desc: 'Quickly customize LIA to match your brand with a flexible, widget-based design.',
    color: 'from-[#7c3aed] via-[#6d28d9] to-[#4c1d95]',
    shadow: 'rgba(124,58,237,0.4)',
    cardType: 'customization'
  },
  {
    index: 11,
    title: 'Multimedia Responses',
    tag: 'MULTIMEDIA',
    desc: 'Bring conversations to life with photos, videos and location cards sent right inside the chat.',
    color: 'from-[#a21caf] via-[#86198f] to-[#581c87]',
    shadow: 'rgba(162,28,175,0.4)',
    cardType: 'multimedia'
  }
];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function FeaturesReveal() {
  const sectionRef = useRef(null);
  const revealRef = useRef(null);
  const textLeftRef = useRef(null);
  const textRightRef = useRef(null);
  const cardRefs = useRef([]);
  const captionRefs = useRef([]);
  const layoutRef = useRef(null);

  useEffect(() => {
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
        const theta = ((progress - (CARD_START + CARD_STEP * t)) / CARD_STEP) * WHEEL_STEP;
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
                  className="w-full h-full overflow-hidden p-0.5"
                  style={{
                    borderRadius: CARD_RADIUS,
                    boxShadow: `0 30px 80px -20px ${f.shadow}, 0 0 0 1px rgba(255,255,255,0.04)`
                  }}
                >
                  <div
                    className={`w-full h-full bg-gradient-to-b ${f.color} flex flex-col items-center justify-center p-6 text-white relative`}
                    style={{ borderRadius: CARD_RADIUS_INNER }}
                  >
                    {renderMockupContent(f.cardType)}
                  </div>
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
              className="w-full overflow-hidden p-0.5 shadow-xl"
              style={{ aspectRatio: `${CARD_W} / ${CARD_H}`, borderRadius: CARD_RADIUS }}
            >
              <div
                className={`w-full h-full bg-gradient-to-b ${f.color} flex flex-col items-center justify-center p-6 text-white relative`}
                style={{ borderRadius: CARD_RADIUS_INNER }}
              >
                {renderMockupContent(f.cardType)}
              </div>
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

function renderMockupContent(type) {
  switch (type) {
    case 'chat':
      return (
        <div className="w-full h-full flex flex-col justify-between pt-8 pb-2">
          <div className="flex max-w-[85%] gap-2 items-end self-start">
            <div className="h-6 w-6 shrink-0 rounded-full bg-purple-400 flex items-center justify-center text-[10px]">🤖</div>
            <div className="text-xs p-3 rounded-2xl rounded-bl-sm bg-black/40 border border-white/10">
              <div className="text-[9px] text-white/50 mb-0.5">LIA · Assistant</div>
              How can I help today? Ask anything — from drafting a reply to summarizing a thread.
            </div>
          </div>
          <div className="w-full flex flex-col gap-2 mt-4">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {['Create image', 'Summarize text', 'Translate', 'Generate'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  className="text-[10px] whitespace-nowrap bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1.5 rounded-full"
                >
                  {btn}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/40 border border-white/10">
              <input
                readOnly
                className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder-white/30 outline-none"
                placeholder="Ask anything..."
              />
              <button
                type="button"
                className="h-7 w-7 shrink-0 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      );

    case 'booking':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-4">
          <div className="flex items-center p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-white/50">Discover</span>
            <div className="flex-1 h-px bg-white/20 mx-3" />
            <span className="text-[10px] text-emerald-400 font-bold">✓</span>
          </div>
          <div className="flex items-center p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-white/50">Book</span>
            <div className="flex-1 h-px bg-white/20 mx-3" />
            <span className="text-[10px] text-emerald-400 font-bold">✓</span>
          </div>
          <div className="p-4 rounded-2xl bg-black/50 border border-white/15">
            <div className="text-[10px] text-white/50 uppercase">Paris, FR</div>
            <div className="text-sm font-semibold mt-1">Hôtel Lumière · Marais</div>
            <div className="text-xs text-white/70 mt-2">Sep 14 → Sep 16 · 2 guests</div>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
            <span className="text-xs font-semibold">Payment Confirmed</span>
            <span className="text-sm font-bold">€420</span>
          </div>
        </div>
      );

    case 'multilingual':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-4">
          <div className="text-center text-xs font-bold text-white/60 mb-2">LIA · Responding in your language</div>
          <div className="flex justify-between items-center p-2 rounded-full bg-white/10 border border-white/10 max-w-[200px] mx-auto">
            <span className="text-sm">🇪🇸</span>
            <span className="text-xs font-semibold">Español</span>
            <span className="text-[9px] bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full uppercase">
              Detected
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/90 text-black text-xs font-medium self-end max-w-[85%] shadow-lg">
            ¿Tienen habitaciones disponibles para el próximo fin de semana?
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs self-start max-w-[85%]">
            ¡Por supuesto! Tenemos disponibilidad. ¿Cuántas noches le gustaría?
          </div>
        </div>
      );

    case 'voicesearch':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-6">
          <div className="relative h-20 w-20 rounded-full bg-blue-500/10 border border-blue-400/30 flex items-center justify-center animate-pulse">
            <span className="absolute inset-0 rounded-full border border-blue-500/20 scale-125" />
            <span className="text-xl">🎙️</span>
          </div>
          <div className="flex gap-1 items-center h-8">
            {[14, 28, 42, 28, 14, 30, 20].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-blue-400 rounded-full opacity-80"
                style={{ height: `${h}px`, animation: `cp-eq-bar 1.2s ease-in-out infinite ${i * 0.15}s` }}
              />
            ))}
          </div>
          <div className="p-3 bg-black/40 border border-white/10 rounded-2xl text-center max-w-[80%]">
            <span className="text-xs font-light text-white/80">"Find boutique hotels in Madrid under $200"</span>
          </div>
        </div>
      );

    case 'handover':
      return (
        <div className="w-full h-full flex flex-col justify-end gap-3 pb-2">
          <div className="p-3 rounded-xl bg-white/10 border border-white/10 max-w-[80%] self-start text-xs">
            Hi! I can help with your booking. What dates work?
          </div>
          <div className="p-3 rounded-xl bg-white/95 text-black max-w-[80%] self-end text-xs font-medium">
            I'd like to check in on Dec 5th, but I have a special accessibility request.
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 self-center">
            <span className="text-[10px] uppercase font-bold tracking-wider">Handing over to agent Sarah...</span>
          </div>
          <div className="p-3 rounded-xl bg-white/15 border border-white/20 max-w-[80%] self-start text-xs font-semibold text-white">
            <div className="text-[9px] text-purple-300 mb-0.5">Sarah · Support</div>
            Hi! I see you have a special request for Dec 5th. Let me verify our accessible rooms for you.
          </div>
        </div>
      );

    case 'omnichannel':
      return (
        <div className="w-full h-full flex flex-col justify-center items-center gap-4">
          <div className="flex flex-wrap justify-center gap-2">
            {['💬 WhatsApp', '📸 Instagram', '🔵 Messenger'].map((app) => (
              <span key={app} className="text-xs font-semibold px-3 py-2 bg-black/30 border border-white/10 rounded-full">
                {app}
              </span>
            ))}
          </div>
          <div className="p-4 bg-black/40 border border-white/10 rounded-2xl w-full text-center max-w-[85%]">
            <span className="text-[10px] text-white/50 block mb-1">INCOMING MESSAGES</span>
            <div className="text-xs font-medium">"Can I cancel my trip tomorrow?"</div>
          </div>
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-center text-xs font-semibold">
            Auto-replied in 1.2s via WhatsApp
          </div>
        </div>
      );

    case 'negotiation':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-3">
          <div className="text-center text-xs font-bold text-white/60 mb-2">Automated Negotiation Offer</div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center opacity-60">
            <div>
              <span className="text-xs font-semibold block text-white/80">Standard Rate</span>
              <span className="text-[9px] text-white/40">Non-refundable</span>
            </div>
            <span className="text-sm font-bold">$148</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/40 flex justify-between items-center ring-1 ring-purple-500/30">
            <div>
              <span className="text-xs font-bold block text-white">LIA Live Discount</span>
              <span className="text-[9px] text-purple-300">Free room upgrade included</span>
            </div>
            <span className="text-sm font-black text-purple-300">$125</span>
          </div>
          <div className="flex gap-2">
            <button type="button" className="flex-1 py-2 rounded-lg bg-white/10 border border-white/10 text-[10px] font-semibold">
              Decline
            </button>
            <button type="button" className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-[10px] font-bold shadow-lg">
              Accept Offer
            </button>
          </div>
        </div>
      );

    case 'upselling':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-3">
          {['Spa & wellness add-on (+$45)', 'Airport transfer (+$32)', 'Late checkout · 4pm (+$18)'].map((opt, i) => (
            <div key={i} className="flex justify-between items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/10">
              <span className="text-xs text-white/80 font-medium">{opt}</span>
              <button
                type="button"
                className="h-6 w-6 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-md"
              >
                +
              </button>
            </div>
          ))}
          <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center gap-3 text-xs">
            <span className="text-white/50">Total Recommendations Add-on Value</span>
            <span className="font-bold text-[#ffb066] shrink-0">+$95</span>
          </div>
        </div>
      );

    case 'workflows':
      return (
        <div className="w-full h-full flex items-center justify-center relative">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.5)] z-10">
            <img src="/logo/lia white 1.png" className="w-[50%]" alt="LIA" />
          </div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {['CRM', 'Booking', 'Calendar', 'Payments', 'Slack', 'Email'].map((sys, idx) => {
              const r = 90;
              const angle = (idx / 6) * Math.PI * 2;
              return (
                <line
                  key={sys}
                  x1="50%"
                  y1="50%"
                  x2={`calc(50% + ${Math.cos(angle) * r}px)`}
                  y2={`calc(50% + ${Math.sin(angle) * r}px)`}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {['CRM', 'Booking', 'Calendar', 'Payments', 'Slack', 'Email'].map((sys, idx) => {
              const r = 90;
              const angle = (idx / 6) * Math.PI * 2;
              return (
                <div
                  key={sys}
                  className="absolute bg-black/60 border border-white/10 rounded-full px-2.5 py-1 text-[9px] font-medium text-white/70"
                  style={{ transform: `translate(${Math.cos(angle) * r}px, ${Math.sin(angle) * r}px)` }}
                >
                  {sys}
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'dashboard':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Conversations', val: '12.4K', color: 'text-purple-400' },
              { label: 'Automation', val: '84.8%', color: 'text-emerald-400' },
              { label: 'CSAT Score', val: '4.85', color: 'text-yellow-400' }
            ].map((st, i) => (
              <div key={i} className="p-2.5 bg-black/40 border border-white/10 rounded-xl text-center">
                <span className="text-[8px] text-white/40 block leading-tight">{st.label}</span>
                <span className={`text-xs font-black block mt-1 ${st.color}`}>{st.val}</span>
              </div>
            ))}
          </div>
          <div className="p-3 bg-black/40 border border-white/10 rounded-xl w-full flex flex-col justify-between">
            <span className="text-[9px] text-white/40 uppercase">Conversion Performance</span>
            <svg viewBox="0 0 240 90" preserveAspectRatio="none" className="w-full h-24 stroke-purple-400 fill-none mt-2">
              <path
                d="M 0 80 Q 20 40 40 60 T 80 20 T 120 40 T 160 10 T 200 30 T 240 10 L 240 90 L 0 90 Z"
                fill="rgba(168,85,247,0.06)"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      );

    case 'customization':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-3">
          <span className="text-xs font-bold text-center text-white/60 mb-2">Workspace & Brand Setup</span>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
            <span className="text-xs font-semibold text-white/80">Brand Primary Color</span>
            <div className="h-5 w-12 rounded bg-purple-500 border border-white/30" />
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
            <span className="text-xs font-semibold text-white/80">Voice Persona</span>
            <span className="text-xs font-bold text-purple-300">Professional/Caring</span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
            <span className="text-xs font-semibold text-white/80">Model Profile</span>
            <span className="text-xs font-bold text-emerald-400">LIA-Core-v2</span>
          </div>
        </div>
      );

    case 'multimedia':
      return (
        <div className="w-full h-full flex flex-col justify-end gap-3 pb-2">
          <div className="p-3 bg-black/40 border border-white/10 rounded-2xl self-start max-w-[85%]">
            <span className="text-xs text-white/70 block mb-2">Here is a photo of the Deluxe Room you requested:</span>
            <div className="h-28 w-full rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 overflow-hidden relative">
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-xs font-medium">
                Deluxe King Room View
              </div>
            </div>
          </div>
          <div className="p-3 bg-white/95 text-black rounded-2xl self-end text-xs font-medium">
            Looks beautiful! Send me the map coordinates.
          </div>
        </div>
      );

    default:
      return null;
  }
}
