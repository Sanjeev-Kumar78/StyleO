import { useRef, useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  AnimatePresence,
} from "framer-motion";
import "../styles/Home.css";
import { MdLocalLaundryService } from "react-icons/md";
import { Link } from "react-router";

//  Types
interface MousePos {
  x: number;
  y: number;
}

interface OutfitItem {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  compatible: boolean;
  imgSrc?: string; // drop your image paths here
}

//  Data
const GARMENT_STATES = [
  {
    id: 0,
    label: "Clean & Ready",
    statusLine: "Available for wear",
    color: "var(--accent)",
    glow: "var(--accent-glow)",
    ring: "var(--accent-dim)",
    cardBorder: "var(--accent-border)",
    badgeBg: "var(--accent-badge-bg)",
    badgeBorder: "var(--accent-badge-border)",
    desc: "Freshly laundered, pressed and hanging in your wardrobe. StyleO will prioritise this item in today's suggestions.",
    barWidth: "60%",
  },
  {
    id: 1,
    label: "Worn Today",
    statusLine: "In active wear",
    color: "var(--warn)",
    glow: "var(--warn-glow)",
    ring: "var(--warn-badge-bg)",
    cardBorder: "var(--warn-badge-border)",
    badgeBg: "var(--warn-badge-bg)",
    badgeBorder: "var(--warn-badge-border)",
    desc: "Outfit logged at 08:32 AM. Wear count incremented to 3. StyleO adjusts tomorrow's suggestions automatically.",
    barWidth: "36%",
  },
  {
    id: 2,
    label: "In Laundry",
    statusLine: "Unavailable",
    color: "var(--muted)",
    glow: "var(--muted-glow)",
    ring: "var(--surface-1)",
    cardBorder: "var(--border)",
    badgeBg: "var(--surface-1)",
    badgeBorder: "var(--border)",
    desc: "Queued for wash. Automatically excluded from outfit suggestions until marked clean.",
    barWidth: "60%",
  },
] as const;

const OUTFIT_ITEMS: OutfitItem[] = [
  {
    id: "mac",
    name: "Waterproof Mac",
    tag: "Outerwear",
    emoji: "🧥",
    compatible: true,
  },
  {
    id: "blazer",
    name: "Navy Wool Blazer",
    tag: "Jacket",
    emoji: "🥼",
    compatible: true,
  },
  {
    id: "oxford",
    name: "Oxford Shirt",
    tag: "Top",
    emoji: "👔",
    compatible: true,
  },
  {
    id: "trousers",
    name: "Slim Fit Trousers",
    tag: "Bottom",
    emoji: "👖",
    compatible: true,
  },
  {
    id: "brogues",
    name: "Leather Brogues",
    tag: "Footwear",
    emoji: "👞",
    compatible: true,
  },
  {
    id: "sneakers",
    name: "Canvas Sneakers",
    tag: "Footwear",
    emoji: "👟",
    compatible: false,
  },
  {
    id: "shorts",
    name: "Linen Shorts",
    tag: "Bottom",
    emoji: "🩳",
    compatible: false,
  },
];

