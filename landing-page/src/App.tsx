import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Globe, ChevronDown, Layers, Crosshair, FolderKanban, Gamepad2, BarChart2 } from 'lucide-react';
import './App.css';

import logo from './assets/logo.png';
import heroScreenshot from './assets/data_charts.png';
import track2dImg from './assets/2d_racing_line.png';
import track3dImg from './assets/3d_racing_line.png';
import compareImg from './assets/reference_comparison.png';
import workspaceImg from './assets/setup_multiple_workspace_to_manage_your_data.png';
import sessionImg from './assets/select_session.png';
import wheelImg from './assets/choose_or_upload_your_own_wheel.png';
import multiSessionImg from './assets/compares_between_different_session.png';

const translations = {
  en: {
    loading: 'v... loading',
    description1: 'Advanced telemetry data analysis platform built for Le Mans Ultimate.',
    description2: 'Unlock your true track potential with 3D track visualization and real-time data tracking.',
    downloadWin: 'Download for Windows',
    sponsor: 'Support on Ko-fi',
    screenshotAlt: 'LMU Telemetry Lab Data Charts',
    featuresTitle: 'Features',
    featureTrackTitle: 'Immersive Track Analysis',
    featureTrackDesc: 'Switch seamlessly between 2D overhead views and 3D racing lines. Master your braking points and cornering trajectories with unparalleled clarity.',
    toggle2D: '2D Map',
    toggle3D: '3D Map',
    featureCompareTitle: 'Reference Lap Comparison',
    featureCompareDesc: 'Compare your telemetry against reference laps. Instantly identify where you are losing time and optimize your racing technique.',
    featureMultiSessionTitle: 'Cross-Session Analysis',
    featureMultiSessionDesc: 'Compare telemetry data across different sessions. Track your progression over time and identify the optimal setup for every condition.',
    featureWorkspaceTitle: 'Advanced Data Organization',
    featureWorkspaceDesc: 'Set up multiple workspaces to manage telemetry data effortlessly. Select specific sessions to keep your analysis focused and structured.',
    featureHardwareTitle: 'True-to-Life Hardware Sync',
    featureHardwareDesc: 'Choose or upload your exact steering wheel model. Sync your real-world hardware settings with the app for a 1:1 simulation experience.',
    footer: '© 2026 LMU Telemetry Lab. Built with passion for sim racing.',
    langName: 'English'
  },
  'zh-TW': {
    loading: 'v...讀取中',
    description1: '專為 Le Mans Ultimate 打造的進階遙測數據分析平台。',
    description2: '整合 3D 賽道可視化與即時數據追蹤，全面釋放你的賽道潛力。',
    downloadWin: '立即下載 Windows 版',
    sponsor: '贊助杯咖啡',
    screenshotAlt: 'LMU Telemetry Lab 數據圖表',
    featuresTitle: 'Features',
    featureTrackTitle: '沉浸式賽道分析',
    featureTrackDesc: '自由切換 2D 俯視與 3D 賽道路線。以無與倫比的清晰度掌握每個煞車點與過彎軌跡，將你的單圈成績推向極限。',
    toggle2D: '2D 視角',
    toggle3D: '3D 視角',
    featureCompareTitle: '基準圈對比分析',
    featureCompareDesc: '將你的單圈表現與基準圈進行深度對比，瞬間找出落後區間，最佳化你的駕駛技巧。',
    featureMultiSessionTitle: '跨賽程深度比對',
    featureMultiSessionDesc: '跨越不同賽程進行遙測數據比對。輕鬆追蹤你的長期進步幅度，並在各種賽道條件下找出最完美的車輛調校。',
    featureWorkspaceTitle: '進階工作區管理',
    featureWorkspaceDesc: '輕鬆整理龐大的遙測數據。支援多工作區建立與單一賽程篩選，讓你的數據分析保持井然有序。',
    featureHardwareTitle: '真實硬體外觀同步',
    featureHardwareDesc: '選擇或上傳你專屬的方向盤模型。將真實世界的硬體設定與應用程式完美同步，享受 1:1 的沉浸分析體驗。',
    footer: '© 2026 LMU Telemetry Lab. Built with passion for sim racing.',
    langName: '繁體中文'
  },
  es: {
    loading: 'v... cargando',
    description1: 'Plataforma avanzada de análisis de telemetría creada para Le Mans Ultimate.',
    description2: 'Desbloquea tu verdadero potencial en la pista con visualización 3D y seguimiento de datos en tiempo real.',
    downloadWin: 'Descargar para Windows',
    sponsor: 'Cómprame un café',
    screenshotAlt: 'Gráficos de datos',
    featuresTitle: 'Features',
    featureTrackTitle: 'Análisis de Pista Inmersivo',
    featureTrackDesc: 'Cambia sin problemas entre vistas aéreas 2D y líneas de carrera 3D. Domina tus puntos de frenado y trayectorias con una claridad inigualable.',
    toggle2D: 'Mapa 2D',
    toggle3D: 'Mapa 3D',
    featureCompareTitle: 'Comparación de Vueltas',
    featureCompareDesc: 'Compara tu telemetría con vueltas de referencia. Identifica instantáneamente dónde pierdes tiempo y optimiza tu técnica.',
    featureMultiSessionTitle: 'Análisis Multisesión',
    featureMultiSessionDesc: 'Compara datos de telemetría de diferentes sesiones. Sigue tu progresión a lo largo del tiempo e identifica la configuración óptima.',
    featureWorkspaceTitle: 'Organización Avanzada',
    featureWorkspaceDesc: 'Configura múltiples espacios de trabajo para gestionar datos de telemetría sin esfuerzo. Selecciona sesiones específicas para mantener tu análisis estructurado.',
    featureHardwareTitle: 'Sincronización de Hardware',
    featureHardwareDesc: 'Elige o sube tu propio modelo de volante. Sincroniza tus ajustes reales con la aplicación para una experiencia de simulación 1:1.',
    footer: '© 2026 LMU Telemetry Lab. Creado con pasión por el sim racing.',
    langName: 'Español'
  },
  it: {
    loading: 'v... caricamento',
    description1: 'Piattaforma avanzata di analisi telemetrica creata per Le Mans Ultimate.',
    description2: 'Sblocca il tuo vero potenziale in pista con la visualizzazione 3D e il tracciamento dei dati in tempo reale.',
    downloadWin: 'Scarica per Windows',
    sponsor: 'Offrimi un caffè',
    screenshotAlt: 'Grafici dei dati',
    featuresTitle: 'Features',
    featureTrackTitle: 'Analisi Immersiva del Tracciato',
    featureTrackDesc: 'Passa facilmente dalle viste aeree 2D alle traiettorie 3D. Padroneggia i punti di frenata e le traiettorie con una chiarezza senza pari.',
    toggle2D: 'Mappa 2D',
    toggle3D: 'Mappa 3D',
    featureCompareTitle: 'Confronto Giri di Riferimento',
    featureCompareDesc: 'Confronta la tua telemetria con i giri di riferimento. Identifica all\'istante dove perdi tempo e ottimizza la tua tecnica.',
    featureMultiSessionTitle: 'Analisi Multi-Sessione',
    featureMultiSessionDesc: 'Confronta i dati telemetrici di diverse sessioni. Tieni traccia dei tuoi progressi nel tempo e identifica l\'assetto ottimale.',
    featureWorkspaceTitle: 'Organizzazione Avanzata',
    featureWorkspaceDesc: 'Imposta più aree di lavoro per gestire i dati telemetrici senza sforzo. Seleziona sessioni specifiche per mantenere la tua analisi strutturata.',
    featureHardwareTitle: 'Sincronizzazione Hardware',
    featureHardwareDesc: 'Scegli o carica il tuo modello di volante. Sincronizza le tue impostazioni reali con l\'app per un\'esperienza di simulazione 1:1.',
    footer: '© 2026 LMU Telemetry Lab. Creato con passione per il sim racing.',
    langName: 'Italiano'
  }
};

