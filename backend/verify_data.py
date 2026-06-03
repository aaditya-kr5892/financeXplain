import pandas as pd

# Read the transactions
df = pd.read_csv('data/transactions.csv')

print(f'Total transactions: {len(df)}')
print(f'\nSample transactions:')
print(df.head(10))

# Calculate stats
total_income = df[df['amount'] > 0]['amount'].sum()
total_expense = df[df['amount'] < 0]['amount'].sum()
balance = total_income + total_expense

print(f'\n=== FINANCIAL SUMMARY ===')
print(f'Total Income: ${total_income:.2f}')
print(f'Total Expenses: ${abs(total_expense):.2f}')
print(f'Balance: ${balance:.2f}')

print(f'\n=== TOP SPENDING CATEGORIES ===')
category_spending = df[df['amount'] < 0].groupby('category')['amount'].sum().abs().sort_values(ascending=False)
print(category_spending.head())

print(f'\n=== CATEGORY DISTRIBUTION ===')
print(df['category'].value_counts())
