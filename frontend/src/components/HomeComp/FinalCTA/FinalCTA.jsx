import React from 'react';
import { FiArrowRight, FiZap, FiDatabase } from 'react-icons/fi';
import './CTA.css';

const FinalCTA = () => {
  return (
    <section className="lt-cta-section">
      <div className="lt-cta-wrapper">
        <div className="lt-cta-glow"></div>
        
        <div className="lt-cta-content">
          <div className="lt-cta-left">
            <h2 className="lt-cta-title">
              Ready to see where you’re <br />
              <span className="text-highlight">losing money?</span>
            </h2>
            <p className="lt-cta-desc">
              Start your free trial, enter your quotes and jobs, and you’ll 
              immediately see the patterns that drain your margin.
            </p>
            
            <div className="lt-cta-buttons">
              <button className="lt-btn-glow">
                Start Free Trial <FiArrowRight />
              </button>
              <button className="lt-btn-glass">
                See Where You’re Losing Money
              </button>
            </div>

            <div className="lt-cta-tip">
              <div className="tip-icon"><FiDatabase /></div>
              <p><strong>Tip:</strong> If you're tracking in spreadsheets today, you can paste data in and start instantly.</p>
            </div>
          </div>

          <div className="lt-cta-right">
            <div className="lt-3d-visual">
              <div className="floating-icon">
                <FiZap />
              </div>
              <div className="visual-circle outer"></div>
              <div className="visual-circle inner"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;