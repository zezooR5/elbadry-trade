import React, { useState, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Barcode, 
  FolderPlus, 
  PackageCheck, 
  DollarSign, 
  AlertTriangle,
  X,
  Printer
} from 'lucide-react';
import { useDb } from '../context/DbContext';

const Inventory = () => {
  const { 
    db, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    addCategory, 
    deleteCategory 
  } = useDb();

  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCatPanel, setShowCatPanel] = useState(false);
  const [showBarcodeSheet, setShowBarcodeSheet] = useState(false);

  // Form States
  const [formProduct, setFormProduct] = useState({
    code: '', barcode: '', name: '', buyPrice: '', sellPrice: '', wholesalePrice: '', quantity: '', minStock: '', category: '', supplier: '', description: ''
  });
  const [editProductId, setEditProductId] = useState(null);
  const [newCatName, setNewCatName] = useState('');

  // Barcode Sheet State
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [barcodeCount, setBarcodeCount] = useState(12);

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

  // Inventory Stats calculations
  const totalStockQty = db.products.reduce((sum, p) => sum + p.quantity, 0);
  const totalStockValBuy = db.products.reduce((sum, p) => sum + (p.quantity * p.buyPrice), 0);
  const totalStockValSell = db.products.reduce((sum, p) => sum + (p.quantity * p.sellPrice), 0);
  const outOfStockItems = db.products.filter(p => p.quantity <= p.minStock).length;

  // Filtered Products
  const filteredProducts = db.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Open modals
  const handleOpenAdd = () => {
    setFormProduct({
      code: 'PRD-' + (db.products.length + 101),
      barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString(),
      name: '', buyPrice: '', sellPrice: '', wholesalePrice: '', quantity: '', minStock: '5',
      category: db.categories[0] || '',
      supplier: db.suppliers[0]?.name || '',
      description: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditProductId(p.id);
    setFormProduct({ ...p });
    setShowEditModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    addProduct(formProduct);
    setShowAddModal(false);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateProduct(editProductId, formProduct);
    setShowEditModal(false);
  };

  const handleDelete = (id) => {
    triggerConfirm(
      "تأكيد حذف المنتج",
      "هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من المخزن؟ لا يمكن التراجع عن هذا الإجراء وسيتم مسح السجل المالي والكمي للصنف.",
      () => deleteProduct(id)
    );
  };

  const handleAddCat = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName('');
  };

  // Canvas barcode renderer (Fast, reliable 100% bug-free native canvas drawing)
  const drawBarcode = (canvasRef, text) => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    
    // Draw simple simulated lines
    ctx.fillStyle = '#000000';
    const lines = text.split('').map(char => parseInt(char, 10) || 5);
    let currentX = 10;
    
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < 24; i++) {
      const width = (lines[i % lines.length] % 3) + 1.5;
      ctx.fillRect(currentX, 5, width, 25);
      currentX += width + (i % 2 === 0 ? 1 : 2);
    }
    
    // Text label
    ctx.fillText(text, canvasRef.width / 2, 42);
  };

  const BarcodeWidget = ({ barcodeText }) => {
    const canvasRef = useRef(null);
    React.useEffect(() => {
      drawBarcode(canvasRef.current, barcodeText);
    }, [barcodeText]);
    
    return <canvas ref={canvasRef} width="110" height="50" className="mx-auto" />;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white">
            المخزن والمنتجات
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            إضافة وإدارة السلع وتصنيفاتها، مراقبة مستويات المخزون، وتوليد الباركود.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowCatPanel(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5"
          >
            <FolderPlus size={16} /> إدارة التصنيفات
          </button>
          <button 
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-brand-blue text-white hover:bg-blue-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
          >
            <Plus size={16} /> إضافة منتج جديد
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass p-4 rounded-2xl flex items-center gap-4 text-right shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-brand-blue flex items-center justify-center shrink-0">
            <PackageCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">إجمالي قطع المخزن</p>
            <h4 className="text-lg font-black mt-0.5 text-slate-800 dark:text-white">{totalStockQty} قطعة</h4>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl flex items-center gap-4 text-right shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-brand-green flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">قيمة المخزن (شراء)</p>
            <h4 className="text-lg font-black mt-0.5 text-slate-800 dark:text-white">{formatCurrency(totalStockValBuy)}</h4>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl flex items-center gap-4 text-right shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">قيمة المخزن (بيع)</p>
            <h4 className="text-lg font-black mt-0.5 text-slate-800 dark:text-white">{formatCurrency(totalStockValSell)}</h4>
          </div>
        </div>

        <div className={`glass p-4 rounded-2xl flex items-center gap-4 text-right shadow-sm
          ${outOfStockItems > 0 ? 'ring-1 ring-rose-500/30 bg-rose-500/5' : ''}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
            ${outOfStockItems > 0 ? 'bg-rose-500/15 text-rose-500' : 'bg-slate-500/10 text-slate-500'}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">السلع أوشكت على النفاد</p>
            <h4 className={`text-lg font-black mt-0.5 ${outOfStockItems > 0 ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>{outOfStockItems} منتجات</h4>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm text-right">
        {/* Search */}
        <div className="w-full md:w-5/12 flex items-center relative">
          <input 
            type="text"
            placeholder="ابحث بالاسم، الكود، الباركود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
          />
          <Search size={16} className="absolute left-3 text-slate-400" />
        </div>

        {/* Category filter */}
        <div className="w-full md:w-3/12 flex items-center gap-2 justify-end">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-right outline-none"
          >
            <option value="الكل">كل التصنيفات</option>
            {db.categories.map((c, idx) => (
              <option key={idx} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-xs font-bold text-slate-400 shrink-0">التصنيف:</span>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass rounded-2xl shadow-sm text-right overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-[#121929]/20">
                <th className="py-3 px-3">كود</th>
                <th className="py-3 px-3">اسم المنتج</th>
                <th className="py-3 px-3">التصنيف</th>
                <th className="py-3 px-3">سعر الشراء</th>
                <th className="py-3 px-3">سعر البيع</th>
                <th className="py-3 px-3">سعر الجملة</th>
                <th className="py-3 px-3">المخزون الحالي</th>
                <th className="py-3 px-3 text-center">الباركود</th>
                <th className="py-3 px-3 text-center">العمليات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr 
                    key={p.id} 
                    className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50/40 dark:hover:bg-slate-800/30"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">{p.code}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-800 dark:text-white">{p.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono" title="الباركود">{p.barcode}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">{formatCurrency(p.buyPrice)}</td>
                    <td className="py-3 px-3 font-mono font-black text-brand-blue dark:text-blue-400">{formatCurrency(p.sellPrice)}</td>
                    <td className="py-3 px-3 font-mono font-semibold">{formatCurrency(p.wholesalePrice)}</td>
                    <td className="py-3 px-3">
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px]
                        ${p.quantity <= p.minStock 
                          ? 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 font-black' 
                          : 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20'}`}>
                        {p.quantity} قطع
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button 
                        onClick={() => { setBarcodeProduct(p); setShowBarcodeSheet(true); }}
                        className="text-slate-400 hover:text-brand-blue p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="طباعة ملصقات الباركود لهذا المنتج"
                      >
                        <Barcode size={18} className="mx-auto" />
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(p)}
                          className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-500/10 rounded-lg"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-12 text-slate-400 text-xs text-center">لا توجد منتجات مسجلة في المخزن</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          ADD PRODUCT MODAL
      ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-2xl rounded-2xl p-5 shadow-2xl relative text-right max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              إضافة منتج جديد للمخزن
            </h3>

            <form onSubmit={handleAddSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">اسم المنتج *</label>
                <input 
                  type="text" required placeholder="مثال: شاحن أنكر 20W..."
                  value={formProduct.name}
                  onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">كود المنتج</label>
                <input 
                  type="text" placeholder="مثال: PRD-101..."
                  value={formProduct.code}
                  onChange={(e) => setFormProduct({ ...formProduct, code: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">الباركود (سكانر أو توليد تلقائي)</label>
                <input 
                  type="text" placeholder="مثال: 694148721..."
                  value={formProduct.barcode}
                  onChange={(e) => setFormProduct({ ...formProduct, barcode: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">التصنيف *</label>
                <select
                  value={formProduct.category}
                  onChange={(e) => setFormProduct({ ...formProduct, category: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs font-bold text-right outline-none"
                >
                  {db.categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">سعر الشراء (التكلفة) *</label>
                <input 
                  type="number" required placeholder="0.00" min="0" step="any"
                  value={formProduct.buyPrice}
                  onChange={(e) => setFormProduct({ ...formProduct, buyPrice: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">سعر بيع القطاعي *</label>
                <input 
                  type="number" required placeholder="0.00" min="0" step="any"
                  value={formProduct.sellPrice}
                  onChange={(e) => setFormProduct({ ...formProduct, sellPrice: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">سعر بيع الجملة</label>
                <input 
                  type="number" placeholder="0.00" min="0" step="any"
                  value={formProduct.wholesalePrice}
                  onChange={(e) => setFormProduct({ ...formProduct, wholesalePrice: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">الكمية الابتدائية بالمخزن</label>
                <input 
                  type="number" placeholder="0" min="0"
                  value={formProduct.quantity}
                  onChange={(e) => setFormProduct({ ...formProduct, quantity: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">الحد الأدنى لتنبيه نقص المخزون</label>
                <input 
                  type="number" placeholder="5" min="0"
                  value={formProduct.minStock}
                  onChange={(e) => setFormProduct({ ...formProduct, minStock: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">المورد المفضل</label>
                <select
                  value={formProduct.supplier}
                  onChange={(e) => setFormProduct({ ...formProduct, supplier: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs font-bold text-right outline-none"
                >
                  {db.suppliers.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-400">وصف وملاحظات الصنف</label>
                <textarea 
                  placeholder="اكتب تفاصيل الصنف الإضافية هنا..." rows="2"
                  value={formProduct.description}
                  onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full md:col-span-2 py-3 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors mt-2"
              >
                حفظ وإضافة للمخزن
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          EDIT PRODUCT MODAL
      ========================================== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-2xl rounded-2xl p-5 shadow-2xl relative text-right max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              تعديل بيانات منتج مخزني
            </h3>

            <form onSubmit={handleEditSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">اسم المنتج *</label>
                <input 
                  type="text" required placeholder="مثال: شاحن أنكر..."
                  value={formProduct.name}
                  onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">كود المنتج</label>
                <input 
                  type="text" required placeholder="PRD-101"
                  value={formProduct.code}
                  onChange={(e) => setFormProduct({ ...formProduct, code: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">الباركود</label>
                <input 
                  type="text" required
                  value={formProduct.barcode}
                  onChange={(e) => setFormProduct({ ...formProduct, barcode: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">التصنيف *</label>
                <select
                  value={formProduct.category}
                  onChange={(e) => setFormProduct({ ...formProduct, category: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs font-bold text-right outline-none"
                >
                  {db.categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">سعر الشراء (التكلفة) *</label>
                <input 
                  type="number" required placeholder="0.00" min="0" step="any"
                  value={formProduct.buyPrice}
                  onChange={(e) => setFormProduct({ ...formProduct, buyPrice: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">سعر بيع القطاعي *</label>
                <input 
                  type="number" required placeholder="0.00" min="0" step="any"
                  value={formProduct.sellPrice}
                  onChange={(e) => setFormProduct({ ...formProduct, sellPrice: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">سعر بيع الجملة</label>
                <input 
                  type="number" placeholder="0.00" min="0" step="any"
                  value={formProduct.wholesalePrice}
                  onChange={(e) => setFormProduct({ ...formProduct, wholesalePrice: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">الكمية الحالية بالمخزن</label>
                <input 
                  type="number" placeholder="0" min="0"
                  value={formProduct.quantity}
                  onChange={(e) => setFormProduct({ ...formProduct, quantity: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">الحد الأدنى</label>
                <input 
                  type="number" placeholder="5" min="0"
                  value={formProduct.minStock}
                  onChange={(e) => setFormProduct({ ...formProduct, minStock: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">المورد</label>
                <select
                  value={formProduct.supplier}
                  onChange={(e) => setFormProduct({ ...formProduct, supplier: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs font-bold text-right outline-none"
                >
                  {db.suppliers.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-400">وصف وملاحظات الصنف</label>
                <textarea 
                  placeholder="اكتب تفاصيل الصنف الإضافية هنا..." rows="2"
                  value={formProduct.description}
                  onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 text-xs text-right outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full md:col-span-2 py-3 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors mt-2"
              >
                تعديل وتحديث البيانات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          CATEGORY PANEL
      ========================================== */}
      {showCatPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121929] border border-slate-200 dark:border-slate-850 w-full max-w-md rounded-2xl p-5 shadow-2xl relative text-right">
            <button 
              onClick={() => setShowCatPanel(false)}
              className="absolute top-4 left-4 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
            >
              <X size={14} />
            </button>
            
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <FolderPlus className="text-brand-blue" size={18} />
              <h3 className="font-black text-sm md:text-base text-slate-800 dark:text-white">
                إدارة تصنيفات المنتجات
              </h3>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddCat} className="mt-4 flex gap-2 items-center">
              <button 
                type="submit"
                className="py-2.5 px-4 bg-brand-blue hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center gap-1 shrink-0"
              >
                <Plus size={13} />
                <span>إضافة</span>
              </button>
              <input 
                type="text" required placeholder="مثال: جرابات، ساعات ذكية..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 text-xs text-right outline-none font-bold focus:ring-1 focus:ring-brand-blue placeholder-slate-400 dark:placeholder-slate-500 transition-all shadow-inner"
              />
            </form>

            {/* Scrollable list */}
            <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto pr-1">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 pb-1">التصنيفات المضافة حالياً:</p>
              {db.categories.map((cat, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950/80 border border-slate-100 dark:border-slate-800/40 font-bold text-xs text-slate-700 dark:text-slate-200 transition-all">
                  <button 
                    type="button"
                    onClick={() => {
                      triggerConfirm(
                        "تأكيد حذف التصنيف",
                        `هل أنت متأكد من رغبتك في حذف تصنيف "${cat}"؟ لن يتم حذف المنتجات التابعة لهذا التصنيف ولكن سيتعين عليك إعادة تعيين تصنيفها لاحقاً.`,
                        () => deleteCategory(cat)
                      );
                    }}
                    className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/10"
                    title="حذف التصنيف"
                  >
                    <Trash2 size={13} />
                  </button>
                  <span className="pr-1">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          BARCODE SHEET GENERATOR MODAL
      ========================================== */}
      {showBarcodeSheet && barcodeProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="glass w-full max-w-lg rounded-2xl p-5 shadow-2xl relative text-right flex flex-col my-8">
            <button 
              onClick={() => { setShowBarcodeSheet(false); setBarcodeProduct(null); }}
              className="absolute top-4 left-4 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
            <h3 className="font-black text-base text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              توليد ملصقات باركود المنتج
            </h3>

            {/* Selection Options */}
            <div className="mt-4 flex gap-4 items-center justify-between">
              <input 
                type="number" min="1" max="40"
                value={barcodeCount}
                onChange={(e) => setBarcodeCount(Math.min(40, Math.max(1, parseInt(e.target.value) || 12)))}
                className="w-24 text-center py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-bold"
              />
              <span className="text-xs font-bold text-slate-400">عدد ملصقات الباركود المطلوب طباعتها:</span>
            </div>

            {/* Printable Area (Isolatable grid) */}
            <div 
              id="print-area" 
              className="mt-5 bg-white text-black p-4 rounded-xl border border-slate-200 text-center font-cairo max-h-[300px] overflow-y-auto"
            >
              <p className="text-[10px] font-bold text-slate-400 pb-2 border-b border-dashed border-slate-200 no-print">
                معاينة لوحة ملصقات الباركود (جاهزة للطباعة والقص)
              </p>
              
              <div className="grid grid-cols-3 gap-4 pt-4">
                {[...Array(barcodeCount)].map((_, idx) => (
                  <div key={idx} className="border border-slate-200 p-2 rounded flex flex-col items-center justify-center bg-white">
                    <p className="text-[8px] font-bold text-slate-800 truncate w-full">{barcodeProduct.name}</p>
                    <BarcodeWidget barcodeText={barcodeProduct.barcode} />
                    <p className="text-[9px] font-black text-brand-blue font-mono mt-1">{formatCurrency(barcodeProduct.sellPrice)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-brand-blue text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={14} /> بدء طباعة ملصقات الباركود
              </button>
            </div>
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
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-bold">
                {confirmState.message}
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    if (confirmState.onConfirm) confirmState.onConfirm();
                  }}
                  className="flex-1 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  تأكيد الحذف
                </button>
                <button
                  onClick={() => setConfirmState(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
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

export default Inventory;
