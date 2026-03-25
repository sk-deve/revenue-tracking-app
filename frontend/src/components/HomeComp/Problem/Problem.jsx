import React from 'react';
import { 
  FiTag, 
  FiTool, 
  FiAlertTriangle, 
  FiTrendingUp, 
  FiTarget, 
  FiRepeat, 
  FiShield,
  FiArrowRight 
} from 'react-icons/fi';
import './problem.css';

const Problem = () => {
  return (
    <section className="lt-ps-section">
      <div className="lt-ps-container">
        
        {/* THE PROBLEM SIDE */}
        <div className="lt-ps-column problem">
          <h2 className="lt-ps-label red">The Problem</h2>
          <h3 className="lt-ps-heading">Hidden money loss</h3>
          <p className="lt-ps-subtext">
            Your revenue is not your profit. Most businesses quietly leak margin through day-to-day 
            decisions that never get measured.
          </p>

          <div className="lt-ps-grid">
            <div className="lt-ps-card">
              <div className="lt-ps-icon-box red"><FiTag /></div>
              <div>
                <h4>Discounts killing margins</h4>
                <p>Discounts feel harmless until you add them up across hundreds of jobs.</p>
              </div>
            </div>

            <div className="lt-ps-card">
              <div className="lt-ps-icon-box red"><FiTool /></div>
              <div>
                <h4>Rework & mistakes</h4>
                <p>A small mistake can erase the profit from an otherwise good job.</p>
              </div>
            </div>

            <div className="lt-ps-card">
              <div className="lt-ps-icon-box red"><FiAlertTriangle /></div>
              <div>
                <h4>Underpriced jobs</h4>
                <p>You win the work—but lose money—because pricing doesn’t reflect real effort.</p>
              </div>
            </div>
          </div>
        </div>

        {/* THE SOLUTION SIDE */}
        <div className="lt-ps-column solution">
          <h2 className="lt-ps-label green">The Solution</h2>
          <h3 className="lt-ps-heading">Track leakage & fix patterns</h3>
          <p className="lt-ps-subtext">
            LeakageTracker turns those "small" losses into numbers you can act on, 
            helping your team make better decisions every week.
          </p>

          <div className="lt-ps-grid bento">
            <div className="lt-ps-bento-card">
              <FiTrendingUp className="bento-icon" />
              <h4>Track leakage</h4>
              <p>Capture discounts, rework, and job adjustments in one place.</p>
            </div>
            <div className="lt-ps-bento-card">
              <FiTarget className="bento-icon" />
              <h4>Measure loss</h4>
              <p>See exactly how much margin is disappearing by cause or customer.</p>
            </div>
            <div className="lt-ps-bento-card">
              <FiRepeat className="bento-icon" />
              <h4>Fix patterns</h4>
              <p>Spot repeats: which quotes, teams, or services leak profit the most.</p>
            </div>
            <div className="lt-ps-bento-card">
              <FiShield className="bento-icon" />
              <h4>Protect profit margins</h4>
              <p>Prevent mistakes next month with clear guardrails and coaching.</p>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER KEY BENEFITS BAR */}
      <div className="lt-ps-benefit-bar">
        <div className="benefit-content">
          <span className="benefit-tag">Key Benefits</span>
          <p>Identify hidden revenue loss • Protect profit margins • Make better pricing decisions</p>
        </div>
        <button className="benefit-btn">
          See how it works <FiArrowRight />
        </button>
      </div>
    </section>
  );
};

export default Problem;