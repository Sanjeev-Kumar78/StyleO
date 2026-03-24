import { Link, useLocation } from "react-router";
import "../styles/NavBar.css";
import ThemeButton from "./ThemeButton";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/closet", label: "Wardrobe" },
  { path: "/outfits", label: "Outfits" },
  { path: "/profile", label: "Profile" },
];

const ProtectedNavBar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const navLinksRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const updateSlider = () => {
      if (navLinksRef.current) {
        const activeIndex = navItems.findIndex(
          (item) => item.path === location.pathname,
        );
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
          setSliderStyle({ left: 0, width: 0 });
        }
      }
    };

    updateSlider();
    window.addEventListener("resize", updateSlider);
    return () => window.removeEventListener("resize", updateSlider);
  }, [location.pathname]);

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
        {/* Mobile Hamburger (Left edge on mobile) */}
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
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </motion.div>
        </motion.button>

        {/* 1. Left: Brand Logo */}
        <div className="nav-brand hidden md:flex">
          <Link to="/dashboard" className="brand-link">
            <Logo className="nav-logo" />
          </Link>
        </div>

        {/* Mobile Brand Logo (Centered) */}
        <div className="nav-mobile-brand">
          <Link to="/dashboard" className="brand-link" onClick={() => setMenuOpen(false)}>
            <Logo className="nav-logo" />
          </Link>
        </div>

        {/* 2. Center: Nav Links */}
        <div className="nav-links-container">
          <ul ref={navLinksRef} className="nav-links">
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
        </div>

        {/* 3. Right: Utilities */}
        <div className="nav-utilities">
          {/* Search Button */}
          <button className="nav-search-btn" aria-label="Search">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* User Name Chip */}
          <div className="nav-user-chip">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {user?.username || "Guest"}
          </div>

          {/* Theme Toggle Button */}
          <div className="nav-theme-btn block">
            <ThemeButton />
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="nav-icon-btn"
            aria-label="Logout"
            title="Logout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            {navItems.map((item, i) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 + i * 0.05, duration: 0.2 }}
              >
                <Link
                  to={item.path}
                  className={`mobile-nav-link ${location.pathname === item.path ? "active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 + navItems.length * 0.05, duration: 0.2 }}
            >
              <button
                onClick={handleLogout}
                className="mobile-nav-link w-full text-left bg-transparent border-none cursor-pointer text-inherit font-inherit uppercase"
              >
                Logout
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
