import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineCloudUpload,
  HiOutlineCheck,
  HiOutlineArrowLeft,
  HiOutlineSparkles,
  HiOutlineX,
} from "react-icons/hi";
import api from "../services/api";
import "../styles/Upload.css";

const ITEM_TYPES = [
  "Shirt", "T-Shirt", "Pants", "Jeans", "Jacket", "Coat", "Blazer",
  "Sweater", "Hoodie", "Dress", "Skirt", "Shorts", "Shoes", "Sneakers",
  "Boots", "Hat", "Scarf", "Socks", "Bag", "Other",
];

const COLORS = [
  "Black", "White", "Navy", "Blue", "Red", "Green", "Grey", "Brown",
  "Beige", "Pink", "Purple", "Yellow", "Orange", "Olive", "Teal",
  "Maroon", "Cream", "Other",
];

const SEASONS = ["Spring", "Summer", "Autumn", "Winter", "All-Season"];

const PATTERNS = [
  "Solid", "Striped", "Checked", "Plaid", "Floral", "Polka Dot",
  "Graphic", "Abstract", "Other",
];

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface FormState {
  itemType: string;
  color: string;
  pattern: string;
  season: string;
  material: string;
}

const INITIAL_FORM: FormState = {
  itemType: "", color: "", pattern: "", season: "", material: "",
};

