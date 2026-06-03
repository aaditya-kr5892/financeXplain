from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import pickle
import os
import hashlib
from datetime import datetime
from typing import List, Optional
from llm_service import generate_financial_advice
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db, engine, Base
from datetime import time
from reports import create_pdf_report as generate_financial_report, create_statement_pdf as generate_transaction_statement, generate_portfolio_pdf
from models import User, Transaction, Budget, ChatSession, ChatMessage, ExpenseGroup, GroupMember, SharedExpense, ExpenseSplit, RecurringPayment, PaymentNotification, Asset, PortfolioSnapshot, InvestmentGoal, RiskProfile
from datetime import timedelta
from dateutil.relativedelta import relativedelta
import yfinance as yf
import json
import requests

# Create Tables (if not exist)
# Create Tables (if not exist)
Base.metadata.create_all(bind=engine)

# Load ML Models
try:
    with open('models/financial_models.pkl', 'rb') as f:
        models = pickle.load(f)
    print("ML Models loaded successfully")
except Exception as e:
    print(f"Warning: Could not load ML models: {e}")
    models = {}

app = FastAPI(title="Fintech Dashboard API")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- USER MANAGEMENT ---

class UserAuth(BaseModel):
    username: str
    password: str

class UserRegister(UserAuth):
    initial_balance: float

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password, hashed_password):
    return hash_password(plain_password) == hashed_password

