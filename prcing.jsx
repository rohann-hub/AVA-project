import React from 'react';
import { Check, Minus, Sparkles } from 'lucide-react';

/* ------------------------------------------------------------------
   PRICING

   Two plans, deliberately asymmetric. Standard is a fixed monthly rate
   with hard caps meant for teams running a pilot. Pay-As-You-Go is a
   one-time setup fee that opens up the full platform and then bills
   by usage — so the pricing UNIT is different on each card (per month
   vs one-time), not just the number. The layout leans into that: same
   card shape, same feature-row structure, different price cadence.

   The featured card (PAYG) gets a gradient rim and a "Recommended"
   badge. Everything else — colours, radii, blur blobs, eyebrow, type
   scale — is lifted from the surrounding sections so this slots in
   without visually disrupting the page.

   Feature rows use `included: true | false`. When false, the icon is
   a muted dash and the label is dimmed — the reader can compare the
   two cards row-by-row without a separate comparison table.
------------------------------------------------------------------- */

const PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'For teams piloting voice AI on a fixed budget.',
    price: '₹16,000',
    unit: 'per month',
    priceNote: 'Billed monthly · cancel anytime',
    cta: 'Get Started',
    ctaStyle: 'ghost',
    featured: false,
    features: [
      { label: '30 calls per month', included: true },
      { label: 'Single AI voice agent', included: true },
      { label: 'Real-time call analytics dashboard', included: true },
      { label: 'Dedicated developer support', included: true },
      { label: 'Limited language support', included: true, muted: true },
      { label: 'Concurrent calling', included: false },
      { label: 'CRM integration', included: false },
      { label: 'Dedicated cloud server', included: false },
      { label: 'Human voice cloning', included: false },
    ],
    footnote: 'Turnaround times scale with team availability.',
  },
  {
    id: 'payg',
    name: 'Pay-As-You-Go',
    tagline: 'Built to scale — pay for what you actually use.',
    price: '₹20,000',
    unit: 'one-time setup',
    priceNote: 'Then usage-based billing · no monthly minimum',
    cta: 'Get started',
    ctaStyle: 'primary',
    featured: true,
    features: [
      { label: 'Unlimited calls', included: true, emphasis: true },
      { label: '2 AI voice agents included free', included: true },
      { label: 'Real-time call analytics dashboard', included: true },
      { label: 'Dedicated developer support', included: true },
      { label: 'Multi-language support', included: true },
      { label: 'Concurrent calling', included: true },
      { label: 'CRM integration', included: true },
      { label: 'Dedicated cloud server', included: true },
      { label: 'Human voice cloning AI agent', included: true, emphasis: true },
    ],
    footnote: 'Onboarded in days, not weeks.',
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="relative py-24 bg-background text-foreground overflow-hidden"
    >
      {/* Ambient blobs — matches the RoiCalculator surface it replaces
          so the section flows into the ones above and below it. */}
      <div className="pointer-events-none absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-purple-700/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header — same eyebrow/heading/desc pattern used
            elsewhere on the page so the rhythm doesn't break. */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#a855f7]">
            Pricing
          </span>
          <h2 className="text-4xl font-extrabold font-poppins uppercase text-foreground mt-3 tracking-tight md:text-5xl">
            Plans that fit the way you scale
          </h2>
          <p className="mt-4 text-base text-foreground/60 max-w-xl mx-auto leading-relaxed">
            Start small with a fixed monthly plan, or unlock the full platform with a one-time
            setup and pay only for what you use.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Trailing reassurance line — kept quiet so it doesn't
            compete with the plan cards for attention. */}
        <p className="mt-10 text-center text-xs font-jura uppercase tracking-widest text-foreground/40">
          All plans include onboarding · GST extra where applicable
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   PLAN CARD

   The featured variant paints a gradient ring around the card using
   an absolutely-positioned pseudo-layer (the outer `.pricing-ring`
   div), which is cheaper than the padding-with-gradient-background
   trick and doesn't fight border-radius on inner content.
