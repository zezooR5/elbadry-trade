import React, { useState } from 'react';
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  BookOpen, 
  PiggyBank, 
  Layers,
  Calculator,
  CalendarDays,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { useDb } from '../context/DbContext';

const Accounting = () => {
  const { 
    db, 
    addExpense, 
    depositToTreasury, 
    withdrawFromTreasury,
    currentBranch
  } = useDb();

  // State Management
  const [activeTab, setActiveTab] = useState('treasury'); // 'treasury', 'expenses', 'journal', 'profit_loss'
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Form States
  const [treasuryForm, setTreasuryForm] = useState({ amount: '', type: 'deposit', description: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: 'نثريات', description: '' });

  // Helper: Format Currency
  const formatCurrency = (val) => {
    return Number(val).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + db.treasury.currency;
  };

  // ==========================================
  // PROFIT & LOSS DYNAMIC CALCULATIONS
  // ==========================================
  // Filter by active branch
  const activeSales = db.sales.filter(s => s.branch === currentBranch);
  const activeExpenses = db.expenses.filter(e => e.branch === currentBranch);

  // Total Sales Revenue (Excluding tax - tax is a liability, not direct revenue)
  const totalSalesRevenue = activeSales
    .filter(s => !s.returned)
    .reduce((sum, s) => sum + (s.subtotal - s.discount), 0);

  // Cost of Goods Sold (COGS)
  const totalCOGS = activeSales
    .filter(s => !s.returned)
    .reduce((sum, s) => sum + (s.cost || 0), 0);

  // Gross Profit = Revenue - COGS
  const grossProfit = totalSalesRevenue - totalCOGS;

  // Operating Expenses (OpEx)
  const totalOpEx = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Net Profit = Gross Profit - OpEx
  const netProfit = grossProfit - totalOpEx;

  // ==========================================
  // FORM SUBMIT HANDLERS
  // ==========================================
  const handleTreasurySubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(treasuryForm.amount);
    if (!val || val <= 0) return;

    if (treasuryForm.type === 'deposit') {
      depositToTreasury(val, treasuryForm.description);
    } else {
      if (val > db.treasury.balance) {
        alert("عذراً، الرصيد المتوفر في الخزنة غير كافٍ لإتمام عملية السحب!");
        return;
      }
      withdrawFromTreasury(val, treasuryForm.description);
    }

    setShowTreasuryModal(false);
    setTreasuryForm({ amount: '', type: 'deposit', description: '' });
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(expenseForm.amount);
    if (!val || val <= 0) return;

    if (val > db.treasury.balance) {
      alert("عذراً، الرصيد الحالي للخزينة غير كافٍ لتسجيل هذا المصروف!");
      return;
    }

    addExpense(val, expenseForm.category, expenseForm.description);
    setShowExpenseModal(false);
    setExpenseForm({ amount: '', category: 'نثريات', description: '' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">
            النظام المحاسبي والمالي
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            متابعة أرصدة الصندوق، وإثبات المصروفات التشغيلية، ومراجعة القيود اليومية التلقائية وقائمة الأرباح والخسائر.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs font-bold shrink-0 shadow-sm bg-white dark:bg-slate-900">
          <button 
            onClick={() => setActiveTab('profit_loss')}
            className={`px-3 py-2.5 transition-colors ${activeTab === 'profit_loss' ? 'bg-brand-blue text-white' : 'hover:bg-slate-50 text-slate-500'}`}
          >
            <Calculator size={14} className="inline mr-1" /> الأرباح والخسائر
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            className={`px-3 py-2.5 transition-colors ${activeTab === 'journal' ? 'bg-brand-blue text-white' : 'hover:bg-slate-50 text-slate-500'}`}
          >
            <BookOpen size={14} className="inline mr-1" /> القيود اليومية
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-2.5 transition-colors ${activeTab === 'expenses' ? 'bg-brand-blue text-white' : 'hover:bg-slate-50 text-slate-500'}`}
          >
            <Layers size={14} className="inline mr-1" /> المصروفات
          </button>
          <button 
            onClick={() => setActiveTab('treasury')}
            className={`px-3 py-2.5 transition-colors ${activeTab === 'treasury' ? 'bg-brand-blue text-white' : 'hover:bg-slate-50 text-slate-500'}`}
          >
            <PiggyBank size={14} className="inline mr-1" /> حركة الخزينة
          </button>
        </div>
      </div>

      {/* ==========================================
          TAB 1: TREASURY (حركة الخزينة)
      ========================================== */}
      {activeTab === 'treasury' && (
        <div className="space-y-6 text-right">
          {/* Treasury Balance Info */}
          <div className="glass p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400">رصيد الخزينة العامة الحالي</p>
              <h3 className="text-2xl md:text-3xl font-black mt-1.5 text-brand-blue dark:text-blue-400">
                {formatCurrency(db.treasury.balance)}
              </h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { setTreasuryForm({ ...treasuryForm, type: 'withdraw' }); setShowTreasuryModal(true); }}
                className="px-4 py-2.5 bg-rose-500 text-white hover:bg-rose-600 rounded-xl font-bold text-xs flex items-center gap-1 shadow-lg shadow-rose-500/10"
              >
                <ArrowUpRight size={14} /> سحب مالي يدوي
              </button>
              <button 
                onClick={() => { setTreasuryForm({ ...treasuryForm, type: 'deposit' }); setShowTreasuryModal(true); }}
                className="px-4 py-2.5 bg-brand-green text-white hover:bg-lime-600 rounded-xl font-bold text-xs flex items-center gap-1 shadow-lg shadow-lime-500/10"
              >
                <ArrowDownLeft size={14} /> إيداع كاش يدوي
              </button>
            </div>
          </div>

          {/* Treasury transaction log */}
          <div className="glass rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">سجل حركة الصندوق المالي</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-[#121929]/20">
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">الحركة</th>
                    <th className="py-2.5 px-3 text-left">المبلغ</th>
                    <th className="py-2.5 px-3">تفاصيل الحركة</th>
                  </tr>
                </thead>
                <tbody>
                  {db.treasury.logs.length > 0 ? (
                    db.treasury.logs.map((log) => (
                      <tr 
                        key={log.id} 
                        className="border-b border-slate-100 dark:border-slate-800 text-xs hover:bg-slate-50/40 dark:hover:bg-slate-800/20"
                      >
                        <td className="py-3 px-3 font-semibold">
                          {new Date(log.date).toLocaleString('ar-EG')}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px]
                            ${log.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}>
                            {log.type === 'deposit' ? 'إيداع صادر' : 'سحب وارد'}
                          </span>
                        </td>
                        <td className={`py-3 px-3 font-mono font-black text-left
                          ${log.type === 'deposit' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {log.type === 'deposit' ? '+' : '-'}{formatCurrency(log.amount)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400">{log.description}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-12 text-slate-400 text-xs text-center">لا توجد حركات مسجلة بالخزينة بعد</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: EXPENSES (المصروفات)
      ========================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-6 text-right">
          {/* Controls */}
          <div className="glass p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <h3 className="font-black text-sm text-slate-800 dark:text-white">جدول المصروفات التشغيلية</h3>
              <p className="text-[10px] text-slate-400">إجمالي مصروفات الفرع الحالي: {formatCurrency(totalOpEx)}</p>
            </div>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="px-4 py-2.5 bg-brand-blue text-white hover:bg-blue-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
            >
              <Plus size={14} /> تسجيل بند مصروفات جديد
            </button>
          </div>

          {/* Expenses history table */}
          <div className="glass rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-[#121929]/20">
                    <th className="py-3 px-3">التاريخ</th>
                    <th className="py-3 px-3">البند / التصنيف</th>
                    <th className="py-3 px-3">القيمة</th>
                    <th className="py-3 px-3">التوضيح / الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  {activeExpenses.length > 0 ? (
                    activeExpenses.map((exp) => (
                      <tr 
                        key={exp.id} 
                        className="border-b border-slate-100 dark:border-slate-800 text-xs hover:bg-slate-50/40 dark:hover:bg-slate-800/20"
                      >
                        <td className="py-3.5 px-3">
                          {new Date(exp.date).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-black text-rose-500">{formatCurrency(exp.amount)}</td>
                        <td className="py-3.5 px-3 font-bold text-slate-500 dark:text-slate-400">{exp.description}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-12 text-slate-400 text-xs text-center">لا توجد مصروفات مسجلة حتى الآن في هذا الفرع</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: DOUBLE ENTRY JOURNAL (القيود اليومية المحاسبية)
      ========================================== */}
      {activeTab === 'journal' && (
        <div className="space-y-4 text-right">
          <div className="glass p-4 rounded-2xl shadow-sm">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">دفتر القيود اليومية التلقائية واليدوية</h4>
            <p className="text-[10px] text-slate-400 mt-1">يقوم النظام تلقائياً بتسجيل قيود المبيعات والمشتريات والمصروفات بمجرد اعتماد الفواتير لضمان التوازن المحاسبي.</p>
          </div>

          <div className="space-y-4">
            {db.journal.length > 0 ? (
              db.journal.map((j) => (
                <div key={j.id} className="glass rounded-2xl shadow-sm border border-slate-100 dark:border-slate-850 p-4 space-y-3">
                  {/* Journal header */}
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 border-b pb-2">
                    <div className="flex items-center gap-4">
                      <span>رقم المرجع: <strong className="text-brand-blue">{j.reference}</strong></span>
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">{j.id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{new Date(j.date).toLocaleDateString('ar-EG') + ' ' + new Date(j.date).toLocaleTimeString('ar-EG')}</span>
                      <span>{j.description}</span>
                    </div>
                  </div>

                  {/* Dual Entries Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="text-slate-400 text-[10px]">
                          <th className="pb-1">اسم الحساب المحاسبي</th>
                          <th className="pb-1 text-left">مدين (Debit)</th>
                          <th className="pb-1 text-left">دائن (Credit)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {j.entries.map((entry, eIdx) => (
                          <tr key={eIdx} className="border-t border-slate-100 dark:border-slate-800/40">
                            <td className={`py-2 ${entry.type === 'credit' ? 'pr-6 text-slate-500 font-medium' : 'font-extrabold text-slate-700 dark:text-slate-200'}`}>
                              {entry.type === 'credit' ? '← ' : ''}{entry.account}
                            </td>
                            <td className="py-2 text-left font-mono font-bold text-slate-800 dark:text-white">
                              {entry.type === 'debit' ? formatCurrency(entry.amount) : '-'}
                            </td>
                            <td className="py-2 text-left font-mono font-bold text-slate-550 dark:text-slate-400">
                              {entry.type === 'credit' ? formatCurrency(entry.amount) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass p-12 rounded-2xl text-center opacity-50">
                <BookOpen size={40} className="mx-auto text-slate-400" />
                <p className="font-bold text-xs mt-3">لا توجد قيود يومية مسجلة بعد</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: PROFIT & LOSS (الأرباح والخسائر)
      ========================================== */}
      {activeTab === 'profit_loss' && (
        <div className="space-y-6 text-right font-semibold">
          {/* Welcome alert */}
          <div className="glass p-4 rounded-2xl flex items-center justify-between shadow-sm bg-gradient-to-r from-blue-500/5 to-emerald-500/5 border-l-2 border-brand-green">
            <div>
              <h4 className="font-black text-sm text-slate-800 dark:text-white">قائمة الأرباح والخسائر التقديرية للفرع</h4>
              <p className="text-[10px] text-slate-400 mt-1">يتم احتساب هذا البيان ديناميكياً بناءً على إجمالي فواتير البيع (مخصوم منها الخصومات) مطروحاً منها تكلفة المبيعات والمصروفات.</p>
            </div>
            <span className="text-xs bg-brand-green/20 text-brand-green px-3 py-1 rounded-full font-bold">مكتمل ودقيق</span>
          </div>

          {/* Statement sheet grid */}
          <div className="glass rounded-2xl p-6 shadow-md max-w-2xl mx-auto space-y-6 border border-slate-100 dark:border-slate-800/80 bg-white">
            {/* Header info */}
            <div className="text-center space-y-1 text-black">
              <h3 className="font-extrabold text-base text-slate-800">{db.treasury.shopName}</h3>
              <p className="text-xs text-slate-500">تقرير الأرباح والخسائر لفترة: <strong>حتى تاريخه</strong></p>
              <div className="border-b border-dashed border-slate-350 py-1"></div>
            </div>

            {/* List entries */}
            <div className="space-y-4 text-xs text-slate-600">
              {/* Part 1: Sales Revenues */}
              <div className="space-y-2 pb-3 border-b">
                <div className="flex justify-between items-center text-sm font-extrabold text-slate-800">
                  <span className="font-mono text-emerald-600">{formatCurrency(totalSalesRevenue)}</span>
                  <span>1. إجمالي إيرادات المبيعات (الصافية):</span>
                </div>
                <div className="flex justify-between text-slate-400 pl-4">
                  <span className="font-mono">{formatCurrency(totalSalesRevenue)}</span>
                  <span>مبيعات السلع والقطع</span>
                </div>
              </div>

              {/* Part 2: Cost of Sales */}
              <div className="space-y-2 pb-3 border-b">
                <div className="flex justify-between items-center text-sm font-extrabold text-slate-800">
                  <span className="font-mono text-rose-500">-{formatCurrency(totalCOGS)}</span>
                  <span>2. تكلفة السلع المبيعة (الخامات والمشتريات):</span>
                </div>
                <div className="flex justify-between text-slate-400 pl-4">
                  <span className="font-mono">{formatCurrency(totalCOGS)}</span>
                  <span>تكلفة البضاعة المباعة الأصلية من الموردين</span>
                </div>
              </div>

              {/* Part 3: Gross Profit */}
              <div className="flex justify-between items-center text-sm font-black text-slate-800 pb-3 border-b bg-slate-50/50 p-2 rounded-xl">
                <span className="font-mono text-brand-blue">{formatCurrency(grossProfit)}</span>
                <span>3. مجمل الربح المحقق (Gross Profit):</span>
              </div>

              {/* Part 4: Operating Expenses */}
              <div className="space-y-2 pb-3 border-b">
                <div className="flex justify-between items-center text-sm font-extrabold text-slate-800">
                  <span className="font-mono text-rose-500">-{formatCurrency(totalOpEx)}</span>
                  <span>4. إجمالي المصروفات التشغيلية (OpEx):</span>
                </div>
                {/* Breakdowns of categories if any exist */}
                {['إيجار', 'رواتب', 'كهرباء ومياه', 'نثريات', 'تسويق'].map((cat, cIdx) => {
                  const catSum = activeExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                  if (catSum <= 0) return null;
                  return (
                    <div key={cIdx} className="flex justify-between text-slate-400 pl-4">
                      <span className="font-mono">{formatCurrency(catSum)}</span>
                      <span>مصروفات - {cat}</span>
                    </div>
                  );
                })}
              </div>

              {/* Final Part: Net Profit */}
              <div className={`flex justify-between items-center text-base font-black border-t-2 border-dashed border-slate-350 pt-4 px-3 py-2 rounded-xl
                ${netProfit >= 0 ? 'bg-brand-green/10 text-brand-green font-black' : 'bg-rose-500/10 text-rose-500'}`}>
                <span className="font-mono">{formatCurrency(netProfit)}</span>
                <span>صافي الأرباح / الخسائر التشغيلية النهائي:</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TREASURY DEPOSIT/WITHDRAWAL DIALOG
      ========================================== */}
      {showTreasuryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-right">
            <button 
              onClick={() => setShowTreasuryModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              {treasuryForm.type === 'deposit' ? 'إيداع نقدي كاش بالصندوق' : 'سحب نقدي كاش من الصندوق'}
            </h3>

            <form onSubmit={handleTreasurySubmit} className="mt-4 space-y-4 font-semibold text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">المبلغ *</label>
                <input 
                  type="number" required min="1" step="any"
                  placeholder="أدخل قيمة المبلغ..."
                  value={treasuryForm.amount}
                  onChange={(e) => setTreasuryForm({ ...treasuryForm, amount: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">سبب السحب / الإيداع *</label>
                <input 
                  type="text" required
                  placeholder="مثال: توريد دفعة للبنك، سلفة، إيداع رأس مال..."
                  value={treasuryForm.description}
                  onChange={(e) => setTreasuryForm({ ...treasuryForm, description: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors mt-2"
              >
                تأكيد حركة الصندوق المالي
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          REGISTER NEW EXPENSE MODAL
      ========================================== */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-right">
            <button 
              onClick={() => setShowExpenseModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              تسجيل بند مصروفات تشغيلية
            </h3>

            <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-4 font-semibold text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">قيمة المصروف *</label>
                <input 
                  type="number" required min="1" step="any"
                  placeholder="أدخل قيمة المبلغ المصروف..."
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">بند / تصنيف المصروف *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-right outline-none"
                >
                  <option value="رواتب">رواتب وأجور</option>
                  <option value="إيجار">إيجار المحل / الشركة</option>
                  <option value="كهرباء ومياه">فاتورة كهرباء ومياه</option>
                  <option value="تسويق">تسويق وإعلانات</option>
                  <option value="نثريات">نثريات وضيافة وصيانة</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">توضيح وبيان المصروف *</label>
                <input 
                  type="text" required
                  placeholder="مثال: فاتورة كهرباء شهر مايو..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors mt-2"
              >
                حفظ وإثبات المصروف بالخزينة
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
