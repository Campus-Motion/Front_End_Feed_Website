import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Navbar.css";
import logoSrc from "../images/logo_rouge.png";

// ── Inline SVG logo matching Campus Motion style ─────────────────────────────

function Logo() {
  return <img src={logoSrc} width="100" height="40" alt="Campus Motion" />;
}

// ── Theme toggle button ───────────────────────────────────────────────────────
function ThemeToggle() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark",
  );

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    window.__cmTheme = next;
    setDark(!dark);
  }

  return (
    <button
      className="navbar__theme-btn"
      onClick={toggle}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
    >
      {dark ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ── Nav icons ─────────────────────────────────────────────────────────────────
function IconFeed() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  );
}
function IconNews() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
    </svg>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const location = useLocation();

  const links = [
    { to: "/", label: "Events", Icon: IconFeed },
    { to: "/news", label: "News", Icon: IconNews },
  ];

  return (
    <>
      {/* Desktop / tablet top bar */}
      <header className="navbar" role="banner">
        <a href="/" className="navbar__brand" aria-label="Campus Motion home">
          <Logo />
        </a>
        <nav className="navbar__links" aria-label="Primary navigation">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `navbar__link${isActive ? " navbar__link--active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="navbar__actions">
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `bottom-nav__item${isActive ? " bottom-nav__item--active" : ""}`
            }
          >
            <Icon />
            <span className="bottom-nav__label">{label}</span>
          </NavLink>
        ))}
        <div className="bottom-nav__item bottom-nav__theme">
          <ThemeToggle />
          <span className="bottom-nav__label">Theme</span>
        </div>
      </nav>
    </>
  );
}
