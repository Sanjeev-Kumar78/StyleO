import { Link, useLocation } from "react-router";
import "../styles/NavBar.css";
import ThemeButton from "./ThemeButton";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
  { path: "/login", label: "Login" },
  { path: "/signup", label: "Sign Up" },
];

const NavBar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const navLinksRef = useRef<HTMLUListElement>(null);

  // useLayoutEffect reads DOM layout synchronously before paint — avoids slider flash
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
          <Link to="/" className="brand-link">
            <Logo className="nav-logo" />
          </Link>
        </div>
        
        {/* Mobile Brand Logo (Centered) */}
        <div className="nav-mobile-brand">
          <Link to="/" className="brand-link" onClick={() => setMenuOpen(false)}>
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
          <div className="nav-theme-btn block">
            <ThemeButton />
          </div>
        </div>
      </nav>

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
export default NavBar;
