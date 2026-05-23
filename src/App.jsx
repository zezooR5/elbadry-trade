import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3, 
  Settings as SettingsIcon,
  Search,
  Sparkles,
  HelpCircle,
  Menu,
  Building,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useDb } from './context/DbContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Purchases from './components/Purchases';
import Contacts from './components/Contacts';
import Accounting from './components/Accounting';
import Reports from './components/Reports';
import Settings from './components/Settings';

function App() {
  const { 
    db, 
    currentBranch, 
    currentUser, 
    settings, 
    notifications,
    branches,
    changeBranch 
  } = useDb();

  // Navigation tab
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Sidebar expanded/collapsed state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Notification panel visible state
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Synchronize Theme with HTML Document elements
  useEffect(() => {
    const savedTheme = localStorage.getItem('elbadry_trade_theme');
    const preferDark = savedTheme === null ? true : savedTheme === 'dark';
    setDarkMode(preferDark);
    if (preferDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextTheme = !darkMode;
    setDarkMode(nextTheme);
    localStorage.setItem('elbadry_trade_theme', nextTheme ? 'dark' : 'light');
    if (nextTheme) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  };

  // Role-based redirect safety logic
  useEffect(() => {
    const menuPermissions = {
      'Admin': ['dashboard', 'pos', 'inventory', 'purchases', 'contacts', 'accounting', 'reports', 'settings'],
      'Cashier': ['dashboard', 'pos'],
      'Accountant': ['dashboard', 'inventory', 'purchases', 'contacts', 'accounting', 'reports']
    };

    const allowed = menuPermissions[currentUser?.role] || ['dashboard'];
    if (currentUser && !allowed.includes(activeTab)) {
      setActiveTab(allowed[0]);
    }
  }, [currentUser?.role]);

  // Handle clicking on header notification items
  const handleNotificationClick = (productId) => {
    setActiveTab('inventory');
    setShowNotificationPanel(false);
  };

  // Screen/View router matching activeTab state
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} darkMode={darkMode} />;
      case 'pos':
        return <POS darkMode={darkMode} />;
      case 'inventory':
        return <Inventory darkMode={darkMode} />;
      case 'purchases':
        return <Purchases darkMode={darkMode} />;
      case 'contacts':
        return <Contacts darkMode={darkMode} />;
      case 'accounting':
        return <Accounting darkMode={darkMode} />;
      case 'reports':
        return <Reports darkMode={darkMode} />;
      case 'settings':
        return <Settings darkMode={darkMode} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} darkMode={darkMode} />;
    }
  };

  return (
    <div 
      className={`min-h-screen font-cairo text-right flex transition-colors duration-300 rtl
        ${darkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'}`}
      dir="rtl"
    >
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        darkMode={darkMode} 
        toggleDarkMode={toggleDarkMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 
          ${sidebarOpen ? 'pr-64' : 'pr-20'} print:pr-0`}
      >
        {/* Header Navigation Bar */}
        <header 
          className={`h-16 flex items-center justify-between px-6 border-b z-20 no-print sticky top-0 backdrop-blur-md glass
            ${darkMode ? 'border-slate-800/80 bg-[#0f1626]/85' : 'border-slate-200/80 bg-white/85'}`}
        >
          {/* Right Header: Brand Details and Branch Switcher */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex flex-col text-right">
              <h2 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                {settings?.shopName || 'البدري تريد'}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <Building size={11} className="text-brand-green" />
                <span className="text-[10px] font-bold text-slate-400">
                  {currentBranch}
                </span>
              </div>
            </div>

            {/* Fast Branch Switcher Dropdown (Header Badge) */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all
                  ${darkMode 
                    ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800' 
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
              >
                <span>تبديل الفرع</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
              </button>
              <div className={`absolute right-0 mt-1 w-48 rounded-xl border shadow-xl opacity-0 translate-y-1 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-200 p-1.5 text-right
                ${darkMode ? 'bg-[#121929] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                {branches.map(b => (
                  <button
                    key={b}
                    onClick={() => changeBranch(b)}
                    className={`w-full text-right px-3 py-2 text-xs font-bold rounded-lg transition-colors
                      ${currentBranch === b 
                        ? 'bg-brand-blue text-white' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {b.split(' - ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Left Header: Notifications bell & user account profiles */}
          <div className="flex items-center gap-4">
            {/* Quick POS cashier access badge for admins/cashiers */}
            {(currentUser?.role === 'Admin' || currentUser?.role === 'Cashier') && activeTab !== 'pos' && (
              <button
                onClick={() => setActiveTab('pos')}
                className="hidden md:flex items-center gap-1.5 bg-brand-blue/15 text-brand-blue dark:bg-blue-500/20 dark:text-blue-300 font-black text-xs px-3.5 py-1.5 rounded-xl border border-brand-blue/10 hover:bg-brand-blue hover:text-white transition-all shadow-sm"
              >
                <ShoppingCart size={13} />
                <span>الكاشير السريع POS</span>
              </button>
            )}

            {/* Notification Bell Panel */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className={`p-2 rounded-xl transition-all relative border
                  ${darkMode 
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900'}`}
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 h-4 w-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center font-mono">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Overlay Popover */}
              {showNotificationPanel && (
                <div className={`absolute left-0 mt-2 w-80 rounded-2xl border shadow-2xl z-50 p-4 text-right space-y-3 animate-fade-in
                  ${darkMode ? 'bg-[#121929] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-xs font-black">إشعارات المخازن والنواقص</h3>
                    <button 
                      onClick={() => setShowNotificationPanel(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div 
                          key={n.id}
                          onClick={() => handleNotificationClick(n.id)}
                          className="p-2.5 rounded-xl border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer transition-colors text-xs text-right space-y-1.5"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-rose-500">
                            <AlertTriangle size={12} />
                            <span>تنبيه نفاد كمية صنف</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{n.text}</p>
                          <div className="text-[8px] text-slate-400 font-mono flex items-center justify-between">
                            <span>طلب شراء سريع 👈</span>
                            <span>{n.time}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400 font-bold space-y-1">
                        <CheckCircle size={24} className="mx-auto text-emerald-500 opacity-60 mb-2" />
                        <p>لا توجد تنبيهات نواقص حالياً</p>
                        <p className="text-[10px] font-normal">مستويات المخازن مستقرة وآمنة!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Role Badge Header Info */}
            <div className="flex items-center gap-2">
              <span className="text-xl hidden xs:inline">{currentUser?.avatar || '👨‍💼'}</span>
              <div className="hidden md:flex flex-col text-right leading-none">
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  {currentUser?.name || 'المدير العام'}
                </span>
                <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                  دور: {currentUser?.role || 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Panel View Router */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderActiveTabContent()}
        </main>

        {/* Sticky Footer */}
        <footer className={`py-4 px-6 border-t text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 no-print flex flex-col sm:flex-row items-center justify-between gap-2
          ${darkMode ? 'border-slate-800 bg-[#0b0f19]' : 'border-slate-200 bg-slate-50'}`}>
          <p>© {new Date().getFullYear()} البدري تريد - نظام محاسبة وERP وإدارة مخازن متكامل لإكسسوارات الموبايل.</p>
          <div className="flex items-center gap-3">
            <span>الفرع النشط: {currentBranch}</span>
            <span>•</span>
            <span>بواسطة البدري تريد</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Inline Close Icon
const X = ({ size }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default App;
