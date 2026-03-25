import React from 'react';
import { FiCheck, FiZap, FiAward, FiStar } from 'react-icons/fi';
import './pricing.css';

const Pricing = () => {
  const plans = [
    {
      name: 'Starter',
      subtitle: 'For solo operators',
      price: '29',
      features: ['Unlimited quotes & jobs', 'Leakage dashboard', 'Export to CSV', 'Email support'],
      buttonText: 'Start Free Trial',
      highlight: false
    },
    {
      name: 'Growth',
      subtitle: 'For small teams',
      price: '79',
      tag: 'Most Popular',
      features: ['Everything in Starter', 'Team access (up to 5)', 'Leakage by category/customer', 'Saved reports'],
      buttonText: 'Start Free Trial',
      highlight: true
    },
    {
      name: 'Pro',
      subtitle: 'For scaling operations',
      price: '149',
      features: ['Everything in Growth', 'Custom leakage categories', 'Advanced filters', 'Priority support'],
      buttonText: 'Start Free Trial',
      highlight: false
    }
  ];

  return (
    <section className="lt-pricing">
      <div className="lt-pricing-container">
        <div className="lt-pricing-header">
          <h2 className="lt-pricing-title">Pricing Preview</h2>
          <p className="lt-pricing-subtitle">
            Start small and scale as you recover margin. Plans are simple on purpose.
          </p>
        </div>

        <div className="lt-pricing-grid">
          {plans.map((plan, index) => (
            <div key={index} className={`lt-price-card ${plan.highlight ? 'featured' : ''}`}>
              {plan.highlight && <div className="lt-popular-badge"><FiStar size={12}/> {plan.tag}</div>}
              
              <div className="lt-card-top">
                <h3 className="lt-plan-name">{plan.name}</h3>
                <p className="lt-plan-desc">{plan.subtitle}</p>
                <div className="lt-price-wrap">
                  <span className="lt-currency">$</span>
                  <span className="lt-amount">{plan.price}</span>
                  <span className="lt-period">/month</span>
                </div>
              </div>

              <ul className="lt-plan-features">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex}>
                    <FiCheck className="lt-check-icon" /> {feature}
                  </li>
                ))}
              </ul>

              <div className="lt-card-footer">
                <button className={`lt-btn-pricing ${plan.highlight ? 'primary' : 'outline'}`}>
                  {plan.buttonText}
                </button>
                <p className="lt-no-card">No credit card required</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;