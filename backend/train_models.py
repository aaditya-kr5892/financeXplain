import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models import Transaction

# Ensure models directory exists
os.makedirs('models', exist_ok=True)

def get_data_from_db():
    print("Fetching data from database...")
    with Session(engine) as session:
        transactions = session.query(Transaction).all()
        if not transactions:
            print("No transactions found in DB!")
            return pd.DataFrame()
            
        data = [t.__dict__ for t in transactions]
        df = pd.DataFrame(data)
        
        # Cleanup sqlalchemy state
        if '_sa_instance_state' in df.columns:
            del df['_sa_instance_state']
            
        return df

def train_models():
    df = get_data_from_db()
    
    if df.empty:
        print("Skipping training due to empty data.")
        # Create dummy models dictionary to prevent crashes
        dummy_models = {}
        with open('models/financial_models.pkl', 'wb') as f:
            pickle.dump(dummy_models, f)
        return

    models = {}

    # --- 1. Classification Model ---
    try:
        print("Training Classification Model...")
        # Needs description and category
        df_clf = df.dropna(subset=['description', 'category'])
        if not df_clf.empty:
            X = df_clf['description']
            y = df_clf['category']
            
            pipeline = Pipeline([
                ('tfidf', TfidfVectorizer(stop_words='english')),
                ('clf', RandomForestClassifier(n_estimators=100, random_state=42))
            ])
            pipeline.fit(X, y)
            models['classifier'] = pipeline
            print("Classifier trained.")
    except Exception as e:
        print(f"Classifier training failed: {e}")

    # --- 2. Forecasting Model ---
    try:
        print("Training Forecasting Model...")
        df_fc = df.copy()
        df_fc['date'] = pd.to_datetime(df_fc['date'])
        daily_df = df_fc.groupby('date')['amount'].sum().reset_index()
        daily_df = daily_df.sort_values('date')
        
        # Feature Eng
        daily_df['day_of_week'] = daily_df['date'].dt.dayofweek
        daily_df['day_of_month'] = daily_df['date'].dt.day
        daily_df['month'] = daily_df['date'].dt.month
        
        for lag in [1, 7, 30]:
            daily_df[f'lag_{lag}'] = daily_df['amount'].shift(lag)
            
        daily_df = daily_df.dropna()
        
        if len(daily_df) > 10: # Min samples check
            X = daily_df[['day_of_week', 'day_of_month', 'month', 'lag_1', 'lag_7', 'lag_30']]
            y = daily_df['amount']
            
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            model.fit(X, y)
            models['forecaster'] = model
            print("Forecaster trained.")
        else:
            print("Not enough data for forecasting.")
    except Exception as e:
        print(f"Forecaster training failed: {e}")

    # --- 3. Anomaly Model ---
    try:
        print("Training Anomaly Model...")
        df_anom = df.copy()
        
        # Feature Engineering
        df_anom['category_mean'] = df_anom.groupby('category')['amount'].transform('mean')
        df_anom['category_std'] = df_anom.groupby('category')['amount'].transform('std').fillna(1.0)
        df_anom['amount_zscore'] = (df_anom['amount'] - df_anom['category_mean']) / df_anom['category_std']
        
        df_anom['date'] = pd.to_datetime(df_anom['date'])
        df_anom['is_weekend'] = df_anom['date'].dt.dayofweek.isin([5, 6]).astype(int)
        df_anom['category_code'] = df_anom['category'].astype('category').cat.codes
        df_anom['is_round'] = (df_anom['amount'] % 100 == 0).astype(int)
        
        features = ['amount', 'amount_zscore', 'is_weekend', 'category_code', 'is_round']
        X = df_anom[features].fillna(0)
        
        if len(X) > 5:
            model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
            model.fit(X)
            models['anomaly'] = model
            print("Anomaly model trained.")
        else:
            print("Not enough data for anomaly detection.")
    except Exception as e:
        print(f"Anomaly training failed: {e}")

    # --- Save Combined Models ---
    with open('models/financial_models.pkl', 'wb') as f:
        pickle.dump(models, f)
    print("All models consolidated and saved to 'models/financial_models.pkl'.")

if __name__ == "__main__":
    train_models()
