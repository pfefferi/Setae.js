import { useState, useEffect } from 'react';
import keyRegistry from './data/keys/index.json';
import en from './locales/en.json';
import es from './locales/es.json';
import KeySelector from './KeySelector.jsx';
import './App.css';

const translations = { en, es };

// ── Auto-discover all key data from filesystem ──
// Convention: each key lives in src/data/keys/{keyId}/
//   key_{lang}.json  → key data (required)
//   glossary.json     → glossary entries (optional)
//   genera_keys/      → genus-level sub-keys (optional)
// To add a new key: create a folder, add metadata to index.json, done.
const keyModules = import.meta.glob('./data/keys/**/*.json', { eager: true });
const imageModules = import.meta.glob('./data/keys/**/*.png', { eager: true });

// Build dynamic lookups from discovered file structure
const keyData = {};
const glossaryData = {};
const generaIndexes = {};
const keyImages = {};

for (const [filePath, mod] of Object.entries(keyModules)) {
  const match = filePath.match(/\.\/data\/keys\/([^/]+)\/(.+)\.json$/);
  if (!match) continue;
  const keyId = match[1];
  const subPath = match[2];

  // Skip registry entry itself
  if (subPath === 'index') continue;

  // Key data files: key_{lang}.json
  const keyMatch = subPath.match(/^key_([a-z]{2})$/);
  if (keyMatch) {
    const lang = keyMatch[1];
    keyData[keyId] = keyData[keyId] || {};
    keyData[keyId][lang] = mod.default;
    continue;
  }

  // Glossary
  if (subPath === 'glossary') {
    glossaryData[keyId] = mod.default;
    continue;
  }

  // Genera keys index
  const generaMatch = subPath.match(/^genera_keys\/index$/);
  if (generaMatch) {
    generaIndexes[keyId] = mod.default;
  }
}

// Build image lookup: keyId → genus (lowercase) → resolved image URL
for (const [filePath, mod] of Object.entries(imageModules)) {
  const match = filePath.match(/\/data\/keys\/([^/]+)\/images\/(.+)\.png$/);
  if (match) {
    const keyId = match[1];
    const genus = match[2].toLowerCase();
    if (!keyImages[keyId]) keyImages[keyId] = {};
    // mod.default is the resolved asset URL (e.g., /assets/solenopsis.abc123.png)
    keyImages[keyId][genus] = mod.default;
  }
}

// ── Glossary Tooltip (key-aware) ──
const glossaryMaps = {};
function getGlossaryMap(keyId) {
  if (glossaryMaps[keyId]) return glossaryMaps[keyId];
  const map = {};
  const entries = glossaryData[keyId] || [];
  entries.forEach(entry => {
    const key = entry.term.split(' (')[0].toLowerCase();
    if (key.length >= 3) {
      map[key] = entry;
    }
    const paren = entry.term.match(/\((.+?)\)/);
    if (paren) {
      const plural = paren[1].trim();
      if (plural.length >= 3) {
        map[plural.toLowerCase()] = entry;
      }
    }
  });
  glossaryMaps[keyId] = map;
  return map;
}

