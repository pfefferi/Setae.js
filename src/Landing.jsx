import './Landing.css';

function Landing({ onStartKey, onBrowseList, t }) {
  return (
    <div className="landing">
      <div className="landing-actions">
        <button className="landing-btn landing-btn-primary" onClick={onStartKey}>
          {t.landing_start_key}
        </button>
        <button className="landing-btn landing-btn-secondary" onClick={onBrowseList}>
          {t.landing_browse_list}
        </button>
      </div>
    </div>
  );
}

export default Landing;
