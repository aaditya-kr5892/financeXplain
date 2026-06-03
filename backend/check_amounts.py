import pandas as pd
import io

# Simulate reading the Excel file the same way data_normalizer does
print("Reading Excel file to check Withdrawal/Deposit columns...")

# You'll need to upload the file first, but let's check the current transactions.csv
df = pd.read_csv('data/transactions.csv')

print("\nFirst 10 transactions:")
print(df[['date', 'description', 'amount']].head(10))

print("\nTransactions with amount = 0.0:")
zero_amounts = df[df['amount'] == 0.0]
print(f"Found {len(zero_amounts)} transactions with 0.0 amount")
print(zero_amounts[['date', 'description', 'amount']].head(10))

print("\nAmount distribution:")
print(f"Positive amounts (credits): {len(df[df['amount'] > 0])}")
print(f"Negative amounts (debits): {len(df[df['amount'] < 0])}")
print(f"Zero amounts: {len(df[df['amount'] == 0.0])}")

print("\nSample positive amounts (should be credits):")
print(df[df['amount'] > 0][['date', 'description', 'amount']].head(5))