//  Jacket SVG
const JacketVisual = ({
  mouseX,
  mouseY,
}: {
  mouseX: number;
  mouseY: number;
}) => {
  const rotX = (mouseY - 0.5) * -18;
  const rotY = (mouseX - 0.5) * 22;

  return (
    // Outer div: framer-motion owns the floating y-axis movement only
    <motion.div
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      className="relative select-none"
    >
      {/* Inner div: pure CSS transform handles mouse-parallax tilt */}
      <div
        className="hp-jacket-inner"
        style={{
          transform: `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        }}
      >
        {/* Accent glow behind jacket */}
        <div className="absolute rounded-full pointer-events-none hp-jacket-glow" />

        <svg
          viewBox="0 0 240 320"
          width="310"
          height="413"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Premium 3D blazer illustration"
          className="hp-jacket-svg"
        >
          <defs>
            <linearGradient id="bodyGradLeft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#12131A" />
              <stop offset="40%" stopColor="#1B1C26" />
              <stop offset="100%" stopColor="#252735" />
            </linearGradient>
            <linearGradient
              id="bodyGradRight"
              x1="100%"
              y1="0%"
              x2="0%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#12131A" />
              <stop offset="40%" stopColor="#1B1C26" />
              <stop offset="100%" stopColor="#252735" />
            </linearGradient>

            <linearGradient id="lapelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2A2F45" />
              <stop offset="50%" stopColor="#1D2030" />
              <stop offset="100%" stopColor="#151724" />
            </linearGradient>

            <linearGradient id="innerLining" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#08090C" />
              <stop offset="100%" stopColor="#0B0C12" />
            </linearGradient>

            <linearGradient
              id="goldPocketSquare"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Soft drop shadow for overlapping layers (lapels, pockets) */}
            <filter
              id="softShadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="6"
                floodColor="#000"
                floodOpacity="0.5"
              />
            </filter>

            {/* Stronger drop shadows for the lapels */}
            <filter
              id="lapelShadowL"
              x="-30%"
              y="-20%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="5"
                dy="6"
                stdDeviation="6"
                floodColor="#000"
                floodOpacity="0.45"
              />
            </filter>

            <filter
              id="lapelShadowR"
              x="-30%"
              y="-20%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="-5"
                dy="6"
                stdDeviation="6"
                floodColor="#000"
                floodOpacity="0.45"
              />
            </filter>
          </defs>

          {/*  Inner Lining / Shirt Area  */}
          <path
            d="M80 20 L160 20 L160 190 L120 220 L80 190 Z"
            fill="url(#innerLining)"
          />

          {/*  Shirt Collar  */}
          <path
            d="M80 20 L120 60 L160 20 L160 26 L120 66 L80 26 Z"
            fill="#E2E8F0"
          />

          {/*  Necktie  */}
          <path
            d="M115 62 L125 62 L130 160 L120 175 L110 160 Z"
            fill="#0F172A"
          />
          <path
            d="M114 80 L126 70 M113 110 L127 100 M111 140 L129 130"
            stroke="#1E293B"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />

          {/*  Jacket Back Collar  */}
          <path
            d="M65 14 C80 2 160 2 175 14 L160 22 C140 12 100 12 80 22 Z"
            fill="#12131A"
          />

          {/*  Left Body Main Plate  */}
          <path
            d="M120 310 L25 310 C15 310 5 280 8 160 C11 100 20 45 40 35 C60 25 80 25 80 25 L120 190 Z"
            fill="url(#bodyGradLeft)"
          />

          {/*  Right Body Main Plate  */}
          <path
            d="M120 310 L215 310 C225 310 235 280 232 160 C229 100 220 45 200 35 C180 25 160 25 160 25 L120 190 Z"
            fill="url(#bodyGradRight)"
          />

          {/*  Left Lapel (Peaked)  */}
          <path
            d="M80 25 C70 50 45 105 35 140 L65 130 L75 155 C90 190 110 215 120 225 L120 190 C110 165 95 95 80 25 Z"
            fill="url(#lapelGrad)"
            filter="url(#lapelShadowL)"
          />

          {/*  Right Lapel (Peaked)  */}
          <path
            d="M160 25 C170 50 195 105 205 140 L175 130 L165 155 C150 190 130 215 120 225 L120 190 C130 165 145 95 160 25 Z"
            fill="url(#lapelGrad)"
            filter="url(#lapelShadowR)"
          />

          {/*  Lapel Notches (Inner shadows)  */}
          <path d="M35 140 L65 130 L45 105 Z" fill="#151724" opacity="0.85" />
          <path
            d="M205 140 L175 130 L195 105 Z"
            fill="#151724"
            opacity="0.85"
          />

          {/*  Left Breast Pocket  */}
          <path
            d="M42 110 L78 100 L80 104 L44 114 Z"
            fill="#181A24"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />

          {/*  Gold Pocket Square  */}
          <path
            d="M48 105 L55 85 L65 100 L72 88 L76 99"
            fill="url(#goldPocketSquare)"
            filter="url(#softShadow)"
          />

          {/*  Side Pockets (Flapped)  */}
          {/* Left Pocket Flap */}
          <path
            d="M28 230 L75 220 L77 225 L30 235 Z"
            fill="#1B1D28"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
            filter="url(#softShadow)"
          />
          {/* Right Pocket Flap */}
          <path
            d="M212 230 L165 220 L163 225 L210 235 Z"
            fill="#1B1D28"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
            filter="url(#softShadow)"
          />

          {/*  Center Seam & Stitching Details  */}
          <line
            x1="120"
            y1="225"
            x2="120"
            y2="310"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1.5"
          />

          {/* Pocket Stitching */}
          <line
            x1="44"
            y1="115"
            x2="78"
            y2="105"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <line
            x1="31"
            y1="238"
            x2="75"
            y2="228"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <line
            x1="209"
            y1="238"
            x2="165"
            y2="228"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Sleeve starting boundaries (subtle fabric folds) */}
          <path
            d="M40 35 C25 65 20 105 18 160"
            stroke="#0B0C12"
            strokeWidth="4"
            filter="blur(2px)"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M200 35 C215 65 220 105 222 160"
            stroke="#0B0C12"
            strokeWidth="4"
            filter="blur(2px)"
            fill="none"
            opacity="0.6"
          />

          {/*  Dynamic Glowing Buttons  */}
          {[230, 260, 290].map((y, i) => (
            <g key={i}>
              <circle
                cx="120"
                cy={y}
                r="6"
                fill="#0C0D12"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.5"
              />
              <circle cx="120" cy={y} r="3.5" fill="#a2f567" opacity="0.9">
                <animate
                  attributeName="opacity"
                  values="0.4; 1; 0.4"
                  dur="3s"
                  begin={`${i * 0.8}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}

          {/*  Accent Edge Gleams  */}
          {/* Subtle tech-green glow tracing the left bottom hem */}
          <path
            d="M25 310 L120 310"
            stroke="rgba(162,245,103,0.18)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Left vertical edge gleam */}
          <path
            d="M25 310 C15 310 5 280 8 160"
            stroke="rgba(162,245,103,0.22)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            filter="url(#softShadow)"
          />
        </svg>

        {/* Floating badge */}
        <motion.div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full hp-jacket-badge"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.8, repeat: Infinity }}
        >
          <span className="hp-jacket-badge-dot" />
          DIGITIZED
        </motion.div>
      </div>
      {/* end inner perspective div */}
    </motion.div>
  );
};

//  Garment State Card
const StateCard = ({ state }: { state: (typeof GARMENT_STATES)[number] }) => {
  const isLaundry = state.id === 2;

  return (
    <div
      className="relative overflow-hidden rounded-2xl hp-state-card"
      style={{
        backgroundImage: `radial-gradient(ellipse at top left, ${state.ring}, transparent 55%)`,
        border: `1.5px solid ${state.cardBorder}`,
        boxShadow: `0 8px 40px ${state.glow}, 0 1px 0 var(--border-hi) inset`,
      }}
    >
      {/* Status indicator */}
      <div className="hp-state-card-status-row">
        <motion.div
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: state.color,
            boxShadow: `0 0 8px ${state.color}`,
          }}
          animate={
            !isLaundry
              ? { scale: [1, 1.45, 1], opacity: [1, 0.6, 1] }
              : undefined
          }
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <span
          className="hp-state-card-status-label"
          style={{ color: state.color }}
        >
          {state.statusLine}
        </span>
      </div>

      {/* Garment identity */}
      <h3 className="hp-state-card-name">Navy Wool Blazer</h3>
      <p className="hp-state-card-subtitle">Canali · Size 42R · Pure Wool</p>

      {/* State badge */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
        style={{
          background: state.badgeBg,
          border: `1px solid ${state.badgeBorder}`,
        }}
      >
        <span
          className="text-sm font-medium hp-state-card-badge-text"
          style={{ color: state.color }}
        >
          {state.label}
        </span>
      </div>

      <p className="hp-state-card-desc">{state.desc}</p>

      {/* Wear frequency bar */}
      <div className="mt-6">
        <div className="hp-state-card-freq-row">
          <span>Wear frequency</span>
          <span style={{ color: state.color }}>3 / 5 target</span>
        </div>
        <div className="hp-state-card-bar-track">
          <motion.div
            style={{ background: state.color }}
            animate={{ width: state.barWidth }}
            initial={{ width: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="h-full rounded-full"
          />
        </div>
      </div>

      {/* Laundry blur overlay */}
      {isLaundry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-2 hp-state-card-laundry-overlay"
        >
          <span style={{ fontSize: "2.8rem", filter: "grayscale(0.6)" }}>
            <MdLocalLaundryService />
          </span>
          <p className="text-sm tracking-wide hp-state-card-laundry-label">
            Temporarily unavailable
          </p>
        </motion.div>
      )}
    </div>
  );
};

//  Outfit Item Card
const OutfitItemCard = ({
  item,
  delay,
}: {
  item: OutfitItem;
  delay: number;
}) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 24, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className="relative hp-outfit-card"
  >
    <div className="relative flex items-center justify-center h-28 hp-outfit-card-thumb">
      {item.imgSrc ? (
        <img
          src={item.imgSrc}
          alt={item.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-3xl select-none">{item.emoji}</span>
      )}
      {/* Compatible tick */}
      {item.compatible && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center hp-outfit-card-tick">
          <svg viewBox="0 0 12 12" width="9" height="9" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
    <div className="px-3 py-2.5">
      <p className="truncate hp-outfit-card-name">{item.name}</p>
      <p className="hp-outfit-card-tag">{item.tag}</p>
    </div>
  </motion.div>
);

//  HomePage
const HomePage: React.FC = () => {
  /*  Mouse parallax (hero jacket tilt)  */
  const [mouse, setMouse] = useState<MousePos>({ x: 0.5, y: 0.5 });
  const [smooth, setSmooth] = useState<MousePos>({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) =>
      setMouse({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      setSmooth((p) => ({
        x: lerp(p.x, mouse.x, 0.06),
        y: lerp(p.y, mouse.y, 0.06),
      }));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mouse]);

  /*  Scroll container ref (hp-root is the scroll container)  */
  const rootRef = useRef<HTMLDivElement>(null);

  /*  Page-level scroll for parallax  */
  const { scrollY } = useScroll({ container: rootRef });

  // Hero: jacket drifts up at 30% of scroll speed (parallax)
  const rawJacketY = useTransform(scrollY, [0, 700], [0, -90]);
  const jacketY = useSpring(rawJacketY, { stiffness: 90, damping: 22 });

  // Hero: text drifts up at 18% of scroll speed
  const rawHeroTextY = useTransform(scrollY, [0, 700], [0, -50]);
  const heroTextY = useSpring(rawHeroTextY, { stiffness: 90, damping: 22 });

  // Hero: ambient glow blob counter-drifts slightly
  const rawGlowY = useTransform(scrollY, [0, 700], [0, 40]);
  const glowY = useSpring(rawGlowY, { stiffness: 60, damping: 18 });

  // Section fade-in opacity via spring (hero fade as user scrolls past)
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  /*  Lifecycle auto-play state  */
  const [activeState, setActiveState] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActiveState((prev) => (prev + 1) % GARMENT_STATES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [paused]);

  /*  Context section inView  */
  const contextRef = useRef<HTMLDivElement>(null);
  const contextInView = useInView(contextRef, { once: false, margin: "-15%" });
  const [outfitVisible, setOutfitVisible] = useState(false);

  useEffect(() => {
    if (contextInView) {
      const t = setTimeout(() => setOutfitVisible(true), 300);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setOutfitVisible(false), 0);
      return () => clearTimeout(t);
    }
  }, [contextInView]);

  const compatibleItems = OUTFIT_ITEMS.filter((i) => i.compatible);
  const incompatibleItems = OUTFIT_ITEMS.filter((i) => !i.compatible);

  //  render
  return (
    <div ref={rootRef} className="hp-root">
      {/* Hero Section */}
      <section className="hp-hero-section">
        {/* Ambient radial glow — follows cursor + parallax counter-drift */}
        <motion.div
          className="hp-hero-glow-blob"
          style={{
            translateX: `${(smooth.x - 0.5) * 40}px`,
            translateY: glowY,
          }}
        />

        {/* Dot-grid background */}
        <div className="hp-hero-dot-grid" />

        {/* Outer opacity fade as user scrolls */}
        <motion.div
          className="hp-hero-content"
          style={{ opacity: heroOpacity }}
        >
          {/* Left copy */}
          <motion.div
            className="hp-hero-copy"
            style={{ translateY: heroTextY }}
            initial={{ opacity: 0, y: 44 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Eyebrow */}
            <motion.div
              className="hp-hero-eyebrow-row"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="hp-hero-eyebrow-line" />
              <span className="hp-hero-eyebrow-text">StyleO</span>
            </motion.div>

            {/* Headline */}
            <h1 className="hp-hero-h1">
              Your Wardrobe, <em className="hp-hero-h1-em">Digitized.</em>
              <br />
              Your Style, <span className="hp-hero-h1-dim">Automated.</span>
            </h1>

            <p className="hp-hero-body">
              The first wardrobe intelligence platform that tracks every
              garment&apos;s complete lifecycle and assembles context-aware
              outfits — before you even ask.
            </p>

            {/* CTA row */}
            <div className="hp-hero-cta-row">
              {/* Primary CTA */}
              <Link to="/dashboard">
                <motion.button
                  className="hp-hero-cta-primary"
                  whileHover={{
                    scale: 1.04,
                    boxShadow:
                      "0 0 48px var(--accent-glow), 0 0 0 1px var(--accent-border)",
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  Digitize My Closet
                </motion.button>
              </Link>

              {/* Secondary ghost CTA */}
              <motion.button
                className="hp-hero-cta-secondary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="hp-hero-cta-play-circle">
                  <svg
                    viewBox="0 0 24 24"
                    width="10"
                    height="10"
                    fill="var(--text-dim)"
                  >
                    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                </span>
                Watch demo
              </motion.button>
            </div>

            {/* Stats strip */}
            <div className="hp-hero-stats">
              {[
                ["2,400+", "garments tracked"],
                ["98%", "outfit accuracy"],
                ["4.9 ★", "user rating"],
              ].map(([val, label]) => (
                <div key={label}>
                  <p className="hp-hero-stat-val">{val}</p>
                  <p className="hp-hero-stat-label">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ─ Right: Jacket visual ─ */}
          <motion.div
            className="hp-hero-jacket-col"
            style={{ translateY: jacketY }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Orbit ring 1 */}
            <div className="hp-orbit-ring-1" />
            {/* Orbit ring 2 — spinning */}
            <div className="hp-orbit-ring-2" />

            {/* Floating chip top-right */}
            <motion.div
              className="hp-hero-chip hp-hero-chip--top-right"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <span className="hp-hero-chip-accent">● </span>Wear count: 3
            </motion.div>

            {/* Floating chip bottom-left */}
            <motion.div
              className="hp-hero-chip hp-hero-chip--bottom-left"
              animate={{ y: [0, 6, 0], x: [0, -6, 0], z: [0, 6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="hp-hero-chip-accent">◆ </span>Clean &amp; Ready
            </motion.div>

            <JacketVisual mouseX={smooth.x} mouseY={smooth.y} />
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="hp-scroll-cue"
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2.8, repeat: Infinity }}
        >
          <span className="hp-scroll-cue-text">SCROLL</span>
          <div className="hp-scroll-cue-line" />
        </motion.div>
      </section>

      {/*  SECTION 2 — LIFECYCLE MANAGEMENT  */}
      <section className="hp-lifecycle-section">
        <div className="hp-lifecycle-grid">
          {/*  Left column: heading + pills  */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-(--accent)" />
              <span className="text-[0.7rem] tracking-[0.18em] uppercase text-(--accent) font-(family-name:--font-body)">
                Lifecycle Management
              </span>
            </div>

            {/* Heading */}
            <h2 className="font-(family-name:--font-display) font-light text-[clamp(1.8rem,3.5vw,3.2rem)] text-(--text-primary) leading-[1.15] mb-5">
              Not Just Suggestions. <em className="italic">Complete</em>{" "}
              Lifecycle Management.
            </h2>

            {/* Sub-text */}
            <p className="text-[1.05rem] leading-relaxed mb-10 max-w-xl hp-lifecycle-subtext">
              StyleO monitors every wear, wash, and rest cycle — so you never
              get suggested an outfit that's currently in the laundry basket.
            </p>

            {/* Interactive state pills */}
            <div className="flex flex-col gap-3">
              {GARMENT_STATES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveState(i);
                    setPaused(true);
                  }}
                  className="hp-lifecycle-pill"
                  style={
                    {
                      "--s-color":
                        activeState === i ? s.color : "var(--text-dim)",
                      "--s-bg":
                        activeState === i
                          ? "var(--bg-elevated)"
                          : "transparent",
                      "--s-border":
                        activeState === i ? s.color : "var(--border-subtle)",
                      "--s-glow":
                        activeState === i ? `0 6px 28px ${s.glow}` : "none",
                      "--s-x": activeState === i ? "8px" : "0px",
                      "--s-num-bg":
                        activeState === i ? s.color : "var(--surface-2)",
                      "--s-num-color":
                        activeState === i ? "var(--bg)" : "var(--text-dim)",
                    } as React.CSSProperties
                  }
                >
                  {/* Numbered bubble */}
                  <div className="hp-lifecycle-pill-num">{i + 1}</div>
                  <div>
                    <div className="text-[0.95rem] font-medium tracking-[0.02em]">
                      {s.label}
                    </div>
                    <div className="text-xs mt-0.5 hp-lifecycle-pill-status">
                      {s.statusLine}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/*  Right column: animated state card  */}
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeState}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <StateCard state={GARMENT_STATES[activeState]} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/*  SECTION 3 — CONTEXT-AWARE STYLING  */}
      <section ref={contextRef} className="hp-context-section">
        <div className="hp-context-inner">
          {/* Heading */}
          <motion.div
            className="hp-context-heading-block"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="hp-eyebrow-row">
              <div className="hp-eyebrow-rule" />
              <span className="hp-eyebrow-span">Context Intelligence</span>
            </div>
            <h2 className="hp-context-h2">
              Dressed for <em className="hp-context-h2-em">exactly</em> where
              you&apos;re going.
            </h2>
          </motion.div>

          {/* Split grid */}
          <div className="hp-context-split-grid">
            {/* Left — Context widgets */}
            <div className="hp-context-left-col">
              {/* Weather card */}
              <motion.div
                className="hp-weather-card"
                initial={{ opacity: 0, x: -32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <div className="hp-weather-card-header">
                  <span className="hp-weather-location">Today · Your City</span>
                  <span className="hp-weather-preview-badge">Preview</span>
                </div>
                <div className="hp-weather-body">
                  <div>
                    <p className="hp-weather-temp">12°</p>
                    <p className="hp-weather-feels">Feels like 9°</p>
                  </div>
                  <div>
                    <div className="hp-weather-condition-row">
                      <span className="hp-weather-icon">🌧️</span>
                      <span className="hp-weather-condition-label">
                        Heavy Rain
                      </span>
                    </div>
                    <div className="hp-weather-tags">
                      {["Waterproof", "Layering", "Formal"].map((tag) => (
                        <span key={tag} className="hp-tag-accent">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="hp-weather-location-prompt">
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.485-2.015-4.5-4.5-4.5Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Enable location in settings for live local weather
                </p>
              </motion.div>

              {/* Calendar card */}
              <motion.div
                className="hp-calendar-card"
                initial={{ opacity: 0, x: -32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.24 }}
              >
                <div className="hp-calendar-card-body">
                  <div className="hp-calendar-date-box">
                    <span className="hp-calendar-month">MON</span>
                    <span className="hp-calendar-day">24</span>
                  </div>
                  <div>
                    <p className="hp-calendar-event-title">
                      Client Pitch — Series A
                    </p>
                    <p className="hp-calendar-event-time">
                      09:30 AM · Canary Wharf HQ
                    </p>
                    <div className="hp-calendar-tags">
                      {["Formal", "Professional", "Indoor"].map((tag) => (
                        <span key={tag} className="hp-tag-warn">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* AI inference bar */}
              <motion.div
                className="hp-ai-bar-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.38 }}
              >
                <div className="hp-ai-bar-header">
                  <div className="hp-ai-icon-circle">
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                    >
                      <path
                        d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="hp-ai-bar-title">StyleO Intelligence</p>
                    <p className="hp-ai-bar-subtitle">
                      Waterproof + formal context — assembling outfit…
                    </p>
                  </div>
                </div>
                <div className="hp-ai-bar-track">
                  <motion.div
                    className="hp-ai-bar-fill"
                    animate={
                      contextInView
                        ? { width: ["0%", "100%"] }
                        : { width: "0%" }
                    }
                    transition={{
                      duration: 1.6,
                      delay: 0.5,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </motion.div>
            </div>

            {/* Right — Outfit grid */}
            <div>
              <div className="hp-outfit-header">
                <p className="hp-outfit-title">
                  Assembled Outfit{" "}
                  <span className="hp-outfit-count-badge">
                    {compatibleItems.length} items
                  </span>
                </p>
                <span className="hp-outfit-rejected-count">
                  {incompatibleItems.length} rejected
                </span>
              </div>

              {/* Rejected fly-off */}
              <div className="hp-rejected-wrap">
                <AnimatePresence>
                  {outfitVisible &&
                    incompatibleItems.map((item, i) => (
                      <motion.div
                        key={`rej-${item.id}`}
                        className="hp-rejected-item"
                        initial={{ opacity: 1, x: 0 }}
                        animate={{ opacity: 0, x: 240, rotate: 6 }}
                        transition={{
                          duration: 0.65,
                          delay: 0.25 + i * 0.3,
                          ease: "easeIn",
                        }}
                      >
                        <svg
                          viewBox="0 0 14 14"
                          width="11"
                          height="11"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path
                            d="M1 1l12 12M13 1L1 13"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span>{item.emoji}</span>
                        <span>{item.name}</span>
                        <span className="hp-rejected-note">
                          — incompatible with rain / formal
                        </span>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>

              {/* Compatible grid */}
              <div className="hp-outfit-grid">
                {outfitVisible
                  ? compatibleItems.map((item, i) => (
                      <OutfitItemCard
                        key={item.id}
                        item={item}
                        delay={i * 0.1 + 0.6}
                      />
                    ))
                  : Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="hp-skeleton-card"
                        style={
                          {
                            ["--delay" as string]: `${i * 0.15}s`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*  FOOTER CTA STRIP  */}
      <motion.section
        className="hp-footer-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <div className="hp-footer-glow" />
        <div className="hp-footer-content">
          <p className="hp-footer-eyebrow">
            The Future of Fashion Intelligence
          </p>
          <h2 className="hp-footer-h2">
            Your wardrobe is waiting to be{" "}
            <em className="hp-footer-h2-em">intelligent.</em>
          </h2>
          <Link to="/signup">
            <motion.button
              className="hp-footer-cta"
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

export default HomePage;
