import React, { createContext, useContext, useState, useEffect } from 'react';

const DbContext = createContext();

// Default initial brand settings
const DEFAULT_SETTINGS = {
  shopName: "البدري تريد - Elbadry Trade",
  phone: "+966 50 123 4567",
  address: "الرياض - شارع خالد بن الوليد - مجمع الإتصالات",
  logoText: "Anker Etisal",
  vatRate: 15, // 15% VAT
  currency: "ر.س",
  whatsappTemplate: "مرحباً {customer}، يسعدنا التعامل معك. تفاصيل فاتورتك رقم {invoiceNo} بقيمة {amount} {currency} تجدها مرفقة.",
};

// Available branches
const BRANCHES = ["الفرع الرئيسي - الرياض", "فرع جدة - شارع فلسطين", "فرع الدمام - حي الاتصالات"];

// Available users/roles
const USERS = [
  { id: 'u1', name: 'المدير العام (أدمن)', role: 'Admin', avatar: '👨‍💼' },
  { id: 'u2', name: 'كاشير المحل', role: 'Cashier', avatar: '🧑‍بيع' },
  { id: 'u3', name: 'المحاسب المالي', role: 'Accountant', avatar: '👨‍ساب' }
];

export const DbProvider = ({ children }) => {
  const [db, setDb] = useState(null);
  const [currentBranch, setCurrentBranch] = useState(BRANCHES[0]);
  const [currentUser, setCurrentUser] = useState(USERS[0]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState([]);

  // Load Database from LocalStorage or initialize with Mock Data
  useEffect(() => {
    let loadedSettings = DEFAULT_SETTINGS;
    let loadedBranch = BRANCHES[0];
    let loadedUser = USERS[0];

    try {
      const savedSettings = localStorage.getItem('elbadry_trade_settings');
      if (savedSettings) loadedSettings = JSON.parse(savedSettings);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    setSettings(loadedSettings);

    try {
      const savedBranch = localStorage.getItem('elbadry_trade_branch');
      if (savedBranch) loadedBranch = JSON.parse(savedBranch);
    } catch (e) {
      console.error("Failed to load branch:", e);
    }
    setCurrentBranch(loadedBranch);

    try {
      const savedUser = localStorage.getItem('elbadry_trade_user');
      if (savedUser) loadedUser = JSON.parse(savedUser);
    } catch (e) {
      console.error("Failed to load user:", e);
    }
    setCurrentUser(loadedUser);

    const savedDb = localStorage.getItem('elbadry_trade_db');
    if (savedDb) {
      try {
        let parsed = JSON.parse(savedDb);
        let healed = false;
        
        const defaultCollections = {
          categories: ["شواحن", "كابلات", "سماعات", "باور بانك", "جرابات", "ساعات ذكية", "وصلات"],
          branches: ["الفرع الرئيسي - الرياض", "فرع جدة - شارع فلسطين", "فرع الدمام - حي الاتصالات"],
          representatives: [
            { id: 'R-1', name: "أحمد منصور (مندوب الرياض)", phone: "0550000001", activeCollections: 0, totalSales: 0 },
            { id: 'R-2', name: "خالد الحربي (مندوب قطاع الشمال)", phone: "0550000002", activeCollections: 0, totalSales: 0 }
          ],
          suppliers: [],
          customers: [
            { id: 'C-1', name: "عميل نقدي (كاش)", phone: "0500000000", email: "cash@elbadry.com", debt: 0, salesCount: 0, totalSales: 0, repId: 'R-1' }
          ],
          products: [],
          sales: [],
          purchases: [],
          expenses: [],
          journal: [],
          logs: [],
          treasury: { balance: 14750.5, logs: [] }
        };

        for (const [key, defaultValue] of Object.entries(defaultCollections)) {
          if (!parsed[key] || (!Array.isArray(parsed[key]) && key !== 'treasury')) {
            parsed[key] = defaultValue;
            healed = true;
          } else if (key === 'treasury' && typeof parsed[key] !== 'object') {
            parsed[key] = defaultValue;
            healed = true;
          }
        }

        if (parsed.customers && Array.isArray(parsed.customers)) {
          let customersHealed = false;
          parsed.customers = parsed.customers.map(c => {
            if (!c.repId) {
              c.repId = 'R-1';
              customersHealed = true;
            }
            return c;
          });
          if (customersHealed) healed = true;
        }

        setDb(parsed);
        if (healed) {
          localStorage.setItem('elbadry_trade_db', JSON.stringify(parsed));
          console.log("Database schema healed and migrated successfully.");
        }
      } catch (e) {
        console.error("Failed to parse database, resetting to mock data:", e);
        const initialDb = generateMockDatabase();
        setDb(initialDb);
        localStorage.setItem('elbadry_trade_db', JSON.stringify(initialDb));
      }
    } else {
      // Initialize with beautiful and rich mock data
      const initialDb = generateMockDatabase();
      setDb(initialDb);
      localStorage.setItem('elbadry_trade_db', JSON.stringify(initialDb));
    }
  }, []);

  // Save database to localStorage on every change
  const saveDb = (newDbOrFunc) => {
    setDb(prevDb => {
      const finalDb = typeof newDbOrFunc === 'function' ? newDbOrFunc(prevDb) : newDbOrFunc;
      localStorage.setItem('elbadry_trade_db', JSON.stringify(finalDb));
      setTimeout(() => {
        checkInventoryAlerts(finalDb);
      }, 0);
      return finalDb;
    });
  };

  // Save database with an activity log entry atomically (prevents stale closure issues)
  const saveDbWithLog = (updatedFields, logActionText) => {
    setDb(prevDb => {
      if (!prevDb) return prevDb;
      
      const newLog = {
        id: 'L-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        role: currentUser.role,
        branch: currentBranch,
        action: logActionText
      };
      
      const updatedLogs = [newLog, ...(prevDb.logs || [])].slice(0, 100);
      
      const finalDb = {
        ...prevDb,
        ...updatedFields,
        logs: updatedLogs
      };
      
      localStorage.setItem('elbadry_trade_db', JSON.stringify(finalDb));
      
      setTimeout(() => {
        checkInventoryAlerts(finalDb);
      }, 0);

      return finalDb;
    });
  };

  // Save settings
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('elbadry_trade_settings', JSON.stringify(newSettings));
  };

  // Change branch
  const changeBranch = (branch) => {
    setCurrentBranch(branch);
    localStorage.setItem('elbadry_trade_branch', JSON.stringify(branch));
    addLog(`تم تبديل الفرع النشط إلى: ${branch}`);
  };

  const addBranch = (branchName) => {
    if (!branchName || (db && db.branches && db.branches.includes(branchName))) return;
    const updatedBranches = [...((db && db.branches) || BRANCHES), branchName];
    saveDbWithLog({ branches: updatedBranches }, `تم إضافة فرع جديد: ${branchName}`);
  };

  const deleteBranch = (branchName) => {
    if (db && db.branches && db.branches.length <= 1) return;
    const activeBranches = (db && db.branches) || BRANCHES;
    const updatedBranches = activeBranches.filter(b => b !== branchName);
    
    // If the active branch is deleted, switch to the first remaining branch
    let nextBranch = currentBranch;
    if (currentBranch === branchName) {
      nextBranch = updatedBranches[0];
      setCurrentBranch(nextBranch);
      localStorage.setItem('elbadry_trade_branch', JSON.stringify(nextBranch));
    }

    saveDbWithLog({ branches: updatedBranches }, `تم حذف فرع: ${branchName}`);
  };

  // Change user/role
  const changeUser = (userRole) => {
    const selectedUser = USERS.find(u => u.role === userRole) || USERS[0];
    setCurrentUser(selectedUser);
    localStorage.setItem('elbadry_trade_user', JSON.stringify(selectedUser));
    addLog(`تم تبديل المستخدم الحالي إلى: ${selectedUser.name} (${selectedUser.role})`);
  };

  const addRepresentative = (rep) => {
    const newRep = {
      id: 'R-' + Date.now(),
      name: rep.name,
      phone: rep.phone || '',
      activeCollections: 0,
      totalSales: 0
    };
    const updatedReps = [newRep, ...(db.representatives || [])];
    saveDbWithLog({ representatives: updatedReps }, `تم إضافة مندوب مبيعات جديد: ${rep.name}`);
  };

  const deleteRepresentative = (id) => {
    const repToDelete = db.representatives?.find(r => r.id === id);
    if (!repToDelete) return;
    const updatedReps = db.representatives?.filter(r => r.id !== id) || [];
    saveDbWithLog({ representatives: updatedReps }, `تم حذف مندوب مبيعات: ${repToDelete.name}`);
  };

  const settleRepCollection = (id, amount) => {
    const val = Number(amount) || 0;
    const rep = db.representatives?.find(r => r.id === id);
    if (!rep) return;

    // Deduct from rep's collections, keeping it >= 0
    const updatedReps = db.representatives.map(r => {
      if (r.id === id) {
        return { ...r, activeCollections: Math.max(0, r.activeCollections - val) };
      }
      return r;
    });

    // 1. Treasury update: deposit this cash collected into the warehouse main treasury
    const newTreasuryBalance = db.treasury.balance + val;
    const treasuryLogs = [...db.treasury.logs];
    treasuryLogs.unshift({
      id: 'T-' + Date.now(),
      date: new Date().toISOString(),
      amount: val,
      type: 'deposit',
      description: `توريد تحصيلات نقدية معلقة من المندوب: ${rep.name}`
    });

    // 2. Journal Entry
    const newJournal = [...db.journal];
    const journalId = 'J-' + (newJournal.length + 10001);
    const entries = [
      { account: 'الخزينة العامة', type: 'debit', amount: val },
      { account: `عهدة نقدية للمندوب - ${rep.name}`, type: 'credit', amount: val }
    ];

    newJournal.unshift({
      id: journalId,
      date: new Date().toISOString(),
      reference: 'REP-SETTLE',
      description: `تصفية وتوريد نقدية المندوب - ${rep.name}`,
      entries
    });

    saveDbWithLog({
      representatives: updatedReps,
      treasury: {
        balance: newTreasuryBalance,
        logs: treasuryLogs
      },
      journal: newJournal
    }, `قام المندوب ${rep.name} بتوريد مبلغ قدره ${val} ر.س إلى الخزينة الرئيسية`);
  };

  // Helper: Log activity
  const addLog = (action) => {
    saveDbWithLog({}, action);
  };

  // Check and push inventory alerts
  const checkInventoryAlerts = (currentDb) => {
    if (!currentDb || !Array.isArray(currentDb.products)) {
      setNotifications([]);
      return;
    }
    const alerts = [];
    currentDb.products.forEach(p => {
      if (p && p.quantity <= p.minStock) {
        alerts.push({
          id: p.id,
          text: `المنتج "${p.name}" أوشك على النفاد! الكمية المتبقية: ${p.quantity} (الحد الأدنى: ${p.minStock})`,
          type: 'warning',
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        });
      }
    });
    setNotifications(alerts);
  };

  // Run stock check initially after db loads
  useEffect(() => {
    if (db) {
      checkInventoryAlerts(db);
    }
  }, [db]);

  // ==========================================
  // DB FUNCTIONS: PRODUCTS & CATEGORIES
  // ==========================================
  const addProduct = (product) => {
    const newProduct = {
      ...product,
      id: 'P-' + Date.now(),
      quantity: Number(product.quantity) || 0,
      buyPrice: Number(product.buyPrice) || 0,
      sellPrice: Number(product.sellPrice) || 0,
      wholesalePrice: Number(product.wholesalePrice) || 0,
      minStock: Number(product.minStock) || 5,
      branch: currentBranch,
    };
    const updatedProducts = [newProduct, ...db.products];
    saveDbWithLog({ products: updatedProducts }, `تم إضافة منتج جديد: ${product.name} بمخزون ${product.quantity} قطعة`);
  };

  const updateProduct = (id, updatedProduct) => {
    const updatedProducts = db.products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...updatedProduct,
          quantity: Number(updatedProduct.quantity),
          buyPrice: Number(updatedProduct.buyPrice),
          sellPrice: Number(updatedProduct.sellPrice),
          wholesalePrice: Number(updatedProduct.wholesalePrice),
          minStock: Number(updatedProduct.minStock),
        };
      }
      return p;
    });
    saveDbWithLog({ products: updatedProducts }, `تم تعديل بيانات المنتج: ${updatedProduct.name}`);
  };

  const deleteProduct = (id) => {
    const productToDelete = db.products.find(p => p.id === id);
    const updatedProducts = db.products.filter(p => p.id !== id);
    saveDbWithLog({ products: updatedProducts }, `تم حذف منتج: ${productToDelete?.name}`);
  };

  const addCategory = (category) => {
    if (!category || db.categories.includes(category)) return;
    const updatedCategories = [...db.categories, category];
    saveDbWithLog({ categories: updatedCategories }, `تم إضافة تصنيف منتجات جديد: ${category}`);
  };

  const deleteCategory = (categoryName) => {
    const updatedCategories = db.categories.filter(c => c !== categoryName);
    saveDbWithLog({ categories: updatedCategories }, `تم حذف تصنيف منتجات: ${categoryName}`);
  };

  // ==========================================
  // DB FUNCTIONS: CUSTOMERS & SUPPLIERS
  // ==========================================
  const addCustomer = (customer) => {
    const newCustomer = {
      ...customer,
      id: 'C-' + Date.now(),
      debt: Number(customer.debt) || 0,
      salesCount: 0,
      totalSales: 0,
      repId: customer.repId || 'R-1'
    };
    const updatedCustomers = [newCustomer, ...db.customers];
    saveDbWithLog({ customers: updatedCustomers }, `تم إضافة عميل/محل جديد: ${customer.name}`);
    return newCustomer;
  };

  const updateCustomer = (id, updatedCustomer) => {
    const updatedCustomers = db.customers.map(c => 
      c.id === id ? { ...c, ...updatedCustomer, debt: Number(updatedCustomer.debt), repId: updatedCustomer.repId } : c
    );
    saveDbWithLog({ customers: updatedCustomers }, `تم تعديل بيانات العميل/المحل: ${updatedCustomer.name}`);
  };

  const deleteCustomer = (id) => {
    const customer = db.customers.find(c => c.id === id);
    const updatedCustomers = db.customers.filter(c => c.id !== id);
    saveDbWithLog({ customers: updatedCustomers }, `تم حذف عميل: ${customer?.name}`);
  };

  const addSupplier = (supplier) => {
    const newSupplier = {
      ...supplier,
      id: 'S-' + Date.now(),
      debt: Number(supplier.debt) || 0,
      billsCount: 0,
      totalBills: 0,
    };
    const updatedSuppliers = [newSupplier, ...db.suppliers];
    saveDbWithLog({ suppliers: updatedSuppliers }, `تم إضافة مورد جديد: ${supplier.name}`);
  };

  const updateSupplier = (id, updatedSupplier) => {
    const updatedSuppliers = db.suppliers.map(s => 
      s.id === id ? { ...s, ...updatedSupplier, debt: Number(updatedSupplier.debt) } : s
    );
    saveDbWithLog({ suppliers: updatedSuppliers }, `تم تعديل بيانات المورد: ${updatedSupplier.name}`);
  };

  const deleteSupplier = (id) => {
    const supplier = db.suppliers.find(s => s.id === id);
    const updatedSuppliers = db.suppliers.filter(s => s.id !== id);
    saveDbWithLog({ suppliers: updatedSuppliers }, `تم حذف مورد: ${supplier?.name}`);
  };

  // ==========================================
  // DB FUNCTIONS: SALES & POS
  // ==========================================
  const addSalesInvoice = (cart, customerId, paymentMethod, discount = 0, repId = 'R-1', branch = currentBranch) => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = Number(discount) || 0;
    const total = Math.max(0, subtotal - discountAmount);

    const invoiceNo = 'INV-' + (db.sales.length + 1001);

    const newInvoice = {
      id: 'I-' + Date.now(),
      invoiceNo,
      date: new Date().toISOString(),
      customerId,
      repId,
      paymentMethod, // 'cash', 'card', 'debt'
      discount: discountAmount,
      tax: 0,
      subtotal,
      total,
      branch,
      cashier: currentUser.name,
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        buyPrice: item.buyPrice,
        quantity: item.quantity,
        total: item.price * item.quantity
      }))
    };

    const cost = cart.reduce((sum, item) => sum + (item.buyPrice * item.quantity), 0);
    newInvoice.cost = cost;
    newInvoice.profit = total - cost;

    // 1. Update quantities in inventory
    const updatedProducts = db.products.map(p => {
      const cartItem = cart.find(item => item.id === p.id);
      if (cartItem) {
        return { ...p, quantity: Math.max(0, p.quantity - cartItem.quantity) };
      }
      return p;
    });

    // 2. Update Customer details
    const updatedCustomers = db.customers.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          salesCount: c.salesCount + 1,
          totalSales: c.totalSales + total,
          debt: paymentMethod === 'debt' ? c.debt + total : c.debt
        };
      }
      return c;
    });

    // 3. Update Representative collections or total sales
    let updatedReps = db.representatives || [];
    if (repId) {
      updatedReps = (db.representatives || []).map(r => {
        if (r.id === repId) {
          const cashAddition = paymentMethod === 'cash' ? total : 0;
          return {
            ...r,
            totalSales: r.totalSales + total,
            activeCollections: r.activeCollections + cashAddition
          };
        }
        return r;
      });
    }

    // 4. Update Main Treasury balance
    let newTreasuryBalance = db.treasury.balance;
    const treasuryLogs = [...db.treasury.logs];
    
    // Only 'card' payment goes directly into warehouse treasury
    if (paymentMethod === 'card') {
      newTreasuryBalance += total;
      treasuryLogs.unshift({
        id: 'T-' + Date.now(),
        date: new Date().toISOString(),
        amount: total,
        type: 'deposit',
        description: `تحصيل كاشير شبكة: فاتورة رقم ${invoiceNo} عبر المندوب`
      });
    }

    // 5. Accounting Journal Entry (Double entry)
    const newJournal = [...db.journal];
    const journalId = 'J-' + (newJournal.length + 10001);
    
    // Debit side: Card goes to Treasury, Cash goes to Rep's account, Debt goes to Debtors
    const debitAccount = paymentMethod === 'card' 
      ? 'الخزينة العامة' 
      : paymentMethod === 'cash' 
        ? `عهدة نقدية للمندوب` 
        : 'حساب مدينين (المحلات والعملاء)';

    const entries = [
      { account: debitAccount, type: 'debit', amount: total },
      { account: 'إيرادات المبيعات (جملة)', type: 'credit', amount: total }
    ];

    newJournal.unshift({
      id: journalId,
      date: new Date().toISOString(),
      reference: invoiceNo,
      description: `قيد مبيعات توزيع تلقائي - فاتورة ${invoiceNo}`,
      entries
    });

    saveDbWithLog({
      products: updatedProducts,
      customers: updatedCustomers,
      representatives: updatedReps,
      sales: [newInvoice, ...db.sales],
      treasury: {
        balance: newTreasuryBalance,
        logs: treasuryLogs
      },
      journal: newJournal
    }, `تم إنشاء فاتورة مبيعات ${invoiceNo} بقيمة ${total} ر.س`);
    
    return newInvoice;
  };

  const returnSalesInvoice = (invoiceId, returnNote = "مرتجع مبيعات") => {
    const invoice = db.sales.find(s => s.id === invoiceId);
    if (!invoice || invoice.returned) return;

    // 1. Restore product quantities in inventory
    const updatedProducts = db.products.map(p => {
      const item = invoice.items.find(i => i.productId === p.id);
      if (item) {
        return { ...p, quantity: p.quantity + item.quantity };
      }
      return p;
    });

    // 2. Reduce customer sales metrics
    const updatedCustomers = db.customers.map(c => {
      if (c.id === invoice.customerId) {
        return {
          ...c,
          totalSales: Math.max(0, c.totalSales - invoice.total),
          debt: invoice.paymentMethod === 'debt' ? Math.max(0, c.debt - invoice.total) : c.debt
        };
      }
      return c;
    });

    // 3. Reduce Rep sales metrics
    let updatedReps = db.representatives || [];
    if (invoice.repId) {
      updatedReps = (db.representatives || []).map(r => {
        if (r.id === invoice.repId) {
          const cashReduction = invoice.paymentMethod === 'cash' ? invoice.total : 0;
          return {
            ...r,
            totalSales: Math.max(0, r.totalSales - invoice.total),
            activeCollections: Math.max(0, r.activeCollections - cashReduction)
          };
        }
        return r;
      });
    }

    // 4. Settle Treasury if card
    let newTreasuryBalance = db.treasury.balance;
    const treasuryLogs = [...db.treasury.logs];
    if (invoice.paymentMethod === 'card') {
      newTreasuryBalance = Math.max(0, newTreasuryBalance - invoice.total);
      treasuryLogs.unshift({
        id: 'T-' + Date.now(),
        date: new Date().toISOString(),
        amount: invoice.total,
        type: 'withdraw',
        description: `مرتجع مبيعات شبكة: فاتورة رقم ${invoice.invoiceNo}`
      });
    }

    // 5. Mark invoice as returned
    const updatedSales = db.sales.map(s => s.id === invoiceId ? { ...s, returned: true, returnReason: returnNote } : s);

    // 6. Journal Entry
    const newJournal = [...db.journal];
    const journalId = 'J-' + (newJournal.length + 10001);
    
    const creditAccount = invoice.paymentMethod === 'card' 
      ? 'الخزينة العامة' 
      : invoice.paymentMethod === 'cash' 
        ? `عهدة نقدية للمندوب` 
        : 'حساب مدينين (المحلات والعملاء)';

    const entries = [
      { account: 'مرتجعات ومسموحات المبيعات', type: 'debit', amount: invoice.total },
      { account: creditAccount, type: 'credit', amount: invoice.total }
    ];

    newJournal.unshift({
      id: journalId,
      date: new Date().toISOString(),
      reference: invoice.invoiceNo,
      description: `إرجاع فاتورة ${invoice.invoiceNo} - ${returnNote}`,
      entries
    });

    saveDbWithLog({
      products: updatedProducts,
      customers: updatedCustomers,
      representatives: updatedReps,
      sales: updatedSales,
      treasury: {
        balance: newTreasuryBalance,
        logs: treasuryLogs
      },
      journal: newJournal
    }, `تم عمل مرتجع للفاتورة رقم ${invoice.invoiceNo}`);
  };

  // ==========================================
  // DB FUNCTIONS: PURCHASES (المشتريات)
  // ==========================================
  const addPurchaseBill = (items, supplierId, paymentMethod, discount = 0) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = Number(discount) || 0;
    const total = Math.max(0, subtotal - discountAmount);

    const billNo = 'BILL-' + (db.purchases.length + 1001);

    const newBill = {
      id: 'B-' + Date.now(),
      billNo,
      date: new Date().toISOString(),
      supplierId,
      paymentMethod, // 'cash', 'debt'
      discount: discountAmount,
      tax: 0,
      subtotal,
      total,
      branch: currentBranch,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      }))
    };

    // 1. Update quantities in inventory & update average buyPrice
    const updatedProducts = db.products.map(p => {
      const billItem = items.find(item => item.productId === p.id);
      if (billItem) {
        // Average cost = (oldQty * oldPrice + newQty * newPrice) / (oldQty + newQty)
        const oldTotal = p.quantity * p.buyPrice;
        const newTotal = billItem.quantity * billItem.price;
        const totalQty = p.quantity + billItem.quantity;
        const newBuyPrice = totalQty > 0 ? Math.round((oldTotal + newTotal) / totalQty * 100) / 100 : billItem.price;
        
        return {
          ...p,
          quantity: p.quantity + billItem.quantity,
          buyPrice: newBuyPrice // Weighted average pricing
        };
      }
      return p;
    });

    // 2. Update Supplier details (bills count, total purchases, debt if 'debt')
    const updatedSuppliers = db.suppliers.map(s => {
      if (s.id === supplierId) {
        return {
          ...s,
          billsCount: s.billsCount + 1,
          totalBills: s.totalBills + total,
          debt: paymentMethod === 'debt' ? s.debt + total : s.debt
        };
      }
      return s;
    });

    // 3. Treasury update
    let newTreasuryBalance = db.treasury.balance;
    const treasuryLogs = [...db.treasury.logs];
    if (paymentMethod === 'cash') {
      newTreasuryBalance = Math.max(0, newTreasuryBalance - total);
      treasuryLogs.unshift({
        id: 'T-' + Date.now(),
        date: new Date().toISOString(),
        amount: total,
        type: 'withdraw',
        description: `فاتورة شراء رقم ${billNo}`
      });
    }

    // 4. Accounting Journal Entry
    const newJournal = [...db.journal];
    const journalId = 'J-' + (newJournal.length + 10001);
    const entries = [
      { account: 'المخزون (بضاعة آخر المدة)', type: 'debit', amount: total },
      { account: paymentMethod === 'debt' ? 'حساب دائنين (الموردين)' : 'الخزينة العامة', type: 'credit', amount: total }
    ];

    newJournal.unshift({
      id: journalId,
      date: new Date().toISOString(),
      reference: billNo,
      description: `قيد مشتريات تلقائي - فاتورة شراء ${billNo}`,
      entries
    });

    saveDbWithLog({
      products: updatedProducts,
      suppliers: updatedSuppliers,
      purchases: [newBill, ...db.purchases],
      treasury: {
        balance: newTreasuryBalance,
        logs: treasuryLogs
      },
      journal: newJournal
    }, `تم تسجيل فاتورة شراء ${billNo} بقيمة ${total} ر.س`);
  };

  // ==========================================
  // DB FUNCTIONS: FINANCIALS & TREASURY
  // ==========================================
  const addExpense = (amount, category, description) => {
    const val = Number(amount) || 0;
    const newExpense = {
      id: 'E-' + Date.now(),
      date: new Date().toISOString(),
      amount: val,
      category, // 'إيجار', 'رواتب', 'كهرباء ومياه', 'نثريات', 'تسويق'
      description,
      branch: currentBranch
    };

    // 1. Deduct from treasury
    const newTreasuryBalance = Math.max(0, db.treasury.balance - val);
    const treasuryLogs = [...db.treasury.logs];
    treasuryLogs.unshift({
      id: 'T-' + Date.now(),
      date: new Date().toISOString(),
      amount: val,
      type: 'withdraw',
      description: `مصروف: ${category} - ${description}`
    });

    // 2. Journal Entry
    const newJournal = [...db.journal];
    const journalId = 'J-' + (newJournal.length + 10001);
    const entries = [
      { account: `مصروفات - ${category}`, type: 'debit', amount: val },
      { account: 'الخزينة العامة', type: 'credit', amount: val }
    ];

    newJournal.unshift({
      id: journalId,
      date: new Date().toISOString(),
      reference: 'EXPENSE',
      description: `تسجيل مصروف - ${category}`,
      entries
    });

    saveDbWithLog({
      expenses: [newExpense, ...db.expenses],
      treasury: {
        balance: newTreasuryBalance,
        logs: treasuryLogs
      },
      journal: newJournal
    }, `تم تسجيل مصروف بقيمة ${val} ر.س للبند: ${category}`);
  };

  const payCustomerDebt = (customerId, amount) => {
    const val = Number(amount) || 0;
    const updatedCustomers = db.customers.map(c => {
      if (c.id === customerId) {
        return { ...c, debt: Math.max(0, c.debt - val) };
      }
      return c;
    });

    const customer = db.customers.find(c => c.id === customerId);

    // 1. Treasury update
    const newTreasuryBalance = db.treasury.balance + val;
    const treasuryLogs = [...db.treasury.logs];
    treasuryLogs.unshift({
      id: 'T-' + Date.now(),
      date: new Date().toISOString(),
      amount: val,
      type: 'deposit',
      description: `سداد جزء من مديونية العميل: ${customer?.name}`
    });

    // 2. Journal Entry
    const newJournal = [...db.journal];
    const journalId = 'J-' + (newJournal.length + 10001);
    const entries = [
      { account: 'الخزينة العامة', type: 'debit', amount: val },
      { account: 'حساب مدينين (العملاء)', type: 'credit', amount: val }
    ];

    newJournal.unshift({
      id: journalId,
      date: new Date().toISOString(),
      reference: 'DEBT-PAY',
      description: `سداد دين عميل - ${customer?.name}`,
      entries
    });

    saveDbWithLog({
      customers: updatedCustomers,
      treasury: {
        balance: newTreasuryBalance,
        logs: treasuryLogs
      },
      journal: newJournal
    }, `سدد العميل ${customer?.name} مبلغ قدره ${val} ر.س`);
  };

  const paySupplierDebt = (supplierId, amount) => {
    const val = Number(amount) || 0;
    const updatedSuppliers = db.suppliers.map(s => {
      if (s.id === supplierId) {
        return { ...s, debt: Math.max(0, s.debt - val) };
      }
      return s;
    });

    const supplier = db.suppliers.find(s => s.id === supplierId);

    // 1. Treasury update
    const newTreasuryBalance = Math.max(0, db.treasury.balance - val);
    const treasuryLogs = [...db.treasury.logs];
    treasuryLogs.unshift({
      id: 'T-' + Date.now(),
      date: new Date().toISOString(),
      amount: val,
      type: 'withdraw',
      description: `دفعة سداد حساب للمورد: ${supplier?.name}`
    });

    // 2. Journal Entry
    const newJournal = [...db.journal];
    const journalId = 'J-' + (newJournal.length + 10001);
    const entries = [
      { account: 'حساب دائنين (الموردين)', type: 'debit', amount: val },
      { account: 'الخزينة العامة', type: 'credit', amount: val }
    ];

    newJournal.unshift({
      id: journalId,
      date: new Date().toISOString(),
      reference: 'SUPP-PAY',
      description: `سداد حساب مورد - ${supplier?.name}`,
      entries
    });

    saveDbWithLog({
      suppliers: updatedSuppliers,
      treasury: {
        balance: newTreasuryBalance,
        logs: treasuryLogs
      },
      journal: newJournal
    }, `تم دفع مبلغ ${val} ر.س للمورد ${supplier?.name}`);
  };

  const depositToTreasury = (amount, description) => {
    const val = Number(amount) || 0;
    const newTreasuryBalance = db.treasury.balance + val;
    const treasuryLogs = [...db.treasury.logs];
    treasuryLogs.unshift({
      id: 'T-' + Date.now(),
      date: new Date().toISOString(),
      amount: val,
      type: 'deposit',
      description: `إيداع يدوي: ${description}`
    });

    saveDbWithLog({
      treasury: {
        balance: newTreasuryBalance,
        logs: treasuryLogs
      }
    }, `إيداع يدوي في الخزينة: ${val} ر.س - ${description}`);
  };

  const withdrawFromTreasury = (amount, description) => {
    const val = Number(amount) || 0;
    const newTreasuryBalance = Math.max(0, db.treasury.balance - val);
    const treasuryLogs = [...db.treasury.logs];
    treasuryLogs.unshift({
      id: 'T-' + Date.now(),
      date: new Date().toISOString(),
      amount: val,
      type: 'withdraw',
      description: `سحب يدوي: ${description}`
    });

    saveDbWithLog({
      treasury: {
        balance: newTreasuryBalance,
        logs: treasuryLogs
      }
    }, `سحب يدوي من الخزينة: ${val} ر.س - ${description}`);
  };

  // ==========================================
  // BACKUP & RESTORE & RESET
  // ==========================================
  const backupDatabase = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(db, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `elbadry_trade_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addLog(`تم إجراء نسخة احتياطية يدوية للبيانات`);
  };

  const restoreDatabase = (jsonData) => {
    try {
      const parsedData = JSON.parse(jsonData);
      // Validate schema minimally
      if (parsedData.products && parsedData.customers && parsedData.sales && parsedData.treasury) {
        saveDbWithLog(parsedData, `تم استعادة البيانات بنجاح من نسخة احتياطية`);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const resetDatabaseToDemo = () => {
    const demoDb = generateMockDatabase();
    saveDbWithLog(demoDb, `تم إعادة تهيئة المصنع وتوليد بيانات ديمو تجريبية كاملة`);
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('elbadry_trade_settings', JSON.stringify(DEFAULT_SETTINGS));
    setCurrentBranch(BRANCHES[0]);
    localStorage.setItem('elbadry_trade_branch', JSON.stringify(BRANCHES[0]));
    setCurrentUser(USERS[0]);
    localStorage.setItem('elbadry_trade_user', JSON.stringify(USERS[0]));
  };

  const dbWithSettings = db ? {
    ...db,
    treasury: db.treasury ? {
      ...db.treasury,
      currency: settings.currency,
      shopName: settings.shopName,
      phone: settings.phone,
      address: settings.address,
      vatRate: settings.vatRate,
      whatsappTemplate: settings.whatsappTemplate,
      logoText: settings.logoText
    } : {
      balance: 0,
      logs: [],
      currency: settings.currency,
      shopName: settings.shopName,
      phone: settings.phone,
      address: settings.address,
      vatRate: settings.vatRate,
      whatsappTemplate: settings.whatsappTemplate,
      logoText: settings.logoText
    }
  } : null;

  return (
    <DbContext.Provider value={{
      db: dbWithSettings,
      currentBranch,
      currentUser,
      settings,
      notifications,
      branches: (db && db.branches) || BRANCHES,
      representatives: (db && db.representatives) || [],
      users: USERS,
      changeBranch,
      changeUser,
      addBranch,
      deleteBranch,
      addRepresentative,
      deleteRepresentative,
      settleRepCollection,
      saveSettings,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      deleteCategory,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addSalesInvoice,
      returnSalesInvoice,
      addPurchaseBill,
      addExpense,
      payCustomerDebt,
      paySupplierDebt,
      depositToTreasury,
      withdrawFromTreasury,
      backupDatabase,
      restoreDatabase,
      resetDatabaseToDemo
    }}>
      {db ? children : <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-cairo">جاري تحميل نظام البدري تريد...</div>}
    </DbContext.Provider>
  );
};

export const useDb = () => useContext(DbContext);

// ====================================================
// GENERATOR: Professional Demo/Mock Database Generator
// ====================================================
function generateMockDatabase() {
  const categories = ["شواحن", "كابلات", "سماعات", "باور بانك", "جرابات", "ساعات ذكية", "وصلات"];

  const suppliers = [
    { id: 'S-1', name: "مجموعة أنكر العالمية", phone: "0554122341", company: "Anker Global", email: "anker@supply.com", debt: 15000, billsCount: 12, totalBills: 45000 },
    { id: 'S-2', name: "الرواد لإكسسوارات الموبايل", phone: "0559876543", company: "Al-Rowad Trade", email: "info@alrowad.com", debt: 0, billsCount: 6, totalBills: 12400 },
    { id: 'S-3', name: "مؤسسة الاتصال السريع المحدودة", phone: "0561234567", company: "Quick Connect", email: "import@connect.com", debt: 4200, billsCount: 9, totalBills: 28900 },
    { id: 'S-4', name: "مستورد القدس للإلكترونيات", phone: "0543322110", company: "Al-Quds Accessories", email: "quds@electronics.com", debt: 0, billsCount: 3, totalBills: 8200 }
  ];

  const representatives = [
    { id: 'R-1', name: "أحمد منصور (مندوب الرياض)", phone: "0550000001", activeCollections: 1250, totalSales: 8900 },
    { id: 'R-2', name: "خالد الحربي (مندوب قطاع الشمال)", phone: "0550000002", activeCollections: 0, totalSales: 4500 },
    { id: 'R-3', name: "عادل العتيبي (مندوب قطاع الجنوب)", phone: "0550000003", activeCollections: 450, totalSales: 1250 }
  ];

  const customers = [
    { id: 'C-1', name: "عميل نقدي (كاش)", phone: "0500000000", email: "cash@elbadry.com", notes: "العميل الافتراضي للمعاملات النقدية السريعة", debt: 0, salesCount: 45, totalSales: 7890, repId: 'R-1' },
    { id: 'C-2', name: "أحمد بن عبد العزيز الشمري", phone: "0541112223", email: "ahmed@gmail.com", notes: "عميل جملة مميز", debt: 2450, salesCount: 8, totalSales: 8900, repId: 'R-1' },
    { id: 'C-3', name: "سارة بنت خالد العتيبي", phone: "0558887776", email: "sara.otb@hotmail.com", notes: "", debt: 0, salesCount: 4, totalSales: 1250, repId: 'R-2' },
    { id: 'C-4', name: "محل جوال المستقبل (حساب جملة)", phone: "0563334445", email: "future@jawal.com", notes: "يشتري بسعر الجملة، حساب شهري", debt: 6200, salesCount: 14, totalSales: 24500, repId: 'R-1' },
    { id: 'C-5', name: "محمد بن علي الحربي", phone: "0502223334", email: "m.harbi@yahoo.com", notes: "", debt: 350, salesCount: 3, totalSales: 890, repId: 'R-3' }
  ];

  const products = [
    { id: 'P-1', code: 'PRD-101', barcode: '6941487213251', name: "شاحن أنكر نانو 20 واط Type-C", buyPrice: 42, sellPrice: 85, wholesalePrice: 65, quantity: 45, minStock: 10, category: "شواحن", supplier: "مجموعة أنكر العالمية", description: "شاحن جداري صغير الحجم عالي السرعة لهواتف الآيفون والآندرويد" },
    { id: 'P-2', code: 'PRD-102', barcode: '6941487222314', name: "شاحن جداري أنكر 65 واط 3 منافذ", buyPrice: 110, sellPrice: 220, wholesalePrice: 165, quantity: 18, minStock: 5, category: "شواحن", supplier: "مجموعة أنكر العالمية", description: "شاحن تقنية GaN فائق القوة للكمبيوتر والموبايل" },
    { id: 'P-3', code: 'PRD-103', barcode: '6933138692514', name: "كابل شحن لدنيو تايب سي قماش 1م", buyPrice: 8, sellPrice: 25, wholesalePrice: 15, quantity: 150, minStock: 20, category: "كابلات", supplier: "الرواد لإكسسوارات الموبايل", description: "كابل قماش متين مقاوم للقطع بطول 1 متر يدعم الشحن السريع" },
    { id: 'P-4', code: 'PRD-104', barcode: '1901980012547', name: "كابل لايتنينج أصلي من آبل 1 متر", buyPrice: 55, sellPrice: 99, wholesalePrice: 80, quantity: 3, minStock: 8, category: "كابلات", supplier: "مؤسسة الاتصال السريع المحدودة", description: "سلك شحن وتزامن أصلي معتمد من آبل" },
    { id: 'P-5', code: 'PRD-105', barcode: '6974251145124', name: "سماعات آبل إيربودز برو الجيل الثاني", buyPrice: 620, sellPrice: 899, wholesalePrice: 780, quantity: 8, minStock: 3, category: "سماعات", supplier: "مؤسسة الاتصال السريع المحدودة", description: "سماعة بلوتوث مع ميزة عزل الضوضاء النشط وسبر الخارطة الصوتية" },
    { id: 'P-6', code: 'PRD-106', barcode: '6941487211124', name: "سماعة ساوندكور P20i لاسلكية أنكر", buyPrice: 48, sellPrice: 99, wholesalePrice: 75, quantity: 30, minStock: 10, category: "سماعات", supplier: "مجموعة أنكر العالمية", description: "سماعات أذن لاسلكية بلوتوث، صوت نقي وبطارية تدوم طويلاً" },
    { id: 'P-7', code: 'PRD-107', barcode: '6941487233214', name: "باوربانك أنكر 20,000 مللي أمبير 22.5W", buyPrice: 85, sellPrice: 180, wholesalePrice: 135, quantity: 24, minStock: 5, category: "باور بانك", supplier: "مجموعة أنكر العالمية", description: "خازن طاقة متنقل بسعة هائلة يدعم الشحن السريع للعديد من الأجهزة" },
    { id: 'P-8', code: 'PRD-108', barcode: '6974251144001', name: "باوربانك شاومي نحيف 10,000 مللي أمبير", buyPrice: 45, sellPrice: 95, wholesalePrice: 70, quantity: 5, minStock: 8, category: "باور بانك", supplier: "الرواد لإكسسوارات الموبايل", description: "باوربانك خفيف ومناسب للسفر والحمل اليومي في الجيب" },
    { id: 'P-9', code: 'PRD-109', barcode: '8806090554124', name: "جراب سيليكون مغناطيسي آيفون 15 برو", buyPrice: 15, sellPrice: 65, wholesalePrice: 40, quantity: 60, minStock: 15, category: "جرابات", supplier: "مستورد القدس للإلكترونيات", description: "جراب حماية ناعم يدعم شاحن الـ MagSafe" },
    { id: 'P-10', code: 'PRD-110', barcode: '6974251144998', name: "ساعة ذكية Smart Watch Ultra 8", buyPrice: 65, sellPrice: 180, wholesalePrice: 120, quantity: 15, minStock: 4, category: "ساعات ذكية", supplier: "الرواد لإكسسوارات الموبايل", description: "ساعة شبيهة بأبل ألترا، قياس نبض القلب، شاشة كاملة، ضد الماء" },
    { id: 'P-11', code: 'PRD-111', barcode: '6974251144222', name: "وصلة تحويل Type-C إلى منفذ AUX سماعة", buyPrice: 6, sellPrice: 20, wholesalePrice: 12, quantity: 80, minStock: 10, category: "وصلات", supplier: "مستورد القدس للإلكترونيات", description: "وصلة لتشغيل سماعات الرأس السلكية على الأجهزة الحديثة" }
  ];

  // Pre-generate rich sales history for graph visualization (Last 5 days)
  const sales = [];
  const days = 5;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Day 0, 1, 2, 3, 4 Sales
    if (i === 4) {
      sales.push(
        {
          id: 'I-M1', invoiceNo: 'INV-1001', date: new Date(date.setHours(10, 30)).toISOString(),
          customerId: 'C-1', paymentMethod: 'cash', discount: 10, tax: 25.5, subtotal: 180, total: 195.5,
          branch: BRANCHES[0], cashier: 'المدير العام (أدمن)', cost: 95, profit: 75,
          items: [
            { productId: 'P-1', name: "شاحن أنكر نانو 20 واط Type-C", price: 85, buyPrice: 42, quantity: 1, total: 85 },
            { productId: 'P-8', name: "باوربانك شاومي نحيف 10,000 مللي أمبير", price: 95, buyPrice: 45, quantity: 1, total: 95 }
          ]
        },
        {
          id: 'I-M2', invoiceNo: 'INV-1002', date: new Date(date.setHours(16, 20)).toISOString(),
          customerId: 'C-2', paymentMethod: 'debt', discount: 0, tax: 27, subtotal: 180, total: 207,
          branch: BRANCHES[0], cashier: 'المدير العام (أدمن)', cost: 65, profit: 115,
          items: [
            { productId: 'P-10', name: "ساعة ذكية Smart Watch Ultra 8", price: 180, buyPrice: 65, quantity: 1, total: 180 }
          ]
        }
      );
    } else if (i === 3) {
      sales.push(
        {
          id: 'I-M3', invoiceNo: 'INV-1003', date: new Date(date.setHours(11, 15)).toISOString(),
          customerId: 'C-4', paymentMethod: 'debt', discount: 200, tax: 282, subtotal: 2080, total: 2162,
          branch: BRANCHES[0], cashier: 'المدير العام (أدمن)', cost: 1390, profit: 490,
          items: [
            { productId: 'P-5', name: "سماعات آبل إيربودز برو الجيل الثاني", price: 890, buyPrice: 620, quantity: 2, total: 1780 },
            { productId: 'P-10', name: "ساعة ذكية Smart Watch Ultra 8", price: 150, buyPrice: 65, quantity: 2, total: 300 }
          ]
        }
      );
    } else if (i === 2) {
      sales.push(
        {
          id: 'I-M4', invoiceNo: 'INV-1004', date: new Date(date.setHours(13, 0)).toISOString(),
          customerId: 'C-1', paymentMethod: 'card', discount: 0, tax: 24.75, subtotal: 165, total: 189.75,
          branch: BRANCHES[1], cashier: 'كاشير المحل', cost: 73, profit: 92,
          items: [
            { productId: 'P-3', name: "كابل شحن لدنيو تايب سي قماش 1م", price: 25, buyPrice: 8, quantity: 3, total: 75 },
            { productId: 'P-6', name: "سماعة ساوندكور P20i لاسلكية أنكر", price: 90, buyPrice: 48, quantity: 1, total: 90 }
          ]
        },
        {
          id: 'I-M5', invoiceNo: 'INV-1005', date: new Date(date.setHours(19, 45)).toISOString(),
          customerId: 'C-3', paymentMethod: 'cash', discount: 0, tax: 39, subtotal: 260, total: 299,
          branch: BRANCHES[0], cashier: 'المدير العام (أدمن)', cost: 110, profit: 150,
          items: [
            { productId: 'P-9', name: "جراب سيليكون مغناطيسي آيفون 15 برو", price: 65, buyPrice: 15, quantity: 4, total: 260 }
          ]
        }
      );
    } else if (i === 1) {
      sales.push(
        {
          id: 'I-M6', invoiceNo: 'INV-1006', date: new Date(date.setHours(15, 10)).toISOString(),
          customerId: 'C-1', paymentMethod: 'cash', discount: 5, tax: 35.25, subtotal: 240, total: 270.25,
          branch: BRANCHES[0], cashier: 'كاشير المحل', cost: 110, profit: 125,
          items: [
            { productId: 'P-7', name: "باوربانك أنكر 20,000 مللي أمبير 22.5W", price: 180, buyPrice: 85, quantity: 1, total: 180 },
            { productId: 'P-9', name: "جراب سيليكون مغناطيسي آيفون 15 برو", price: 60, buyPrice: 15, quantity: 1, total: 60 }
          ]
        }
      );
    } else if (i === 0) {
      // Sales today!
      sales.push(
        {
          id: 'I-M7', invoiceNo: 'INV-1007', date: new Date(date.setHours(14, 0)).toISOString(),
          customerId: 'C-1', paymentMethod: 'cash', discount: 0, tax: 27, subtotal: 180, total: 207,
          branch: BRANCHES[0], cashier: 'المدير العام (أدمن)', cost: 84, profit: 96,
          items: [
            { productId: 'P-1', name: "شاحن أنكر نانو 20 واط Type-C", price: 85, buyPrice: 42, quantity: 2, total: 170 },
            { productId: 'P-11', name: "وصلة تحويل Type-C إلى منفذ AUX سماعة", price: 10, buyPrice: 6, quantity: 1, total: 10 }
          ]
        },
        {
          id: 'I-M8', invoiceNo: 'INV-1008', date: new Date(date.setHours(18, 30)).toISOString(),
          customerId: 'C-5', paymentMethod: 'card', discount: 10, tax: 63, subtotal: 430, total: 483,
          branch: BRANCHES[0], cashier: 'كاشير المحل', cost: 194, profit: 226,
          items: [
            { productId: 'P-2', name: "شاحن جداري أنكر 65 واط 3 منافذ", price: 220, buyPrice: 110, quantity: 1, total: 220 },
            { productId: 'P-7', name: "باوربانك أنكر 20,000 مللي أمبير 22.5W", price: 210, buyPrice: 85, quantity: 1, total: 210 }
          ]
        }
      );
    }
  }

  // Pre-generate purchases (from Suppliers)
  const purchases = [
    {
      id: 'PB-1', billNo: 'BILL-1001', date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
      supplierId: 'S-1', paymentMethod: 'debt', discount: 500, tax: 720, subtotal: 5300, total: 5520,
      branch: BRANCHES[0], items: [
        { productId: 'P-1', name: "شاحن أنكر نانو 20 واط Type-C", price: 42, quantity: 50, total: 2100 },
        { productId: 'P-7', name: "باوربانك أنكر 20,000 مللي أمبير 22.5W", price: 80, quantity: 40, total: 3200 }
      ]
    },
    {
      id: 'PB-2', billNo: 'BILL-1002', date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
      supplierId: 'S-2', paymentMethod: 'cash', discount: 0, tax: 180, subtotal: 1200, total: 1380,
      branch: BRANCHES[0], items: [
        { productId: 'P-3', name: "كابل شحن لدنيو تايب سي قماش 1م", price: 8, quantity: 150, total: 1200 }
      ]
    }
  ];

  // Pre-generate expenses
  const expenses = [
    { id: 'E-1', date: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(), amount: 2500, category: "إيجار", description: "دفعة إيجار المحل للنصف الأول من العام", branch: BRANCHES[0] },
    { id: 'E-2', date: new Date(new Date().setDate(new Date().getDate() - 8)).toISOString(), amount: 1500, category: "رواتب", description: "راتب موظف المبيعات لشهر مايو", branch: BRANCHES[0] },
    { id: 'E-3', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), amount: 180, category: "كهرباء ومياه", description: "فاتورة كهرباء المحل", branch: BRANCHES[0] },
    { id: 'E-4', date: new Date().toISOString(), amount: 45, category: "نثريات", description: "ضيافة للعملاء وشراء مياه للمحل", branch: BRANCHES[0] }
  ];

  // Simulated treasury
  const treasury = {
    balance: 14750.5,
    logs: [
      { id: 'T-LOG-1', date: new Date().toISOString(), amount: 483, type: 'deposit', description: "مبيعات فاتورة رقم INV-1008" },
      { id: 'T-LOG-2', date: new Date().toISOString(), amount: 207, type: 'deposit', description: "مبيعات فاتورة رقم INV-1007" },
      { id: 'T-LOG-3', date: new Date().toISOString(), amount: 45, type: 'withdraw', description: "مصروف: نثريات - ضيافة للعملاء وشراء مياه للمحل" },
      { id: 'T-LOG-4', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), amount: 180, type: 'withdraw', description: "مصروف: كهرباء ومياه - فاتورة كهرباء المحل" },
      { id: 'T-LOG-5', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), amount: 299, type: 'deposit', description: "مبيعات فاتورة رقم INV-1005" },
      { id: 'T-LOG-6', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), amount: 189.75, type: 'deposit', description: "مبيعات فاتورة رقم INV-1004" }
    ]
  };

  // Pre-generate journal entries (القيود اليومية المحاسبية)
  const journal = [
    {
      id: 'J-10001',
      date: new Date().toISOString(),
      reference: 'INV-1008',
      description: "قيد مبيعات تلقائي - فاتورة INV-1008",
      entries: [
        { account: 'الخزينة العامة', type: 'debit', amount: 483 },
        { account: 'إيرادات المبيعات', type: 'credit', amount: 420 },
        { account: 'ضريبة مبيعات مستحقة', type: 'credit', amount: 63 }
      ]
    },
    {
      id: 'J-10002',
      date: new Date().toISOString(),
      reference: 'INV-1007',
      description: "قيد مبيعات تلقائي - فاتورة INV-1007",
      entries: [
        { account: 'الخزينة العامة', type: 'debit', amount: 207 },
        { account: 'إيرادات المبيعات', type: 'credit', amount: 180 },
        { account: 'ضريبة مبيعات مستحقة', type: 'credit', amount: 27 }
      ]
    },
    {
      id: 'J-10003',
      date: new Date().toISOString(),
      reference: 'EXPENSE',
      description: "تسجيل مصروف - نثريات",
      entries: [
        { account: 'مصروفات - نثريات', type: 'debit', amount: 45 },
        { account: 'الخزينة العامة', type: 'credit', amount: 45 }
      ]
    },
    {
      id: 'J-10004',
      date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
      reference: 'EXPENSE',
      description: "تسجيل مصروف - كهرباء ومياه",
      entries: [
        { account: 'مصروفات - كهرباء ومياه', type: 'debit', amount: 180 },
        { account: 'الخزينة العامة', type: 'credit', amount: 180 }
      ]
    }
  ];

  // Logs
  const logs = [
    { id: 'L-1', timestamp: new Date().toISOString(), user: 'المدير العام (أدمن)', role: 'Admin', branch: BRANCHES[0], action: 'تم تهيئة وتوليد قاعدة البيانات التجريبية بنجاح' }
  ];

  return {
    categories,
    branches: ["الفرع الرئيسي - الرياض", "فرع جدة - شارع فلسطين", "فرع الدمام - حي الاتصالات"],
    representatives: [
      { id: 'R-1', name: "أحمد منصور (مندوب الرياض)", phone: "0550000001", activeCollections: 1250, totalSales: 8900 },
      { id: 'R-2', name: "خالد الحربي (مندوب قطاع الشمال)", phone: "0550000002", activeCollections: 0, totalSales: 4500 },
      { id: 'R-3', name: "عادل العتيبي (مندوب قطاع الجنوب)", phone: "0550000003", activeCollections: 450, totalSales: 1250 }
    ],
    suppliers,
    customers: [
      { id: 'C-1', name: "عميل نقدي (كاش)", phone: "0500000000", email: "cash@elbadry.com", notes: "العميل الافتراضي للمعاملات النقدية السريعة", debt: 0, salesCount: 45, totalSales: 7890, repId: 'R-1' },
      { id: 'C-2', name: "أحمد بن عبد العزيز الشمري", phone: "0541112223", email: "ahmed@gmail.com", notes: "عميل جملة مميز", debt: 2450, salesCount: 8, totalSales: 8900, repId: 'R-1' },
      { id: 'C-3', name: "سارة بنت خالد العتيبي", phone: "0558887776", email: "sara.otb@hotmail.com", notes: "", debt: 0, salesCount: 4, totalSales: 1250, repId: 'R-2' },
      { id: 'C-4', name: "محل جوال المستقبل (حساب جملة)", phone: "0563334445", email: "future@jawal.com", notes: "يشتري بسعر الجملة، حساب شهري", debt: 6200, salesCount: 14, totalSales: 24500, repId: 'R-1' },
      { id: 'C-5', name: "محمد بن علي الحربي", phone: "0502223334", email: "m.harbi@yahoo.com", notes: "", debt: 350, salesCount: 3, totalSales: 890, repId: 'R-3' }
    ],
    products,
    sales,
    purchases,
    expenses,
    treasury,
    journal,
    logs
  };
}
