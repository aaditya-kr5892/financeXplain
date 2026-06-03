import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

def generate_transactions(num_transactions=5000):
    categories = {
        'Food': ['Groceries', 'Restaurant', 'Coffee Shop', 'Fast Food'],
        'Transport': ['Uber', 'Gas Station', 'Subway', 'Flight'],
        'Utilities': ['Electric Bill', 'Water Bill', 'Internet', 'Phone Bill'],
        'Entertainment': ['Netflix', 'Cinema', 'Concert', 'Spotify'],
        'Rent': ['Monthly Rent'],
        'Income': ['Salary', 'Freelance']
    }
    
    data = []
    start_date = datetime.now() - timedelta(days=90)
    
    for _ in range(num_transactions):
        date = start_date + timedelta(days=random.randint(0, 90))
        cat_type = random.choice(list(categories.keys()))
        
        if cat_type == 'Income':
            amount = random.uniform(2000, 5000)
            desc = 'Salary Deposit'
        elif cat_type == 'Rent':
            amount = -random.uniform(1000, 1500)
            desc = 'Monthly Rent'
        else:
            amount = -random.uniform(10, 200)
            desc = random.choice(categories[cat_type])
            
        # Add some noise/anomalies
        if random.random() < 0.02 and cat_type != 'Rent' and cat_type != 'Income':
             amount = amount * 5 # High expense anomaly
             
        data.append({
            'date': date.strftime('%Y-%m-%d'),
            'amount': round(amount, 2),
            'description': desc,
            'category': cat_type
        })
        
    df = pd.DataFrame(data)
    df = df.sort_values('date')
    
    # Save to CSV
    df.to_csv('data/transactions.csv', index=False)
    print(f"Generated {num_transactions} transactions in data/transactions.csv")

if __name__ == "__main__":
    import os
    os.makedirs('data', exist_ok=True)
    generate_transactions()
