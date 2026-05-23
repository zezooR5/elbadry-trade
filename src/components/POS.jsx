import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Barcode, 
  Trash2, 
  UserPlus, 
  Plus, 
  Minus, 
  Printer, 
  Share2, 
  X,
  CreditCard,
  Banknote,
  AlertCircle,
  ShoppingCart,
  AlertTriangle
} from 'lucide-react';
import { useDb } from '../context/DbContext';

const POS = () => {
  const { db, addSalesInvoice, addCustomer } = useDb();

  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(db.customers[0]?.id || '');
  const [selectedRepId, setSelectedRepId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'card', 'debt'
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('value'); // 'value', 'percent'
  
  // Modals & Popups
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState(null);
  
  // Quick Add Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const barcodeInputRef = useRef(null);

  // Custom Confirmation Dialog State
  const [confirmState, setConfirmState] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: 'موافق',
    cancelText: 'إلغاء',
    isAlert: false,
    onConfirm: null
  });

  const triggerConfirm = (title, message, callback, confirmText = 'موافق', cancelText = 'إلغاء') => {
    setConfirmState({
      show: true,
      title,
      message,
      confirmText,
      cancelText,
      isAlert: false,
      onConfirm: () => {
        callback();
        setConfirmState(prev => ({ ...prev, show: false }));
      }
    });
  };

  const triggerAlert = (title, message) => {
    setConfirmState({
      show: true,
      title,
      message,
      confirmText: 'موافق',
      cancelText: '',
      isAlert: true,
      onConfirm: () => {
        setConfirmState(prev => ({ ...prev, show: false }));
      }
    });
  };

  // Helper: Format Currency
  const formatCurrency = (val) => {
    return Number(val).toFixed(2) + ' ' + db.treasury.currency;
  };

  // Simulating Barcode Auto-Scan Addition
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeSearch.trim()) return;
    
    const matchedProduct = db.products.find(p => p.barcode === barcodeSearch.trim() || p.code === barcodeSearch.trim());
    
    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeSearch('');
    } else {
      triggerAlert("تنبيه", `عذراً، لم يتم العثور على منتج بالكود/الباركود: ${barcodeSearch}`);
      setBarcodeSearch('');
    }
  };

  // Focus barcode scan input on startup
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Sync selected representative based on customer choice
  useEffect(() => {
    const customer = db.customers.find(c => c.id === selectedCustomerId);
    if (customer && customer.repId) {
      setSelectedRepId(customer.repId);
    } else if (db.representatives && db.representatives.length > 0) {
      setSelectedRepId(db.representatives[0].id);
    }
  }, [selectedCustomerId, db.representatives, db.customers]);

  // Filtered Products List
  const filteredProducts = db.products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.barcode.includes(searchTerm);
    
    const matchesCategory = activeCategory === 'الكل' || product.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Cart Operations
  const addToCart = (product) => {
    if (product.quantity <= 0) {
      triggerAlert("نفاد الكمية", "عذراً، هذا المنتج غير متوفر في المخزن حالياً (نفدت الكمية)!");
      return;
    }

    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.quantity) {
        triggerAlert("الكمية غير كافية", `عذراً، أقصى كمية متوفرة في المخزن لهذا المنتج هي ${product.quantity} قطع!`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      // Default to wholesale price for Wholesaler ERP
      setCart([...cart, { ...product, quantity: 1, price: product.wholesalePrice || product.sellPrice }]);
    }
  };

  const updateCartQty = (productId, amount) => {
    const product = db.products.find(p => p.id === productId);
    const existingIndex = cart.findIndex(item => item.id === productId);
    if (existingIndex === -1 || !product) return;

    const newQty = cart[existingIndex].quantity + amount;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > product.quantity) {
      triggerAlert("الكمية غير كافية", `عذراً، أقصى كمية متوفرة في المخزن لهذا المنتج هي ${product.quantity} قطع!`);
      return;
    }

    const updatedCart = [...cart];
    updatedCart[existingIndex].quantity = newQty;
    setCart(updatedCart);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    triggerConfirm(
      "تفريغ السلة",
      "هل أنت متأكد من رغبتك في إفراغ سلة الشراء بالكامل؟",
      () => {
        setCart([]);
        setDiscount(0);
      },
      "تأكيد التفريغ",
      "إلغاء الأمر"
    );
  };

  // ==========================================
  // CALCULATE BALANCES
  // ==========================================
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const discountAmount = discountType === 'value' 
    ? Number(discount) || 0 
    : (subtotal * (Number(discount) || 0)) / 100;

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const vatRate = 0; // Disable VAT completely
  const taxAmount = 0;
  const total = taxableAmount;

  // Checkout process
  const handleCheckout = () => {
    if (cart.length === 0) {
      triggerAlert("سلة فارغة", "سلة الشراء فارغة! يرجى إضافة بعض المنتجات أولاً.");
      return;
    }

    // Debt safety checks
    const customer = db.customers.find(c => c.id === selectedCustomerId);
    if (paymentMethod === 'debt' && (!customer || customer.id === 'C-1')) {
      triggerAlert("خطأ في الدفع", "عذراً، لا يمكن البيع الآجل (الدين) للعميل النقدي الافتراضي. يرجى اختيار عميل مسجل أو إضافة عميل جديد أولاً!");
      return;
    }

    const processInvoice = () => {
      // Trigger Db sales invoice generator with selectedRepId
      const invoice = addSalesInvoice(cart, selectedCustomerId, paymentMethod, discountAmount, selectedRepId);
      
      // Save invoice to preview receipt
      setNewInvoice(invoice);
      setShowReceiptModal(true);
      
      // Reset Cart
      setCart([]);
      setDiscount(0);
    };

    if (paymentMethod === 'debt') {
      triggerConfirm(
        "تأكيد بيع آجل (دين)",
        `تنبيه: سيتم إضافة مبلغ قدره ${formatCurrency(total)} كـ ديون مسحوبة على حساب العميل: "${customer.name}". هل تود المتابعة؟`,
        processInvoice,
        "تأكيد وتسجيل الدين",
        "إلغاء الأمر"
      );
    } else {
      processInvoice();
    }
  };

  // Quick Customer Creation
  const handleQuickAddCustomer = (e) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      triggerAlert("حقل مطلوب", "يرجى إدخال اسم العميل!");
      return;
    }
    const customer = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: '',
      notes: 'تمت إضافته سريعاً عبر نافذة الكاشير'
    });
    setSelectedCustomerId(customer.id);
    setNewCustName('');
    setNewCustPhone('');
    setShowAddCustomerModal(false);
  };

  // Receipt Printing Trigger
  const handlePrintReceipt = () => {
    window.print();
  };

  // WhatsApp share generator
  const getWhatsAppLink = () => {
    if (!newInvoice) return '';
    const customer = db.customers.find(c => c.id === newInvoice.customerId);
    const phone = customer?.phone || '';
    if (!phone) return '';
    
    // Format text
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = db.treasury.whatsappTemplate
      .replace('{customer}', customer.name)
      .replace('{invoiceNo}', newInvoice.invoiceNo)
      .replace('{amount}', newInvoice.total)
      .replace('{currency}', db.treasury.currency);
      
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-130px)] select-none">
      {/* Right Column: POS Products Grid (8/12 width) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full overflow-hidden space-y-4">
        {/* Barcode Scanner & Search panel */}
        <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
          {/* Barcode scanner emulator */}
          <form onSubmit={handleBarcodeSubmit} className="w-full md:w-5/12 flex items-center relative">
            <input 
              ref={barcodeInputRef}
              type="text"
              placeholder="امسح الباركود أو اكتب الكود واضغط Enter..."
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-sm focus:ring-1 focus:ring-brand-blue text-right font-mono"
            />
            <Barcode size={18} className="absolute left-3 text-slate-400" />
          </form>

          {/* Normal Search input */}
          <div className="w-full md:w-7/12 flex items-center relative">
            <input 
              type="text"
              placeholder="ابحث عن منتج بالاسم، الكود، الباركود..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-sm focus:ring-1 focus:ring-brand-blue text-right"
            />
            <Search size={18} className="absolute left-3 text-slate-400" />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar shrink-0">
          {['الكل', ...db.categories].map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0
                ${activeCategory === cat 
                  ? 'bg-brand-blue text-white shadow-md' 
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 dark:bg-[#121929] dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((prod) => (
                <div 
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className={`glass rounded-2xl p-3 flex flex-col justify-between cursor-pointer border hover:border-brand-blue transition-all duration-200 text-right shadow-sm select-none relative group
                    ${prod.quantity <= 0 ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                >
                  {/* Stock Quantity Badge */}
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full
                    ${prod.quantity <= prod.minStock 
                      ? 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20' 
                      : 'bg-slate-500/10 text-slate-500 dark:bg-slate-500/20'}`}>
                    مخزون: {prod.quantity}
                  </span>

                  {/* Product Category */}
                  <span className="text-[9px] font-bold text-slate-400 block pt-4">{prod.category}</span>
                  
                  {/* Product Name */}
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white mt-1 line-clamp-2 h-8">
                    {prod.name}
                  </h4>

                  {/* Pricing info */}
                  <div className="mt-4 flex flex-col gap-0.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>قطاعي: {formatCurrency(prod.sellPrice)}</span>
                      <span className="font-mono" title="كود المنتج">{prod.code}</span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">جملة</span>
                      <span className="font-black text-xs text-brand-blue dark:text-blue-400">
                        {formatCurrency(prod.wholesalePrice || prod.sellPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
              <Barcode size={48} className="text-slate-300 dark:text-slate-700 animate-pulse" />
              <p className="text-slate-500 dark:text-slate-400 font-bold mt-4">لا توجد منتجات مطابقة لخيارات البحث!</p>
              <p className="text-slate-400 text-xs mt-1">تأكد من كتابة الاسم أو الباركود بطريقة صحيحة.</p>
            </div>
          )}
        </div>
      </div>

      {/* Left Column: POS Cart Panel (4/12 width) */}
      <div className="lg:col-span-5 xl:col-span-4 glass rounded-2xl p-4 flex flex-col h-full overflow-hidden shadow-md">
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <button 
            onClick={clearCart}
            disabled={cart.length === 0}
            className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 disabled:opacity-40"
          >
            <Trash2 size={14} /> إفراغ السلة
          </button>
          <div className="text-right">
            <h3 className="font-black text-sm text-slate-800 dark:text-white">سلة المبيعات</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">يحتوي الكاشير على {cart.length} منتج فريد</p>
          </div>
        </div>

        {/* Cart Products List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2.5">
          {cart.length > 0 ? (
            cart.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 text-right"
              >
                {/* Remove button */}
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-slate-400 hover:text-rose-500 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X size={14} />
                </button>

                {/* Pricing sum */}
                <div className="text-left min-w-16">
                  <p className="text-xs font-black font-mono text-slate-800 dark:text-white">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{formatCurrency(item.price)}</p>
                </div>

                {/* Adjust Quantities */}
                <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  <button 
                    onClick={() => updateCartQty(item.id, 1)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    <Plus size={12} />
                  </button>
                  <span className="px-2.5 text-xs font-black font-mono min-w-6 text-center">
                    {item.quantity}
                  </span>
                  <button 
                    onClick={() => updateCartQty(item.id, -1)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    <Minus size={12} />
                  </button>
                </div>

                {/* Product Name */}
                <div className="flex-1 min-w-0 pr-1">
                  <h5 className="font-bold text-xs text-slate-800 dark:text-white truncate" title={item.name}>
                    {item.name}
                  </h5>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 block">
                    {item.category}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
              <ShoppingCart size={40} className="text-slate-300 dark:text-slate-700 animate-bounce" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-3">سلة الكاشير فارغة تماماً!</p>
              <p className="text-slate-400 text-[10px] mt-1">ابدأ بمسح باركود منتج أو اختياره من القائمة لإضافته هنا.</p>
            </div>
          )}
        </div>

        {/* Cart Calculations & Checkout Block */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3 shrink-0">
          {/* Customer Selection & Quick Add */}
          <div className="flex gap-2 items-center justify-between">
            <button 
              onClick={() => setShowAddCustomerModal(true)}
              className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
              title="إضافة عميل سريع"
            >
              <UserPlus size={16} />
            </button>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs font-bold text-right outline-none"
            >
              {db.customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
              ))}
            </select>
            <span className="text-[10px] font-bold text-slate-400 shrink-0">المحل/العميل:</span>
          </div>

          {/* Representative Selection */}
          <div className="flex gap-2 items-center justify-between">
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs font-bold text-right outline-none"
            >
              {db.representatives?.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <span className="text-[10px] font-bold text-slate-400 shrink-0">المندوب:</span>
          </div>

          {/* Discount Field */}
          <div className="flex gap-2 items-center justify-between">
            <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-[10px] font-bold">
              <button 
                onClick={() => setDiscountType('percent')}
                className={`px-2.5 py-1.5 transition-colors ${discountType === 'percent' ? 'bg-brand-blue text-white' : 'bg-white dark:bg-slate-950 text-slate-500'}`}
              >
                %
              </button>
              <button 
                onClick={() => setDiscountType('value')}
                className={`px-2.5 py-1.5 transition-colors ${discountType === 'value' ? 'bg-brand-blue text-white' : 'bg-white dark:bg-slate-950 text-slate-500'}`}
              >
                قيمة
              </button>
            </div>
            
            <input 
              type="number"
              placeholder="0.00"
              value={discount || ''}
              min="0"
              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 text-center py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold"
            />
            <span className="text-[10px] font-bold text-slate-400 shrink-0">الخصم:</span>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`py-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all
                ${paymentMethod === 'cash' 
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 font-black ring-1 ring-emerald-500/30' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'}`}
            >
              <Banknote size={16} />
              <span>نقدي / كاش</span>
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`py-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all
                ${paymentMethod === 'card' 
                  ? 'border-blue-500 bg-blue-500/5 text-blue-600 font-black ring-1 ring-blue-500/30' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'}`}
            >
              <CreditCard size={16} />
              <span>مدى / شبكة</span>
            </button>
            <button
              onClick={() => setPaymentMethod('debt')}
              className={`py-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all
                ${paymentMethod === 'debt' 
                  ? 'border-amber-500 bg-amber-500/5 text-amber-600 font-black ring-1 ring-amber-500/30' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'}`}
            >
              <AlertCircle size={16} />
              <span>بيع آجل / دين</span>
            </button>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-100 dark:bg-slate-900/50 p-3 rounded-2xl space-y-1.5 text-right font-semibold">
            <div className="flex justify-between text-xs text-slate-500">
              <span className="font-mono">{formatCurrency(subtotal)}</span>
              <span>المجموع الفرعي:</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-rose-500">
                <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                <span>الخصم المطبق:</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-800 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-1.5">
              <span className="font-mono text-brand-blue dark:text-blue-400">{formatCurrency(total)}</span>
              <span>إجمالي الفاتورة:</span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-brand-blue text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.01] disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
          >
            <span>اعتماد الفاتورة وطباعتها</span>
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-right">
            <button 
              onClick={() => setShowAddCustomerModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              إضافة عميل جديد سريع
            </h3>

            <form onSubmit={handleQuickAddCustomer} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">اسم العميل *</label>
                <input 
                  type="text"
                  required
                  placeholder="اكتب الاسم الكامل..."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">رقم الهاتف (الواتساب)</label>
                <input 
                  type="text"
                  placeholder="مثال: 966500000000..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-brand-green text-white font-bold text-xs rounded-xl shadow-lg shadow-lime-500/20 hover:bg-lime-600 transition-colors mt-2"
              >
                إضافة وحفظ في الفاتورة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC RECEIPT PRINT DIALOG (MODAL + PRINT AREA EMULATION) */}
      {showReceiptModal && newInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="glass w-full max-w-md rounded-2xl p-5 shadow-2xl relative text-right flex flex-col my-8">
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
              <h3 className="font-black text-sm text-slate-800 dark:text-white">تم حفظ الفاتورة بنجاح!</h3>
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
                <p><strong>رقم الفاتورة:</strong> <span className="font-bold">{newInvoice.invoiceNo}</span></p>
                <p><strong>التاريخ:</strong> {new Date(newInvoice.date).toLocaleString('ar-EG')}</p>
                <p><strong>المحل/العميل:</strong> {db.customers.find(c => c.id === newInvoice.customerId)?.name || 'نقدي'}</p>
                <p><strong>المندوب المسؤول:</strong> {db.representatives.find(r => r.id === newInvoice.repId)?.name || 'غير محدد'}</p>
                <p><strong>المستلم/الكاشير:</strong> {newInvoice.cashier}</p>
                <p><strong>الفرع:</strong> {newInvoice.branch.split(' - ')[0]}</p>
                <div className="border-b border-dashed border-slate-400 py-1"></div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-400 font-bold">
                    <th className="pb-1">الصنف</th>
                    <th className="pb-1 text-center">الكمية</th>
                    <th className="pb-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {newInvoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-1 max-w-[150px] truncate">{item.name}</td>
                      <td className="py-1 text-center font-bold">{item.quantity}</td>
                      <td className="py-1 text-left font-mono">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculation Summary */}
              <div className="space-y-1 text-[10px] border-t border-dashed border-slate-400 pt-2 font-bold">
                <div className="flex justify-between">
                  <span className="font-mono">{formatCurrency(newInvoice.subtotal)}</span>
                  <span>المجموع الفرعي:</span>
                </div>
                {newInvoice.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span className="font-mono">-{formatCurrency(newInvoice.discount)}</span>
                    <span>الخصم المطبق:</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-black border-t border-slate-400 pt-1">
                  <span className="font-mono">{formatCurrency(newInvoice.total)}</span>
                  <span>صافي المطلوب:</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2 space-y-1 border-t border-dashed border-slate-400">
                <p className="text-[9px] font-bold text-slate-500">طريقة الدفع: {newInvoice.paymentMethod === 'cash' ? 'نقدي / كاش' : newInvoice.paymentMethod === 'card' ? 'بطاقة / شبكة' : 'آجل / مديونية'}</p>
                <p className="text-[9px] font-bold text-slate-500">شكراً لتعاملكم معنا ونرحب بكم دائماً</p>
                <div className="mt-2 text-[8px] font-bold py-1 bg-slate-100 rounded text-slate-600">
                  سند تسليم بضاعة ومبيعات جملة - البدري تريد
                </div>
              </div>
            </div>

            {/* Quick Action buttons for overlay */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button 
                onClick={handlePrintReceipt}
                className="py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={14} /> طباعة الفاتورة
              </button>

              {getWhatsAppLink() ? (
                <a 
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 text-center"
                >
                  <Share2 size={14} /> مشاركة واتساب
                </a>
              ) : (
                <button 
                  disabled
                  className="py-2.5 bg-slate-300 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                  title="أضف رقم هاتف العميل للمشاركة عبر واتساب"
                >
                  <Share2 size={14} /> مشاركة واتساب
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation/Alert Modal */}
      {confirmState.show && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden relative shadow-2xl p-6 border border-slate-200 dark:border-slate-800 text-right animate-scaleUp">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-amber-500 shrink-0" size={18} />
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
              <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-bold">{confirmState.message}</p>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => { if (confirmState.onConfirm) confirmState.onConfirm(); }} 
                  className="flex-1 py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                >
                  {confirmState.confirmText}
                </button>
                {!confirmState.isAlert && (
                  <button 
                    onClick={() => setConfirmState(prev => ({ ...prev, show: false }))} 
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    {confirmState.cancelText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
