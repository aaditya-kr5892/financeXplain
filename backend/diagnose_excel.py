import pandas as pd

# Read the Excel file and inspect row 17
df = pd.read_excel('PNBONE_STMT_XX3332_21012026.cs(5).xlsx')

print("=" * 80)
print("INSPECTING ROW 17 (the header row we found)")
print("=" * 80)

print("\nRow 17 values:")
print(df.iloc[17].tolist())

print("\n" + "=" * 80)
print("TRYING DIFFERENT APPROACHES:")
print("=" * 80)

# Try 1: Read with skiprows=17
print("\n1. Using skiprows=17:")
df1 = pd.read_excel('PNBONE_STMT_XX3332_21012026.cs(5).xlsx', skiprows=17)
print(f"Columns: {df1.columns.tolist()}")
print(f"First row: {df1.iloc[0].tolist()}")

# Try 2: Read with header=17
print("\n2. Using header=17:")
df2 = pd.read_excel('PNBONE_STMT_XX3332_21012026.cs(5).xlsx', header=17)
print(f"Columns: {df2.columns.tolist()}")
print(f"First row: {df2.iloc[0].tolist()}")

# Try 3: Read rows 15-20 to see the structure
print("\n3. Rows 15-20 (to see header area):")
for i in range(15, min(21, len(df))):
    print(f"Row {i}: {df.iloc[i].tolist()}")

# Try 4: Find the actual header by looking for specific keywords
print("\n4. Searching for header with 'Date', 'Withdrawal', 'Deposit':")
for i in range(30):
    row_str = ' '.join([str(val).lower() for val in df.iloc[i].values if pd.notna(val)])
    if 'date' in row_str and ('withdrawal' in row_str or 'deposit' in row_str):
        print(f"Found at row {i}: {df.iloc[i].tolist()}")
        
        # Try reading with this row as header
        print(f"\nTrying with header={i}:")
        df_test = pd.read_excel('PNBONE_STMT_XX3332_21012026.cs(5).xlsx', header=i)
        print(f"Columns: {df_test.columns.tolist()[:8]}")
        print(f"First data row: {df_test.iloc[0].tolist()[:8]}")
        break
