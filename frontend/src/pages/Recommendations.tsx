import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import api, { BACKEND_BASE_URL } from "../services/api";

/*  Types  */
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

/*  Component  */
export default function Recommendations() {
  const [occasion, setOccasion] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [outfits, setOutfits] = useState<OutfitRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Font injection
  useEffect(() => {
    const id = "rec-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Manrope:wght@300;400;500;600&display=swap";
      document.head.appendChild(link);
    }
  }, []);

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
    <div
      style={{
        minHeight: "100vh",
        background: "#0e0e0e",
        fontFamily: "'Manrope', sans-serif",
        color: "#e5e2e1",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "clamp(1.5rem, 4vw, 3.5rem) clamp(1rem, 4vw, 2rem)",
        }}
      >
        {/*  Back Link  */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: "3rem" }}
        >
          <Link
            to="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              color: "#8c947c",
              textDecoration: "none",
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.color = "#a3e635")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.color = "#8c947c")
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Dashboard
          </Link>
        </motion.div>

        {/*  Hero Header  */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          style={{ marginBottom: "3.5rem" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                width: "2rem",
                height: "1px",
                background: "#a3e635",
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#a3e635",
                fontWeight: 600,
              }}
            >
              AI Stylist
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Noto Serif', serif",
              fontSize: "clamp(2.2rem, 5vw, 3.75rem)",
              fontWeight: 300,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: "#e5e2e1",
              margin: 0,
              marginBottom: "1rem",
            }}
          >
            Your personal{" "}
            <em
              style={{
                color: "#a3e635",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              outfit
            </em>{" "}
            curator
          </h1>

          <p
            style={{
              color: "#8c947c",
              fontSize: "0.95rem",
              lineHeight: 1.65,
              maxWidth: "520px",
              margin: 0,
            }}
          >
            Tell us where you're going and what vibe you're looking for. We'll
            craft the perfect look from your clean wardrobe items.
          </p>
        </motion.div>

        {/*  Input Form  */}
        <motion.form
          onSubmit={handleGenerate}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT_EXPO }}
          style={{
            background: "#1c1b1b",
            borderRadius: "1rem",
            padding: "clamp(1.25rem, 3vw, 2rem)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: "1rem",
            alignItems: "end",
            marginBottom: "4rem",
          }}
        >
          {/* Occasion */}
          <label
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8c947c",
                fontWeight: 600,
              }}
            >
              Occasion
            </span>
            <input
              type="text"
              placeholder="e.g., Casual brunch, Office, Date night"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              style={{
                background: "#353534",
                border: "none",
                borderBottom: "1px solid #424936",
                borderRadius: "0.375rem 0.375rem 0 0",
                padding: "0.75rem 1rem",
                color: "#e5e2e1",
                fontSize: "0.9rem",
                outline: "none",
                fontFamily: "'Manrope', sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderBottomColor = "#a3e635")}
              onBlur={(e) => (e.target.style.borderBottomColor = "#424936")}
            />
          </label>

          {/* Preferences */}
          <label
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8c947c",
                fontWeight: 600,
              }}
            >
              Style Preferences
            </span>
            <input
              type="text"
              placeholder="e.g., Minimalist, All black, Comfortable"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              style={{
                background: "#353534",
                border: "none",
                borderBottom: "1px solid #424936",
                borderRadius: "0.375rem 0.375rem 0 0",
                padding: "0.75rem 1rem",
                color: "#e5e2e1",
                fontSize: "0.9rem",
                outline: "none",
                fontFamily: "'Manrope', sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderBottomColor = "#a3e635")}
              onBlur={(e) => (e.target.style.borderBottomColor = "#424936")}
            />
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? "#424936"
                : "linear-gradient(135deg, #ccff80, #a3e635)",
              color: "#121f00",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.75rem 1.5rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              fontFamily: "'Manrope', sans-serif",
              letterSpacing: "0.05em",
              cursor: loading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 0 20px rgba(163,230,53,0.15)",
            }}
          >
            {loading ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: "spin 1s linear infinite" }}
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
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Generate Outfits
              </>
            )}
          </button>
        </motion.form>

        {/*  Error  */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                background: "rgba(147,0,10,0.2)",
                border: "1px solid rgba(255,180,171,0.2)",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                color: "#ffb4ab",
                fontSize: "0.88rem",
                marginBottom: "2rem",
                lineHeight: 1.55,
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/*  Loading skeleton  */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
            >
              {[1, 2].map((n) => (
                <div
                  key={n}
                  style={{
                    background: "#1c1b1b",
                    borderRadius: "1rem",
                    padding: "2rem",
                    animation: "pulse 1.6s ease-in-out infinite",
                  }}
                >
                  <div
                    style={{
                      width: "120px",
                      height: "24px",
                      background: "#2a2a2a",
                      borderRadius: "0.375rem",
                      marginBottom: "1rem",
                    }}
                  />
                  <div
                    style={{
                      width: "70%",
                      height: "14px",
                      background: "#2a2a2a",
                      borderRadius: "0.25rem",
                      marginBottom: "1.5rem",
                    }}
                  />
                  <div style={{ display: "flex", gap: "1rem" }}>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: "160px",
                          height: "200px",
                          flexShrink: 0,
                          background: "#2a2a2a",
                          borderRadius: "0.75rem",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/*  Results  */}
        <AnimatePresence>
          {outfits && outfits.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2.5rem",
              }}
            >
              {outfits.map((outfit, idx) => (
                <OutfitCard
                  key={idx}
                  outfit={outfit}
                  index={idx}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .item-thumb:hover { transform: scale(1.02); }
      `}</style>
    </div>
  );
}

/*  Outfit Card Component  */
function OutfitCard({
  outfit,
  index,
}: {
  outfit: OutfitRecommendation;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay: index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        background: "#1c1b1b",
        borderRadius: "1rem",
        overflow: "hidden",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: "1.75rem 2rem 1.25rem",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <span
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "1.4rem",
                fontWeight: 300,
                color: "#e5e2e1",
                letterSpacing: "-0.01em",
              }}
            >
              Look {index + 1}
            </span>
            <span
              style={{
                background: "rgba(163,230,53,0.12)",
                color: "#a3e635",
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "0.25rem 0.6rem",
                borderRadius: "999px",
              }}
            >
              AI Curated
            </span>
          </div>

          {outfit.reason && (
            <blockquote
              style={{
                margin: 0,
                padding: 0,
                borderLeft: "2px solid rgba(163,230,53,0.4)",
                paddingLeft: "0.75rem",
                color: "#8c947c",
                fontSize: "0.85rem",
                fontStyle: "italic",
                lineHeight: 1.6,
                maxWidth: "600px",
              }}
            >
              {outfit.reason}
            </blockquote>
          )}
        </div>

        <span
          style={{
            background: "#201f1f",
            color: "#8c947c",
            fontSize: "0.7rem",
            fontWeight: 500,
            letterSpacing: "0.08em",
            padding: "0.3rem 0.7rem",
            borderRadius: "0.375rem",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {outfit.items.length} item{outfit.items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Horizontal item carousel */}
      <div
        style={{
          overflowX: "auto",
          padding: "0.5rem 1.5rem 2rem",
          display: "flex",
          gap: "1rem",
          scrollbarWidth: "none",
        }}
      >
        {outfit.items.map((item) => (
          <ItemThumb key={item._id} item={item} />
        ))}
      </div>
    </motion.div>
  );
}

/*  Item Thumbnail  */
function ItemThumb({ item }: { item: OutfitItem }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = item.front_image_id
    ? `${BACKEND_BASE_URL}/wardrobe/image/${item.front_image_id}`
    : null;

  return (
    <div
      className="item-thumb"
      style={{
        flexShrink: 0,
        width: "160px",
        background: "#201f1f",
        borderRadius: "0.75rem",
        overflow: "hidden",
        transition: "transform 0.2s ease",
        cursor: "default",
      }}
    >
      {/* Image area */}
      <div
        style={{
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#201f1f",
          position: "relative",
        }}
      >
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={item.item_type}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              color: "#424936",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: "0.65rem" }}>No image</span>
          </div>
        )}

        {/* Category chip overlay */}
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            left: "0.5rem",
            background: "rgba(19,19,19,0.75)",
            backdropFilter: "blur(8px)",
            color: "#c2cab0",
            fontSize: "0.6rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "0.2rem 0.5rem",
            borderRadius: "999px",
          }}
        >
          {item.category}
        </div>
      </div>

      {/* Item info */}
      <div style={{ padding: "0.75rem 0.875rem" }}>
        <p
          style={{
            margin: 0,
            color: "#e5e2e1",
            fontSize: "0.78rem",
            fontWeight: 500,
            textTransform: "capitalize",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: "0.2rem",
          }}
        >
          {item.item_type}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {item.color && (
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: item.color.toLowerCase(),
                border: "1px solid rgba(255,255,255,0.1)",
                flexShrink: 0,
              }}
            />
          )}
          <p
            style={{
              margin: 0,
              color: "#8c947c",
              fontSize: "0.7rem",
              textTransform: "capitalize",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.color}
            {item.material ? ` · ${item.material}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
