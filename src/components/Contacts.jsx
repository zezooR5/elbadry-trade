import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  DollarSign, 
  CalendarDays,
  FileText,
  CreditCard,
  X,
  TrendingUp,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { useDb } from '../context/DbContext';

const Contacts = () => {
  const { 
    db, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier,
    payCustomerDebt,
    paySupplierDebt,
    addRepresentative,
    deleteRepresentative,
    settleRepCollection
  } = useDb();

  // State Management
  const [activeTab, setActiveTab] = useState('representatives'); // 'representatives', 'customers', or 'suppliers'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [showAddSuppModal, setShowAddSuppModal] = useState(false);
  const [showAddRepModal, setShowAddRepModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);

  // Forms
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', notes: '', debt: 0, repId: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', company: '', email: '', debt: 0 });
  const [repForm, setRepForm] = useState({ name: '', phone: '' });
  
  // Selected Profile for Actions
  const [selectedContact, setSelectedContact] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleError, setSettleError] = useState('');

  // Custom Confirmation Dialog State
  const [confirmState, setConfirmState] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const triggerConfirm = (title, message, callback) => {
    setConfirmState({
      show: true,
      title,
      message,
      onConfirm: () => {
        callback();
        setConfirmState(prev => ({ ...prev, show: false }));
      }
    });
  };

  // Helper: Format Currency
  const formatCurrency = (val) => {
    return Number(val).toLocaleString('ar-EG') + ' ' + db.treasury.currency;
  };

  // Representatives Filtering
  const filteredReps = (db.representatives || []).filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.phone && r.phone.includes(searchTerm))
  );

  // Customers Filtering
  const filteredCustomers = db.customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  // Suppliers Filtering
  const filteredSuppliers = db.suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.company && s.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Submit Quick Add Customer
  const handleCustSubmit = (e) => {
    e.preventDefault();
    const finalForm = {
      ...customerForm,
      repId: customerForm.repId || db.representatives[0]?.id || 'R-1'
    };
    addCustomer(finalForm);
    setShowAddCustModal(false);
    setCustomerForm({ name: '', phone: '', email: '', notes: '', debt: 0, repId: '' });
  };

  // Submit Quick Add Supplier
  const handleSuppSubmit = (e) => {
    e.preventDefault();
    addSupplier(supplierForm);
    setShowAddSuppModal(false);
    setSupplierForm({ name: '', phone: '', company: '', email: '', debt: 0 });
  };

  // Open Payment dialog (Pay debt / Receive debt)
  const handleOpenPayment = (contact) => {
    setSelectedContact(contact);
    setPaymentAmount('');
    setPaymentError('');
    setShowPaymentModal(true);
  };

  // Submit Payment Registry
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(paymentAmount);
    if (!val || val <= 0) {
      setPaymentError("يرجى إدخال مبلغ دفع صالح!");
      return;
    }

    if (val > selectedContact.debt) {
      setPaymentError(`عذراً، لا يمكن سداد مبلغ أكبر من الدين المستحق الحالي وهو ${formatCurrency(selectedContact.debt)}!`);
      return;
    }

    if (activeTab === 'customers') {
      payCustomerDebt(selectedContact.id, val);
    } else {
      paySupplierDebt(selectedContact.id, val);
    }

    setShowPaymentModal(false);
    setSelectedContact(null);
    setPaymentError('');
  };

  // Generate Customer / Supplier Statement of Account (كشف حساب تفصيلي)
  const generateStatement = (contact) => {
    // Collect transactions relating to this contact
    let transactions = [];
    if (activeTab === 'customers') {
      // Find invoices of this customer
      db.sales.filter(s => s.customerId === contact.id).forEach(s => {
        transactions.push({
          date: s.date,
          type: 'فاتورة مبيعات',
          reference: s.invoiceNo,
          debit: s.paymentMethod === 'debt' ? s.total : 0, // Customer owes us (Debit)
          credit: s.paymentMethod !== 'debt' ? s.total : 0, // Customer paid instantly (Credit)
          method: s.paymentMethod === 'cash' ? 'نقدي' : s.paymentMethod === 'card' ? 'شبكة' : 'آجل',
          total: s.total
        });
      });
      // Find direct journal entries or logs that match customer sidad (e.g. debt payments)
      db.journal.filter(j => j.description.includes(contact.name)).forEach(j => {
        const payEntry = j.entries.find(e => e.account === 'حساب مدينين (العملاء)' && e.type === 'credit');
        if (payEntry) {
          transactions.push({
            date: j.date,
            type: 'دفعة سداد حساب',
            reference: j.reference,
            debit: 0,
            credit: payEntry.amount,
            method: 'نقدي (خزينة)',
            total: payEntry.amount
          });
        }
      });
    } else {
      // Suppliers statement
      db.purchases.filter(p => p.supplierId === contact.id).forEach(p => {
        transactions.push({
          date: p.date,
          type: 'فاتورة شراء بضاعة',
          reference: p.billNo,
          debit: p.paymentMethod !== 'debt' ? p.total : 0, // We paid instantly (Debit)
          credit: p.paymentMethod === 'debt' ? p.total : 0, // We owe supplier (Credit)
          method: p.paymentMethod === 'cash' ? 'نقدي' : 'آجل',
          total: p.total
        });
      });
      db.journal.filter(j => j.description.includes(contact.name)).forEach(j => {
        const payEntry = j.entries.find(e => e.account === 'حساب دائنين (الموردين)' && e.type === 'debit');
        if (payEntry) {
          transactions.push({
            date: j.date,
            type: 'سداد دفعة للمورد',
            reference: j.reference,
            debit: payEntry.amount,
            credit: 0,
            method: 'نقدي (خزينة)',
            total: payEntry.amount
          });
        }
      });
    }

    // Sort by date (oldest to newest)
    return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const handleOpenStatement = (contact) => {
    setSelectedContact(contact);
    setShowStatementModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white font-cairo">
            دليل التوزيع والاتصالات
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            إدارة الحسابات للمناديب، المحلات والعملاء، والموردين مع متابعة المبيعات والديون والتسويات المالية.
          </p>
        </div>
        <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs font-bold shrink-0 shadow-sm">
          <button 
            onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); }}
            className={`px-4 py-2.5 transition-colors ${activeTab === 'suppliers' ? 'bg-brand-blue text-white' : 'bg-white dark:bg-slate-900 text-slate-500'}`}
          >
            الموردين ({db.suppliers.length})
          </button>
          <button 
            onClick={() => { setActiveTab('customers'); setSearchTerm(''); }}
            className={`px-4 py-2.5 transition-colors ${activeTab === 'customers' ? 'bg-brand-blue text-white' : 'bg-white dark:bg-slate-900 text-slate-500'}`}
          >
            المحلات والعملاء ({db.customers.length})
          </button>
          <button 
            onClick={() => { setActiveTab('representatives'); setSearchTerm(''); }}
            className={`px-4 py-2.5 transition-colors ${activeTab === 'representatives' ? 'bg-brand-blue text-white' : 'bg-white dark:bg-slate-900 text-slate-500'}`}
          >
            المناديب ({db.representatives?.length || 0})
          </button>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm text-right font-cairo">
        {/* Search */}
        <div className="w-full md:w-5/12 flex items-center relative">
          <input 
            type="text"
            placeholder={activeTab === 'representatives' ? "ابحث عن مندوب بالاسم أو الجوال..." : activeTab === 'customers' ? "ابحث عن محل بالاسم أو رقم الهاتف..." : "ابحث عن مورد بالاسم، الشركة أو الهاتف..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none font-semibold font-cairo"
          />
          <Search size={16} className="absolute left-3 text-slate-400" />
        </div>

        {/* Add Actions */}
        <button 
          onClick={() => activeTab === 'representatives' ? setShowAddRepModal(true) : activeTab === 'customers' ? setShowAddCustModal(true) : setShowAddSuppModal(true)}
          className="px-4 py-2.5 bg-brand-blue text-white hover:bg-blue-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
        >
          <Plus size={16} /> 
          {activeTab === 'representatives' ? 'إضافة مندوب جديد' : activeTab === 'customers' ? 'إضافة عميل/محل جديد' : 'إضافة مورد جديد'}
        </button>
      </div>

      {/* ==========================================
          REPRESENTATIVES (المناديب) TABLE
      ========================================== */}
      {activeTab === 'representatives' && (
        <div className="glass rounded-2xl shadow-sm text-right overflow-hidden animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-[#121929]/20">
                  <th className="py-3 px-3">اسم المندوب</th>
                  <th className="py-3 px-3">رقم الجوال</th>
                  <th className="py-3 px-3">إجمالي مبيعاته</th>
                  <th className="py-3 px-3">عهدة النقدية المعلقة</th>
                  <th className="py-3 px-3 text-center">العمليات</th>
                </tr>
              </thead>
              <tbody>
                {filteredReps.length > 0 ? (
                  filteredReps.map((r) => (
                    <tr 
                      key={r.id} 
                      className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50/40 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-white">{r.name}</td>
                      <td className="py-3.5 px-3 font-mono font-bold">{r.phone || '-'}</td>
                      <td className="py-3.5 px-3 font-mono font-black text-brand-blue dark:text-blue-400">
                        {formatCurrency(r.totalSales || 0)}
                      </td>
                      <td className="py-3.5 px-3 font-mono">
                        <span className={`font-black px-2 py-0.5 rounded-full text-[10px]
                          ${r.activeCollections > 0 ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {formatCurrency(r.activeCollections || 0)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          {r.activeCollections > 0 && (
                            <button 
                              onClick={() => {
                                setSelectedContact(r);
                                setSettleAmount(r.activeCollections);
                                setSettleError('');
                                setShowSettleModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                              title="توريد الكاش في عهدة المندوب للخزينة"
                            >
                              <DollarSign size={10} /> توريد نقدية للمكتب
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              triggerConfirm(
                                "حذف حساب المندوب",
                                `هل أنت متأكد من رغبتك في حذف المندوب "${r.name}" نهائياً؟ سيتم إلغاء ربطه بالمحلات.`,
                                () => deleteRepresentative(r.id)
                              );
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-500/10 rounded-lg animate-fadeIn"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-slate-400 text-xs text-center">لا توجد سجلات مناديب مطابقة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          CUSTOMERS TABLE
      ========================================== */}
      {activeTab === 'customers' && (
        <div className="glass rounded-2xl shadow-sm text-right overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-[#121929]/20">
                  <th className="py-3 px-3">الاسم والمحل</th>
                  <th className="py-3 px-3">المندوب المسؤول</th>
                  <th className="py-3 px-3">الهاتف</th>
                  <th className="py-3 px-3">إجمالي المبيعات</th>
                  <th className="py-3 px-3 text-center">عدد الفواتير</th>
                  <th className="py-3 px-3">الديون المستحقة</th>
                  <th className="py-3 px-3 text-center">العمليات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <tr 
                      key={c.id} 
                      className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50/40 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-800 dark:text-white">{c.name}</p>
                        {c.notes && <span className="text-[10px] text-slate-400 block mt-0.5">{c.notes}</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800 dark:text-white px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600">
                          {db.representatives?.find(r => r.id === c.repId)?.name || 'غير محدد'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold">{c.phone || '-'}</td>
                      <td className="py-3.5 px-3 font-mono font-black">{formatCurrency(c.totalSales || 0)}</td>
                      <td className="py-3.5 px-3 text-center font-bold">{c.salesCount || 0} فواتير</td>
                      <td className="py-3.5 px-3 font-mono">
                        <span className={`font-black px-2 py-0.5 rounded-full text-[10px]
                          ${c.debt > 0 ? 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {formatCurrency(c.debt || 0)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          {c.debt > 0 && (
                            <button 
                              onClick={() => handleOpenPayment(c)}
                              className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                              title="تسجيل دفعة سداد دين"
                            >
                              <DollarSign size={10} /> سداد دين
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenStatement(c)}
                            className="px-2.5 py-1.5 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="عرض كشف حساب تفصيلي"
                          >
                            <FileText size={10} /> كشف حساب
                          </button>
                          {c.id !== 'C-1' && (
                            <button 
                              onClick={() => {
                                triggerConfirm(
                                  "حذف حساب العميل",
                                  `هل أنت متأكد من رغبتك في حذف العميل "${c.name}" نهائياً من النظام؟ سيتم حذف بياناته وسجله ولكن الفواتير السابقة ستبقى مسجلة محاسبياً.`,
                                  () => deleteCustomer(c.id)
                                );
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-slate-400 text-xs text-center">لا توجد سجلات عملاء مطابقة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          SUPPLIERS TABLE
      ========================================== */}
      {activeTab === 'suppliers' && (
        <div className="glass rounded-2xl shadow-sm text-right overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-[#121929]/20">
                  <th className="py-3 px-3">اسم المورد</th>
                  <th className="py-3 px-3">الشركة</th>
                  <th className="py-3 px-3">الهاتف</th>
                  <th className="py-3 px-3 text-center">عدد فواتير المشتريات</th>
                  <th className="py-3 px-3">الديون المستحقة له</th>
                  <th className="py-3 px-3 text-center">العمليات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((s) => (
                    <tr 
                      key={s.id} 
                      className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50/40 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-800 dark:text-white">{s.name}</p>
                        {s.email && <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{s.email}</span>}
                      </td>
                      <td className="py-3.5 px-3 font-semibold">{s.company || '-'}</td>
                      <td className="py-3.5 px-3 font-mono font-bold">{s.phone || '-'}</td>
                      <td className="py-3.5 px-3 text-center font-bold">{s.billsCount || 0} فواتير</td>
                      <td className="py-3.5 px-3 font-mono">
                        <span className={`font-black px-2 py-0.5 rounded-full text-[10px]
                          ${s.debt > 0 ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {formatCurrency(s.debt || 0)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          {s.debt > 0 && (
                            <button 
                              onClick={() => handleOpenPayment(s)}
                              className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                              title="تسجيل دفعة سداد مديونية مورد"
                            >
                              <DollarSign size={10} /> دفع مستحقات
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenStatement(s)}
                            className="px-2.5 py-1.5 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="عرض كشف حساب تفصيلي"
                          >
                            <FileText size={10} /> كشف حساب
                          </button>
                          <button 
                            onClick={() => {
                              triggerConfirm(
                                "حذف حساب المورد",
                                `هل أنت متأكد من رغبتك في حذف المورد "${s.name}" (${s.company}) نهائياً من النظام؟ سيتم حذف بياناته وسجله ولكن فواتير المشتريات السابقة ستبقى مسجلة محاسبياً.`,
                                () => deleteSupplier(s.id)
                              );
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-500/10 rounded-lg"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-slate-400 text-xs text-center">لا توجد سجلات موردين مطابقة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          ADD CUSTOMER MODAL
      ========================================== */}
      {showAddCustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-right">
            <button 
              onClick={() => setShowAddCustModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              إضافة عميل جديد
            </h3>

            <form onSubmit={handleCustSubmit} className="mt-4 space-y-4 font-semibold text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">اسم العميل بالكامل / المحل *</label>
                <input 
                  type="text" required placeholder="اكتب اسم العميل أو المحل..."
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">المندوب المسؤول عن المحل *</label>
                <select
                  value={customerForm.repId}
                  onChange={(e) => setCustomerForm({ ...customerForm, repId: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none font-bold"
                >
                  <option value="">-- اختر المندوب --</option>
                  {db.representatives?.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">رقم الجوال</label>
                <input 
                  type="text" placeholder="مثال: 0500000000..."
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">البريد الإلكتروني</label>
                <input 
                  type="email" placeholder="example@mail.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">رصيد ديون افتتاحي (إن وجد)</label>
                <input 
                  type="number" min="0" placeholder="0.00"
                  value={customerForm.debt || ''}
                  onChange={(e) => setCustomerForm({ ...customerForm, debt: parseFloat(e.target.value) || 0 })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">وصف أو ملاحظات العميل</label>
                <input 
                  type="text" placeholder="مثال: يشتري بسعر الجملة..."
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors mt-2"
              >
                إضافة وحفظ العميل
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ADD SUPPLIER MODAL
      ========================================== */}
      {showAddSuppModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-right">
            <button 
              onClick={() => setShowAddSuppModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              إضافة مورد جديد
            </h3>

            <form onSubmit={handleSuppSubmit} className="mt-4 space-y-4 font-semibold text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">اسم المورد أو المسؤول *</label>
                <input 
                  type="text" required placeholder="مثال: أحمد الحربي..."
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">اسم الشركة / المؤسسة *</label>
                <input 
                  type="text" required placeholder="مثال: مجموعة أنكر تريد..."
                  value={supplierForm.company}
                  onChange={(e) => setSupplierForm({ ...supplierForm, company: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">رقم الهاتف</label>
                <input 
                  type="text" placeholder="0500000000"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">البريد الإلكتروني</label>
                <input 
                  type="email" placeholder="anker@supply.com"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">رصيد ديون مستحقة له سابقاً (إن وجدت)</label>
                <input 
                  type="number" min="0" placeholder="0.00"
                  value={supplierForm.debt || ''}
                  onChange={(e) => setSupplierForm({ ...supplierForm, debt: parseFloat(e.target.value) || 0 })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors mt-2"
              >
                إضافة وحفظ المورد
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          PAYMENT RECORD MODAL (سداد ديون)
      ========================================== */}
      {showPaymentModal && selectedContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-right">
            <button 
              onClick={() => { setShowPaymentModal(false); setSelectedContact(null); }}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              تسجيل دفعة سداد مالي
            </h3>

            <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl space-y-1.5 text-right font-semibold text-xs text-slate-600 dark:text-slate-350">
              <p>الاسم: <strong>{selectedContact.name}</strong></p>
              {selectedContact.company && <p>الشركة: <strong>{selectedContact.company}</strong></p>}
              <p>إجمالي الدين الحالي: <strong className="text-rose-500 font-mono">{formatCurrency(selectedContact.debt)}</strong></p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-4 font-semibold text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">المبلغ المدفوع *</label>
                <input 
                  type="number" required min="1" max={selectedContact.debt} step="any"
                  placeholder="أدخل قيمة الدفعة المسددة..."
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-right font-mono outline-none animate-fadeIn"
                />
              </div>

              {paymentError && (
                <div className="bg-rose-500/10 text-rose-550 dark:text-rose-400 p-3 rounded-xl text-[11px] font-bold text-center border border-rose-500/20 leading-relaxed">
                  {paymentError}
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-2.5 bg-emerald-505 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors mt-2"
              >
                تأكيد سداد المبلغ وتحديث الأرصدة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ACCOUNT STATEMENT DETAIL MODAL (كشف حساب تفصيلي)
      ========================================== */}
      {showStatementModal && selectedContact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="glass w-full max-w-3xl rounded-2xl p-5 shadow-2xl relative text-right flex flex-col my-8">
            <button 
              onClick={() => { setShowStatementModal(false); setSelectedContact(null); }}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            
            {/* Statement Header */}
            <div id="print-area" className="space-y-4 bg-white text-black p-4 rounded-xl">
              <div className="text-center space-y-1">
                <h2 className="font-extrabold text-base text-slate-800">{db.treasury.shopName}</h2>
                <h3 className="font-black text-sm text-slate-700 pb-1 border-b border-dashed border-slate-300">
                  كشف حساب مالي تفصيلي
                </h3>
              </div>

              {/* Profile Details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-right text-slate-600 border-b pb-3">
                <div className="space-y-1">
                  <p>الاسم: <strong>{selectedContact.name}</strong></p>
                  {selectedContact.company && <p>الشركة: <strong>{selectedContact.company}</strong></p>}
                  <p>رقم الهاتف: {selectedContact.phone || '-'}</p>
                </div>
                <div className="space-y-1 text-left">
                  <p>تاريخ إصدار الكشف: {new Date().toLocaleDateString('ar-EG')}</p>
                  <p className="text-sm font-black text-rose-500">الرصيد/الدين المستحق المتبقي: {formatCurrency(selectedContact.debt)}</p>
                </div>
              </div>

              {/* Transactions logs table */}
              <div className="overflow-x-auto mt-4 text-right">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-400 font-bold bg-slate-50 text-[10px]">
                      <th className="py-2 px-1">التاريخ</th>
                      <th className="py-2 px-1">نوع الحركة</th>
                      <th className="py-2 px-1 text-center">المرجع</th>
                      <th className="py-2 px-1 text-center">طريقة المعاملة</th>
                      <th className="py-2 px-1 text-left">مدين (سحب)</th>
                      <th className="py-2 px-1 text-left">دائن (دفع)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generateStatement(selectedContact).length > 0 ? (
                      generateStatement(selectedContact).map((tx, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="py-2 px-1">{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                          <td className="py-2 px-1 font-bold">{tx.type}</td>
                          <td className="py-2 px-1 text-center font-mono font-bold">{tx.reference}</td>
                          <td className="py-2 px-1 text-center">{tx.method}</td>
                          <td className="py-2 px-1 text-left font-mono font-bold text-rose-600">
                            {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                          </td>
                          <td className="py-2 px-1 text-left font-mono font-bold text-emerald-600">
                            {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-400">لا تتوفر حركات مالية مسجلة سابقاً لهذا الاسم</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Statement Footer */}
              <div className="pt-3 border-t border-dashed border-slate-400 text-left font-black text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="font-mono text-rose-600">
                    {formatCurrency(generateStatement(selectedContact).reduce((sum, t) => sum + t.debit, 0))}
                  </span>
                  <span>إجمالي عمليات السحب/الفواتير المفتوحة:</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-emerald-600">
                    {formatCurrency(generateStatement(selectedContact).reduce((sum, t) => sum + t.credit, 0))}
                  </span>
                  <span>إجمالي المدفوعات/الأقساط المسددة:</span>
                </div>
                <div className="flex justify-between border-t border-slate-400 pt-1.5 text-sm font-extrabold text-rose-600">
                  <span className="font-mono">{formatCurrency(selectedContact.debt)}</span>
                  <span>صافي الديون المستحقة الحالية:</span>
                </div>
              </div>
            </div>

            {/* Print action trigger */}
            <div className="mt-4 flex gap-3 no-print">
              <button 
                onClick={() => window.print()}
                className="w-full py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={14} className="hidden" /> طباعة كشف الحساب التفصيلي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          REPRESENTATIVE CASH SETTLEMENT MODAL (توريد نقدية)
      ========================================== */}
      {showSettleModal && selectedContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-right animate-scaleUp">
            <button 
              onClick={() => { setShowSettleModal(false); setSelectedContact(null); }}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              توريد نقدية عهدة المندوب إلى الخزينة
            </h3>

            <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl space-y-1.5 text-right font-semibold text-xs text-slate-600 dark:text-slate-350">
              <p>المندوب: <strong>{selectedContact.name}</strong></p>
              <p>الكاش المتوفر بعهدته حالياً: <strong className="text-amber-600 font-mono">{formatCurrency(selectedContact.activeCollections)}</strong></p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const val = parseFloat(settleAmount);
              if (!val || val <= 0) {
                setSettleError("يرجى إدخال مبلغ توريد صالح!");
                return;
              }
              if (val > selectedContact.activeCollections) {
                setSettleError(`عذراً، لا يمكن توريد مبلغ أكبر من الكاش المتوفر حالياً بعهدته وهو ${formatCurrency(selectedContact.activeCollections)}!`);
                return;
              }
              settleRepCollection(selectedContact.id, val);
              setShowSettleModal(false);
              setSelectedContact(null);
            }} className="mt-4 space-y-4 font-semibold text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">المبلغ المورد للخزينة الرئيسية *</label>
                <input 
                  type="number" required min="1" max={selectedContact.activeCollections} step="any"
                  placeholder="أدخل قيمة المبلغ المستلم كاش..."
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              {settleError && (
                <div className="bg-rose-500/10 text-rose-550 dark:text-rose-400 p-3 rounded-xl text-[11px] font-bold text-center border border-rose-500/20 leading-relaxed">
                  {settleError}
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors mt-2"
              >
                تأكيد استلام النقدية وتوريدها للخزينة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          ADD REPRESENTATIVE MODAL
      ========================================== */}
      {showAddRepModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-right animate-scaleUp">
            <button 
              onClick={() => setShowAddRepModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              إضافة مندوب مبيعات جديد
            </h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              addRepresentative(repForm);
              setShowAddRepModal(false);
              setRepForm({ name: '', phone: '' });
            }} className="mt-4 space-y-4 font-semibold text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">اسم المندوب بالكامل *</label>
                <input 
                  type="text" required placeholder="اكتب اسم المندوب..."
                  value={repForm.name}
                  onChange={(e) => setRepForm({ ...repForm, name: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">رقم جوال المندوب</label>
                <input 
                  type="text" placeholder="مثال: 0550000001..."
                  value={repForm.phone}
                  onChange={(e) => setRepForm({ ...repForm, phone: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors mt-2"
              >
                إضافة وحفظ المندوب
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmState.show && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden relative shadow-2xl p-6 border border-slate-200 dark:border-slate-800 text-right animate-scaleUp">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-rose-500 shrink-0" size={18} />
                <span>{confirmState.title}</span>
              </h3>
              <button 
                onClick={() => setConfirmState(prev => ({ ...prev, show: false }))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-bold">{confirmState.message}</p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { if (confirmState.onConfirm) confirmState.onConfirm(); }} className="flex-1 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all">تأكيد الحذف</button>
                <button onClick={() => setConfirmState(prev => ({ ...prev, show: false }))} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">إلغاء الأمر</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
