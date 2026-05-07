import { useState, useEffect } from 'react';
import fauchaldKeyEn from './data/fauchald_family_key_en.json';
import fauchaldKeyEs from './data/fauchald_family_key_es.json';
import en from './locales/en.json';
import es from './locales/es.json';
import generaKeysIndex from './data/genera_keys/index.json';
import glossaryEn from './data/glossary.json';
import Landing from './Landing.jsx';
import './App.css';

const keys = {
  en: fauchaldKeyEn,
  es: fauchaldKeyEs
};

const translations = {
  en,
  es
};

// ── Glossary Tooltip ──
// Build lookup once: lowercase term -> {term, definition, figure}
const glossaryMap = {};
glossaryEn.forEach(entry => {
  const key = entry.term.split(' (')[0].toLowerCase(); // strip plural suffix like " (e)"
  glossaryMap[key] = entry;
  // Also store the plural form variant
  const paren = entry.term.match(/\((.+?)\)/);
  if (paren) {
    const plural = paren[1].trim();
    if (plural.length > 0) {
      glossaryMap[plural.toLowerCase()] = entry;
    }
  }
});

/** Split text by glossary terms and wrap matches with tooltip spans */
function GlossaryText({ text }) {
  if (!text) return text;
  const lower = text.toLowerCase();
  // Find the first glossary term match (longest first)
  let bestMatch = null;
  let bestLen = 0;
  for (const [term, entry] of Object.entries(glossaryMap)) {
    const idx = lower.indexOf(term);
    if (idx >= 0 && term.length > bestLen) {
      // Check word boundary: term should be a standalone word
      const before = idx > 0 ? lower[idx-1] : ' ';
      const after = idx + term.length < lower.length ? lower[idx+term.length] : ' ';
      if (!before.match(/[a-z]/) && !after.match(/[a-z]/)) {
        bestMatch = { idx, term, entry };
        bestLen = term.length;
      }
    }
  }
  if (!bestMatch) return text;
  const { idx, term, entry } = bestMatch;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + term.length);
  const after = text.slice(idx + term.length);
  const fig = entry.figure ? ` (Fig. ${entry.figure})` : '';
  return (
    <>
      {before}
      <span className="glossary-term" data-def={`${entry.definition}${fig}`}>
        {match}
        <span className="glossary-popup">{entry.definition}{fig}</span>
      </span>
      <GlossaryText text={after} />
    </>
  );
}

