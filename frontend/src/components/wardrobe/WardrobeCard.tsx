import { motion } from "framer-motion";
import {
  HiOutlinePhotograph,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineClock,
} from "react-icons/hi";

export interface WardrobeCardItem {
  id: string;
  category?: string;
  item_type: string;
  color: string;
  pattern?: string;
  season?: string;
  material?: string;
  front_image_id?: string;
  ai_description?: string;
  is_clean: boolean;
}

interface WardrobeCardProps {
  item: WardrobeCardItem;
  index: number;
  onDelete: (itemId: string) => void;
  onToggleClean: (itemId: string, currentCleanStatus: boolean) => void;
  deleting: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const toTitle = (value?: string) => {
  if (!value) return "—";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
};

export default function WardrobeCard({
  item,
  index,
  onDelete,
  onToggleClean,
  deleting,
}: WardrobeCardProps) {
  const imageUrl = item.front_image_id
    ? `${API_BASE}/wardrobe/image/${item.front_image_id}`
    : null;

  const tags = [item.pattern, item.season, item.material].filter(Boolean);

  return (
    <motion.article
      className="wr-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.38,
        delay: Math.min(index * 0.04, 0.48),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/*  Clean / Used badge  */}
      <span
        className={`wr-badge ${item.is_clean ? "wr-badge--clean" : "wr-badge--used"}`}
      >
        {item.is_clean ? "Clean" : "Used"}
      </span>

      {/*  Image thumbnail  */}
      {imageUrl ? (
        <div className="wr-thumb">
          <img
            src={imageUrl}
            alt={`${item.item_type} in ${item.color}`}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="wr-thumb wr-thumb--placeholder">
          <HiOutlinePhotograph size={32} />
        </div>
      )}

      {/*  Card body  */}
      <div className="wr-card-body">
        <p className="wr-type">{item.item_type}</p>
        <p className="wr-meta">
          {item.color}
          {item.category ? <> · {toTitle(item.category)}</> : null}
        </p>

        {tags.length > 0 && (
          <div className="wr-tags">
            {tags.map((tag) => (
              <span className="wr-tag" key={tag}>
                {toTitle(tag)}
              </span>
            ))}
          </div>
        )}

        {item.ai_description && (
          <p className="wr-desc">{item.ai_description}</p>
        )}

        <div className="wr-card-actions">
          <button
            type="button"
            className="wr-toggle-btn"
            onClick={() => onToggleClean(item.id, item.is_clean)}
          >
            {item.is_clean ? (
              <>
                <HiOutlineClock size={13} /> Mark Worn
              </>
            ) : (
              <>
                <HiOutlineCheckCircle size={13} /> Mark Clean
              </>
            )}
          </button>

          <button
            type="button"
            className="wr-delete-btn"
            onClick={() => onDelete(item.id)}
            disabled={deleting}
            aria-label={`Delete ${item.item_type}`}
          >
            <HiOutlineTrash size={13} />
            {deleting ? "Deleting…" : "Remove"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
