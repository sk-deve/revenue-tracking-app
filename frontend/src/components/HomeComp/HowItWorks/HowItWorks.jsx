import React from 'react';
import { FiEdit3, FiPieChart, FiTrendingUp, FiArrowRight, FiPlayCircle } from 'react-icons/fi';
import './HowItWorks.css';

const HowItWorks = () => {
  const steps = [
    {
      id: '01',
      title: 'Enter quotes & jobs',
      desc: 'Log your quote amount and what the job actually billed. Add quick context like customer, service type, and date.',
      icon: <FiEdit3 />,
      color: 'blue'
    },
    {
      id: '02',
      title: 'Track discounts & rework',
      desc: 'Record discounts, mistakes, or refunds so leakage is measured—not guessed. See the hidden costs instantly.',
      icon: <FiPieChart />,
      color: 'purple'
    },
    {
      id: '03',
      title: 'See money lost & fix leaks',
      desc: 'Get a clear dashboard showing where money leaks. Adjust pricing, tighten processes, and coach your team.',
      icon: <FiTrendingUp />,
      color: 'green'
    }
  ];

  return (
    <section className="hw-section">
      <div className="hw-container">
        {/* Header Area */}
        <div className="hw-header">
          <div className="hw-top-badge">
            <span className="hw-pill-icon">$</span>
            <span>Enter quotes & jobs → Track leaks → Fix patterns</span>
          </div>
          <h2 className="hw-main-title">Three simple steps to <span className="text-gradient">reveal profit leaks</span></h2>
        </div>

        {/* Steps Timeline Grid */}
        <div className="hw-steps-grid">
          {steps.map((step) => (
            <div key={step.id} className="hw-step-card">
              <div className="hw-card-inner">
                <div className={`hw-icon-wrapper ${step.color}`}>
                  {step.icon}
                  <span className="hw-number-badge">{step.id}</span>
                </div>
                <h3 className="hw-step-title">{step.title}</h3>
                <p className="hw-step-desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* The Demo / CTA Bar */}
        <div className="hw-demo-bar">
          <div className="hw-demo-text">
            <h4>Want a quick demo view?</h4>
            <p>See a sample report that highlights your biggest leakage categories.</p>
          </div>
          <div className="hw-demo-actions">
            <button className="hw-btn-sample">
              <FiPlayCircle /> View sample report
            </button>
            <button className="hw-btn-primary">
              Start Free Trial <FiArrowRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;