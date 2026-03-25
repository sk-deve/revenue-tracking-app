import React from 'react';
import { 
  FiLinkedin, 
  FiTwitter, 
  FiMail, 
  FiDollarSign, 
  FiGlobe 
} from 'react-icons/fi';
import './Footer.css';
import logoImg from "../../assets/logoImg.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="lt-footer">
      <div className="lt-footer-container">
        {/* Branding Column */}
        <div className="lt-footer-brand">
          <div className="lt-footer-logo">
  <div className="logo-icon">
    <img 
      src={logoImg} 
      alt="RevenueShield logo"
      className="footer-logo-img"
    />
  </div>
  <div className="footer-brand-text">
    <span className="footer-brand-tagline">Prevent revenue leakage</span>
  </div>
</div>

          <p className="lt-footer-tagline">Stop hidden money loss</p>
          <p className="lt-footer-mission">
            Helping businesses protect their margins by identifying and fixing 
            profit leakage patterns in real-time.
          </p>
          <div className="lt-social-links">
            <a href="#linkedin" aria-label="LinkedIn"><FiLinkedin /></a>
            <a href="#twitter" aria-label="Twitter"><FiTwitter /></a>
            <a href="#contact" aria-label="Email"><FiMail /></a>
          </div>
        </div>

        {/* Navigation Links Group */}
        <div className="lt-footer-links-grid">
          <div className="link-column">
            <h4>Product</h4>
            <ul>
              <li><a href="#problem">Problem</a></li>
              <li><a href="#solution">Solution</a></li>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>

          <div className="link-column">
            <h4>Support</h4>
            <ul>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#demo">Request Demo</a></li>
            </ul>
          </div>

          <div className="link-column">
            <h4>Legal</h4>
            <ul>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="lt-footer-bottom">
        <div className="bottom-container">
          <p>© {currentYear} LeakageTracker. All rights reserved.</p>
          <div className="bottom-meta">
            <span>Built for Profit Protectors</span>
            <span className="dot">•</span>
            <div className="language-selector">
              <FiGlobe size={14} /> English (US)
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;