@app.post("/api/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create User
    new_user = User(
        username=user.username,
        password_hash=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Initial Balance Transaction
    initial_txn = Transaction(
        id=str(uuid.uuid4()),
        user_id=new_user.id,
        date=datetime.now().date(),
        description='Initial Balance Deposit',
        amount=user.initial_balance,
        category='Income',
        is_resolved=False
    )
    db.add(initial_txn)
    db.commit()
    
    return {"status": "success", "message": "User registered successfully"}


@app.post("/api/login")
def login(user: UserAuth, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"status": "success", "token": user.username}

async def get_current_user_obj(x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not x_user_id:
        # For testing, fallback to first user if no header (DevHack only)
        # return db.query(User).first()
        raise HTTPException(status_code=401, detail="Missing X-User-ID header")
    
    user = db.query(User).filter(User.username == x_user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user

async def get_current_user(x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    return await get_current_user_obj(x_user_id, db)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

@app.put("/api/user/profile")
async def update_profile(data: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.username and data.username != user.username:
        exist = db.query(User).filter(User.username == data.username).first()
        if exist:
            raise HTTPException(status_code=400, detail="Username already exists")
        user.username = data.username
    
    if data.password:
        user.password_hash = hash_password(data.password)
        
    db.commit()
    db.refresh(user)
    return {"status": "success", "user": {"id": user.id, "username": user.username}, "new_token": user.username}

@app.delete("/api/user/profile")
async def delete_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Manual Cascade Delete
        db.query(Transaction).filter(Transaction.user_id == user.id).delete()
        db.query(Budget).filter(Budget.user_id == user.id).delete()
        db.query(Asset).filter(Asset.user_id == user.id).delete()
        db.query(RecurringPayment).filter(RecurringPayment.user_id == user.id).delete()
        # Add others as needed or rely on cascade if set. 
        # Attempting main delete
        db.delete(user)
        db.commit()
        return {"status": "success", "message": "Account deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

# -- SEED DATA FOR DEMO --
@app.post("/api/seed-anomaly")
def seed_anomaly(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create a blatantly anomalous transaction
    anomaly = Transaction(
        id=str(uuid.uuid4()),
        user_id=user.id,
        date=datetime.now().date(),
        description="Suspicious Large Transfer",
        amount=-50000.00, # Large Debit
        category="Shopping",
        is_resolved=False
    )
    db.add(anomaly)
    db.commit()
    return {"status": "seeded", "amount": -50000.00}

@app.get("/api/transactions")
def get_transactions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    combined = []

    # 1. Regular Transactions (Bank)
    txns = db.query(Transaction).filter(Transaction.user_id == user.id).order_by(Transaction.date.desc()).limit(100).all()
    for t in txns:
        combined.append({
            "id": t.id,
            "date": t.date,
            "description": t.description,
            "amount": t.amount,
            "category": t.category,
            "is_resolved": t.is_resolved,
            "type": "transaction",
            "source": "bank"
        })

    # 2. Shared Expenses (I Paid Full Amount) - Display as Debit
    my_expenses = db.query(SharedExpense).filter(SharedExpense.payer_id == user.id).all()
    for exp in my_expenses:
        combined.append({
            "id": exp.id,
            "date": exp.date,
            "description": f"Paid for: {exp.description}",
            "amount": -exp.amount, # Full Debit
            "category": "SplitBill",
            "is_resolved": True,
            "type": "expense",
            "source": "splitwise_payer"
        })
        
        # 3. Repayments Received (Splits owed TO me that are PAID) - Display as Credit
        # These are linked to the expense I paid.
        for split in exp.splits:
            if split.user_id != user.id and split.status == 'paid': # Don't count my own portion
                payer_user = db.query(User).filter(User.id == split.user_id).first()
                payer_name = payer_user.username if payer_user else "Member"
                combined.append({
                    "id": split.id,
                    "date": exp.date, # Ideally repayment date, but using expense date for now or we need updated_at
                    "description": f"Payment from {payer_name} ({exp.description})",
                    "amount": split.amount_owed, # Credit
                    "category": "SplitBill",
                    "is_resolved": True,
                    "type": "income",
                    "source": "splitwise_repayment"
                })

    # 4. Expense Splits (Debts I Owe) - Display as Debit
    # Only if I am NOT the payer
    # User Request: Don't show in history until cleared (paid)
    my_debts = db.query(ExpenseSplit).filter(ExpenseSplit.user_id == user.id).all()
    for s in my_debts:
        if s.status != 'paid':
            continue
            
        parent = db.query(SharedExpense).filter(SharedExpense.id == s.expense_id).first()
        if parent and parent.payer_id != user.id: 
            combined.append({
                "id": s.id,
                "date": parent.date, # Or updated_at if available
                "description": f"Split Paid: {parent.description}",
                "amount": -s.amount_owed, # Debit (I paid)
                "category": "SplitBill",
                "is_resolved": True,
                "type": "expense",
                "source": "splitwise_debt",
                "status": s.status
            })
            
    # Sort by date desc
    combined.sort(key=lambda x: x['date'], reverse=True)
    return combined[:100]

@app.get("/api/stats")
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from sqlalchemy import func, extract
    
    today = datetime.now()
    curr_month = today.month
    curr_year = today.year
    
    # Helper to sum
    def get_sum(category_filter, extra_filters=None):
        q = db.query(func.sum(Transaction.amount)).filter(Transaction.user_id == user.id)
        if category_filter == 'Income':
            q = q.filter(Transaction.category == 'Income')
        else:
            q = q.filter(Transaction.category != 'Income')
            
        if extra_filters:
            for f in extra_filters:
                q = q.filter(f)
        return q.scalar() or 0.0

    # All Time
    all_income = get_sum('Income')
    all_expense = get_sum('Expense')
    
    # Monthly
    month_filters = [extract('month', Transaction.date) == curr_month, extract('year', Transaction.date) == curr_year]
    month_income = get_sum('Income', month_filters)
    month_expense = get_sum('Expense', month_filters)
    
    # Yearly
    year_filters = [extract('year', Transaction.date) == curr_year]
    year_income = get_sum('Income', year_filters)
    year_expense = get_sum('Expense', year_filters)

    balance = all_income + all_expense
    
    return {
        "balance": round(balance, 2),
        "credit": {
            "monthly": round(month_income, 2),
            "yearly": round(year_income, 2),
            "all_time": round(all_income, 2)
        },
        "debit": {
            "monthly": round(month_expense, 2),
            "yearly": round(year_expense, 2),
            "all_time": round(all_expense, 2)
        },
        # Legacy support if needed, or remove? I'll support old keys temporarily if needed but preferably I update frontend
        "income": round(all_income, 2), 
        "expense": round(all_expense, 2)
    }

class AdviceRequest(BaseModel):
    context: str

@app.post("/api/ask-advisor")
def ask_advisor(request: AdviceRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Fetch operations from DB
        # We need a DataFrame for the logic below
        query = db.query(Transaction).filter(Transaction.user_id == user.id)
        df = pd.read_sql(query.statement, db.bind)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="No data found for user")
            
        # Ensure date is datetime
        df['date'] = pd.to_datetime(df['date'])

        # Calculate real statistics
        total_income = df[df['amount'] > 0]['amount'].sum()
        total_expense = df[df['amount'] < 0]['amount'].sum()
        balance = total_income + total_expense
        
        # Get spending by category
        category_spending = df[df['amount'] < 0].groupby('category')['amount'].sum().abs().sort_values(ascending=False)
        top_categories = category_spending.head(5).to_dict()
        
        # Get recent transactions
        recent_trans = df.tail(10)[['date', 'description', 'amount', 'category']].to_dict(orient='records')
        
        # Build rich context
        financial_context = f"""
FINANCIAL DATA SUMMARY:
- Current Balance: ₹{balance:.2f}
- Total Income: ₹{total_income:.2f}
- Total Expenses: ₹{abs(total_expense):.2f}

TOP SPENDING CATEGORIES:
{chr(10).join([f"- {cat}: ₹{amt:.2f}" for cat, amt in top_categories.items()])}

RECENT TRANSACTIONS (Last 10):
{chr(10).join([f"- {t['date']}: {t['description'][:50]} - ₹{t['amount']:.2f} ({t['category']})" for t in recent_trans])}
"""
        
        # Pass both context and user question to LLM
        advice = generate_financial_advice(user_question=request.context, financial_data=financial_context)
        return {"advice": advice}
    except Exception as e:
        print(f"Advisor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Chat Session API ---
from models import ChatSession, ChatMessage

class SessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

@app.get("/api/chat/sessions")
def get_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user.id).order_by(ChatSession.created_at.desc()).all()
    # Return list
    return [{"id": s.id, "title": s.title, "date": s.created_at} for s in sessions]

@app.post("/api/chat/sessions")
def create_session(session_data: SessionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_session = ChatSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title=session_data.title,
        created_at=datetime.now().date()
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Add initial greeting
    greeting = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=new_session.id,
        role="assistant",
        content="Hello! I'm your Financial AI Advisor. Ask me about your trends, budget, or potential anomalies.",
        timestamp=datetime.now()
    )
    db.add(greeting)
    db.commit()
    
    return {"id": new_session.id, "title": new_session.title, "messages": [
        {"id": greeting.id, "role": greeting.role, "content": greeting.content}
    ]}

@app.get("/api/chat/{session_id}")
def get_session_history(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify ownership
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.timestamp).all()
    return {
        "id": session.id,
        "title": session.title,
        "messages": [{"id": m.id, "role": m.role, "content": m.content} for m in messages]
    }

@app.post("/api/chat/{session_id}/message")
def send_message(session_id: str, request: AdviceRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify ownership
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Save User Message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=request.context,
        timestamp=datetime.now()
    )
    db.add(user_msg)
    db.commit()
    
    # Generate Response
    # 1. Fetch Context (Financial Data) - Reuse logic from ask_advisor
    # Copying context generation logic for consistency
    try:
        query = db.query(Transaction).filter(Transaction.user_id == user.id)
        df = pd.read_sql(query.statement, db.bind)
        
        financial_context = ""
        if not df.empty:
            df['date'] = pd.to_datetime(df['date'])
            total_income = df[df['amount'] > 0]['amount'].sum()
            total_expense = df[df['amount'] < 0]['amount'].sum()
            balance = total_income + total_expense
            category_spending = df[df['amount'] < 0].groupby('category')['amount'].sum().abs().sort_values(ascending=False).head(5).to_dict()
            recent_trans = df.tail(5)[['date', 'description', 'amount']].to_dict(orient='records')
            
            financial_context = f"""
            FINANCIAL DATA:
            - Balance: ₹{balance:.2f}
            - Income: ₹{total_income:.2f}
            - Expenses: ₹{abs(total_expense):.2f}
            - Top Cats: {category_spending}
            - Recent: {recent_trans}
            """
            
        # 2. Fetch Chat History (Last 10 messages)
        history_objs = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.timestamp).all()[-10:]
        history = [{"role": m.role, "content": m.content} for m in history_objs]
        
        # 3. Call LLM
        advice = generate_financial_advice(user_question=request.context, financial_data=financial_context, history=history)
        
        # Save AI Message
        ai_msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="assistant",
            content=advice,
            timestamp=datetime.now()
        )
        db.add(ai_msg)
        db.commit()
        
        # Auto-update title if it's the first real interaction
        if session.title == "New Chat":
            # Simple heuristic: first 4 words of user message
            new_title = " ".join(request.context.split()[:4])
            session.title = new_title
            db.commit()

        return {"id": ai_msg.id, "role": ai_msg.role, "content": ai_msg.content}
        
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chat/{session_id}")
def delete_session(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if session:
        db.delete(session)
        db.commit()
    return {"status": "success"}

@app.get("/api/forecast")
def get_forecast(days: int = 30, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # 1. Fetch Data
        query = db.query(Transaction).filter(Transaction.user_id == user.id)
        df = pd.read_sql(query.statement, db.bind)
        
        if df.empty:
             return generate_fallback_forecast(user, days, db) # Update fallback too
        
        df['date'] = pd.to_datetime(df['date'])
        
        # 2. Prepare Data for ML
        # Aggregate to daily level
        daily_df = df.groupby('date')['amount'].sum().reset_index().sort_values('date')
        
        # We need the last 30 days to calculate lags
        # Reindex to ensure continuous dates (fill missing days with 0)
        if daily_df.empty:
             return generate_fallback_forecast(user, days)

        idx = pd.date_range(end=pd.Timestamp.now().normalize(), periods=31) # Get enough history
        daily_df = daily_df.set_index('date').reindex(idx, fill_value=0).reset_index()
        daily_df.rename(columns={'index': 'date'}, inplace=True)
        
        # Get Current Balance
        total_income = df[df['category'] == 'Income']['amount'].sum()
        total_expense = df[df['category'] != 'Income']['amount'].sum()
        current_balance = total_income + total_expense
        
        # Extract recent values for lags
        recent_values = daily_df['amount'].tolist() # List of daily net flows
        
        forecast_data = []
        simulated_balance = current_balance
        
        model = models['forecaster']
        
        current_date = pd.Timestamp.now().normalize()
        
        # 3. Recursive Forecasting Loop
        for i in range(1, days + 1):
            future_date = current_date + pd.Timedelta(days=i)
            
            # Features: ['day_of_week', 'day_of_month', 'month', 'lag_1', 'lag_7', 'lag_30']
            day_of_week = future_date.dayofweek
            day_of_month = future_date.day
            month = future_date.month
            
            # Get lags from recent_values (which grows as we predict)
            lag_1 = recent_values[-1]
            lag_7 = recent_values[-7] if len(recent_values) >= 7 else 0
            lag_30 = recent_values[-30] if len(recent_values) >= 30 else 0
            
            features = [[day_of_week, day_of_month, month, lag_1, lag_7, lag_30]]
            
            # Predict Net Flow for this day
            predicted_flow = model.predict(features)[0]
            
            # Update State
            simulated_balance += predicted_flow
            recent_values.append(predicted_flow) # Add prediction to history for next lag
            
            # Calculate dynamic uncertainty (widens over time)
            # Increased uncertainty for better visualization
            base_uncertainty = max(abs(simulated_balance) * 0.05, 5000)  # 5% of balance or minimum 5000
            time_factor = (i * 100)  # Grows significantly over time
            uncertainty = base_uncertainty + time_factor
            
            forecast_data.append({
                "date": future_date.strftime('%Y-%m-%d'),
                "predicted_balance": round(simulated_balance, 2),
                "upper_bound": round(simulated_balance + uncertainty, 2),
                "lower_bound": round(simulated_balance - uncertainty, 2)
            })
            
        return forecast_data

        return forecast_data

    except Exception as e:
        print(f"Forecast ML error: {e}")
        # Final safety fallback
        return generate_fallback_forecast(user, days, db)

def generate_fallback_forecast(user, days, db):
    """Simple linear projection when ML fails"""
    try:
        from sqlalchemy import func
        total_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user.id, 
            Transaction.category == 'Income'
        ).scalar() or 0.0
        
        total_expense = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user.id, 
            Transaction.category != 'Income'
        ).scalar() or 0.0
            
        current_balance = total_income + total_expense
            
        return [
            {
                "date": (datetime.now() + pd.Timedelta(days=i)).strftime('%Y-%m-%d'),
                "predicted_balance": round(current_balance * (1 + (i * 0.001) + (np.random.normal(0, 0.005))), 2), # Slight drift + noise
                "upper_bound": round(current_balance * 1.05, 2),
                "lower_bound": round(current_balance * 0.95, 2)
            }
            for i in range(days)
        ]
    except Exception as e:
        print(f"Fallback error: {e}")
        return []

# --- Manual Transaction Entry ---
class TransactionEntry(BaseModel):
    date: str
    description: str
    amount: float
    category: Optional[str] = None

@app.post("/api/transaction")
def add_transaction(transaction: TransactionEntry, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Validate date format
        try:
            transaction_date = datetime.strptime(transaction.date, '%Y-%m-%d').date()
        except:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Validate amount
        if transaction.amount == 0:
            raise HTTPException(status_code=400, detail="Amount cannot be zero")
        
        # Validate description
        if not transaction.description or transaction.description.strip() == "":
            raise HTTPException(status_code=400, detail="Description is required")
        
        # Auto-categorize if category not provided
        category = transaction.category
        if not category and 'classifier' in models:
            try:
                predicted_cats = models['classifier'].predict([transaction.description])
                category = predicted_cats[0]
            except:
                category = 'Uncategorized'
        elif not category:
            category = 'Uncategorized'
        
        # Create new transaction
        new_transaction = Transaction(
            id=str(uuid.uuid4()),
            user_id=user.id,
            date=transaction_date,
            description=transaction.description.strip(),
            amount=transaction.amount,
            category=category,
            is_resolved=False
        )
        
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        
        return {
            "status": "success",
            "message": "Transaction added successfully",
            "transaction": {
                "id": new_transaction.id,
                "date": new_transaction.date,
                "description": new_transaction.description,
                "amount": new_transaction.amount,
                "category": new_transaction.category
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Transaction entry error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Budget Management ---

# --- Budget Management ---

class BudgetUpdate(BaseModel):
    category: str
    amount: float

@app.get("/api/budget")
def get_budgets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    budgets = db.query(Budget).filter(Budget.user_id == user.id).all()
    # Return as dict {category: amount}
    return {b.category: b.amount for b in budgets}

@app.post("/api/budget")
def set_budget(budget: BudgetUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Check if exists
        db_budget = db.query(Budget).filter(
            Budget.user_id == user.id, 
            Budget.category == budget.category
        ).first()
        
        if db_budget:
            db_budget.amount = budget.amount
        else:
            new_budget = Budget(
                user_id=user.id,
                category=budget.category,
                amount=budget.amount
            )
            db.add(new_budget)
            
        db.commit()
        
        # Return all budgets
        all_budgets = db.query(Budget).filter(Budget.user_id == user.id).all()
        return {"status": "success", "budgets": {b.category: b.amount for b in all_budgets}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Analytics ---
@app.get("/api/analytics")
def get_analytics(period: str = 'monthly', user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Fetch expenses
        query = db.query(Transaction).filter(
            Transaction.user_id == user.id,
            Transaction.amount < 0
        )
        df_exp = pd.read_sql(query.statement, db.bind)
        
        if df_exp.empty:
             return []

        df_exp['date'] = pd.to_datetime(df_exp['date'])
        df_exp['amount'] = df_exp['amount'].abs()
        
        aggregated_data = {}
        
        if period == 'weekly':
            df_exp.set_index('date', inplace=True)
            weekly = df_exp['amount'].resample('W').sum()
            weekly = weekly.tail(12)
            for date, amt in weekly.items():
                aggregated_data[date.strftime('%d %b')] = round(amt, 2)
                
        elif period == 'yearly':
            df_exp.set_index('date', inplace=True)
            yearly = df_exp['amount'].resample('YE').sum()
            yearly = yearly.tail(5)
            for date, amt in yearly.items():
                aggregated_data[date.strftime('%Y')] = round(amt, 2)
                
        else: # Default: Monthly
            df_exp.set_index('date', inplace=True)
            monthly = df_exp['amount'].resample('ME').sum()
            monthly = monthly.tail(12)
            for date, amt in monthly.items():
                # Fix: Handle empty periods if resample creates them
                if not pd.isna(amt):
                    aggregated_data[date.strftime('%b %Y')] = round(amt, 2)
        
        result = [{"name": k, "amount": v} for k, v in aggregated_data.items()]
        return result

    except Exception as e:
        print(f"Analytics error: {e}")
        if period == 'weekly':
            return [{"name": "Week 1", "amount": 200}, {"name": "Week 2", "amount": 350}]
        return []

# --- Security Features ---

@app.get("/api/fraud-check")
def fraud_check(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Fetch Unresolved Transactions
        # The provided snippet reads CSV then filters is_resolved != True.
        # We can just fetch unresolved directly from DB to achieve the same data set.
        query = db.query(Transaction).filter(
            Transaction.user_id == user.id,
            Transaction.is_resolved == False
        )
        df = pd.read_sql(query.statement, db.bind)
        
        # Check if model is available and data exists
        if df.empty or 'anomaly' not in models:
            return []
            
        # Replicate Feature Engineering for Inference
        df_features = df.copy()
        
        # 1. Z-Score (using current batch stats - as per snippet logic)
        df_features['category_mean'] = df_features.groupby('category')['amount'].transform('mean')
        df_features['category_std'] = df_features.groupby('category')['amount'].transform('std').fillna(1.0)
        df_features['amount_zscore'] = (df_features['amount'] - df_features['category_mean']) / df_features['category_std']
        
        # 2. Weekend
        df_features['date'] = pd.to_datetime(df_features['date'])
        df_features['is_weekend'] = df_features['date'].dt.dayofweek.isin([5, 6]).astype(int)
        
        # 3. Encoding
        # Note: In prod, we'd load a LabelEncoder. Here we use pandas codes assuming consistency or re-training often.
        df_features['category_code'] = df_features['category'].astype('category').cat.codes
        
        # 4. Round Number (New Strategy)
        df_features['is_round'] = (df_features['amount'] % 100 == 0).astype(int)
        
        features = ['amount', 'amount_zscore', 'is_weekend', 'category_code', 'is_round']
        X = df_features[features].fillna(0)
        
        # Predict
        anomalies = models['anomaly'].predict(X)
        df['is_anomaly'] = anomalies
        
        # HYBRID OVERRIDE: If rules would catch it, mark as anomaly
        # This ensures the rules we wrote below actually get a chance to run
        # 1. High Z-Score
        df.loc[df_features['amount_zscore'].abs() > 3, 'is_anomaly'] = -1
        # 2. Large Round Amounts
        df.loc[(df_features['amount'].abs() > 1000) & (df_features['is_round'] == 1), 'is_anomaly'] = -1
        
        # Filter suspicious
        suspicious = df[df['is_anomaly'] == -1].copy()
        
        # KEY FIX: Filter out credits (Income). Only debits (negative amounts) should be flagged as risk.
        suspicious = suspicious[suspicious['amount'] < 0]

        # KEY FIX 2: Ignore small amounts to reduce noise (e.g. 50rs transactions)
        # Even if it's statistically weird (e.g. weekend), it's not worth alerting.
        suspicious = suspicious[suspicious['amount'].abs() > 500]
        
        # Generate Reasons (Explainability Layer)
        def get_reasons(row):
            reasons = []
            
            # Z-Score Logic for Debits (Negative Amounts)
            if row['amount_zscore'] < -3:
                reasons.append(f"Unusually High Amount (Z-Score: {row['amount_zscore']:.1f})")
            elif row['amount_zscore'] > 3:
                reasons.append(f"Unusually Low Amount (Z-Score: {row['amount_zscore']:.1f})")
                
            if abs(row['amount']) > 1000 and row['amount'] % 100 == 0:
                reasons.append("Suspicious Round Amount")
            
            if row['is_weekend'] == 1:
                reasons.append("Unusual Weekend Activity")
                
            if not reasons:
                reasons.append("Pattern Anomaly (ML Detected)")
            return reasons

        # We need to join the zscore/round back to the suspicious df to calculate reasons
        # But suspicious is a slice of df, so we can just use the indices or logic to map back.
        # df_features has the extended columns, and shares index with df/suspicious
        suspicious_features = df_features.loc[suspicious.index]
        
        results = []
        for idx, row in suspicious.iterrows():
            feat_row = suspicious_features.loc[idx]
            reasons = get_reasons(feat_row)
            txn_dict = row.to_dict()
            txn_dict['reasons'] = reasons
            # Also format description to be helpful
            txn_dict['risk_score'] = "High" if len(reasons) > 1 else "Medium"
            # Format date for JSON
            if isinstance(txn_dict['date'], (pd.Timestamp, datetime)):
                txn_dict['date'] = txn_dict['date'].strftime('%Y-%m-%d')
                
            results.append(txn_dict)
        
        return results
    except Exception as e:
        print(f"Fraud check error: {e}")
        return []


class ResolveRequest(BaseModel):
    transaction_id: str

@app.post("/api/resolve-fraud")
def resolve_fraud(request: ResolveRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        txn = db.query(Transaction).filter(
            Transaction.id == request.transaction_id,
            Transaction.user_id == user.id
        ).first()
        
        if txn:
            txn.is_resolved = True
            db.commit()
            return {"status": "success", "message": "Transaction marked as resolved"}
        else:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
    except Exception as e:
        print(f"Error resolving fraud: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        return []

# --- Reporting ---
from reports import create_pdf_report, create_statement_pdf
from fastapi.responses import FileResponse
from datetime import datetime, timedelta

def filter_df_by_date(df, start_str: str = None, end_str: str = None):
    if not start_str and not end_str:
        return df
        
    df['date_dt'] = pd.to_datetime(df['date'])
    filtered = df.copy()
    
    if start_str:
        start = pd.to_datetime(start_str)
        filtered = filtered[filtered['date_dt'] >= start]
    if end_str:
        end = pd.to_datetime(end_str)
        filtered = filtered[filtered['date_dt'] <= end]
        
    return filtered.drop(columns=['date_dt'])

@app.get("/api/report/pdf")
def generate_pdf_report(
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db),
    start_date: str = None, 
    end_date: str = None
):
    try:
        # Gather Data
        query = db.query(Transaction).filter(Transaction.user_id == user.id)
        full_df = pd.read_sql(query.statement, db.bind)
        
        full_df['date'] = pd.to_datetime(full_df['date'])
        
        if full_df.empty:
            raise HTTPException(status_code=400, detail="No data")
        
        # Filter Data
        df = filter_df_by_date(full_df, start_date, end_date)
        
        if df.empty:
             raise HTTPException(status_code=400, detail="No transactions in this period")
        
        # Re-calc stats based on filtered data
        total_income = df[df['amount'] > 0]['amount'].sum()
        total_expense = df[df['amount'] < 0]['amount'].sum()
        balance = total_income + total_expense
        stats = {"income": total_income, "expense": total_expense, "balance": balance}
        
        # Health score
        health = get_health_score_logic(user, db) 
        
        # Fraud check on filtered data
        fraud = [] 
        if 'anomaly' in models and not df.empty:
             try:
                 df_features = df.copy()
                 # Feature Engineering
                 df_features['category_mean'] = df_features.groupby('category')['amount'].transform('mean')
                 df_features['category_std'] = df_features.groupby('category')['amount'].transform('std').fillna(1.0)
                 df_features['amount_zscore'] = (df_features['amount'] - df_features['category_mean']) / df_features['category_std']
                 
                 df_features['is_weekend'] = df_features['date'].dt.dayofweek.isin([5, 6]).astype(int)
                 df_features['category_code'] = df_features['category'].astype('category').cat.codes
                 
                 df_features['is_round'] = (df_features['amount'] % 100 == 0).astype(int)

                 features = ['amount', 'amount_zscore', 'is_weekend', 'category_code', 'is_round']
                 X = df_features[features].fillna(0)
                 
                 anomalies_pred = models['anomaly'].predict(X)
                 df['is_anomaly'] = anomalies_pred
                 
                 # HYBRID OVERRIDE: Force certain patterns to be flagged as anomalies
                 # 1. High Z-Score (statistical outliers)
                 df.loc[df_features['amount_zscore'].abs() > 3, 'is_anomaly'] = -1
                 # 2. Large Round Amounts (potential fraud pattern)
                 df.loc[(df_features['amount'].abs() > 1000) & (df_features['is_round'] == 1), 'is_anomaly'] = -1
                 
                 # Filter to anomalies only
                 fraud_df = df[df['is_anomaly'] == -1]
                 fraud_df = fraud_df[fraud_df['amount'] < 0]
                 fraud_df = fraud_df[fraud_df['amount'].abs() > 500] # Match frontend threshold
                 
                 print(f"Total anomalies detected: {len(fraud_df)}")
                 
                 # Ensure date is formatted before converting to dict
                 if not fraud_df.empty:
                     fraud_df_copy = fraud_df.copy()
                     if 'date' in fraud_df_copy.columns:
                         fraud_df_copy['date'] = fraud_df_copy['date'].astype(str)
                     fraud = fraud_df_copy.to_dict(orient='records')
                     print(f"Fraud alerts to include in report: {len(fraud)}")
                 else:
                     fraud = []
             except Exception as ex:
                 print(f"Report fraud check failed: {ex}")
                 fraud = []

        forecast = get_forecast(days=30, user=user, db=db) 
        
        # Get Top Category
        top_category = "None"
        cat_spend = df[df['amount'] < 0].groupby('category')['amount'].sum().abs()
        if not cat_spend.empty:
            top_category = f"{cat_spend.idxmax()} (Rs. {cat_spend.max():.2f})"

        # Generate LLM Summary with Date Context
        period_text = f"Period: {start_date or 'All'} to {end_date or 'Now'}"
        context = (
            f"{period_text}\n"
            f"Net Change: Rs. {balance:.2f}\n"
            f"Income: Rs. {total_income:.2f}\n"
            f"Expense: Rs. {abs(total_expense):.2f}\n"
            f"Top Expense: {top_category}\n"
            f"Health Score: {health['score']} ({health['status']})\n"
        )
        
        advice_text = generate_financial_advice(user_question="Write an executive summary for this financial report.", financial_data=context)
        
        # Create PDF
        # Convert Timestamps to str for PDF gen
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')
        df = df.sort_values('date', ascending=False)
        
        pdf = create_pdf_report(user.username, stats, health, fraud, top_category, forecast, advice_text, df)
        
        path = f"data/{user.username}_report.pdf"
        pdf.output(path)
        
        return FileResponse(path, media_type='application/pdf', filename=f'Report_{start_date or "All"}.pdf')
        
    except Exception as e:
        print(f"Report Gen error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/report/statement")
def generate_statement_pdf(
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db),
    start_date: str = None, 
    end_date: str = None
):
    try:
        query = db.query(Transaction).filter(Transaction.user_id == user.id)
        df = pd.read_sql(query.statement, db.bind)
        df['date'] = pd.to_datetime(df['date'])
        
        # Add Splits to Statement
        splits = db.query(ExpenseSplit).filter(ExpenseSplit.user_id == user.id).all()
        split_rows = []
        for s in splits:
            parent = db.query(SharedExpense).filter(SharedExpense.id == s.expense_id).first()
            if parent:
                split_rows.append({
                    "date": pd.to_datetime(parent.date),
                    "amount": -s.amount_owed, # Debit
                    "description": f"Split: {parent.description} ({s.status})",
                    "category": "SplitBill",
                    "id": s.id,
                    "is_resolved": True if s.status == 'paid' else False
                })
        
        if split_rows:
            df_splits = pd.DataFrame(split_rows)
            df = pd.concat([df, df_splits], ignore_index=True)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="No data")
            
        df = filter_df_by_date(df, start_date, end_date)
        
        if df.empty:
             raise HTTPException(status_code=400, detail="No transactions in this period")
             
        df = df.sort_values('date', ascending=False)
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')
        
        pdf = create_statement_pdf(user.username, df, start_date or "Start", end_date or "Now")
        
        path = f"data/{user.username}_statement.pdf"
        pdf.output(path)
        
        return FileResponse(path, media_type='application/pdf', filename=f'Statement_{start_date or "All"}.pdf')
        
    except Exception as e:
        import traceback
        print(f"Statement Gen error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@app.get("/api/report")
def generate_report(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Aggregate all data for a comprehensive report
        stats = get_stats(user, db)
        health = get_health_score_logic(user, db)
        fraud = fraud_check(user, db)
        forecast = get_forecast(days=30, user=user, db=db)
        
        # Get Top Spending Category
        top_category = "None"
        query = db.query(Transaction).filter(Transaction.user_id == user.id)
        df = pd.read_sql(query.statement, db.bind)
        
        if not df.empty:
            cat_spend = df[df['amount'] < 0].groupby('category')['amount'].sum().abs()
            if not cat_spend.empty:
                top_category = f"{cat_spend.idxmax()} (Rs. {cat_spend.max():.2f})"
        
        report = {
            "generated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "user": user.username,
            "financial_summary": stats,
            "health_score": health,
            "security_status": {
                "anomalies_detected": len(fraud),
                "status": "Critical" if len(fraud) > 0 else "Secure",
                "fraud_transactions": fraud
            },
            "insights": {
                "top_expense": top_category,
                "projected_balance_30d": forecast[-1]['predicted_balance'] if forecast else 0
            }
        }
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Logic for Health Score
def get_health_score_logic(user, db):
    try:
        # Fetch transactions
        transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
        if not transactions:
             return {"score": 0, "status": "New", "savings_rate": 0, "budget_score": 0}
        
        df = pd.DataFrame([t.__dict__ for t in transactions])
        # remove sqlalchemy state
        if '_sa_instance_state' in df.columns:
            del df['_sa_instance_state']
            
        total_income = df[df['category'] == 'Income']['amount'].sum()
        total_expense = df[df['category'] != 'Income']['amount'].sum() # Negative value
        
        if total_income == 0:
            savings_rate = 0
        else:
            savings_rate = (total_income + total_expense) / total_income
            
        # 1. Savings Score
        savings_score = min(max(savings_rate / 0.20, 0), 1) * 50
        
        # 2. Budget Adherence
        budget_score = 50
        budgets = db.query(Budget).filter(Budget.user_id == user.id).all()
        
        if budgets:
            category_budgets = {b.category: b.amount for b in budgets}
            
            df['date'] = pd.to_datetime(df['date'])
            current_month = pd.Timestamp.now().month
            df_curr = df[df['date'].dt.month == current_month]
            
            for cat, limit in category_budgets.items():
                spent = df_curr[(df_curr['category'] == cat) & (df_curr['amount'] < 0)]['amount'].sum()
                spent = abs(spent)
                if spent > limit:
                    budget_score -= 10
            
        budget_score = max(0, budget_score)
        
        final_score = round(savings_score + budget_score)
        
        status = "Good"
        if final_score >= 80: status = "Excellent"
        elif final_score < 50: status = "Needs Improvement"
        elif final_score < 30: status = "Critical"
        
        return {
            "score": final_score,
            "status": status,
            "savings_rate": round(savings_rate * 100, 1),
            "budget_score": budget_score
        }
    except Exception as e:
        print(f"Health logic error: {e}")
        return {"score": 75, "status": "Good", "savings_rate": 15, "budget_score": 40}

@app.get("/api/health")
def get_health_score(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_health_score_logic(user, db)

class SimulationRequest(BaseModel):
    amount: float
    category: str

@app.post("/api/simulate")
def simulate_transaction(req: SimulationRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Get current status
        stats = get_stats(user, db)
        current_balance = stats['balance']
        
        # Calculate new balance
        new_balance = current_balance - abs(req.amount)
        
        budget_alert = "Safe"

        # 1. Check Solvency (Critical)
        if new_balance < 0:
            budget_alert = "Critical: Insufficient Funds"
        elif new_balance < current_balance * 0.2:
            budget_alert = "Warning: Low Balance Risk"
            
        # 2. Check Budget (If Exists)
        budget = db.query(Budget).filter(Budget.user_id == user.id, Budget.category == req.category).first()
        if budget:
             limit = budget.amount
             # Get current spent
             from sqlalchemy import func
             import calendar
             today = datetime.now()
             _, last_day = calendar.monthrange(today.year, today.month)
             start_of_month = datetime(today.year, today.month, 1).date()
             end_of_month = datetime(today.year, today.month, last_day).date()
             
             spent = db.query(func.sum(Transaction.amount)).filter(
                 Transaction.user_id == user.id,
                 Transaction.category == req.category,
                 Transaction.date >= start_of_month,
                 Transaction.date <= end_of_month,
                 Transaction.amount < 0
             ).scalar() or 0.0
             
             spent = abs(spent)
             
             if spent + abs(req.amount) > limit:
                 budget_alert = "Critical: Exceeds Budget"
             elif spent + abs(req.amount) > limit * 0.9:
                 budget_alert = "Warning: Near Budget Limit"
        
        # 3. No Budget Fallback
        elif budget_alert == "Safe" and abs(req.amount) > current_balance * 0.3:
             budget_alert = "Warning: Significant Expense (30%+ of Balance)"
        
        return {
            "current_balance": current_balance,
            "new_balance": new_balance,
            "impact": budget_alert
        }
    except Exception as e:
        print(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- File Upload & Pipeline ---
from fastapi import UploadFile, File
from data_normalizer import normalize_csv

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        
        # 1. Normalize
        df_new = normalize_csv(content, filename=file.filename)
        if df_new.empty:
            raise HTTPException(status_code=400, detail="Could not parse CSV/Excel format.")
            
        # 2. Enrich (Predict Categories)
        if 'classifier' in models:
            descriptions = df_new['description'].astype(str)
            predicted_cats = models['classifier'].predict(descriptions)
            df_new['category'] = predicted_cats
        else:
            df_new['category'] = 'Uncategorized' 
            
        # 3. Save to DB
        added_count = 0
        for _, row in df_new.iterrows():
            # Basic dedup based on date/desc/amt check could be added here
            new_txn = Transaction(
                id=str(uuid.uuid4()),
                user_id=user.id,
                date=datetime.strptime(row['date'], '%Y-%m-%d').date(),
                description=row['description'],
                amount=float(row['amount']),
                category=row['category'],
                is_resolved=False
            )
            db.add(new_txn)
            added_count += 1
        
        db.commit()
        
        return {
            "status": "success", 
            "message": f"Processed and saved {added_count} transactions.",
            "preview": df_new.head(5).to_dict(orient='records')
        }
            
    except Exception as e:
        print(f"Upload error: {e}")


# --- Splitwise API ---
from models import ExpenseGroup, GroupMember, SharedExpense, ExpenseSplit

class GroupCreate(BaseModel):
    name: str

class MemberAdd(BaseModel):
    username: str

class ExpenseCreate(BaseModel):
    description: str
    amount: float
    split_type: str = "equal" # Currently only equal supported

@app.get("/api/groups")
def get_user_groups(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Join GroupMember to find groups the user is in
    # This might need a more optimized query but this works
    memberships = db.query(GroupMember).filter(GroupMember.user_id == user.id).all()
    group_ids = [m.group_id for m in memberships]
    groups = db.query(ExpenseGroup).filter(ExpenseGroup.id.in_(group_ids)).all()
    return [{"id": g.id, "name": g.name, "created_at": g.created_at} for g in groups]

@app.post("/api/groups")
def create_group(group: GroupCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create Group
    new_group = ExpenseGroup(
        id=str(uuid.uuid4()),
        name=group.name,
        created_by_id=user.id
    )
    db.add(new_group)
    db.commit()
    
    # Add Creator as Member
    member = GroupMember(
        id=str(uuid.uuid4()),
        group_id=new_group.id,
        user_id=user.id
    )
    db.add(member)
    db.commit()
    return {"id": new_group.id, "name": new_group.name}

@app.get("/api/groups/{group_id}")
def get_group_details(group_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify membership
    membership = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == group_id).first()
    
    # Get Members
    members = db.query(User).join(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_list = [{"id": m.id, "username": m.username} for m in members]
    
    # Get Expenses
    expenses = db.query(SharedExpense).filter(SharedExpense.group_id == group_id).order_by(SharedExpense.date.desc()).all()
    expense_list = []
    for exp in expenses:
        payer = db.query(User).filter(User.id == exp.payer_id).first()
        
        # Get Splits
        splits_data = []
        for s in exp.splits:
            s_user = db.query(User).filter(User.id == s.user_id).first()
            splits_data.append({
                "id": s.id,
                "user_id": s.user_id,
                "username": s_user.username if s_user else "Unknown",
                "amount": s.amount_owed,
                "status": s.status
            })
            
        expense_list.append({
            "id": exp.id,
            "description": exp.description,
            "amount": exp.amount,
            "date": exp.date,
            "payer": payer.username if payer else "Unknown",
            "payer_id": exp.payer_id,
            "splits": splits_data
        })
        
    return {
        "id": group.id,
        "name": group.name,
        "members": member_list,
        "expenses": expense_list
    }

@app.post("/api/groups/{group_id}/members")
def add_group_member(group_id: str, member: MemberAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify creator/admin rights? For now any member can add
    membership = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    new_member_user = db.query(User).filter(User.username == member.username).first()
    if not new_member_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if already member
    exists = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == new_member_user.id).first()
    if exists:
        raise HTTPException(status_code=400, detail="User already in group")
        
    new_membership = GroupMember(
        id=str(uuid.uuid4()),
        group_id=group_id,
        user_id=new_member_user.id
    )
    db.add(new_membership)
    db.commit()
    return {"status": "success", "username": new_member_user.username}

@app.post("/api/groups/{group_id}/expenses")
def add_shared_expense(group_id: str, expense: ExpenseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify membership
    membership = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")
        
    # Create Expense
    new_expense = SharedExpense(
        id=str(uuid.uuid4()),
        group_id=group_id,
        payer_id=user.id,
        description=expense.description,
        amount=expense.amount,
        date=datetime.now().date()
    )
    db.add(new_expense)
    db.commit()
    
    # Calculate Split (Equal)
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    if not members:
         raise HTTPException(status_code=400, detail="No members to split with")
         
    split_amount = expense.amount / len(members)
    
    for m in members:
        split = ExpenseSplit(
            id=str(uuid.uuid4()),
            expense_id=new_expense.id,
            user_id=m.user_id,
            amount_owed=split_amount
        )
        db.add(split)
        
    db.commit()
    return {"status": "success", "expense_id": new_expense.id}

    return {"status": "success", "expense_id": new_expense.id}

class SplitAction(BaseModel):
    action: str # pay, reject

@app.post("/api/splits/{split_id}/action")
def update_split_status(split_id: str, action: SplitAction, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Join with SharedExpense to check payer rights
    split = db.query(ExpenseSplit).join(SharedExpense).filter(ExpenseSplit.id == split_id).first()
    
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")
        
    is_ower = split.user_id == user.id
    is_payer = split.expense.payer_id == user.id
    
    if not (is_ower or is_payer):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if action.action == "pay":
        # If Ower marks paid -> status 'paid' (simplified, typically needs confirmation)
        # If Payer marks received -> status 'paid'
        split.status = "paid"
    elif action.action == "reject":
        if is_ower:
            split.status = "rejected"
        else:
             raise HTTPException(status_code=403, detail="Only the person who owes can reject")
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.commit()
    return {"status": "success", "new_status": split.status}

@app.get("/api/groups/{group_id}/balances")
def get_group_balances(group_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Simple Balance Calculation
    # Net Balance = (Total Paid by Me) - (Total I Owe in Splits)
    
    membership = db.query(GroupMember).filter(GroupMember.group_id == group_id, GroupMember.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")
        
    # Total I Paid (Only count expenses where at least one split is NOT rejected? Or simple view: I paid X)
    # Ideally, if I pay 100, and someone rejects their 50, I am still out 100.
    # But if they pay me back, my "net balance" improves.
    # Wait, "paid" status on a split means "I have paid the payer".
    # So if I owe 50, and I mark "paid", my debt decreases by 50.
    
    # 1. Total I "Fronted" (Paid to merchant)
    total_fronted = db.query(func.sum(SharedExpense.amount)).filter(
        SharedExpense.group_id == group_id, 
        SharedExpense.payer_id == user.id
    ).scalar() or 0.0
    
    # 2. Total I have been "Reimbursed" (Splits owed to me that are marked PAID)
    reimbursed_to_me = db.query(func.sum(ExpenseSplit.amount_owed)).join(SharedExpense).filter(
        SharedExpense.group_id == group_id,
        SharedExpense.payer_id == user.id,
        ExpenseSplit.status == 'paid'
    ).scalar() or 0.0
    
    # 3. Total I Owe (Allocated to me)
    # Exclude what I've already Paid back or Rejected
    my_debt_total = db.query(func.sum(ExpenseSplit.amount_owed)).join(SharedExpense).filter(
        SharedExpense.group_id == group_id,
        ExpenseSplit.user_id == user.id
    ).scalar() or 0.0
    
    my_paid_back = db.query(func.sum(ExpenseSplit.amount_owed)).join(SharedExpense).filter(
        SharedExpense.group_id == group_id,
        ExpenseSplit.user_id == user.id,
        ExpenseSplit.status == 'paid'
    ).scalar() or 0.0
    
    # Net Calculation:
    # (+ Fronted) - (+ Reimbursed to me [cash in hand]) - (+ Debt allocated) + (+ Debt I paid back)
    # Actually simpler:
    # Outstanding Credit = (Splits owed to me that are PENDING)
    # Outstanding Debt = (Splits I owe that are PENDING)
    
    # 1. Money I am owed (People haven't paid me yet)
    # Get all splits for expenses I paid, where user != me, and status = pending
    pending_owed_to_me = db.query(func.sum(ExpenseSplit.amount_owed)).join(SharedExpense).filter(
        SharedExpense.group_id == group_id,
        SharedExpense.payer_id == user.id,
        ExpenseSplit.user_id != user.id, # Exclude my own split
        ExpenseSplit.status == 'pending'
    ).scalar() or 0.0
    
    # 2. Money I owe others
    pending_i_owe = db.query(func.sum(ExpenseSplit.amount_owed)).join(SharedExpense).filter(
        SharedExpense.group_id == group_id,
        ExpenseSplit.user_id == user.id,
        SharedExpense.payer_id != user.id, # Exclude if I paid execution
        ExpenseSplit.status == 'pending'
    ).scalar() or 0.0
    
    net_balance = pending_owed_to_me - pending_i_owe
    
    return {
        "start_balance": 0, # Placeholder
        "pending_owed_to_me": pending_owed_to_me,
        "pending_i_owe": pending_i_owe,
        "net_balance": net_balance,
        "status": "You are owed" if net_balance > 0 else "You owe" if net_balance < 0 else "Settled"
    }

# ==================== RECURRING PAYMENTS ====================


class RecurringPaymentCreate(BaseModel):
    name: str
    amount: float
    category: str
    frequency: str  # daily, weekly, monthly, yearly
    start_date: str  # YYYY-MM-DD
    auto_pay: bool = False
    description: Optional[str] = None

class RecurringPaymentUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None
    auto_pay: Optional[bool] = None
    description: Optional[str] = None

def calculate_next_due_date(current_date, frequency):
    """Calculate next due date based on frequency"""
    if frequency == "daily":
        return current_date + timedelta(days=1)
    elif frequency == "weekly":
        return current_date + timedelta(weeks=1)
    elif frequency == "monthly":
        return current_date + relativedelta(months=1)
    elif frequency == "yearly":
        return current_date + relativedelta(years=1)
    return current_date

@app.post("/api/recurring-payments")
def create_recurring_payment(
    payment: RecurringPaymentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        start_date = datetime.strptime(payment.start_date, "%Y-%m-%d").date()
        
        new_payment = RecurringPayment(
            user_id=user.id,
            name=payment.name,
            amount=payment.amount,
            category=payment.category,
            frequency=payment.frequency,
            start_date=start_date,
            next_due_date=start_date,
            auto_pay=payment.auto_pay,
            description=payment.description
        )
        
        db.add(new_payment)
        db.commit()
        db.refresh(new_payment)
        
        return {
            "id": new_payment.id,
            "name": new_payment.name,
            "amount": new_payment.amount,
            "category": new_payment.category,
            "frequency": new_payment.frequency,
            "next_due_date": new_payment.next_due_date.strftime("%Y-%m-%d"),
            "is_active": new_payment.is_active,
            "auto_pay": new_payment.auto_pay
        }
    except Exception as e:
        print(f"Error creating recurring payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/report/portfolio")
def get_portfolio_report(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assets = db.query(Asset).filter(Asset.user_id == user.id).all()
    if not assets:
        raise HTTPException(status_code=400, detail="No assets found to generate report")
    
    pdf_bytes = generate_portfolio_pdf(assets, user)
    
    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Portfolio_{user.username}.pdf"}
    )

@app.get("/api/recurring-payments")
def get_recurring_payments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        payments = db.query(RecurringPayment).filter(
            RecurringPayment.user_id == user.id
        ).all()
        
        result = []
        today = datetime.now().date()
        
        for p in payments:
            days_until_due = (p.next_due_date - today).days
            status = "overdue" if days_until_due < 0 else "due" if days_until_due == 0 else "upcoming"
            
            result.append({
                "id": p.id,
                "name": p.name,
                "amount": p.amount,
                "category": p.category,
                "frequency": p.frequency,
                "next_due_date": p.next_due_date.strftime("%Y-%m-%d"),
                "is_active": p.is_active,
                "auto_pay": p.auto_pay,
                "description": p.description,
                "status": status,
                "days_until_due": days_until_due
            })
        
        return result
    except Exception as e:
        print(f"Error fetching recurring payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/recurring-payments/{payment_id}")
def update_recurring_payment(
    payment_id: str,
    payment: RecurringPaymentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_payment = db.query(RecurringPayment).filter(
            RecurringPayment.id == payment_id,
            RecurringPayment.user_id == user.id
        ).first()
        
        if not db_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Update fields if provided
        if payment.name is not None:
            db_payment.name = payment.name
        if payment.amount is not None:
            db_payment.amount = payment.amount
        if payment.category is not None:
            db_payment.category = payment.category
        if payment.frequency is not None:
            db_payment.frequency = payment.frequency
        if payment.is_active is not None:
            db_payment.is_active = payment.is_active
        if payment.auto_pay is not None:
            db_payment.auto_pay = payment.auto_pay
        if payment.description is not None:
            db_payment.description = payment.description
        
        db_payment.updated_at = datetime.now().date()
        
        db.commit()
        db.refresh(db_payment)
        
        return {"status": "success", "message": "Payment updated"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating recurring payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/recurring-payments/{payment_id}")
def delete_recurring_payment(
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_payment = db.query(RecurringPayment).filter(
            RecurringPayment.id == payment_id,
            RecurringPayment.user_id == user.id
        ).first()
        
        if not db_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        db.delete(db_payment)
        db.commit()
        
        return {"status": "success", "message": "Payment deleted"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting recurring payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recurring-payments/{payment_id}/pay")
def mark_payment_as_paid(
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_payment = db.query(RecurringPayment).filter(
            RecurringPayment.id == payment_id,
            RecurringPayment.user_id == user.id
        ).first()
        
        if not db_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Create transaction
        new_transaction = Transaction(
            user_id=user.id,
            date=datetime.now().date(),
            description=f"{db_payment.name} (Recurring)",
            amount=-abs(db_payment.amount),  # Negative for expense
            category=db_payment.category
        )
        
        db.add(new_transaction)
        
        # Update next due date
        db_payment.next_due_date = calculate_next_due_date(
            db_payment.next_due_date,
            db_payment.frequency
        )
        
        # Dismiss any notifications for this payment
        db.query(PaymentNotification).filter(
            PaymentNotification.recurring_payment_id == payment_id,
            PaymentNotification.is_dismissed == False
        ).update({"is_dismissed": True})
        
        db.commit()
        
        return {
            "status": "success",
            "message": "Payment marked as paid",
            "transaction_id": new_transaction.id,
            "next_due_date": db_payment.next_due_date.strftime("%Y-%m-%d")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking payment as paid: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recurring-payments/due")
def get_due_payments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        today = datetime.now().date()
        upcoming_threshold = today + timedelta(days=3)  # 3 days ahead
        
        payments = db.query(RecurringPayment).filter(
            RecurringPayment.user_id == user.id,
            RecurringPayment.is_active == True,
            RecurringPayment.next_due_date <= upcoming_threshold
        ).all()
        
        result = []
        for p in payments:
            days_until_due = (p.next_due_date - today).days
            
            result.append({
                "id": p.id,
                "name": p.name,
                "amount": p.amount,
                "category": p.category,
                "next_due_date": p.next_due_date.strftime("%Y-%m-%d"),
                "days_until_due": days_until_due,
                "is_overdue": days_until_due < 0
            })
        
        return result
    except Exception as e:
        print(f"Error fetching due payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== WEALTH MANAGEMENT APIs ====================

class AssetCreate(BaseModel):
    name: str
    symbol: Optional[str] = None
    type: str
    quantity: float
    purchase_price: Optional[float] = None
    current_price: Optional[float] = None
    purchase_date: str # YYYY-MM-DD

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    symbol: Optional[str] = None
    type: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None
    current_price: Optional[float] = None
    purchase_date: Optional[str] = None

@app.get("/api/assets")
def get_assets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Asset).filter(Asset.user_id == user.id).all()

@app.post("/api/assets")
def create_asset(asset: AssetCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        current_price = asset.current_price
        metrics_json = None

        # Auto-fetch price if symbol provided and no price given (or if user wants auto)
        if asset.symbol:
            try:
                print(f"Fetching data for {asset.symbol}")
                ticker = yf.Ticker(asset.symbol)
                
                # 1. Current Price
                if current_price is None or current_price == 0:
                    hist = ticker.history(period="1d")
                    if not hist.empty:
                        current_price = float(hist['Close'].iloc[-1])
                        print(f"Fetched current price: {current_price}")

                # 2. Purchase Price (Historical)
                if asset.purchase_price is None or asset.purchase_price == 0:
                    try:
                        p_date = datetime.strptime(asset.purchase_date, "%Y-%m-%d")
                        # Fetch range to handle weekends/holidays (e.g. 5 days window)
                        hist_past = ticker.history(start=asset.purchase_date, end=(p_date + timedelta(days=5)).strftime("%Y-%m-%d"))
                        if not hist_past.empty:
                            asset.purchase_price = float(hist_past['Close'].iloc[0])
                            print(f"Fetched historical price: {asset.purchase_price}")
                    except Exception as he:
                        print(f"Historical fetch failed: {he}")

                # 3. Metrics
                try:
                    info = ticker.info
                    metrics_data = {
                        "pe": info.get('trailingPE'),
                        "market_cap": info.get('marketCap'),
                        "high_52w": info.get('fiftyTwoWeekHigh'),
                        "low_52w": info.get('fiftyTwoWeekLow'),
                        "dividend_yield": info.get('dividendYield'),
                        "currency": info.get('currency'),
                        "lot_size": info.get('lotSize', 1),
                        "previous_close": info.get('previousClose') or info.get('regularMarketPreviousClose')
                    }
                    metrics_json = json.dumps(metrics_data)
                except Exception as me:
                    print(f"Metrics fetch failed: {me}")
                    metrics_json = None

            except Exception as e:
                print(f"Failed to fetch stock data: {e}")
                if current_price is None: current_price = 0
                metrics_json = None

        purchase_date = datetime.strptime(asset.purchase_date, "%Y-%m-%d").date()
        new_asset = Asset(
            user_id=user.id,
            name=asset.name,
            symbol=asset.symbol,
            type=asset.type,
            quantity=asset.quantity,
            purchase_price=asset.purchase_price or 0,
            current_price=current_price or 0,
            purchase_date=purchase_date,
            metrics=metrics_json
        )
        db.add(new_asset)
        db.commit()
        db.refresh(new_asset)
        return new_asset
    except Exception as e:
        with open("error_log.txt", "a") as f:
            f.write(f"Error creating asset: {str(e)}\n")
        print(f"Error creating asset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/assets/refresh-prices")
def refresh_asset_prices(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assets = db.query(Asset).filter(Asset.user_id == user.id, Asset.symbol != None).all()
    updated_count = 0
    errors = []
    
    for asset in assets:
        try:
            ticker = yf.Ticker(asset.symbol)
            hist = ticker.history(period="1d")
            if not hist.empty:
                new_price = float(hist['Close'].iloc[-1])
                asset.current_price = new_price
                
                # Fetch Metrics
                try:
                    info = ticker.info
                    metrics_data = {
                        "pe": info.get('trailingPE'),
                        "market_cap": info.get('marketCap'),
                        "high_52w": info.get('fiftyTwoWeekHigh'),
                        "low_52w": info.get('fiftyTwoWeekLow'),
                        "dividend_yield": info.get('dividendYield'),
                        "currency": info.get('currency'),
                        "lot_size": info.get('lotSize', 1),
                        "previous_close": info.get('previousClose') or info.get('regularMarketPreviousClose')
                    }
                    asset.metrics = json.dumps(metrics_data)
                except Exception as me:
                    print(f"Metrics fetch failed for {asset.symbol}: {me}")

                updated_count += 1
        except Exception as e:
            errors.append(f"{asset.symbol}: {str(e)}")
            
    db.commit()
    return {"message": f"Updated {updated_count} assets", "errors": errors}

@app.put("/api/assets/{asset_id}")
def update_asset(asset_id: int, asset: AssetUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_asset = db.query(Asset).filter(Asset.id == asset_id, Asset.user_id == user.id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset.name: db_asset.name = asset.name
    if asset.type: db_asset.type = asset.type
    if asset.quantity is not None: db_asset.quantity = asset.quantity
    if asset.purchase_price is not None: db_asset.purchase_price = asset.purchase_price
    if asset.current_price is not None: db_asset.current_price = asset.current_price
    if asset.purchase_date:
        db_asset.purchase_date = datetime.strptime(asset.purchase_date, "%Y-%m-%d").date()
        
    db.commit()
    db.refresh(db_asset)
    return db_asset

@app.delete("/api/assets/{asset_id}")
def delete_asset(asset_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_asset = db.query(Asset).filter(Asset.id == asset_id, Asset.user_id == user.id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db.delete(db_asset)
    db.commit()
    return {"message": "Asset deleted"}

@app.get("/api/net-worth")
def get_net_worth(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        assets = db.query(Asset).filter(Asset.user_id == user.id).all()
        
        # Fetch generic USD-INR rate (cached slightly or just fetched)
        # For simplicity, fetching real-time. Optimization: Cache this.
        usd_inr = 86.0 
        try:
            er = yf.Ticker("USDINR=X").history(period="1d")
            if not er.empty:
               usd_inr = float(er['Close'].iloc[-1])
        except: pass

        total_assets = 0
        breakdown = {}
        
        for a in assets:
            price = a.current_price or 0
            qty = a.quantity or 0
            val_in_native = price * qty
            
            # Conversion
            val_inr = val_in_native
            try:
                if a.metrics:
                    m = json.loads(a.metrics)
                    curr = m.get('currency', 'INR')
                    if curr == 'USD':
                        val_inr = val_in_native * usd_inr
                    # Add other currencies if needed (EUR, etc.)
            except: pass
            
            total_assets += val_inr
            breakdown[a.type] = breakdown.get(a.type, 0) + val_inr
            
        return {
            "total_net_worth": total_assets,
            "currency": "INR",
            "breakdown": breakdown
        }
    except Exception as e:
        print(f"Error fetching net worth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RISK PROFILE APIs ====================

class RiskProfileCreate(BaseModel):
    score: int
    profile_type: str
    answers: str # JSON string

@app.get("/api/risk-profile")
def get_risk_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(RiskProfile).filter(RiskProfile.user_id == user.id).first()

@app.post("/api/risk-profile")
def create_or_update_risk_profile(profile: RiskProfileCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        db_profile = db.query(RiskProfile).filter(RiskProfile.user_id == user.id).first()
        if db_profile:
            db_profile.score = profile.score
            db_profile.profile_type = profile.profile_type
            db_profile.answers = profile.answers
            db.commit()
            db.refresh(db_profile)
            return db_profile
        else:
            new_profile = RiskProfile(
                user_id=user.id,
                score=profile.score,
                profile_type=profile.profile_type,
                answers=profile.answers
            )
            db.add(new_profile)
            db.commit()
            db.refresh(new_profile)
            return new_profile
    except Exception as e:
        print(f"Error saving risk profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== STOCK SEARCH API ====================

@app.get("/api/stocks/search")
def search_stocks(q: str):
    try:
        if not q or len(q) < 1: return []
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        url = "https://query2.finance.yahoo.com/v1/finance/search"
        params = {
            'q': q,
            'quotesCount': 10,
            'newsCount': 0,
            'enableFuzzyQuery': False,
            'quotesQueryId': 'tss_match_phrase_query'
        }
        r = requests.get(url, params=params, headers=headers)
        if r.status_code == 200:
            data = r.json()
            return data.get('quotes', [])
        return []
    except Exception as e:
        print(f"Search error: {e}")
        return []

def calculate_technical_indicators(df):
    if df.empty: return df
    
    # Avoid warning on slice copy
    df = df.copy()

    # 1. SMA (20)
    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    
    # 2. EMA (20)
    df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
    
    # 3. RSI (14)
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # 4. MACD
    exp1 = df['Close'].ewm(span=12, adjust=False).mean()
    exp2 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = exp1 - exp2
    df['Signal_Line'] = df['MACD'].ewm(span=9, adjust=False).mean()
    
    return df

@app.get("/api/stocks/{symbol}/history")
def get_stock_history(symbol: str, period: str = "1mo"):
    try:
        ticker = yf.Ticker(symbol)
        interval = "1d"
        if period == "1d": interval = "5m"
        elif period == "5d": interval = "15m"
        
        hist = ticker.history(period=period, interval=interval)
        
        # Calculate Indicators
        hist = calculate_technical_indicators(hist)
        
        data = []
        for index, row in hist.iterrows():
            record = {
                "date": index.isoformat(),
                "price": row['Close'],
                "open": row['Open'],
                "high": row['High'],
                "low": row['Low'],
                "close": row['Close'],
                "sma_20": row.get('SMA_20'),
                "ema_20": row.get('EMA_20'),
                "rsi": row.get('RSI'),
                "macd": row.get('MACD'),
                "signal": row.get('Signal_Line')
            }
            # Handle NaN for JSON serialization
            for k, v in record.items():
                if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                    record[k] = None
                    
            data.append(record)
        return data
    except Exception as e:
        print(f"History error: {e}")
        return []

@app.get("/api/stocks/{symbol}/news")
def get_stock_news(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        return ticker.news
    except Exception as e:
        print(f"News error: {e}")
        return []
