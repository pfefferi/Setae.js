import keyRegistry from './data/keys/index.json';
import './KeySelector.css';

function KeySelector({ lang, onSelectKey, onBrowseList }) {
  return (
    <div className="key-selector">
      <div className="key-selector-title">Seleccionar clave / Select key</div>
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
