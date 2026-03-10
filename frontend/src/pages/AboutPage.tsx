import { motion } from "framer-motion";
import "../styles/About.css";
import { Link } from "react-router";

// Comparison data — what sets StyleO apart from generic chatbots
const COMPARISONS = [
  {
    feature: "Wardrobe Memory",
    chatgpt: "Forgets after each conversation. No persistent clothing data.",
    styleo:
      "Remembers every garment you've uploaded — brand, color, category, and photo.",
    chatgptBadge: "Stateless",
    styleoBadge: "Persistent",
  },
  {
    feature: "Garment Lifecycle",
    chatgpt: "No concept of wear status. Can't know what's clean or dirty.",
    styleo:
      "Tracks clean → worn → in laundry → clean. Never suggests dirty clothes.",
    chatgptBadge: "Unavailable",
    styleoBadge: "Real-time",
  },
  {
    feature: "Context Awareness",
    chatgpt:
      "Only responds to your text prompt. No weather, calendar, or event integration.",
    styleo:
      "Cross-references weather, calendar events, and dress codes to assemble outfits.",
    chatgptBadge: "Text only",
    styleoBadge: "Multi-signal",
  },
  {
    feature: "Outfit Assembly",
    chatgpt: "Gives generic text suggestions like 'wear a blazer with chinos'.",
    styleo:
      "Picks specific items from YOUR wardrobe and shows the assembled outfit visually.",
    chatgptBadge: "Generic",
    styleoBadge: "Personalized",
  },
  {
    feature: "Wear Analytics",
    chatgpt: "No tracking. No data on what you've worn or how often.",
    styleo:
      "Tracks frequency, last worn date, repeat avoidance, and underused items.",
    chatgptBadge: "None",
    styleoBadge: "Full tracking",
  },
];

// SVG icon components — crisp, custom, not emoji
const IconZap = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="var(--accent)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const IconRepeat = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="var(--accent)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
);

const IconCloud = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="var(--accent)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
  </svg>
);

const IconBarChart = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="var(--accent)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="7" width="4" height="14" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>
);

const IconDroplet = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="var(--accent)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
  </svg>
);

const IconBriefcase = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="var(--accent)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
  </svg>
);

// Benefits with SVG icon components
const BENEFITS = [
  {
    icon: <IconZap />,
    title: "Save Time Every Morning",
    desc: "Complete outfit suggestions in seconds, based on what you actually own. No more closet staring.",
  },
  {
    icon: <IconRepeat />,
    title: "No Unintentional Repeats",
    desc: "Wear tracking rotates your wardrobe evenly and alerts you before repeating too soon.",
  },
  {
    icon: <IconCloud />,
    title: "Weather-Aware Styling",
    desc: "Live weather feeds into every suggestion. Rain forecast? Waterproof layers get auto-prioritized.",
  },
  {
    icon: <IconBarChart />,
    title: "Wardrobe Utilization Insights",
    desc: "Spot underused pieces, find gaps in your collection, and see cost-per-wear for each item.",
  },
  {
    icon: <IconDroplet />,
    title: "Laundry Intelligence",
    desc: "Dirty items get excluded from suggestions automatically until you mark them clean.",
  },
  {
    icon: <IconBriefcase />,
    title: "Travel Packing Help",
    desc: "Builds capsule wardrobes for trips based on destination weather, duration, and planned events.",
  },
];

// Upload constraints — with honest difficulty ratings
const CONSTRAINTS = [
  {
    title: "Image Quality Requirements",
    desc: "Photos need decent lighting and a neutral background. Dark or cluttered shots reduce AI recognition accuracy quite a bit.",
    difficulty: "medium" as const,
  },
  {
    title: "AI Tagging Isn't Perfect",
    desc: "Auto-generated tags (category, color, style) are right most of the time, but you'll occasionally need to fix a misidentified garment.",
    difficulty: "medium" as const,
  },
  {
    title: "Initial Setup Takes Effort",
    desc: "Photographing and uploading a 50+ item wardrobe is a real time investment. Plan for a weekend session.",
    difficulty: "high" as const,
  },
  {
    title: "Storage Quota",
    desc: "Image storage per account is capped. High-res photos eat quota fast — compressing before upload helps.",
    difficulty: "low" as const,
  },
  {
    title: "Network Dependency",
    desc: "Bulk image uploads need a stable connection. Interrupted uploads may need to be retried one by one.",
    difficulty: "medium" as const,
  },
  {
    title: "Keeping It Current",
    desc: "New buys need to be added, donated items removed. Your digital closet only works if it mirrors reality.",
    difficulty: "low" as const,
  },
];

