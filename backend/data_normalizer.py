import pandas as pd
import numpy as np
import io
import traceback

def normalize_csv(file_content: bytes, filename: str = "") -> pd.DataFrame:
    """
    Reads CSV or Excel and maps to: ['date', 'amount', 'description']
    Handles PNB bank statement format with Withdrawal/Deposit columns.
    """
    try:
        # --- LOADING SECTION ---
        print(f"Loading file: {filename} with size {len(file_content)} bytes")
        
        # Load the file
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            try:
                df = pd.read_excel(io.BytesIO(file_content))
                print("Excel read successful.")
            except ImportError as ie:
                print(f"CRITICAL: Missing Excel library. Run 'pip install openpyxl'. Error: {ie}")
                raise ie
        else:
            df = pd.read_csv(io.BytesIO(file_content))
        
        print(f"Initial load: {len(df)} rows, {len(df.columns)} columns")
        
        # --- FIND HEADER ROW (PNB format has metadata rows before header) ---
        header_row_idx = -1
        
        for i in range(min(30, len(df))):
            row_values = [str(val).lower() for val in df.iloc[i].values]
            
            # Look for row containing date + (withdrawal OR deposit)
            has_date = any('date' in val for val in row_values)
            has_withdrawal = any('withdrawal' in val or 'debit' in val or 'dr' in val for val in row_values)
            has_deposit = any('deposit' in val or 'credit' in val or 'cr' in val for val in row_values)
            
            if has_date and (has_withdrawal or has_deposit):
                header_row_idx = i
                print(f"Found header row at index {i}")
                break
        
        # Re-read with correct header
        if header_row_idx > 0:
            if filename.endswith('.xlsx') or filename.endswith('.xls'):
                # First, read the entire file to get the header row values
                df_temp = pd.read_excel(io.BytesIO(file_content))
                
                # Extract the actual column names from the header row
                header_values = df_temp.iloc[header_row_idx].values
                print(f"Header row values: {header_values}")
                
                # Now read the data starting AFTER the header row
                df = pd.read_excel(io.BytesIO(file_content), skiprows=header_row_idx+1, header=None)
                
                # Assign the column names we extracted
                # Filter out NaN values from header
                valid_headers = [str(h) if pd.notna(h) else f'col_{i}' for i, h in enumerate(header_values)]
                df.columns = valid_headers[:len(df.columns)]
                
                print(f"Assigned column names: {df.columns.tolist()}")
            else:
                df = pd.read_csv(io.BytesIO(file_content), skiprows=header_row_idx)
                print(f"Re-loaded CSV with skiprows={header_row_idx}")
        
        # Normalize column names
        df.columns = [str(c).lower().strip() for c in df.columns]
        print(f"Columns after normalization: {df.columns.tolist()}")
        
        # --- COLUMN MAPPING ---
        date_col = None
        desc_col = None
        withdrawal_col = None
        deposit_col = None
        
        # Find date column
        for col in df.columns:
            if 'date' in col and 'value' not in col:  # Prefer transaction date over value date
                date_col = col
                break
        if not date_col:  # Fallback to any date column
            for col in df.columns:
                if 'date' in col:
                    date_col = col
                    break
        
        # Find description column
        for col in df.columns:
            if any(keyword in col for keyword in ['narration', 'description', 'particular', 'remark', 'detail']):
                desc_col = col
                break
        
        # Find withdrawal column (Dr/Debit)
        for col in df.columns:
            # Prioritize columns with 'amount' in the name
            if 'amount' in col and any(keyword in col for keyword in ['withdrawal', 'debit', 'dr']):
                withdrawal_col = col
                print(f"Found withdrawal column: '{col}'")
                break
        
        # Fallback if no amount column found
        if not withdrawal_col:
            for col in df.columns:
                if any(keyword in col for keyword in ['withdrawal', 'debit', 'dr']):
                    withdrawal_col = col
                    print(f"Found withdrawal column (fallback): '{col}'")
                    break
        
        # Find deposit column (Cr/Credit)
        for col in df.columns:
            # Prioritize columns with 'amount' in the name
            if 'amount' in col and any(keyword in col for keyword in ['deposit', 'credit', 'cr']):
                deposit_col = col
                print(f"Found deposit column: '{col}'")
                break
        
        # Fallback if no amount column found
        if not deposit_col:
            for col in df.columns:
                # Skip description column to avoid false match
                if col != desc_col and any(keyword in col for keyword in ['deposit', 'credit', 'cr']):
                    deposit_col = col
                    print(f"Found deposit column (fallback): '{col}'")
                    break
        
        if not date_col or not desc_col:
            print(f"ERROR: Missing required columns. date_col={date_col}, desc_col={desc_col}")
            return pd.DataFrame()
        
        # --- CREATE CLEAN DATAFRAME ---
        df_clean = pd.DataFrame()
        
        # Parse date
        df_clean['date'] = pd.to_datetime(df[date_col], errors='coerce', dayfirst=True)
        
        # Parse description
        df_clean['description'] = df[desc_col].fillna('Unknown').astype(str)
        
        # --- PARSE AMOUNTS (KEY FIX) ---
        def parse_amount(value):
            """Safely parse amount from string, handling commas and NaN"""
            if pd.isna(value) or value == '' or str(value).strip() in ['nan', '-', '']:
                return 0.0
            try:
                # Remove commas and convert to float
                return float(str(value).replace(',', '').strip())
            except:
                return 0.0
        
        if withdrawal_col and deposit_col:
            print("Using Withdrawal/Deposit columns for amount calculation")
            print(f"Withdrawal column name: '{withdrawal_col}'")
            print(f"Deposit column name: '{deposit_col}'")
            
            # Show raw values before parsing
            print(f"\nRaw Withdrawal column (first 5):")
            print(df[withdrawal_col].head().tolist())
            print(f"\nRaw Deposit column (first 5):")
            print(df[deposit_col].head().tolist())
            
            # Parse withdrawal and deposit columns
            withdrawals = df[withdrawal_col].apply(parse_amount)
            deposits = df[deposit_col].apply(parse_amount)
            
            # Calculate amount: deposits are positive, withdrawals are negative
            df_clean['amount'] = deposits - withdrawals
            
            print(f"\nAfter parsing:")
            print(f"  Withdrawals (first 5): {withdrawals.head().tolist()}")
            print(f"  Deposits (first 5): {deposits.head().tolist()}")
            print(f"  Final amounts (first 5): {df_clean['amount'].head().tolist()}")
            
        else:
            # Fallback: look for single amount column
            print("WARNING: Could not find Withdrawal/Deposit columns, looking for amount column")
            amt_col = next((c for c in df.columns if 'amount' in c or 'amt' in c), None)
            if amt_col:
                df_clean['amount'] = df[amt_col].apply(parse_amount)
            else:
                print("ERROR: No amount column found")
                df_clean['amount'] = 0.0
        
        # Remove rows with invalid dates
        df_clean = df_clean.dropna(subset=['date'])
        
        # Replace any remaining NaN with 0
        df_clean = df_clean.fillna(0)
        
        print(f"Normalization complete: {len(df_clean)} valid transactions")
        print(f"Amount range: {df_clean['amount'].min()} to {df_clean['amount'].max()}")
        
        return df_clean

    except Exception as e:
        print(f"Normalization failed: {e}")
        traceback.print_exc()
        return pd.DataFrame()
