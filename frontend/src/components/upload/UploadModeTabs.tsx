type UploadMode = "direct_item" | "outfit_photo" | "product_link";

interface UploadModeTabsProps {
  mode: UploadMode;
  onChange: (mode: UploadMode) => void;
}

const MODES: Array<{ value: UploadMode; label: string }> = [
  { value: "direct_item", label: "Direct Upload" },
  { value: "outfit_photo", label: "Outfit Photo" },
  { value: "product_link", label: "Product Link" },
];

export default function UploadModeTabs({
  mode,
  onChange,
}: UploadModeTabsProps) {
  return (
    <div className="up-mode-tabs" role="tablist" aria-label="Upload modes">
      {MODES.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={mode === item.value}
          className={`up-mode-tab${mode === item.value ? " up-mode-tab--active" : ""}`}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
