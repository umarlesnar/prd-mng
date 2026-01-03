# Product Management System - Working Flow

## Overview
This document describes the working flow of the Product Management System, detailing how different components interact and how data flows through the system.

## Authentication Flow

### 1. User Login
1. User enters email and password on login page
2. System authenticates via Next Auth
3. User context is established (user_account or store_user)
4. Store context is loaded based on user's access
5. Store ID is added to URL parameters (`?storeId={id}`)
6. User is redirected to dashboard with store context

### 2. Store Selection
1. User selects a store from available stores
2. Store ID is updated in:
   - Local storage
   - URL parameters
   - Application context
3. Store users are refreshed for the selected store
4. User is redirected to dashboard with new store context
5. All subsequent operations are scoped to the selected store

### 3. URL Persistence
- Store ID is maintained in URL parameters
- On page refresh, store ID is read from URL
- Store context is restored from URL parameter
- Ensures user stays in the same store after refresh

## Product Management Flow

### 1. Product Creation
1. User navigates to Products page (automatically scoped to current store)
2. User clicks "Add Product"
3. Form is displayed (no store selection - uses current store)
4. User fills in:
   - Brand
   - Model (used in serial number generation)
   - Category
   - Manufacturing date
   - Warranty period (months)
5. On submit:
   - Serial number is auto-generated: `{PREFIX}-{MODEL}-{RANDOM}{SUFFIX}`
   - Product is created with current store ID
   - Product list is automatically refreshed
   - Success notification is shown

### 2. Serial Number Generation
1. System retrieves store's serial prefix and suffix
2. Model is processed to create a 3-character prefix
3. Random 6-digit number is generated
4. Format: `{STORE_PREFIX}-{MODEL_PREFIX}-{RANDOM}{STORE_SUFFIX}`
5. Uniqueness is verified
6. If not unique, process repeats (max 10 attempts)

## Customer Management Flow

### 1. Customer Creation
1. User navigates to Customers page
2. User clicks "Add Customer"
3. Form is displayed with:
   - Name (required)
   - Phone with country code selector (required)
   - Email (optional)
   - Address (optional)
   - GST number (optional)
4. Phone number is stored with country code
5. On submit:
   - Customer is created with current store ID
   - Customer list is automatically refreshed
   - Success notification is shown

### 2. Phone Number Handling
- All phone inputs use `PhoneInputField` component
- Country code selector is integrated
- Phone numbers are stored in international format
- Consistent across all forms (signup, customer, store user, store settings)

## Warranty Management Flow

### 1. Warranty Registration (Internal)
1. User navigates to Warranties page
2. User clicks "Register Warranty"
3. Form displays:
   - Product selection (from current store)
   - Customer selection (from current store)
   - Warranty start date
4. On submit:
   - Warranty end date is calculated (start date + product warranty months)
   - QR code is generated
   - PDF warranty certificate is generated
   - Warranty is created
   - Warranty list is automatically refreshed
   - Success notification is shown

### 2. Warranty Registration (External API)
1. External system (botflow) sends POST request to `/api/external/warranties`
2. Request includes only:
   - Product serial number
   - Customer information (name, phone, email, address)
3. System automatically:
   - Finds product by serial number (gets store_id from product)
   - Finds or creates customer (matched by phone number)
   - Checks for existing warranty
   - Calculates warranty start date (current date)
   - Calculates warranty end date (start + product warranty months)
   - Generates QR code
   - Creates warranty
   - Generates warranty PDF
   - Updates warranty with PDF URL
   - Returns warranty details
4. Warranty is available in the system immediately with PDF

## Claim Management Flow

### 1. Claim Creation (Internal)
1. User navigates to Claims page
2. User clicks "File Claim"
3. Form displays:
   - Warranty selection (from current store)
   - Claim type (repair, replacement, refund)
   - Description (min 10 characters)
4. On submit:
   - Claim is created with "pending" status
   - Warranty status is updated to "claimed"
   - Timeline event is added
   - Claim list is automatically refreshed
   - Success notification is shown

### 2. Claim Creation (External API)
1. External system (botflow) sends POST request to `/api/external/claims`
2. Request includes only:
   - Product serial number
   - Claim type
   - Description
   - Optional attachments
3. System automatically:
   - Finds product by serial number (gets store_id from product)
   - Finds warranty for product
   - Validates warranty is active
   - Creates claim
   - Updates warranty status to "claimed"
   - Returns claim details

### 3. Claim Status Updates
1. User updates claim status (approve, reject, complete)
2. Timeline event is added
3. Claim list is automatically refreshed
4. Success notification is shown

## External API Flow

### 1. API Key Generation
1. User navigates to Settings > API Keys
2. User clicks "Generate API Key"
3. System generates unique API key
4. Key is stored with:
   - Store ID
   - Status (Enabled/Disabled)
   - Expiration date (optional)
5. Key is displayed to user (shown only once)
6. User copies key for use in external systems

### 2. External API Authentication
1. External system includes API key in request header:
   - `X-API-Key: {api_key}`
   - Or `Authorization: Bearer {api_key}`
2. System validates:
   - Key exists
   - Key is enabled
   - Key is not expired
   - Key belongs to correct store
3. If valid, request proceeds
4. If invalid, 401 Unauthorized is returned

### 3. External API Queries
1. External system queries:
   - Products by serial number
   - Warranties by serial number
   - Claims by serial number
   - List warranties/claims with filters
2. All queries are scoped to the store associated with the API key
3. Results are returned in JSON format

## Data Refresh Flow

### Automatic Refresh After Creation
After any create operation (product, customer, warranty, claim, store user, store):
1. Success response is received
2. Modal/form is closed
3. Data list is automatically refreshed
4. User sees updated data immediately
5. No manual refresh needed

### Store Context Refresh
1. When store is changed
2. When store settings are updated
3. When store users are added/updated
4. Context is refreshed automatically
5. All dependent data is reloaded

## Error Handling Flow

### 1. Validation Errors
1. Client-side validation runs first
2. If invalid, error message is shown
3. Form submission is prevented
4. User can correct and resubmit

### 2. Server-Side Errors
1. Request is sent to server
2. Server validates data
3. If invalid, error response is returned
4. Error message is displayed to user
5. User can correct and resubmit

### 3. Authentication Errors
1. If token is invalid/expired
2. User is redirected to login
3. Error message is shown
4. User must re-authenticate

## Navigation Flow

### 1. Page Navigation
1. User clicks navigation link
2. Store ID is appended to URL if not present
3. Page loads with store context
4. Data is fetched for current store
5. Page displays store-scoped data

### 2. Store Switching
1. User selects different store
2. Store ID in URL is updated
3. Store context is updated
4. User is redirected to dashboard
5. All subsequent operations use new store

## Audit Logging Flow

### 1. Action Tracking
1. User performs action (create, update, delete)
2. System logs:
   - User ID
   - Store ID
   - Entity type
   - Entity ID
   - Action type
   - Timestamp
   - Old value (for updates)
   - New value
3. Log is stored in database
4. Logs are viewable in Audit Logs page

## Best Practices Implemented

1. **Store Isolation**: All data is properly scoped to stores
2. **URL Persistence**: Store context maintained in URL
3. **Automatic Refresh**: Data refreshes after all operations
4. **Validation**: Comprehensive validation at all levels
5. **Error Handling**: Proper error messages and handling
6. **Security**: Authentication and authorization at all endpoints
7. **User Feedback**: Toast notifications for all actions
8. **Consistent UI**: Phone inputs use country code selector everywhere

