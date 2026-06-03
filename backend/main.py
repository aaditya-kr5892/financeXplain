from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import pickle
import os
import hashlib
from datetime import datetime
from typing import List, Optional
from llm_service import generate_financial_advice
import uuid
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models import User, Transaction, Budget

# Create Tables (if not exist)
Base.metadata.create_all(bind=engine)

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
        raise HTTPException(status_code=401, detail="X-User-ID header missing")
    
    user = db.query(User).filter(User.username == x_user_id).first()
    if not user:
         raise HTTPException(status_code=401, detail="User not found")
    return user

# --- DATA ENDPOINTS ---

# Dependency to get current user object
async def get_current_user(x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID header missing")
    
    user = db.query(User).filter(User.username == x_user_id).first()
    if not user:
         raise HTTPException(status_code=401, detail="User not found")
    return user

@app.get("/api/transactions")
def get_transactions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    # Convert to dict list
    return [
        {
            "id": t.id,
            "date": t.date,
            "description": t.description,
            "amount": t.amount,
            "category": t.category,
            "is_resolved": t.is_resolved
        }
        for t in transactions
    ][-100:] # Return last 100

@app.get("/api/stats")
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Use SQL aggregation for efficiency
    # But for simplicity/speed now, fetch all and sum (or use query funcs)
    # transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    # Pushing sum to DB is better:
    
    from sqlalchemy import func
    
    total_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id, 
        Transaction.category == 'Income'
    ).scalar() or 0.0
    
    # Expense is non-Income
    total_expense = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id, 
        Transaction.category != 'Income'
    ).scalar() or 0.0
    
    balance = total_income + total_expense
    
    return {
        "income": round(total_income, 2),
        "expense": round(total_expense, 2),
        "balance": round(balance, 2)
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
            # We can use a base error estimate (e.g., 5-10% of flow or fixed amount)
            uncertainty = max(50, abs(predicted_flow) * 0.2) + (i * 5) 
            
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
                "predicted_balance": round(current_balance, 2), # Flat line if no data
                "upper_bound": round(current_balance, 2),
                "lower_bound": round(current_balance, 2)
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
        query = db.query(Transaction).filter(
            Transaction.user_id == user.id,
            Transaction.is_resolved == False
        )
        df = pd.read_sql(query.statement, db.bind)
        
        if df.empty or 'anomaly' not in models:
            return []

        # Replicate Feature Engineering for Inference
        df_features = df.copy()
        
        # 1. Z-Score (using current batch stats - ideally should use trained scaler, but batch approximation works for simple demo)
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
            # Mean = -500. Val = -5000 (High exp) -> Z = (-5000 - -500)/std = Negative Z
            # Mean = -500. Val = -50 (Low exp) -> Z = (-50 - -500)/std = Positive Z
            
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
        # But suspicious is a slice of df, so we can just use the indices or merge logic.
        # Simplest is to map the features back since suspicious is just filtered df.
        # df_features has the extended columns.
        suspicious_features = df_features.loc[suspicious.index]
        
        results = []
        for idx, row in suspicious.iterrows():
            feat_row = suspicious_features.loc[idx]
            reasons = get_reasons(feat_row)
            txn_dict = row.to_dict()
            txn_dict['reasons'] = reasons
            # Also format description to be helpful
            txn_dict['risk_score'] = "High" if len(reasons) > 1 else "Medium"
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
                 fraud_df = df[anomalies_pred == -1]
                 fraud_df = fraud_df[fraud_df['amount'] < 0]
                 fraud_df = fraud_df[fraud_df['amount'].abs() > 500]
                 
                 fraud = fraud_df.to_dict(orient='records')
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
        print(f"Statement Gen error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        
        # Check Budget
        budget_alert = "Safe"
        
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

