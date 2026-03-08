import "../styles/Login.css";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import F1 from "../assets/F1.jpg";
import F2 from "../assets/F2.jpg";
import M1 from "../assets/M1.jpg";
import M2 from "../assets/M2.jpg";
import ThemeButton from "../components/ThemeButton";
import Logo from "../components/Logo";
import { useAuth } from "../hooks/useAuth";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import api from "../services/api";
import { useDebounce } from "../hooks/useDebounce";
import exportedRoutes from "../api/config";

interface SignupFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Signup: React.FC = () => {
  const imagePath = [F1, F2, M1, M2];
  const [randomIdx] = useState<number>(() =>
    Math.floor(Math.random() * imagePath.length),
  );

  const { signup, googleLogin, user } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>();

  // username availability check
  const checkUrl = exportedRoutes.check as string;
  const usernameValue = watch("username", "");
  const debouncedUsername = useDebounce(usernameValue, 300);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    let cancelled = false;
    setUsernameStatus("checking");
    api
      .get(`${checkUrl}/username-available`, {
        params: { username: debouncedUsername },
      })
      .then((res) => {
        if (!cancelled) {
          setUsernameStatus(res.data.available ? "available" : "taken");
        }
      })
      .catch(() => {
        if (!cancelled) setUsernameStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, checkUrl]);

  const onSubmit = async (data: SignupFormData) => {
    setServerError("");
    setIsSubmitting(true);
    try {
      await signup({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data;
        const errorMsg = data?.detail || data?.message;
        if (typeof errorMsg === "string") {
          setServerError(errorMsg);
        } else {
          setServerError("Signup failed. Please try again.");
        }
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if already logged in Run once
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="login-page">
      <div className="fixed top-3 right-4 z-50">
        <ThemeButton />
      </div>

      {/* Left image section */}
      <div className="left-image-section">
        <img
          src={imagePath[randomIdx]}
          alt="Fashion Model"
          className="login-image"
        />
        <div className="links-switch">
          <Link to="/login" className="switch-links">
            <button className="switch-button">Login</button>
          </Link>
        </div>
        <div className="links-switch-bottom">
          <Link to="/signup" className="switch-links active">
            <button className="switch-button">Sign Up</button>
          </Link>
        </div>
      </div>

      {/* Right form section */}
      <div className="right-form-section">
        {/* Mobile-only tab switcher */}
        <div className="mobile-auth-tabs">
          <Link to="/login" className="auth-tab">
            Login
          </Link>
          <Link to="/signup" className="auth-tab active">
            Sign Up
          </Link>
        </div>

        <div className="form-container">
          <Logo className="login-logo" />
          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            <h2 className="form-title">Create an Account</h2>

            {serverError && (
              <p className="text-sm text-red-500 text-center">{serverError}</p>
            )}

            <input
              type="text"
              placeholder="Username"
              className={`form-input ${errors.username ? "border-red-500" : ""}`}
              {...register("username", {
                required: "Username is required",
                minLength: {
                  value: 3,
                  message: "Username must be at least 3 characters",
                },
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message:
                    "Username can only contain letters, numbers, and underscores",
                },
                onChange: (e) => {
                  setValue("username", e.target.value.toLowerCase(), {
                    shouldValidate: true,
                  });
                },
              })}
            />
            {errors.username && (
              <p className="text-xs text-red-500 -mt-2">
                {errors.username.message}
              </p>
            )}
            {!errors.username && usernameStatus === "checking" && (
              <p className="text-xs -mt-2" style={{ color: "var(--text-dim)" }}>
                Checking availability…
              </p>
            )}
            {!errors.username && usernameStatus === "available" && (
              <p className="text-xs -mt-2" style={{ color: "var(--accent)" }}>
                ✓ Username is available
              </p>
            )}
            {!errors.username && usernameStatus === "taken" && (
              <p className="text-xs text-red-500 -mt-2">
                ✗ Username is already taken
              </p>
            )}

            <input
              type="email"
              placeholder="Email"
              className={`form-input ${errors.email ? "border-red-500" : ""}`}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Please enter a valid email",
                },
              })}
            />
            {errors.email && (
              <p className="text-xs text-red-500 -mt-2">
                {errors.email.message}
              </p>
            )}

            <input
              type="password"
              placeholder="Password"
              className={`form-input ${errors.password ? "border-red-500" : ""}`}
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
            />
            {errors.password && (
              <p className="text-xs text-red-500 -mt-2">
                {errors.password.message}
              </p>
            )}

            <input
              type="password"
              placeholder="Confirm Password"
              className={`form-input ${errors.confirmPassword ? "border-red-500" : ""}`}
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) =>
                  value === watch("password") || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 -mt-2">
                {errors.confirmPassword.message}
              </p>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>

            <div className="divider">
              <span>or continue with</span>
            </div>

            <div
              className="social-login"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  if (credentialResponse.credential) {
                    try {
                      await googleLogin(credentialResponse.credential);
                      navigate("/dashboard", { replace: true });
                    } catch {
                      setServerError("Google signup failed. Please try again.");
                    }
                  }
                }}
                onError={() =>
                  setServerError("Google signup failed. Please try again.")
                }
                theme="filled_black"
                size="large"
                width="320"
                text="signup_with"
              />
            </div>

            <div className="signup-link">
              Already have an account? <Link to="/login">Log in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
