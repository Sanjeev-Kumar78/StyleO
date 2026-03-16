import { Link, useLocation } from "react-router";
import "../styles/NavBar.css";
import ThemeButton from "./ThemeButton";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/profile", label: "Profile" },
  { path: "/closet", label: "Wardrobe" },
];

const ProtectedNavBar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const navLinksRef = useRef<HTMLUListElement>(null);

  // useLayoutEffect reads DOM layout synchronously before paint — avoids slider flash
  useLayoutEffect(() => {
    const updateSlider = () => {
      if (navLinksRef.current) {
        const activeIndex = navItems.findIndex(
          (item) => item.path === location.pathname,
        );
        // exclude the slider <li> itself from the query
        const links = navLinksRef.current.querySelectorAll(
          "li:not(.nav-slider) a",
        );
        if (activeIndex >= 0 && links[activeIndex]) {
          const activeLink = links[activeIndex] as HTMLElement;
          const containerRect = navLinksRef.current.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();
          setSliderStyle({
            left: linkRect.left - containerRect.left,
            width: linkRect.width,
          });
        } else {
          // no matching route — hide the slider
          setSliderStyle({ left: 0, width: 0 });
        }
      }
    };

    updateSlider();
    window.addEventListener("resize", updateSlider);
    return () => window.removeEventListener("resize", updateSlider);
  }, [location.pathname]);

  // Close menu on route change
  useEffect(() => {
    const id = window.setTimeout(() => setMenuOpen(false), 0);
    return () => clearTimeout(id);
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  return (
    <>
      <nav>
        {/* Hamburger (mobile) - leftmost */}
        <motion.button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Menu"
          aria-expanded={menuOpen}
          whileTap={{ scale: 0.88 }}
        >
          <motion.div
            animate={menuOpen ? "open" : "closed"}
            variants={{ open: { rotate: 90 }, closed: { rotate: 0 } }}
            transition={{ duration: 0.22 }}
          >
            {menuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </motion.div>
        </motion.button>

        {/* Brand Logo - centered on mobile, left on desktop */}
        <div className="nav-mobile-brand">
          <Link
            to="/dashboard"
            className="brand-link"
            onClick={() => setMenuOpen(false)}
          >
            <Logo className="nav-logo" />
          </Link>
        </div>

        {/* Brand Logo - hidden on mobile, visible on desktop */}
        <div className="nav-brand">
          <Link to="/dashboard" className="brand-link">
            <Logo className="nav-logo" />
          </Link>
        </div>

        {/* Desktop Center Nav Links with Bubble Slider */}
        <ul ref={navLinksRef} className="nav-links">
          {/* slider is a <li> — the only valid child of <ul> */}
          <li
            aria-hidden="true"
            className="nav-slider"
            style={
              {
                "--slider-left": `${sliderStyle.left}px`,
                "--slider-width": `${sliderStyle.width}px`,
              } as React.CSSProperties
            }
          />
          {navItems.map((item) => (
            <motion.li
              key={item.path}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <Link
                to={item.path}
                className={location.pathname === item.path ? "active" : ""}
              >
                {item.label}
              </Link>
            </motion.li>
          ))}
        </ul>

        {/* User info + actions */}
        <div
          className="nav-search"
          style={{ justifyContent: "center", gap: "0.5rem" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {user?.username}
          </span>
        </div>

        {/* Theme + Logout */}
        <div
          className="nav-theme-btn"
          style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
        >
          <ThemeButton />
          {/* Logout icon — desktop only; mobile uses hamburger menu */}
          <div className="hidden md:block">
            <button
              onClick={handleLogout}
              className="theme-toggle"
              aria-label="Logout"
              title="Logout"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Dropdown Menu (framer-motion animated) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Nav links */}
            {navItems.map((item, i) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 + i * 0.05, duration: 0.2 }}
              >
                <Link
                  to={item.path}
                  className={`mobile-nav-link${
                    location.pathname === item.path ? " active" : ""
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}

            {/* Logout in mobile menu */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.06 + navItems.length * 0.05,
                duration: 0.2,
              }}
            >
              <button
                onClick={handleLogout}
                className="mobile-nav-link"
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                Logout
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
export default ProtectedNavBar;
