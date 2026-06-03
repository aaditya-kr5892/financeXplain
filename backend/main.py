from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import pickle
import os
from typing import List, Optional
from llm_service import generate_financial_advice

app = FastAPI(title="Fintech Dashboard API")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Data Endpoints
@app.get("/api/transactions")
def get_transactions():
    try:
        df = pd.read_csv('data/transactions.csv')
        # Return last 100 transactions for UI
        return df.tail(100).to_dict(orient='records')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_stats():
    try:
        df = pd.read_csv('data/transactions.csv')
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
def ask_advisor(request: AdviceRequest):
    try:
        # Read actual transaction data
        df = pd.read_csv('data/transactions.csv')
        
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
def get_forecast():
    # Placeholder using model
    try:
        if 'forecaster' not in models:
            return {"forecast_spending": 0, "status": "Model not loaded"}
            
        # Mock features (would come from live data)
        features = [[2, 15, 5, 50, 60, 200]] 
        prediction = models['forecaster'].predict(features)[0]
        return {"forecast_spending": round(prediction, 2)}
    except Exception as e:
        return {"forecast_spending": 150.00}

# --- Manual Transaction Entry ---
class TransactionEntry(BaseModel):
    date: str
    description: str
    amount: float
    category: Optional[str] = None

@app.post("/api/transaction")
def add_transaction(transaction: TransactionEntry):
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
        
        # Read existing transactions
        try:
            df = pd.read_csv('data/transactions.csv')
        except FileNotFoundError:
            # Create new dataframe if file doesn't exist
            df = pd.DataFrame(columns=['date', 'description', 'amount', 'category'])
        
        # Append new transaction
        df = pd.concat([df, pd.DataFrame([new_transaction])], ignore_index=True)
        
        # Save back to CSV
        df.to_csv('data/transactions.csv', index=False)
        
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
BUDGET_FILE = 'data/budgets.json'

class BudgetUpdate(BaseModel):
    category: str
    amount: float

@app.get("/api/budget")
def get_budgets():
    if os.path.exists(BUDGET_FILE):
        try:
            with open(BUDGET_FILE, 'r') as f:
                import json
                return json.load(f)
        except:
            return {}
    return {}

@app.post("/api/budget")
def set_budget(budget: BudgetUpdate):
    try:
        budgets = {}
        if os.path.exists(BUDGET_FILE):
            with open(BUDGET_FILE, 'r') as f:
                import json
                try:
                    budgets = json.load(f)
                except:
                    pass
        
        budgets[budget.category] = budget.amount
        
        with open(BUDGET_FILE, 'w') as f:
            import json
            json.dump(budgets, f)
            
        return {"status": "success", "budgets": budgets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Analytics ---
@app.get("/api/analytics")
def get_analytics(period: str = 'monthly'):
    try:
        df = pd.read_csv('data/transactions.csv')
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

# --- File Upload & Pipeline ---
from fastapi import UploadFile, File
from data_normalizer import normalize_csv

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
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
        df_new.to_csv('data/transactions.csv', index=False)
        
        # 4. Re-train (Optional? Maybe just re-load stats)
        # For speed, we don't re-train immediately, but we could trigger it.
        # Let's just return success
        
        return {
            "status": "success", 
            "message": f"Processed {len(df_new)} transactions.",
            "preview": df_new.head(5).to_dict(orient='records')
        }
            
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
