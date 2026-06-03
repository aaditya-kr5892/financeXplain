import pandas as pd
import numpy as np
import hashlib
import csv
import os
from datetime import datetime, timedelta
import random

# Configuration
USERNAME = "Bihari Boy"
PASSWORD = "BIHARI_123"
NUM_TRANSACTIONS = 5000
YEARS = 2
DATA_DIR = 'data'
USERS_FILE = os.path.join(DATA_DIR, 'users.csv')

# Ensure data directory exists
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# --- 1. Register User ---
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def register_user():
    # Check if user file exists, create if not
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['username', 'password_hash'])

    # Check if user exists
    user_exists = False
    with open(USERS_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['username'] == USERNAME:
                user_exists = True
                break
    
    if not user_exists:
        with open(USERS_FILE, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([USERNAME, hash_password(PASSWORD)])
        print(f"User '{USERNAME}' registered successfully.")
    else:
        print(f"User '{USERNAME}' already exists.")

# --- 2. Generate Transactions ---
def generate_transactions():
    categories = ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Other']
    income_descriptions = ['Salary', 'Freelance Project', 'Investment Dividend', 'Gift', 'Refund']
    expense_descriptions = {
        'Food': ['Grocery Store', 'Restaurant Bill', 'Cafe Coffee Day', 'Zomato Order', 'Pizza Hut'],
        'Transportation': ['Uber Ride', 'Petrol Pump', 'Train Ticket', 'Bus Fare', 'Car Maintenance'],
        'Utilities': ['Electricity Bill', 'Water Bill', 'Internet Plan', 'Mobile Recharge', 'Gas Cylinder'],
        'Entertainment': ['Netflix Subscription', 'Movie Tickets', 'Spotify Premium', 'Concert Pass', 'Video Game'],
        'Shopping': ['Amazon Order', 'Flipkart Purchase', 'Myntra Sale', 'Electronics Store', 'Clothing Mall'],
        'Healthcare': ['Pharmacy', 'Doctor Consultation', 'Lab Tests', 'Health Insurance', 'Gym Membership'],
        'Education': ['Udemy Course', 'College Fees', 'Books Cache', 'Stationery', 'Workshop Fee'],
        'Other': ['Random Purchase', 'Charity', 'Loan Repayment', 'Service Charge', 'Miscellaneous']
    }

    data = []
    end_date = datetime.now()
    start_date = end_date - timedelta(days=YEARS * 365)
    
    # Generate random dates
    date_range = end_date - start_date
    random_days = np.random.randint(0, date_range.days, NUM_TRANSACTIONS)
    
    print(f"Generating {NUM_TRANSACTIONS} transactions...")
    
    for i in range(NUM_TRANSACTIONS):
        # Random Date
        txn_date = start_date + timedelta(days=int(random_days[i]))
        date_str = txn_date.strftime('%Y-%m-%d')
        
        # Decide if Income or Expense (10% chance of Income)
        if random.random() < 0.1:
            category = 'Income'
            amount = round(random.uniform(5000, 50000), 2)
            desc = random.choice(income_descriptions)
        else:
            category = random.choice(categories)
            amount = round(random.uniform(50, 5000), 2) * -1 # Expense is negative
            desc = random.choice(expense_descriptions[category])
        
        data.append({
            'date': date_str,
            'description': desc,
            'amount': amount,
            'category': category
        })
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Sort by date
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by='date')
    df['date'] = df['date'].dt.strftime('%Y-%m-%d')
    
    # Save to CSV
    filename = os.path.join(DATA_DIR, f"{USERNAME}_transactions.csv")
    df.to_csv(filename, index=False)
    print(f"Successfully saved transactions to {filename}")

if __name__ == "__main__":
    register_user()
    generate_transactions()
