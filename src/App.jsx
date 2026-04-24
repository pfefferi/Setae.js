import { useState } from 'react';
import fauchaldKeyEn from './data/fauchald_family_key_en.json';
import fauchaldKeyEs from './data/fauchald_family_key_es.json';
import en from './locales/en.json';
import es from './locales/es.json';
import './App.css';

const keys = {
  en: fauchaldKeyEn,
  es: fauchaldKeyEs
};

const translations = {
  en,
  es
};

function App() {
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('key'); // 'key' or 'list'
  const [currentStep, setCurrentStep] = useState('1');
  const [history, setHistory] = useState([]);
  const [taxonImage, setTaxonImage] = useState(null);
  const [wormsData, setWormsData] = useState(null);
  const [expandedTaxon, setExpandedTaxon] = useState(null); // Added for accordion state
  const [listWormsData, setListWormsData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  const fauchaldKey = keys[lang];
  const t = translations[lang];
  const TOTAL_STEPS = Object.keys(fauchaldKey).length;
  const node = fauchaldKey[currentStep];

  const handleChoice = (opt, letter) => {
    setHistory([...history, { step: currentStep, choice: letter, text: opt.text }]);

    if (opt.result) {
      const familyName = opt.result.split(' ')[0];
      setCurrentStep({ result: opt.result });
      fetchTaxonImage(familyName);
      checkWorms(familyName);
    } else if (opt.goTo) {
      setCurrentStep(String(opt.goTo));
    }
  };

  const fetchTaxonImage = async (familyName) => {
    setTaxonImage(null);
    setImageFailed(false);
    try {
      const res = await fetch(`https://api.inaturalist.org/v1/taxa?q=${familyName}`);
      const data = await res.json();
      if (data.results && data.results.length > 0 && data.results[0].default_photo) {
        setTaxonImage(data.results[0].default_photo.medium_url);
      } else {
        setImageFailed(true);
      }
    } catch (e) {
      console.error('Failed to fetch taxon image:', e);
      setImageFailed(true);
    }
  };

  const checkWorms = async (familyName) => {
    setWormsData(null);
    try {
      const res = await fetch(`https://www.marinespecies.org/rest/AphiaRecordsByName/${encodeURIComponent(familyName)}?like=false`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const record = data[0];
          // We only care if it's an unaccepted name (where valid_name differs from the provided scientificname/family)
          if (record.status !== 'accepted' && record.valid_name) {
            setWormsData({
              status: record.status,
              validName: record.valid_name,
              reason: record.unacceptreason || record.status
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to query WoRMS:', e);
    }
  };

  const renderWormsWarning = (data, isBottom = false) => {
    if (!data || data.valid) return null;
    return (
      <div className="worms-update" style={{
        marginBottom: isBottom ? '0' : '1.5rem',
        marginTop: isBottom ? '1.5rem' : '0',
        padding: '0.75rem',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        border: '1px solid orange',
        borderRadius: '4px',
        fontSize: '0.9rem',
        textAlign: 'left'
      }}>
        <span style={{ color: 'orange', fontWeight: 'bold' }}>{t.worms_update} </span>
        <br />
        {t.worms_reason} <i>{data.reason}</i>.<br/>
        {t.worms_accepted} <strong>{data.validName}</strong>
      </div>
    );
  };

  const checkListWorms = async (familyName) => {
    if (listWormsData[familyName]) return; // already checked
    try {
      const res = await fetch(`https://www.marinespecies.org/rest/AphiaRecordsByName/${encodeURIComponent(familyName)}?like=false`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const record = data[0];
          if (record.status !== 'accepted' && record.valid_name) {
            setListWormsData(prev => ({
              ...prev,
              [familyName]: {
                status: record.status,
                validName: record.valid_name,
                reason: record.unacceptreason || record.status
              }
            }));
          } else {
            setListWormsData(prev => ({
              ...prev,
              [familyName]: { valid: true }
            }));
          }
        }
      }
    } catch (e) {
      console.error('Failed to query WoRMS for list:', e);
    }
  };

  const handleJumpToStep = (index) => {
    if (index >= history.length - 1) return; // Don't jump to current step or beyond
    const newHistory = history.slice(0, index + 1);
    const targetStep = history[index + 1].step;
    setHistory(newHistory);
    setCurrentStep(targetStep);
    setTaxonImage(null);
    setWormsData(null);
    setImageFailed(false);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const last = newHistory.pop();
    setHistory(newHistory);
    setCurrentStep(last.step);
    setTaxonImage(null);
    setWormsData(null);
    setImageFailed(false);
  };

  const reset = () => {
    setCurrentStep('1');
    setHistory([]);
    setTaxonImage(null);
    setWormsData(null);
    setImageFailed(false);
  };

  const depth = currentStep.result ? 100 : Math.round((history.length / TOTAL_STEPS) * 90);

  // Compute taxa paths for List mode
  const getTaxaPaths = () => {
    const paths = {};
    const traverse = (stepId, currentPath) => {
      const node = fauchaldKey[stepId];
      if (!node) return;

      // Check Option A
      if (node.optionA.result) {
        if (!paths[node.optionA.result]) paths[node.optionA.result] = [];
        paths[node.optionA.result].push([...currentPath, { step: stepId, choice: 'A', text: node.optionA.text }]);
      } else if (node.optionA.goTo) {
        traverse(node.optionA.goTo, [...currentPath, { step: stepId, choice: 'A', text: node.optionA.text }]);
      }

      // Check Option B
      if (node.optionB.result) {
        if (!paths[node.optionB.result]) paths[node.optionB.result] = [];
        paths[node.optionB.result].push([...currentPath, { step: stepId, choice: 'B', text: node.optionB.text }]);
      } else if (node.optionB.goTo) {
        traverse(node.optionB.goTo, [...currentPath, { step: stepId, choice: 'B', text: node.optionB.text }]);
      }
    };

    traverse('1', []);
    
    // Sort taxa alphabetically
    const sortedKeys = Object.keys(paths).sort();
    const sortedPaths = {};
    sortedKeys.forEach(k => {
      sortedPaths[k] = paths[k];
    });

    return sortedPaths;
  };

  const taxaPaths = mode === 'list' ? getTaxaPaths() : {};

  const filteredTaxaPaths = Object.keys(taxaPaths)
    .filter(taxon => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      if (taxon.toLowerCase().includes(q)) return true;
      
      // search through all path steps text
      return taxaPaths[taxon].some(path => 
        path.some(step => step.text.toLowerCase().includes(q))
      );
    })
    .sort()
    .reduce((obj, key) => {
      obj[key] = taxaPaths[key];
      return obj;
    }, {});

  return (
    <>
      <div className="wrapper">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{t.title}</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="mode-switcher">
              <button className={mode === 'key' ? 'active' : ''} onClick={() => setMode('key')}>{t.mode_key}</button>
              <button className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}>{t.mode_list}</button>
            </div>
            <div className="lang-switcher">
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
              <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
            </div>
          </div>
        </header>

        {mode === 'key' ? (
          <>
            <div className="breadcrumb">
              <span className="crumb">{history.length === 0 ? '01' : '01'}</span>
              {history.length > 0 && <span className="crumb-sep">·</span>}
              {history.map((h, i) => {
                const isActive = i === history.length - 1 && !currentStep.result;
                const cls = isActive ? 'crumb active' : 'crumb';
                const label = String(i + 2).padStart(2, '0') + h.choice;
                return (
                  <span key={i}>
                    {i < history.length - 1 || currentStep.result ? (
                      <button className="crumb-btn" onClick={() => handleJumpToStep(i)}>
                        <span className={cls} title={`Jump back to step ${h.step}`}>{label}</span>
                      </button>
                    ) : (
                      <span className={cls}>{label}</span>
                    )}
                    {i < history.length - 1 && <span className="crumb-sep">·</span>}
                  </span>
                );
              })}
            </div>

            <div id="app">
              <div className="controls-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button className="btn-back" onClick={handleBack} disabled={history.length === 0}>
                  ← {t.back_btn}
                </button>
                <button className="btn-reset-small" onClick={reset} disabled={history.length === 0}>
                  ↺ {t.start_over}
                </button>
              </div>

              {currentStep.result ? (
                <div className="result-card">
                  <div className="result-inner">
                    <div className="result-label">{t.result_label}</div>
                    {taxonImage && !imageFailed ? (
                      <div className="result-image" style={{ marginBottom: '1.5rem' }}>
                        <img 
                          src={taxonImage} 
                          alt={currentStep.result} 
                          style={{ 
                            maxWidth: '200px', 
                            borderRadius: '4px', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(79,200,168,0.2)'
                          }} 
                        />
                      </div>
                    ) : imageFailed ? (
                      <div className="result-image-placeholder">
                        No image available<br/>on iNaturalist
                      </div>
                    ) : null}
                    {wormsData && renderWormsWarning(wormsData)}
                    <div className="result-name">
                      <a 
                        href={`https://www.marinespecies.org/aphia.php?p=taxlist&tName=${currentStep.result.split(' ')[0]}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px dashed var(--biolum)' }}
                        title="View on WoRMS"
                      >
                        {currentStep.result}
                      </a>
                    </div>
                    <div className="result-divider"></div>
                    <div className="result-path">
                      {history.map((h, i) => (
                        <span key={i}>
                          <span className="path-crumb">{h.choice}</span>
                          {i < history.length - 1 && <span className="path-sep">→</span>}
                        </span>
                      ))}
                    </div>
                    <button className="btn-reset" onClick={reset}>↺ &nbsp; {t.start_over}</button>
                  </div>
                </div>
              ) : node ? (
                <div className="step-card">
                  <div className="step-meta">
                    <span className="step-num">{node.step}</span>
                    <div className="step-line"></div>
                  </div>

                  <div className="options">
                    <button className="option-btn" onClick={() => handleChoice(node.optionA, 'A')}>
                      <span className="option-letter">A</span>
                      <div>{node.optionA.text}</div>
                      <span className="option-arrow">→</span>
                    </button>
                    <button className="option-btn" onClick={() => handleChoice(node.optionB, 'B')}>
                      <span className="option-letter">B</span>
                      <div>{node.optionB.text}</div>
                      <span className="option-arrow">→</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>{t.error_not_found}</div>
              )}
            </div>
          </>
        ) : (
          <div className="taxa-list" style={{ marginTop: '2rem', width: '100%', maxWidth: '760px' }}>
            <div className="search-bar">
              <input 
                type="text" 
                className="search-input" 
                placeholder={t.search_placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {Object.keys(filteredTaxaPaths).map(taxon => (
              <div 
                key={taxon} 
                className={`taxon-list-item ${expandedTaxon === taxon ? 'open' : ''}`}
              >
                <div 
                  className="taxon-list-header"
                  onClick={(e) => {
                    const isOpening = expandedTaxon !== taxon;
                    setExpandedTaxon(isOpening ? taxon : null);
                    if (isOpening) {
                      const familyName = taxon.split(' ')[0];
                      checkListWorms(familyName);
                      const el = e.currentTarget.parentElement;
                      setTimeout(() => {
                        const y = el.getBoundingClientRect().top + window.scrollY - 20;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                >
                  <h3 className="taxon-list-title">{taxon}</h3>
                  <span className="taxon-list-icon">▼</span>
                </div>
                <div className="taxon-list-content">
                  {listWormsData[taxon.split(' ')[0]] && !listWormsData[taxon.split(' ')[0]].valid && renderWormsWarning(listWormsData[taxon.split(' ')[0]])}
                  {filteredTaxaPaths[taxon].map((path, pathIdx) => (
                    <div key={pathIdx} style={{ marginBottom: pathIdx < filteredTaxaPaths[taxon].length - 1 ? '2rem' : '0' }}>
                      {path.map((step, stepIdx) => (
                        <div key={stepIdx} className="taxon-path-step">
                          <div className="taxon-path-id">{step.step}{step.choice}</div>
                          <div className="taxon-path-text">{step.text}</div>
                        </div>
                      ))}
                      {pathIdx < filteredTaxaPaths[taxon].length - 1 && (
                        <div style={{ margin: '1rem 0', color: 'var(--fog)', fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center' }}>
                          {t.list_or}
                        </div>
                      )}
                    </div>
                  ))}
                  {listWormsData[taxon.split(' ')[0]] && !listWormsData[taxon.split(' ')[0]].valid && renderWormsWarning(listWormsData[taxon.split(' ')[0]], true)}
                  <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                    <a 
                      href={`https://www.marinespecies.org/aphia.php?p=taxlist&tName=${taxon.split(' ')[0]}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: 'var(--biolum)', 
                        textDecoration: 'none', 
                        fontSize: '0.75rem', 
                        fontFamily: 'var(--mono)',
                        borderBottom: '1px dashed rgba(79,200,168,0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {t.worms_view}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="depth-meter">
        <div className="depth-track">
          <div className="depth-fill" style={{ height: `${depth}%` }}></div>
        </div>
      </div>
    </>
  );
}

export default App;
