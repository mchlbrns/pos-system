import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, Settings, LayoutDashboard, LogOut, ShieldAlert, Wifi, WifiOff, Lock, User, RefreshCw, Barcode } from 'lucide-react';
import toast from 'react-hot-toast';

import ProductGrid from './components/ProductGrid';
import Cart from './components/Cart';
import PaymentModal from './components/PaymentModal';
import PluginAttributesModal from './components/PluginAttributesModal';
import PrinterSetup from './pages/PrinterSetup';

// Main App Controller
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const navigate = useNavigate();

  // Handle Online/Offline Status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('System is online. Auto-syncing...', { icon: '🟢' });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('System is offline. Operations cached locally.', { icon: '🔴', duration: 5000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLoginSuccess = (loginData) => {
    localStorage.setItem('token', loginData.token);
    setToken(loginData.token);
    setUser(loginData.user);
    setBusiness(loginData.business);
    navigate('/pos');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setBusiness(null);
    navigate('/login');
  };

  const api = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Fetch Profile on Load
  useEffect(() => {
    if (token) {
      api.get('/auth/profile')
        .then(res => {
          if (res.data.success) {
            setUser(res.data.data.user);
            // Also load active business details
            api.get('/settings/business')
              .then(bRes => {
                if (bRes.data.success) {
                  setBusiness(bRes.data.data);
                }
              }).catch(() => {});
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, [token]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
      <Route
        path="/*"
        element={
          token ? (
            <Layout user={user} business={business} isOnline={isOnline} onLogout={handleLogout}>
              <Routes>
                <Route path="/pos" element={<CashierPanel api={api} user={user} business={business} />} />
                <Route path="/admin/*" element={<AdminPanel api={api} />} />
                <Route path="*" element={<Navigate to="/pos" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

// ---------------------------------------------------------------------
// LAYOUT COMPONENT
// ---------------------------------------------------------------------
function Layout({ children, user, business, isOnline, onLogout }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="top-header">
        <div className="header-brand">
          <div className="header-brand-icon">
            <ShoppingBag style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-brand-text">
            <h1>{business ? business.name : 'Universal POS'}</h1>
            <span>{business ? `${business.type} dashboard` : 'Loading...'}</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Online/Offline Badge */}
          <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? (
              <><Wifi style={{ width: 14, height: 14 }} /><span>ONLINE</span></>
            ) : (
              <><WifiOff style={{ width: 14, height: 14 }} /><span>OFFLINE</span></>
            )}
          </div>

          {/* Cashier / Manager Toggle */}
          <div className="nav-toggle">
            <Link to="/pos" className={`nav-toggle-btn ${!isAdminRoute ? 'active' : ''}`}>
              Cashier
            </Link>
            <Link to="/admin" className={`nav-toggle-btn ${isAdminRoute ? 'active' : ''}`}>
              Manager
            </Link>
          </div>

          <div className="header-divider" />

          {/* User Info & Logout */}
          <div className="header-user">
            <div className="header-user-info">
              <div className="header-user-name">{user ? user.full_name : 'Staff'}</div>
              <div className="header-user-role">{user ? user.role : 'Cashier'}</div>
            </div>
            <button onClick={onLogout} className="header-logout-btn" title="Logout">
              <LogOut style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-area">
        {children}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------
// LOGIN PAGE
// ---------------------------------------------------------------------
function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3000/api/v1/auth/login', { username, password });
      if (res.data.success) {
        toast.success(`Welcome back, ${res.data.data.user.full_name}!`);
        onLoginSuccess(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials or connection issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🇵🇭</div>
          <h2>Universal POS System</h2>
          <p>Log in to open your checkout terminal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              required
              placeholder="e.g. admin, cashier1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="login-submit-btn">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// CASHIER PANEL (POS CORE)
// ---------------------------------------------------------------------
function CashierPanel({ api, user, business }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState(null);
  const [search, setSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [cartTotals, setCartTotals] = useState({ subtotal: 0, tax_amount: 0, discount_amount: 0, total: 0 });

  // Plugin state
  const [activePluginConfig, setActivePluginConfig] = useState(null);
  const [showPluginModal, setShowPluginModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  // Load backend content
  const loadData = async () => {
    try {
      const [prodRes, catRes, custRes, plugRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/categories'),
        api.get('/customers'),
        api.get('/plugins')
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (custRes.data.success) setCustomers(custRes.data.data);

      if (plugRes.data.success && business) {
        const currentPlug = plugRes.data.data.find(p => p.name === business.type);
        if (currentPlug) setActivePluginConfig(currentPlug);
      }
    } catch (e) {
      console.error('Failed to load cashier configurations', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [business]);

  // Recalculate cart whenever items or discounts change
  useEffect(() => {
    if (cart.length === 0) {
      setCartTotals({ subtotal: 0, tax_amount: 0, discount_amount: 0, total: 0 });
      return;
    }

    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;
    const isSenior = discountType === 'senior_pwd';

    for (const item of cart) {
      const qty = item.quantity;
      const price = item.price;
      let lineSubtotal = qty * price;
      let lineDiscount = 0;
      let lineTax = 0;

      if (isSenior) {
        const vatExempt = price / 1.12;
        const discountVal = vatExempt * 0.20;
        lineDiscount = discountVal * qty;
        lineSubtotal = (vatExempt - discountVal) * qty;
        lineTax = 0;
      } else {
        const vatExempt = price / 1.12;
        lineTax = (price - vatExempt) * qty;
        lineSubtotal = lineTax + vatExempt * qty;

        if (discountType === 'percent_10') {
          lineDiscount = lineSubtotal * 0.10;
        } else if (discountType === 'percent_20') {
          lineDiscount = lineSubtotal * 0.20;
        }
        lineSubtotal -= lineDiscount;
        lineTax = (lineSubtotal / 1.12) * 0.12;
      }

      subtotal += lineSubtotal - lineTax;
      tax_amount += lineTax;
      discount_amount += lineDiscount;
    }

    const total = subtotal + tax_amount;
    setCartTotals({
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax_amount: parseFloat(tax_amount.toFixed(2)),
      discount_amount: parseFloat(discount_amount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    });
  }, [cart, discountType]);

  const handleAddProduct = (product) => {
    // If business has plugin fields, show modal instead of prompt
    if (activePluginConfig && activePluginConfig.fields && activePluginConfig.fields.length > 0) {
      setPendingProduct(product);
      setShowPluginModal(true);
      return;
    }

    // Default flow for general products
    addToCart(product, {});
  };

  const addToCart = (product, pluginAttributes) => {
    const existing = cart.find(item => 
      item.id === product.id && 
      JSON.stringify(item.plugin_attributes) === JSON.stringify(pluginAttributes)
    );

    if (existing) {
      handleUpdateQty(product.id, existing.quantity + 1);
    } else {
      setCart([...cart, { ...product, quantity: 1, plugin_attributes: pluginAttributes }]);
      toast.success(`${product.name} added to cart`);
    }
  };

  const handlePluginModalConfirm = (attributes) => {
    addToCart(pendingProduct, attributes);
    setShowPluginModal(false);
    setPendingProduct(null);
  };

  const handleUpdateQty = (id, qty) => {
    if (qty <= 0) {
      handleDeleteItem(id);
      return;
    }
    setCart(cart.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const handleDeleteItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
    toast.success('Item removed');
  };

  // Barcode scanner simulator
  useEffect(() => {
    let barcodeBuffer = '';
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          const found = products.find(p => p.barcode === barcodeBuffer);
          if (found) {
            handleAddProduct(found);
            toast.success(`Scanned: ${found.name}`);
          } else {
            toast.error(`No product with barcode "${barcodeBuffer}"`);
          }
          barcodeBuffer = '';
        }
      } else {
        if (e.key.length === 1 && /[0-9a-zA-Z]/.test(e.key)) {
          barcodeBuffer += e.key;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  const handleProcessCheckout = async (paymentDetails) => {
    const toastId = toast.loading('Filing sale transaction...');
    try {
      const res = await api.post('/transactions/checkout', {
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.quantity * item.price,
          plugin_attributes: item.plugin_attributes
        })),
        payments: [paymentDetails],
        customer_id: selectedCustomer,
        discount_type: discountType,
        notes: ''
      });

      if (res.data.success) {
        toast.success('Sale transaction filed successfully!', { id: toastId });
        setCart([]);
        setDiscountType(null);
        setSelectedCustomer(null);
        setShowCheckout(false);
        // Refresh product stock list
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to check out.', { id: toastId });
    }
  };

  return (
    <div className="pos-layout">
      {/* Products Panel */}
      <div className="products-panel">
        <ProductGrid
          products={products}
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onAddProduct={handleAddProduct}
          search={search}
          setSearch={setSearch}
        />
      </div>

      {/* Cart Panel */}
      <div className="cart-panel">
        <Cart
          cart={cart}
          customers={customers}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          discountType={discountType}
          setDiscountType={setDiscountType}
          onUpdateQty={handleUpdateQty}
          onDeleteItem={handleDeleteItem}
          totals={cartTotals}
          onCheckout={() => setShowCheckout(true)}
        />
      </div>

      {/* Payment Modals */}
      {showCheckout && (
        <PaymentModal
          total={cartTotals.total}
          onClose={() => setShowCheckout(false)}
          onConfirm={handleProcessCheckout}
        />
      )}

      {/* Plugin Attributes Modal */}
      {showPluginModal && pendingProduct && activePluginConfig && (
        <PluginAttributesModal
          product={pendingProduct}
          fields={activePluginConfig.fields}
          onClose={() => {
            setShowPluginModal(false);
            setPendingProduct(null);
          }}
          onConfirm={handlePluginModalConfirm}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// PIN-PROTECTED ADMIN PANEL
// ---------------------------------------------------------------------
function AdminPanel({ api }) {
  const [pinVerified, setPinVerified] = useState(false);
  const [pin, setPin] = useState('');

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/settings/verify-pin', { pin });
      if (res.data.success && res.data.data.verified) {
        setPinVerified(true);
        toast.success('Access Granted');
      }
    } catch (e) {
      toast.error('Incorrect PIN code. Try default "1234".');
      setPin('');
    }
  };

  if (!pinVerified) {
    return (
      <div className="admin-pin-page">
        <div className="admin-pin-card">
          <div className="admin-pin-icon">
            <Lock style={{ width: 22, height: 22 }} />
          </div>
          <h2>Administrator Access Only</h2>
          <p className="pin-subtitle">Authentication Required</p>
          <form onSubmit={handleVerifyPin} className="admin-pin-form">
            <input
              type="password"
              required
              maxLength={6}
              placeholder="Enter PIN (e.g. 1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <button type="submit" className="admin-pin-submit">
              Verify Code
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-nav">
          <Link to="/admin/business" className="admin-nav-link">
            <LayoutDashboard />
            <span>Active Business</span>
          </Link>
          <Link to="/admin/printer" className="admin-nav-link">
            <Settings />
            <span>Printer Wizard</span>
          </Link>
          <Link to="/admin/reports" className="admin-nav-link">
            <ShieldAlert />
            <span>Shop Reports</span>
          </Link>
        </div>
        <div className="admin-sidebar-footer">
          <button onClick={() => setPinVerified(false)} className="admin-lock-btn">
            Lock Panel
          </button>
        </div>
      </aside>

      {/* Admin details area */}
      <section className="admin-content">
        <Routes>
          <Route path="business" element={<AdminBusinessSwitch api={api} />} />
          <Route path="printer" element={<PrinterSetup />} />
          <Route path="reports" element={<AdminReports api={api} />} />
          <Route path="*" element={<Navigate to="business" replace />} />
        </Routes>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------
// ADMIN: BUSINESS & PLUGINS SWITCH (Step 5)
// ---------------------------------------------------------------------
function AdminBusinessSwitch({ api }) {
  const [business, setBusiness] = useState(null);
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSettings = async () => {
    try {
      const [bizRes, plugRes] = await Promise.all([
        api.get('/settings/business'),
        api.get('/plugins')
      ]);
      if (bizRes.data.success) setBusiness(bizRes.data.data);
      if (plugRes.data.success) setPlugins(plugRes.data.data);
    } catch (e) {
      toast.error('Failed to load plugin configurations');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSwitchType = async (type) => {
    setLoading(true);
    const toastId = toast.loading(`Reconfiguring system for ${type}...`);
    try {
      const res = await api.post('/settings/plugin', { activePlugin: type });
      if (res.data.success) {
        toast.success(`Successfully activated ${type} plugin!`, { id: toastId });
        await loadSettings();
        // Force refresh page to sync cashier styles
        window.location.reload();
      }
    } catch (e) {
      toast.error('Plugin reconfiguration failed.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 className="admin-page-title">Shop Profile & Active Plugins</h2>
      <p className="admin-page-subtitle">Switch your system type to water stations, laundry hubs, or motor repair shops without restarts.</p>

      {business && (
        <div className="admin-card">
          <h3>Store Metadata</h3>
          <div className="admin-meta-grid">
            <div className="admin-meta-item">
              <p className="meta-label">Shop Name</p>
              <p className="meta-value">{business.name}</p>
            </div>
            <div className="admin-meta-item">
              <p className="meta-label">Category Type</p>
              <span className="type-badge">{business.type}</span>
            </div>
            <div className="admin-meta-item full-width">
              <p className="meta-label">Registered Address</p>
              <p className="meta-value">{business.address || 'Not specified'}</p>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>Plugin Profiles</h3>
      <div className="plugin-list">
        {plugins.map(plug => {
          const isActive = business?.type === plug.name;
          return (
            <div key={plug.name} className={`plugin-card ${isActive ? 'is-active' : ''}`}>
              <div className="plugin-card-info">
                <p className="plugin-name">
                  {plug.name}
                  {isActive && <span className="plugin-active-badge">active</span>}
                </p>
                <div className="plugin-meta">
                  <span>Unit: <strong>{plug.unitOfMeasure || 'pc'}</strong></span>
                  <span>Attributes: <strong>{plug.fields ? plug.fields.join(', ') : 'None'}</strong></span>
                </div>
              </div>
              {!isActive && (
                <button
                  onClick={() => handleSwitchType(plug.name)}
                  disabled={loading}
                  className="plugin-activate-btn"
                >
                  Activate Plugin
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// ADMIN: REPORTS SUB-COMPONENT
// ---------------------------------------------------------------------
function AdminReports({ api }) {
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        api.get('/reports/daily'),
        api.get('/reports/weekly')
      ]);
      if (dailyRes.data.success) setDailyData(dailyRes.data.data);
      if (weeklyRes.data.success) setWeeklyData(weeklyRes.data.data);
    } catch (e) {
      toast.error('Failed to query sales reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="loading-state" style={{ paddingTop: 80 }}>
        <RefreshCw style={{ width: 36, height: 36, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
        <p className="loading-text">Generating sales analysis reports...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 className="admin-page-title">Shop Performance & Daily Reports</h2>
      <p className="admin-page-subtitle">Track daily orders, tax calculations, discounts, and leading inventory lines.</p>

      {dailyData && (
        <div className="reports-stats-grid">
          <div className="stat-card">
            <p className="stat-label">Sales Completed</p>
            <p className="stat-value">{dailyData.summary.total_orders}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Net Revenue</p>
            <p className="stat-value blue">₱{dailyData.summary.total.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">VAT Exempt/Exemptions</p>
            <p className="stat-value">₱{dailyData.summary.tax.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Discounts Filed</p>
            <p className="stat-value red">₱{dailyData.summary.discount.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="reports-detail-grid">
        <div className="report-card">
          <h3>Top Selling Line Items</h3>
          {dailyData && dailyData.top_products.length > 0 ? (
            <div className="report-list">
              {dailyData.top_products.map((p, idx) => (
                <div key={p.product_name} className="report-list-item">
                  <span className="report-item-name">{idx + 1}. {p.product_name}</span>
                  <span className="report-item-badge">{p.quantity} sold</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="report-empty">No sales transactions logged today.</p>
          )}
        </div>

        <div className="report-card">
          <h3>Revenue Breakdown by Payment Option</h3>
          {dailyData && dailyData.payments.length > 0 ? (
            <div className="report-list">
              {dailyData.payments.map(p => (
                <div key={p.method} className="report-list-item">
                  <span className="report-item-name" style={{ textTransform: 'capitalize' }}>{p.method.replace('_', ' ')}</span>
                  <span className="report-item-value">₱{p.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="report-empty">No payment data logged today.</p>
          )}
        </div>
      </div>
    </div>
  );
}
