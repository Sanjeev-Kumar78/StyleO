import "../styles/Login.css";
import { useForm } from "react-hook-form";
import { useState } from "react";
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

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  // Models Image
  const imagePath = [F1, F2, M1, M2];
  const [randomIdx] = useState<number>(() =>
    Math.floor(Math.random() * imagePath.length),
  );

  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");
    setIsSubmitting(true);
    try {
      await login({ email: data.email, password: data.password });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data;
        setServerError(
          data?.detail || data?.message || "Login failed. Please try again.",
        );
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="fixed top-3 right-4 z-50">
        <ThemeButton />
      </div>
      <div className="left-image-section">
        {/* Image with Login / Signup Switch Button */}
        <img
          src={imagePath[randomIdx]}
          alt="Fashion Model"
          className="login-image"
        />
        <div className="links-switch">
          <Link to="/login" className="switch-links active">
            <button className="switch-button">Login</button>
          </Link>
        </div>
        <div className="links-switch-bottom">
          <Link to="/signup" className="switch-links">
            <button className="switch-button">Sign Up</button>
          </Link>
        </div>
      </div>
      <div className="right-form-section">
        {/* Mobile-only Login / Sign Up tab switcher */}
        <div className="mobile-auth-tabs">
          <Link to="/login" className="auth-tab active">
            Login
          </Link>
          <Link to="/signup" className="auth-tab">
            Sign Up
          </Link>
        </div>

        <div className="form-container">
          {/* Logo */}
          <Logo className="login-logo" />
          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            <h2 className="form-title">Login to Your Account</h2>

            {serverError && (
              <p className="text-sm text-red-500 text-center">{serverError}</p>
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

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" className="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="/forgot-password" className="forgot-password">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Login"}
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
                      setServerError("Google login failed. Please try again.");
                    }
                  }
                }}
                onError={() =>
                  setServerError("Google login failed. Please try again.")
                }
                theme="filled_black"
                size="large"
                width="320"
                text="signin_with"
              />
            </div>

            <div className="signup-link">
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