function SelectField({
  label, required, value, onChange, options, placeholder, aiPrefilled,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  aiPrefilled?: boolean;
}) {
  return (
    <div className="up-field">
      <label className="up-label">
        {label} {required && <span className="up-required">*</span>}
        {aiPrefilled && value && <span className="up-ai-badge">AI</span>}
      </label>
      <select className="up-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt.toLowerCase()}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

interface ImageSlot {
  file: File | null;
  preview: string | null;
}

function ImageUploadSlot({
  label, slot, onFile, onRemove, inputRef,
}: {
  label: string;
  slot: ImageSlot;
  onFile: (f: File) => void;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  if (slot.preview) {
    return (
      <div className="up-preview-wrap">
        <img src={slot.preview} alt={`${label} preview`} />
        <button type="button" className="up-preview-remove" onClick={onRemove} aria-label={`Remove ${label}`}>×</button>
        <span className="up-preview-label">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={`up-dropzone up-dropzone--compact${dragActive ? " up-dropzone--active" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <HiOutlineCloudUpload size={28} className="up-dropzone-icon" />
      <p className="up-dropzone-text">
        <strong>{label}</strong>
      </p>
      <p className="up-dropzone-hint">Click or drag</p>
      <input ref={inputRef} type="file" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
      }} />
    </div>
  );
}

export default function UploadItem() {
  const navigate = useNavigate();
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const [frontImage, setFrontImage] = useState<ImageSlot>({ file: null, preview: null });
  const [backImage, setBackImage] = useState<ImageSlot>({ file: null, preview: null });
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: keyof FormState) => (val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setAiPrefilled(false);
  };

  const setImageSlot = (setter: typeof setFrontImage, ref: React.RefObject<HTMLInputElement | null>) =>
    (f: File) => {
      setter({ file: f, preview: URL.createObjectURL(f) });
      setError(null);
      setSuccess(null);
    };

  const removeImageSlot = (setter: typeof setFrontImage, slot: ImageSlot, ref: React.RefObject<HTMLInputElement | null>) =>
    () => {
      if (slot.preview) URL.revokeObjectURL(slot.preview);
      setter({ file: null, preview: null });
      if (ref.current) ref.current.value = "";
    };

  const handleAiFill = async () => {
    if (!frontImage.file) {
      setError("Upload a front image first to use AI Fill.");
      return;
    }
    setAiLoading(true);
    setError(null);

    // TODO: Replace with actual POST /wardrobe/analyze call
    await new Promise((r) => setTimeout(r, 1500));

    setForm({
      itemType: "jacket",
      color: "navy",
      pattern: "solid",
      season: "autumn",
      material: "Cotton blend",
    });
    setAiPrefilled(true);
    setAiLoading(false);
  };

  const handleReview = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!frontImage.file) return setError("Please upload a front image of your item.");
    if (!form.itemType) return setError("Please select the item type.");
    if (!form.color) return setError("Please select a color.");

    setShowConfirm(true);
  };

  const handleConfirmUpload = async () => {
    if (!frontImage.file) return;

    const formData = new FormData();
    formData.append("front_image", frontImage.file);
    if (backImage.file) formData.append("back_image", backImage.file);
    formData.append("item_type", form.itemType);
    formData.append("color", form.color);
    if (form.pattern) formData.append("pattern", form.pattern);
    if (form.season) formData.append("season", form.season);
    if (form.material) formData.append("material", form.material);

    setSubmitting(true);
    setShowConfirm(false);
    try {
      await api.post("/wardrobe/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Item uploaded! AI is processing your garment in the background.");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasImage = !!frontImage.preview;

  return (
    <div className="up-root">
      <div className="up-container">

        {/* Back navigation at the top */}
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
          <h1 className="up-h1">Add to your <em>closet</em></h1>
          <p className="up-sub">
            Upload photos of your garment and fill in the details — or let AI do it for you.
          </p>
        </motion.header>

        <motion.div
          className="up-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE_OUT_EXPO }}
        >
          <form className="up-form" onSubmit={handleReview}>

            {/* Image uploads: front + back side by side */}
            <div className="up-images-row">
              <ImageUploadSlot
                label="Front"
                slot={frontImage}
                onFile={setImageSlot(setFrontImage, frontRef)}
                onRemove={removeImageSlot(setFrontImage, frontImage, frontRef)}
                inputRef={frontRef}
              />
              <ImageUploadSlot
                label="Back (optional)"
                slot={backImage}
                onFile={setImageSlot(setBackImage, backRef)}
                onRemove={removeImageSlot(setBackImage, backImage, backRef)}
                inputRef={backRef}
              />
            </div>

            {/* AI Fill button — appears after an image is uploaded */}
            {hasImage && (
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
                  <><span className="up-spinner" />Analyzing with AI…</>
                ) : (
                  <><HiOutlineSparkles size={18} /> AI Fill Details</>
                )}
              </motion.button>
            )}

            {aiPrefilled && (
              <motion.div
                className="up-ai-notice"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <HiOutlineSparkles size={14} /> Fields auto-filled by AI. Review and edit as needed.
              </motion.div>
            )}

            {/* Form fields */}
            <div className="up-field-row">
              <SelectField label="Item Type" required value={form.itemType} onChange={updateField("itemType")} options={ITEM_TYPES} placeholder="Select type…" aiPrefilled={aiPrefilled} />
              <SelectField label="Color" required value={form.color} onChange={updateField("color")} options={COLORS} placeholder="Select color…" aiPrefilled={aiPrefilled} />
            </div>

            <div className="up-field-row">
              <SelectField label="Pattern" value={form.pattern} onChange={updateField("pattern")} options={PATTERNS} placeholder="Select pattern…" aiPrefilled={aiPrefilled} />
              <SelectField label="Season" value={form.season} onChange={updateField("season")} options={SEASONS} placeholder="Select season…" aiPrefilled={aiPrefilled} />
            </div>

            <div className="up-field">
              <label className="up-label">
                Material
                {aiPrefilled && form.material && <span className="up-ai-badge">AI</span>}
              </label>
              <input
                className="up-input"
                type="text"
                placeholder="e.g. Cotton, Polyester, Wool…"
                value={form.material}
                onChange={(e) => updateField("material")(e.target.value)}
              />
            </div>

            {error && <div className="up-error">{error}</div>}
            {success && <div className="up-success"><HiOutlineCheck size={20} /> {success}</div>}

            <div className="up-actions">
              <button type="submit" className="up-submit" disabled={submitting}>
                {submitting ? <><span className="up-spinner" />Uploading…</> : "Review & Upload"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="up-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              className="up-confirm-modal"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="up-confirm-header">
                <h3 className="up-confirm-title">Confirm Upload</h3>
                <button type="button" className="up-confirm-close" onClick={() => setShowConfirm(false)} aria-label="Close">
                  <HiOutlineX size={20} />
                </button>
              </div>

              <div className="up-confirm-body">
                <div className="up-confirm-images">
                  {frontImage.preview && <img src={frontImage.preview} alt="Front" className="up-confirm-thumb" />}
                  {backImage.preview && <img src={backImage.preview} alt="Back" className="up-confirm-thumb" />}
                </div>

                <div className="up-confirm-details">
                  <div className="up-confirm-row"><span>Type</span><strong>{form.itemType || "—"}</strong></div>
                  <div className="up-confirm-row"><span>Color</span><strong>{form.color || "—"}</strong></div>
                  {form.pattern && <div className="up-confirm-row"><span>Pattern</span><strong>{form.pattern}</strong></div>}
                  {form.season && <div className="up-confirm-row"><span>Season</span><strong>{form.season}</strong></div>}
                  {form.material && <div className="up-confirm-row"><span>Material</span><strong>{form.material}</strong></div>}
                </div>
              </div>

              <div className="up-confirm-footer">
                <button type="button" className="up-confirm-cancel" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="up-confirm-submit" onClick={handleConfirmUpload}>
                  <HiOutlineCheck size={18} /> Confirm & Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
