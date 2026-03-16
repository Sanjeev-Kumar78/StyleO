import { useState, type ChangeEvent } from "react";
import { HiOutlineCloudUpload } from "react-icons/hi";

export interface ImageSlot {
  file: File | null;
  preview: string | null;
  b64: string | null;
}

interface UploadImageSlotProps {
  label: string;
  slot: ImageSlot;
  onFile: (f: File) => void;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export default function UploadImageSlot({
  label,
  slot,
  onFile,
  onRemove,
  inputRef,
}: UploadImageSlotProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  if (slot.preview) {
    return (
      <div className="up-preview-wrap">
        <img src={slot.preview} alt={`${label} preview`} />
        <button
          type="button"
          className="up-preview-remove"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
        <span className="up-preview-label">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={`up-dropzone up-dropzone--compact${dragActive ? " up-dropzone--active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <HiOutlineCloudUpload size={28} className="up-dropzone-icon" />
      <p className="up-dropzone-text">
        <strong>{label}</strong>
      </p>
      <p className="up-dropzone-hint">Click or drag</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
