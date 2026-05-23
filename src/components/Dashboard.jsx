import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  ShoppingBag,
  ArrowUpRight,
  Package,
  CalendarDays,
  FileText
} from 'lucide-react';
import { useDb } from '../context/DbContext';

const Dashboard = ({ setActiveTab, darkMode }) => {
  const { db, currentBranch } = useDb();

  // Helper: Format Currency
  const formatCurrency = (val) => {
    return Number(val).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' ' + db.treasury.currency;
  };

  // Filter transactions by active branch
  const activeBranchSales = db.sales.filter(s => s.branch === currentBranch);
  const activeBranchPurchases = db.purchases.filter(p => p.branch === currentBranch);
  const activeBranchExpenses = db.expenses.filter(e => e.branch === currentBranch);

  // ==========================================
  // KPI CALCULATIONS
  // ==========================================
  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = new Date().toISOString().slice(0, 7);

  // Daily Sales
  const dailySales = activeBranchSales
    .filter(s => !s.returned && s.date.startsWith(todayStr))
    .reduce((sum, s) => sum + s.total, 0);

  // Monthly Sales
  const monthlySales = activeBranchSales
    .filter(s => !s.returned && s.date.startsWith(thisMonthStr))
    .reduce((sum, s) => sum + s.total, 0);

  // Monthly Expenses
  const monthlyExpenses = activeBranchExpenses
    .filter(e => e.date.startsWith(thisMonthStr))
    .reduce((sum, e) => sum + e.amount, 0);

  // Monthly Profit
  const monthlyProfit = activeBranchSales
    .filter(s => !s.returned && s.date.startsWith(thisMonthStr))
    .reduce((sum, s) => sum + (s.profit || 0), 0) - monthlyExpenses;

  // Stock Alerts Count
  const stockAlerts = db.products.filter(p => p.quantity <= p.minStock);

  // ==========================================
  // CHART DATA GENERATION (Last 5 Days)
  // ==========================================
  const last5Days = [...Array(5)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (4 - i));
    return d.toISOString().slice(0, 10);
  }).reverse(); // Latest to oldest, then we reverse back

  const chartData = [...last5Days].reverse().map(dateStr => {
    const daySales = activeBranchSales
      .filter(s => !s.returned && s.date.startsWith(dateStr))
      .reduce((sum, s) => sum + s.total, 0);
    const dayProfit = activeBranchSales
      .filter(s => !s.returned && s.date.startsWith(dateStr))
      .reduce((sum, s) => sum + (s.profit || 0), 0);
    
    // Format date string for display (e.g. "22 مايو")
    const dateObj = new Date(dateStr);
    const label = dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    
    return { label, sales: daySales, profit: dayProfit };
  });

  // Calculate SVG Chart coordinates
  const maxVal = Math.max(...chartData.map(d => Math.max(d.sales, d.profit, 500)));
  const chartHeight = 220;
  const chartWidth = 500;
  const padding = 30;

  const pointsSales = chartData.map((d, i) => {
    const x = padding + (i * (chartWidth - padding * 2) / (chartData.length - 1));
    const y = chartHeight - padding - (d.sales * (chartHeight - padding * 2) / maxVal);
    return { x, y };
  });

  const pointsProfit = chartData.map((d, i) => {
    const x = padding + (i * (chartWidth - padding * 2) / (chartData.length - 1));
    const y = chartHeight - padding - (d.profit * (chartHeight - padding * 2) / maxVal);
    return { x, y };
  });

  const pathSales = pointsSales.length > 0 
    ? `M ${pointsSales[0].x} ${pointsSales[0].y} ` + pointsSales.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const pathProfit = pointsProfit.length > 0 
    ? `M ${pointsProfit[0].x} ${pointsProfit[0].y} ` + pointsProfit.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaSales = pointsSales.length > 0 
    ? `${pathSales} L ${pointsSales[pointsSales.length - 1].x} ${chartHeight - padding} L ${pointsSales[0].x} ${chartHeight - padding} Z`
    : '';

  const areaProfit = pointsProfit.length > 0 
    ? `${pathProfit} L ${pointsProfit[pointsProfit.length - 1].x} ${chartHeight - padding} L ${pointsProfit[0].x} ${chartHeight - padding} Z`
    : '';

  // ==========================================
  // BEST SELLERS (Calculated dynamically)
  // ==========================================
  const productSalesMap = {};
  activeBranchSales.filter(s => !s.returned).forEach(s => {
    s.items.forEach(item => {
      productSalesMap[item.productId] = (productSalesMap[item.productId] || 0) + item.quantity;
    });
  });

  const bestSellers = Object.keys(productSalesMap)
    .map(id => {
      const prod = db.products.find(p => p.id === id);
      return {
        name: prod ? prod.name : 'منتج غير معروف',
        category: prod ? prod.category : 'إكسسوارات',
        quantity: productSalesMap[id],
        image: prod?.image || null
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 4);

  const maxBestSellerQty = bestSellers.length > 0 ? bestSellers[0].quantity : 1;

  // Recent 5 Invoices
  const recentInvoices = activeBranchSales.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome & Branch Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">
            مرحباً بك في لوحة التحكم
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            متابعة فورية لنشاط وأرقام فرع: <span className="font-bold text-brand-blue dark:text-blue-400">{currentBranch}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-green"></span>
          </span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">النظام متصل ويعمل بسلاسة</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Daily Sales */}
        <div className={`glass p-5 rounded-2xl flex items-center justify-between transition-transform duration-300 hover:scale-[1.02] shadow-sm`}>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">المبيعات اليومية</p>
            <h3 className="text-xl md:text-2xl font-black mt-2 text-slate-800 dark:text-white">
              {formatCurrency(dailySales)}
            </h3>
            <p className="text-[10px] text-brand-green font-bold mt-1.5 flex items-center gap-1">
              <TrendingUp size={12} />
              <span>مبيعات اليوم المسجلة</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-brand-blue dark:text-blue-400 flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
        </div>

        {/* KPI 2: Monthly Sales */}
        <div className={`glass p-5 rounded-2xl flex items-center justify-between transition-transform duration-300 hover:scale-[1.02] shadow-sm`}>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">مبيعات الشهر الحالي</p>
            <h3 className="text-xl md:text-2xl font-black mt-2 text-slate-800 dark:text-white">
              {formatCurrency(monthlySales)}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
              <CalendarDays size={12} />
              <span>لشهر {new Date().toLocaleDateString('ar-EG', { month: 'long' })}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* KPI 3: Net Profit */}
        <div className={`glass p-5 rounded-2xl flex items-center justify-between transition-transform duration-300 hover:scale-[1.02] shadow-sm`}>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">صافي الأرباح الشهري</p>
            <h3 className={`text-xl md:text-2xl font-black mt-2 ${monthlyProfit >= 0 ? 'text-brand-green dark:text-lime-400' : 'text-rose-500'}`}>
              {formatCurrency(monthlyProfit)}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
              <DollarSign size={12} />
              <span>مخصوم منه المصروفات</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-brand-green dark:text-lime-400 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>

        {/* KPI 4: Inventory Alert */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className={`glass p-5 rounded-2xl flex items-center justify-between transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-sm
            ${stockAlerts.length > 0 ? 'ring-1 ring-rose-500/30 bg-rose-500/5' : ''}`}
        >
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">نواقص المخزن</p>
            <h3 className={`text-xl md:text-2xl font-black mt-2 ${stockAlerts.length > 0 ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
              {stockAlerts.length} منتجات
            </h3>
            <p className="text-[10px] font-bold mt-1.5 flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <AlertTriangle size={12} className={stockAlerts.length > 0 ? 'text-rose-500' : ''} />
              <span>تحت حد المخزون الأدنى</span>
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center
            ${stockAlerts.length > 0 ? 'bg-rose-500/15 text-rose-500' : 'bg-slate-500/10 text-slate-500'}`}>
            <Package size={24} />
          </div>
        </div>
      </div>

      {/* Low Stock Alerts (Toast-like container if any exist) */}
      {stockAlerts.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-right">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <div>
              <p className="font-bold text-sm">تنبيه حرج لنقص الكميات!</p>
              <p className="text-xs mt-0.5">يوجد {stockAlerts.length} منتجات انخفضت كميتها في المخزن عن الحد المسموح به. يرجى مراجعة وتعديل كميات المخزن أو طلبها من المورد.</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('inventory')}
            className="bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-colors shrink-0"
          >
            عرض النواقص بالمخزن
          </button>
        </div>
      )}

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column (2 cols width) */}
        <div className="glass p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="text-right">
              <h2 className="font-black text-lg text-slate-800 dark:text-white">إحصائيات المبيعات والأرباح</h2>
              <p className="text-xs text-slate-400 mt-0.5">تحليل المبيعات وصافي الأرباح لآخر 5 أيام</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-brand-blue dark:text-blue-400">
                <span className="w-3 h-3 rounded-full bg-brand-blue"></span> المبيعات
              </span>
              <span className="flex items-center gap-1.5 text-brand-green dark:text-lime-400">
                <span className="w-3 h-3 rounded-full bg-brand-green"></span> الأرباح
              </span>
            </div>
          </div>

          {/* Custom SVG Trend Chart */}
          <div className="relative w-full h-[230px] mt-6 flex justify-center items-center">
            {chartData.length > 0 ? (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  {/* Gradients */}
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E40AF" stopOpacity="0.25"/>
                    <stop offset="95%" stopColor="#1E40AF" stopOpacity="0.0"/>
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#84CC16" stopOpacity="0.25"/>
                    <stop offset="95%" stopColor="#84CC16" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[...Array(5)].map((_, idx) => {
                  const y = padding + (idx * (chartHeight - padding * 2) / 4);
                  const gridVal = Math.round(maxVal - (idx * maxVal / 4));
                  return (
                    <g key={idx} className="opacity-40 dark:opacity-20">
                      <line 
                        x1={padding} 
                        y1={y} 
                        x2={chartWidth - padding} 
                        y2={y} 
                        stroke={darkMode ? '#475569' : '#94a3b8'} 
                        strokeWidth="0.5" 
                        strokeDasharray="4"
                      />
                      {/* Gridline labels */}
                      <text 
                        x={padding - 5} 
                        y={y + 3} 
                        textAnchor="end" 
                        fill={darkMode ? '#94a3b8' : '#64748b'} 
                        className="text-[8px] font-bold font-mono"
                      >
                        {gridVal}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis Labels */}
                {chartData.map((d, i) => {
                  const x = padding + (i * (chartWidth - padding * 2) / (chartData.length - 1));
                  return (
                    <text 
                      key={i} 
                      x={x} 
                      y={chartHeight - 10} 
                      textAnchor="middle" 
                      fill={darkMode ? '#94a3b8' : '#64748b'} 
                      className="text-[9px] font-bold"
                    >
                      {d.label}
                    </text>
                  );
                })}

                {/* Shading Areas */}
                <path d={areaSales} fill="url(#salesGrad)" />
                <path d={areaProfit} fill="url(#profitGrad)" />

                {/* Chart Lines */}
                <path d={pathSales} fill="none" stroke="#1E40AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d={pathProfit} fill="none" stroke="#84CC16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points / Circles */}
                {pointsSales.map((p, idx) => (
                  <g key={`s-${idx}`}>
                    <circle cx={p.x} cy={p.y} r="5" fill={darkMode ? '#0B0F19' : '#fff'} stroke="#1E40AF" strokeWidth="2" />
                    <circle cx={p.x} cy={p.y} r="2" fill="#1E40AF" />
                    {/* Tooltip Value */}
                    <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#1E40AF" className="text-[8px] font-black font-mono">
                      {chartData[idx].sales > 0 ? chartData[idx].sales : ''}
                    </text>
                  </g>
                ))}

                {pointsProfit.map((p, idx) => (
                  <g key={`p-${idx}`}>
                    <circle cx={p.x} cy={p.y} r="5" fill={darkMode ? '#0B0F19' : '#fff'} stroke="#84CC16" strokeWidth="2" />
                    <circle cx={p.x} cy={p.y} r="2" fill="#84CC16" />
                    {/* Tooltip Value */}
                    <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#84CC16" className="text-[8px] font-black font-mono">
                      {chartData[idx].profit > 0 ? chartData[idx].profit : ''}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <p className="text-slate-400 text-xs">لا تتوفر مبيعات سابقة لعرضها</p>
            )}
          </div>
        </div>

        {/* Top Products Component */}
        <div className="glass p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <h2 className="font-black text-lg text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 text-right">
              الأكثر مبيعاً
            </h2>
            <div className="mt-4 space-y-4">
              {bestSellers.length > 0 ? (
                bestSellers.map((item, idx) => (
                  <div key={idx} className="space-y-1.5 text-right">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">{item.category}</span>
                      <span className="text-slate-700 dark:text-slate-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-brand-blue shrink-0 min-w-8 text-left">
                        {item.quantity} قطع
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                        <div 
                          className="h-full rounded-full bg-brand-blue" 
                          style={{ width: `${(item.quantity / maxBestSellerQty) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs text-center py-8">لم يتم بيع أي منتج حتى الآن</p>
              )}
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('pos')}
            className="w-full flex items-center justify-center gap-2 mt-6 bg-brand-blue text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.01]"
          >
            <span>فتح الكاشير POS وتوصيل المبيعات</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Latest Invoices Table */}
      <div className="glass p-5 rounded-2xl shadow-sm text-right">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-black text-lg text-slate-800 dark:text-white">آخر الفواتير المسجلة</h2>
            <p className="text-xs text-slate-400 mt-0.5">ملخص آخر 5 عمليات مبيعات في الفرع</p>
          </div>
          <button 
            onClick={() => setActiveTab('reports')}
            className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-blue-700"
          >
            <span>عرض كل الفواتير</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold">
                <th className="py-3 px-2">رقم الفاتورة</th>
                <th className="py-3 px-2">التاريخ</th>
                <th className="py-3 px-2">العميل</th>
                <th className="py-3 px-2">طريقة الدفع</th>
                <th className="py-3 px-2">الإجمالي</th>
                <th className="py-3 px-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length > 0 ? (
                recentInvoices.map((inv) => {
                  const customer = db.customers.find(c => c.id === inv.customerId);
                  return (
                    <tr 
                      key={inv.id} 
                      className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3.5 px-2 font-mono font-bold text-brand-blue">{inv.invoiceNo}</td>
                      <td className="py-3.5 px-2">
                        {new Date(inv.date).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-2 font-semibold">{customer ? customer.name : 'عميل افتراضي'}</td>
                      <td className="py-3.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px]
                          ${inv.paymentMethod === 'cash' ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20' : ''}
                          ${inv.paymentMethod === 'card' ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20' : ''}
                          ${inv.paymentMethod === 'debt' ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20' : ''}
                        `}>
                          {inv.paymentMethod === 'cash' ? 'نقدي' : ''}
                          {inv.paymentMethod === 'card' ? 'بطاقة' : ''}
                          {inv.paymentMethod === 'debt' ? 'آجل / دين' : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 font-black font-mono">{formatCurrency(inv.total)}</td>
                      <td className="py-3.5 px-2">
                        {inv.returned ? (
                          <span className="text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full text-[10px]">
                            مرتجع
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                            مكتملة
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-slate-400 text-xs text-center">لا توجد مبيعات مسجلة حتى الآن</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
