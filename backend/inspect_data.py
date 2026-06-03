import pandas as pd

def inspect_excel():
    file_path = 'backend/PNBONE_STMT_XX3332_21012026.cs(5).xlsx'
    try:
        # Read first few rows to see header structure (often banks have meta data in top rows)
        df = pd.read_excel(file_path)
        print("First 10 rows of raw data:")
        print(df.head(10))
        
        print("\nColumns found:")
        print(df.columns.tolist())
    except Exception as e:
        print(f"Error reading excel: {e}")

if __name__ == "__main__":
    inspect_excel()
