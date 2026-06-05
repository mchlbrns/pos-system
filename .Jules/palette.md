## 2026-06-05 - Add ARIA Labels to Icon-Only Buttons
**Learning:** Found a common accessibility issue pattern across the app's components (`Cart.jsx`, `ProductGrid.jsx`) where icon-only buttons (like increase/decrease quantity, add product, remove item) were completely missing `aria-label` attributes, making them inaccessible to screen readers.
**Action:** Always ensure that any button containing only an icon has a descriptive `aria-label` attribute that clearly states its function.
