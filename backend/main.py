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
- Current Balance: ${balance:.2f}
- Total Income: ${total_income:.2f}
- Total Expenses: ${abs(total_expense):.2f}

TOP SPENDING CATEGORIES:
{chr(10).join([f"- {cat}: ${amt:.2f}" for cat, amt in top_categories.items()])}

RECENT TRANSACTIONS (Last 10):
{chr(10).join([f"- {t['date']}: {t['description'][:50]} - ${t['amount']:.2f} ({t['category']})" for t in recent_trans])}
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
