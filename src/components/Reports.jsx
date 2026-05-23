import React, { useState } from 'react';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Printer, 
  Search, 
  Calendar, 
  Filter, 
  TrendingUp, 
  X, 
  DollarSign, 
  Layers, 
  PieChart, 
  Eye, 
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useDb } from '../context/DbContext';

const Reports = ({ darkMode }) => {
  const { db, currentBranch, returnSalesInvoice } = useDb();

  // Internal Tabs
  const [activeReportTab, setActiveReportTab] = useState('sales'); // 'sales', 'representatives', 'stock', 'profit'

  // Filter States
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default to last 30 days
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedBranch, setSelectedBranch] = useState('all'); // 'all' or branch name
  const [selectedCashier, setSelectedCashier] = useState('all'); // 'all' or cashier name
  const [searchQuery, setSearchQuery] = useState('');

  // Invoice Detail Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('رغبة العميل في الإرجاع');

  // Helper: Format Currency
  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + db.treasury.currency;
  };

  // Helper: Get cashier names dynamically from invoices
  const cashiersList = Array.from(new Set(db.sales.map(s => s.cashier)));

  // ==========================================
  // SALES REPORT FILTERING & CALCULATIONS
  // ==========================================
  const filteredSales = db.sales.filter(inv => {
    // 1. Date Range
    const invDate = inv.date.slice(0, 10);
    const inDateRange = invDate >= startDate && invDate <= endDate;

    // 2. Branch
    const matchBranch = selectedBranch === 'all' || inv.branch === selectedBranch;

    // 3. Cashier
    const matchCashier = selectedCashier === 'all' || inv.cashier === selectedCashier;

    // 4. Search Query (Invoice No, Customer Name)
    const customer = db.customers.find(c => c.id === inv.customerId);
    const customerName = customer ? customer.name.toLowerCase() : 'عميل افتراضي';
    const matchSearch = inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        customerName.includes(searchQuery.toLowerCase());

    return inDateRange && matchBranch && matchCashier && matchSearch;
  });

  // Financial KPI calculations for Sales Report
  const totalSalesRevenues = filteredSales.filter(s => !s.returned).reduce((sum, s) => sum + s.subtotal - s.discount, 0);
  const totalVatCollected = filteredSales.filter(s => !s.returned).reduce((sum, s) => sum + s.tax, 0);
  const totalInvoiceValues = filteredSales.filter(s => !s.returned).reduce((sum, s) => sum + s.total, 0);
  const totalReturnedSales = filteredSales.filter(s => s.returned).reduce((sum, s) => sum + s.total, 0);
  
  // Paid types breakdown
  const salesCashVal = filteredSales.filter(s => !s.returned && s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const salesCardVal = filteredSales.filter(s => !s.returned && s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);
  const salesDebtVal = filteredSales.filter(s => !s.returned && s.paymentMethod === 'debt').reduce((sum, s) => sum + s.total, 0);

  // ==========================================
  // INVENTORY VALUATION & STOCK REPORT
  // ==========================================
  // Filter products by branch if a specific branch is selected (products database records standard active branch or general stock)
  const filteredProducts = db.products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.barcode.includes(searchQuery);
    return matchSearch;
  });

  const totalStockItemsCount = filteredProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalCogsInventoryValuation = filteredProducts.reduce((sum, p) => sum + (p.buyPrice * p.quantity), 0);
  const totalExpectedSalesValuation = filteredProducts.reduce((sum, p) => sum + (p.sellPrice * p.quantity), 0);
  const totalPotentialProfitValuation = totalExpectedSalesValuation - totalCogsInventoryValuation;
  
  // Low Stock List
  const lowStockProducts = filteredProducts.filter(p => p.quantity <= p.minStock);

  // ==========================================
  // PROFIT & LOSS STATEMENT & EXPENSES
  // ==========================================
  // Filtered Expenses
  const filteredExpenses = db.expenses.filter(exp => {
    const expDate = exp.date.slice(0, 10);
    const inDateRange = expDate >= startDate && expDate <= endDate;
    const matchBranch = selectedBranch === 'all' || exp.branch === selectedBranch;
    const matchSearch = exp.category.includes(searchQuery) || exp.description.toLowerCase().includes(searchQuery.toLowerCase());
    return inDateRange && matchBranch && matchSearch;
  });

  const totalFilteredExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Sales Cost (COGS) for profits in period
  const totalSalesCogsVal = filteredSales.filter(s => !s.returned).reduce((sum, s) => sum + (s.cost || 0), 0);
  
  // Gross Profit = Net Sales Revenue - COGS
  const grossProfitAmount = totalSalesRevenues - totalSalesCogsVal;
  
  // Net Operating Profit = Gross Profit - Total Expenses
  const netOperatingProfitAmount = grossProfitAmount - totalFilteredExpensesAmount;

  // ==========================================
  // EXPORT UTILITIES
  // ==========================================
  const handlePrint = () => {
    window.print();
  };

  const handleExportToExcel = () => {
    let csvContent = "";
    
    if (activeReportTab === 'sales') {
      csvContent = "رقم الفاتورة,التاريخ,العميل,طريقة الدفع,الصافي قبل الضريبة,الضريبة,الإجمالي,الحالة\n";
      filteredSales.forEach(inv => {
        const custName = db.customers.find(c => c.id === inv.customerId)?.name || "عميل كاش";
        const dateStr = new Date(inv.date).toLocaleDateString('ar-EG');
        const payType = inv.paymentMethod === 'cash' ? 'كاش' : inv.paymentMethod === 'card' ? 'شبكة' : 'آجل';
        const statusStr = inv.returned ? 'مرجع' : 'مكتمل';
        csvContent += `${inv.invoiceNo},${dateStr},${custName},${payType},${inv.subtotal - inv.discount},${inv.tax},${inv.total},${statusStr}\n`;
      });
    } else if (activeReportTab === 'stock') {
      csvContent = "كود المنتج,الاسم,التصنيف,الكمية الحالية,سعر الشراء,سعر البيع,قيمة الشراء الكلية,قيمة البيع الكلية\n";
      filteredProducts.forEach(p => {
        csvContent += `${p.code},${p.name},${p.category},${p.quantity},${p.buyPrice},${p.sellPrice},${p.buyPrice * p.quantity},${p.sellPrice * p.quantity}\n`;
      });
    } else {
      csvContent = "البند المالي,القيمة المالية بالريال\n";
      csvContent += `إجمالي المبيعات الإيرادية,${totalSalesRevenues}\n`;
      csvContent += `تكلفة البضاعة المباعة (COGS),${totalSalesCogsVal}\n`;
      csvContent += `إجمالي الأرباح التجارية (مجمل الربح),${grossProfitAmount}\n`;
      csvContent += `إجمالي المصروفات التشغيلية والرواتب,${totalFilteredExpensesAmount}\n`;
      csvContent += `صافي الربح الفتري,${netOperatingProfitAmount}\n`;
    }

    // Prepare CSV Blob with BOM for excel Arabic decoding support
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `elbadry_trade_report_${activeReportTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReturnInvoiceConfirm = () => {
    if (selectedInvoice) {
      returnSalesInvoice(selectedInvoice.id, returnReason);
      setShowReturnModal(false);
      setSelectedInvoice(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print text-right">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">
            التقارير المالية والتحليلات
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            استخراج كشوفات المبيعات والمخزن وحساب الأرباح والخسائر التفصيلية للفروع
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportToExcel}
            className="flex items-center gap-2 bg-brand-green/10 text-brand-green border border-brand-green/20 hover:bg-brand-green hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Download size={15} />
            <span>تصدير إكسل Excel</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-brand-blue text-white hover:bg-blue-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            <Printer size={15} />
            <span>طباعة التقرير الحالي</span>
          </button>
        </div>
      </div>

      {/* Internal Tabs Panel */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 no-print">
        <button
          onClick={() => { setActiveReportTab('sales'); setSearchQuery(''); }}
          className={`py-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-2
            ${activeReportTab === 'sales' 
              ? 'border-brand-blue text-brand-blue dark:text-blue-400 dark:border-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <FileText size={18} />
          <span>كشف الفواتير والمبيعات</span>
        </button>
        <button
          onClick={() => { setActiveReportTab('representatives'); setSearchQuery(''); }}
          className={`py-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-2
            ${activeReportTab === 'representatives' 
              ? 'border-brand-blue text-brand-blue dark:text-blue-400 dark:border-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <BarChart3 size={18} />
          <span>تقرير المناديب والتوزيع</span>
        </button>
        <button
          onClick={() => { setActiveReportTab('stock'); setSearchQuery(''); }}
          className={`py-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-2
            ${activeReportTab === 'stock' 
              ? 'border-brand-blue text-brand-blue dark:text-blue-400 dark:border-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <Layers size={18} />
          <span>تقييم وتثمين المخزون</span>
        </button>
        <button
          onClick={() => { setActiveReportTab('profit'); setSearchQuery(''); }}
          className={`py-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-2
            ${activeReportTab === 'profit' 
              ? 'border-brand-blue text-brand-blue dark:text-blue-400 dark:border-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <PieChart size={18} />
          <span>حساب الأرباح والمصروفات</span>
        </button>
      </div>

      {/* Search & Filter Controls Widget */}
      <div className="glass p-5 rounded-2xl space-y-4 no-print text-right shadow-sm">
        <div className="flex items-center gap-2 text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800/60">
          <Filter size={16} className="text-brand-blue" />
          <h3 className="text-xs font-black">أدوات تصفية وعرض النتائج</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Start Date */}
          {activeReportTab !== 'stock' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">من تاريخ</label>
              <div className="relative">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2 px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
                <Calendar size={14} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>
          )}

          {/* End Date */}
          {activeReportTab !== 'stock' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">إلى تاريخ</label>
              <div className="relative">
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2 px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
                <Calendar size={14} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>
          )}

          {/* Branch Filter */}
          {activeReportTab !== 'stock' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">تصفية حسب الفرع</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="all">كل الفروع النشطة</option>
                {db.purchases.length > 0 || db.sales.length > 0 ? (
                  Array.from(new Set([...db.sales.map(s => s.branch), ...db.purchases.map(p => p.branch)])).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))
                ) : (
                  <option value={currentBranch}>{currentBranch}</option>
                )}
              </select>
            </div>
          )}

          {/* Cashier Filter */}
          {activeReportTab === 'sales' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">تصفية حسب البائع</label>
              <select
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="all">كل الموظفين والبائعين</option>
                {cashiersList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Search Query Input */}
          <div className={`space-y-1 ${activeReportTab === 'profit' ? 'col-span-1 sm:col-span-2' : ''} ${activeReportTab === 'stock' ? 'col-span-1 sm:col-span-4' : ''}`}>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {activeReportTab === 'sales' ? 'البحث برقم الفاتورة أو اسم العميل' : activeReportTab === 'stock' ? 'البحث عن منتج بالاسم أو الكود أو الباركود' : 'البحث في المصروفات والبنود'}
            </label>
            <div className="relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="اكتب هنا للبحث الفوري..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2 px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-brand-blue text-right"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SALES REPORT VIEW */}
      {/* ========================================================================= */}
      {activeReportTab === 'sales' && (
        <div className="space-y-6">
          {/* Sales Report KPI Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-right">
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400">إجمالي المبيعات (صافي دون مرتجعات)</p>
              <h3 className="text-lg font-black text-brand-blue dark:text-blue-400 mt-2">{formatCurrency(totalInvoiceValues)}</h3>
              <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold mt-2">
                <span>المبيعات الكاش: {formatCurrency(salesCashVal)}</span>
              </div>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400">إجمالي إيرادات المبيعات (جملة)</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">{formatCurrency(totalSalesRevenues)}</h3>
              <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold mt-2">
                <span>المبيعات بالشبكة: {formatCurrency(salesCardVal)}</span>
              </div>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400">إجمالي المبيعات الآجلة (ديون المحلات)</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">{formatCurrency(salesDebtVal)}</h3>
              <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold mt-2">
                <span>مدعومة بعهد الموزعين</span>
              </div>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-rose-500/10 bg-rose-500/5">
              <p className="text-[10px] font-bold text-rose-500">إجمالي مرتجعات المبيعات المسجلة</p>
              <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 mt-2">{formatCurrency(totalReturnedSales)}</h3>
              <div className="text-[9px] text-slate-400 font-bold mt-2">
                عدد الفواتير المرتجعة: {filteredSales.filter(s => s.returned).length} فاتورة
              </div>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="glass p-5 rounded-2xl shadow-sm text-right">
            <h2 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              تفاصيل فواتير مبيعات التوزيع للفترة
            </h2>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold">
                    <th className="py-3 px-2">رقم الفاتورة</th>
                    <th className="py-3 px-2">التاريخ والوقت</th>
                    <th className="py-3 px-2">الفرع</th>
                    <th className="py-3 px-2">المحل/العميل</th>
                    <th className="py-3 px-2">المندوب</th>
                    <th className="py-3 px-2">البائع</th>
                    <th className="py-3 px-2">طريقة الدفع</th>
                    <th className="py-3 px-2">الخصم</th>
                    <th className="py-3 px-2">المجموع النهائي</th>
                    <th className="py-3 px-2">الحالة</th>
                    <th className="py-3 px-2 no-print text-center">أدوات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length > 0 ? (
                    filteredSales.map(inv => {
                      const customerName = db.customers.find(c => c.id === inv.customerId)?.name || "عميل افتراضي";
                      return (
                        <tr 
                          key={inv.id}
                          className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-3.5 px-2 font-mono font-bold text-brand-blue">{inv.invoiceNo}</td>
                          <td className="py-3.5 px-2">{new Date(inv.date).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td className="py-3.5 px-2">{inv.branch.split(' - ')[0]}</td>
                          <td className="py-3.5 px-2 font-bold">{customerName}</td>
                          <td className="py-3.5 px-2 font-bold text-blue-600">{db.representatives?.find(r => r.id === inv.repId)?.name || 'غير محدد'}</td>
                          <td className="py-3.5 px-2">{inv.cashier}</td>
                          <td className="py-3.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px]
                              ${inv.paymentMethod === 'cash' ? 'bg-emerald-500/10 text-emerald-600' : ''}
                              ${inv.paymentMethod === 'card' ? 'bg-blue-500/10 text-blue-600' : ''}
                              ${inv.paymentMethod === 'debt' ? 'bg-amber-500/10 text-amber-600' : ''}
                            `}>
                              {inv.paymentMethod === 'cash' ? 'نقدي' : ''}
                              {inv.paymentMethod === 'card' ? 'شبكة' : ''}
                              {inv.paymentMethod === 'debt' ? 'آجل' : ''}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 font-mono text-rose-500">{formatCurrency(inv.discount)}</td>
                          <td className="py-3.5 px-2 font-black font-mono text-brand-blue">{formatCurrency(inv.total)}</td>
                          <td className="py-3.5 px-2">
                            {inv.returned ? (
                              <span className="text-rose-500 font-bold bg-rose-500/10 px-2.5 py-0.5 rounded-full text-[9px]">
                                مرتجع
                              </span>
                            ) : (
                              <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full text-[9px]">
                                مكتملة
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-center no-print flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1 rounded bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white transition-colors"
                              title="عرض تفاصيل الفاتورة وطباعتها"
                            >
                              <Eye size={13} />
                            </button>
                            {!inv.returned && (
                              <button
                                onClick={() => { setSelectedInvoice(inv); setShowReturnModal(true); }}
                                className="p-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                                title="إرجاع الفاتورة بالكامل"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="11" className="py-12 text-slate-400 text-xs text-center font-bold">لا تتوفر فواتير مبيعات تطابق التصفية المحددة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REPRESENTATIVES REPORT VIEW */}
      {/* ========================================================================= */}
      {activeReportTab === 'representatives' && (
        <div className="space-y-6">
          {/* KPI Cards for representatives */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-right font-cairo">
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 animate-fadeIn">
              <p className="text-[10px] font-bold text-slate-400">إجمالي مبيعات المناديب بالجملة</p>
              <h3 className="text-lg font-black text-brand-blue dark:text-blue-400 mt-2">
                {formatCurrency((db.representatives || []).reduce((sum, r) => sum + r.totalSales, 0))}
              </h3>
              <p className="text-[9px] text-slate-400 mt-2">مجموع فواتير الجملة التي تصرف بها الموزعون</p>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 animate-fadeIn">
              <p className="text-[10px] font-bold text-slate-400">إجمالي عهدة الكاش المعلق بالشارع</p>
              <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 mt-2">
                {formatCurrency((db.representatives || []).reduce((sum, r) => sum + r.activeCollections, 0))}
              </h3>
              <p className="text-[9px] text-slate-400 mt-2">مبالغ كاش لم تسلم للشركة ولم تورد بعد</p>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 animate-fadeIn">
              <p className="text-[10px] font-bold text-slate-400">إجمالي مديونيات المحلات الموزعة</p>
              <h3 className="text-lg font-black text-rose-500 mt-2">
                {formatCurrency(db.customers.reduce((sum, c) => sum + c.debt, 0))}
              </h3>
              <p className="text-[9px] text-slate-400 mt-2">مديونيات آجلة مسحوبة على المحلات تحت مسؤولية المناديب</p>
            </div>
          </div>

          {/* Representatives performance details table */}
          <div className="glass p-5 rounded-2xl shadow-sm text-right animate-fadeIn">
            <h2 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              جدول أداء وتحصيلات مناديب قطاع الجملة والتوزيع
            </h2>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold">
                    <th className="py-3 px-2">اسم المندوب</th>
                    <th className="py-3 px-2">رقم الجوال</th>
                    <th className="py-3 px-2">إجمالي مبيعاته بالجملة</th>
                    <th className="py-3 px-2">عهدة كاش معلقة</th>
                    <th className="py-3 px-2">ديون المحلات بقطاعه</th>
                    <th className="py-3 px-2">عدد المحلات المسؤولة</th>
                  </tr>
                </thead>
                <tbody>
                  {(db.representatives || []).map(r => {
                    const linkedShops = db.customers.filter(c => c.repId === r.id);
                    const totalShopsDebt = linkedShops.reduce((sum, c) => sum + c.debt, 0);
                    return (
                      <tr 
                        key={r.id}
                        className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                      >
                        <td className="py-3.5 px-2 font-bold">{r.name}</td>
                        <td className="py-3.5 px-2 font-mono font-bold">{r.phone || '-'}</td>
                        <td className="py-3.5 px-2 font-black font-mono text-brand-blue">{formatCurrency(r.totalSales)}</td>
                        <td className="py-3.5 px-2 font-mono">
                          <span className={`font-black px-2 py-0.5 rounded-full text-[10px]
                            ${r.activeCollections > 0 ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {formatCurrency(r.activeCollections)}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 font-black font-mono text-rose-500">{formatCurrency(totalShopsDebt)}</td>
                        <td className="py-3.5 px-2 font-bold">{linkedShops.length} محلات / عملاء</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INVENTORY STOCK EVALUATION VIEW */}
      {/* ========================================================================= */}
      {activeReportTab === 'stock' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Inventory Valuation KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-right">
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400">إجمالي قطع المخزون الحالية</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">{totalStockItemsCount} قطعة</h3>
              <p className="text-[9px] text-slate-400 mt-2">إجمالي كميات جميع إكسسوارات الجوال</p>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400">قيمة تثمين المخزون بسعر الشراء (COGS)</p>
              <h3 className="text-lg font-black text-brand-blue dark:text-blue-400 mt-2">{formatCurrency(totalCogsInventoryValuation)}</h3>
              <p className="text-[9px] text-slate-400 mt-2">رأس المال المستثمر الفعلي في الرفوف</p>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400">قيمة تثمين المخزون بسعر الجملة المتوقع</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">
                {formatCurrency(filteredProducts.reduce((sum, p) => sum + ((p.wholesalePrice || p.sellPrice) * p.quantity), 0))}
              </h3>
              <p className="text-[9px] text-slate-400 mt-2">إجمالي المبيعات المتوقعة عند تصريف البضاعة جملة</p>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-brand-green/10 bg-brand-green/5">
              <p className="text-[10px] font-bold text-brand-green">الأرباح التقديرية الكامنة بالمخزن</p>
              <h3 className="text-lg font-black text-brand-green dark:text-lime-400 mt-2">
                {formatCurrency(filteredProducts.reduce((sum, p) => sum + (((p.wholesalePrice || p.sellPrice) - p.buyPrice) * p.quantity), 0))}
              </h3>
              <p className="text-[9px] text-slate-400 mt-2">فرق بيع الجملة - رأس مال الشراء الكلي</p>
            </div>
          </div>

          {/* Low stock critical info alert */}
          {lowStockProducts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-2xl flex items-center gap-3 text-right">
              <AlertTriangle size={20} className="shrink-0" />
              <div>
                <p className="font-bold text-xs">تحذير: نواقص مخزنية تحتاج لطلبيات شراء فورية!</p>
                <p className="text-[10px] mt-0.5">يوجد {lowStockProducts.length} منتجات تحت حد الطلب الأدنى. قيمتها الكلية بسعر الشراء تبلغ: {formatCurrency(lowStockProducts.reduce((sum, p) => sum + (p.buyPrice * p.quantity), 0))}</p>
              </div>
            </div>
          )}

          {/* Stock Valuation Items List */}
          <div className="glass p-5 rounded-2xl shadow-sm text-right">
            <h2 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              تقرير كميات وقيم تثمين مخزون إكسسوارات الموبايل
            </h2>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold">
                    <th className="py-3 px-2">كود المنتج</th>
                    <th className="py-3 px-2">الاسم</th>
                    <th className="py-3 px-2">التصنيف</th>
                    <th className="py-3 px-2">المورد الافتراضي</th>
                    <th className="py-3 px-2">الكمية المتاحة</th>
                    <th className="py-3 px-2">سعر الشراء</th>
                    <th className="py-3 px-2">سعر الجملة</th>
                    <th className="py-3 px-2">تكلفة الشراء الكلية</th>
                    <th className="py-3 px-2">قيمة البيع الكلية</th>
                    <th className="py-3 px-2">الربح التقديري</th>
                    <th className="py-3 px-2">حالة الكمية</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(p => {
                      const costVal = p.buyPrice * p.quantity;
                      const salesVal = (p.wholesalePrice || p.sellPrice) * p.quantity;
                      const potentialProfit = salesVal - costVal;
                      const isLowStock = p.quantity <= p.minStock;
                      return (
                        <tr 
                          key={p.id}
                          className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-3.5 px-2 font-mono font-bold">{p.code}</td>
                          <td className="py-3.5 px-2 font-bold">{p.name}</td>
                          <td className="py-3.5 px-2 text-slate-400">{p.category}</td>
                          <td className="py-3.5 px-2">{p.supplier || 'غير محدد'}</td>
                          <td className="py-3.5 px-2 font-bold font-mono text-brand-blue">{p.quantity} قطعة</td>
                          <td className="py-3.5 px-2 font-mono">{formatCurrency(p.buyPrice)}</td>
                          <td className="py-3.5 px-2 font-mono">{formatCurrency(p.wholesalePrice || p.sellPrice)}</td>
                          <td className="py-3.5 px-2 font-black font-mono">{formatCurrency(costVal)}</td>
                          <td className="py-3.5 px-2 font-mono">{formatCurrency(salesVal)}</td>
                          <td className="py-3.5 px-2 font-black font-mono text-brand-green">{formatCurrency(potentialProfit)}</td>
                          <td className="py-3.5 px-2">
                            {isLowStock ? (
                              <span className="text-rose-500 font-bold bg-rose-500/10 px-2.5 py-0.5 rounded-full text-[9px] flex items-center gap-1 w-max">
                                <AlertTriangle size={10} />
                                <span>ناقص / طلب</span>
                              </span>
                            ) : (
                              <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full text-[9px] flex items-center gap-1 w-max">
                                <CheckCircle size={10} />
                                <span>مستقر</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="11" className="py-12 text-slate-400 text-xs text-center font-bold">لا توجد منتجات تطابق تصفية البحث المحددة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PROFIT & LOSS / FINANCIAL STATEMENT VIEW */}
      {/* ========================================================================= */}
      {activeReportTab === 'profit' && (
        <div className="space-y-6">
          {/* P&L Statement Grid Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-right">
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400">إيرادات المبيعات (Net Revenue)</p>
              <h3 className="text-lg font-black text-brand-blue dark:text-blue-400 mt-2">{formatCurrency(totalSalesRevenues)}</h3>
              <p className="text-[9px] text-slate-400 mt-2">صافي المبيعات دون احتساب الضرائب</p>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400">تكلفة البضاعة المباعة (COGS)</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-white mt-2">{formatCurrency(totalSalesCogsVal)}</h3>
              <p className="text-[9px] text-slate-400 mt-2">تكلفة المشتريات المرجحة للقطع التي بيعت</p>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400">إجمالي المصروفات والبنود</p>
              <h3 className="text-lg font-black text-rose-500 mt-2">{formatCurrency(totalFilteredExpensesAmount)}</h3>
              <p className="text-[9px] text-slate-400 mt-2">مصروفات الإيجار والرواتب والنثريات للفترة</p>
            </div>
            <div className="glass p-5 rounded-2xl shadow-sm border border-brand-green/10 bg-brand-green/5">
              <p className="text-[10px] font-bold text-brand-green">صافي الأرباح التشغيلية (Net Profit)</p>
              <h3 className={`text-lg font-black mt-2 ${netOperatingProfitAmount >= 0 ? 'text-brand-green dark:text-lime-400' : 'text-rose-500'}`}>
                {formatCurrency(netOperatingProfitAmount)}
              </h3>
              <p className="text-[9px] text-slate-400 mt-2">صافي الربح الفعلي بعد خصم المصروفات</p>
            </div>
          </div>

          {/* Structured P&L Table (قائمة الأرباح والخسائر) */}
          <div className="glass p-6 rounded-2xl shadow-sm text-right max-w-3xl mx-auto border border-slate-100 dark:border-slate-800/80">
            <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold bg-brand-blue/10 text-brand-blue px-3 py-1 rounded-full">بيان مالي تفصيلي</span>
              <h2 className="font-black text-xl text-slate-800 dark:text-white mt-2">قائمة الأرباح والخسائر التقديرية</h2>
              <p className="text-xs text-slate-400 mt-1">عن الفترة الممتدة من {new Date(startDate).toLocaleDateString('ar-EG')} إلى {new Date(endDate).toLocaleDateString('ar-EG')}</p>
            </div>

            <div className="mt-6 space-y-4 text-sm font-semibold">
              {/* Revenue */}
              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                <span className="text-slate-600 dark:text-slate-300">أولاً: إيرادات مبيعات إكسسوارات الجوال</span>
                <span className="font-mono text-brand-blue font-bold">{formatCurrency(totalSalesRevenues)}</span>
              </div>

              {/* COGS */}
              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                <span className="text-slate-600 dark:text-slate-300">يطرح: تكلفة البضاعة المباعة (متوسط سعر الشراء)</span>
                <span className="font-mono text-rose-500">({formatCurrency(totalSalesCogsVal)})</span>
              </div>

              {/* Gross Profit */}
              <div className="flex justify-between items-center py-3 bg-slate-50 dark:bg-slate-900/40 px-3 rounded-xl">
                <span className="font-black text-slate-800 dark:text-white">إجمالي الأرباح التجارية (مجمل الربح)</span>
                <span className="font-black font-mono text-brand-green">{formatCurrency(grossProfitAmount)}</span>
              </div>

              {/* Expenses detail title */}
              <div className="pt-2 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-800 pb-1">
                ثانياً: المصروفات والبنود التشغيلية المستهلكة
              </div>

              {/* Categorized expenses list */}
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map(e => (
                  <div key={e.id} className="flex justify-between items-center py-1.5 px-3 text-xs text-slate-500 hover:bg-slate-50/20 dark:hover:bg-slate-900/20">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>مصروف: {e.category} ({e.description})</span>
                    </div>
                    <span className="font-mono text-rose-400">({formatCurrency(e.amount)})</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-400 py-3">لا توجد بنود مصروفات مسجلة للفترة</div>
              )}

              {/* Total Expenses */}
              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
                <span className="text-slate-600 dark:text-slate-300">إجمالي المصروفات التشغيلية والرواتب</span>
                <span className="font-mono text-rose-500">({formatCurrency(totalFilteredExpensesAmount)})</span>
              </div>

              {/* Net profit */}
              <div className="flex justify-between items-center py-4 bg-brand-blue/5 border border-brand-blue/15 px-4 rounded-xl mt-4">
                <span className="font-black text-base text-slate-800 dark:text-white">صافي الربح الفتري للنشاط</span>
                <span className={`font-black text-base font-mono ${netOperatingProfitAmount >= 0 ? 'text-brand-green dark:text-lime-400' : 'text-rose-500'}`}>
                  {formatCurrency(netOperatingProfitAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: DETAILED INVOICE PRINTER VIEW */}
      {/* ========================================================================= */}
      {selectedInvoice && !showReturnModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-xl overflow-hidden relative shadow-2xl p-6 border border-slate-200">
            {/* Modal Controls */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 no-print">
              <button
                onClick={() => window.print()}
                className="bg-brand-blue text-white hover:bg-blue-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
              >
                طباعة الفاتورة
              </button>
              <h3 className="font-bold text-sm">تفاصيل الفاتورة {selectedInvoice.invoiceNo}</h3>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* A4 Invoice Sheet Layout */}
            <div className="p-4 space-y-4 text-right" id="printable-receipt">
              <div className="text-center space-y-1">
                <h2 className="font-black text-xl text-slate-800">البدري تريد - Elbadry Trade</h2>
                <p className="text-xs text-slate-500">تجارة وتوزيع إكسسوارات الموبايل</p>
                <p className="text-[10px] text-slate-400">{selectedInvoice.branch}</p>
                <p className="text-[10px] text-slate-400 font-bold">سند تسليم بضاعة ومبيعات جملة</p>
              </div>

              <hr className="border-dashed border-slate-200" />

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">معلومات العميل</p>
                  <p className="font-bold mt-1">
                    {db.customers.find(c => c.id === selectedInvoice.customerId)?.name || "عميل نقدي"}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">
                    {db.customers.find(c => c.id === selectedInvoice.customerId)?.phone || ""}
                  </p>
                </div>
                <div className="text-left font-mono">
                  <p className="text-[10px] text-slate-400 font-bold text-right">تفاصيل الفاتورة</p>
                  <p className="font-bold mt-1 text-brand-blue">{selectedInvoice.invoiceNo}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(selectedInvoice.date).toLocaleString('ar-EG')}
                  </p>
                </div>
              </div>

              {/* Invoice items table */}
              <table className="w-full text-right border-collapse text-xs mt-4">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="py-2">اسم الصنف</th>
                    <th className="py-2 text-center">الكمية</th>
                    <th className="py-2 text-left">السعر</th>
                    <th className="py-2 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 text-slate-700">
                      <td className="py-2 font-bold">{item.name}</td>
                      <td className="py-2 text-center font-mono">{item.quantity}</td>
                      <td className="py-2 text-left font-mono">{formatCurrency(item.price)}</td>
                      <td className="py-2 text-left font-mono">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="space-y-1.5 text-xs max-w-xs mr-auto pt-4 font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-400">المجموع الفرعي</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>خصم ممنوح</span>
                    <span className="font-mono">({formatCurrency(selectedInvoice.discount)})</span>
                  </div>
                )}
                <hr className="border-slate-200" />
                <div className="flex justify-between text-brand-blue font-black text-sm">
                  <span>صافي المطلوب</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>

              <div className="text-center pt-6 text-[10px] text-slate-400 space-y-1">
                <p>شكراً لتعاملكم معنا. البضاعة المباعة لا ترد ولا تستبدل بعد 7 أيام.</p>
                <p className="font-bold text-slate-700 font-mono">طريقة الدفع: {selectedInvoice.paymentMethod === 'cash' ? 'نقدي (كاش)' : selectedInvoice.paymentMethod === 'card' ? 'بطاقة بنكية' : 'آجل (حساب مدين)'}</p>
                {selectedInvoice.returned && (
                  <div className="p-2 border border-rose-200 bg-rose-50 text-rose-600 rounded-xl font-bold mt-2 text-xs">
                    مرتجع: {selectedInvoice.returnReason || 'تم إرجاع البضاعة'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: RETURN INVOICE DIALOG */}
      {/* ========================================================================= */}
      {showReturnModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl p-6 border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-800 dark:text-white">إرجاع الفاتورة بالكامل</h3>
              <button 
                onClick={() => { setShowReturnModal(false); setSelectedInvoice(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-xs space-y-1 font-bold">
                <p>⚠️ تحذير محاسبي ومخزني مهم:</p>
                <p className="text-[10px] font-normal leading-relaxed mt-1">عند تأكيد الإرجاع، سيقوم النظام تلقائياً بإعادة كميات المنتجات المباعة في هذه الفاتورة إلى المخزن، وخصم قيمة الفاتورة من إجمالي مبيعات العميل ومن كشف الخزينة المالي، مع توليد قيد عكسي محاسبي تلقائي للحسابات العامة.</p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <p>الفاتورة المطلوب إرجاعها: <span className="font-bold font-mono text-brand-blue">{selectedInvoice.invoiceNo}</span></p>
                <p>إجمالي القيمة المالية: <span className="font-bold font-mono text-brand-green">{formatCurrency(selectedInvoice.total)}</span></p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">سبب إرجاع الفاتورة</label>
                <input 
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-xs rounded-xl py-2 px-3 text-right focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleReturnInvoiceConfirm}
                  className="flex-1 bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  تأكيد الإرجاع وتعديل الحسابات
                </button>
                <button
                  onClick={() => { setShowReturnModal(false); setSelectedInvoice(null); }}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
