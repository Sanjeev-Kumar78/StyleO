import { useMemo, useState, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  HiOutlineCheck,
  HiOutlineArrowLeft,
  HiOutlineSparkles,
} from "react-icons/hi";
import api from "../services/api";
import UploadModeTabs from "../components/upload/UploadModeTabs";
import UploadSelectField from "../components/upload/UploadSelectField";
import UploadImageSlot, {
  type ImageSlot,
} from "../components/upload/UploadImageSlot";
import OutfitCandidateGrid from "../components/upload/OutfitCandidateGrid";
import UploadConfirmModal from "../components/upload/UploadConfirmModal";
import "../styles/Upload.css";

const CATEGORIES = [
  { value: "topwear", label: "Topwear" },
  { value: "bottomwear", label: "Bottomwear" },
  { value: "fullbody", label: "Full Body" },
  { value: "outerwear", label: "Outerwear" },
  { value: "activewear", label: "Activewear" },
  { value: "footwear", label: "Footwear" },
  { value: "accessory", label: "Accessory" },
];

const SEASONS = ["Spring", "Summer", "Autumn", "Winter", "All-Season"];

const PATTERNS = [
  "Solid",
  "Striped",
  "Checked",
  "Plaid",
  "Floral",
  "Polka Dot",
  "Graphic",
  "Abstract",
  "Other",
];

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

type UploadMode = "direct_item" | "outfit_photo" | "product_link";

interface OutfitCandidate {
  candidate_id: string;
  label: string;
  front_image_b64: string;
  width: number;
  height: number;
}

interface AiMetadata {
  category?: string;
  item_type?: string;
  color?: string;
  pattern?: string;
  season?: string;
  material?: string;
  ai_description?: string;
}

interface FormState {
  category: string;
  itemType: string;
  color: string;
  pattern: string;
  season: string;
  material: string;
  aiDescription: string; // hidden — always AI-generated
}

const INITIAL_FORM: FormState = {
  category: "",
  itemType: "",
  color: "",
  pattern: "",
  season: "",
  material: "",
  aiDescription: "",
};

function canonicalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function resolveSelectValue(
  rawValue: string | undefined,
  options: { value: string; label: string }[] | string[],
  fallback: string = "",
): string {
  if (!rawValue) return fallback;

  const normalizedOptions = options.map((option) =>
    typeof option === "string"
      ? { value: option.toLowerCase(), label: option }
      : option,
  );

  const target = canonicalize(rawValue);

  const match = normalizedOptions.find((option) => {
    const optionValue = canonicalize(option.value);
    const optionLabel = canonicalize(option.label);
    return optionValue === target || optionLabel === target;
  });

  return match ? match.value : fallback;
}

function extractErrorDetail(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if (!("response" in error)) return undefined;

  const response = (
    error as {
      response?: {
        data?: { detail?: unknown; message?: unknown; error?: unknown };
      };
      message?: unknown;
    }
  ).response;

  const detail = response?.data?.detail;
  if (typeof detail === "string") return detail;

  const message = response?.data?.message;
  if (typeof message === "string") return message;

  const fallback = (error as { message?: unknown }).message;
  return typeof fallback === "string" ? fallback : undefined;
}

/*  Main component  */

