import pandas as pd
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, Transaction, Budget
import csv
import uuid
from datetime import datetime

# Create Tables
Base.metadata.create_all(bind=engine)

def migrate_data():
    db = SessionLocal()
    data_dir = 'data'
    
    print("Starting migration...")
    
    # 1. Migrate Users
    users_file = os.path.join(data_dir, 'users.csv')
    if os.path.exists(users_file):
        df_users = pd.read_csv(users_file)
        for _, row in df_users.iterrows():
            # Check if user exists
            existing_user = db.query(User).filter(User.username == row['username']).first()
            if not existing_user:
                print(f"Migrating user: {row['username']}")
                new_user = User(
                    username=row['username'],
                    password_hash=row['password_hash']
                )
                db.add(new_user)
        db.commit()
    
    # 2. Migrate Transactions
    # Re-query users to get IDs
    users = db.query(User).all()
    
    for user in users:
        print(f"Migrating transactions for {user.username}...")
        trans_file = os.path.join(data_dir, f"{user.username}_transactions.csv")
        
        if os.path.exists(trans_file):
            # Read CSV
            df_trans = pd.read_csv(trans_file)
            
            # Add 'id' and 'is_resolved' if missing (from before we ran ensure_schema)
            # But ensure_schema logic is usually run on API access. 
            # We'll just handle it safely here.
            
            for _, row in df_trans.iterrows():
                # Generate unique ID if missing in CSV (older data)
                txn_id = row.get('id')
                if pd.isna(txn_id) or not txn_id:
                     txn_id = str(uuid.uuid4())
                     
                is_resolved = row.get('is_resolved')
                if pd.isna(is_resolved):
                    is_resolved = False
                else:
                    is_resolved = bool(is_resolved) # Convert string 'True'/'False' if needed
                
                # Check for duplicate by ID?
                # Or just by content hash? 
                # For simplicity, we assume empty DB or unique IDs.
                existing_txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
                if not existing_txn:
                    new_txn = Transaction(
                        id=txn_id,
                        user_id=user.id,
                        date=datetime.strptime(row['date'], '%Y-%m-%d').date(),
                        description=row['description'],
                        amount=float(row['amount']),
                        category=row['category'],
                        is_resolved=is_resolved
                    )
                    db.add(new_txn)
            db.commit()

        # 3. Migrate Budgets
        budget_file = os.path.join(data_dir, f"{user.username}_budgets.json")
        if os.path.exists(budget_file):
            print(f"Migrating budgets for {user.username}...")
            import json
            with open(budget_file, 'r') as f:
                try:
                    budgets = json.load(f)
                    for cat, amt in budgets.items():
                        # Check exist
                        existing_budget = db.query(Budget).filter(
                            Budget.user_id == user.id,
                            Budget.category == cat
                        ).first()
                        
                        if not existing_budget:
                            new_budget = Budget(
                                user_id=user.id,
                                category=cat,
                                amount=float(amt)
                            )
                            db.add(new_budget)
                        else:
                            existing_budget.amount = float(amt) # update
                    db.commit()
                except Exception as e:
                    print(f"Error reading budget json: {e}")

    db.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate_data()
