import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3, 
  Settings as SettingsIcon,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useDb } from '../context/DbContext';

const Sidebar = ({ activeTab, setActiveTab, darkMode, toggleDarkMode, sidebarOpen, setSidebarOpen }) => {
  const { currentBranch, currentUser, changeUser } = useDb();

  const menuItems = [
    { id: 'dashboard', name: 'لوحة التحكم', icon: LayoutDashboard, roles: ['Admin', 'Cashier', 'Accountant'] },
    { id: 'pos', name: 'الكاشير POS', icon: ShoppingCart, roles: ['Admin', 'Cashier'] },
    { id: 'inventory', name: 'إدارة المخازن', icon: Package, roles: ['Admin', 'Accountant'] },
    { id: 'purchases', name: 'المشتريات', icon: TrendingUp, roles: ['Admin', 'Accountant'] },
    { id: 'contacts', name: 'العملاء والموردين', icon: Users, roles: ['Admin', 'Accountant'] },
    { id: 'accounting', name: 'الحسابات والخزنة', icon: DollarSign, roles: ['Admin', 'Accountant'] },
    { id: 'reports', name: 'التقارير المالية', icon: BarChart3, roles: ['Admin', 'Accountant'] },
    { id: 'settings', name: 'الإعدادات والصيانة', icon: SettingsIcon, roles: ['Admin'] }
  ];

  // Keep all menu items always visible so the wholesaler never gets locked out of settings or details in Electron
  const allowedMenuItems = menuItems;

  return (
    <aside 
      className={`fixed top-0 right-0 h-screen transition-all duration-300 z-30 flex flex-col no-print
        ${sidebarOpen ? 'w-64' : 'w-20'} 
        ${darkMode ? 'bg-[#0f1626] border-l border-slate-800 text-slate-200' : 'bg-white border-l border-slate-200 text-slate-700'}
        shadow-xl`}
    >
      {/* Brand Header */}
      <div className={`p-4 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        {sidebarOpen ? (
          <div className="flex flex-col right-0 text-right">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-brand-blue tracking-tight dark:text-blue-400">Elbadry</span>
              <span className="font-extrabold text-lg text-brand-green">Trade</span>
            </div>
            <span className={`text-[10px] font-semibold tracking-wider -mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              إكسسوارات المحمول
            </span>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center font-bold text-white text-xs select-none">
            ET
          </div>
        )}

        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-1.5 rounded-lg border transition-all duration-300
            ${darkMode ? 'border-slate-800 bg-[#161d30] text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900'}`}
        >
          {sidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {allowedMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-right font-medium group
                ${isActive 
                  ? 'bg-brand-blue text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10' 
                  : darkMode 
                    ? 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200' 
                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
            >
              <Icon size={20} className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-brand-green' : ''}`} />
              {sidebarOpen && <span className="text-sm truncate">{item.name}</span>}
              {sidebarOpen && isActive && (
                <span className="mr-auto w-1.5 h-6 rounded-full bg-brand-green"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Status / Role Badge at Bottom */}
      <div className={`p-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        {sidebarOpen ? (
          <div className={`p-3 rounded-xl flex flex-col gap-2 ${darkMode ? 'bg-[#161d30]' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentUser.avatar}</span>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">المستخدم الحالي</p>
                <p className="text-sm font-bold truncate">{currentUser.name}</p>
              </div>
            </div>
            
            {/* Interactive Role Switcher instead of static role badge */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500">صلاحية شاشات التطبيق:</label>
              <select
                value={currentUser.role}
                onChange={(e) => changeUser(e.target.value)}
                className={`w-full text-[10px] font-black px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer
                  ${darkMode 
                    ? 'bg-slate-900 border-slate-800 text-brand-blue dark:text-blue-300' 
                    : 'bg-white border-slate-200 text-brand-blue'}`}
              >
                <option value="Admin">🔑 المدير العام (أدمن)</option>
                <option value="Cashier">🛒 كاشير المحل (كاشير)</option>
                <option value="Accountant">📊 المحاسب المالي (محاسب)</option>
              </select>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[9px] text-slate-400">فرع:</span>
              <span className="text-[10px] bg-brand-green/15 text-brand-green font-bold px-2 py-0.5 rounded-full dark:bg-lime-500/20 dark:text-lime-400">
                {currentBranch.split(' - ')[0]}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-lg cursor-pointer" title={`${currentUser.name} (${currentUser.role})`}>{currentUser.avatar}</span>
            {/* Quick role toggle button when collapsed */}
            <button 
              onClick={() => {
                const roles = ['Admin', 'Cashier', 'Accountant'];
                const currentIndex = roles.indexOf(currentUser.role);
                const nextRole = roles[(currentIndex + 1) % roles.length];
                changeUser(nextRole);
              }}
              title={`الصلاحية الحالية: ${currentUser.role} - اضغط للتبديل السريع`}
              className="text-[8px] bg-brand-blue/15 text-brand-blue font-black px-1.5 py-0.5 rounded-md border border-brand-blue/20 dark:bg-blue-500/20 dark:text-blue-300 shrink-0 hover:scale-105 transition-transform"
            >
              {currentUser.role === 'Admin' ? 'أدمن' : currentUser.role === 'Cashier' ? 'كاشير' : 'محاسب'}
            </button>
          </div>
        )}

        {/* Dark/Light Mode toggle */}
        <button
          onClick={toggleDarkMode}
          className={`w-full flex items-center justify-center gap-2 mt-3 p-2.5 rounded-xl border transition-all duration-200 font-semibold
            ${darkMode 
              ? 'border-slate-800 bg-[#161d30] text-amber-400 hover:bg-slate-800' 
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {sidebarOpen && <span className="text-xs">{darkMode ? 'الوضع الفاتح' : 'الوضع الليلي'}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
