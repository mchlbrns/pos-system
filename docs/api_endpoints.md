# API Endpoints Specification

Base URL: `http://localhost:3000/api`

## 1. Authentication
* **POST /auth/login**
  - Payload: `{ "username": "admin", "password": "password" }`
  - Response: `{ "token": "JWT_TOKEN", "user": { ... }, "business": { ... } }`

* **GET /auth/profile**
  - Headers: `Authorization: Bearer JWT_TOKEN`
  - Response: `{ "user": { ... } }`

## 2. Products
* **GET /products** (Filters: `search`, `category_id`)
  - Response: `[ { "id": 1, "name": "Item Name", ... } ]`

* **POST /products**
  - Payload: `{ "name": "Refill", "price": 35.00, "quantity": 100, "sku": "REF-01", "unit": "pc" }`

* **PUT /products/:id**
  - Payload: `{ "price": 40.00 }`

* **DELETE /products/:id**
  - Response: `{ "success": true }`

## 3. Transactions & Checkout
* **POST /transactions/checkout**
  - Payload:
    ```json
    {
      "items": [
        { "id": 1, "quantity": 2, "price": 35.00 }
      ],
      "payments": [
        { "method": "cash", "amount": 100.00 }
      ],
      "customer_id": null,
      "discount_type": "senior_pwd"
    }
    ```
  - Response: `{ "id": 1, "transaction_number": "TXN-123456", ... }`

* **POST /transactions/:id/void**
  - Response: `{ "id": 1, "status": "voided" }`

## 4. Licensing
* **GET /settings/license**
  - Response: `{ "key": "AAAA-BBBB-CCCC-DDDD", "status": "active" }`

* **POST /settings/license**
  - Payload: `{ "key": "XXXX-XXXX-XXXX-XXXX" }`
  - Response: `{ "message": "License key activated successfully!" }`
