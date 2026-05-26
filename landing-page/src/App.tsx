import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Globe, ChevronDown, Layers, Crosshair, FolderKanban, Gamepad2, BarChart2, Settings2, MousePointer2, Monitor, BookOpen, FolderOpen, Share2 } from 'lucide-react';
import './App.css';

import logo from './assets/logo.png';
import heroScreenshot from './assets/data_charts.png';
import track2dImg from './assets/2d_racing_line.png';
import track3dImg from './assets/3d_racing_line.png';
import compareImg from './assets/reference_comparison.png';
import wheelImg from './assets/choose_or_upload_your_own_wheel.png';
import multiSessionImg from './assets/compares_between_different_session.png';
import carSetupImg from './assets/car_setup_comparison.png';
import customSettings1 from './assets/custom_settings_1.png';
import customSettings2 from './assets/custom_settings_2.png';
import session1 from './assets/select_session_1.png';
import session2 from './assets/select_session_2.png';
import session3 from './assets/select_session_3.png';
import session4 from './assets/select_session_4.png';
import recording1 from './assets/recording_1.png';
import recording2 from './assets/recording_2.png';
import exportImg from './assets/export_lap_and_setup_files.png';

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
    featureSetupTitle: 'Detailed Setup Comparison',
    featureSetupDesc: 'Compare specific car setup parameters between different laps. Use the top-right button to export your exact configurations to share with others, and discover how suspension or tire pressure tweaks impact performance.',
    featureWorkspaceTitle: 'Advanced Data Organization',
    featureWorkspaceDesc: 'Easily organize vast amounts of telemetry data. Support for multiple workspaces and precise session selection to keep your analysis structured.',
    featureCustomTitle: 'Custom Display Settings',
    featureCustomDesc: 'Tailor your dashboard to perfection. Adjust HUD elements, map colors, and data overlays to suit your personal analysis workflow.',
    featureHardwareTitle: 'True-to-Life Hardware Sync',
    featureHardwareDesc: 'Choose or upload your exact steering wheel model. Sync your real-world hardware settings with the app for a 1:1 simulation experience.',
    featureExportTitle: 'Seamless Export & Share',
    featureExportDesc: 'Export your telemetry files and car setups simultaneously with a single click. Share your data with friends, teammates, or the sim racing community to compare racing lines. Join our Discord server to exchange setups and discuss strategies with drivers worldwide!',
    joinDiscordBtn: 'Join Discord Community',
    footer: '© 2026 LMU Telemetry Lab. Built with passion for sim racing.',
    langName: 'English',
    clickToSwitch: 'Click to switch cards',
    howToTitle: 'How to Record Telemetry',
    howToDesc: 'Follow these steps to generate and find your LMU telemetry files.',
    method1Title: 'Method 1: Manual Keybind',
    method1Desc: 'Go to game settings: Settings -> Controls -> Gameplay -> Telemetry Recording and bind a key. Once on track, press the key to start recording (recommended after exiting the pit lane), and press it again to stop.',
    method2Title: 'Method 2: Automatic Recording',
    method2Desc: 'Go to game settings: Settings -> Gameplay -> Extra -> Automatically Record Telemetry and turn it on. The game will automatically start recording every time you drive. You can still use your manual keybind to stop recording.',
    filePathTitle: 'Telemetry File Directory',
    filePathDesc: 'Telemetry files are saved in the game\'s installation directory under:',
    steamTipTitle: 'How to find your game directory?',
    steamTipDesc: 'In Steam Library -> Right-click Le Mans Ultimate (or click the Gear icon) -> Manage -> Browse local files. This will open the game\'s installation folder where you can find UserData\\Telemetry.',
    bannerTip: 'Scroll down or click here to view the Step-by-Step Telemetry Recording Guide!'
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
    featureSetupTitle: '深度車輛調校比對',
    featureSetupDesc: '精確比對不同單圈間的車輛調校參數。現在更支援透過右上方按鍵一鍵匯出調校設定與他人分享。深度分析懸吊、空力或胎壓的微調如何影響你的賽道表現。',
    featureWorkspaceTitle: '進階數據組織',
    featureWorkspaceDesc: '輕鬆整理龐大的遙測數據。支援多工作區與精確的賽程選擇系統，讓你的數據分析始終保持井然有序。',
    featureCustomTitle: '自定義顯示設定',
    featureCustomDesc: '隨心所欲調整你的儀表板。從 HUD 元素到賽道顏色與數據圖層，都能根據你的分析習慣進行深度客製化。',
    featureHardwareTitle: '真實硬體外觀同步',
    featureHardwareDesc: '選擇或上傳你專屬的方向盤模型。將真實世界的硬體設定與應用程式完美同步，享受 1:1 的沉浸分析體驗。',
    featureExportTitle: '一鍵匯出與社群分享',
    featureExportDesc: '一鍵同時匯出你的單圈遙測與車輛設定檔！輕鬆與朋友、隊友或賽車社群分享，比對彼此的賽道路線與車輛調校。歡迎加入我們的 Discord 社群，與全球車手交流遙測檔案、分享調校心得並探討駕駛技巧！',
    joinDiscordBtn: '加入 Discord 社群',
    footer: '© 2026 LMU Telemetry Lab. Built with passion for sim racing.',
    langName: '繁體中文',
    clickToSwitch: '點擊切換圖片',
    howToTitle: '如何紀錄遙測數據？',
    howToDesc: '請按照以下步驟在遊戲中生成並找到你的遙測數據檔案。',
    method1Title: '方法一：手動按鍵控制',
    method1Desc: '進入遊戲設定：Settings -> Controls -> Gameplay -> Telemetry Recording，綁定一個按鍵。在駛入賽道後按下該按鍵即可開始紀錄（建議在駛出 Pit 區後開啟），再次點擊即終止紀錄。',
    method2Title: '方法二：自動開啟紀錄',
    method2Desc: '進入遊戲設定：Settings -> Gameplay -> Extra -> Automatically Record Telemetry 並開啟。開啟後遊戲將在你每一次駛入賽道時自動記錄，過程中你亦可隨時使用手動設定的按鍵來終止紀錄。',
    filePathTitle: '遙測檔案儲存路徑',
    filePathDesc: '遙測紀錄檔案會保存在 Le Mans Ultimate 安裝目錄下的以下路徑：',
    steamTipTitle: '如何快速找到遊戲主目錄？',
    steamTipDesc: 'In Steam 收藏庫中找到 Le Mans Ultimate -> 右鍵點選（或點擊右側的齒輪「管理」圖示） -> 點選 管理 -> 瀏覽本機檔案 (Browse local files)，即可直接打開遊戲安裝主目錄，接著進入 UserData\\Telemetry 資料夾。',
    bannerTip: '滑到最下面或點擊此處，即可查看「遙測數據紀錄」步驟教學！'
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
    featureSetupTitle: 'Comparación de Configuración',
    featureSetupDesc: 'Compara parámetros específicos de configuración entre vueltas. Use el botón superior derecho para exportar configuraciones y compartirlas.',
    featureWorkspaceTitle: 'Organización Avanzada',
    featureWorkspaceDesc: 'Configura múltiples espacios de trabajo para gestionar datos de telemetría sin esfuerzo.',
    featureCustomTitle: 'Ajustes de Pantalla',
    featureCustomDesc: 'Personaliza tu panel de control a la perfección. Ajusta elementos del HUD y colores.',
    featureHardwareTitle: 'Sincronización de Hardware',
    featureHardwareDesc: 'Elige o sube tu propio modelo de volante. Sincroniza tus ajustes reales.',
    featureExportTitle: 'Exportar y Compartir Fácilmente',
    featureExportDesc: 'Exporte sus archivos de telemetría y configuraciones simultáneamente con un solo clic. Comparta sus datos con amigos o la comunidad. ¡Únase a nuestro servidor de Discord para intercambiar archivos y discutir estrategias!',
    joinDiscordBtn: 'Unirse a la Comunidad Discord',
    footer: '© 2026 LMU Telemetry Lab. Creado con pasión por el sim racing.',
    langName: 'Español',
    clickToSwitch: 'Haz clic para cambiar',
    howToTitle: 'Cómo registrar la telemetría',
    howToDesc: 'Siga estos pasos para generar y encontrar sus archivos de telemetría LMU.',
    method1Title: 'Método 1: Tecla Manual',
    method1Desc: 'Ve a ajustes: Settings -> Controls -> Gameplay -> Telemetry Recording y asigna una tecla. En pista, presiona la tecla para iniciar el registro (se recomienda tras salir de boxes) y vuelve a presionarla para detenerlo.',
    method2Title: 'Método 2: Registro Automático',
    method2Desc: 'Ve a ajustes: Settings -> Gameplay -> Extra -> Automatically Record Telemetry y actívalo. El juego registrará automáticamente al conducir. Puedes seguir usando la tecla manual para detener.',
    filePathTitle: 'Directorio de archivos de telemetría',
    filePathDesc: 'Los archivos de telemetría se guardan en el directorio del juego bajo:',
    steamTipTitle: '¿Cómo encontrar el directorio del juego?',
    steamTipDesc: 'En Steam -> Biblioteca -> Clic derecho en Le Mans Ultimate (o icono de engranaje) -> Administrar -> Ver archivos locales. Esto abrirá la carpeta del juego donde encontrará UserData\\Telemetry.',
    bannerTip: '¡Desplácese hacia abajo o haga clic aquí para ver la guía de registro de telemetría!'
  },
  it: {
    loading: 'v... caricamento',
    description1: 'Piattaforma avanzata di analisi telemetrica creata per Le Mans Ultimate.',
    description2: 'Sblocca il tuo vero potenziale in pista con la visualizzazione 3D e il tracciamento dei dati in tempo real.',
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
    featureMultiSessionTitle: 'Análisis Multi-Sessione',
    featureMultiSessionDesc: 'Confronta i dati telemetrici di diverse sessioni. Tieni traccia dei tuoi progressi nel tempo e identifica l\'assetto ottimale.',
    featureSetupTitle: 'Confronto Assetto',
    featureSetupDesc: 'Confronta i parametri di assetto tra i vari giri. Usa il pulsante in alto a destra per esportare le configurazioni e condividerle.',
    featureWorkspaceTitle: 'Organizzazione Avanzata',
    featureWorkspaceDesc: 'Imposta più aree di lavoro per gestire i dati telemetrici senza sforzo.',
    featureCustomTitle: 'Impostazioni Display',
    featureCustomDesc: 'Personalizza il tuo dashboard. Regola elementi HUD e colori della mappa.',
    featureHardwareTitle: 'Sincronizzazione Hardware',
    featureHardwareDesc: 'Scegli o carica il tuo modello di volante. Sincronizza le tue impostazioni reali.',
    featureExportTitle: 'Esportazione e Condivisione Semplice',
    featureExportDesc: 'Esporta i file di telemetria e gli assetti contemporaneamente con un solo clic. Condividi i tuoi dati con amici o la community. Unisciti al nostro server Discord per scambiare file e discutere strategie!',
    joinDiscordBtn: 'Unisciti alla Community Discord',
    footer: '© 2026 LMU Telemetry Lab. Creato con passione per il sim racing.',
    langName: 'Italiano',
    clickToSwitch: 'Clicca per cambiare',
    howToTitle: 'Come registrare la telemetria',
    howToDesc: 'Segui questi passaggi per generare e trovare i file di telemetria di LMU.',
    method1Title: 'Metodo 1: Tasto Manuale',
    method1Desc: 'Vai su impostazioni: Settings -> Controls -> Gameplay -> Telemetry Recording e assegna un tasto. In pista, premi il tasto per avviare (consigliato dopo l\'uscita dai box) e ripremi per fermare.',
    method2Title: 'Metodo 2: Registrazione Automatica',
    method2Desc: 'Vai su impostazioni: Settings -> Gameplay -> Extra -> Automatically Record Telemetry e attivalo. Il gioco registrerà automaticamente ogni volta che guidi. Puoi usare il tasto manuale per fermare.',
    filePathTitle: 'Directory dei file di telemetria',
    filePathDesc: 'I file di telemetria sono salvati nella cartella del gioco sotto:',
    steamTipTitle: 'Come trovare la cartella del gioco?',
    steamTipDesc: 'In Steam -> Libreria -> Tasto destro su Le Mans Ultimate (o icona dell\'ingranaggio) -> Gestisci -> Sfoglia i file locali. Questo aprirà la cartella di installazione del gioco dove puoi trovare UserData\\Telemetry.',
    bannerTip: 'Scorri fino in fondo o clicca qui per vedere la guida alla registrazione della telemetria!'
  }
};

