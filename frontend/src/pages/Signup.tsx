import "../styles/Login.css";
import { useState } from "react";
import { Link } from "react-router";
import F1 from "../assets/F1.jpg";
import F2 from "../assets/F2.jpg";
import M1 from "../assets/M1.jpg";
import M2 from "../assets/M2.jpg";
import ThemeButton from "../components/ThemeButton";
import Logo from "../components/Logo";

interface SignupForm {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const Signup: React.FC = () => {
  const imagePath = [F1, F2, M1, M2];
  const [randomIdx] = useState<number>(() =>
    Math.floor(Math.random() * imagePath.length),
  );
  const [form, setForm] = useState<SignupForm>({});
  const [error, setError] = useState<string>("");

  const SubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    console.log("Sign up:", form);
  };

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
          <form onSubmit={SubmitForm} className="login-form">
            <h2 className="form-title">Create an Account</h2>

            <input
              type="text"
              name="name"
              placeholder="Full Name"
              className="form-input"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="form-input"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="form-input"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className="form-input"
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />

            {error && (
              <p className="text-sm text-red-500 text-center -mt-2">{error}</p>
            )}

            <button type="submit" className="submit-button">
              Create Account
            </button>

            <div className="divider">
              <span>or continue with</span>
            </div>

            <div className="social-login">
              <button type="button" className="social-button google">
                <svg viewBox="0 0 24 24" className="social-icon">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
              <button type="button" className="social-button facebook">
                <svg viewBox="0 0 24 24" className="social-icon">
                  <path
                    fill="#1877F2"
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
                Facebook
              </button>
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
