import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineCollection,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineTag,
  HiOutlineTemplate,
} from "react-icons/hi";
import WardrobeCard, {
  type WardrobeCardItem,
} from "../components/wardrobe/WardrobeCard";
import api from "../services/api";
import "../styles/Wardrobe.css";

interface WardrobeItem extends WardrobeCardItem {
  worn_count: number;
  created_at: string;
}

interface WardrobePageResponse {
  items: WardrobeItem[];
  has_more: boolean;
  next_last_seen_created_at?: string | null;
  next_last_seen_id?: string | null;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Wardrobe() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingItemIds, setDeletingItemIds] = useState<
    Record<string, boolean>
  >({});
  const [hasMore, setHasMore] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "clean" | "used">(
    "all",
  );
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [cursorCreatedAt, setCursorCreatedAt] = useState<string | null>(
    new Date().toISOString(),
  );
  const [cursorId, setCursorId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const limit = 20;

  const fetchPage = useCallback(
    async (append: boolean) => {
      if (isFetchingRef.current) return;
      if (append && (!hasMore || !cursorCreatedAt)) return;

      isFetchingRef.current = true;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const params: Record<string, string | number> = { limit };
        if (cursorCreatedAt) params.last_seen_created_at = cursorCreatedAt;
        if (cursorId) params.last_seen_id = cursorId;

        const res = await api.get("/wardrobe/", { params });
        const payload = res.data as WardrobePageResponse | WardrobeItem[];
        const pageItems: WardrobeItem[] = Array.isArray(payload)
          ? payload
          : (payload?.items ?? []);

        const nextCursorCreatedAt = Array.isArray(payload)
          ? null
          : (payload?.next_last_seen_created_at ?? null);
        const nextCursorId = Array.isArray(payload)
          ? null
          : (payload?.next_last_seen_id ?? null);
        const nextHasMore = Array.isArray(payload)
          ? pageItems.length === limit
          : Boolean(payload?.has_more);

        setItems((prev) => {
          const merged = append ? [...prev, ...pageItems] : pageItems;
          const dedupedById = Array.from(
            new Map(merged.map((item) => [item.id, item])).values(),
          );
          return dedupedById;
        });

        setCursorCreatedAt(nextCursorCreatedAt);
        setCursorId(nextCursorId);
        setHasMore(nextHasMore);
      } catch (err: unknown) {
        const axiosErr = err as {
          message?: string;
          response?: { status?: number; data?: unknown };
        };
        console.error("[Wardrobe] Fetch error:", {
          message: axiosErr?.message,
          status: axiosErr?.response?.status,
          data: axiosErr?.response?.data,
        });
        if (!append) {
          setError("Unable to load wardrobe items right now.");
        }
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
        isFetchingRef.current = false;
      }
    },
    [cursorCreatedAt, cursorId, hasMore, limit],
  );

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetchPage(false);
  }, [fetchPage]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          fetchPage(true);
        }
      },
      { root: null, rootMargin: "300px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, loadingMore]);

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      const targetItem = items.find((item) => item.id === itemId);
      const confirmed = window.confirm(
        `Delete ${targetItem?.item_type ?? "this item"}?`,
      );
      if (!confirmed) return;

      setError(null);
      setDeletingItemIds((prev) => ({ ...prev, [itemId]: true }));

      try {
        await api.delete(`/wardrobe/${itemId}`);
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      } catch (err: unknown) {
        const axiosErr = err as {
          message?: string;
          response?: { status?: number; data?: unknown };
        };
        console.error("[Wardrobe] Delete error:", {
          message: axiosErr?.message,
          status: axiosErr?.response?.status,
          data: axiosErr?.response?.data,
        });
        setError("Unable to delete this wardrobe item right now.");
      } finally {
        setDeletingItemIds((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }
    },
    [items],
  );

  const handleToggleClean = useCallback(
    async (itemId: string, currentCleanStatus: boolean) => {
      // Optimistic UI update
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                is_clean: !currentCleanStatus,
                worn_count: currentCleanStatus
                  ? item.worn_count + 1
                  : item.worn_count,
              }
            : item,
        ),
      );

      try {
        const endpoint = currentCleanStatus
          ? `/wardrobe/${itemId}/worn`
          : `/wardrobe/${itemId}/clean`;
        await api.post(endpoint);
      } catch (err: unknown) {
        console.error("[Wardrobe] Toggle status error:", err);
        // Revert on failure
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  is_clean: currentCleanStatus,
                  worn_count: currentCleanStatus
                    ? item.worn_count - 1
                    : item.worn_count,
                }
              : item,
          ),
        );
        setError("Unable to update item status.");
      }
    },
    [],
  );

  const stats = useMemo(() => {
    const total = items.length;
    const clean = items.filter((i) => i.is_clean).length;

    const categories = new Set(items.map((i) => i.category).filter(Boolean));
    const patterns = new Set(items.map((i) => i.pattern).filter(Boolean));

    return {
      total,
      clean,
      categories: Array.from(categories),
      patterns: patterns.size,
    };
  }, [items]);

  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus === "clean" && !item.is_clean) return false;
      if (filterStatus === "used" && item.is_clean) return false;
      if (filterCategory !== "all" && item.category !== filterCategory)
        return false;
      return true;
    });
  }, [items, filterStatus, filterCategory]);

  const isEmpty = !loading && items.length === 0;

  return (
    <div className="wr-root">
      <div className="wr-container">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Link to="/dashboard" className="wr-back-top">
            <HiOutlineArrowLeft size={16} /> Back to Dashboard
          </Link>
        </motion.div>

        <motion.header
          className="wr-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          <div className="wr-eyebrow">
            <div className="wr-eyebrow-line" />
            <span className="wr-eyebrow-text">Wardrobe</span>
          </div>

          <div className="wr-header-row">
            <div>
              <h1 className="wr-h1">
                Your <em>closet</em> collection
              </h1>
              <p className="wr-sub">
                Review all uploaded pieces and keep your style library ready for
                AI outfit recommendations.
              </p>
            </div>

            <Link to="/item/new" className="wr-add-btn">
              <HiOutlinePlus size={16} /> Add Item
            </Link>
          </div>
        </motion.header>

        <section className="wr-stats" aria-label="Wardrobe summary">
          <div className="wr-chip">
            <HiOutlineCollection size={14} /> {stats.total} Total
          </div>
          <div className="wr-chip">
            <HiOutlineCheckCircle size={14} /> {stats.clean} Clean
          </div>
          <div className="wr-chip">
            <HiOutlineTag size={14} /> {stats.categories.length} Categories
          </div>
          <div className="wr-chip">
            <HiOutlineTemplate size={14} /> {stats.patterns} Patterns
          </div>
        </section>

        {/* Filters */}
        {!isEmpty && (
          <section className="flex flex-wrap gap-2 mb-6 items-center">
            <p className="text-(--text-dim) text-[0.8rem] font-medium mr-2">
              Filters:
            </p>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "clean" | "used")}
              className="px-3 py-1.5 rounded-full border border-(--border-subtle) bg-(--surface-1) text-(--text-primary) text-[0.8rem] outline-none cursor-pointer hover:border-(--border-hi) transition-colors"
            >
              <option value="all">All States</option>
              <option value="clean">Clean Only</option>
              <option value="used">Used Only</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-full border border-(--border-subtle) bg-(--surface-1) text-(--text-primary) text-[0.8rem] outline-none cursor-pointer hover:border-(--border-hi) transition-colors capitalize"
            >
              <option value="all">All Categories</option>
              {stats.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat?.replace("_", " ")}
                </option>
              ))}
            </select>
          </section>
        )}

        {loading && (
          <section className="wr-grid" aria-label="Loading wardrobe items">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="wr-skeleton"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </section>
        )}

        {!loading && error && <div className="wr-error">{error}</div>}

        {isEmpty && (
          <motion.section
            className="wr-empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="wr-empty-icon">
              <HiOutlineSparkles size={38} />
            </div>
            <h2 className="wr-empty-h2">No wardrobe items yet</h2>
            <p className="wr-empty-text">
              Upload your first clothing item to start building AI-ready outfit
              combinations.
            </p>
            <Link to="/wardrobe/new" className="wr-empty-cta">
              Upload First Item
            </Link>
          </motion.section>
        )}

        {!loading && !isEmpty && (
          <>
            <section className="wr-grid" aria-label="Wardrobe items">
              {displayedItems.map((item, i) => {
                return (
                  <WardrobeCard
                    key={item.id}
                    item={item}
                    index={i}
                    onDelete={handleDeleteItem}
                    onToggleClean={handleToggleClean}
                    deleting={Boolean(deletingItemIds[item.id])}
                  />
                );
              })}
            </section>

            {loadingMore && (
              <div className="wr-loading-more">
                <div className="wr-chip">Loading more…</div>
              </div>
            )}
            <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
          </>
        )}
      </div>
    </div>
  );
}
