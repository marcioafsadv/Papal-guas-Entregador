
import React, { useState, useEffect, useRef } from 'react';
import { DriverStatus, DeliveryMission, Transaction } from './types';
import { COLORS, calculateEarnings, MOCK_STORES, MOCK_CUSTOMERS, weeklyPayouts, pastOrders } from './constants';
import { MapMock } from './components/MapMock';
import { ActionSlider } from './components/ActionSlider';
import { Logo } from './components/Logo';

type Screen = 'HOME' | 'WALLET' | 'ORDERS' | 'SETTINGS' | 'WITHDRAWAL_REQUEST';
type SettingsView = 'MAIN' | 'PERSONAL' | 'DOCUMENTS' | 'BANK' | 'EMERGENCY' | 'DELIVERY';
type AuthScreen = 'LOGIN' | 'REGISTER' | 'RECOVERY';

const SOUND_OPTIONS = [
  { id: 'beep', label: 'Alerta Padrão', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg', icon: 'fa-bell' },
  { id: 'horn', label: 'Buzina', url: 'https://actions.google.com/sounds/v1/cartoon/clown_horn.ogg', icon: 'fa-bullhorn' }
];

const ANTICIPATION_FEE = 5.00;

// Dados do Usuário e Banco (Simulado)
const USER_PROFILE = {
  name: "João Motoca",
  level: "Papa-Léguas Pro",
  avatar: "https://i.pravatar.cc/150?u=joao",
  bank: {
    name: "Nubank",
    code: "260",
    agency: "0001",
    account: "9876543-2",
    type: "Conta Corrente",
    pixKey: "joao.motoca@email.com"
  }
};

const USER_EXTENDED = {
  cpf: "332.145.789-00",
  phone: "(11) 98765-4321",
  email: "joao.motoca@papaleguas.com",
  region: "Itu - SP",
  gender: "Masculino",
  education: "Ensino Médio Completo",
  cnh: {
    number: "12345678900",
    category: "AB",
    expiry: "15/10/2028"
  }
};

// Mock de Semanas para Filtro
const MOCK_WEEKS = [
  { id: 'current', label: 'Semana Atual', range: '20 Out - 26 Out' },
  { id: 'last', label: 'Semana Passada', range: '13 Out - 19 Out' },
  { id: 'w3', label: '06 Out - 12 Out', range: '06 Out - 12 Out' },
];

// Helper para gerar timeline baseada no horário final
const generateTimeline = (endTime: string) => {
  const [hours, minutes] = endTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0);

  const format = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const events = [];
  // Fim da rota (Horário atual)
  events.unshift({ time: format(date), description: 'Fim da rota', status: 'done' });
  
  // Pedido entregue (mesmo horário ou 1 min antes)
  events.unshift({ time: format(date), description: 'Pedido entregue', status: 'done' });
  
  // Em direção ao cliente (-5 min)
  date.setMinutes(date.getMinutes() - 5);
  events.unshift({ time: format(date), description: 'Em direção ao cliente', status: 'done' });
  
  // Saiu da coleta (mesmo horário)
  events.unshift({ time: format(date), description: 'Saiu da coleta', status: 'done' });
  
  // Chegou na coleta (-3 min)
  date.setMinutes(date.getMinutes() - 3);
  events.unshift({ time: format(date), description: 'Chegou na coleta', status: 'done' });
  
  // Indo pra coleta (-5 min)
  date.setMinutes(date.getMinutes() - 5);
  events.unshift({ time: format(date), description: 'Indo pra coleta', status: 'done' });
  
  // Rota aceita (mesmo horário)
  events.unshift({ time: format(date), description: 'Rota aceita', status: 'done' });

  return events as any[];
};