// Shared animation preset
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true } as const,
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const AboutPage: React.FC = () => {
  return (
    <div className="ab-root">
      {/* Hero */}
      <section className="ab-hero">
        <div className="ab-hero-glow" />
        <div className="ab-hero-dot-grid" />

        <motion.div className="ab-hero-inner" {...fadeUp()}>
          <div className="ab-eyebrow">
            <div className="ab-eyebrow-line" />
            <span className="ab-eyebrow-text">About StyleO</span>
            <div className="ab-eyebrow-line" />
          </div>

          <h1 className="ab-hero-h1">
            Not Just Another <em>Chatbot.</em>
            <br />
            Your Wardrobe&apos;s Brain.
          </h1>

          <p className="ab-hero-body">
            StyleO isn&apos;t a generic AI that forgets you after every
            conversation. It&apos;s a dedicated wardrobe intelligence platform
            that remembers every garment you own, tracks wear cycles, reads the
            weather, checks your calendar — and assembles outfits from{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              your actual clothes
            </strong>
            .
          </p>
        </motion.div>
      </section>

      {/* How StyleO differs from ChatGPT / Gemini */}
      <section className="ab-section">
        <div className="ab-section-inner">
          <motion.div {...fadeUp()}>
            <div className="ab-section-eyebrow">
              <div className="ab-eyebrow-line" />
              <span className="ab-eyebrow-text">Why StyleO is Different</span>
            </div>
            <h2 className="ab-section-h2">
              ChatGPT & Gemini <em>Suggest.</em> StyleO <em>Knows.</em>
            </h2>
            <p className="ab-section-sub">
              General-purpose chatbots give you generic fashion advice without
              knowing what you own. StyleO is purpose-built for wardrobe
              management — with persistent memory, lifecycle tracking, and real
              context signals.
            </p>
          </motion.div>

          <div className="ab-compare-grid">
            {COMPARISONS.map((item, i) => (
              <motion.div
                key={item.feature}
                className="ab-compare-card"
                {...fadeUp(i * 0.06)}
              >
                <div className="ab-compare-side">
                  <span className="ab-compare-label">ChatGPT / Gemini</span>
                  <p className="ab-compare-feature">{item.feature}</p>
                  <p className="ab-compare-desc">{item.chatgpt}</p>
                  <span className="ab-compare-badge ab-compare-badge--muted">
                    ✕ {item.chatgptBadge}
                  </span>
                </div>
                <div className="ab-compare-side ab-compare-side--styleo">
                  <span className="ab-compare-label ab-compare-label--accent">
                    StyleO
                  </span>
                  <p className="ab-compare-feature">{item.feature}</p>
                  <p className="ab-compare-desc">{item.styleo}</p>
                  <span className="ab-compare-badge ab-compare-badge--accent">
                    ✓ {item.styleoBadge}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="ab-section">
        <div className="ab-section-inner">
          <motion.div {...fadeUp()}>
            <div className="ab-section-eyebrow">
              <div className="ab-eyebrow-line" />
              <span className="ab-eyebrow-text">User Benefits</span>
            </div>
            <h2 className="ab-section-h2">
              Built to Make <em>Your Mornings</em> Easier.
            </h2>
            <p className="ab-section-sub">
              Every feature exists to solve one problem — eliminating the daily
              friction of figuring out what to wear.
            </p>
          </motion.div>

          <div className="ab-benefits-grid">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                className="ab-benefit-card"
                {...fadeUp(i * 0.06)}
              >
                <div className="ab-benefit-icon">{b.icon}</div>
                <h3 className="ab-benefit-title">{b.title}</h3>
                <p className="ab-benefit-desc">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Upload constraints & trade-offs */}
      <section className="ab-section">
        <div className="ab-section-inner">
          <motion.div {...fadeUp()}>
            <div className="ab-section-eyebrow">
              <div className="ab-eyebrow-line" />
              <span className="ab-eyebrow-text">Honest Limitations</span>
            </div>
            <h2 className="ab-section-h2">
              Upload Constraints & <em>Trade-offs.</em>
            </h2>
            <p className="ab-section-sub">
              StyleO depends on garment images to function. Here are the real
              challenges you should expect when digitizing your wardrobe.
            </p>
          </motion.div>

          <div className="ab-constraints-grid">
            {CONSTRAINTS.map((c, i) => (
              <motion.div
                key={c.title}
                className="ab-constraint-card"
                {...fadeUp(i * 0.06)}
              >
                <div className="ab-constraint-num">{i + 1}</div>
                <div>
                  <p className="ab-constraint-title">{c.title}</p>
                  <p className="ab-constraint-desc">{c.desc}</p>
                  <span
                    className={`ab-difficulty ab-difficulty--${c.difficulty}`}
                  >
                    {c.difficulty} friction
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <motion.section className="ab-footer" {...fadeUp()}>
        <div className="ab-footer-glow" />
        <div style={{ position: "relative", zIndex: 10 }}>
          <p className="ab-footer-eyebrow">Ready to Get Started?</p>
          <h2 className="ab-footer-h2">
            Your wardrobe deserves to be <em>intelligent.</em>
          </h2>
          <Link to="/signup">
            <motion.button
              className="ab-footer-cta"
              whileHover={{
                scale: 1.04,
                boxShadow: "0 0 64px var(--accent-glow)",
              }}
              whileTap={{ scale: 0.97 }}
            >
              Start Free — Import Your Wardrobe
            </motion.button>
          </Link>
        </div>
      </motion.section>
    </div>
  );
};

export default AboutPage;
