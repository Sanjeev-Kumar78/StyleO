import { useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import useAuthenticatedImage from "../hooks/useAuthenticatedImage";
import api from "../services/api";
import "../styles/Recommendations.css";

interface OutfitItem {
  _id: string;
  category: string;
  item_type: string;
  color: string;
  pattern?: string;
  material?: string;
  front_image_id?: string;
}

interface OutfitRecommendation {
  items: OutfitItem[];
  reason: string;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Recommendations() {
  const [occasion, setOccasion] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [outfits, setOutfits] = useState<OutfitRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOutfits(null);

    try {
      const res = await api.post("/recommend/", { occasion, preferences });
      const data = res.data.outfits ?? [];
      setOutfits(data);

      if (data.length === 0) {
        setError(
          res.data.message ||
            "No clean clothes found matching your criteria. Add more items to your wardrobe or mark items as clean.",
        );
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { detail?: string; message?: string } };
      };
      setError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.detail ||
          "Failed to generate recommendations. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="rec-root">
      <div className="rec-container">
        <motion.div
          className="rec-back-wrap"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link className="rec-back-link" to="/dashboard">
            <svg
              className="rec-icon rec-back-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Dashboard
          </Link>
        </motion.div>

        <motion.header
          className="rec-hero"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          <div className="rec-eyebrow">
            <span className="rec-eyebrow-line" aria-hidden="true" />
            <span className="rec-eyebrow-text">AI Stylist</span>
          </div>

          <h1 className="rec-title">
            Your personal <em>outfit</em> curator
          </h1>
          <p className="rec-subtitle">
            Tell us where you're going and what vibe you're looking for. We'll
            craft the perfect look from your clean wardrobe items.
          </p>
        </motion.header>

        <motion.form
          className="rec-form"
          onSubmit={handleGenerate}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT_EXPO }}
        >
          <label className="rec-field">
            <span className="rec-label">Occasion</span>
            <input
              className="rec-input"
              type="text"
              placeholder="e.g., Casual brunch, Office, Date night"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            />
          </label>

          <label className="rec-field">
            <span className="rec-label">Style Preferences</span>
            <input
              className="rec-input"
              type="text"
              placeholder="e.g., Minimalist, All black, Comfortable"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
            />
          </label>

          <button
            className={`rec-submit${loading ? " rec-submit--loading" : ""}`}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg
                  className="rec-icon rec-spinner"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Consulting AI…
              </>
            ) : (
              <>
                <svg
                  className="rec-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Generate Outfits
              </>
            )}
          </button>
        </motion.form>

        <AnimatePresence>
          {error && (
            <motion.div
              className="rec-error"
              key="error"
              role="alert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {loading && (
            <motion.div
              className="rec-loading"
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[1, 2].map((n) => (
                <div className="rec-skeleton" key={n}>
                  <div className="rec-skeleton-title" />
                  <div className="rec-skeleton-copy" />
                  <div className="rec-skeleton-items">
                    {[1, 2, 3].map((i) => (
                      <div className="rec-skeleton-item" key={i} />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {outfits && outfits.length > 0 && (
            <motion.div
              className="rec-results"
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {outfits.map((outfit, idx) => (
                <OutfitCard key={idx} outfit={outfit} index={idx} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function OutfitCard({
  outfit,
  index,
}: {
  outfit: OutfitRecommendation;
  index: number;
}) {
  return (
    <motion.section
      className="rec-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay: index * 0.12,
        ease: EASE_OUT_EXPO,
      }}
    >
      <div className="rec-card-header">
        <div className="rec-card-intro">
          <div className="rec-card-heading">
            <h2 className="rec-card-title">Look {index + 1}</h2>
            <span className="rec-badge">AI Curated</span>
          </div>
          {outfit.reason && <blockquote className="rec-reason">{outfit.reason}</blockquote>}
        </div>

        <span className="rec-item-count">
          {outfit.items.length} item{outfit.items.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rec-items">
        {outfit.items.map((item) => (
          <ItemThumb key={item._id} item={item} />
        ))}
      </div>
    </motion.section>
  );
}

function ItemThumb({ item }: { item: OutfitItem }) {
  const [imgError, setImgError] = useState(false);
  const { imageUrl: imgSrc } = useAuthenticatedImage(item.front_image_id);

  return (
    <article className="rec-item">
      <div className="rec-item-image-wrap">
        {imgSrc && !imgError ? (
          <img
            className="rec-item-image"
            src={imgSrc}
            alt={item.item_type}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="rec-item-placeholder">
            <svg
              className="rec-placeholder-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>No image</span>
          </div>
        )}

        <span className="rec-category">{item.category}</span>
      </div>

      <div className="rec-item-details">
        <p className="rec-item-name">{item.item_type}</p>
        <div className="rec-item-meta">
          {item.color && (
            <span
              className="rec-color-dot"
              style={{ backgroundColor: item.color.toLowerCase() }}
              aria-hidden="true"
            />
          )}
          <p className="rec-item-description">
            {item.color}
            {item.material ? ` · ${item.material}` : ""}
          </p>
        </div>
      </div>
    </article>
  );
}
