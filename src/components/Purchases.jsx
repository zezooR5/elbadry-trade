import React, { useState } from 'react';
import { 
  TrendingUp, 
  Search, 
  Plus, 
  Trash2, 
  UserPlus, 
  ShoppingCart, 
  CalendarDays,
  CheckCircle,
  FileText,
  X,
  Printer
} from 'lucide-react';
import { useDb } from '../context/DbContext';

const Purchases = () => {
  const { db, addPurchaseBill, addSupplier } = useDb();

  // State Management
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  
  // New Bill Form State
  const [supplierId, setSupplierId] = useState(db.suppliers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'debt'
  const [discount, setDiscount] = useState(0);
  const [billItems, setBillItems] = useState([]);
  
  // Selection Helper
  const [selectedProductId, setSelectedProductId] = useState(db.products[0]?.id || '');
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedCost, setSelectedCost] = useState(db.products[0]?.buyPrice || 0);

  // Helper: Format Currency
  const formatCurrency = (val) => {
    return Number(val).toLocaleString('ar-EG') + ' ' + db.treasury.currency;
  };

  // Add Item to Bill
  const handleAddItemToBill = () => {
    const prod = db.products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const existingIndex = billItems.findIndex(item => item.productId === selectedProductId);
    if (existingIndex > -1) {
      const updatedItems = [...billItems];
      updatedItems[existingIndex].quantity += Number(selectedQty);
      updatedItems[existingIndex].price = Number(selectedCost);
      setBillItems(updatedItems);
    } else {
      setBillItems([...billItems, {
        productId: selectedProductId,
        name: prod.name,
        price: Number(selectedCost),
        quantity: Number(selectedQty),
      }]);
    }

    // Reset selectors
    setSelectedQty(1);
  };

  // Handle Product selector switch
  const handleProductSelectChange = (e) => {
    const id = e.target.value;
    setSelectedProductId(id);
    const prod = db.products.find(p => p.id === id);
    if (prod) {
      setSelectedCost(prod.buyPrice);
    }
  };

  const handleRemoveFromBill = (productId) => {
    setBillItems(billItems.filter(item => item.productId !== productId));
  };

  // Calculations
  const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxableAmount = Math.max(0, subtotal - Number(discount));
  const vatRate = db.treasury.vatRate || 15;
  const taxAmount = Math.round((taxableAmount * (vatRate / 100)) * 100) / 100;
  const total = taxableAmount + taxAmount;

  // Submit Bill
  const handleSubmitBill = (e) => {
    e.preventDefault();
    if (billItems.length === 0) {
      alert("يرجى إضافة سلع للفاتورة أولاً!");
      return;
    }

    addPurchaseBill(billItems, supplierId, paymentMethod, discount);
    
    // Reset Form
    setBillItems([]);
    setDiscount(0);
    setActiveTab('list');
  };

  // Filtered Purchases History List
  const filteredPurchases = db.purchases.filter(p => {
    const supplier = db.suppliers.find(s => s.id === p.supplierId);
    return p.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
           supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">
            فواتير المشتريات
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            تسجيل فواتير البضاعة الواردة من الموردين وتحديث تكلفة المخزون وحساب الديون تلقائياً.
          </p>
        </div>
        <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs font-bold shrink-0 shadow-sm">
          <button 
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2.5 transition-colors ${activeTab === 'new' ? 'bg-brand-blue text-white' : 'bg-white dark:bg-slate-900 text-slate-500'}`}
          >
            <Plus size={14} className="inline mr-1" /> تسجيل فاتورة شراء جديدة
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 transition-colors ${activeTab === 'list' ? 'bg-brand-blue text-white' : 'bg-white dark:bg-slate-900 text-slate-500'}`}
          >
            سجل المشتريات
          </button>
        </div>
      </div>

      {/* ==========================================
          TAB 1: PURCHASES RECORD
      ========================================== */}
      {activeTab === 'list' && (
        <div className="space-y-4 text-right">
          {/* Search bar */}
          <div className="glass p-4 rounded-2xl flex items-center relative shadow-sm">
            <input 
              type="text"
              placeholder="ابحث برقم الفاتورة أو اسم المورد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
            />
            <Search size={16} className="absolute left-7 text-slate-400" />
          </div>

          {/* History Table */}
          <div className="glass rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-[#121929]/20">
                    <th className="py-3 px-3">رقم الفاتورة</th>
                    <th className="py-3 px-3">التاريخ</th>
                    <th className="py-3 px-3">المورد</th>
                    <th className="py-3 px-3">طريقة الدفع</th>
                    <th className="py-3 px-3">المجموع</th>
                    <th className="py-3 px-3">عدد السلع</th>
                    <th className="py-3 px-3 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length > 0 ? (
                    filteredPurchases.map((p) => {
                      const supp = db.suppliers.find(s => s.id === p.supplierId);
                      return (
                        <tr 
                          key={p.id} 
                          className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50/40 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-3.5 px-3 font-mono font-bold text-brand-blue">{p.billNo}</td>
                          <td className="py-3.5 px-3">
                            {new Date(p.date).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-3 font-bold">{supp ? supp.name : 'مورد غير مسجل'}</td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px]
                              ${p.paymentMethod === 'cash' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                              {p.paymentMethod === 'cash' ? 'نقدي' : 'آجل / دين'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-black font-mono">{formatCurrency(p.total)}</td>
                          <td className="py-3.5 px-3 font-bold">{p.items.reduce((sum, item) => sum + item.quantity, 0)} قطع</td>
                          <td className="py-3.5 px-3 text-center">
                            <button 
                              onClick={() => {
                                setSelectedBill(p);
                                setShowBillModal(true);
                              }}
                              className="text-slate-400 hover:text-brand-blue p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                              title="معاينة محتويات الفاتورة"
                            >
                              <FileText size={16} className="mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-12 text-slate-400 text-xs text-center">لا توجد فواتير مشتريات مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: REGISTER NEW BILL
      ========================================== */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-right">
          {/* Form input fields & Items Grid (8/12 width) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Choose Supplier & payment */}
            <div className="glass p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm items-end">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">طريقة الدفع *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-right outline-none"
                >
                  <option value="cash">دفع كاش / نقدي</option>
                  <option value="debt">شراء آجل / حساب ديون</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">المورد *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-right outline-none"
                >
                  {db.suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ''}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 shrink-0 mb-1 pb-1">
                <span>تأثير المخزن: <strong>تلقائي فوري</strong></span>
              </div>
            </div>

            {/* Quick Add Product Form inside Bill */}
            <div className="glass p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-sm items-end">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">تكلفة الحبة *</label>
                <input 
                  type="number" min="0.1" step="any"
                  value={selectedCost}
                  onChange={(e) => setSelectedCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">الكمية *</label>
                <input 
                  type="number" min="1"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">المنتج بالمخزن *</label>
                <select
                  value={selectedProductId}
                  onChange={handleProductSelectChange}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-right outline-none"
                >
                  {db.products.map(p => <option key={p.id} value={p.id}>{p.name} (موجود: {p.quantity})</option>)}
                </select>
              </div>

              <button 
                type="button"
                onClick={handleAddItemToBill}
                className="py-2.5 bg-brand-green text-white font-bold text-xs rounded-xl shadow-lg shadow-lime-500/10 hover:bg-lime-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={16} /> إضافة سريعة للفاتورة
              </button>
            </div>

            {/* Bill items grid */}
            <div className="glass rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">بضاعة الفاتورة الواردة</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold">
                      <th className="py-2.5 px-3">المنتج</th>
                      <th className="py-2.5 px-3 text-center">تكلفة الحبة</th>
                      <th className="py-2.5 px-3 text-center">الكمية</th>
                      <th className="py-2.5 px-3 text-left">المجموع</th>
                      <th className="py-2.5 px-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.length > 0 ? (
                      billItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 text-xs hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 px-3 font-semibold">{item.name}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">{formatCurrency(item.price)}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">{item.quantity} حبات</td>
                          <td className="py-2.5 px-3 text-left font-mono font-black text-slate-800 dark:text-white">
                            {formatCurrency(item.price * item.quantity)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button 
                              onClick={() => handleRemoveFromBill(item.productId)}
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-500/10 rounded"
                            >
                              <Trash2 size={12} className="mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-8 text-slate-400 text-xs text-center">يرجى اختيار وإضافة منتجات من النموذج أعلاه</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Checkout column (4/12 width) */}
          <div className="lg:col-span-4 glass rounded-2xl p-5 flex flex-col justify-between shadow-md h-fit">
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              ملخص فاتورة الشراء
            </h3>

            <div className="mt-4 space-y-4">
              <div className="flex gap-2 items-center justify-between">
                <input 
                  type="number" placeholder="0.00"
                  value={discount || ''}
                  min="0"
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-28 text-center py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold"
                />
                <span className="text-xs font-bold text-slate-400">الخصم المباشر:</span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 font-semibold">
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                  <span>المجموع الفرعي:</span>
                </div>
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-xs text-rose-500">
                    <span className="font-mono">-{formatCurrency(discount)}</span>
                    <span>الخصم المطبق:</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="font-mono">{formatCurrency(taxAmount)}</span>
                  <span>ضريبة مدخلات ({vatRate}%):</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-800 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-2">
                  <span className="font-mono text-brand-blue dark:text-blue-400">{formatCurrency(total)}</span>
                  <span>الإجمالي الضريبي:</span>
                </div>
              </div>

              <button
                onClick={handleSubmitBill}
                disabled={billItems.length === 0}
                className="w-full mt-4 py-3 bg-brand-blue text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.01] disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={16} />
                <span>حفظ واعتماد فاتورة الشراء</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          DYNAMIC PURCHASES INVOICE PRINT MODAL
      ========================================== */}
      {showBillModal && selectedBill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-[#121929] border border-slate-200 dark:border-slate-850 w-full max-w-md rounded-2xl p-5 shadow-2xl relative text-right flex flex-col my-8">
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <button 
                onClick={() => { setShowBillModal(false); setSelectedBill(null); }}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
              >
                <X size={14} />
              </button>
              <h3 className="font-black text-sm text-slate-800 dark:text-white">تفاصيل فاتورة الشراء الواردة</h3>
            </div>

            {/* Simulated Printed Area (Thermal style) */}
            <div 
              id="print-area" 
              className="bg-white text-slate-900 p-4 border border-slate-200 rounded-xl shadow-inner font-mono text-xs space-y-4 max-h-[350px] overflow-y-auto text-right tracking-tight font-cairo bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
            >
              {/* Header */}
              <div className="text-center space-y-1.5 flex flex-col items-center">
                {/* Sleek CSS Store Logo Badge */}
                <div className="flex items-center gap-1 bg-slate-950 text-white px-3 py-1.5 rounded-xl shadow-md border border-slate-800 select-none">
                  <span className="font-extrabold text-[11px] tracking-tight text-blue-400">Elbadry</span>
                  <span className="font-extrabold text-[11px] text-lime-400">Trade</span>
                </div>
                <h4 className="font-extrabold text-sm tracking-tight text-slate-850 mt-1">{db.treasury.shopName}</h4>
                <p className="text-[9px] text-slate-500 leading-normal">{db.treasury.address}</p>
                <p className="text-[9px] text-slate-500 font-mono">هاتف: {db.treasury.phone}</p>
                <div className="border-b border-dashed border-slate-400 w-full py-1"></div>
              </div>

              {/* Invoice details */}
              <div className="space-y-1 text-right text-[10px]">
                <p><strong>رقم الفاتورة:</strong> <span className="font-bold text-brand-blue">{selectedBill.billNo}</span></p>
                <p><strong>التاريخ:</strong> {new Date(selectedBill.date).toLocaleString('ar-EG')}</p>
                <p><strong>المورد:</strong> {db.suppliers.find(s => s.id === selectedBill.supplierId)?.name || 'مورد غير مسجل'}</p>
                <p><strong>طريقة الدفع:</strong> {selectedBill.paymentMethod === 'cash' ? 'نقدي' : 'آجل / دين'}</p>
                <div className="border-b border-dashed border-slate-400 py-1"></div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-400 font-bold">
                    <th className="pb-1">الصنف</th>
                    <th className="pb-1 text-center">التكلفة</th>
                    <th className="pb-1 text-center">الكمية</th>
                    <th className="pb-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-1 max-w-[150px] truncate">{item.name}</td>
                      <td className="py-1 text-center font-bold">{item.quantity} حبة</td>
                      <td className="py-1 text-center font-mono">{formatCurrency(item.price)}</td>
                      <td className="py-1 text-left font-mono">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculation Summary */}
              <div className="space-y-1 text-[10px] border-t border-dashed border-slate-400 pt-2 font-bold">
                <div className="flex justify-between">
                  <span className="font-mono">
                    {formatCurrency(selectedBill.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                  </span>
                  <span>المجموع الفرعي:</span>
                </div>
                {selectedBill.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span className="font-mono">-{formatCurrency(selectedBill.discount)}</span>
                    <span>الخصم المطبق:</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-mono">
                    {formatCurrency(
                      Math.round(
                        (Math.max(0, selectedBill.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) - selectedBill.discount) * ((db.treasury.vatRate || 15) / 100)) * 100
                      ) / 100
                    )}
                  </span>
                  <span>ضريبة مدخلات ({db.treasury.vatRate || 15}%):</span>
                </div>
                <div className="flex justify-between text-xs font-black border-t border-slate-400 pt-1">
                  <span className="font-mono text-brand-blue">{formatCurrency(selectedBill.total)}</span>
                  <span>الإجمالي الضريبي:</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 border-t border-dashed border-slate-400">
                <p className="text-[9px] font-bold text-slate-500">فاتورة شراء بضاعة واردة - نظام البدري</p>
              </div>
            </div>

            {/* Printable button */}
            <div className="mt-4">
              <button 
                onClick={() => window.print()}
                className="w-full py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={14} /> طباعة فاتورة المشتريات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
