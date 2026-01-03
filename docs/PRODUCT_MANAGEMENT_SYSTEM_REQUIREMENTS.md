# Product Management System Requirements

## Overview
The Product Management System is a comprehensive warranty and claim management platform designed for businesses to manage their product inventory, customer warranties, and warranty claims efficiently.

## Core Features

### 1. Store Management
- **Multi-store Support**: Users can create and manage multiple store locations
- **Store Configuration**: Each store has its own:
  - Store name, address, and contact information
  - Serial number prefix and suffix configuration
  - API key management for external integrations
- **Store Isolation**: Data is isolated per store to ensure proper access control

### 2. User Management
- **User Accounts**: Store owners can create user accounts
- **Store Users**: Employees/staff can be added as store users with specific roles and permissions
- **Role-Based Access Control (RBAC)**:
  - Admin: Full access to all features
  - Manager: Limited administrative access
  - Staff: Basic operational access
- **Permission System**: Granular permissions for:
  - Viewing customers, products, warranties, claims
  - Managing store users
  - Managing settings
  - Viewing audit logs

### 3. Product Management
- **Product Registration**: Register products with:
  - Brand, model, category
  - Serial number (auto-generated with model prefix)
  - Manufacturing date
  - Base warranty period (in months)
- **Serial Number Generation**: 
  - Format: `{PREFIX}-{MODEL}-{RANDOM}{SUFFIX}`
  - Includes model field for better identification
  - Ensures uniqueness across the system
- **Store-Scoped**: Products are automatically associated with the current store

### 4. Customer Management
- **Customer Profiles**: Store customer information including:
  - Name, phone (with country code selector), email
  - Address
  - GST number (optional)
- **Phone Number Handling**: All phone numbers use country code selector for international support
- **Store-Scoped**: Customers are associated with specific stores

### 5. Warranty Management
- **Warranty Registration**: Create warranties linking products to customers
- **Automatic Calculations**: Warranty end date calculated based on:
  - Warranty start date
  - Product's base warranty period
- **Warranty Documents**:
  - QR code generation for warranty verification
  - PDF warranty certificate generation
- **Warranty Status**: Two statuses only - "active" (within warranty period) or "expired" (past warranty end date)
- **Multiple Claims**: A single warranty can have multiple claims filed against it
- **External API Integration**: Support for warranty registration via webhooks

### 6. Claim Management
- **Claim Creation**: File warranty claims with:
  - Claim type (repair, replacement, refund)
  - Description
  - Attachments support
- **Claim Status Tracking**: 
  - Pending
  - Approved
  - Rejected
  - Completed
- **Timeline Events**: Track all actions and updates on claims
- **External API Integration**: Support for claim registration via webhooks

### 7. External API Integration
- **API Key Authentication**: Secure API access using API keys generated in store settings
- **Webhook Endpoints**:
  - Warranty registration webhook
  - Claim registration webhook
- **RESTful API Endpoints**:
  - Product lookup by serial number
  - Warranty lookup by serial number
  - Claim lookup by serial number
  - List warranties and claims with filtering

### 8. Authentication & Security
- **Next Auth Integration**: Modern authentication system
- **JWT Tokens**: Secure token-based authentication
- **Store ID in URL**: Store context maintained in URL parameters for proper routing
- **API Key Management**: Generate, manage, and revoke API keys per store
- **Audit Logging**: Track all system changes and user actions

### 9. Data Validation
- **Form Validation**: Comprehensive client-side and server-side validation
- **Zod Schema Validation**: Type-safe validation using Zod
- **Required Field Validation**: All critical fields are validated
- **Data Type Validation**: Proper validation for dates, numbers, emails, etc.

### 10. User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Country Code Selector**: Integrated phone number input with country code selection
- **Store Context**: Store ID maintained in URL for proper navigation and refresh persistence
- **Real-time Updates**: Automatic data refresh after creation/updates
- **Toast Notifications**: User feedback for all actions

## Technical Requirements

### Technology Stack
- **Framework**: Next.js 15+ (App Router)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Next Auth (NextAuth.js)
- **Validation**: Zod
- **UI Components**: Custom components with Tailwind CSS
- **Phone Input**: react-phone-input-2 with country code selector

### Data Models
- **Store**: Store information and configuration
- **UserAccount**: Store owner accounts
- **StoreUser**: Employee/staff accounts
- **Product**: Product inventory
- **Customer**: Customer profiles
- **Warranty**: Warranty registrations
- **Claim**: Warranty claims
- **ApiKeyManagement**: API key storage and management
- **SystemAuditLog**: Audit trail

### API Routes
- **Internal API**: Protected routes for authenticated users
- **External API**: API key authenticated routes for integrations
- **Webhook Endpoints**: For external system integrations

## Security Requirements
- All API routes require authentication (JWT or API key)
- Store-level data isolation
- Role-based access control
- Input validation and sanitization
- Secure password hashing (bcrypt)
- API key expiration and revocation support

## Performance Requirements
- Fast page load times
- Efficient database queries with proper indexing
- Optimistic UI updates
- Proper error handling and user feedback

## Compliance & Best Practices
- Follow Next.js best practices
- RESTful API design
- Proper error handling
- Comprehensive logging
- Code organization and maintainability

