import { AnimatePresence, motion } from "framer-motion";
import { HiOutlineCheck, HiOutlineX } from "react-icons/hi";

interface ConfirmFormState {
  category: string;
  itemType: string;
  color: string;
  pattern: string;
  season: string;
  material: string;
}

interface UploadConfirmModalProps {
  open: boolean;
  frontPreview: string | null;
  backPreview?: string | null;
  form: ConfirmFormState;
  onClose: () => void;
  onConfirm: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function UploadConfirmModal({
  open,
  frontPreview,
  backPreview,
  form,
  onClose,
  onConfirm,
}: UploadConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="up-confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
              <button
                type="button"
                className="up-confirm-close"
                onClick={onClose}
                aria-label="Close"
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            <div className="up-confirm-body">
              <div className="up-confirm-images">
                {frontPreview && (
                  <img
                    src={frontPreview}
                    alt="Front"
                    className="up-confirm-thumb"
                  />
                )}
                {backPreview && (
                  <img
                    src={backPreview}
                    alt="Back"
                    className="up-confirm-thumb"
                  />
                )}
              </div>

              <div className="up-confirm-details">
                <div className="up-confirm-row">
                  <span>Category</span>
                  <strong>{form.category || "—"}</strong>
                </div>
                <div className="up-confirm-row">
                  <span>Type</span>
                  <strong>{form.itemType || "—"}</strong>
                </div>
                <div className="up-confirm-row">
                  <span>Color</span>
                  <strong>{form.color || "—"}</strong>
                </div>
                {form.pattern && (
                  <div className="up-confirm-row">
                    <span>Pattern</span>
                    <strong>{form.pattern}</strong>
                  </div>
                )}
                {form.season && (
                  <div className="up-confirm-row">
                    <span>Season</span>
                    <strong>{form.season}</strong>
                  </div>
                )}
                {form.material && (
                  <div className="up-confirm-row">
                    <span>Material</span>
                    <strong>{form.material}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="up-confirm-footer">
              <button
                type="button"
                className="up-confirm-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="up-confirm-submit"
                onClick={onConfirm}
              >
                <HiOutlineCheck size={18} /> Confirm & Upload
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
