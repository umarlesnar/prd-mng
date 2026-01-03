# External API Postman Testing Documentation

## Overview
This document provides comprehensive instructions for testing the External API endpoints using Postman. The external API is designed for botflow integration where customer details and warranty/claim registration data are collected and passed to the system.

## Key Features

- **Simplified API**: Only pass serial number and customer data - system handles the rest
- **Automatic Store Detection**: Store ID is automatically found from product serial number
- **Automatic Customer Creation**: Customers are created if they don't exist
- **Automatic Date Calculation**: Warranty dates are automatically calculated
- **Automatic PDF Generation**: Warranty PDF is automatically generated after registration
- **Multiple Claims Per Warranty**: A single warranty can have multiple claims
- **Phone or Email Lookup**: Retrieve warranty/claims using either phone number or email
- **API Key Required**: All external API endpoints require API key authentication

## Prerequisites

1. **API Key Generation**:
   - Login to the system
   - Navigate to Settings > API Keys
   - Click "Generate API Key"
   - Copy the generated API key (shown only once)
   - Note: API key is required for all external API endpoints

2. **Base URL**:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`

3. **Authentication**:
   - **All endpoints** require API key authentication
   - Use either:
     - `X-API-Key: {your_api_key}`
     - `Authorization: Bearer {your_api_key}`

## API Endpoints

### 1. Register Warranty

**Endpoint**: `POST /api/external/warranties`

**Description**: Register a warranty for a product. System automatically:
- Finds the store from product serial number
- Creates customer if doesn't exist (matched by phone number or email)
- Updates customer info if already exists
- Allows multiple warranties per product (one per customer)
- Calculates warranty start (current date) and end dates
- Generates QR code
- Generates warranty PDF

**Headers**:
```
Content-Type: application/json
X-API-Key: {your_api_key}
```

**Request Body**:
```json
{
  "product_serial_number": "PRD-IPH-123456",
  "customer_name": "John Doe",
  "customer_phone": "+919876543210",
  "customer_email": "john@example.com",
  "customer_address": "123 Main St, City, State 12345"
}
```

**Required Fields**:
- `product_serial_number` (string): Serial number of the product
- `customer_name` (string): Customer's full name
- At least one of: `customer_phone` or `customer_email`

**Optional Fields**:
- `customer_phone` (string): Customer's phone number (with country code)
- `customer_email` (string): Customer's email address
- `customer_address` (string): Customer's address

**Behavior**:
- If customer with this phone number or email doesn't exist in the store, a new customer is created automatically
- If customer exists, their information is updated with provided data
- If warranty already exists for this customer-product combination, returns 400 error
- If warranty doesn't exist for this customer-product combination, warranty is created

**Success Response** (201 Created):
```json
{
  "warranty": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "product_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "customer_id": "65a1b2c3d4e5f6g7h8i9j0k3",
    "store_id": "65a1b2c3d4e5f6g7h8i9j0k4",
    "warranty_start": "2024-01-15T00:00:00.000Z",
    "warranty_end": "2025-01-15T00:00:00.000Z",
    "status": "active",
    "qr_code_url": "/uploads/qr/qr-PRD-IPH-123456-1234567890.png",
    "warranty_pdf_url": "/uploads/warranties/warranty-PRD-IPH-123456-1234567890.pdf"
  },
  "message": "Warranty registered successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Validation error, warranty already exists for this customer-product combination, or warranty not active
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Product not found or warranty not found for this customer-product combination

---

### 2. Register Claim

**Endpoint**: `POST /api/external/claims`

**Description**: Register a warranty claim. System automatically:
- Finds the store from product serial number
- Finds the warranty for the specific customer-product combination
- Verifies warranty exists for that customer
- Creates claim without modifying warranty status (warranty remains active or expired)

**Headers**:
```
Content-Type: application/json
X-API-Key: {your_api_key}
```

**Request Body**:
```json
{
  "product_serial_number": "PRD-IPH-123456",
  "customer_phone": "+919876543210",
  "customer_email": "john@example.com",
  "claim_type": "repair",
  "description": "Screen is cracked and not responding to touch. Device was dropped.",
  "attachments": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Required Fields**:
- `product_serial_number` (string): Serial number of the product
- At least one of: `customer_phone` or `customer_email`
- `claim_type` (string): One of "repair", "replacement", "refund"
- `description` (string): Claim description (minimum 10 characters)

**Optional Fields**:
- `customer_phone` (string): Customer's phone number (must match the customer who has warranty for this product)
- `customer_email` (string): Customer's email address (must match the customer who has warranty for this product)
- `attachments` (array of strings): URLs to attachment files

**Behavior**:
- Finds warranty for the specific customer-product combination using phone or email
- If warranty doesn't exist for this customer and product, returns 404 error
- If warranty exists and is active, claim is created (warranty status remains unchanged)
- If warranty is expired, returns 400 error (only active warranties can have claims)
- Multiple claims can be created for the same warranty

**Success Response** (201 Created):
```json
{
  "claim": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k5",
    "warranty_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "store_id": "65a1b2c3d4e5f6g7h8i9j0k4",
    "claim_type": "repair",
    "description": "Screen is cracked and not responding to touch.",
    "status": "pending",
    "attachments": ["https://example.com/image1.jpg"],
    "timeline_events": [
      {
        "timestamp": "2024-01-20T10:30:00.000Z",
        "action": "Claim created via external API"
      }
    ]
  },
  "message": "Claim registered successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Validation error, description too short, invalid claim type, or warranty not active
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Product not found or warranty not found for this customer-product combination

