#!/bin/bash

echo "🚀 Product & Warranty Management System - Setup Script"
echo "======================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if MongoDB is running
if ! command -v mongosh &> /dev/null && ! command -v mongo &> /dev/null; then
    echo "⚠️  MongoDB CLI not found. Make sure MongoDB is installed and running."
else
    echo "✅ MongoDB CLI found"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo ""
    echo "ℹ️  .env file already exists"
fi

# Create upload directories
echo ""
echo "📁 Creating upload directories..."
mkdir -p public/uploads/{qr,warranties,attachments,logos,general}
echo "✅ Upload directories created"

echo ""
echo "======================================================"
echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your MongoDB URI and other settings"
echo "2. Start MongoDB: mongod"
echo "3. Run development server: npm run dev"
echo "4. Open browser: http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "- QUICKSTART.md - Quick start guide"
echo "- SYSTEM_DOCUMENTATION.md - Complete documentation"
echo "- API_TESTING.md - API testing guide"
echo ""
echo "🎉 Happy coding!"
