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
  const [currentStep, setCurrentStep] = useState('1');
  const [history, setHistory] = useState([]);

  const fauchaldKey = keys[lang];
  const t = translations[lang];
  const TOTAL_STEPS = Object.keys(fauchaldKey).length;
  const node = fauchaldKey[currentStep];

  const handleChoice = (opt, letter) => {
    setHistory([...history, { step: currentStep, choice: letter, text: opt.text }]);

    if (opt.result) {
      setCurrentStep({ result: opt.result });
    } else if (opt.goTo) {
      setCurrentStep(String(opt.goTo));
    }
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const last = newHistory.pop();
    setHistory(newHistory);
    setCurrentStep(last.step);
  };

  const reset = () => {
    setCurrentStep('1');
    setHistory([]);
  };

  const depth = currentStep.result ? 100 : Math.round((history.length / TOTAL_STEPS) * 90);

  return (
    <>
      <div className="wrapper">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{t.title}</h1>
          <div className="lang-switcher">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
          </div>
        </header>

        <div className="breadcrumb">
          <span className="crumb">{history.length === 0 ? '01' : '01'}</span>
          {history.length > 0 && <span className="crumb-sep">·</span>}
          {history.map((h, i) => {
            const isActive = i === history.length - 1 && !currentStep.result;
            const cls = isActive ? 'crumb active' : 'crumb';
            const label = String(i + 2).padStart(2, '0') + h.choice;
            return (
              <span key={i}>
                <span className={cls}>{label}</span>
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
                <div className="result-name">{currentStep.result}</div>
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