---

### 3. Check Warranty Status

**Endpoint**: `GET /api/external/warranties/{serial}`

**Description**: Retrieve warranty information for a product by serial number and customer phone or email. Requires API key.

**Headers**:
```
X-API-Key: {your_api_key}
```

**URL Parameters**:
- `serial` (path parameter): Product serial number

**Query Parameters** (at least one required):
- `customer_phone` (optional): Customer's phone number
- `customer_email` (optional): Customer's email address

**Example Request**:
```
GET /api/external/warranties/PRD-IPH-123456?customer_phone=%2B919876543210
```

or

```
GET /api/external/warranties/PRD-IPH-123456?customer_email=john@example.com
```

**Success Response** (200 OK):
```json
{
  "warranty": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "product_id": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "product_model": "iPhone 15 Pro",
      "brand": "Apple",
      "category": "Electronics",
      "serial_number": "PRD-IPH-123456"
    },
    "customer_id": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "customer_name": "John Doe",
      "phone": "+919876543210",
      "email": "john@example.com"
    },
    "warranty_start": "2024-01-15T00:00:00.000Z",
    "warranty_end": "2025-01-15T00:00:00.000Z",
    "status": "active",
    "qr_code_url": "/uploads/qr/qr-PRD-IPH-123456-1234567890.png",
    "warranty_pdf_url": "/uploads/warranties/warranty-PRD-IPH-123456-1234567890.pdf"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (missing phone or email)
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Product or warranty not found for this customer

---

### 4. Get Claims by Serial Number and Customer

**Endpoint**: `GET /api/external/claims/{serial}`

**Description**: Retrieve all claims for a warranty by serial number and customer phone or email. Requires API key.

**Headers**:
```
X-API-Key: {your_api_key}
```

**URL Parameters**:
- `serial` (path parameter): Product serial number

**Query Parameters** (at least one required):
- `customer_phone` (optional): Customer's phone number
- `customer_email` (optional): Customer's email address

**Example Request**:
```
GET /api/external/claims/PRD-IPH-123456?customer_phone=%2B919876543210
```

or

```
GET /api/external/claims/PRD-IPH-123456?customer_email=john@example.com
```

**Success Response** (200 OK):
```json
{
  "claims": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k5",
      "warranty_id": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "product_id": {
          "product_model": "iPhone 15 Pro",
          "brand": "Apple",
          "category": "Electronics",
          "serial_number": "PRD-IPH-123456"
        },
        "customer_id": {
          "customer_name": "John Doe",
          "phone": "+919876543210",
          "email": "john@example.com"
        }
      },
      "claim_type": "repair",
      "description": "Screen is cracked",
      "status": "pending",
      "timeline_events": [
        {
          "timestamp": "2024-01-20T10:30:00.000Z",
          "action": "Claim created via external API"
        }
      ]
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (missing phone or email)
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Product or warranty not found for this customer

---

### 5. Get Product by Serial Number

**Endpoint**: `GET /api/external/products/{serial}`

**Description**: Retrieve product item information by serial number. Requires API key.

**Headers**:
```
X-API-Key: {your_api_key}
```

**URL Parameters**:
- `serial` (path parameter): Product serial number

**Example Request**:
```
GET /api/external/products/PRD-IPH-123456
```

**Success Response** (200 OK):
```json
{
  "product": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "serial_number": "PRD-IPH-123456",
    "batch_id": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k6",
      "manufacturing_date": "2024-01-01T00:00:00.000Z",
      "warranty_period_months": 12,
      "quantity": 100
    },
    "product_template_id": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k7",
      "brand": "Apple",
      "product_model": "iPhone 15 Pro",
      "category": "Electronics"
    }
  }
}
```

---

## Postman Environment Variables

Create a Postman environment with these variables:

```json
{
  "base_url": "http://localhost:3000",
  "api_key": "your_api_key_here"
}
```

## Postman Collection Setup

1. **Create Collection**: Create a new collection named "Product Management External API"
2. **Add Environment Variables**: Set up environment variables as above
3. **Add Requests**: Create requests for each endpoint
4. **Set Authorization**: Use collection-level authorization with API Key header
5. **Add Tests**: Add response validation tests

## Testing Checklist