function App() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('setae-lang') || 'en';
  });
  const [mode, setMode] = useState('key'); // 'key' or 'list'
  const [currentStep, setCurrentStep] = useState('1');
  const [history, setHistory] = useState([]);
  const [taxonImage, setTaxonImage] = useState(null);
  const [wormsData, setWormsData] = useState(null);
  const [expandedTaxon, setExpandedTaxon] = useState(null); // Added for accordion state
  const [listWormsData, setListWormsData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [navDir, setNavDir] = useState('forward');
  const [generaActive, setGeneraActive] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState({});
  const [generaFamily, setGeneraFamily] = useState(null);
  const [generaKey, setGeneraKey] = useState(null);
  const [generaStep, setGeneraStep] = useState('1');
  const [generaHistory, setGeneraHistory] = useState([]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('setae-theme') || 'dark';
  });
  const [screen, setScreen] = useState('landing'); // 'landing' | 'app'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('setae-theme', next);
      return next;
    });
  };

  const fauchaldKey = keys[lang];
  const t = translations[lang];
  const TOTAL_STEPS = Object.keys(fauchaldKey).length;
  const node = fauchaldKey[currentStep];

  // --- Genera key helpers ---
  const hasGeneraKey = (familyName) => {
    const base = familyName.split(' ')[0];
    return generaKeysIndex.includes(base);
  };

  const loadGeneraKey = async (familyName) => {
    const base = familyName.split(' ')[0];
    try {
      // Try language-specific file first, fall back to English
      let mod;
      try {
        mod = await import(`./data/genera_keys/${base.toLowerCase()}_${lang}.json`);
      } catch (e) {
        mod = await import(`./data/genera_keys/${base.toLowerCase()}.json`);
      }
      setGeneraKey(mod.default || mod);
      setGeneraFamily(familyName);
      setGeneraActive(true);
      setGeneraStep('1');
      setGeneraHistory([]);
    } catch (e) {
      console.error('Failed to load genera key:', e);
    }
  };

  const handleGeneraChoice = (opt, letter) => {
    setGeneraHistory([...generaHistory, { step: generaStep, choice: letter, text: opt.text }]);
    if (opt.result) {
      setGeneraStep({ result: opt.result });
    } else if (opt.goTo) {
      setGeneraStep(String(opt.goTo));
    }
  };

  const backToFamily = () => {
    setGeneraActive(false);
    setGeneraKey(null);
    setGeneraStep('1');
    setGeneraHistory([]);
    // Go back to the family key step that led to the result
    // so the user sees the A/B options again, not the result card
    if (currentStep.result && history.length > 0) {
      const newHistory = [...history];
      const lastEntry = newHistory.pop();
      setHistory(newHistory);
      setCurrentStep(lastEntry.step);
      setTaxonImage(null);
      setWormsData(null);
      setImageFailed(false);
    }
  };
  // --- end genera helpers ---

  const handleChoice = (opt, letter) => {
    setNavDir('forward');
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
    setImageLoading(true);
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
    } finally {
      setImageLoading(false);
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
    setNavDir('jump');
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
    setNavDir('back');
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
      {screen === 'landing' ? (
        <Landing
          t={t}
          lang={lang}
          onStartKey={() => { setScreen('app'); setMode('key'); }}
          onBrowseList={() => { setScreen('app'); setMode('list'); }}
        />
      ) : (
        <div className="wrapper" data-theme={theme}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{t.title}</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="mode-switcher">
              <button 
                className={mode === 'key' ? 'active' : ''} 
                onClick={() => setMode('key')}
                data-text={t.mode_key}
              >
                {t.mode_key}
              </button>
              <button 
                className={mode === 'list' ? 'active' : ''} 
                onClick={() => setMode('list')}
                data-text={t.mode_list}
              >
                {t.mode_list}
              </button>
            </div>
            <div className="lang-switcher">
              <button className={lang === 'en' ? 'active' : ''} onClick={() => { setLang('en'); localStorage.setItem('setae-lang', 'en'); }}>EN</button>
              <button className={lang === 'es' ? 'active' : ''} onClick={() => { setLang('es'); localStorage.setItem('setae-lang', 'es'); }}>ES</button>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              <span className={`theme-icon ${theme === 'dark' ? 'active' : ''}`}>☽</span>
              <span className={`theme-icon ${theme === 'light' ? 'active' : ''}`}>☀</span>
            </button>
          </div>
        </header>

        {mode === 'key' ? (
          <div className="mode-panel" key="key-mode">
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
                {!generaActive ? (
                  <>
                    <button className="btn-back" onClick={handleBack} disabled={history.length === 0}>
                      ← {t.back_btn}
                    </button>
                    <button className="btn-reset-small" onClick={reset} disabled={history.length === 0}>
                      ↺ {t.start_over}
                    </button>
                  </>
                ) : null}
              </div>

              {/* Family key result */}
              {currentStep.result && !generaActive ? (
                <div className="result-card">
                  <div className="result-inner">
                    <div className="result-label">{t.result_label}</div>
                    {imageLoading ? (
                      <div className="result-image-shimmer" />
                    ) : taxonImage && !imageFailed ? (
                      <div className="result-image" style={{ marginBottom: '1.5rem' }}>
                        <img 
                          src={taxonImage} 
                          alt={currentStep.result} 
                          className="result-img"
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
                        <svg className="placeholder-icon" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1">
                          <circle cx="24" cy="20" r="8" opacity="0.3"/>
                          <path d="M12 40c0-8 5.4-14 12-14s12 6 12 14" opacity="0.3"/>
                          <path d="M8 8l32 32" opacity="0.2"/>
                        </svg>
                        <span>No image available</span>
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
                    {hasGeneraKey(currentStep.result) && (
                      <button 
                        className="btn-genera"
                        onClick={() => loadGeneraKey(currentStep.result)}
                        style={{
                          marginTop: '1.5rem',
                          padding: '0.6rem 1.2rem',
                          backgroundColor: 'rgba(79,200,168,0.15)',
                          border: '1px solid var(--biolum)',
                          borderRadius: '4px',
                          color: 'var(--biolum)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontFamily: 'var(--mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        → {t.genera_btn}
                      </button>
                    )}
                    <button className="btn-reset" onClick={reset}>↺ &nbsp; {t.start_over}</button>
                  </div>
                </div>
              ) : null}

              {/* Genera key active */}
              {generaActive && generaKey ? (
                <>
                  {/* Genera breadcrumb */}
                  <div className="breadcrumb genera-breadcrumb" key="genera-breadcrumb">
                    <button className="crumb-btn" onClick={backToFamily}>
                      <span className="crumb" style={{ color: 'var(--fog)' }}>{generaFamily}</span>
                    </button>
                    {generaHistory.map((h, i) => {
                      const isActive = i === generaHistory.length - 1 && !generaStep.result;
                      const label = String(i + 1).padStart(2, '0') + h.choice;
                      return (
                        <span key={i}>
                          <span className="crumb-sep">·</span>
                          <span className={`crumb ${isActive ? 'active' : ''}`}>{label}</span>
                        </span>
                      );
                    })}
                  </div>
                  <div className="step-card">
                    <div style={{ marginBottom: '1rem' }}>
                      <button 
                        className="btn-back" 
                        onClick={backToFamily}
                        style={{ fontSize: '0.75rem' }}
                      >
                        ← {t.back_to_family}: {generaFamily}
                      </button>
                    </div>
                    {generaStep.result ? (
                      <div className="result-card">
                        <div className="result-inner">
                          <div className="result-label">{t.genera_result}</div>
                          <div className="result-name">{generaStep.result}</div>
                          <div className="result-divider"></div>
                          <div className="result-path">
                            {generaHistory.map((h, i) => (
                              <span key={i}>
                                <span className="path-crumb">{h.choice}</span>
                                {i < generaHistory.length - 1 && <span className="path-sep">→</span>}
                              </span>
                            ))}
                          </div>
                          <button className="btn-reset" onClick={backToFamily} style={{ marginTop: '1.5rem' }}>
                            ← &nbsp; {t.back_to_family}
                          </button>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const generaNode = generaKey[generaStep];
                        if (!generaNode) {
                          return <div>{t.error_not_found}</div>;
                        }
                        return (
                          <>
                            <div className="step-meta">
                              <span className="step-num">{generaFamily} · {generaNode.step}</span>
                              <div className="step-line"></div>
                            </div>
                            <div className="options">
                              <button className="option-btn" onClick={() => handleGeneraChoice(generaNode.optionA, 'A')}>
                                <span className="option-letter">A</span>
                                <div><GlossaryText text={generaNode.optionA.text} /></div>
                                <span className="option-arrow">→</span>
                              </button>
                              <button className="option-btn" onClick={() => handleGeneraChoice(generaNode.optionB, 'B')}>
                                <span className="option-letter">B</span>
                                <div><GlossaryText text={generaNode.optionB.text} /></div>
                                <span className="option-arrow">→</span>
                              </button>
                            </div>
                          </>
                        );
                      })()
                    )}
                  </div>
                </>
              ) : null}

              {/* Family key step */}
              {!currentStep.result && !generaActive && node ? (
                <div className={`step-card nav-${navDir}`} key={`step-${currentStep}`}>
                  <div className="step-meta">
                    <span className="step-num">{node.step}</span>
                    <div className="step-line"></div>
                  </div>

                  <div className="options">
                    <button className="option-btn" onClick={() => handleChoice(node.optionA, 'A')}>
                      <span className="option-letter">A</span>
                      <div><GlossaryText text={node.optionA.text} /></div>
                      <span className="option-arrow">→</span>
                    </button>
                    <button className="option-btn" onClick={() => handleChoice(node.optionB, 'B')}>
                      <span className="option-letter">B</span>
                      <div><GlossaryText text={node.optionB.text} /></div>
                      <span className="option-arrow">→</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {!currentStep.result && !generaActive && !node ? (
                <div>{t.error_not_found}</div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mode-panel" key="list-mode">
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
                  <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                      onClick={() => setExpandedPaths(prev => ({...prev, [taxon]: !prev[taxon]}))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--fog)',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.5rem 1rem',
                        borderTop: '1px solid rgba(var(--fog-rgb), 0.12)',
                        width: '100%'
                      }}
                    >
                      {expandedPaths[taxon] ? `▲ ${t.hide_steps}` : `▼ ${t.show_steps}`}
                    </button>
                  </div>
                  {expandedPaths[taxon] && (
                    <>
                      {filteredTaxaPaths[taxon].map((path, pathIdx) => (
                        <div key={pathIdx} style={{ marginBottom: pathIdx < filteredTaxaPaths[taxon].length - 1 ? '2rem' : '0' }}>
                          {path.map((step, stepIdx) => (
                            <div key={stepIdx} className="taxon-path-step">
                              <div className="taxon-path-id">{step.step}{step.choice}</div>
                              <div className="taxon-path-text"><GlossaryText text={step.text} /></div>
                            </div>
                          ))}
                          {pathIdx < filteredTaxaPaths[taxon].length - 1 && (
                            <div style={{ margin: '1rem 0', color: 'var(--fog)', fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center' }}>
                              {t.list_or}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  {listWormsData[taxon.split(' ')[0]] && !listWormsData[taxon.split(' ')[0]].valid && renderWormsWarning(listWormsData[taxon.split(' ')[0]], true)}
                  <div style={{ marginTop: '1.5rem', textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {hasGeneraKey(taxon) && (
                      <button
                        onClick={() => {
                          setMode('key');
                          loadGeneraKey(taxon);
                        }}
                        style={{
                          color: 'var(--biolum)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--mono)',
                          borderBottom: '1px dashed rgba(79,200,168,0.4)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '0'
                        }}
                      >
                        → {t.genera_btn}
                      </button>
                    )}
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
          </div>
        )}
      </div>
      )}

      <div className="depth-meter">
        <div className="depth-track">
          <div className="depth-fill" style={{ height: `${depth}%` }}></div>
        </div>
      </div>
    </>
  );
}

export default App;
