import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [search, setSearch] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sku, setSku] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setQuantity('');
    setSku('');
    setCost('');
    setDescription('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setName(p.name);
    setPrice(p.price);
    setQuantity(p.quantity);
    setSku(p.sku || '');
    setCost(p.cost || '');
    setDescription(p.description || '');
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Custom form validation
    if (!name || !price || !quantity || !sku) {
      setFormError('Required fields are missing. Please fill in Name, Price, Quantity, and SKU.');
      return;
    }

    try {
      const payload = {
        name,
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        sku,
        cost: cost ? parseFloat(cost) : 0,
        description,
        unit: 'pc'
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        setSuccessMsg('Product updated successfully!');
      } else {
        await api.post('/products', payload);
        setSuccessMsg('Product created successfully!');
      }

      setShowModal(false);
      fetchProducts();
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await api.delete(`/products/${productToDelete.id}`);
      setSuccessMsg('Product deleted successfully!');
      setProductToDelete(null);
      fetchProducts();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete product');
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter(p => {
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="products-page animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Product Inventory</h3>
        <button 
          className="btn btn-primary" 
          data-testid="add-product"
          onClick={openAddModal}
        >
          + New Product
        </button>
      </div>

      {successMsg && (
        <div className="success-message alert alert-success" role="alert" style={{ marginBottom: '20px' }}>
          {successMsg}
        </div>
      )}

      {/* Search Input */}
      <div className="search-container" style={{ marginBottom: '20px' }}>
        <input
          type="search"
          className="form-control"
          placeholder="Search products by name, code, or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="product-search"
          style={{ maxWidth: '400px' }}
        />
      </div>

      <div className="table-container glass-effect">
        <table className="table" data-testid="product-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Retail Price</th>
              <th>Stock Qty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted-color)' }}>
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map(p => (
                <tr key={p.id} data-testid="product-row">
                  <td>{p.sku}</td>
                  <td data-testid="product-name-cell"><strong>{p.name}</strong></td>
                  <td>₱{parseFloat(p.price).toFixed(2)}</td>
                  <td>{p.quantity}</td>
                  <td>
                    <button 
                      className="btn btn-sm btn-secondary edit-button" 
                      data-testid="edit-product"
                      onClick={() => openEditModal(p)}
                      style={{ marginRight: '10px' }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger delete-button" 
                      data-testid="delete-product"
                      onClick={() => setProductToDelete(p)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container glass-effect" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'Create Product'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="product-form" data-testid="product-form">
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {formError && (
                  <div className="validation-error alert alert-danger" role="alert">
                    {formError}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Product Name <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Product name"
                    name="name"
                    data-testid="product-name"
                  />
                </div>

                <div className="form-group">
                  <label>Price (PHP) <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)} 
                    placeholder="Price"
                    name="price"
                    data-testid="product-price"
                  />
                </div>

                <div className="form-group">
                  <label>Cost (PHP)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control" 
                    value={cost} 
                    onChange={e => setCost(e.target.value)} 
                    placeholder="Cost price"
                    name="cost"
                    data-testid="product-cost"
                  />
                </div>

                <div className="form-group">
                  <label>Quantity <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                    placeholder="Stock quantity"
                    name="quantity"
                    data-testid="product-stock"
                  />
                </div>

                <div className="form-group">
                  <label>SKU <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={sku} 
                    onChange={e => setSku(e.target.value)} 
                    placeholder="SKU"
                    name="sku"
                    data-testid="product-sku"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    className="form-control" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Product description"
                    name="description"
                    data-testid="product-description"
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" data-testid="save-product">
                  {editingProduct ? 'Save Changes' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="modal-overlay">
          <div className="modal-container glass-effect" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="modal-close" onClick={() => setProductToDelete(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the product <strong>{productToDelete.name}</strong>? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setProductToDelete(null)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-danger confirm-button" 
                data-testid="confirm-delete"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
