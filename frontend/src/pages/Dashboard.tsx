import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  HiOutlineHome,
  HiOutlineStar,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineMail,
  HiOutlineCalendar,
  HiOutlineGlobeAlt,
  HiOutlinePhotograph,
} from "react-icons/hi";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import "../styles/Dashboard.css";

interface WardrobeItem {
  id: string;
  item_type: string;
  color: string;
  pattern?: string;
  season?: string;
  material?: string;
  front_image_id?: string;
  back_image_id?: string;
  ai_description?: string;
  is_clean: boolean;
  worn_count: number;
  created_at: string;
  updated_at: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

const STATS_CONFIG = [
  { key: "total", icon: HiOutlineHome, label: "Total Items" },
  { key: "clean", icon: HiOutlineStar, label: "Clean Now" },
] as const;

const ONBOARDING_STEPS = [
  {
    bold: "Upload your first item",
    rest: " — snap a photo or use an existing image",
  },
  {
    bold: "Complete your profile",
    rest: " — helps our AI personalise suggestions",
  },
  {
    bold: "Get outfit suggestions",
    rest: " — AI-curated looks for any occasion",
  },
];

function StatCard({
  icon: Icon,
  value,
  label,
  accent,
  delay,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  accent?: string;
  delay: number;
}) {
  return (
    <motion.div
      className="db-stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
    >
      <div className="db-stat-card-icon">
        <Icon size={20} />
      </div>
      <div className="db-stat-card-value">{value}</div>
      <div className="db-stat-card-label">{label}</div>
      {accent && <div className="db-stat-card-accent">{accent}</div>}
    </motion.div>
  );
}

function ItemCard({ item, delay }: { item: WardrobeItem; delay: number }) {
  const imageUrl = item.front_image_id
    ? `/wardrobe/image/${item.front_image_id}`
    : null;

  return (
    <motion.div
      className="db-item-card"
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: EASE_OUT_EXPO }}
    >
      <span
        className={`db-item-card-badge ${item.is_clean ? "db-item-card-badge--clean" : "db-item-card-badge--dirty"}`}
      >
        {item.is_clean ? "Clean" : "Worn"}
      </span>

      {imageUrl ? (
        <div className="db-item-card-thumb">
          <img src={imageUrl} alt={`${item.item_type} – ${item.color}`} />
          {item.ai_description && (
            <div className="db-item-card-overlay">
              <p className="db-item-card-overlay-text">{item.ai_description}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="db-item-card-placeholder">
          <HiOutlinePhotograph size={32} />
        </div>
      )}

      <div className="db-item-card-body">
        <p className="db-item-card-type">{item.item_type}</p>
        <div className="db-item-card-meta">
          <span className="db-item-card-color-label">{item.color}</span>
        </div>
      </div>
    </motion.div>
  );
}

function useWardrobeData() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/wardrobe/", { params: { skip: 0, limit: 100 } })
      .then((res) => {
        if (cancelled) return;
        const payload = res.data;
        setItems(Array.isArray(payload) ? payload : (payload?.items ?? []));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const clean = items.filter((i) => i.is_clean).length;

    return { total, clean };
  }, [items]);

  const recentItems = useMemo(
    () =>
      [...items]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 12),
    [items],
  );

  return { items, loading, stats, recentItems };
}

function getStatValue(
  key: string,
  stats: ReturnType<typeof useWardrobeData>["stats"],
): string | number {
  switch (key) {
    case "total":
      return stats.total;
    case "clean":
      return stats.clean;
    default:
      return "—";
  }
}

function getStatAccent(
  key: string,
  stats: ReturnType<typeof useWardrobeData>["stats"],
): string | undefined {
  switch (key) {
    case "clean":
      return stats.total > 0
        ? `${Math.round((stats.clean / stats.total) * 100)}% ready`
        : undefined;
    default:
      return undefined;
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const { loading, stats, recentItems } = useWardrobeData();
  const isEmpty = !loading && recentItems.length === 0;

  return (
    <div className="db-root">
      <div className="db-container">
        {/* Hero */}
        <section className="db-hero">
          <div className="db-hero-glow" />
          <div className="db-dot-grid" />

          <motion.div
            className="db-hero-content"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            <div className="db-hero-text">
              <div className="db-eyebrow">
                <div className="db-eyebrow-line" />
                <span className="db-eyebrow-text">Dashboard</span>
              </div>

              <h1 className="db-hero-h1">
                Welcome back, <em>{user?.username ?? "there"}</em>
              </h1>

              <p className="db-hero-sub">
                {isEmpty
                  ? "Your digital wardrobe awaits. Start by uploading your first item to unlock intelligent outfit suggestions."
                  : `Your wardrobe holds ${stats.total} item${stats.total !== 1 ? "s" : ""} — ${stats.clean} clean and ready to wear.`}
              </p>
            </div>

            <div className="db-hero-meta">
              {user?.email && (
                <span className="db-hero-meta-item">
                  <HiOutlineMail size={14} /> {user.email}
                </span>
              )}
              {user?.created_at && (
                <span className="db-hero-meta-item">
                  <HiOutlineCalendar size={14} /> Joined{" "}
                  {formatDate(user.created_at)}
                </span>
              )}
              <Link to="/settings" className="db-hero-link">
                Profile & Settings →
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Stats */}
        {loading ? (
          <section className="db-stats-section">
            <div className="db-stats-grid">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="db-skeleton db-skeleton--stat"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="db-stats-section">
            <div className="db-stats-grid">
              {STATS_CONFIG.map((cfg, i) => (
                <StatCard
                  key={cfg.key}
                  icon={cfg.icon}
                  value={getStatValue(cfg.key, stats)}
                  label={cfg.label}
                  accent={getStatAccent(cfg.key, stats)}
                  delay={0.1 + i * 0.1}
                />
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="db-actions-section">
          <div className="db-actions-row">
            <Link
              to="/wardrobe/new"
              className="db-action-btn db-action-btn-primary"
            >
              <HiOutlinePlus size={16} /> Upload Item
            </Link>
            <Link
              to="/outfits"
              className="db-action-btn db-action-btn-secondary"
            >
              <HiOutlineSparkles size={16} /> Get Recommendations
            </Link>
          </div>
        </section>

        {/* Recent Items / Empty State */}
        {loading ? (
          <section className="db-recent-section">
            <div className="db-recent-header">
              <h2 className="db-recent-title">Recent Items</h2>
            </div>
            <div className="db-items-grid">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="db-skeleton db-skeleton--card"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          </section>
        ) : isEmpty ? (
          <section className="db-recent-section">
            <div className="db-empty">
              <div className="db-empty-icon">
                <HiOutlineGlobeAlt size={40} />
              </div>
              <h2 className="db-empty-h2">Get started!</h2>
              <p className="db-empty-body">
                Build your digital wardrobe in three easy steps and unlock
                AI-powered outfit recommendations tailored just for you.
              </p>
              <div className="db-checklist">
                {ONBOARDING_STEPS.map((step, i) => (
                  <div key={i} className="db-checklist-item">
                    <span className="db-checklist-num">{i + 1}</span>
                    <span className="db-checklist-text">
                      <strong>{step.bold}</strong>
                      {step.rest}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="db-recent-section">
            <div className="db-recent-header">
              <h2 className="db-recent-title">Recent Items</h2>
              <span className="db-recent-count">
                {recentItems.length} of {stats.total}
              </span>
            </div>
            <div className="db-items-grid">
              {recentItems.map((item, i) => (
                <ItemCard
                  key={item.id ? `${item.id}-${i}` : `item-${i}`}
                  item={item}
                  delay={0.05 + i * 0.05}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