export default function UploadItem() {
  const navigate = useNavigate();
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const outfitRef = useRef<HTMLInputElement>(null);

  const [uploadMode, setUploadMode] = useState<UploadMode>("direct_item");
  const [frontImage, setFrontImage] = useState<ImageSlot>({
    file: null,
    preview: null,
    b64: null,
  });
  const [backImage, setBackImage] = useState<ImageSlot>({
    file: null,
    preview: null,
    b64: null,
  });
  const [outfitImage, setOutfitImage] = useState<ImageSlot>({
    file: null,
    preview: null,
    b64: null,
  });
  const [outfitCandidates, setOutfitCandidates] = useState<OutfitCandidate[]>(
    [],
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [productUrl, setProductUrl] = useState("");

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCandidate = useMemo(
    () =>
      outfitCandidates.find(
        (candidate) => candidate.candidate_id === selectedCandidateId,
      ) ?? null,
    [outfitCandidates, selectedCandidateId],
  );

  const updateField = (key: keyof FormState) => (val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setAiPrefilled(false);
  };

  const setImageSlot =
    (setter: React.Dispatch<React.SetStateAction<ImageSlot>>) => (f: File) => {
      setter((prev) => {
        if (prev.preview && !prev.b64) URL.revokeObjectURL(prev.preview);
        return { file: f, preview: URL.createObjectURL(f), b64: null };
      });
      setError(null);
      setSuccess(null);
    };

  const removeImageSlot =
    (
      setter: typeof setFrontImage,
      slot: ImageSlot,
      ref: React.RefObject<HTMLInputElement | null>,
    ) =>
    () => {
      if (slot.preview && !slot.b64) URL.revokeObjectURL(slot.preview);
      setter({ file: null, preview: null, b64: null });
      if (ref.current) ref.current.value = "";
    };

  const handleModeChange = (mode: UploadMode) => {
    setUploadMode(mode);
    setError(null);
    setSuccess(null);
  };

  const applyMetadataToForm = (metadata: AiMetadata) => {
    setForm({
      category: resolveSelectValue(metadata.category, CATEGORIES, ""),
      itemType: metadata.item_type || "",
      color: metadata.color || "",
      pattern: resolveSelectValue(metadata.pattern, PATTERNS, "other"),
      season: resolveSelectValue(metadata.season, SEASONS, ""),
      material: metadata.material || "",
      aiDescription: metadata.ai_description || "",
    });
    setAiPrefilled(true);
  };

  const requestMetadata = async (frontB64: string, backB64?: string | null) => {
    const { data } = await api.post("/wardrobe/analyze/metadata", {
      front_image_b64: frontB64,
      back_image_b64: backB64 || null,
    });
    return data.metadata;
  };

  const prepareDirectImages = async () => {
    if (!frontImage.file) {
      throw new Error("Upload a front image first to use AI Fill.");
    }

    const formData = new FormData();
    formData.append("front_image", frontImage.file);
    if (backImage.file) formData.append("back_image", backImage.file);

    const { data } = await api.post("/wardrobe/analyze/direct", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const frontB64 = data.images.front_image_b64 as string;
    const backB64 = (data.images.back_image_b64 as string | null) || null;

    setFrontImage((prev) => {
      if (prev.preview && !prev.b64) URL.revokeObjectURL(prev.preview);
      return { file: prev.file, preview: frontB64, b64: frontB64 };
    });

    if (backB64) {
      setBackImage((prev) => {
        if (prev.preview && !prev.b64) URL.revokeObjectURL(prev.preview);
        return { file: prev.file, preview: backB64, b64: backB64 };
      });
    }

    return { frontB64, backB64 };
  };

  const prepareOutfitCandidates = async () => {
    if (!outfitImage.file) {
      throw new Error("Upload an outfit photo first.");
    }

    const formData = new FormData();
    formData.append("image", outfitImage.file);

    const { data } = await api.post("/wardrobe/analyze/outfit", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const candidates: OutfitCandidate[] = data.candidates || [];
    if (!candidates.length) {
      throw new Error("No garment candidates found in this outfit photo.");
    }

    setOutfitCandidates(candidates);
    return candidates;
  };

  const handleSegmentOutfit = async () => {
    setAiLoading(true);
    setError(null);

    try {
      await prepareOutfitCandidates();
    } catch (err: unknown) {
      const detail = extractErrorDetail(err);
      setError(
        detail ??
          (err instanceof Error
            ? err.message
            : "Outfit segmentation failed. Please try again."),
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiFill = async () => {
    setAiLoading(true);
    setError(null);

    try {
      if (uploadMode === "product_link") {
        if (!productUrl.trim())
          throw new Error("Please enter a product URL first.");
        const { data } = await api.post("/wardrobe/analyze/product-link", {
          url: productUrl.trim(),
        });
        setError(data?.message || "Product-link flow is not implemented yet.");
        return;
      }

      if (uploadMode === "direct_item") {
        const { frontB64, backB64 } = await prepareDirectImages();
        const metadata = await requestMetadata(frontB64, backB64);
        applyMetadataToForm(metadata);
        return;
      }

      if (!outfitCandidates.length) {
        throw new Error("Please segment the outfit image first.");
      }

      if (!selectedCandidateId) {
        throw new Error("Please select one segmented item first.");
      }

      const chosen = outfitCandidates.find(
        (candidate) => candidate.candidate_id === selectedCandidateId,
      );
      if (!chosen) {
        throw new Error(
          "Selected segmented item is invalid. Please select again.",
        );
      }

      const metadata = await requestMetadata(chosen.front_image_b64);
      applyMetadataToForm(metadata);
    } catch (err: unknown) {
      const detail = extractErrorDetail(err);
      setError(
        detail ??
          (err instanceof Error
            ? err.message
            : "AI analysis failed. Please try again."),
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleReview = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (uploadMode === "product_link") {
      setError("Product-link upload is not implemented yet.");
      return;
    }

    if (uploadMode === "direct_item" && !frontImage.file && !frontImage.b64) {
      setError("Please upload a front image of your item.");
      return;
    }

    if (uploadMode === "outfit_photo" && !selectedCandidate) {
      setError(
        "Please run AI Fill to detect clothing candidates and select one.",
      );
      return;
    }

    if (!form.category) return setError("Please select the category.");
    if (!form.itemType) return setError("Please enter the item type.");
    if (!form.color) return setError("Please enter a color.");

    setShowConfirm(true);
  };

  const handleConfirmUpload = async () => {
    if (uploadMode === "product_link") return;

    setSubmitting(true);
    setShowConfirm(false);
    try {
      let frontB64: string | null = null;
      let backB64: string | null = null;

      if (uploadMode === "direct_item") {
        if (frontImage.b64) {
          frontB64 = frontImage.b64;
          backB64 = backImage.b64;
        } else {
          const prepared = await prepareDirectImages();
          frontB64 = prepared.frontB64;
          backB64 = prepared.backB64;
        }
      } else {
        let chosenCandidate = selectedCandidate;
        if (!chosenCandidate) {
          const candidates = await prepareOutfitCandidates();
          chosenCandidate = candidates[0];
          setSelectedCandidateId(chosenCandidate.candidate_id);
        }
        frontB64 = chosenCandidate.front_image_b64;
        backB64 = null;
      }

      if (!frontB64) {
        throw new Error("Unable to prepare image for upload.");
      }

      if (!form.aiDescription) {
        const metadata = await requestMetadata(frontB64, backB64);
        setForm((prev) => ({
          ...prev,
          aiDescription: metadata.ai_description || prev.aiDescription,
        }));
      }

      const payload = {
        front_image_b64: frontB64,
        back_image_b64: backB64 || null,
        ingestion_mode: uploadMode,
        category: form.category,
        item_type: form.itemType,
        color: form.color,
        pattern: form.pattern || null,
        season: form.season || null,
        material: form.material || null,
        ai_description: form.aiDescription,
      };

      await api.post("/wardrobe/confirm", payload);
      setSuccess(
        "Item added to your closet! AI is generating embeddings in the background.",
      );
      setTimeout(() => navigate("/closet"), 2000);
    } catch (err: unknown) {
      const detail = extractErrorDetail(err);
      setError(
        detail ??
          (err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hasImage =
    uploadMode === "direct_item"
      ? !!frontImage.preview || !!frontImage.file
      : uploadMode === "outfit_photo"
        ? !!outfitImage.preview ||
          !!outfitImage.file ||
          !!outfitCandidates.length
        : false;

  const confirmFrontPreview =
    uploadMode === "outfit_photo"
      ? selectedCandidate?.front_image_b64 || null
      : frontImage.preview;

  const confirmBackPreview =
    uploadMode === "direct_item" ? backImage.preview : null;

  return (
    <div className="up-root">
      <div className="up-container">
        {/* Back navigation */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link to="/dashboard" className="up-back-top">
            <HiOutlineArrowLeft size={16} /> Back to Dashboard
          </Link>
        </motion.div>

        <motion.header
          className="up-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          <div className="up-eyebrow">
            <div className="up-eyebrow-line" />
            <span className="up-eyebrow-text">Wardrobe</span>
          </div>
          <h1 className="up-h1">
            Add to your <em>closet</em>
          </h1>
          <p className="up-sub">
            Upload photos of your garment and let AI fill in the details — or do
            it manually.
          </p>
        </motion.header>

        <motion.div
          className="up-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE_OUT_EXPO }}
        >
          <form className="up-form" onSubmit={handleReview}>
            <UploadModeTabs mode={uploadMode} onChange={handleModeChange} />

            {uploadMode === "direct_item" && (
              <div className="up-images-row">
                <UploadImageSlot
                  label="Front"
                  slot={frontImage}
                  onFile={setImageSlot(setFrontImage)}
                  onRemove={removeImageSlot(
                    setFrontImage,
                    frontImage,
                    frontRef,
                  )}
                  inputRef={frontRef}
                />
                <UploadImageSlot
                  label="Back (optional)"
                  slot={backImage}
                  onFile={setImageSlot(setBackImage)}
                  onRemove={removeImageSlot(setBackImage, backImage, backRef)}
                  inputRef={backRef}
                />
              </div>
            )}

            {uploadMode === "outfit_photo" && (
              <>
                <UploadImageSlot
                  label="Outfit Photo"
                  slot={outfitImage}
                  onFile={(file) => {
                    setImageSlot(setOutfitImage)(file);
                    setOutfitCandidates([]);
                    setSelectedCandidateId(null);
                    setAiPrefilled(false);
                    setForm(INITIAL_FORM);
                  }}
                  onRemove={() => {
                    removeImageSlot(setOutfitImage, outfitImage, outfitRef)();
                    setOutfitCandidates([]);
                    setSelectedCandidateId(null);
                    setAiPrefilled(false);
                    setForm(INITIAL_FORM);
                  }}
                  inputRef={outfitRef}
                />

                <OutfitCandidateGrid
                  candidates={outfitCandidates}
                  selectedCandidateId={selectedCandidateId}
                  onSelect={(candidateId) => {
                    setSelectedCandidateId(candidateId);
                    setAiPrefilled(false);
                    setForm((prev) => ({ ...prev, aiDescription: "" }));
                  }}
                />
              </>
            )}

            {uploadMode === "product_link" && (
              <div className="up-field">
                <label className="up-label">Product URL</label>
                <input
                  className="up-input"
                  type="url"
                  placeholder="https://www.myntra.com/..."
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                />
                <p className="up-dropzone-hint">
                  This mode is currently a backend stub and not yet implemented.
                </p>
              </div>
            )}

            {uploadMode === "outfit_photo" &&
              !!outfitImage.file &&
              !outfitCandidates.length && (
                <motion.button
                  type="button"
                  className="up-ai-fill-btn"
                  onClick={handleSegmentOutfit}
                  disabled={aiLoading}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  {aiLoading ? (
                    <>
                      <span className="up-spinner" />
                      Segmenting outfit…
                    </>
                  ) : (
                    <>
                      <HiOutlineSparkles size={18} /> Segment Outfit
                    </>
                  )}
                </motion.button>
              )}

            {((uploadMode === "direct_item" && hasImage) ||
              (uploadMode === "outfit_photo" && !!selectedCandidate)) && (
              <motion.button
                type="button"
                className="up-ai-fill-btn"
                onClick={handleAiFill}
                disabled={aiLoading}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                {aiLoading ? (
                  <>
                    <span className="up-spinner" />
                    Analyzing with AI…
                  </>
                ) : (
                  <>
                    <HiOutlineSparkles size={18} /> AI Fill Details
                  </>
                )}
              </motion.button>
            )}

            {aiPrefilled && (
              <motion.div
                className="up-ai-notice"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <HiOutlineSparkles size={14} /> Fields auto-filled by AI. Review
                and edit as needed.
              </motion.div>
            )}

            <div className="up-field-row">
              <UploadSelectField
                label="Category"
                required
                value={form.category}
                onChange={updateField("category")}
                options={CATEGORIES}
                placeholder="Select category…"
                aiPrefilled={aiPrefilled}
              />
              <div className="up-field">
                <label className="up-label">
                  Item Type <span className="up-required">*</span>
                  {aiPrefilled && form.itemType && (
                    <span className="up-ai-badge">AI</span>
                  )}
                </label>
                <input
                  className="up-input"
                  type="text"
                  placeholder="e.g. T-Shirt, Denim Jacket, Sneakers…"
                  value={form.itemType}
                  onChange={(e) => updateField("itemType")(e.target.value)}
                />
              </div>
            </div>

            <div className="up-field-row">
              <div className="up-field">
                <label className="up-label">
                  Color <span className="up-required">*</span>
                  {aiPrefilled && form.color && (
                    <span className="up-ai-badge">AI</span>
                  )}
                </label>
                <input
                  className="up-input"
                  type="text"
                  placeholder="e.g. Navy Blue, Black, Red…"
                  value={form.color}
                  onChange={(e) => updateField("color")(e.target.value)}
                />
              </div>
              <UploadSelectField
                label="Pattern"
                value={form.pattern}
                onChange={updateField("pattern")}
                options={PATTERNS}
                placeholder="Select pattern…"
                aiPrefilled={aiPrefilled}
              />
            </div>

            <div className="up-field-row">
              <UploadSelectField
                label="Season"
                value={form.season}
                onChange={updateField("season")}
                options={SEASONS}
                placeholder="Select season…"
                aiPrefilled={aiPrefilled}
              />
              <div className="up-field">
                <label className="up-label">
                  Material
                  {aiPrefilled && form.material && (
                    <span className="up-ai-badge">AI</span>
                  )}
                </label>
                <input
                  className="up-input"
                  type="text"
                  placeholder="e.g. Cotton, Polyester, Wool…"
                  value={form.material}
                  onChange={(e) => updateField("material")(e.target.value)}
                />
              </div>
            </div>

            {form.aiDescription && (
              <motion.div
                className="up-ai-description"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="up-label">
                  <HiOutlineSparkles size={14} /> AI Description
                </label>
                <p className="up-ai-desc-text">{form.aiDescription}</p>
              </motion.div>
            )}

            {error && <div className="up-error">{error}</div>}
            {success && (
              <div className="up-success">
                <HiOutlineCheck size={20} /> {success}
              </div>
            )}

            <div className="up-actions">
              <button type="submit" className="up-submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="up-spinner" />
                    Uploading…
                  </>
                ) : (
                  "Review & Upload"
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <UploadConfirmModal
        open={showConfirm}
        frontPreview={confirmFrontPreview}
        backPreview={confirmBackPreview}
        form={form}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmUpload}
      />
    </div>
  );
}
