import React, { useState, useEffect } from 'react';
import { 
  Settings as LucideSettings, 
  Building2, 
  Users, 
  Database, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  MessageSquareCode
} from 'lucide-react';
import { useDb } from '../context/DbContext';

const Settings = ({ darkMode }) => {
  const { 
    db, 
    currentBranch, 
    currentUser, 
    settings, 
    branches, 
    users, 
    changeBranch, 
    changeUser, 
    saveSettings,
    backupDatabase,
    restoreDatabase,
    resetDatabaseToDemo,
    addBranch,
    deleteBranch
  } = useDb();

  // Settings Fields Form State
  const [shopName, setShopName] = useState(settings.shopName || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [address, setAddress] = useState(settings.address || '');
  const [logoText, setLogoText] = useState(settings.logoText || 'Anker Etisal');
  const [vatRate, setVatRate] = useState(settings.vatRate || 15);
  const [currency, setCurrency] = useState(settings.currency || 'ر.س');
  const [whatsappTemplate, setWhatsappTemplate] = useState(settings.whatsappTemplate || '');

  // Notifications/Alerts States
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [showResetWarningModal, setShowResetWarningModal] = useState(false);
  const [showClearWarningModal, setShowClearWarningModal] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(null); // true/false/null
  const [newBranchName, setNewBranchName] = useState('');
  const [branchToDelete, setBranchToDelete] = useState(null);

  // Sync state if provider settings change
  useEffect(() => {
    if (settings) {
      setShopName(settings.shopName);
      setPhone(settings.phone);
      setAddress(settings.address);
      setLogoText(settings.logoText);
      setVatRate(settings.vatRate);
      setCurrency(settings.currency);
      setWhatsappTemplate(settings.whatsappTemplate);
    }
  }, [settings]);

  // Handle saving brand config
  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveSettings({
      shopName,
      phone,
      address,
      logoText,
      vatRate: Number(vatRate) || 0,
      currency,
      whatsappTemplate
    });
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
    }, 3000);
  };

  // Handle restoring database from file upload
  const handleRestoreUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = restoreDatabase(event.target.result);
      setRestoreSuccess(result);
      setTimeout(() => {
        setRestoreSuccess(null);
      }, 5000);
    };
    reader.readAsText(file);
  };

  // Trigger factory database wipe
  const handleClearDatabase = () => {
    const cleanDb = {
      categories: db?.categories || ["إكسسوارات"],
      branches: branches || ["الفرع الرئيسي - الرياض", "فرع جدة - شارع فلسطين", "فرع الدمام - حي الاتصالات"],
      suppliers: [],
      representatives: [
        { id: 'R-1', name: "أحمد منصور (مندوب الرياض)", phone: "0550000001", activeCollections: 0, totalSales: 0 },
        { id: 'R-2', name: "خالد الحربي (مندوب قطاع الشمال)", phone: "0550000002", activeCollections: 0, totalSales: 0 }
      ],
      customers: [
        { id: 'C-1', name: "عميل نقدي (كاش)", phone: "0500000000", email: "cash@elbadry.com", notes: "العميل الافتراضي للمعاملات النقدية السريعة", debt: 0, salesCount: 0, totalSales: 0, repId: 'R-1' }
      ],
      products: [],
      sales: [],
      purchases: [],
      expenses: [],
      treasury: {
        balance: 0,
        logs: []
      },
      journal: [],
      logs: [
        { id: 'L-' + Date.now(), timestamp: new Date().toISOString(), user: currentUser.name, role: currentUser.role, branch: currentBranch, action: 'تم تصفير وإفراغ قاعدة البيانات بالكامل' }
      ]
    };
    // Save to local storage
    localStorage.setItem('elbadry_trade_db', JSON.stringify(cleanDb));
    window.location.reload(); // Reload to refresh contexts cleanly
  };

  return (
    <div className="space-y-6 text-right font-cairo">
      {/* Page Header */}
      <div className="text-right">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">
          الإعدادات والصيانة
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          إدارة بيانات الهوية، تبديل الصلاحيات للتجربة الكاشير والمحاسب، وإجراء النسخ والتحميل لقاعدة البيانات
        </p>
      </div>

      {/* Save Settings Notification Toast */}
      {showSavedNotification && (
        <div className="bg-emerald-500 text-white font-bold text-xs p-4 rounded-xl flex items-center gap-2 max-w-sm mr-auto animate-bounce shadow-lg">
          <CheckCircle2 size={16} />
          <span>تم حفظ الإعدادات وهوية الشركة بنجاح!</span>
        </div>
      )}

      {/* Restore Notification Toast */}
      {restoreSuccess === true && (
        <div className="bg-emerald-500 text-white font-bold text-xs p-4 rounded-xl flex items-center gap-2 max-w-sm mr-auto shadow-lg">
          <CheckCircle2 size={16} />
          <span>تم استعادة قاعدة البيانات بنجاح وتحديث السجلات!</span>
        </div>
      )}
      {restoreSuccess === false && (
        <div className="bg-rose-500 text-white font-bold text-xs p-4 rounded-xl flex items-center gap-2 max-w-sm mr-auto shadow-lg">
          <AlertTriangle size={16} />
          <span>فشل الاستعادة! الملف المرفوع غير متوافق أو تالف.</span>
        </div>
      )}

      {/* Main Settings Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Main Forms (Shop Configuration & Branch/Roles Selection) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shop Identity Form */}
          <div className="glass p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-slate-800 dark:text-white">
              <LucideSettings className="text-brand-blue" size={20} />
              <h2 className="font-black text-base">إعدادات هوية المحل والفواتير</h2>
            </div>

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shop Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">اسم المؤسسة / المحل</label>
                <input 
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-blue text-right"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">رقم الهاتف / الواتساب</label>
                <input 
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-blue text-left font-mono"
                  required
                />
              </div>

              {/* Logo text */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">النص الجانبي للشعار (العلامة التجارية)</label>
                <input 
                  type="text"
                  value={logoText}
                  onChange={(e) => setLogoText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-blue text-right"
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">العنوان الجغرافي</label>
                <input 
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-blue text-right"
                  required
                />
              </div>

              {/* Vat Rate disabled note */}
              <div className="space-y-1 bg-slate-50 dark:bg-slate-800/20 p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 text-right flex flex-col justify-center">
                <label className="text-[10px] font-bold text-slate-400">ضريبة القيمة المضافة</label>
                <span className="text-xs font-black text-emerald-500 mt-1">توزيع خالي من الضرائب (0% معطّلة)</span>
              </div>

              {/* Currency */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">العملة التجارية</label>
                <input 
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-brand-blue text-right"
                  required
                />
              </div>

              {/* WhatsApp Invoice Template */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <MessageSquareCode size={12} />
                  <span>صيغة رسالة إرسال الفاتورة بالواتساب</span>
                </label>
                <textarea 
                  value={whatsappTemplate}
                  onChange={(e) => setWhatsappTemplate(e.target.value)}
                  rows="3"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-brand-blue text-right leading-relaxed"
                  placeholder="مرحباً {customer}... تفاصيل فاتورتك بقيمة {amount} {currency}."
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  * المتغيرات المتاحة: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{"{customer}"}</code> لاسم العميل، <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{"{invoiceNo}"}</code> لرقم الفاتورة، <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{"{amount}"}</code> للقيمة الكلية، <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{"{currency}"}</code> للعملة.
                </p>
              </div>

              <div className="sm:col-span-2 pt-2 text-left">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-brand-blue text-white hover:bg-blue-700 font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-blue-500/20"
                >
                  <Save size={14} />
                  <span>حفظ معلومات الفاتورة والشركة</span>
                </button>
              </div>
            </form>
          </div>

          {/* User Simulator & Branch Settings Panel */}
          <div className="glass p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-slate-800 dark:text-white">
              <Users className="text-brand-blue" size={20} />
              <h2 className="font-black text-base">محاكي صلاحيات الفروع والمستخدمين</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branches selection */}
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Building2 size={16} className="text-brand-green" />
                  <span>الفرع النشط حالياً</span>
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">بإمكانك التبديل بين الفروع لعرض مبيعاتها وإحصائياتها المنفصلة. يتم تحميل المخازن والخزن بناء على الفرع.</p>
                
                <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                  {branches.map(b => (
                    <div key={b} className="flex gap-2 items-center">
                      <button
                        onClick={() => changeBranch(b)}
                        className={`flex-1 flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all text-right
                          ${currentBranch === b 
                            ? 'border-brand-blue bg-brand-blue/5 text-brand-blue dark:border-blue-500/40 dark:bg-blue-500/10' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                      >
                        <span className="truncate">{b}</span>
                        {currentBranch === b && <span className="w-2 h-2 rounded-full bg-brand-blue dark:bg-blue-400 shrink-0"></span>}
                      </button>
                      
                      {branches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBranchToDelete(b)}
                          className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-slate-200 dark:border-slate-800 hover:border-rose-500/20 shrink-0"
                          title="حذف هذا الفرع"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add new branch input form */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  <p className="text-[10px] font-black text-slate-400">إضافة فرع تجاري جديد:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="مثال: فرع الخبر..."
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-200 text-xs rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-brand-blue text-right"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = newBranchName.trim();
                          if (val) {
                            addBranch(val);
                            setNewBranchName('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newBranchName.trim();
                        if (val) {
                          addBranch(val);
                          setNewBranchName('');
                        }
                      }}
                      className="bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm shrink-0"
                    >
                      إضافة
                    </button>
                  </div>
                </div>
              </div>

              {/* Users simulator selection */}
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Lock size={16} className="text-brand-green" />
                  <span>محاكاة دور وصلاحيات المستخدم</span>
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">اضغط على أي مستخدم لمحاكاة صلاحيات شاشات البرنامج. الكاشير لا يرى حسابات وأرباح، المحاسب لا يدخل POS الكاشير، الأدمن يرى كل شيء.</p>

                <div className="space-y-2 pt-1">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => changeUser(u.role)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all text-right
                        ${currentUser.role === u.role
                          ? 'border-brand-green bg-brand-green/5 text-brand-green dark:border-lime-500/40 dark:bg-lime-500/10' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{u.avatar}</span>
                        <div>
                          <p className="font-black">{u.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold -mt-0.5">الدور: {u.role}</p>
                        </div>
                      </div>
                      {currentUser.role === u.role && <span className="w-2 h-2 rounded-full bg-brand-green"></span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Database & Maintenance Controls */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-slate-800 dark:text-white">
              <Database className="text-brand-blue" size={20} />
              <h2 className="font-black text-base">صيانة وتصدير البيانات</h2>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              جميع العمليات والبيانات يتم حفظها تلقائياً بالكامل محلياً وبشكل أوفلاين في المتصفح. يمكنك نسخها أو تحميلها لضمان الأمان والنسخ الاحتياطي الدائم.
            </p>

            <div className="space-y-3 pt-2">
              {/* 1. Download Backup JSON */}
              <button
                onClick={backupDatabase}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-blue-500/10 hover:bg-brand-blue hover:text-white text-brand-blue font-bold text-xs transition-all shadow-sm group"
              >
                <div className="flex items-center gap-2">
                  <Download size={15} />
                  <span>تصدير نسخة احتياطية (JSON)</span>
                </div>
                <span className="text-[9px] font-normal text-slate-400 group-hover:text-white/80">تنزيل نسخة احتياطية</span>
              </button>

              {/* 2. Upload JSON Restore */}
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleRestoreUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="restore-file-upload"
                />
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-purple-500/10 hover:bg-purple-600 hover:text-white text-purple-600 dark:text-purple-400 font-bold text-xs transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-2">
                    <Upload size={15} />
                    <span>استيراد واستعادة بيانات (JSON)</span>
                  </div>
                  <span className="text-[9px] font-normal text-slate-400 group-hover:text-white/80 font-mono">رفع ملف</span>
                </button>
              </div>

              {/* 3. WIPE to Demo Data */}
              <button
                onClick={() => setShowResetWarningModal(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-brand-green/10 hover:bg-brand-green hover:text-white text-brand-green font-bold text-xs transition-all shadow-sm group"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw size={15} />
                  <span>توليد البيانات التجريبية الديمو</span>
                </div>
                <span className="text-[9px] font-normal text-slate-400 group-hover:text-white/80">إعادة تهيئة المحاكي</span>
              </button>

              {/* 4. CLEAR Database completely */}
              <button
                onClick={() => setShowClearWarningModal(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 font-bold text-xs transition-all shadow-sm group"
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={15} />
                  <span>تصفير وإفراغ قاعدة البيانات</span>
                </div>
                <span className="text-[9px] font-normal text-slate-400 group-hover:text-white/80">مسح كل السجلات</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. RESET TO DEMO DATA WARNING MODAL */}
      {/* ========================================================================= */}
      {showResetWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl p-6 border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-800 dark:text-white">تأكيد إعادة توليد البيانات التجريبية</h3>
              <button 
                onClick={() => setShowResetWarningModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3.5 rounded-xl text-xs space-y-1 font-bold">
                <p>⚠️ انتباه مهم:</p>
                <p className="text-[10px] font-normal leading-relaxed mt-1">عند الضغط على تأكيد، سيقوم النظام بمسح أي تعديلات قمت بها بالكامل، وسيقوم فوراً بتحميل وتوليد مجموعة بيانات تجريبية مكثفة واحترافية للغاية تحتوي على 11 منتج إكسسوار موبايل حقيقي، و 5 عملاء جملة وتجزئة، و 4 موردين مع سجل مالي مسبق من المبيعات والمشتريات والمصروفات والقيود اليومية المحاسبية لملء الرسومات والتقارير المالية للتقييم.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { resetDatabaseToDemo(); setShowResetWarningModal(false); }}
                  className="flex-1 bg-brand-green text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-brand-green/20 hover:bg-lime-600 transition-all"
                >
                  تأكيد وتوليد بيانات الديمو
                </button>
                <button
                  onClick={() => setShowResetWarningModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLEAR DATABASE WARNING MODAL */}
      {/* ========================================================================= */}
      {showClearWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl p-6 border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-800 dark:text-white">تحذير: تصفير وإفراغ النظام بالكامل</h3>
              <button 
                onClick={() => setShowClearWarningModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-xs space-y-1 font-bold animate-pulse">
                <p>🚨 إجراء غير قابل للتراجع ومخيف!</p>
                <p className="text-[10px] font-normal leading-relaxed mt-1">تأكيدك لهذا الأمر سوف يمسح بالكامل وبشكل كامل كافة المنتجات، وفواتير المبيعات، ومشتريات الموردين، والمصروفات، ويسفر حساب الخزينة المالية والقيود اليومية لتصبح 0.00 تماماً للبدء في استخدام النظام الفعلي للمحلات.</p>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">هل أنت متأكد من تصفير وإعادة تعيين النظام بالكامل؟ ننصحك بتنزيل نسخة احتياطية أولاً.</p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { handleClearDatabase(); setShowClearWarningModal(false); }}
                  className="flex-1 bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  تأكيد مسح وتصفير السجلات
                </button>
                <button
                  onClick={() => setShowClearWarningModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DELETE BRANCH WARNING MODAL */}
      {/* ========================================================================= */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl p-6 border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-800 dark:text-white">تأكيد حذف الفرع</h3>
              <button 
                onClick={() => setBranchToDelete(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-xs space-y-1 font-bold">
                <p>⚠️ انتباه مهم:</p>
                <p className="text-[10px] font-normal leading-relaxed mt-1">
                  هل أنت متأكد من رغبتك في حذف فرع "{branchToDelete}"؟ سيتم إزالته بالكامل من قائمة الفروع المتاحة في التطبيق.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    deleteBranch(branchToDelete);
                    setBranchToDelete(null);
                  }}
                  className="flex-1 bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  تأكيد الحذف
                </button>
                <button
                  onClick={() => setBranchToDelete(null)}
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

// Compact local cross icon mapping to avoid heavy external components
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

export default Settings;
