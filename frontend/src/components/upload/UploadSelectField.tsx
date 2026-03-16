interface UploadSelectFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[] | string[];
  placeholder: string;
  aiPrefilled?: boolean;
}

export default function UploadSelectField({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  aiPrefilled,
}: UploadSelectFieldProps) {
  const normalised = options.map((option) =>
    typeof option === "string"
      ? { value: option.toLowerCase(), label: option }
      : option,
  );

  return (
    <div className="up-field">
      <label className="up-label">
        {label} {required && <span className="up-required">*</span>}
        {aiPrefilled && value && <span className="up-ai-badge">AI</span>}
      </label>
      <select
        className="up-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {normalised.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