type LangType = keyof typeof translations;

export const App: React.FC = () => {
  const [lang, setLang] = useState<LangType>('en');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [version, setVersion] = useState<string>(translations['en'].loading);
  const [downloadUrl, setDownloadUrl] = useState<string>('https://github.com/rabbit20031225/LMU-Telemetry-Lab/releases/latest');
  const [trackMode, setTrackMode] = useState<'2d' | '3d'>('3d');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  useEffect(() => {
    fetch('https://api.github.com/repos/rabbit20031225/LMU-Telemetry-Lab/releases/latest')
      .then(res => res.json())
      .then(data => {
        if (data.tag_name) setVersion(data.tag_name);
        const installer = data.assets?.find((a: any) => a.name.endsWith('.exe') || a.name.endsWith('.zip'));
        if (installer) setDownloadUrl(installer.browser_download_url);
      })
      .catch(err => console.error('Failed to fetch release:', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="landing-container">
      {/* 背景動態光暈 */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-brand">
            <img src={logo} alt="Logo" className="nav-logo" />
            <span className="nav-title">LMU Telemetry Lab</span>
          </div>
          
          <div className="nav-actions">
            <a 
              href="https://ko-fi.com/hungyc"
              target="_blank"
              rel="noreferrer"
              className="nav-kofi-img"
            >
              <img 
                height="36" 
                style={{ border: 0, height: '36px' }} 
                src="https://ko-fi.com/img/githubbutton_sm.svg" 
                alt="Support me on Ko-fi" 
              />
            </a>

            {/* Custom Language Switcher */}
            <div className="lang-switcher-container" ref={dropdownRef}>
              <button 
                className="lang-switcher-btn"
                onClick={() => setIsLangOpen(!isLangOpen)}
              >
                <Globe size={18} />
                <span>{t.langName}</span>
                <ChevronDown size={16} className={`chevron ${isLangOpen ? 'open' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isLangOpen && (
                  <motion.ul 
                    className="lang-dropdown"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {(Object.keys(translations) as LangType[]).map((l) => (
                      <li key={l}>
                        <button 
                          className={lang === l ? 'active' : ''}
                          onClick={() => {
                            setLang(l);
                            setIsLangOpen(false);
                          }}
                        >
                          {translations[l].langName}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <a href="https://github.com/rabbit20031225/LMU-Telemetry-Lab" target="_blank" rel="noreferrer" className="nav-github">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <main className="landing-content">
        <motion.section 
          className="hero-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="brand-header">
            <motion.img 
              src={logo} 
              alt="LMU Telemetry Lab Logo" 
              className="brand-logo"
              whileHover={{ scale: 1.05, rotate: 5 }}
            />
            <div className="brand-title-group">
              <h1 className="brand-title">LMU Telemetry Lab</h1>
              <span className="version-badge">
                {version === translations['en'].loading || version === translations['zh-TW'].loading || version === translations['es'].loading || version === translations['it'].loading ? t.loading : version}
              </span>
            </div>
          </div>

          <p className="hero-description">
            {t.description1}<br/>
            {t.description2}
          </p>

          <div className="action-buttons">
            <motion.a 
              href={downloadUrl}
              className="btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download size={22} />
              {t.downloadWin}
            </motion.a>
          </div>
        </motion.section>

        {/* 主圖表展示 */}
        <motion.section 
          className="screenshot-section"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          <div className="screenshot-wrapper">
            <img src={heroScreenshot} alt={t.screenshotAlt} className="app-screenshot" />
            <div className="glass-reflection"></div>
          </div>
        </motion.section>

        {/* 核心特色 Showcase */}
        <section className="showcase-section">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ margin: "-50px" }}
          >
            <h2>{t.featuresTitle}</h2>
          </motion.div>

          {/* Feature 1: Track Map Toggle */}
          <motion.div 
            className="showcase-row"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="showcase-text">
               <div className="showcase-text-icon"><Layers size={24} /></div>
               <h3>{t.featureTrackTitle}</h3>
               <p>{t.featureTrackDesc}</p>
            </div>
            <div className="showcase-visual">
               <div className="track-toggle">
                 <button className={trackMode === '2d' ? 'active' : ''} onClick={() => setTrackMode('2d')}>{t.toggle2D}</button>
                 <button className={trackMode === '3d' ? 'active' : ''} onClick={() => setTrackMode('3d')}>{t.toggle3D}</button>
               </div>
               <AnimatePresence mode="wait">
                 <motion.img 
                   key={trackMode}
                   src={trackMode === '2d' ? track2dImg : track3dImg}
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ duration: 0.2 }}
                   className="showcase-img"
                   alt="Racing Line Map"
                 />
               </AnimatePresence>
            </div>
          </motion.div>

          {/* Feature 2: Reference Comparison */}
          <motion.div 
            className="showcase-row reverse large-visual"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="showcase-text">
               <div className="showcase-text-icon"><Crosshair size={24} /></div>
               <h3>{t.featureCompareTitle}</h3>
               <p>{t.featureCompareDesc}</p>
            </div>
            <div className="showcase-visual">
               <img src={compareImg} className="showcase-img" alt="Reference Comparison" />
            </div>
          </motion.div>

          {/* Feature 3: Multi-Session */}
          <motion.div 
            className="showcase-row"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="showcase-text">
               <div className="showcase-text-icon"><BarChart2 size={24} /></div>
               <h3>{t.featureMultiSessionTitle}</h3>
               <p>{t.featureMultiSessionDesc}</p>
            </div>
            <div className="showcase-visual">
               <img src={multiSessionImg} className="showcase-img" alt="Multi-Session Analysis" />
            </div>
          </motion.div>

          {/* Feature 4: Workspace */}
          <motion.div 
            className="showcase-row reverse"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="showcase-text">
               <div className="showcase-text-icon"><FolderKanban size={24} /></div>
               <h3>{t.featureWorkspaceTitle}</h3>
               <p>{t.featureWorkspaceDesc}</p>
            </div>
            <div className="showcase-visual split-row">
               <img src={workspaceImg} className="showcase-img half" alt="Workspace Setup" />
               <img src={sessionImg} className="showcase-img half" alt="Select Session" />
            </div>
          </motion.div>

          {/* Feature 5: Hardware */}
          <motion.div 
            className="showcase-row"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="showcase-text">
               <div className="showcase-text-icon"><Gamepad2 size={24} /></div>
               <h3>{t.featureHardwareTitle}</h3>
               <p>{t.featureHardwareDesc}</p>
            </div>
            <div className="showcase-visual">
               <img src={wheelImg} className="showcase-img small" alt="Hardware Wheel Sync" />
            </div>
          </motion.div>

        </section>
      </main>

      <footer className="footer">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
};

export default App;
