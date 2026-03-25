import React, { useEffect, useState } from "react";
import "./header.css";
import { FiArrowRight, FiMenu, FiX } from "react-icons/fi";
import logoImg from "../../assets/logoImg.png";

const Header = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <header className="lt-header">
      <div className="lt-header__inner">
        {/* Brand */}
        <a className="lt-brand" href="/" aria-label="RevenueShield Home" onClick={closeMenu}>
          <span className="lt-brand__logoWrap">
            <img src={logoImg} alt="RevenueShield logo" className="lt-brand__logo" />
          </span>

          {/* This makes it look premium even if logo image is small */}
          <span className="lt-brand__text">
            <span className="lt-brand__name">RevenueShield</span>
            <span className="lt-brand__tagline">Prevent revenue leakage</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="lt-nav" aria-label="Primary navigation">
          <a className="lt-nav__link" href="#problem">Problem</a>
          <a className="lt-nav__link" href="#solution">Solution</a>
          <a className="lt-nav__link" href="/how">How it works</a>
          <a className="lt-nav__link" href="#pricing">Pricing</a>
        </nav>

        {/* Actions */}
        <div className="lt-actions">
          <a className="lt-actions__signin" href="/login">Sign in</a>

          <a className="lt-actions__cta" href="/register">
            Start Free Trial <FiArrowRight className="lt-actions__arrow" />
          </a>

          <button
            className="lt-menuBtn"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="lt-mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className={`lt-mobile ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="lt-mobile__backdrop" onClick={closeMenu} />
        <div className="lt-mobile__panel" role="dialog" aria-modal="true" id="lt-mobile-menu">
          <div className="lt-mobile__top">
            <span className="lt-mobile__title">Menu</span>
            <button className="lt-mobile__close" type="button" onClick={closeMenu} aria-label="Close menu">
              <FiX />
            </button>
          </div>

          <div className="lt-mobile__links">
            <a className="lt-mobile__link" href="#problem" onClick={closeMenu}>Problem</a>
            <a className="lt-mobile__link" href="#solution" onClick={closeMenu}>Solution</a>
            <a className="lt-mobile__link" href="/how" onClick={closeMenu}>How it works</a>
            <a className="lt-mobile__link" href="#pricing" onClick={closeMenu}>Pricing</a>
          </div>

          <div className="lt-mobile__actions">
            <a className="lt-mobile__signin" href="/login" onClick={closeMenu}>Sign in</a>
            <a className="lt-mobile__cta" href="/register" onClick={closeMenu}>
              Start Free Trial <FiArrowRight />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
