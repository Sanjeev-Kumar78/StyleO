import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import api, { BACKEND_BASE_URL } from "../services/api";
import "../styles/Profile.css";
import {
  HiOutlineUser,
  HiOutlineKey,
  HiOutlineSparkles,
  HiOutlineLocationMarker,
  HiOutlineMail,
  HiOutlineCalendar,
  HiOutlineCheck,
  HiOutlinePencil,
  HiOutlineCamera,
  HiOutlineX,
} from "react-icons/hi";



const BODY_TYPE_OPTIONS = ["Slim", "Athletic", "Regular", "Broad", "Curvy", "Petite"];
const FITNESS_LEVEL_OPTIONS = ["Sedentary", "Light", "Moderate", "Active", "Very Active"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

// Helper: turns a comma-separated string into a trimmed, non-empty string array
const csvToArray = (csv: string) =>
  csv.split(",").map((s) => s.trim()).filter(Boolean);

interface ProfileData {
  id: string;
  gender: string | null;
  age: number | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  style_preference: string[];
  body_type: string | null;
  favorite_colors: string[];
  fitness_level: string | null;
  is_complete: boolean;
}

interface ProfileFormValues {
  gender: string;
  age: string;
  country: string;
  bio: string;
  // stored as comma-separated text in the form, converted to array on save
  style_preference: string;
  body_type: string;
  favorite_colors: string;
  fitness_level: string;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(isOnboarding);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Avatar upload state kept outside the form since it's a separate endpoint
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      gender: "",
      age: "",
      country: "",
      bio: "",
      style_preference: "",
      body_type: "",
      favorite_colors: "",
      fitness_level: "",
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<ProfileData>("/profile/");
        setProfile(data);
        // Populate form with whatever is already stored
        reset({
          gender: data.gender ?? "",
          age: data.age !== null ? String(data.age) : "",
          country: data.country ?? "",
          bio: data.bio ?? "",
          // Join arrays into comma-separated strings for the free-text inputs
          style_preference: (data.style_preference ?? []).join(", "),
          body_type: data.body_type ?? "",
          favorite_colors: (data.favorite_colors ?? []).join(", "),
          fitness_level: data.fitness_level ?? "",
        });
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSaveError(null);
    try {
      const payload = {
        gender: values.gender || null,
        age: values.age ? Number(values.age) : null,
        country: values.country || null,
        bio: values.bio || null,
        // Convert comma-separated strings back to arrays before sending
        style_preference: csvToArray(values.style_preference),
        body_type: values.body_type || null,
        favorite_colors: csvToArray(values.favorite_colors),
        fitness_level: values.fitness_level || null,
      };
      const { data } = await api.put<ProfileData>("/profile/", payload);
      setProfile(data);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Couldn't save changes. Please try again.");
    }
  };

  const handleCancel = () => {
    // Revert the form to the last successfully saved values
    if (profile) {
      reset({
        gender: profile.gender ?? "",
        age: profile.age !== null ? String(profile.age) : "",
        country: profile.country ?? "",
        bio: profile.bio ?? "",
        style_preference: (profile.style_preference ?? []).join(", "),
        body_type: profile.body_type ?? "",
        favorite_colors: (profile.favorite_colors ?? []).join(", "),
        fitness_level: profile.fitness_level ?? "",
      });
    }
    setAvatarPreview(null);
    setAvatarFile(null);
    setIsEditing(false);
    setSaveError(null);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("file", avatarFile);
      const { data } = await api.post<{ avatar_url: string }>("/profile/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatar_url } : prev));
      setAvatarPreview(null);
      setAvatarFile(null);
    } catch {
      setSaveError("Avatar upload failed. Please try a smaller image.");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="pr-root">
        <div className="pr-container pr-loading-screen">
          <div className="pr-spinner" />
          <p>Loading your profile…</p>
        </div>
      </div>
    );
  }

  const avatarSrc = avatarPreview
    ? avatarPreview
    : profile?.avatar_url
    ? `${BACKEND_BASE_URL}${profile.avatar_url}`
    : null;

  return (
    <div className="pr-root">
      <div className="pr-container">

        {/* Onboarding welcome banner */}
        <AnimatePresence>
          {isOnboarding && !profile?.is_complete && (
            <motion.div
              key="onboarding-banner"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pr-onboarding-banner"
            >
              <span className="pr-onboarding-icon">👋</span>
              <div>
                <p className="pr-onboarding-title">Welcome to StyleO, {user?.username}!</p>
                <p className="pr-onboarding-sub">
                  Complete your Style DNA so our AI can personalise outfit recommendations just for you.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save-success toast */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pr-toast"
            >
              <HiOutlineCheck /> Profile saved
            </motion.div>
          )}
        </AnimatePresence>

        {/* No form element — we call handleSubmit(onSubmit)() imperatively so the
            'Edit Profile' button can never accidentally trigger a submission */}
        <div>

          {/* Header card */}
          <div className="pr-header-card">
            <div className="pr-header-content">

              {/* Avatar */}
              <div
                className="pr-avatar-wrap"
                role="button"
                tabIndex={0}
                onClick={() => isEditing && avatarInputRef.current?.click()}
                style={{ cursor: isEditing ? "pointer" : "default" }}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Your avatar" className="pr-avatar-img" />
                ) : (
                  <span className="pr-avatar-placeholder">
                    {user?.username?.[0]?.toUpperCase() || <HiOutlineUser />}
                  </span>
                )}
                {isEditing && (
                  <div className="pr-avatar-overlay">
                    <HiOutlineCamera size={20} />
                  </div>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleAvatarSelect}
              />

              {/* Username + meta */}
              <div className="pr-user-info">
                <h1 className="pr-username">{user?.username || "Style Explorer"}</h1>
                <div className="pr-user-meta">
                  <div className="pr-user-meta-item">
                    <HiOutlineMail />
                    <span>{user?.email}</span>
                  </div>
                  <div className="pr-user-meta-item">
                    <HiOutlineCalendar />
                    <span>
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString("en-US", {
                            month: "long", year: "numeric",
                          })
                        : "Recently joined"}
                    </span>
                  </div>
                  {profile?.country && (
                    <div className="pr-user-meta-item">
                      <HiOutlineLocationMarker />
                      <span>{profile.country}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit / Save / Cancel */}
              <div className="pr-header-actions">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      className="pr-btn pr-btn-primary"
                      onClick={() => void handleSubmit(onSubmit)()}
                      disabled={isSubmitting}
                    >
                      <HiOutlineCheck />
                      {isSubmitting ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      className="pr-btn pr-btn-ghost"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      <HiOutlineX /> Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="pr-btn pr-btn-outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <HiOutlinePencil /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Staged avatar confirm strip */}
            <AnimatePresence>
              {avatarFile && (
                <motion.div
                  key="avatar-confirm"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pr-avatar-confirm"
                >
                  <span>Upload this photo as your avatar?</span>
                  <button
                    type="button"
                    className="pr-btn pr-btn-primary pr-btn-sm"
                    onClick={handleAvatarUpload}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? "Uploading…" : "Confirm Upload"}
                  </button>
                  <button
                    type="button"
                    className="pr-btn pr-btn-ghost pr-btn-sm"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                  >
                    Discard
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {saveError && <p className="pr-error-text">{saveError}</p>}
          </div>

          {/* Two-column grid */}
          <div className="pr-grid">

            {/* Style DNA */}
            <div className="pr-section">
              <h2 className="pr-section-title"><HiOutlineSparkles /> Style DNA</h2>
              <div className="pr-card">

                {/* Gender */}
                <div className="pr-form-group">
                  <label className="pr-form-label">Gender</label>
                  {isEditing ? (
                    <select className="pr-input" {...register("gender")}>
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="pr-field-value">{profile?.gender || "Not set"}</p>
                  )}
                </div>

                {/* Age */}
                <div className="pr-form-group">
                  <label className="pr-form-label">Age</label>
                  {isEditing ? (
                    <input
                      type="number"
                      className="pr-input"
                      min={10}
                      max={120}
                      placeholder="e.g. 24"
                      {...register("age")}
                    />
                  ) : (
                    <p className="pr-field-value">{profile?.age ?? "Not set"}</p>
                  )}
                </div>

                {/* Body type */}
                <div className="pr-form-group">
                  <label className="pr-form-label">Body Type / Fit Preference</label>
                  {isEditing ? (
                    <select className="pr-input" {...register("body_type")}>
                      <option value="">Select body type</option>
                      {BODY_TYPE_OPTIONS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="pr-field-value">{profile?.body_type || "Not set"}</p>
                  )}
                </div>

                {/* Fitness level */}
                <div className="pr-form-group">
                  <label className="pr-form-label">Activity Level</label>
                  {isEditing ? (
                    <select className="pr-input" {...register("fitness_level")}>
                      <option value="">Select activity level</option>
                      {FITNESS_LEVEL_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="pr-field-value">{profile?.fitness_level || "Not set"}</p>
                  )}
                </div>

                {/* Style preferences — free text, comma-separated */}
                <div className="pr-form-group">
                  <label className="pr-form-label">Style Preferences</label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        className="pr-input"
                        placeholder="Type your styles, separated by commas"
                        {...register("style_preference")}
                      />
                      <p className="pr-field-hint">
                        e.g. Minimalist, Streetwear, Dark Academia, Y2K
                      </p>
                    </>
                  ) : (
                    <div className="pr-chips">
                      {profile?.style_preference?.length ? (
                        profile.style_preference.map((p) => (
                          <span key={p} className="pr-chip pr-chip--active">{p}</span>
                        ))
                      ) : (
                        <span className="pr-empty-hint">No styles set</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Favourite colours — free text, comma-separated */}
                <div className="pr-form-group">
                  <label className="pr-form-label">Favourite Colour Palette</label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        className="pr-input"
                        placeholder="Type your colours, separated by commas"
                        {...register("favorite_colors")}
                      />
                      <p className="pr-field-hint">
                        e.g. Black, Navy, Olive, Earth Tones, Pastels
                      </p>
                    </>
                  ) : (
                    <div className="pr-chips">
                      {profile?.favorite_colors?.length ? (
                        profile.favorite_colors.map((c) => (
                          <span key={c} className="pr-chip pr-chip--active">{c}</span>
                        ))
                      ) : (
                        <span className="pr-empty-hint">No colours set</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pr-ai-hint">
                  💡 Your Style DNA is used by <strong>StyleO AI</strong> to personalise outfit recommendations.
                </div>
              </div>
            </div>

            {/* Account */}
            <div className="pr-section">
              <h2 className="pr-section-title"><HiOutlineKey /> Account</h2>
              <div className="pr-card">

                {/* Country */}
                <div className="pr-form-group">
                  <label className="pr-form-label">Country</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="pr-input"
                      placeholder="e.g. India"
                      {...register("country")}
                    />
                  ) : (
                    <p className="pr-field-value">{profile?.country || "Not set"}</p>
                  )}
                </div>

                {/* Bio */}
                <div className="pr-form-group">
                  <label className="pr-form-label">Bio</label>
                  {isEditing ? (
                    <textarea
                      className="pr-input pr-textarea"
                      maxLength={300}
                      placeholder="Tell us about your style journey…"
                      {...register("bio")}
                    />
                  ) : (
                    <p className="pr-field-value pr-bio">
                      {profile?.bio || "No bio yet. Tell the world about your style!"}
                    </p>
                  )}
                </div>

                {/* Account type */}
                <div className="pr-form-group">
                  <label className="pr-form-label">Account Type</label>
                  <p className="pr-field-value capitalize">
                    {user?.provider || "Local"} Authentication
                  </p>
                </div>

                {/* Password change — local accounts only */}
                {user?.provider === "local" && (
                  <div className="pr-form-group">
                    <label className="pr-form-label">Password</label>
                    <button
                      type="button"
                      className="pr-btn pr-btn-outline w-full"
                      disabled
                      style={{ opacity: 0.5 }}
                    >
                      Change Password (coming soon)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
