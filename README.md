# 🚀 Fintech Dashboard - AI-Powered Personal Finance Management Platform

A comprehensive, full-stack financial management application with AI-powered insights, fraud detection, wealth management, and bill splitting capabilities.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.14-blue.svg)
![React](https://img.shields.io/badge/react-18.2-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.128-green.svg)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
  - [Running Locally](#running-locally)
  - [Running with Docker](#running-with-docker)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [ML Models](#-ml-models)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🏦 **Core Banking Features**
- **User Authentication & Authorization**
  - Secure registration and login with password hashing (SHA-256)
  - Session-based authentication with X-User-ID headers
  - Profile management (update username/password, delete account)

- **Transaction Management**
  - Manual transaction entry with auto-categorization
  - Transaction history with filtering and search
  - Multi-source transaction aggregation (bank, split bills, recurring payments)

- **Financial Statistics & Analytics**
  - Real-time balance tracking
  - Income/expense breakdown (monthly, yearly, all-time)
  - Trend analysis with period-over-period comparisons
  - Category-wise spending analytics with customizable time periods (weekly, monthly, yearly)

### 🤖 **AI-Powered Features**
- **AI Financial Advisor**
  - Conversational AI chatbot powered by OpenRouter APIs
  - Context-aware financial advice based on transaction history
  - Multi-session chat support with history persistence
  - Personalized recommendations for budgeting and savings

- **Fraud Detection & Anomaly Detection**
  - Hybrid ML + rule-based fraud detection system
  - Isolation Forest algorithm for pattern anomaly detection
  - Z-score analysis for statistical outliers
  - Explainable AI with detailed fraud reasons
  - Real-time fraud alerts with risk scoring

- **Predictive Analytics**
  - 30-day balance forecasting using XGBoost
  - Recursive time-series prediction with confidence intervals
  - Dynamic uncertainty modeling
  - Fallback linear projection for edge cases

- **Smart Categorization**
  - Automatic transaction categorization using ML (Logistic Regression)
  - Description-based category prediction
  - Support for custom categories

### 💰 **Budget & Planning**
- **Budget Management**
  - Category-wise budget setting
  - Real-time budget tracking and alerts
  - Monthly budget adherence scoring
  - Budget vs. actual spending visualization

- **Financial Health Score**
  - Composite health score (0-100) based on:
    - Savings rate (50% weight)
    - Budget adherence (50% weight)
  - Status indicators: Excellent, Good, Needs Improvement, Critical
  - Actionable recommendations

- **Impact Simulator**
  - Pre-purchase financial impact analysis
  - Solvency checks and balance projections
  - Budget limit warnings
  - Smart alerts for significant expenses

- **FinanceIQ Confidence Meter**
  - AI-powered purchase decision support
  - Multi-factor confidence scoring:
    - Balance sufficiency
    - Upcoming bills coverage
    - Emergency fund status
    - Purchase necessity analysis
  - Verdict system: GO FOR IT, OK TO BUY, RECONSIDER, AVOID

### 🔄 **Recurring Payments & Automation**
- **Recurring Payment Management**
  - Support for daily, weekly, monthly, yearly frequencies
  - Auto-pay functionality
  - Due date tracking with notifications
  - Overdue payment alerts
  - Automatic transaction creation on payment

- **Payment Notifications**
  - Smart notification system for upcoming bills
  - 3-day advance warning for due payments
  - Dismissible notifications

### 👥 **Bill Splitting (Splitwise-like)**
- **Expense Groups**
  - Create and manage expense groups
  - Multi-member group support
  - Group balance tracking

- **Shared Expenses**
  - Equal split calculation (extensible to custom splits)
  - Expense tracking with payer identification
  - Split status management (pending, paid, rejected)

- **Debt Settlement**
  - Real-time balance calculation
  - Track who owes whom
  - Payment confirmation workflow
  - Integration with main transaction history

### 📊 **Wealth Management & Investments**
- **Portfolio Management**
  - Multi-asset support: Stocks, Mutual Funds, Bonds, Real Estate, Crypto, Gold
  - Real-time price updates via Yahoo Finance API
  - Historical price fetching for purchase dates
  - Automatic metrics calculation (P/E ratio, market cap, 52-week high/low, dividend yield)

- **Net Worth Tracking**
  - Multi-currency support with automatic conversion (USD, INR)
  - Asset type breakdown
  - Real-time portfolio valuation

- **Stock Market Features**
  - Stock search with Yahoo Finance integration
  - Historical price charts with technical indicators:
    - Simple Moving Average (SMA)
    - Exponential Moving Average (EMA)
    - Relative Strength Index (RSI)
    - MACD (Moving Average Convergence Divergence)
  - Real-time stock news
  - Multiple timeframe support (1d, 5d, 1mo, 3mo, 1y, 5y)

- **Risk Profiling**
  - Investment risk assessment questionnaire
  - Risk score calculation
  - Profile types: Conservative, Moderate, Aggressive
  - Personalized investment recommendations

### 📄 **Reporting & Export**
- **PDF Report Generation**
  - Comprehensive financial reports with:
    - Executive summary (AI-generated)
    - Income/expense breakdown
    - Health score analysis
    - Fraud alerts
    - Top spending categories
    - 30-day forecast
    - Transaction history
  - Date range filtering
  - Professional formatting with charts

- **Transaction Statements**
  - Detailed transaction statements
  - Includes split bills and recurring payments
  - Customizable date ranges
  - PDF export

- **Portfolio Reports**
  - Asset allocation breakdown
  - Performance metrics
  - Gain/loss analysis

---

## 🛠️ Tech Stack

### **Backend**
- **Framework:** FastAPI 0.128
- **Language:** Python 3.14
- **Database:** SQLite (SQLAlchemy ORM)
- **AI/ML:**
  - OpenAI GPT (Financial Advisor)
  - scikit-learn (Fraud Detection, Categorization)
  - XGBoost (Forecasting)
- **Data Processing:** pandas, numpy
- **APIs:** yfinance (Stock data), Yahoo Finance Search API
- **PDF Generation:** FPDF
- **Authentication:** SHA-256 password hashing

### **Frontend**
- **Framework:** React 18.2
- **Build Tool:** Vite 5.0
- **Styling:** TailwindCSS 3.3
- **UI Components:** Lucide React (icons)
- **Charts:** Recharts 2.9
- **Animations:** Framer Motion 10.16
- **HTTP Client:** Axios 1.6
- **Markdown Rendering:** react-markdown with KaTeX support

### **DevOps**
- **Containerization:** Docker, Docker Compose
- **Web Server:** Nginx (for frontend)
- **ASGI Server:** Uvicorn (for backend)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │ Wealth   │  │SplitBill │  │ AI Chat  │   │
│  │          │  │Management│  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API (Axios)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   API Endpoints                       │  │
│  │  /api/transactions  /api/assets  /api/groups  ...    │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  ML Models   │  │  LLM Service │  │  Data        │     │
│  │  - Fraud     │  │  (OpenAI)    │  │  Normalizer  │     │
│  │  - Forecast  │  │              │  │              │     │
│  │  - Classify  │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database (SQLite + SQLAlchemy)          │  │
│  │  Users | Transactions | Assets | Budgets | Groups   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Prerequisites

### For Local Development:
- **Python:** 3.14 or higher
- **Node.js:** 20.x or higher
- **npm:** 10.x or higher
- **pip:** Latest version

### For Docker Deployment:
- **Docker:** 20.10 or higher
- **Docker Compose:** 2.0 or higher

---

## 🚀 Installation

### Running Locally

#### **1. Clone the Repository**
```bash
git clone <repository-url>
cd Devhack_final
```

#### **2. Backend Setup**

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=your_api_key_here

# Initialize database and train ML models
python train_models.py

# (Optional) Generate sample data for testing
python generate_data.py

# Run the backend server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend API will be available at: `http://localhost:8000`
API documentation (Swagger): `http://localhost:8000/docs`

#### **3. Frontend Setup**

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: `http://localhost:5173`

---

### Running with Docker

#### **1. Prerequisites**
Ensure Docker and Docker Compose are installed and running.

#### **2. Environment Configuration**

Create a `.env` file in the `backend` directory:
```bash
cd backend
cat > .env << EOF
OPENROUTER_API_KEY=your_openrouter_api_key_here
DATABASE_URL=sqlite:///./fintech.db
EOF
cd ..
```

#### **3. Build and Run**

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

#### **4. Access the Application**
- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8080`
- **API Docs:** `http://localhost:8080/docs`

#### **5. Stop Services**
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

#### **6. View Logs**
```bash
# View all logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View frontend logs only
docker-compose logs -f frontend
```

---

## 📚 API Documentation

### **Authentication**
All authenticated endpoints require the `X-User-ID` header with the username.

### **Key Endpoints**

#### **User Management**
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `PUT /api/user/profile` - Update profile
- `DELETE /api/user/profile` - Delete account

#### **Transactions**
- `GET /api/transactions` - Get all transactions
- `POST /api/transaction` - Add manual transaction
- `POST /api/upload` - Upload CSV/Excel file
- `GET /api/stats` - Get financial statistics

#### **AI & Analytics**
- `POST /api/ask-advisor` - Ask AI advisor
- `POST /api/chat/{session_id}/message` - Chat with AI
- `GET /api/forecast?days=30` - Get balance forecast
- `GET /api/fraud-check` - Check for fraud
- `POST /api/confidence-meter` - Get purchase confidence

#### **Budget & Health**
- `GET /api/budget` - Get budgets
- `POST /api/budget` - Set budget
- `GET /api/health` - Get financial health score
- `POST /api/simulate` - Simulate transaction impact

#### **Wealth Management**
- `GET /api/assets` - Get all assets
- `POST /api/assets` - Add new asset
- `POST /api/assets/refresh-prices` - Update asset prices
- `GET /api/net-worth` - Get net worth
- `GET /api/stocks/search?q=AAPL` - Search stocks
- `GET /api/stocks/{symbol}/history?period=1mo` - Get stock history

#### **Bill Splitting**
- `GET /api/groups` - Get user groups
- `POST /api/groups` - Create group
- `POST /api/groups/{id}/expenses` - Add shared expense
- `GET /api/groups/{id}/balances` - Get group balances

#### **Recurring Payments**
- `GET /api/recurring-payments` - Get all recurring payments
- `POST /api/recurring-payments` - Create recurring payment
- `POST /api/recurring-payments/{id}/pay` - Mark as paid

#### **Reports**
- `GET /api/report/pdf?start_date=2024-01-01&end_date=2024-12-31` - Generate PDF report
- `GET /api/report/statement` - Generate transaction statement
- `GET /api/report/portfolio` - Generate portfolio report

**Full API documentation available at:** `http://localhost:8000/docs` (when running)

---

## 📁 Project Structure

```
Devhack_final/
├── backend/
│   ├── main.py                      # Main FastAPI application
│   ├── models.py                    # SQLAlchemy database models
│   ├── database.py                  # Database configuration
│   ├── llm_service.py               # OpenAI integration
│   ├── data_normalizer.py           # CSV/Excel processing
│   ├── reports.py                   # PDF report generation
│   ├── train_models.py              # ML model training
│   ├── generate_data.py             # Sample data generation
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Backend Docker configuration
│   ├── .env                         # Environment variables (create this)
│   └── models/                      # Trained ML models
│       └── financial_models.pkl
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main React component
│   │   ├── main.jsx                 # React entry point
│   │   └── components/
│   │       ├── Dashboard.jsx        # Main dashboard
│   │       ├── Login.jsx            # Authentication
│   │       ├── Transactions.jsx     # Transaction management
│   │       ├── Budget.jsx           # Budget management
│   │       ├── Insights.jsx         # AI advisor chat
│   │       ├── Assets.jsx           # Wealth management
│   │       ├── SplitBill.jsx        # Bill splitting
│   │       ├── RecurringPayments.jsx # Recurring payments
│   │       ├── FraudAlerts.jsx      # Fraud detection
│   │       ├── Forecast.jsx         # Balance forecasting
│   │       ├── ConfidenceMeter.jsx  # Purchase confidence
│   │       └── ...
│   ├── package.json                 # Node dependencies
│   ├── vite.config.js               # Vite configuration
│   ├── tailwind.config.js           # TailwindCSS configuration
│   ├── Dockerfile                   # Frontend Docker configuration
│   └── nginx.conf                   # Nginx configuration
├── docker-compose.yml               # Docker Compose configuration
└── README.md                        # This file
```

---

## 🔐 Environment Variables

Create a `.env` file in the `backend` directory:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=sqlite:///./fintech.db

# Optional: For production
# SECRET_KEY=your_secret_key_for_jwt
# CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

---

## 🤖 ML Models

The application uses three machine learning models:

### **1. Fraud Detection (Isolation Forest)**
- **Purpose:** Detect anomalous transactions
- **Features:** Amount, Z-score, Weekend flag, Category code, Round number flag
- **Training:** Unsupervised learning on transaction patterns
- **Output:** Binary classification (normal/-1 for anomaly)

### **2. Transaction Categorization (Logistic Regression)**
- **Purpose:** Auto-categorize transactions from descriptions
- **Features:** TF-IDF vectorized transaction descriptions
- **Training:** Supervised learning on labeled transactions
- **Categories:** Income, Shopping, Food, Transport, Bills, Entertainment, etc.

### **3. Balance Forecasting (XGBoost Regressor)**
- **Purpose:** Predict future account balance
- **Features:** Day of week, Day of month, Month, Lag-1, Lag-7, Lag-30
- **Training:** Time-series regression on historical balances
- **Output:** Daily balance predictions with confidence intervals

### **Training Models**
```bash
cd backend
python train_models.py
```

This will:
1. Generate synthetic training data
2. Train all three models
3. Save models to `models/financial_models.pkl`

---

## 🎨 Frontend Features

### **Responsive Design**
- Mobile-first design with TailwindCSS
- Adaptive sidebar navigation
- Touch-friendly UI components

### **Real-time Updates**
- Live balance tracking
- Instant fraud alerts
- Dynamic chart updates

### **Interactive Visualizations**
- Recharts for financial analytics
- Stock price charts with technical indicators
- Budget vs. actual spending graphs
- Net worth breakdown pie charts

### **User Experience**
- Smooth animations with Framer Motion
- Loading states and skeletons
- Error handling with user-friendly messages
- Modal dialogs for complex workflows

---

## 🧪 Testing

### **Backend Testing**
```bash
cd backend
# Run sample data generation
python generate_data.py

# Test fraud detection
python reproduce_issue.py
```

### **Frontend Testing**
```bash
cd frontend
npm run lint
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. Backend fails to start**
- Check Python version: `python --version` (should be 3.14+)
- Verify all dependencies are installed: `pip list`
- Check if port 8000 is available: `lsof -i :8000`
- Ensure `.env` file exists with valid `OPENAI_API_KEY`

#### **2. Frontend build fails**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be 20+)
- Verify port 5173 is available

#### **3. Docker build fails**
- Ensure Docker daemon is running: `docker ps`
- Check Docker Compose version: `docker-compose --version`
- Clear Docker cache: `docker system prune -a`

#### **4. Database errors**
- Delete existing database: `rm backend/fintech.db`
- Restart backend to recreate tables

#### **5. ML models not found**
- Run training script: `cd backend && python train_models.py`

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Authors

- **Development Team** - Initial work and ongoing development

---

## 🙏 Acknowledgments

- OpenAI for GPT API
- Yahoo Finance for stock market data
- FastAPI and React communities
- All open-source contributors

---

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

## 🔮 Future Enhancements

- [ ] Multi-currency support expansion
- [ ] Mobile app (React Native)
- [ ] Bank account integration (Plaid API)
- [ ] Advanced portfolio optimization
- [ ] Tax calculation and reporting
- [ ] Social features (financial goals sharing)
- [ ] Cryptocurrency wallet integration
- [ ] Voice-based transaction entry
- [ ] Advanced ML models (LSTM for forecasting)

---