// Histórico Mockado Estendido
const EXTENDED_HISTORY: Transaction[] = [
  { 
    id: '1', type: 'Entrega #PL-9801', amount: 12.40, time: '14:20', date: 'Hoje', weekId: 'current', status: 'COMPLETED',
    details: { duration: '18 min', stops: 2, timeline: generateTimeline('14:20') }
  },
  { 
    id: '2', type: 'Entrega #PL-9788', amount: 18.20, time: '13:15', date: 'Hoje', weekId: 'current', status: 'COMPLETED',
    details: { duration: '25 min', stops: 2, timeline: generateTimeline('13:15') }
  },
  { 
    id: '3', type: 'Entrega #PL-9750', amount: 9.90, time: '12:05', date: 'Hoje', weekId: 'current', status: 'COMPLETED',
    details: { duration: '12 min', stops: 2, timeline: generateTimeline('12:05') }
  },
  { 
    id: '4', type: 'Bônus de Incentivo', amount: 5.00, time: '11:00', date: 'Hoje', weekId: 'current', status: 'COMPLETED',
    details: { duration: '-', stops: 0, timeline: [{ time: '11:00', description: 'Meta atingida', status: 'done' }] }
  },
  { 
    id: '5', type: 'Entrega #PL-8821', amount: 15.50, time: '19:30', date: 'Ontem', weekId: 'current', status: 'COMPLETED',
    details: { duration: '22 min', stops: 2, timeline: generateTimeline('19:30') }
  },
  // Semana passada
  { 
    id: '6', type: 'Entrega #PL-7740', amount: 22.00, time: '20:15', date: '18 Out', weekId: 'last', status: 'COMPLETED',
    details: { duration: '35 min', stops: 3, timeline: generateTimeline('20:15') }
  }
];

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('LOGIN');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Estados Globais
  const [status, setStatus] = useState<DriverStatus>(DriverStatus.OFFLINE);
  const [mission, setMission] = useState<DeliveryMission | null>(null);
  const [alertCountdown, setAlertCountdown] = useState(30);
  const [currentScreen, setCurrentScreen] = useState<Screen>('HOME');
  const [settingsView, setSettingsView] = useState<SettingsView>('MAIN');
  const [showPostDeliveryModal, setShowPostDeliveryModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isResumoExpanded, setIsResumoExpanded] = useState(false);
  const [mapCenterKey, setMapCenterKey] = useState(0);
  const [lastEarnings, setLastEarnings] = useState(0);
  const [showBalance, setShowBalance] = useState(true);
  
  // Estado Heatmap
  const [showHeatMap, setShowHeatMap] = useState(true);
  
  // Estado para Tabs da Wallet e Filtros
  const [walletTab, setWalletTab] = useState<'ENTRIES' | 'PAYOUTS'>('ENTRIES');
  const [activeWeekId, setActiveWeekId] = useState('current');
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Simulação de Pedido Pronto
  const [isOrderReady, setIsOrderReady] = useState(false);
  
  // Mission detail state
  const [showMissionMapPicker, setShowMissionMapPicker] = useState(false);

  // Validação de Código de Entrega (OTP) - 4 últimos dígitos do celular do cliente
  const [typedCode, setTypedCode] = useState('');
  const codeInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Anticipation state
  const [isAnticipating, setIsAnticipating] = useState(false);
  const [showSuccessAnticipation, setShowSuccessAnticipation] = useState(false);

  // Filtros e Preferências (NOVOS ESTADOS)
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [maxDistance, setMaxDistance] = useState(15); // Raio padrão 15km
  const [minPrice, setMinPrice] = useState(0);
  const [backHome, setBackHome] = useState(false);
  const [homeDestination, setHomeDestination] = useState('Centro - Itu');
  const [autoAccept, setAutoAccept] = useState(false);

  // Settings States
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '', relation: '', isBeneficiary: false });
  const [selectedVehicle, setSelectedVehicle] = useState<'moto' | 'car' | 'bike'>('moto');

  // GPS States
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Tema
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  // Configurações de Interface
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSoundId, setSelectedSoundId] = useState('beep');
  
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  // Estatísticas e Financeiro
  const [balance, setBalance] = useState(142.50);
  const [dailyEarnings, setDailyEarnings] = useState(0);
  const [dailyStats, setDailyStats] = useState({ accepted: 0, finished: 0, rejected: 0 });
  const [history, setHistory] = useState<Transaction[]>(EXTENDED_HISTORY);

  // Auth Inputs State
  const [loginCpf, setLoginCpf] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [recoveryMethod, setRecoveryMethod] = useState<'cpf' | 'email'>('cpf');
  const [recoveryInput, setRecoveryInput] = useState('');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = theme === 'dark' ? 'bg-[#121212] text-white' : 'bg-zinc-50 text-zinc-900';
  }, [theme]);

  // Check GPS on mount
  useEffect(() => {
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        setGpsEnabled(true);
      }
    }).catch(() => {
      // Browser might not support permission query, fallback to normal flow
    });
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleActivateGPS = () => {
    setIsGpsLoading(true);
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      setIsGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsEnabled(true);
        setIsGpsLoading(false);
        // Force map re-center
        setMapCenterKey(prev => prev + 1);
      },
      (error) => {
        console.error("Erro GPS:", error);
        setIsGpsLoading(false);
        setGpsEnabled(false);
        // User denied or error occurred
        if (error.code === error.PERMISSION_DENIED) {
           alert("Você precisa permitir o acesso à localização nas configurações do seu navegador/celular para trabalhar.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const toggleOnlineStatus = () => {
    if (status === DriverStatus.ONLINE) {
      setStatus(DriverStatus.OFFLINE);
      setMission(null);
    } else {
      // Trying to go ONLINE
      if (!gpsEnabled) {
        // Trigger GPS request automatically
        handleActivateGPS();
      } else {
        setStatus(DriverStatus.ONLINE);
        setMission(null);
      }
    }
  };
  
  const getStatusLabel = (status: DriverStatus) => {
    switch (status) {
      case DriverStatus.GOING_TO_STORE: return 'INDO PARA COLETA';
      case DriverStatus.ARRIVED_AT_STORE: return isOrderReady ? 'PEDIDO PRONTO' : 'AGUARDANDO PEDIDO';
      case DriverStatus.PICKING_UP: return 'SAÍDA DE BALCÃO';
      case DriverStatus.GOING_TO_CUSTOMER: return 'INDO PARA O CLIENTE';
      case DriverStatus.ARRIVED_AT_CUSTOMER: return 'LOCAL DE ENTREGA';
      default: return status.replace(/_/g, ' ');
    }
  };

  const handleSOSAction = (type: 'accident' | 'mechanical' | 'robbery' | 'support') => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    switch(type) {
      case 'accident':
        if(confirm("Deseja ligar para o SAMU (192)?")) window.location.href = 'tel:192';
        break;
      case 'robbery':
        if(confirm("Deseja ligar para a POLÍCIA (190)?")) window.location.href = 'tel:190';
        break;
      case 'mechanical':
        window.open('https://www.google.com/maps/search/oficina+mecanica+moto+perto+de+mim', '_blank');
        break;
      case 'support':
        window.open(`https://wa.me/5511999999999?text=Ajuda`, '_blank');
        break;
    }
    setShowSOSModal(false);
  };

  const openNavigation = (provider: 'waze' | 'google', forcedAddress?: string) => {
    if (!mission && !forcedAddress) return;
    const isGoingToStore = status === DriverStatus.GOING_TO_STORE || status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP;
    const address = forcedAddress || (isGoingToStore ? mission?.storeAddress : mission?.customerAddress);
    if (!address) return;
    const encodedAddress = encodeURIComponent(address);
    const url = provider === 'waze' 
      ? `https://waze.com/ul?q=${encodedAddress}&navigate=yes` 
      : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    window.open(url, '_blank');
    setShowMissionMapPicker(false);
  };

  useEffect(() => {
    const soundUrl = SOUND_OPTIONS.find(s => s.id === selectedSoundId)?.url || SOUND_OPTIONS[0].url;
    const audio = new Audio(soundUrl);
    // audio.crossOrigin = "anonymous"; // Removed potential cross-origin blocker for generic audio
    audio.loop = true; 
    alertAudioRef.current = audio;
  }, [selectedSoundId]);

  useEffect(() => {
    if (status === DriverStatus.ALERTING && soundEnabled && alertAudioRef.current) {
      // Ensure promise is handled
      const playPromise = alertAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.error("Erro áudio:", e);
        });
      }
      
      if (autoAccept) {
        setTimeout(() => setStatus(DriverStatus.GOING_TO_STORE), 1500);
      }
    } else if (alertAudioRef.current) {
      alertAudioRef.current.pause();
      alertAudioRef.current.currentTime = 0;
    }
  }, [status, soundEnabled, autoAccept]);

  // Timer para simular pedido ficando pronto
  useEffect(() => {
    let timer: any;
    if (status === DriverStatus.ARRIVED_AT_STORE) {
      setIsOrderReady(false);
      timer = setTimeout(() => {
        setIsOrderReady(true);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }, 10000); // 10 segundos
    } else {
      setIsOrderReady(false);
    }
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status === DriverStatus.ONLINE || status === DriverStatus.OFFLINE) {
      setShowMissionMapPicker(false);
      setTypedCode('');
    }
  }, [status]);

  // Gerador de Missões
  useEffect(() => {
    let timer: any;
    if (status === DriverStatus.ONLINE && !mission) {
      timer = setTimeout(() => {
        const store = MOCK_STORES[Math.floor(Math.random() * MOCK_STORES.length)];
        const customer = MOCK_CUSTOMERS[Math.floor(Math.random() * MOCK_CUSTOMERS.length)];
        
        const distToStore = parseFloat((Math.random() * 2 + 0.2).toFixed(1));
        const maxDeliveryDist = Math.max(1, maxDistance - distToStore);
        const delivDist = parseFloat((Math.random() * Math.min(8, maxDeliveryDist) + 1).toFixed(1));
        
        const totalDist = parseFloat((distToStore + delivDist).toFixed(1));
        const price = calculateEarnings(delivDist);

        if (price < minPrice) return;

        const dynamicMission: any = {
          id: `PL-${Math.floor(Math.random() * 9000) + 1000}`,
          storeName: store.name,
          storeAddress: store.address,
          customerName: customer.name,
          customerAddress: customer.address,
          customerPhoneSuffix: customer.phoneSuffix,
          items: store.items,
          collectionCode: store.collectionCode,
          distanceToStore: distToStore,
          deliveryDistance: delivDist,
          totalDistance: totalDist,
          earnings: price,
          timeLimit: 25
        };
        
        setMission(dynamicMission);
        setStatus(DriverStatus.ALERTING);
        setAlertCountdown(30);
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [status, mission, maxDistance, minPrice]); 

  useEffect(() => {
    let interval: any;
    if (status === DriverStatus.ALERTING && alertCountdown > 0) {
      interval = setInterval(() => setAlertCountdown(prev => prev - 1), 1000);
    } else if (alertCountdown === 0 && status === DriverStatus.ALERTING) {
      setDailyStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
      setStatus(DriverStatus.ONLINE);
      setMission(null);
    }
    return () => clearInterval(interval);
  }, [status, alertCountdown]);

  const handleFinishDelivery = () => {
    if (mission && isCollectionCodeValid) {
      const earned = mission.earnings;
      setBalance(prev => prev + earned);
      setDailyEarnings(prev => prev + earned);
      setLastEarnings(earned);
      setDailyStats(prev => ({ ...prev, finished: prev.finished + 1 }));
      setStatus(DriverStatus.ONLINE);
      setMission(null);
      setShowPostDeliveryModal(true);
      
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: `Entrega #${mission.id}`,
        amount: earned,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: 'Hoje',
        weekId: 'current',
        status: 'COMPLETED',
        details: {
          duration: '15 min',
          stops: 2,
          timeline: generateTimeline(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        }
      };
      setHistory(prev => [newTransaction, ...prev]);
    }
  };

  const handleAnticipateRequest = () => {
    if (balance <= ANTICIPATION_FEE) return;
    setIsAnticipating(true);
    setTimeout(() => {
      const amountToWithdraw = balance;
      const fee = ANTICIPATION_FEE;
      setBalance(0);
      setIsAnticipating(false);
      setShowSuccessAnticipation(true);
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'Antecipação de Ganhos',
        amount: -(amountToWithdraw),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: 'Hoje',
        weekId: 'current',
        status: 'COMPLETED'
      };
      const feeTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'Taxa de Antecipação',
        amount: -(fee),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: 'Hoje',
        weekId: 'current',
        status: 'COMPLETED'
      };
      setHistory(prev => [newTransaction, feeTransaction, ...prev]);
    }, 2000);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = typedCode.split('');
    newCode[index] = value;
    const combined = newCode.join('');
    setTypedCode(combined);
    if (value && index < 3) {
      codeInputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !typedCode[index] && index > 0) {
      codeInputRefs[index - 1].current?.focus();
    }
  };

  const isCollectionCodeValid = mission && typedCode === mission.customerPhoneSuffix;

  const cardBg = theme === 'dark' ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
  const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const innerBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';
  
  const isFilterActive = backHome || maxDistance < 30 || minPrice > 0;

  const handleMainAction = () => {
    if (status === DriverStatus.GOING_TO_STORE) setStatus(DriverStatus.ARRIVED_AT_STORE); 
    else if (status === DriverStatus.ARRIVED_AT_STORE) setStatus(DriverStatus.PICKING_UP);
    else if (status === DriverStatus.PICKING_UP) setStatus(DriverStatus.GOING_TO_CUSTOMER);
    else if (status === DriverStatus.GOING_TO_CUSTOMER) setStatus(DriverStatus.ARRIVED_AT_CUSTOMER); 
    else handleFinishDelivery(); 
  };

  // ---------------- AUTH HANDLERS ----------------
  const handleLogin = () => {
    if (!loginCpf || !loginPassword) {
      alert("Preencha CPF e Senha.");
      return;
    }
    setIsLoadingAuth(true);
    setTimeout(() => {
      setIsLoadingAuth(false);
      setIsAuthenticated(true);
    }, 1500);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAuth(true);
    setTimeout(() => {
      setIsLoadingAuth(false);
      alert("Cadastro realizado com sucesso! Faça login.");
      setAuthScreen('LOGIN');
    }, 1500);
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAuth(true);
    setTimeout(() => {
      setIsLoadingAuth(false);
      alert(`Link de recuperação enviado para: ${recoveryInput}`);
      setAuthScreen('LOGIN');
    }, 1500);
  };

  const renderAuthScreen = () => {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center p-6 overflow-hidden relative ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] bg-[#FF6B00] rounded-full blur-[120px]"></div>
           <div className="absolute top-[40%] -left-[20%] w-[60%] h-[60%] bg-[#FFD700] rounded-full blur-[100px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          <div className="mb-12 scale-125">
            <Logo size="lg" />
          </div>

          <div className={`w-full p-8 rounded-[40px] border shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom duration-500 ${cardBg}`}>
            {/* Login */}
            {authScreen === 'LOGIN' && (
              <div className="space-y-6">
                 <h2 className={`text-2xl font-black italic text-center ${textPrimary}`}>Bem-vindo de volta!</h2>
                 
                 <div className="space-y-4">
                    <div>
                       <label className={`text-[10px] font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>CPF</label>
                       <div className={`flex items-center px-4 h-14 rounded-2xl border transition-colors ${innerBg} border-white/5 focus-within:border-[#FF6B00]`}>
                          <i className={`fas fa-id-card mr-3 ${textMuted}`}></i>
                          <input 
                            type="text" 
                            placeholder="000.000.000-00"
                            value={loginCpf}
                            onChange={(e) => setLoginCpf(e.target.value)}
                            className={`w-full bg-transparent outline-none font-bold ${textPrimary} placeholder:text-zinc-600`}
                          />
                       </div>
                    </div>
                    <div>
                       <label className={`text-[10px] font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>Senha</label>
                       <div className={`flex items-center px-4 h-14 rounded-2xl border transition-colors ${innerBg} border-white/5 focus-within:border-[#FF6B00]`}>
                          <i className={`fas fa-lock mr-3 ${textMuted}`}></i>
                          <input 
                            type="password" 
                            placeholder="••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className={`w-full bg-transparent outline-none font-bold ${textPrimary} placeholder:text-zinc-600`}
                          />
                       </div>
                    </div>
                 </div>

                 <button 
                  onClick={handleLogin}
                  disabled={isLoadingAuth}
                  className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-transform flex items-center justify-center"
                 >
                    {isLoadingAuth ? <i className="fas fa-circle-notch fa-spin"></i> : "Entrar"}
                 </button>

                 <div className="flex flex-col items-center space-y-4 pt-2">
                    <button onClick={() => setAuthScreen('RECOVERY')} className={`text-xs font-bold ${textMuted} hover:text-[#FF6B00] transition-colors`}>Esqueci minha senha</button>
                    <div className={`w-full h-px ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}></div>
                    <button onClick={() => setAuthScreen('REGISTER')} className={`text-xs font-black uppercase tracking-wide ${textPrimary}`}>
                       Não tem conta? <span className="text-[#FF6B00]">Cadastre-se</span>
                    </button>
                 </div>
              </div>
            )}
            
            {/* Register */}
            {authScreen === 'REGISTER' && (
              <form onSubmit={handleRegister} className="space-y-5">
                 <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={() => setAuthScreen('LOGIN')} className={`w-8 h-8 rounded-full flex items-center justify-center ${innerBg} ${textMuted}`}>
                       <i className="fas fa-chevron-left"></i>
                    </button>
                    <h2 className={`text-xl font-black italic ${textPrimary}`}>Criar Conta</h2>
                    <div className="w-8"></div>
                 </div>
                 <div className="space-y-3 h-64 overflow-y-auto pr-2 custom-scrollbar">
                    <input type="text" placeholder="Nome Completo" className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold placeholder:text-zinc-600`} required />
                    <input type="text" placeholder="CPF" className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold placeholder:text-zinc-600`} required />
                    <input type="email" placeholder="E-mail" className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold placeholder:text-zinc-600`} required />
                    <input type="tel" placeholder="Celular" className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold placeholder:text-zinc-600`} required />
                    <input type="password" placeholder="Senha" className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold placeholder:text-zinc-600`} required />
                    <input type="password" placeholder="Confirmar Senha" className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold placeholder:text-zinc-600`} required />
                 </div>
                 <button type="submit" disabled={isLoadingAuth} className="w-full h-14 bg-[#FF6B00] rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-transform flex items-center justify-center">
                    {isLoadingAuth ? <i className="fas fa-circle-notch fa-spin"></i> : "Cadastrar"}
                 </button>
              </form>
            )}

            {/* Recovery */}
            {authScreen === 'RECOVERY' && (
              <form onSubmit={handleRecovery} className="space-y-6">
                 <div className="flex items-center justify-between mb-4">
                    <button type="button" onClick={() => setAuthScreen('LOGIN')} className={`w-8 h-8 rounded-full flex items-center justify-center ${innerBg} ${textMuted}`}>
                       <i className="fas fa-chevron-left"></i>
                    </button>
                    <h2 className={`text-xl font-black italic ${textPrimary}`}>Recuperar</h2>
                    <div className="w-8"></div>
                 </div>
                 <p className={`text-xs text-center leading-relaxed ${textMuted}`}>Informe seus dados para receber um link de redefinição de senha.</p>
                 <div className={`p-1 rounded-xl flex mb-4 ${innerBg}`}>
                    <button type="button" onClick={() => setRecoveryMethod('cpf')} className={`flex-1 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${recoveryMethod === 'cpf' ? 'bg-[#FF6B00] text-white shadow' : textMuted}`}>Via CPF</button>
                    <button type="button" onClick={() => setRecoveryMethod('email')} className={`flex-1 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${recoveryMethod === 'email' ? 'bg-[#FF6B00] text-white shadow' : textMuted}`}>Via E-mail</button>
                 </div>
                 <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ml-2 mb-1 block ${textMuted}`}>{recoveryMethod === 'cpf' ? 'Seu CPF' : 'Seu E-mail'}</label>
                    <input type={recoveryMethod === 'cpf' ? 'text' : 'email'} value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)} placeholder={recoveryMethod === 'cpf' ? '000.000.000-00' : 'exemplo@email.com'} className={`w-full h-14 rounded-2xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`} required />
                 </div>
                 <button type="submit" disabled={isLoadingAuth} className="w-full h-14 bg-[#FF6B00] rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-transform flex items-center justify-center">
                    {isLoadingAuth ? <i className="fas fa-circle-notch fa-spin"></i> : "Enviar Link"}
                 </button>
              </form>
            )}
          </div>
          
          <div className="mt-8 text-center opacity-40">
             <p className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Papaléguas Delivery © 2024</p>
          </div>
        </div>
      </div>
    );
  };

  const renderScreen = () => {
    switch(currentScreen) {
      case 'HOME':
        return (
          <div className="flex flex-col h-full relative overflow-hidden">
            <div className="flex-1 relative">
              <MapMock 
                key={mapCenterKey} 
                status={status} 
                theme={theme}
                showRoute={status !== DriverStatus.OFFLINE && status !== DriverStatus.ONLINE && status !== DriverStatus.ALERTING} 
                showHeatMap={showHeatMap}
              />
              
              <div className="absolute right-4 bottom-24 flex flex-col space-y-3 z-[1001]">
                {/* Botão de Filtros (Atualizado com mesmo estilo do GPS) */}
                <button 
                  onClick={() => setShowFiltersModal(true)} 
                  className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center text-[#FF6B00] border active:scale-90 transition-transform relative ${cardBg}`}
                >
                  <i className="fas fa-sliders text-lg"></i>
                  {isFilterActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-black"></div>}
                </button>

                {/* Botão de Toggle de Mapa de Calor (NOVO) */}
                <button 
                  onClick={() => setShowHeatMap(!showHeatMap)} 
                  className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center border active:scale-90 transition-transform ${cardBg} ${showHeatMap ? 'text-[#FF6B00]' : textMuted}`}
                >
                  <i className="fas fa-layer-group text-lg"></i>
                </button>

                <button onClick={() => setMapCenterKey(k => k + 1)} className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center text-[#FF6B00] border active:scale-90 transition-transform ${cardBg}`}>
                  <i className="fas fa-location-crosshairs text-lg"></i>
                </button>
                <button onClick={() => setShowSOSModal(true)} className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center text-red-500 border active:scale-90 transition-transform ${cardBg}`}>
                  <i className="fas fa-shield-heart text-lg"></i>
                </button>
              </div>
            </div>

            {status !== DriverStatus.ALERTING && !mission && (
              <div className={`absolute bottom-0 left-0 right-0 z-[1001] transition-all duration-500 transform ${isResumoExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-4.5rem)]'}`}>
                <div className={`p-6 pb-24 rounded-t-[40px] shadow-[0_-15px_40px_rgba(0,0,0,0.3)] border-t transition-colors duration-300 ${cardBg}`}>
                  <div onClick={() => setIsResumoExpanded(!isResumoExpanded)} className="w-full py-2 cursor-pointer mb-2"><div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto opacity-30"></div></div>
                  
                  <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <h3 className={`text-xl font-black ${textPrimary}`}>Seus Ganhos</h3>
                        <button onClick={() => setShowBalance(!showBalance)} className={`${textMuted} active:scale-90 transition-transform`}><i className={`fas ${showBalance ? 'fa-eye' : 'fa-eye-slash'}`}></i></button>
                    </div>
                    <button onClick={() => setCurrentScreen('WALLET')} className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] active:scale-95 transition-transform">Ver mais</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-5 rounded-[28px] border flex flex-col justify-center ${innerBg} border-transparent`}>
                      <p className={`${textMuted} text-[9px] font-black uppercase mb-1`}>Ganhos Hoje</p>
                      <p className={`text-2xl font-black ${textPrimary}`}>{showBalance ? `R$ ${dailyEarnings.toFixed(2)}` : 'R$ ••••'}</p>
                    </div>
                    <div className={`p-5 rounded-[28px] border flex flex-col space-y-2 ${innerBg} border-transparent`}>
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className={`${textMuted} text-[8px] font-black uppercase`}>Aceitas</span>
                        <span className={`font-black text-xs ${textPrimary}`}>{dailyStats.accepted}</span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className={`${textMuted} text-[8px] font-black uppercase`}>Finalizadas</span>
                        <span className={`font-black text-xs text-green-500`}>{dailyStats.finished}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`${textMuted} text-[8px] font-black uppercase`}>Recusadas</span>
                        <span className={`font-black text-xs text-red-500`}>{dailyStats.rejected}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {status === DriverStatus.ALERTING && mission && (
              <div className="absolute inset-0 bg-black/80 z-[2000] flex items-end p-6 backdrop-blur-md animate-in slide-in-from-bottom duration-500">
                <div className={`w-full rounded-[40px] p-8 border-t-8 border-[#FF6B00] shadow-2xl pulse-orange relative overflow-hidden transition-all duration-300 max-h-[90%] flex flex-col ${cardBg}`}>
                  <div className="absolute top-8 right-12 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full border-4 border-[#FF6B00] flex items-center justify-center shrink-0">
                      <span className={`text-xl font-black ${textPrimary}`}>{alertCountdown}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start mb-6 shrink-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h2 className={`text-4xl font-black italic ${textPrimary}`}>R$ {mission.earnings.toFixed(2)}</h2>
                        <div className="bg-[#FF6B00] text-white px-2 py-1 rounded-lg text-[10px] font-black italic">
                          {mission.totalDistance.toFixed(1)} KM TOTAL
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`${textMuted} font-black uppercase text-[10px] tracking-widest`}>Logística:</span>
                        <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {mission.distanceToStore.toFixed(1)}km até loja + {mission.deliveryDistance.toFixed(1)}km entrega
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4 mb-8">
                    <div className={`flex items-center space-x-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${innerBg}`}>
                        <i className="fas fa-store text-[#FF6B00]"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-zinc-500 leading-none mb-1">Coleta</span>
                        <span className="text-sm font-bold truncate">{mission.storeName}</span>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${innerBg}`}>
                        <i className="fas fa-location-dot text-[#FFD700]"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-zinc-500 leading-none mb-1">Entrega</span>
                        <span className="text-sm font-bold truncate">{mission.customerAddress}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-4 shrink-0">
                    <button onClick={() => { setDailyStats(prev => ({ ...prev, rejected: prev.rejected + 1 })); setStatus(DriverStatus.ONLINE); setMission(null); }} className={`flex-1 h-16 rounded-2xl font-bold uppercase text-xs ${innerBg} ${textMuted}`}>Recusar</button>
                    <button onClick={() => { setDailyStats(s => ({...s, accepted: s.accepted + 1})); setStatus(DriverStatus.GOING_TO_STORE); }} className="flex-[2] h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase text-xs shadow-xl active:scale-95 transition-transform">ACEITAR</button>
                  </div>
                </div>
              </div>
            )}

            {mission && status !== DriverStatus.ALERTING && (
               <div className="absolute bottom-0 left-0 right-0 z-[1001] flex">
                  <div className={`rounded-t-[40px] p-5 shadow-2xl border-t pb-24 transition-colors w-full flex flex-col overflow-hidden ${cardBg}`}>
                    
                    <div className="flex justify-between items-center mb-3 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter italic ${status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.ARRIVED_AT_CUSTOMER ? 'bg-[#FFD700] text-black' : 'bg-[#FF6B00] text-white'}`}>
                        {getStatusLabel(status)}
                      </span>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setShowMissionMapPicker(!showMissionMapPicker)} 
                          className={`px-3 h-9 rounded-xl flex items-center space-x-2 font-black text-[9px] uppercase transition-all active:scale-95 ${showMissionMapPicker ? 'bg-[#33CCFF] text-white' : `${innerBg} ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}`}
                        >
                          <i className="fas fa-location-arrow text-[10px]"></i>
                          <span>GPS</span>
                        </button>
                        <button onClick={() => handleSOSAction('support')} className={`w-9 h-9 rounded-xl flex items-center justify-center text-[#FF6B00] ${innerBg}`}><i className="fas fa-headset text-xs"></i></button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 mb-4 pr-1">
                      {showMissionMapPicker && (
                        <div className={`p-3 rounded-[20px] border border-white/5 flex justify-center space-x-8 ${innerBg}`}>
                          <button onClick={() => openNavigation('waze')} className="flex flex-col items-center space-y-1 active:scale-90 transition-transform">
                            <div className="w-11 h-11 rounded-xl bg-[#33CCFF]/10 flex items-center justify-center text-[#33CCFF]"><i className="fab fa-waze text-xl"></i></div>
                            <span className="text-[8px] font-black text-[#33CCFF] uppercase">Waze</span>
                          </button>
                          <button onClick={() => openNavigation('google')} className="flex flex-col items-center space-y-1 active:scale-90 transition-transform">
                            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500"><i className="fas fa-map-marked-alt text-xl"></i></div>
                            <span className="text-[8px] font-black text-green-500 uppercase">Maps</span>
                          </button>
                        </div>
                      )}

                      <div className="px-1">
                        <h3 className={`text-lg font-black leading-tight ${textPrimary}`}>
                          {status.includes('STORE') || status === DriverStatus.PICKING_UP ? mission.storeName : mission.customerName}
                        </h3>
                        <p className={`${textMuted} text-[11px] mt-0.5 leading-snug line-clamp-2`}>
                          {status.includes('STORE') || status === DriverStatus.PICKING_UP ? mission.storeAddress : mission.customerAddress}
                        </p>
                      </div>

                      {status === DriverStatus.ARRIVED_AT_STORE && (
                        <div className={`p-4 rounded-[24px] border border-dashed flex items-center space-x-4 transition-all duration-500 ${isOrderReady ? 'bg-[#FFD700]/10 border-[#FFD700]/40' : `${theme === 'dark' ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-100 border-zinc-300'}`}`}>
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isOrderReady ? 'bg-[#FFD700]/20' : 'bg-[#FF6B00]/10'}`}>
                              <i className={`fas ${isOrderReady ? 'fa-check-double text-[#FFD700] blink-soft' : 'fa-utensils text-[#FF6B00] animate-pulse'} text-xl`}></i>
                           </div>
                           <div className="flex-1">
                              <h4 className={`text-xs font-black uppercase italic ${textPrimary}`}>
                                {isOrderReady ? 'Retire no Balcão' : 'Aguarde o Lojista'}
                              </h4>
                              <p className={`${textMuted} text-[9px] font-bold uppercase tracking-widest mt-0.5`}>ID: {mission.id}</p>
                           </div>
                        </div>
                      )}

                      {status === DriverStatus.ARRIVED_AT_CUSTOMER && (
                        <div className={`p-5 rounded-[24px] border ${isCollectionCodeValid ? 'bg-green-500/10 border-green-500/40' : 'bg-white/5 border-white/5'}`}>
                          <p className={`text-[9px] font-black uppercase text-center mb-3 tracking-widest ${isCollectionCodeValid ? 'text-green-500' : 'text-zinc-400'}`}>
                            {isCollectionCodeValid ? 'CÓDIGO CONFIRMADO' : 'CÓDIGO (4 DÍGITOS DO CELULAR):'}
                          </p>
                          <div className="flex justify-center space-x-2">
                            {[0, 1, 2, 3].map(i => (
                              <input
                                key={i}
                                ref={codeInputRefs[i]}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={typedCode[i] || ''}
                                onChange={(e) => handleCodeChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                className={`w-11 h-14 rounded-xl text-center text-2xl font-black transition-all outline-none border-2 ${isCollectionCodeValid ? 'bg-green-500/20 border-green-500 text-green-500' : `${innerBg} border-white/10 text-white focus:border-[#FF6B00]`}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="shrink-0 w-full">
                      <ActionSlider 
                        onConfirm={handleMainAction}
                        label={
                          status === DriverStatus.GOING_TO_STORE ? 'Deslize p/ Chegar na Loja' : 
                          status === DriverStatus.ARRIVED_AT_STORE ? (isOrderReady ? 'Pedido Pronto / Iniciar Saída' : 'Aguardando Preparo...') : 
                          status === DriverStatus.PICKING_UP ? 'Confirmar Protocolo e Sair' :
                          status === DriverStatus.GOING_TO_CUSTOMER ? 'Deslize p/ Chegar no Cliente' : 
                          'Deslize p/ Finalizar Entrega'
                        }
                        disabled={status === DriverStatus.ARRIVED_AT_CUSTOMER && !isCollectionCodeValid}
                        color={status === DriverStatus.ARRIVED_AT_STORE || status === DriverStatus.PICKING_UP || status === DriverStatus.ARRIVED_AT_CUSTOMER ? '#FFD700' : '#FF6B00'}
                        icon={status === DriverStatus.ARRIVED_AT_CUSTOMER && isCollectionCodeValid ? 'fa-flag-checkered' : 'fa-chevron-right'}
                      />
                    </div>
                  </div>
               </div>
            )}
          </div>
        );
      case 'WALLET':
        const filteredHistory = history.filter(item => item.weekId === activeWeekId);
        const weeklyEarningsTotal = filteredHistory.reduce((acc, item) => acc + (item.amount > 0 ? item.amount : 0), 0) + (activeWeekId === 'current' ? dailyEarnings : 0);
        const activeWeekLabel = MOCK_WEEKS.find(w => w.id === activeWeekId)?.range || 'Semana Atual';

        return (
          <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
            <h1 className={`text-3xl font-black italic mb-8 ${textPrimary}`}>Meus Ganhos</h1>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-[28px] border flex flex-col justify-center ${cardBg}`}>
                <p className={`${textMuted} text-[9px] font-black uppercase mb-1 tracking-widest`}>Ganhos da Semana</p>
                <p className={`text-[10px] font-bold ${textMuted} mb-2`}>{activeWeekLabel}</p>
                <p className={`text-xl font-black ${textPrimary}`}>R$ {weeklyEarningsTotal.toFixed(2)}</p>
              </div>
              <div className={`p-4 rounded-[28px] border flex flex-col justify-center ${cardBg}`}>
                <p className={`${textMuted} text-[9px] font-black uppercase mb-1 tracking-widest`}>Ganhos de Hoje</p>
                <p className="text-[10px] font-bold opacity-0 mb-2">Hoje</p> 
                <p className={`text-xl font-black ${textPrimary}`}>R$ {dailyEarnings.toFixed(2)}</p>
              </div>
            </div>

            <div className={`rounded-[32px] p-8 border mb-8 ${cardBg} relative overflow-hidden`}>
              <div className="absolute -right-4 -top-4 opacity-10"><i className="fas fa-wallet text-8xl text-[#FF6B00]"></i></div>
              <p className={`${textMuted} font-bold uppercase text-[10px] tracking-widest mb-2 relative z-10`}>Saldo Disponível</p>
              <h2 className={`text-4xl font-black ${textPrimary} mb-6 relative z-10`}>R$ {balance.toFixed(2)}</h2>
              
              <button onClick={() => setCurrentScreen('WITHDRAWAL_REQUEST')} className="w-full h-14 bg-[#FF6B00] rounded-2xl text-white font-black text-xs uppercase italic tracking-widest shadow-lg shadow-orange-900/30 flex items-center justify-center space-x-2 active:scale-95 transition-transform relative z-10">
                  <i className="fas fa-hand-holding-dollar text-lg"></i>
                  <span>Antecipar Repasse</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                 <h3 className={`text-sm font-black uppercase tracking-[0.2em] italic ${textPrimary}`}>Extrato</h3>
              </div>
              
              <div className={`flex p-1 rounded-2xl mb-6 ${innerBg}`}>
                <button 
                  onClick={() => setWalletTab('ENTRIES')}
                  className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletTab === 'ENTRIES' ? 'bg-[#FF6B00] text-white shadow-lg' : `${textMuted}`}`}
                >
                  Lançamentos
                </button>
                <button 
                   onClick={() => setWalletTab('PAYOUTS')}
                   className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletTab === 'PAYOUTS' ? 'bg-[#FF6B00] text-white shadow-lg' : `${textMuted}`}`}
                >
                  Repasses
                </button>
              </div>

              <div className="space-y-4">
                {walletTab === 'ENTRIES' ? (
                  <>
                     <div className="flex items-center justify-between px-2 mb-2 relative">
                        <span className={`text-[10px] font-bold ${textMuted} uppercase`}>Resumo da Semana</span>
                        
                        <div className="relative z-20">
                          <button 
                            onClick={() => setShowWeekSelector(!showWeekSelector)}
                            className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all active:scale-95 ${showWeekSelector ? 'border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/10' : `${theme === 'dark' ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white'}`}`}
                          >
                             <i className="far fa-calendar text-xs"></i>
                             <span className={`text-[9px] font-black ${showWeekSelector ? 'text-[#FF6B00]' : textPrimary}`}>{activeWeekLabel}</span>
                             <i className={`fas fa-chevron-down text-[8px] transition-transform ${showWeekSelector ? 'rotate-180' : ''}`}></i>
                          </button>
                          
                          {showWeekSelector && (
                            <div className={`absolute right-0 top-full mt-2 w-48 rounded-2xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${cardBg}`}>
                              {MOCK_WEEKS.map(week => (
                                <button
                                  key={week.id}
                                  onClick={() => { setActiveWeekId(week.id); setShowWeekSelector(false); }}
                                  className={`w-full text-left px-4 py-3 text-[10px] font-bold border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${activeWeekId === week.id ? 'text-[#FF6B00]' : textPrimary}`}
                                >
                                  {week.range}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                     </div>

                     {filteredHistory.length === 0 ? (
                        <div className="py-8 text-center"><p className={`text-xs font-bold ${textMuted}`}>Nenhum lançamento nesta semana.</p></div>
                     ) : (
                        filteredHistory.map((item, index) => (
                          <div 
                            key={index} 
                            onClick={() => setSelectedTransaction(item)}
                            className={`p-4 rounded-[24px] border flex justify-between items-center transition-all active:scale-[0.98] cursor-pointer ${cardBg} hover:border-[#FF6B00]/30`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                <i className={`fas ${item.amount > 0 ? 'fa-arrow-down' : 'fa-arrow-up'} rotate-45`}></i>
                              </div>
                              <div>
                                <p className={`text-xs font-black ${textPrimary}`}>{item.type}</p>
                                <p className={`text-[9px] font-bold ${textMuted}`}>{item.date}, {item.time} • Concluído</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`font-black text-sm block ${item.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {item.amount > 0 ? '+' : ''} R$ {Math.abs(item.amount).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))
                     )}
                  </>
                ) : (
                  <>
                     <div className="flex items-center justify-between px-2">
                        <span className={`text-[10px] font-bold ${textMuted} uppercase`}>Histórico de Pagamentos</span>
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${theme === 'dark' ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
                           <i className="fas fa-filter text-xs text-[#FF6B00]"></i>
                           <span className={`text-[9px] font-black ${textPrimary}`}>Filtrar Data</span>
                        </div>
                     </div>
                     {weeklyPayouts.map((payout) => (
                        <div key={payout.id} className={`p-4 rounded-[24px] border flex justify-between items-center ${cardBg}`}>
                           <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[#FFD700]/10 text-[#FFD700]`}>
                                 <i className="fas fa-file-invoice-dollar"></i>
                              </div>
                              <div>
                                 <p className={`text-xs font-black ${textPrimary}`}>Repasse Semanal</p>
                                 <p className={`text-[9px] font-bold ${textMuted}`}>{payout.period}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className={`font-black text-sm ${textPrimary}`}>R$ {payout.amount.toFixed(2)}</p>
                              <span className="text-[8px] font-bold text-green-500 uppercase bg-green-500/10 px-1.5 py-0.5 rounded ml-auto inline-block">{payout.status}</span>
                           </div>
                        </div>
                     ))}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      case 'WITHDRAWAL_REQUEST': return (
        <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
            <div className="flex items-center space-x-4 mb-8">
              <button onClick={() => setCurrentScreen('WALLET')} className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cardBg}`}>
                <i className={`fas fa-chevron-left ${textPrimary}`}></i>
              </button>
              <h1 className={`text-2xl font-black italic ${textPrimary}`}>Antecipar Ganhos</h1>
            </div>
            <div className={`rounded-[32px] p-6 border mb-6 ${cardBg} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-4 opacity-10"><i className="fas fa-building-columns text-6xl text-[#FF6B00]"></i></div>
              <p className={`${textMuted} font-bold text-[9px] uppercase tracking-widest mb-3`}>Conta de Destino</p>
              <div className="flex items-center space-x-4 relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[#FF6B00] bg-[#FF6B00]/10`}>
                   <i className="fas fa-bank text-xl"></i>
                </div>
                <div>
                   <h3 className={`font-black text-lg ${textPrimary}`}>{USER_PROFILE.bank.name}</h3>
                   <p className={`${textMuted} font-bold text-[10px] uppercase`}>AG {USER_PROFILE.bank.agency} • CC {USER_PROFILE.bank.account}</p>
                </div>
                <div className="ml-auto">
                   <i className="fas fa-check-circle text-green-500 text-xl"></i>
                </div>
              </div>
            </div>

            <div className={`rounded-[32px] p-8 border mb-8 ${cardBg}`}>
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className={`${textMuted} font-bold text-xs uppercase tracking-widest`}>Saldo Disponível</span>
                  <span className={`text-xl font-black ${textPrimary}`}>R$ {balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className={`${textMuted} font-bold text-xs uppercase tracking-widest`}>Taxa de Antecipação</span>
                  <span className="text-red-500 font-black text-xl">- R$ {ANTICIPATION_FEE.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className={`${textPrimary} font-black text-sm uppercase tracking-widest`}>Você Recebe</span>
                  <span className="text-[#FFD700] font-black text-3xl italic">R$ {Math.max(0, balance - ANTICIPATION_FEE).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <button disabled={balance <= ANTICIPATION_FEE || isAnticipating} onClick={handleAnticipateRequest} className={`w-full h-20 rounded-[28px] font-black text-white uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3 transition-all ${balance <= ANTICIPATION_FEE ? 'bg-zinc-700 opacity-50' : 'bg-[#FF6B00] active:scale-95'}`}>
              {isAnticipating ? <><i className="fas fa-circle-notch animate-spin"></i><span>Processando...</span></> : <><i className="fas fa-bolt"></i><span>Confirmar Antecipação</span></>}
            </button>
        </div>
      );
      case 'ORDERS': return (
        <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
            <h1 className={`text-2xl font-black italic mb-2 ${textPrimary}`}>Como podemos te ajudar?</h1>
            <div className="relative mb-8 mt-4">
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`}>
                <i className="fas fa-search"></i>
              </div>
              <input 
                type="text" 
                placeholder="digite sua dúvida" 
                className={`w-full h-14 pl-12 pr-4 rounded-2xl border outline-none font-bold text-sm transition-all ${cardBg} ${textPrimary} placeholder:font-normal placeholder:text-zinc-500 focus:border-[#FF6B00]`}
              />
            </div>

            <div className="mb-8">
              <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Perguntas Frequentes</h3>
              <div className="space-y-3">
                {["Estou disponível e não recebo pedidos", "Quero alterar meu modal de entrega", "Não recebi o repasse"].map((item, index) => (
                  <button key={index} className={`w-full p-4 rounded-2xl border flex justify-between items-center active:scale-[0.98] transition-all ${cardBg}`}>
                     <span className={`text-xs font-bold ${textPrimary}`}>{item}</span>
                     <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                  </button>
                ))}
              </div>
            </div>

            {/* Outros Assuntos */}
            <div>
              <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Outros Assuntos</h3>
              <div className="space-y-3">
                {[
                  { label: "Fazendo entregas", icon: "fa-motorcycle" },
                  { label: "Cadastro", icon: "fa-id-card" },
                  { label: "Repasse", icon: "fa-hand-holding-dollar" },
                  { label: "Outros", icon: "fa-ellipsis" }
                ].map((item, index) => (
                  <button key={index} className={`w-full p-4 rounded-2xl border flex items-center space-x-4 active:scale-[0.98] transition-all ${cardBg}`}>
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${innerBg} text-[#FF6B00]`}>
                        <i className={`fas ${item.icon}`}></i>
                     </div>
                     <span className={`text-xs font-bold flex-1 text-left ${textPrimary}`}>{item.label}</span>
                     <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                  </button>
                ))}
              </div>
            </div>
        </div>
      );
      case 'SETTINGS': 
        if (settingsView === 'MAIN') {
          return (
            <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
                <h1 className={`text-3xl font-black italic mb-8 ${textPrimary}`}>Ajustes</h1>
                <div className={`flex items-center space-x-4 mb-10 p-6 rounded-[32px] border ${cardBg}`}>
                  <div className="w-16 h-16 rounded-3xl p-1 border-2 border-[#FF6B00]">
                    <img src={USER_PROFILE.avatar} className="w-full h-full object-cover rounded-2xl" alt="Perfil" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-black ${textPrimary}`}>{USER_PROFILE.name}</h2>
                    <p className={`${textMuted} text-xs font-bold uppercase tracking-widest`}>Nível: {USER_PROFILE.level}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <section>
                    <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Sua Conta</h3>
                    <div className="space-y-3">
                      <button onClick={() => setSettingsView('PERSONAL')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                        <div className="flex items-center space-x-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-user"></i></div>
                           <span className={`text-sm font-bold ${textPrimary}`}>Dados Pessoais</span>
                        </div>
                        <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                      </button>
                      <button onClick={() => setSettingsView('DOCUMENTS')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                        <div className="flex items-center space-x-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-id-card"></i></div>
                           <span className={`text-sm font-bold ${textPrimary}`}>Documentos</span>
                        </div>
                        <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                      </button>
                      <button onClick={() => setSettingsView('BANK')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                        <div className="flex items-center space-x-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-building-columns"></i></div>
                           <span className={`text-sm font-bold ${textPrimary}`}>Dados Bancários</span>
                        </div>
                        <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                      </button>
                      <button onClick={() => setSettingsView('EMERGENCY')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                        <div className="flex items-center space-x-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-red-500`}><i className="fas fa-heart-pulse"></i></div>
                           <span className={`text-sm font-bold ${textPrimary}`}>Contato de Emergência</span>
                        </div>
                        <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                      </button>
                    </div>
                  </section>

                  <section>
                    <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Dados da entrega</h3>
                     <button onClick={() => setSettingsView('DELIVERY')} className={`w-full p-4 rounded-[24px] border flex justify-between items-center active:scale-[0.98] transition-all ${theme === 'dark' ? cardBg : 'bg-zinc-200 border-zinc-300'}`}>
                        <div className="flex items-center space-x-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-motorcycle"></i></div>
                           <div>
                              <p className={`text-sm font-bold ${textPrimary}`}>Veículo e Região</p>
                              <p className={`text-[9px] font-bold uppercase ${textMuted} mt-0.5`}>{selectedVehicle} • {USER_EXTENDED.region}</p>
                           </div>
                        </div>
                        <i className={`fas fa-chevron-right text-xs ${textMuted}`}></i>
                      </button>
                  </section>

                   <section>
                    <h3 className={`${textMuted} font-black uppercase text-[10px] tracking-[0.2em] mb-4`}>Aparência</h3>
                    <div className={`rounded-[32px] p-2 border ${theme === 'dark' ? cardBg : 'bg-orange-50 border-orange-200'}`}>
                      <div onClick={toggleTheme} className="p-4 flex items-center justify-between cursor-pointer">
                        <div className={`flex items-center space-x-3 font-bold text-sm ${textPrimary}`}>
                          <i className={`fas ${theme === 'dark' ? 'fa-moon text-[#33CCFF]' : 'fa-sun text-[#FFD700]'}`}></i>
                          <span>Modo {theme === 'dark' ? 'Escuro' : 'Claro'}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                  
                  <button onClick={() => { setIsAuthenticated(false); setAuthScreen('LOGIN'); }} className="w-full h-14 rounded-2xl border border-red-500/30 text-red-500 font-black uppercase tracking-widest flex items-center justify-center hover:bg-red-500/10 transition-colors mt-4">
                    Sair da Conta
                 </button>
                </div>
            </div>
          );
        } else {
          // Sub-telas (Personal, Documents, etc.) - Mantido
          return (
            <div className={`h-full w-full p-6 overflow-y-auto pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
              <div className="flex items-center space-x-4 mb-8">
                <button onClick={() => setSettingsView('MAIN')} className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cardBg}`}>
                  <i className={`fas fa-chevron-left ${textPrimary}`}></i>
                </button>
                <h1 className={`text-2xl font-black italic ${textPrimary}`}>
                  {settingsView === 'PERSONAL' && 'Dados Pessoais'}
                  {settingsView === 'DOCUMENTS' && 'Documentos'}
                  {settingsView === 'BANK' && 'Dados Bancários'}
                  {settingsView === 'EMERGENCY' && 'Emergência'}
                  {settingsView === 'DELIVERY' && 'Dados da Entrega'}
                </h1>
              </div>

              {settingsView === 'PERSONAL' && (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  {[
                    { label: 'Nome Completo', value: USER_PROFILE.name },
                    { label: 'CPF', value: USER_EXTENDED.cpf },
                    { label: 'Telefone', value: USER_EXTENDED.phone },
                    { label: 'E-mail', value: USER_EXTENDED.email },
                    { label: 'Região', value: USER_EXTENDED.region },
                    { label: 'Gênero', value: USER_EXTENDED.gender },
                    { label: 'Escolaridade', value: USER_EXTENDED.education },
                  ].map((item, i) => (
                    <div key={i} className={`p-4 rounded-[24px] border ${cardBg}`}>
                      <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest mb-1`}>{item.label}</p>
                      <p className={`text-sm font-bold ${textPrimary}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {settingsView === 'DOCUMENTS' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                   <div className={`p-6 rounded-[32px] border ${cardBg}`}>
                      <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                        <span className={`${textMuted} font-black uppercase text-[10px] tracking-widest`}>Seu documento atual</span>
                        <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">Ativo</div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                         <div>
                            <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest mb-1`}>Documento</p>
                            <p className={`text-xl font-black ${textPrimary}`}>CNH</p>
                         </div>
                         <div>
                            <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest mb-1`}>Categoria</p>
                            <p className={`text-xl font-black ${textPrimary}`}>{USER_EXTENDED.cnh.category}</p>
                         </div>
                         <div className="col-span-2">
                            <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest mb-1`}>Data de Validade</p>
                            <p className={`text-xl font-black ${textPrimary}`}>{USER_EXTENDED.cnh.expiry}</p>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {settingsView === 'BANK' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                   <div className={`rounded-[32px] p-6 border ${cardBg}`}>
                      <p className={`${textMuted} font-black uppercase text-[10px] tracking-widest mb-4 border-b border-white/5 pb-2`}>Seus dados Bancários</p>
                      <div className="flex items-center space-x-4 mb-6">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${innerBg} text-[#FF6B00]`}><i className="fas fa-bank"></i></div>
                         <div>
                            <p className={`text-lg font-black ${textPrimary}`}>{USER_PROFILE.bank.name}</p>
                            <p className={`text-[10px] font-bold ${textMuted}`}>{USER_PROFILE.bank.type}</p>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest`}>Agência</p>
                          <p className={`text-sm font-bold ${textPrimary}`}>{USER_PROFILE.bank.agency}</p>
                        </div>
                        <div>
                          <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest`}>Conta</p>
                          <p className={`text-sm font-bold ${textPrimary}`}>{USER_PROFILE.bank.account}</p>
                        </div>
                         <div className="col-span-2">
                          <p className={`${textMuted} text-[9px] font-black uppercase tracking-widest`}>Chave PIX</p>
                          <p className={`text-sm font-bold ${textPrimary}`}>{USER_PROFILE.bank.pixKey}</p>
                        </div>
                      </div>
                   </div>
                   <button className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl active:scale-95 transition-transform">
                      Alterar Dados Bancários
                   </button>
                </div>
              )}

              {settingsView === 'EMERGENCY' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                   <div className={`p-6 rounded-[32px] border ${cardBg}`}>
                      <p className={`${textMuted} text-[10px] font-bold leading-relaxed mb-6`}>Avisaremos essa pessoa caso você precise de ajuda com algum imprevisto durante suas rotas.</p>
                      
                      <div className="space-y-4">
                         <div>
                            <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-2`}>Nome</label>
                            <input 
                              type="text" 
                              value={emergencyContact.name}
                              onChange={e => setEmergencyContact({...emergencyContact, name: e.target.value})}
                              placeholder="Nome do contato"
                              className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold`}
                            />
                         </div>
                         <div>
                            <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-2`}>Telefone</label>
                            <input 
                              type="tel" 
                              value={emergencyContact.phone}
                              onChange={e => setEmergencyContact({...emergencyContact, phone: e.target.value})}
                              placeholder="(00) 00000-0000"
                              className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold`}
                            />
                         </div>
                         <div>
                            <label className={`${textMuted} text-[9px] font-black uppercase tracking-widest block mb-2`}>Grau de Parentesco</label>
                            <input 
                              type="text" 
                              value={emergencyContact.relation}
                              onChange={e => setEmergencyContact({...emergencyContact, relation: e.target.value})}
                              placeholder="Ex: Mãe, Irmão, Cônjuge"
                              className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] text-sm font-bold`}
                            />
                         </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/5 flex items-center space-x-3 cursor-pointer" onClick={() => setEmergencyContact({...emergencyContact, isBeneficiary: !emergencyContact.isBeneficiary})}>
                         <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${emergencyContact.isBeneficiary ? 'bg-[#FF6B00] border-[#FF6B00]' : 'border-zinc-500'}`}>
                            {emergencyContact.isBeneficiary && <i className="fas fa-check text-white text-xs"></i>}
                         </div>
                         <span className={`text-xs font-bold ${textPrimary}`}>Definir como Beneficiário do Seguro</span>
                      </div>
                   </div>
                   <button onClick={() => setSettingsView('MAIN')} className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl active:scale-95 transition-transform">
                      Confirmar Informações
                   </button>
                </div>
              )}

              {settingsView === 'DELIVERY' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                   <div className={`p-6 rounded-[32px] border ${cardBg}`}>
                      <p className={`${textMuted} font-black uppercase text-[10px] tracking-widest mb-6`}>Veículo Utilizado</p>
                      <div className="grid grid-cols-3 gap-3">
                         {[
                            { id: 'car', icon: 'fa-car', label: 'Carro' },
                            { id: 'moto', icon: 'fa-motorcycle', label: 'Moto' },
                            { id: 'bike', icon: 'fa-bicycle', label: 'Bike' }
                         ].map((v) => (
                           <button 
                              key={v.id}
                              onClick={() => setSelectedVehicle(v.id as any)}
                              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95 ${selectedVehicle === v.id ? 'border-[#FF6B00] bg-[#FF6B00]/10' : `border-transparent ${innerBg}`}`}
                           >
                              <i className={`fas ${v.icon} text-2xl mb-2 ${selectedVehicle === v.id ? 'text-[#FF6B00]' : textMuted}`}></i>
                              <span className={`text-[10px] font-black uppercase ${selectedVehicle === v.id ? 'text-[#FF6B00]' : textMuted}`}>{v.label}</span>
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className={`p-6 rounded-[32px] border ${cardBg}`}>
                      <p className={`${textMuted} font-black uppercase text-[10px] tracking-widest mb-4`}>Região de Atuação</p>
                      <div className={`flex items-center justify-between p-4 rounded-xl border border-white/5 ${innerBg}`}>
                         <span className={`text-sm font-bold ${textPrimary}`}>{USER_EXTENDED.region}</span>
                         <span className="text-[10px] font-black text-[#FF6B00] uppercase">Alterar</span>
                      </div>
                   </div>

                   <button onClick={() => setSettingsView('MAIN')} className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl active:scale-95 transition-transform">
                      Salvar Alterações
                   </button>
                </div>
              )}
            </div>
          );
        }
      default: return null;
    }
  };

  // Main App Render
  if (!isAuthenticated) {
    return renderAuthScreen();
  }

  return (
    <div className={`h-screen w-screen flex flex-col relative overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      <header className={`z-[1002] flex flex-col items-center justify-between backdrop-blur-2xl border-b transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950/80 border-white/5' : 'bg-white/80 border-zinc-200'}`}>
        {/* Top Row */}
        <div className="w-full px-6 py-4 flex items-center justify-between relative h-20">
            
            {/* Left: Avatar */}
            <div className="flex items-center justify-center">
                 <div className="w-10 h-10 rounded-full p-0.5 border-2 border-[#FF6B00] shadow-lg shadow-orange-900/20">
                    <img src={USER_PROFILE.avatar} alt="Perfil" className="w-full h-full rounded-full object-cover" />
                 </div>
            </div>

            {/* Center: Status Button (Absolute) */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <button onClick={toggleOnlineStatus} className={`h-10 px-6 rounded-full flex items-center space-x-3 transition-all duration-500 shadow-xl ${status === DriverStatus.ONLINE ? 'bg-green-500 ring-4 ring-green-500/20' : innerBg}`}>
                    <div className={`w-2 h-2 rounded-full ${status === DriverStatus.ONLINE ? 'bg-white animate-pulse' : theme === 'dark' ? 'bg-zinc-500' : 'bg-zinc-400'}`}></div>
                    <span className={`font-black text-[10px] uppercase tracking-widest ${status === DriverStatus.ONLINE ? 'text-white' : textMuted}`}>{status === DriverStatus.ONLINE ? 'Disponível' : 'Indisponível'}</span>
                </button>
            </div>

            {/* Right: Notification Bell */}
            <button className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${cardBg} border shadow-lg`}>
                <div className="relative">
                    <i className={`fas fa-bell text-lg ${textPrimary}`}></i>
                    <div className="absolute -top-1 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></div>
                </div>
            </button>
        </div>

        {/* Bottom Row: GPS Warning */}
        <div className="w-full px-6 pb-4 flex justify-center">
             {!gpsEnabled && (
                <button 
                  onClick={handleActivateGPS}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl border active:scale-95 transition-all w-full justify-center ${theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200 shadow-sm'}`}
                >
                  {isGpsLoading ? (
                    <i className="fas fa-circle-notch fa-spin text-red-500 text-[10px]"></i>
                  ) : (
                    <i className="fas fa-satellite-dish text-red-500 text-[10px] animate-pulse"></i>
                  )}
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                      {isGpsLoading ? 'Ativando localização...' : 'Ative a localização por GPS p/ evitar restrições'}
                  </span>
                </button>
             )}
        </div>
      </header>
      <main className="flex-1 relative overflow-hidden">{renderScreen()}</main>
      <nav className={`h-24 border-t flex items-center justify-around z-[1002] safe-area-bottom transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 border-white/5' : 'bg-white border-zinc-200'}`}>
        <button onClick={() => setCurrentScreen('HOME')} className={`flex flex-col items-center space-y-1 w-1/4 relative ${currentScreen === 'HOME' ? 'text-[#FF6B00]' : textMuted}`}><div className={`w-10 h-1 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all ${currentScreen === 'HOME' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div><i className="fas fa-compass text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Mapa</span></button>
        <button onClick={() => setCurrentScreen('WALLET')} className={`flex flex-col items-center space-y-1 w-1/4 relative ${currentScreen === 'WALLET' ? 'text-[#FF6B00]' : textMuted}`}><div className={`w-10 h-1 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all ${currentScreen === 'WALLET' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div><i className="fas fa-wallet text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Ganhos</span></button>
        <button onClick={() => setCurrentScreen('ORDERS')} className={`flex flex-col items-center space-y-1 w-1/4 relative ${currentScreen === 'ORDERS' ? 'text-[#FF6B00]' : textMuted}`}><div className={`w-10 h-1 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all ${currentScreen === 'ORDERS' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div><i className="fas fa-circle-question text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Ajuda</span></button>
        <button onClick={() => setCurrentScreen('SETTINGS')} className={`flex flex-col items-center space-y-1 w-1/4 relative ${currentScreen === 'SETTINGS' ? 'text-[#FF6B00]' : textMuted}`}><div className={`w-10 h-1 bg-[#FF6B00] absolute -top-10 rounded-b-full transition-all ${currentScreen === 'SETTINGS' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div><i className="fas fa-user-gear text-xl"></i><span className="text-[8px] font-black uppercase tracking-widest">Perfil</span></button>
      </nav>

      {/* MODALS GERAIS (SOS, FILTROS, SUCESSO) */}
      {/* ... Manter os modais existentes ... */}
      {showPostDeliveryModal && (
        <div className="absolute inset-0 z-[6000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
           <div className="w-full max-w-xs text-center animate-in zoom-in duration-300">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-900/40"><i className="fas fa-check text-4xl text-white"></i></div>
              <h2 className="text-3xl font-black italic mb-2 text-white">MUITO BEM!</h2>
              <p className="text-zinc-400 font-bold mb-8 uppercase text-xs tracking-widest">Entrega concluída com sucesso</p>
              <div className="bg-zinc-900 p-6 rounded-[32px] border border-white/5 mb-10"><p className="text-zinc-500 font-black text-[10px] uppercase mb-1">Você ganhou</p><p className="text-4xl font-black text-white italic">R$ {lastEarnings.toFixed(2)}</p></div>
              <button onClick={() => setShowPostDeliveryModal(false)} className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl">Continuar</button>
           </div>
        </div>
      )}
      {showSuccessAnticipation && (
        <div className="absolute inset-0 z-[6000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8">
           <div className="w-full max-w-xs text-center animate-in zoom-in duration-300">
              <div className="w-24 h-24 bg-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-yellow-900/40"><i className="fas fa-bolt text-4xl text-black"></i></div>
              <h2 className="text-3xl font-black italic mb-2 text-white">PIX ENVIADO!</h2>
              <p className="text-zinc-400 font-bold mb-8 uppercase text-xs tracking-widest text-center">O dinheiro chegará na sua conta em alguns minutos.</p>
              <button onClick={() => { setShowSuccessAnticipation(false); setCurrentScreen('WALLET'); }} className="w-full h-16 bg-[#FF6B00] rounded-2xl font-black text-white uppercase italic tracking-widest shadow-xl">Concluir</button>
           </div>
        </div>
      )}
      
      {showFiltersModal && (
        <div className="absolute inset-0 bg-black/80 z-[6000] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-500 pb-12 ${cardBg}`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className={`text-2xl font-black italic ${textPrimary}`}>Filtros de Rota</h2>
              <button onClick={() => setShowFiltersModal(false)} className={`w-10 h-10 rounded-full flex items-center justify-center ${innerBg} ${textMuted}`}>
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            {/* ... Conteúdo dos filtros mantido ... */}
            <div className="space-y-6">
              <div className={`p-5 rounded-[28px] border border-white/5 ${backHome ? 'bg-[#33CCFF]/10 border-[#33CCFF]/30' : innerBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${backHome ? 'bg-[#33CCFF] text-white' : 'bg-zinc-700/50 text-zinc-500'}`}>
                      <i className="fas fa-house-user"></i>
                    </div>
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>Voltar p/ Casa</h3>
                      <p className={`text-[9px] font-bold ${textMuted}`}>Priorizar destino final</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={backHome} onChange={(e) => setBackHome(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#33CCFF]"></div>
                  </label>
                </div>
                {backHome && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                    <input 
                      type="text" 
                      value={homeDestination}
                      onChange={(e) => setHomeDestination(e.target.value)}
                      placeholder="Digite seu endereço..."
                      className={`w-full h-12 rounded-xl px-4 text-xs font-bold outline-none border focus:border-[#33CCFF] ${theme === 'dark' ? 'bg-black text-white border-zinc-700' : 'bg-white text-black border-zinc-200'}`}
                    />
                  </div>
                )}
              </div>
              <div className={`p-5 rounded-[28px] border border-white/5 ${innerBg}`}>
                <div className="flex justify-between items-center mb-4">
                   <h3 className={`text-xs font-black uppercase tracking-widest ${textMuted}`}>Raio de Entrega</h3>
                   <span className={`text-[#FF6B00] font-black text-lg`}>{maxDistance} km</span>
                </div>
                <input type="range" min="1" max="50" value={maxDistance} onChange={(e) => setMaxDistance(parseInt(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]" />
              </div>
               <div className={`p-5 rounded-[28px] border border-white/5 ${innerBg}`}>
                <div className="flex justify-between items-center mb-4">
                   <h3 className={`text-xs font-black uppercase tracking-widest ${textMuted}`}>Valor Mínimo</h3>
                   <span className={`text-green-500 font-black text-lg`}>R$ {minPrice.toFixed(0)}</span>
                </div>
                <input type="range" min="0" max="30" step="5" value={minPrice} onChange={(e) => setMinPrice(parseInt(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
              </div>
            </div>
            <button onClick={() => setShowFiltersModal(false)} className="w-full h-16 mt-8 bg-[#FF6B00] rounded-2xl font-black text-white uppercase tracking-widest shadow-xl active:scale-95 transition-transform">
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}

      {/* NOVO: Modal de Detalhes da Entrega */}
      {selectedTransaction && selectedTransaction.details && (
        <div className="absolute inset-0 z-[7000] bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
           <div className={`w-full max-w-md h-[90%] sm:h-auto rounded-t-[40px] sm:rounded-[40px] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 border-t border-white/10 shadow-2xl ${cardBg}`}>
              
              {/* Header */}
              <div className="p-8 pb-4 flex justify-between items-start shrink-0">
                <div>
                   <h2 className={`text-3xl font-black italic tracking-tighter ${textPrimary}`}>Detalhes</h2>
                   <p className={`${textMuted} font-bold text-xs uppercase tracking-widest`}>{selectedTransaction.type}</p>
                </div>
                <button 
                  onClick={() => setSelectedTransaction(null)} 
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${innerBg} ${textMuted} active:scale-90 transition-transform`}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Scroll Content */}
              <div className="flex-1 overflow-y-auto p-8 pt-0">
                
                {/* Resumo Financeiro e Data */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className={`text-4xl font-black text-green-500 italic tracking-tighter`}>+ R$ {selectedTransaction.amount.toFixed(2)}</p>
                    <p className={`${textMuted} text-[10px] font-bold uppercase tracking-widest mt-1`}>
                      {selectedTransaction.date}, {selectedTransaction.time}
                    </p>
                  </div>
                </div>

                {/* Cards de Resumo da Rota */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className={`p-4 rounded-[24px] border border-white/5 ${innerBg} flex flex-col items-center justify-center space-y-1`}>
                     <i className="far fa-clock text-[#FF6B00] mb-1"></i>
                     <span className={`text-xl font-black ${textPrimary}`}>{selectedTransaction.details.duration}</span>
                     <span className={`text-[8px] font-black uppercase tracking-widest ${textMuted}`}>Em Rota</span>
                  </div>
                  <div className={`p-4 rounded-[24px] border border-white/5 ${innerBg} flex flex-col items-center justify-center space-y-1`}>
                     <i className="fas fa-map-marker-alt text-[#FFD700] mb-1"></i>
                     <span className={`text-xl font-black ${textPrimary}`}>{selectedTransaction.details.stops}</span>
                     <span className={`text-[8px] font-black uppercase tracking-widest ${textMuted}`}>Paradas</span>
                  </div>
                </div>

                {/* Timeline Passo a Passo */}
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-[0.2em] italic mb-6 ${textPrimary}`}>Histórico da Rota</h3>
                  <div className="relative pl-4 space-y-8 border-l-2 border-dashed border-zinc-700 ml-2">
                    {selectedTransaction.details.timeline.map((event, i) => (
                      <div key={i} className="relative pl-6">
                        {/* Dot */}
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-[#1E1E1E] ${i === 0 ? 'bg-green-500' : 'bg-zinc-600'}`}></div>
                        
                        <div className="flex flex-col">
                           <span className={`text-xs font-black ${textPrimary}`}>{event.description}</span>
                           <span className={`text-[10px] font-bold ${textMuted}`}>{event.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Footer Button */}
              <div className={`p-6 border-t border-white/5 ${innerBg}`}>
                 <button onClick={() => setSelectedTransaction(null)} className="w-full h-14 bg-[#FF6B00] rounded-2xl font-black text-white uppercase text-xs tracking-widest shadow-xl">Fechar Detalhes</button>
              </div>

           </div>
        </div>
      )}

    </div>
  );
};

export default App;
