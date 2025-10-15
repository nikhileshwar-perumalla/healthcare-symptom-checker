#!/bin/bash

# Healthcare Symptom Checker Setup Script
# This script sets up both backend and frontend

set -e  # Exit on error

echo "🏥 Healthcare Symptom Checker - Setup Script"
echo "=============================================="
echo ""

# Check Python version
echo "📋 Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✅ Found Python $PYTHON_VERSION"
echo ""

# Check Node.js version
echo "📋 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14 or higher."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Found Node.js $NODE_VERSION"
echo ""

# Backend setup
echo "🔧 Setting up Backend..."
echo "------------------------"
cd backend

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit backend/.env and add your API key!"
    echo "   You need either OPENAI_API_KEY or ANTHROPIC_API_KEY"
    echo ""
fi

cd ..

# Frontend setup
echo ""
echo "🎨 Setting up Frontend..."
echo "------------------------"
cd frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

cd ..

# Final instructions
echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📝 Next Steps:"
echo "=============="
echo ""
echo "1. Configure API Key:"
echo "   Edit backend/.env and add your OpenAI or Anthropic API key"
echo ""
echo "2. Start the Backend:"
echo "   cd backend"
echo "   source venv/bin/activate  (On Windows: venv\\Scripts\\activate)"
echo "   python main.py"
echo ""
echo "3. Start the Frontend (in a new terminal):"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "4. Open your browser:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "⚠️  Remember: This is for EDUCATIONAL PURPOSES ONLY!"
echo ""
