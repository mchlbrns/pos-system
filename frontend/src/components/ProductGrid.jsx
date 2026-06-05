import React from 'react';
import { Search, Grid, Plus, Barcode } from 'lucide-react';

export default function ProductGrid({ products, categories, activeCategory, setActiveCategory, onAddProduct, search, setSearch }) {
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(search)) ||
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    
    if (activeCategory === 'all') {
      return matchesSearch;
    }
    return matchesSearch && p.category_id === activeCategory;
  });

  return (
    <>
      {/* Search Bar & Category Filters */}
      <div className="products-toolbar">
        <div className="search-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search products by name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories Tab Navigation */}
        <div className="category-tabs">
          <button
            onClick={() => setActiveCategory('all')}
            className={`cat-tab ${activeCategory === 'all' ? 'active' : ''}`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => {
            const isLowStock = product.quantity <= 10 && product.quantity >= 0;
            return (
              <div
                key={product.id}
                onClick={() => onAddProduct(product)}
                className="product-card"
              >
                {isLowStock && (
                  <div className="product-low-stock">
                    Low Stock ({product.quantity})
                  </div>
                )}

                <div className="product-card-top">
                  <span className="product-unit-badge">{product.unit}</span>
                  {product.barcode && (
                    <Barcode className="product-barcode-icon" title={`Barcode: ${product.barcode}`} />
                  )}
                </div>

                <div className="product-card-body">
                  <div className="product-card-name">{product.name}</div>
                </div>

                <div className="product-card-footer">
                  <div>
                    <div className="product-card-price-label">Retail Price</div>
                    <div className="product-card-price">₱{(product.price).toFixed(2)}</div>
                  </div>
                  <div className="product-add-btn">
                    <Plus style={{ width: 16, height: 16 }} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="products-empty" style={{ gridColumn: '1 / -1' }}>
            <Grid />
            <p>No products found matching your search.</p>
          </div>
        )}
      </div>
    </>
  );
}
