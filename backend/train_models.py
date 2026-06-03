import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, mean_absolute_error

def train_classification_model(df):
    print("Training Classification Model...")
    # Features: Description -> Category
    X = df['description']
    y = df['category']
    
    # Simple pipeline: TF-IDF + Random Forest
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english')),
        ('clf', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    pipeline.fit(X, y)
    
    with open('models/classifier.pkl', 'wb') as f:
        pickle.dump(pipeline, f)
    print("Classification Model Saved.")

def train_forecasting_model(df):
    print("Training Forecasting Model...")
    # Aggregate daily spending
    daily_df = df.groupby('date')['amount'].sum().reset_index()
    daily_df['date'] = pd.to_datetime(daily_df['date'])
    daily_df = daily_df.sort_values('date')
    
    # Feature Engineering for Time Series
    # Predict next day based on last 7 days average and day of month/week
    daily_df['day_of_week'] = daily_df['date'].dt.dayofweek
    daily_df['day_of_month'] = daily_df['date'].dt.day
    daily_df['month'] = daily_df['date'].dt.month
    
    # Lag features
    for lag in [1, 7, 30]:
        daily_df[f'lag_{lag}'] = daily_df['amount'].shift(lag)
        
    daily_df = daily_df.dropna()
    
    X = daily_df[['day_of_week', 'day_of_month', 'month', 'lag_1', 'lag_7', 'lag_30']]
    y = daily_df['amount']
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    with open('models/forecaster.pkl', 'wb') as f:
        pickle.dump(model, f)
    print("Forecasting Model Saved.")

def train_anomaly_model(df):
    print("Training Robust Anomaly Detection Model...")
    
    # --- Feature Engineering for Fraud Detection ---
    df_features = df.copy()
    
    # 1. Amount Z-Score per Category (Detect outliers within their own context)
    # e.g., A $500 food bill is suspicious, but $500 rent is normal.
    df_features['category_mean'] = df_features.groupby('category')['amount'].transform('mean')
    df_features['category_std'] = df_features.groupby('category')['amount'].transform('std').fillna(1.0) # Avoid div/0
    df_features['amount_zscore'] = (df_features['amount'] - df_features['category_mean']) / df_features['category_std']
    
    # 2. Weekend Flag (Unusual business spending on weekends?)
    df_features['date'] = pd.to_datetime(df_features['date'])
    df_features['is_weekend'] = df_features['date'].dt.dayofweek.isin([5, 6]).astype(int)
    
    # 3. Category Encoding
    df_features['category_code'] = df_features['category'].astype('category').cat.codes
    
    # Select Features for Model
    features = ['amount', 'amount_zscore', 'is_weekend', 'category_code']
    X = df_features[features].fillna(0) # Handle NaN
    
    # Train Isolation Forest
    # contamination=0.05 implies we expect ~5% of data to be anomalous
    model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    model.fit(X)
    
    # Save Model AND Column transformer info (if needed, but simple manual FE here)
    with open('models/anomaly.pkl', 'wb') as f:
        pickle.dump(model, f)
        
    print("Robust Anomaly Model Saved.")

def main():
    # Use the specific user file for the hackathon demo
    data_file = 'data/Bihari Boy_transactions.csv'
    if not os.path.exists(data_file):
        print(f"{data_file} not found!")
        return
        
    df = pd.read_csv(data_file)
    
    os.makedirs('models', exist_ok=True)
    
    train_classification_model(df)
    train_forecasting_model(df)
    train_anomaly_model(df)
    print("All models trained successfully.")

if __name__ == "__main__":
    main()
