const request = require('supertest');
const express = require('express');

// Mock auth middleware to bypass real auth
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { business_id: 1 };
    next();
  }
}));

const productRoutes = require('../../routes/products');
const Product = require('../../models/Product');

const app = express();
app.use(express.json());
app.use('/', productRoutes);

// Mock error handler identical to app.js to test next(err) behavior
app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    error: 'Internal Server Error. Please contact support or check error logs.'
  });
});

describe('Products Route', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /', () => {
    it('should handle errors by calling next(err) and returning 500 status', async () => {
      // Setup mock to throw an error
      jest.spyOn(Product, 'findByBusiness').mockImplementation(() => {
        throw new Error('Mocked Database Error');
      });

      // Make the request
      const response = await request(app).get('/');

      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Internal Server Error. Please contact support or check error logs.'
      });
      expect(Product.findByBusiness).toHaveBeenCalled();
    });
  });
});
