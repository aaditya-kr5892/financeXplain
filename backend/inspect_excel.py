import pandas as pd

# Read the Excel file
df = pd.read_excel('PNBONE_STMT_XX3332_21012026.cs(5).xlsx')

print("Searching for header row with Date, Withdrawal, Deposit columns...")
print("=" * 80)

# Check first 30 rows for potential headers
for i in range(min(30, len(df))):
    row_values = [str(val) for val in df.iloc[i].values]
    row_lower = [str(val).lower() for val in row_values]
    
    has_date = any('date' in val for val in row_lower)
    has_withdrawal = any('withdrawal' in val or 'debit' in val or 'dr' in val for val in row_lower)
    has_deposit = any('deposit' in val or 'credit' in val or 'cr' in val for val in row_lower)
    
    if has_date and (has_withdrawal or has_deposit):
        print(f"\nFOUND HEADER AT ROW {i}:")
        print(f"Row values: {row_values}")
        
        # Re-read with correct header
        df_correct = pd.read_excel('PNBONE_STMT_XX3332_21012026.cs(5).xlsx', header=i)
        
        print(f"\nCOLUMNS AFTER CORRECT HEADER:")
        print(df_correct.columns.tolist())
        
        print(f"\nFIRST 10 DATA ROWS:")
        print(df_correct.head(10))
        
        print(f"\nSAMPLE WITHDRAWAL/DEPOSIT VALUES:")
        for col in df_correct.columns:
            col_lower = str(col).lower()
            if 'withdrawal' in col_lower or 'deposit' in col_lower or 'debit' in col_lower or 'credit' in col_lower:
                print(f"\nColumn '{col}':")
                print(df_correct[col].head(15))
                print(f"Data type: {df_correct[col].dtype}")
                print(f"Non-null count: {df_correct[col].notna().sum()}")
        
        break