------------------------------------------------------------------- */
function PlanCard({ plan }) {
  const isFeatured = plan.featured;

  return (
    <div className="relative group">
      {/* Gradient rim for the featured card. Rendered as a slightly
          larger sibling behind the card, blurred, so it reads as a
          glow rather than a hard border. */}
      {isFeatured && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[1.5px] rounded-3xl opacity-90"
            style={{
              background:
                'linear-gradient(135deg, #a855f7 0%, #7c3aed 45%, #6366f1 100%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-4 rounded-3xl opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
            style={{
              background:
                'radial-gradient(60% 60% at 50% 50%, rgba(168, 85, 247, 0.35), transparent 70%)',
            }}
          />
        </>
      )}

      {/* Actual card surface */}
      <div
        className={[
          'relative h-full flex flex-col rounded-3xl backdrop-blur-md',
          'p-6 lg:p-7',
          isFeatured
            ? 'bg-[#0d0322]/95 light:bg-white'
            : 'bg-[#110526]/40 light:bg-white/80 border border-foreground/10',
        ].join(' ')}
      >
        {/* Recommended badge — pinned to the top edge of the featured
            card, floats above the gradient rim. */}
        {isFeatured && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg"
              style={{
                background:
                  'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              }}
            >
              <Sparkles size={11} strokeWidth={2.5} />
              Recommended
            </span>
          </div>
        )}

        {/* Plan name + tagline */}
        <div className="mb-5">
          <div className="flex items-baseline gap-3">
            <h3 className="text-xl font-extrabold font-poppins text-foreground tracking-tight">
              {plan.name}
            </h3>
          </div>
          <p className="mt-1.5 text-[13px] text-foreground/60 leading-relaxed">
            {plan.tagline}
          </p>
        </div>

        {/* Price block */}
        <div className="mb-6 pb-6 border-b border-foreground/10">
          <div className="flex items-baseline gap-2">
            <span
              className={[
                'text-4xl font-black font-poppins tracking-tight',
                isFeatured
                  ? 'bg-gradient-to-r from-[#c084fc] to-[#818cf8] bg-clip-text text-transparent'
                  : 'text-foreground',
              ].join(' ')}
            >
              {plan.price}
            </span>
            <span className="text-xs font-semibold text-foreground/50">
              {plan.unit}
            </span>
          </div>
          <p className="mt-1.5 text-[10px] font-jura uppercase tracking-widest text-foreground/40">
            {plan.priceNote}
          </p>
        </div>

        {/* Feature list */}
        <ul className="flex-1 space-y-2.5 mb-6">
          {plan.features.map((feat, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px]">
              <span
                className={[
                  'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full',
                  feat.included
                    ? isFeatured
                      ? 'bg-purple-500/20 text-[#c084fc]'
                      : 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-foreground/5 text-foreground/30',
                ].join(' ')}
                aria-hidden="true"
              >
                {feat.included ? (
                  <Check size={10} strokeWidth={3.5} />
                ) : (
                  <Minus size={10} strokeWidth={3.5} />
                )}
              </span>
              <span
                className={[
                  'leading-relaxed',
                  !feat.included && 'text-foreground/35 line-through decoration-foreground/20',
                  feat.included && feat.muted && 'text-foreground/60',
                  feat.included && feat.emphasis && 'font-semibold text-foreground',
                  feat.included && !feat.emphasis && !feat.muted && 'text-foreground/85',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {feat.label}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          type="button"
          className={[
            'w-full font-poppins text-[11px] font-bold uppercase tracking-wider',
            'py-3 px-6 rounded-full transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-background',
            plan.ctaStyle === 'primary'
              ? 'text-white shadow-lg shadow-purple-900/40 hover:shadow-purple-500/50 hover:scale-[1.02]'
              : 'bg-transparent border border-foreground/20 text-foreground hover:bg-foreground/5 hover:border-foreground/40',
          ].join(' ')}
          style={
            plan.ctaStyle === 'primary'
              ? {
                  background:
                    'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                }
              : undefined
          }
        >
          {plan.cta}
        </button>

        {/* Footnote below the CTA — a small honest line rather than
            a burst of marketing copy. */}
        <p className="mt-3 text-center text-[10px] text-foreground/40 leading-relaxed">
          {plan.footnote}
        </p>
      </div>
    </div>
  );
}
