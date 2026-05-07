import './Landing.css';

function Landing({ onStartKey, onBrowseList, t }) {
  return (
    <div className="landing">
      {/* Animated atmosphere */}
      <div className="landing-particles" aria-hidden="true">
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
      </div>

      <div className="landing-body">
        {/* Decorative motif */}
        <div className="landing-motif" aria-hidden="true">
          <span className="motif-bar" />
          <span className="motif-diamond">◇</span>
          <span className="motif-bar" />
        </div>

        <h1 className="landing-title">Setae</h1>
        <p className="landing-subtitle">{t.landing_subtitle}</p>

        <div className="landing-divider" aria-hidden="true" />

        <p className="landing-desc">{t.landing_desc}</p>

        <div className="landing-actions">
          <button className="landing-btn landing-btn-primary" onClick={onStartKey}>
            <span className="landing-btn-label">{t.landing_start_key}</span>
            <span className="landing-btn-arrow">→</span>
          </button>
          <button className="landing-btn landing-btn-secondary" onClick={onBrowseList}>
            <span className="landing-btn-label">{t.landing_browse_list}</span>
            <span className="landing-btn-arrow">→</span>
          </button>
        </div>

        <p className="landing-credit">{t.landing_credit}</p>
      </div>
    </div>
  );
}

export default Landing;