function GlossaryText({ text, keyId }) {
  if (!text || !keyId) return text;
  const glossaryMap = getGlossaryMap(keyId);
  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestLen = 0;
  for (const [term, entry] of Object.entries(glossaryMap)) {
    const idx = lower.indexOf(term);
    if (idx >= 0 && term.length > bestLen) {
      const before = idx > 0 ? lower[idx-1] : ' ';
      const after = idx + term.length < lower.length ? lower[idx+term.length] : ' ';
      if (!before.match(/[a-záéíóúñ]/) && !after.match(/[a-záéíóúñ]/)) {
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
      <GlossaryText text={after} keyId={keyId} />
    </>
  );
}

function App() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('setae-lang') || 'es';
  });
  const [activeKey, setActiveKey] = useState(null);
  const [mode, setMode] = useState('key');
  const [currentStep, setCurrentStep] = useState('1');
  const [history, setHistory] = useState([]);
  const [taxonImage, setTaxonImage] = useState(null);
  const [wormsData, setWormsData] = useState(null);
  const [expandedTaxon, setExpandedTaxon] = useState(null);
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

  // ── Dynamic key resolution ──
  const currentKeyConfig = activeKey
    ? keyRegistry.find(k => k.id === activeKey)
    : null;
  const features = currentKeyConfig?.features || {};
  const fauchaldKey = activeKey && keyData[activeKey]
    ? (keyData[activeKey][lang] || keyData[activeKey]['en'] || null)
    : null;
  const t = translations[lang];
  const TOTAL_STEPS = fauchaldKey ? Object.keys(fauchaldKey).length : 0;
  const node = fauchaldKey ? fauchaldKey[currentStep] : null;
  const generaIdx = activeKey ? (generaIndexes[activeKey] || []) : [];

  // ── Key selector handlers ──
  const handleSelectKey = (keyId) => {
    setActiveKey(keyId);
    setMode('key');
    reset();
  };

  const handleBrowseList = (keyId) => {
    setActiveKey(keyId);
    setMode('list');
    reset();
  };

  const handleBackToKeys = () => {
    setActiveKey(null);
    setMode('key');
    reset();
  };

  // ── Genera key helpers (key-relative) ──
  const hasGeneraKey = (familyName) => {
    if (!features.generaKeys) return false;
    const base = familyName.split(' ')[0];
    return generaIdx.includes(base);
  };

  const loadGeneraKey = async (familyName) => {
    if (!activeKey) return;
    const base = familyName.split(' ')[0];
    try {
      // Try language-specific file first, fall back to default
      let mod;
      try {
        mod = await import(`./data/keys/${activeKey}/genera_keys/${base.toLowerCase()}_${lang}.json`);
      } catch (e) {
        mod = await import(`./data/keys/${activeKey}/genera_keys/${base.toLowerCase()}.json`);
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

  // ── Key navigation ──
  const handleChoice = (opt, letter) => {
    setNavDir('forward');
    setHistory([...history, { step: currentStep, choice: letter, text: opt.text }]);

    if (opt.result) {
      const familyName = opt.result.split(' ')[0];
      setCurrentStep({ result: opt.result });
      if (features.inaturalist) fetchTaxonImage(familyName);
      if (features.worms) checkWorms(familyName);
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
      if (data.results?.length > 0 && data.results[0].default_photo) {
        setTaxonImage(data.results[0].default_photo.medium_url);
      } else {
        setImageFailed(true);
      }
    } catch (e) {
      setImageFailed(true);
    } finally {
      setImageLoading(false);
    }
  };

  const checkWorms = async (familyName) => {
    setWormsData(null);
    try {
      const res = await fetch(
        `https://www.marinespecies.org/rest/AphiaRecordsByName/${encodeURIComponent(familyName)}?like=false`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          const record = data[0];
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
      console.error('WoRMS error:', e);
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
    if (listWormsData[familyName]) return;
    try {
      const res = await fetch(
        `https://www.marinespecies.org/rest/AphiaRecordsByName/${encodeURIComponent(familyName)}?like=false`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          const record = data[0];
          if (record.status !== 'accepted' && record.valid_name) {
            setListWormsData(prev => ({
              ...prev,
              [familyName]: { status: record.status, validName: record.valid_name, reason: record.unacceptreason || record.status }
            }));
          } else {
            setListWormsData(prev => ({ ...prev, [familyName]: { valid: true } }));
          }
        }
      }
    } catch (e) {
      console.error('WoRMS error:', e);
    }
  };

  const handleJumpToStep = (index) => {
    if (index >= history.length - 1) return;
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
    setGeneraActive(false);
    setGeneraKey(null);
    setGeneraStep('1');
    setGeneraHistory([]);
    setSearchQuery('');
    setExpandedTaxon(null);
    setExpandedPaths({});
    setListWormsData({});
  };

  const depth = currentStep?.result
    ? 100
    : Math.round((history.length / (TOTAL_STEPS || 20)) * 90);

  // ── Build taxa paths for List mode ──
  const getTaxaPaths = () => {
    if (!fauchaldKey) return {};
    const paths = {};
    const traverse = (stepId, currentPath) => {
      const n = fauchaldKey[stepId];
      if (!n) return;
      if (n.optionA.result) {
        (paths[n.optionA.result] = paths[n.optionA.result] || []).push(
          [...currentPath, { step: stepId, choice: 'A', text: n.optionA.text }]
        );
      } else if (n.optionA.goTo) {
        traverse(n.optionA.goTo, [...currentPath, { step: stepId, choice: 'A', text: n.optionA.text }]);
      }
      if (n.optionB.result) {
        (paths[n.optionB.result] = paths[n.optionB.result] || []).push(
          [...currentPath, { step: stepId, choice: 'B', text: n.optionB.text }]
        );
      } else if (n.optionB.goTo) {
        traverse(n.optionB.goTo, [...currentPath, { step: stepId, choice: 'B', text: n.optionB.text }]);
      }
    };
    traverse('1', []);
    const sorted = {};
    Object.keys(paths).sort().forEach(k => { sorted[k] = paths[k]; });
    return sorted;
  };

  const taxaPaths = mode === 'list' && fauchaldKey ? getTaxaPaths() : {};

  const filteredTaxaPaths = Object.keys(taxaPaths)
    .filter(taxon => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      if (taxon.toLowerCase().includes(q)) return true;
      return taxaPaths[taxon].some(path =>
        path.some(step => step.text.toLowerCase().includes(q))
      );
    })
    .sort()
    .reduce((obj, key) => { obj[key] = taxaPaths[key]; return obj; }, {});

  // ── Render: Key Selector screen ──
  if (!activeKey) {
    return <KeySelector lang={lang} onSelectKey={handleSelectKey} onBrowseList={handleBrowseList} theme={theme} onToggleTheme={toggleTheme} onSetLang={(l) => { setLang(l); localStorage.setItem('setae-lang', l); }} />;
  }

  // ── Render: Main app ──
  return (
    <div className="wrapper" data-theme={theme}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 auto', minWidth: 0 }}>
          {currentKeyConfig && (
            <button
              onClick={handleBackToKeys}
              style={{
                background: 'none', border: 'none', color: 'var(--fog)', cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: '0.65rem', opacity: 0.6,
                padding: '0.25rem 0', whiteSpace: 'nowrap', flexShrink: 0
              }}
            >
              ← {currentKeyConfig.icon} {currentKeyConfig.title[lang]}
            </button>
          )}
          <h1 style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', whiteSpace: 'nowrap' }}>{t.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <div className="mode-switcher">
            <button className={mode === 'key' ? 'active' : ''} onClick={() => setMode('key')}>
              {t.mode_key}
            </button>
            <button className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}>
              {t.mode_list}
            </button>
          </div>
          <div className="lang-switcher">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => { setLang('en'); localStorage.setItem('setae-lang', 'en'); }}>EN</button>
            <button className={lang === 'es' ? 'active' : ''} onClick={() => { setLang('es'); localStorage.setItem('setae-lang', 'es'); }}>ES</button>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            <span className={`theme-icon ${theme === 'dark' ? 'active' : ''}`}>☽</span>
            <span className={`theme-icon ${theme === 'light' ? 'active' : ''}`}>☀</span>
          </button>
        </div>
      </header>

      {mode === 'key' ? (
        <div className="mode-panel" key="key-mode">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <span className="crumb">{history.length === 0 ? '01' : '01'}</span>
            {history.length > 0 && <span className="crumb-sep">·</span>}
            {history.map((h, i) => {
              const isActive = i === history.length - 1 && !currentStep.result;
              const label = String(i + 2).padStart(2, '0') + h.choice;
              return (
                <span key={i}>
                  {i < history.length - 1 || currentStep.result ? (
                    <button className="crumb-btn" onClick={() => handleJumpToStep(i)}>
                      <span className={isActive ? 'crumb active' : 'crumb'}>{label}</span>
                    </button>
                  ) : (
                    <span className={isActive ? 'crumb active' : 'crumb'}>{label}</span>
                  )}
                  {i < history.length - 1 && <span className="crumb-sep">·</span>}
                </span>
              );
            })}
          </div>

          <div id="app">
            <div className="controls-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {!generaActive && (
                <>
                  <button className="btn-back" onClick={handleBack} disabled={history.length === 0}>
                    ← {t.back_btn}
                  </button>
                  <button className="btn-reset-small" onClick={reset} disabled={history.length === 0}>
                    ↺ {t.start_over}
                  </button>
                </>
              )}
            </div>

            {/* Result card */}
            {currentStep?.result && !generaActive && (
              <div className="result-card">
                <div className="result-inner">
                  <div className="result-label">{t.result_label}</div>

                  {(() => {
                    const genusName = currentStep.result.split(' ')[0].toLowerCase();
                    const localImage = activeKey ? keyImages[activeKey]?.[genusName] : null;
                    if (localImage) {
                      return (
                        <div className="result-image" style={{ marginBottom: '1.5rem' }}>
                          <img src={localImage} alt={currentStep.result}
                            style={{ maxWidth: '200px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: '1px solid rgba(79,200,168,0.2)' }}
                          />
                        </div>
                      );
                    }
                    if (features.inaturalist) {
                      if (imageLoading) return <div className="result-image-shimmer" />;
                      if (taxonImage && !imageFailed) {
                        return (
                          <div className="result-image" style={{ marginBottom: '1.5rem' }}>
                            <img src={taxonImage} alt={currentStep.result}
                              style={{ maxWidth: '200px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', border: '1px solid rgba(79,200,168,0.2)' }}
                            />
                          </div>
                        );
                      }
                      return (
                        <div className="result-image-placeholder">
                          <svg className="placeholder-icon" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1">
                            <circle cx="24" cy="20" r="8" opacity="0.3"/>
                            <path d="M12 40c0-8 5.4-14 12-14s12 6 12 14" opacity="0.3"/>
                            <path d="M8 8l32 32" opacity="0.2"/>
                          </svg>
                          <span>No image available</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {features.worms && wormsData && renderWormsWarning(wormsData)}

                  <div className="result-name">
                    {features.worms ? (
                      <a href={`https://www.marinespecies.org/aphia.php?p=taxlist&tName=${currentStep.result.split(' ')[0]}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px dashed var(--biolum)' }}>
                        {currentStep.result}
                      </a>
                    ) : currentStep.result}
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
                    <button className="btn-genera" onClick={() => loadGeneraKey(currentStep.result)}
                      style={{ marginTop: '1.5rem', padding: '0.6rem 1.2rem', backgroundColor: 'rgba(79,200,168,0.15)', border: '1px solid var(--biolum)', borderRadius: '4px', color: 'var(--biolum)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      → {t.genera_btn}
                    </button>
                  )}
                  <button className="btn-reset" onClick={reset}>↺ &nbsp; {t.start_over}</button>
                </div>
              </div>
            )}

            {/* Genera key active */}
            {generaActive && generaKey && (
              <>
                <div className="breadcrumb genera-breadcrumb">
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
                    <button className="btn-back" onClick={backToFamily} style={{ fontSize: '0.75rem' }}>
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
                  ) : (() => {
                    const gn = generaKey[generaStep];
                    if (!gn) return <div>{t.error_not_found}</div>;
                    return (
                      <>
                        <div className="step-meta">
                          <span className="step-num">{generaFamily} · {gn.step}</span>
                          <div className="step-line"></div>
                        </div>
                        <div className="options">
                          {['optionA', 'optionB'].map((opt, idx) => (
                            <button key={idx} className="option-btn" onClick={() => handleGeneraChoice(gn[opt], idx === 0 ? 'A' : 'B')}>
                              <span className="option-letter">{idx === 0 ? 'A' : 'B'}</span>
                              <div><GlossaryText text={gn[opt].text} keyId={activeKey} /></div>
                              <span className="option-arrow">→</span>
                            </button>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Main key step */}
            {!currentStep?.result && !generaActive && node && (
              <div className={`step-card nav-${navDir}`} key={`step-${currentStep}`}>
                <div className="step-meta">
                  <span className="step-num">{node.step}</span>
                  <div className="step-line"></div>
                </div>
                <div className="options">
                  {[{ letter: 'A', opt: node.optionA }, { letter: 'B', opt: node.optionB }].map(({ letter, opt }) => (
                    <button key={letter} className="option-btn" onClick={() => handleChoice(opt, letter)}>
                      <span className="option-letter">{letter}</span>
                      <div><GlossaryText text={opt.text} keyId={activeKey} /></div>
                      <span className="option-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!currentStep?.result && !generaActive && !node && (
              <div>{t.error_not_found}</div>
            )}
          </div>
        </div>
      ) : (
        /* ── LIST MODE ── */
        <div className="mode-panel" key="list-mode">
          <div className="taxa-list" style={{ marginTop: '2rem', width: '100%', maxWidth: '760px' }}>
            <div className="search-bar">
              <input type="text" className="search-input" placeholder={t.search_placeholder}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            {Object.keys(filteredTaxaPaths).map(taxon => (
              <div key={taxon} className={`taxon-list-item ${expandedTaxon === taxon ? 'open' : ''}`}>
                <div className="taxon-list-header" onClick={e => {
                  const isOpening = expandedTaxon !== taxon;
                  setExpandedTaxon(isOpening ? taxon : null);
                  if (isOpening) {
                    if (features.worms) checkListWorms(taxon.split(' ')[0]);
                    setTimeout(() => {
                      const y = e.currentTarget.parentElement.getBoundingClientRect().top + window.scrollY - 20;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }, 100);
                  }
                }}>
                  <h3 className="taxon-list-title">{taxon}</h3>
                  <span className="taxon-list-icon">▼</span>
                </div>
                <div className="taxon-list-content">
                  {features.worms && listWormsData[taxon.split(' ')[0]] && !listWormsData[taxon.split(' ')[0]].valid &&
                    renderWormsWarning(listWormsData[taxon.split(' ')[0]])}

                  <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button onClick={() => setExpandedPaths(p => ({...p, [taxon]: !p[taxon]}))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fog)', fontSize: '0.75rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem 1rem', borderTop: '1px solid rgba(var(--fog-rgb), 0.12)', width: '100%' }}>
                      {expandedPaths[taxon] ? `▲ ${t.hide_steps}` : `▼ ${t.show_steps}`}
                    </button>
                  </div>

                  {expandedPaths[taxon] && filteredTaxaPaths[taxon].map((path, pi) => (
                    <div key={pi} style={{ marginBottom: pi < filteredTaxaPaths[taxon].length - 1 ? '2rem' : '0' }}>
                      {path.map((step, si) => (
                        <div key={si} className="taxon-path-step">
                          <div className="taxon-path-id">{step.step}{step.choice}</div>
                          <div className="taxon-path-text"><GlossaryText text={step.text} keyId={activeKey} /></div>
                        </div>
                      ))}
                      {pi < filteredTaxaPaths[taxon].length - 1 && (
                        <div style={{ margin: '1rem 0', color: 'var(--fog)', fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center' }}>{t.list_or}</div>
                      )}
                    </div>
                  ))}

                  {features.worms && listWormsData[taxon.split(' ')[0]] && !listWormsData[taxon.split(' ')[0]].valid &&
                    renderWormsWarning(listWormsData[taxon.split(' ')[0]], true)}

                  <div style={{ marginTop: '1.5rem', textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {hasGeneraKey(taxon) && (
                      <button onClick={() => { setMode('key'); loadGeneraKey(taxon); }}
                        style={{ color: 'var(--biolum)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--mono)', borderBottom: '1px dashed rgba(79,200,168,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0' }}>
                        → {t.genera_btn}
                      </button>
                    )}
                    {features.worms && (
                      <a href={`https://www.marinespecies.org/aphia.php?p=taxlist&tName=${taxon.split(' ')[0]}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--biolum)', textDecoration: 'none', fontSize: '0.75rem', fontFamily: 'var(--mono)', borderBottom: '1px dashed rgba(79,200,168,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t.worms_view}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="depth-meter">
        <div className="depth-track">
          <div className="depth-fill" style={{ height: `${depth}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default App;
