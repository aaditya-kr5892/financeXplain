from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import pickle
import os
import hashlib
import csv
from datetime import datetime
from typing import List, Optional
from llm_service import generate_financial_advice
import uuid

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
USERS_FILE = 'data/users.csv'
DATA_DIR = 'data'

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# Ensure users file exists
if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['username', 'password_hash'])

class UserAuth(BaseModel):
    username: str
    password: str

class UserRegister(UserAuth):
    initial_balance: float

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_user_path(username: str, file_type: str) -> str:
    # file_type: 'transactions' or 'budgets'
    if file_type == 'transactions':
        return os.path.join(DATA_DIR, f"{username}_transactions.csv")
    elif file_type == 'budgets':
        return os.path.join(DATA_DIR, f"{username}_budgets.json")
    return ""

def verify_user(username: str, password: str) -> bool:
    try:
        with open(USERS_FILE, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['username'] == username:
                    return row['password_hash'] == hash_password(password)
    except FileNotFoundError:
        return False
    return False

def user_exists(username: str) -> bool:
    try:
        with open(USERS_FILE, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['username'] == username:
                    return True
    except FileNotFoundError:
        return False
    return False

    return False

def ensure_transaction_schema(user_file):
    if not os.path.exists(user_file):
        return

    df = pd.read_csv(user_file)
    modified = False
    
    if 'id' not in df.columns:
        df['id'] = [str(uuid.uuid4()) for _ in range(len(df))]
        modified = True
        
    if 'is_resolved' not in df.columns:
        df['is_resolved'] = False
        modified = True
        
    if modified:
        df.to_csv(user_file, index=False)

@app.post("/api/register")
def register(user: UserRegister):
    if user_exists(user.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Save user
    with open(USERS_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([user.username, hash_password(user.password)])
    
    # Initialize User Data
    trans_file = get_user_path(user.username, 'transactions')
    
    # Create transactions file with initial balance
    initial_txn = {
        'id': str(uuid.uuid4()),
        'date': datetime.now().strftime('%Y-%m-%d'),
        'description': 'Initial Balance Deposit',
        'amount': user.initial_balance,
        'category': 'Income',
        'is_resolved': False
    }
    df = pd.DataFrame([initial_txn])
    df.to_csv(trans_file, index=False)
    
    return {"status": "success", "message": "User registered successfully"}

@app.post("/api/login")
def login(user: UserAuth):
    if verify_user(user.username, user.password):
        return {"status": "success", "token": user.username} # Simple token mechanism
    raise HTTPException(status_code=401, detail="Invalid credentials")

# Dependency to get current user from header
async def get_current_user(x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID header missing")
    return x_user_id

# --- MODELS ---
# Load Models (Lazy loading)
models = {}

def load_models():
    try:
        # Load from local 'models' folder
        if os.path.exists('models/classifier.pkl'):
            with open('models/classifier.pkl', 'rb') as f:
                models['classifier'] = pickle.load(f)
        if os.path.exists('models/forecaster.pkl'):
            with open('models/forecaster.pkl', 'rb') as f:
                models['forecaster'] = pickle.load(f)
        if os.path.exists('models/anomaly.pkl'):
            with open('models/anomaly.pkl', 'rb') as f:
                models['anomaly'] = pickle.load(f)
        print("Models loaded successfully.")
    except Exception as e:
        print(f"Error loading models: {e}")

@app.on_event("startup")
async def startup_event():
    load_models()

# --- DATA ENDPOINTS ---

@app.get("/api/transactions")
def get_transactions(user: str = Depends(get_current_user)):
    try:
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
             return []
        
        df = pd.read_csv(file_path)
        # Return last 100 transactions for UI
        return df.tail(100).to_dict(orient='records')
    except Exception as e:
        print(f"Error fetching transactions for {user}: {e}")
        return []

@app.get("/api/stats")
def get_stats(user: str = Depends(get_current_user)):
    try:
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
             return {"income": 0, "expense": 0, "balance": 0}

        df = pd.read_csv(file_path)
        if df.empty:
             return {"income": 0, "expense": 0, "balance": 0}

        total_income = df[df['category'] == 'Income']['amount'].sum()
        total_expense = df[df['category'] != 'Income']['amount'].sum()
        balance = total_income + total_expense
        return {
            "income": round(total_income, 2),
            "expense": round(total_expense, 2),
            "balance": round(balance, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AdviceRequest(BaseModel):
    context: str

@app.post("/api/ask-advisor")
def ask_advisor(request: AdviceRequest, user: str = Depends(get_current_user)):
    try:
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="No data found for user")

        # Read actual transaction data
        df = pd.read_csv(file_path)
        
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
def get_forecast(days: int = 30, user: str = Depends(get_current_user)):
    try:
        # 1. Check for Model and Data
        if 'forecaster' not in models:
            # Fallback to simple linear projection if model missing
            return generate_fallback_forecast(user, days)
            
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
             return generate_fallback_forecast(user, days) # Fallback
        
        df = pd.read_csv(file_path)
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

    except Exception as e:
        print(f"Forecast ML error: {e}")
        # Final safety fallback
        return generate_fallback_forecast(user, days)

def generate_fallback_forecast(user, days):
    """Simple linear projection when ML fails"""
    try:
        file_path = get_user_path(user, 'transactions')
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            total_income = df[df['category'] == 'Income']['amount'].sum()
            total_expense = df[df['category'] != 'Income']['amount'].sum()
            current_balance = total_income + total_expense
        else:
            current_balance = 0
            
        return [
            {
                "date": (datetime.now() + pd.Timedelta(days=i)).strftime('%Y-%m-%d'),
                "predicted_balance": round(current_balance, 2), # Flat line if no data
                "upper_bound": round(current_balance, 2),
                "lower_bound": round(current_balance, 2)
            }
            for i in range(days)
        ]
    except:
        return []

# --- Manual Transaction Entry ---
class TransactionEntry(BaseModel):
    date: str
    description: str
    amount: float
    category: Optional[str] = None

@app.post("/api/transaction")
def add_transaction(transaction: TransactionEntry, user: str = Depends(get_current_user)):
    try:
        # Validate date format
        try:
            transaction_date = pd.to_datetime(transaction.date, format='%Y-%m-%d')
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
        new_transaction = {
            'date': transaction_date.strftime('%Y-%m-%d'),
            'description': transaction.description.strip(),
            'amount': transaction.amount,
            'category': category
        }
        
        file_path = get_user_path(user, 'transactions')
        
        # Read existing transactions
        try:
            df = pd.read_csv(file_path)
        except FileNotFoundError:
            # Create new dataframe if file doesn't exist
            df = pd.DataFrame(columns=['date', 'description', 'amount', 'category'])
        
        # Append new transaction
        df = pd.concat([df, pd.DataFrame([new_transaction])], ignore_index=True)
        
        # Save back to CSV
        df.to_csv(file_path, index=False)
        
        return {
            "status": "success",
            "message": "Transaction added successfully",
            "transaction": new_transaction
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Transaction entry error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Budget Management ---

class BudgetUpdate(BaseModel):
    category: str
    amount: float

@app.get("/api/budget")
def get_budgets(user: str = Depends(get_current_user)):
    file_path = get_user_path(user, 'budgets')
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as f:
                import json
                return json.load(f)
        except:
            return {}
    return {}

@app.post("/api/budget")
def set_budget(budget: BudgetUpdate, user: str = Depends(get_current_user)):
    try:
        file_path = get_user_path(user, 'budgets')
        budgets = {}
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                import json
                try:
                    budgets = json.load(f)
                except:
                    pass
        
        budgets[budget.category] = budget.amount
        
        with open(file_path, 'w') as f:
            import json
            json.dump(budgets, f)
            
        return {"status": "success", "budgets": budgets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Analytics ---
@app.get("/api/analytics")
def get_analytics(period: str = 'monthly', user: str = Depends(get_current_user)):
    try:
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
             return []

        df = pd.read_csv(file_path)
        # Ensure date is datetime
        df['date'] = pd.to_datetime(df['date'])
        
        # Filter only expenses (amount < 0)
        df_exp = df[df['amount'] < 0].copy()
        df_exp['amount'] = df_exp['amount'].abs()
        
        aggregated_data = {}
        
        if period == 'weekly':
            # Resample by Week 'W'
            # We need to set date as index
            df_exp.set_index('date', inplace=True)
            weekly = df_exp['amount'].resample('W').sum()
            # Take last 12 weeks
            weekly = weekly.tail(12)
            for date, amt in weekly.items():
                aggregated_data[date.strftime('%d %b')] = round(amt, 2)
                
        elif period == 'yearly':
            # Resample by Year 'Y'
            df_exp.set_index('date', inplace=True)
            yearly = df_exp['amount'].resample('YE').sum()
            # Take last 5 years
            yearly = yearly.tail(5)
            for date, amt in yearly.items():
                aggregated_data[date.strftime('%Y')] = round(amt, 2)
                
        else: # Default: Monthly
            # Resample by Month 'M'
            df_exp.set_index('date', inplace=True)
            monthly = df_exp['amount'].resample('ME').sum()
            # Take last 12 months
            monthly = monthly.tail(12)
            for date, amt in monthly.items():
                aggregated_data[date.strftime('%b %Y')] = round(amt, 2)
        
        # Convert to list format for Recharts
        result = [{"name": k, "amount": v} for k, v in aggregated_data.items()]
        return result

    except Exception as e:
        print(f"Analytics error: {e}")
        # Return mock if file not found or error
        if period == 'weekly':
            return [{"name": "Week 1", "amount": 200}, {"name": "Week 2", "amount": 350}]
        return []

# --- Security Features ---

@app.get("/api/fraud-check")
def fraud_check(user: str = Depends(get_current_user)):
    try:
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
             return []
        
        ensure_transaction_schema(file_path)
        df = pd.read_csv(file_path)
        
        # Filter out resolved transactions
        if 'is_resolved' in df.columns:
             df = df[df['is_resolved'] != True] # Handle both boolean True and string "True" just in case, or just bool if consistent
             # Better: ensure bool type
             # df['is_resolved'] = df['is_resolved'].fillna(False).astype(bool)
             # df = df[~df['is_resolved']]
        
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
def resolve_fraud(request: ResolveRequest, user: str = Depends(get_current_user)):
    try:
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Transactions file not found")
        
        ensure_transaction_schema(file_path)
        df = pd.read_csv(file_path)
        
        if 'id' not in df.columns:
             raise HTTPException(status_code=500, detail="Transaction schema invalid")
        
        # Find and update
        if request.transaction_id in df['id'].values:
            df.loc[df['id'] == request.transaction_id, 'is_resolved'] = True
            df.to_csv(file_path, index=False)
            return {"status": "success", "message": "Transaction marked as resolved"}
        else:
            raise HTTPException(status_code=404, detail="Transaction ID not found")
            
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
def generate_pdf_report(user: str = Depends(get_current_user), start_date: str = None, end_date: str = None):
    try:
        # Gather Data
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="No data")
        
        full_df = pd.read_csv(file_path)
        
        # Filter Data
        df = filter_df_by_date(full_df, start_date, end_date)
        
        if df.empty:
             raise HTTPException(status_code=400, detail="No transactions in this period")
        
        # Re-calc stats based on filtered data
        total_income = df[df['amount'] > 0]['amount'].sum()
        total_expense = df[df['amount'] < 0]['amount'].sum()
        balance = total_income + total_expense
        stats = {"income": total_income, "expense": total_expense, "balance": balance}
        
        # Health score (mock recal or use global) - Let's use global for simplicity but updated balance
        health = get_health_score(user) 
        
        # Fraud check on filtered data
        fraud = [] 
        # Always run fraud check on the selected data (filtered or all)
        if 'anomaly' in models and not df.empty:
             try:
                 df_features = df.copy()
                 # 1. Re-create features needed for model (Simplified for report speed)
                 # Note: Ideally this code is shared with /api/fraud-check
                 df_features['category_mean'] = df_features.groupby('category')['amount'].transform('mean')
                 df_features['category_std'] = df_features.groupby('category')['amount'].transform('std').fillna(1.0)
                 df_features['amount_zscore'] = (df_features['amount'] - df_features['category_mean']) / df_features['category_std']
                 
                 df_features['date'] = pd.to_datetime(df_features['date'])
                 df_features['is_weekend'] = df_features['date'].dt.dayofweek.isin([5, 6]).astype(int)
                 df_features['category_code'] = df_features['category'].astype('category').cat.codes
                 
                 # 4. Round Number
                 df_features['is_round'] = (df_features['amount'] % 100 == 0).astype(int)

                 features = ['amount', 'amount_zscore', 'is_weekend', 'category_code', 'is_round']
                 X = df_features[features].fillna(0)
                 
                 anomalies_pred = models['anomaly'].predict(X)
                 fraud_df = df[anomalies_pred == -1]
                 # Filter out credits here too
                 fraud_df = fraud_df[fraud_df['amount'] < 0]
                 # Filter small amounts
                 fraud_df = fraud_df[fraud_df['amount'].abs() > 500]
                 
                 fraud = fraud_df.to_dict(orient='records')
             except Exception as ex:
                 print(f"Report fraud check failed: {ex}")
                 fraud = []

        forecast = get_forecast(days=30, user=user) # Forecast is always future
        
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
        )
        advice = generate_financial_advice("Generate a professional report summary for this period.", context)
        
        # Create PDF
        pdf = create_pdf_report(user, stats, health, fraud, top_category, forecast, advice, df)
        
        # Save temp
        report_path = f"data/{user}_report.pdf"
        pdf.output(report_path)
        
        return FileResponse(report_path, media_type='application/pdf', filename=f'Report_{start_date or "All"}.pdf')
        
    except Exception as e:
        print(f"PDF Gen error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/statement/pdf")
def generate_statement_pdf(user: str = Depends(get_current_user), start_date: str = None, end_date: str = None):
    try:
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="No data")
        
        full_df = pd.read_csv(file_path)
        df = filter_df_by_date(full_df, start_date, end_date)
        
        if df.empty:
             raise HTTPException(status_code=400, detail="No transactions in this period")
             
        # Sort by date
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date', ascending=False)
        
        pdf = create_statement_pdf(user, df, start_date or "Start", end_date or "Now")
        
        path = f"data/{user}_statement.pdf"
        pdf.output(path)
        
        return FileResponse(path, media_type='application/pdf', filename=f'Statement_{start_date or "All"}.pdf')
        
    except Exception as e:
        print(f"Statement Gen error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/report")
def generate_report(user: str = Depends(get_current_user)):
    try:
        # Aggregate all data for a comprehensive report
        stats = get_stats(user)
        health = get_health_score(user)
        fraud = fraud_check(user)
        forecast = get_forecast(days=30, user=user)
        
        # Get Top Spending Category
        file_path = get_user_path(user, 'transactions')
        top_category = "None"
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            if not df.empty:
                cat_spend = df[df['amount'] < 0].groupby('category')['amount'].sum().abs()
                if not cat_spend.empty:
                    top_category = f"{cat_spend.idxmax()} (₹{cat_spend.max():.2f})"
        
        report = {
            "generated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "user": user,
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

# --- FinanceIQ Features ---

@app.get("/api/health")
def get_health_score(user: str = Depends(get_current_user)):
    try:
        file_path = get_user_path(user, 'transactions')
        if not os.path.exists(file_path):
             return {"score": 0, "status": "New", "savings_rate": 0, "budget_score": 0}

        df = pd.read_csv(file_path)
        if df.empty:
             return {"score": 0, "status": "New", "savings_rate": 0, "budget_score": 0}

        total_income = df[df['category'] == 'Income']['amount'].sum()
        total_expense = df[df['category'] != 'Income']['amount'].sum()
        
        if total_income == 0:
            savings_rate = 0
        else:
            savings_rate = (total_income + total_expense) / total_income # Expense is negative
            
        # 1. Savings Score (50pts) - Target > 20% savings
        savings_score = min(max(savings_rate / 0.20, 0), 1) * 50
        
        # 2. Budget Adherence (50pts)
        # Check budgets
        budget_score = 50
        budget_file = get_user_path(user, 'budgets')

        if os.path.exists(budget_file):
             with open(budget_file, 'r') as f:
                import json
                budgets = json.load(f)
                
                # Calculate current spending per category
                current_month_spending = {} 
                # Let's filter to current month
                df['date'] = pd.to_datetime(df['date'])
                current_month = pd.Timestamp.now().month
                df_curr = df[df['date'].dt.month == current_month]
                
                for cat, limit in budgets.items():
                    spent = df_curr[(df_curr['category'] == cat) & (df_curr['amount'] < 0)]['amount'].sum()
                    spent = abs(spent)
                    if spent > limit:
                        budget_score -= 10 # Deduct 10 pts per violation
                
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
        print(f"Health score error: {e}")
        return {"score": 75, "status": "Good", "savings_rate": 15, "budget_score": 40}

class SimulationRequest(BaseModel):
    amount: float
    category: str

@app.post("/api/simulate")
def simulate_transaction(req: SimulationRequest, user: str = Depends(get_current_user)):
    try:
        # Get current status
        stats = get_stats(user)
        current_balance = stats['balance']
        
        # Calculate new balance
        # Amount sent is usually positive price, so we subtract
        new_balance = current_balance - abs(req.amount)
        
        # Check Budget
        budget_alert = "Safe"
        budget_file = get_user_path(user, 'budgets')

        if os.path.exists(budget_file):
            with open(budget_file, 'r') as f:
                import json
                budgets = json.load(f)
                limit = budgets.get(req.category, 0)
                if limit > 0:
                     # Get current spent
                     file_path = get_user_path(user, 'transactions')
                     df = pd.read_csv(file_path)
                     df['date'] = pd.to_datetime(df['date'])
                     current_month = pd.Timestamp.now().month
                     spent = df[(df['category'] == req.category) & (df['date'].dt.month == current_month) & (df['amount'] < 0)]['amount'].sum()
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
async def upload_file(file: UploadFile = File(...), user: str = Depends(get_current_user)):
    try:
        content = await file.read()
        
        # 1. Normalize
        df_new = normalize_csv(content, filename=file.filename)
        if df_new.empty:
            raise HTTPException(status_code=400, detail="Could not parse CSV/Excel format.")
            
        # 2. Enrich (Predict Categories)
        if 'classifier' in models:
            # We predict categories based on description
            # Vectorizer is part of the pipeline, so we just pass text
            descriptions = df_new['description'].astype(str)
            predicted_cats = models['classifier'].predict(descriptions)
            df_new['category'] = predicted_cats
        else:
            df_new['category'] = 'Uncategorized' # Fallback
            
        # 3. Save / Merge
        # For Hackathon, we OVERWRITE the current data to show the 'New' user state
        # In prod, we would append to DB
        file_path = get_user_path(user, 'transactions')
        df_new.to_csv(file_path, index=False)
        
        return {
            "status": "success", 
            "message": f"Processed {len(df_new)} transactions.",
            "preview": df_new.head(5).to_dict(orient='records')
        }
            
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

