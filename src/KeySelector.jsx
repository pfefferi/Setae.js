import keyRegistry from './data/keys/index.json';
import './KeySelector.css';

function KeySelector({ lang, onSelectKey, onBrowseList, theme, onToggleTheme, onSetLang }) {
  return (
    <div className="key-selector" data-theme={theme}>
      <div className="key-selector-controls">
        <div className="key-selector-title">Seleccionar clave / Select key</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="lang-switcher">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => onSetLang('en')}>EN</button>
            <button className={lang === 'es' ? 'active' : ''} onClick={() => onSetLang('es')}>ES</button>
          </div>
          <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
            <span className={`theme-icon ${theme === 'dark' ? 'active' : ''}`}>☽</span>
            <span className={`theme-icon ${theme === 'light' ? 'active' : ''}`}>☀</span>
          </button>
        </div>
      </div>
      <div className="key-grid">
        {keyRegistry.map(key => (
          <div key={key.id} className="key-card">
            <div className="key-card-header">
              <div className="key-card-icon">{key.icon}</div>
              <div className="key-card-info">
                <div className="key-card-name">{key.title[lang]}</div>
                <div className="key-card-subtitle">{key.subtitle[lang]}</div>
              </div>
            </div>
            <div className="key-card-desc">{key.description[lang]}</div>
            <div className="key-card-actions">
              <button
                className="key-card-btn primary"
                onClick={() => onSelectKey(key.id)}
              >
                {lang === 'es' ? 'Clave Dicotómica' : 'Key'}
              </button>
              <button
                className="key-card-btn"
                onClick={() => onBrowseList(key.id)}
              >
                {lang === 'es' ? 'Lista de Taxones' : 'Browse List'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KeySelector;
