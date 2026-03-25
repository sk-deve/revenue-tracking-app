import React from 'react';
import { 
  FiArrowRight, 
  FiShield, 
  FiTag, 
  FiTool, 
  FiAlertTriangle, 
  FiActivity,
  FiCheckCircle 
} from 'react-icons/fi';
import './hero.css';

const Hero = () => {
  return (
    <section className="lt-hero">
      <div className="lt-container">
        {/* Left Content */}
        <div className="lt-hero-content">
          <div className="lt-badge">
            <FiShield className="lt-badge-icon" />
            <span>Protect margins • Find leaks • Fix patterns</span>
          </div>
          
          <h1 className="lt-title">
            Stop Losing Money You <span className="lt-gradient-text">Already Earned</span>
          </h1>
          
          <p className="lt-description">
            Most businesses leak profit through small decisions—discounts, rework, 
            and underpriced jobs. LeakageTracker helps you measure every leak so 
            you can fix it and keep more of what you earn.
          </p>

          <div className="lt-cta-group">
            <button className="lt-btn-primary">
              Start Free Trial <FiArrowRight />
            </button>
            <button className="lt-btn-secondary">
              See Where You’re Losing Money
            </button>
          </div>

          <ul className="lt-features">
            <li><FiCheckCircle /> Setup in 10 minutes</li>
            <li><FiCheckCircle /> Works with any quoting process</li>
            <li><FiCheckCircle /> Exportable reports</li>
          </ul>
        </div>

        {/* Right Content: The Data Card */}
        <div className="lt-hero-visual">
          <div className="lt-data-card">
            <div className="lt-card-header">
              <div>
                <h3>This month</h3>
                <p>Leakage snapshot</p>
              </div>
              <div className="lt-live-tag">
                <FiActivity size={12} /> Live
              </div>
            </div>

            <div className="lt-stats-grid">
              <div className="lt-stat-item">
                <span>Quotes entered</span>
                <h4>148</h4>
              </div>
              <div className="lt-stat-item">
                <span>Jobs completed</span>
                <h4>96</h4>
              </div>
              <div className="lt-stat-item highlight">
                <span>Money leaked</span>
                <h4>$4,820</h4>
              </div>
            </div>

            <div className="lt-report-section">
              <div className="lt-report-header">
                <h5>Top leak patterns</h5>
                <a href="#report">View report</a>
              </div>
              <p className="lt-small-dim">Focus these first to recover margin</p>

              <div className="lt-leak-list">
                <div className="lt-leak-row">
                  <div className="lt-leak-info">
                    <FiTag className="icon-blue" />
                    <span>Discounts over 10%</span>
                  </div>
                  <span className="lt-leak-amt">$2,140</span>
                </div>
                <div className="lt-leak-row">
                  <div className="lt-leak-info">
                    <FiTool className="icon-orange" />
                    <span>Rework / mistakes</span>
                  </div>
                  <span className="lt-leak-amt">$1,390</span>
                </div>
                <div className="lt-leak-row">
                  <div className="lt-leak-info">
                    <FiAlertTriangle className="icon-red" />
                    <span>Underpriced jobs</span>
                  </div>
                  <span className="lt-leak-amt">$1,290</span>
                </div>
              </div>
            </div>

            <button className="lt-card-btn">Start Free Trial</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;