### Warranty Registration Tests
- [ ] Test with phone number only
- [ ] Test with email only
- [ ] Test with both phone and email
- [ ] Test with optional fields
- [ ] Test with invalid product serial number (should return 404)
- [ ] Test with duplicate warranty for same customer-product (should return 400)
- [ ] Test with same product but different customer (should create new warranty)
- [ ] Test with missing phone and email (should return 400)
- [ ] Test with missing API key (should return 401)
- [ ] Verify customer is created if doesn't exist
- [ ] Verify existing customer info is updated
- [ ] Verify warranty PDF is generated

### Claim Registration Tests
- [ ] Test with phone number only
- [ ] Test with email only
- [ ] Test with both phone and email
- [ ] Test with attachments
- [ ] Test with invalid product serial number (should return 404)
- [ ] Test with customer_phone/email that doesn't have warranty (should return 404)
- [ ] Test with inactive warranty (should return 400)
- [ ] Test with description too short (should return 400)
- [ ] Test with invalid claim type (should return 400)
- [ ] Test with missing phone and email (should return 400)
- [ ] Test with missing API key (should return 401)
- [ ] Verify warranty status remains unchanged after claim creation

### Query Tests
- [ ] Test warranty lookup by serial and customer_phone with API key
- [ ] Test warranty lookup by serial and customer_email with API key
- [ ] Test claims lookup by serial and customer_phone with API key
- [ ] Test claims lookup by serial and customer_email with API key
- [ ] Test product lookup by serial number with API key
- [ ] Test with invalid serial number (should return 404)
- [ ] Test with missing customer_phone and customer_email (should return 400)
- [ ] Test warranty lookup without API key (should return 401)
- [ ] Test claims lookup without API key (should return 401)

## Common Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["customer_name"],
      "message": "Required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "API key is required"
}
```

or

```json
{
  "error": "Invalid API key"
}
```

### 404 Not Found
```json
{
  "error": "Product not found with the provided serial number"
}
```

## Botflow Integration Example

### Step 1: Collect Customer Details
```json
{
  "customer_name": "John Doe",
  "customer_phone": "+919876543210",
  "customer_email": "john@example.com",
  "customer_address": "123 Main St"
}
```

### Step 2: Collect Warranty Registration Details
```json
{
  "product_serial_number": "PRD-IPH-123456"
}
```

### Step 3: Register Warranty
```bash
POST /api/external/warranties
Headers:
  X-API-Key: {your_api_key}
  Content-Type: application/json

{
  "product_serial_number": "PRD-IPH-123456",
  "customer_name": "John Doe",
  "customer_phone": "+919876543210",
  "customer_email": "john@example.com",
  "customer_address": "123 Main St"
}
```

### Step 4: Collect Claim Details (if needed)
```json
{
  "claim_type": "repair",
  "description": "Screen is cracked"
}
```

### Step 5: Register Claim
```bash
POST /api/external/claims
Headers:
  X-API-Key: {your_api_key}
  Content-Type: application/json

{
  "product_serial_number": "PRD-IPH-123456",
  "customer_phone": "+919876543210",
  "claim_type": "repair",
  "description": "Screen is cracked and not responding to touch"
}
```

## Key Points

- **Warranty Status**: Only two statuses exist - "active" (within warranty period) or "expired" (past warranty end date)
- **Multiple Claims Per Warranty**: A single warranty can have multiple claims filed against it
- **Multiple Warranties Per Product**: Different customers can have warranties for the same product
- **Customer Identification**: Use phone number or email to identify customers
- **Warranty Uniqueness**: A warranty is unique per product-customer combination
- **Automatic Customer Creation**: Customers are created automatically if they don't exist
- **Warranty Status Immutable**: Warranty status is determined by dates, not by claim creation
- **API Key Required**: All external API endpoints require API key authentication
- **Phone or Email Lookup**: Retrieve warranty/claims using either phone number or email
- **Correct Customer Matching**: When multiple warranties exist for the same product (different customers), the system correctly matches the warranty to the requesting customer using phone or email

## Notes

- **Warranty Status**: Warranty status is only "active" or "expired" based on warranty dates, not affected by claims
- **Multiple Claims Per Warranty**: Different claims can be filed for the same warranty
- **Multiple Warranties Per Product**: Different customers can have warranties for the same product
- **Customer Matching**: Customers are matched by phone number or email within a store
- **Warranty Uniqueness**: A warranty is unique per product-customer combination, not just per product
- **Claim Customer Identification**: Claims require customer_phone or customer_email to identify which customer's warranty to use
- **Automatic Customer Creation**: Customers are created automatically if they don't exist (matched by phone or email)
- **Automatic Customer Update**: If customer exists, their information is updated with provided data
- **Date Auto-Calculation**: Warranty dates are automatically calculated
- **PDF Auto-Generation**: Warranty PDF is automatically generated after warranty creation
- **API Key Required**: All external API endpoints require API key authentication
- **Phone or Email Lookup**: Retrieve warranty/claims using either phone number or email
- **Correct Customer Matching**: When multiple warranties exist for the same product (different customers), the system correctly iterates through all warranties and matches the correct one based on customer phone or email