type LangType = keyof typeof translations;

const renderDescWithHighlight = (text: string) => {
  const regex = /([（(][^）)]+[）)])/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (/([（(][^）)]+[）)])/.test(part)) {
      return <span key={i} className="text-highlight">{part}</span>;
    }
    return part;
  });
};

export const App: React.FC = () => {
  const [lang, setLang] = useState<LangType>('en');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [version, setVersion] = useState<string>(translations['en'].loading);
  const [downloadUrl, setDownloadUrl] = useState<string>('https://github.com/rabbit20031225/LMU-Telemetry-Lab/releases/latest');
  const [trackMode, setTrackMode] = useState<'2d' | '3d'>('3d');
  const [sessionIdx, setSessionIdx] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];
  const sessionImages = [session1, session2, session3, session4];

  useEffect(() => {
    fetch('https://api.github.com/repos/rabbit20031225/LMU-Telemetry-Lab/releases/latest')
      .then(res => res.json())
      .then(data => {
        if (data.tag_name) setVersion(data.tag_name);
        const installer = data.assets?.find((a: { name: string, browser_download_url: string }) => a.name.endsWith('.exe') || a.name.endsWith('.zip'));
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

  const nextSession = () => {
    setSessionIdx((prev) => (prev + 1) % sessionImages.length);
  };

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

            <a href="https://discord.gg/zNPehXA3jK" target="_blank" rel="noreferrer" className="nav-discord">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
              </svg>
              Discord
            </a>

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
          {/* How-to Guide Pill Banner */}
          <motion.div 
            className="how-to-banner"
            onClick={() => document.getElementById('how-to')?.scrollIntoView({ behavior: 'smooth' })}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="banner-badge">💡 Tip</span>
            <span className="banner-text">{t.bannerTip}</span>
            <ChevronDown size={14} className="banner-arrow" />
          </motion.div>

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

          {/* Feature 3.5: Car Setup Comparison */}
          <motion.div 
            className="showcase-row reverse large-visual"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="showcase-text">
               <div className="showcase-text-icon"><Settings2 size={24} /></div>
               <h3>{t.featureSetupTitle}</h3>
               <p>{t.featureSetupDesc}</p>
            </div>
            <div className="showcase-visual">
               <img src={carSetupImg} className="showcase-img" alt="Car Setup Comparison" />
            </div>
          </motion.div>

          {/* Feature 4: Workspace (Card Stack) */}
          <motion.div 
            className="showcase-row"
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
            <div className="showcase-visual">
               <div className="card-stack-container" onClick={nextSession}>
                 <AnimatePresence mode="popLayout">
                    {sessionImages.map((img, i) => {
                      const isTop = i === sessionIdx;
                      const offset = (i - sessionIdx + sessionImages.length) % sessionImages.length;
                      if (offset > 3) return null;

                      // Staggering effect: rotate and shift
                      const rotate = offset * 5;
                      const x = offset * 25;
                      const y = offset * 15;

                      return (
                        <motion.div
                          key={i}
                          className={`session-card ${isTop ? 'top' : ''}`}
                          initial={{ opacity: 0, scale: 0.8, x: 100 }}
                          animate={{ 
                            opacity: 1 - offset * 0.2, 
                            scale: 1 - offset * 0.05,
                            x: x,
                            y: y,
                            rotate: rotate,
                            zIndex: 10 - offset
                          }}
                          exit={{ opacity: 0, scale: 0.8, x: -100, rotate: -20 }}
                          transition={{ duration: 0.4 }}
                        >
                          <img src={img} className="showcase-img" alt={`Session ${i + 1}`} />
                          {isTop && (
                            <div className="click-hint">
                              <MousePointer2 size={16} />
                              <span>{t.clickToSwitch}</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                 </AnimatePresence>
               </div>
            </div>
          </motion.div>

          {/* Feature 4.5: Custom Settings [NEW] */}
          <motion.div 
            className="showcase-row reverse"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="showcase-text">
               <div className="showcase-text-icon"><Monitor size={24} /></div>
               <h3>{t.featureCustomTitle}</h3>
               <p>{t.featureCustomDesc}</p>
            </div>
            <div className="showcase-visual split-row">
               <img src={customSettings1} className="showcase-img half" alt="Custom Settings 1" />
               <img src={customSettings2} className="showcase-img half" alt="Custom Settings 2" />
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

          {/* Feature 6: Seamless Export & Share */}
          <motion.div 
            className="showcase-row reverse large-visual"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.7 }}
          >
            <div className="showcase-text">
               <div className="showcase-text-icon"><Share2 size={24} /></div>
               <h3>{t.featureExportTitle}</h3>
               <p>{t.featureExportDesc}</p>
               
               {/* High-quality Discord CTA Button inside the section */}
               <motion.a 
                 href="https://discord.gg/zNPehXA3jK"
                 target="_blank"
                 rel="noreferrer"
                 className="btn-discord-cta"
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
               >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '0.6rem' }}>
                   <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                 </svg>
                 {t.joinDiscordBtn}
               </motion.a>
            </div>
            <div className="showcase-visual">
               <img src={exportImg} className="showcase-img" alt="Export Lap and Setup Files" />
            </div>
          </motion.div>

        </section>

        {/* How to Record Telemetry Section */}
        <section className="how-to-section" id="how-to">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ margin: "-50px" }}
          >
            <div className="section-title-icon">
              <BookOpen size={32} className="title-icon-glow" />
            </div>
            <h2>{t.howToTitle}</h2>
            <p className="section-subtitle">{t.howToDesc}</p>
          </motion.div>

          <div className="how-to-list">
            {/* Step 1: Manual Keybind */}
            <motion.div 
              className="how-to-row-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ margin: "-50px" }}
              transition={{ duration: 0.6 }}
            >
              <div className="how-to-card-content">
                <span className="step-badge">Method 1</span>
                <h3>{t.method1Title}</h3>
                <p>{renderDescWithHighlight(t.method1Desc)}</p>
              </div>
              <div className="how-to-card-image">
                <img src={recording1} alt="Manual Telemetry Recording Keybind Settings" />
              </div>
            </motion.div>

            {/* Step 2: Automatic Recording */}
            <motion.div 
              className="how-to-row-card reverse"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ margin: "-50px" }}
              transition={{ duration: 0.6 }}
            >
              <div className="how-to-card-content">
                <span className="step-badge">Method 2</span>
                <h3>{t.method2Title}</h3>
                <p>{t.method2Desc}</p>
              </div>
              <div className="how-to-card-image">
                <img src={recording2} alt="Automatic Telemetry Recording Settings" />
              </div>
            </motion.div>
          </div>

          {/* Directory Location Info Box */}
          <motion.div 
            className="directory-info-box"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="info-icon">
              <FolderOpen size={24} />
            </div>
            <div className="info-content">
              <h4>{t.filePathTitle}</h4>
              <p>{t.filePathDesc}</p>
              <div className="path-display-container">
                <code className="path-code">
                  ...\Steam\steamapps\common\Le Mans Ultimate\UserData\Telemetry
                </code>
              </div>
              
              <div className="steam-tip-divider"></div>
              
              <div className="steam-tip-section">
                <h5>{t.steamTipTitle}</h5>
                <p>{t.steamTipDesc}</p>
              </div>
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
