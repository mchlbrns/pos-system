import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/useCartStore';
import useStore from '../store/useStore';
import api from '../services/api';
import SearchBar from '../components/SearchBar';
import ProductCard from '../components/ProductCard';
import CartItem from '../components/CartItem';
import PaymentModal from '../components/PaymentModal';
import PrintPreview from '../components/PrintPreview';

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const { currentBusiness, isOnline } = useStore();
  const { 
    items, addItem, removeItem, updateQuantity, clearCart, 
    getSubtotal, getTax, getDiscountAmount, getTotal, 
    discountType, setDiscountType, customerId, setCustomerId 
  } = useCartStore();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory, search]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products', {
        params: {
          search,
          category_id: selectedCategory
        }
      });
      setProducts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/settings'); // settings hold category details or get directly
      // Fallback simple category seeding for filters
      setCategories([
        { id: 1, name: 'Water Refills' },
        { id: 2, name: 'Laundry Services' },
        { id: 3, name: 'Parts & Accessories' }
      ]);
    } catch (e) {}
  };

  const handleCheckoutSubmit = async (paymentDetails) => {
    const total = getTotal();
    const payload = {
      items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      payments: [paymentDetails],
      customer_id: customerId,
      discount_type: discountType
    };

    if (isOnline) {
      try {
        const res = await api.post('/transactions/checkout', payload);
        setReceiptData(res.data);
        clearCart();
        setIsPaymentOpen(false);
      } catch (err) {
        alert(err.response?.data?.error || 'Checkout failed');
      }
    } else {
      // Offline simulation
      const mockReceipt = {
        transaction_number: 'TXN-OFFLINE-' + Math.floor(Math.random() * 1000000),
        date: new Date().toLocaleString(),
        items,
        subtotal: getSubtotal(),
        tax_amount: getTax(),
        discount_amount: getDiscountAmount(),
        total,
        payments: [paymentDetails]
      };
      // Save in offline queue
      const { offlineDB } = await import('../services/offlineDB');
      await offlineDB.queueOfflineTransaction({
        items,
        payments: [paymentDetails],
        customer_id: customerId,
        discountType,
        notes: 'Offline Checkout'
      });
      setReceiptData(mockReceipt);
      clearCart();
      setIsPaymentOpen(false);
    }
  };

  return (
    <div className="pos-grid pos-container" data-testid="pos-screen" id="pos-screen">
      <div className="pos-left-panel">
        <div className="pos-search-filter">
          <SearchBar value={search} onChange={setSearch} />
          
          <div className="category-tabs">
            <button 
              className={`category-tab ${selectedCategory === null ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </button>
            {categories.map(c => (
              <button 
                key={c.id}
                className={`category-tab ${selectedCategory === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="products-grid product-grid" data-testid="product-list">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onAdd={addItem} />
          ))}
        </div>
      </div>

      <div className="pos-right-panel cart-items order-items glass-effect" data-testid="cart" id="cart">
        <div className="cart-header">
          <h3>Current Cart</h3>
          <button className="clear-cart-btn" onClick={clearCart}>Clear</button>
        </div>

        <div className="cart-items-container">
          {items.length === 0 ? (
            <div className="empty-cart-state" data-testid="empty-cart">
              <span>🛒</span>
              <p>Cart is empty</p>
            </div>
          ) : (
            items.map(item => (
              <CartItem 
                key={item.id} 
                item={item} 
                onUpdateQty={updateQuantity} 
                onRemove={removeItem} 
              />
            ))
          )}
        </div>

        <div className="cart-totals-panel">
          <div className="discount-selectors">
            <button 
              className={`discount-btn ${discountType === null ? 'active' : ''}`}
              onClick={() => setDiscountType(null)}
            >
              None
            </button>
            <button 
              className={`discount-btn ${discountType === 'percent_10' ? 'active' : ''}`}
              onClick={() => setDiscountType('percent_10')}
            >
              10% Disc
            </button>
            <button 
              className={`discount-btn ${discountType === 'senior_pwd' ? 'active' : ''}`}
              onClick={() => setDiscountType('senior_pwd')}
            >
              👴 Senior/PWD
            </button>
          </div>

          <div className="totals-breakdown">
            <div className="totals-row">
              <span>Subtotal:</span>
              <span>₱{getSubtotal().toFixed(2)}</span>
            </div>
            <div className="totals-row">
              <span>VAT (12%):</span>
              <span>₱{getTax().toFixed(2)}</span>
            </div>
            <div className="totals-row discount">
              <span>Discount:</span>
              <span>-₱{getDiscountAmount().toFixed(2)}</span>
            </div>
            <div className="totals-row grand-total order-total">
              <span>Grand Total:</span>
              <span className="total-amount order-total" data-testid="cart-total">₱{getTotal().toFixed(2)}</span>
            </div>
          </div>

          <button 
            className="checkout-btn" 
            disabled={items.length === 0}
            data-testid="checkout-button"
            onClick={() => setIsPaymentOpen(true)}
          >
            CHECKOUT (₱{getTotal().toFixed(2)})
          </button>
        </div>
      </div>

      <PaymentModal 
        isOpen={isPaymentOpen}
        total={getTotal()}
        onClose={() => setIsPaymentOpen(false)}
        onSubmit={handleCheckoutSubmit}
      />

      {receiptData && (
        <div className="receipt-modal-overlay receipt-modal" data-testid="checkout-success">
          <div className="receipt-modal-container glass-effect">
            <div className="modal-header">
              <h3>Receipt Printed Successfully</h3>
              <button className="modal-close" onClick={() => setReceiptData(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <PrintPreview receiptData={receiptData} business={currentBusiness} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Re-Print</button>
              <button className="btn btn-secondary" onClick={() => setReceiptData(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
