import pandas as pd
import numpy as np
import io
import traceback

def normalize_csv(file_content: bytes, filename: str = "") -> pd.DataFrame:
    """
    Reads CSV or Excel and maps to: ['date', 'amount', 'description']
    """
    try:
        # --- LOADING SECTION ---
        print(f"Loading file: {filename} with size {len(file_content)} bytes")
        
        try:
            if filename.endswith('.xlsx') or filename.endswith('.xls'):
                try:
                    df = pd.read_excel(io.BytesIO(file_content))
                    print("Excel read successful.")
                except ImportError as ie:
                    print(f"CRITICAL: Missing Excel library. Run 'pip install openpyxl'. Error: {ie}")
                    raise ie
            else:
                df = pd.read_csv(io.BytesIO(file_content))
        except Exception as e:
            print(f"Initial load failed (trying CSV fallback): {e}")
            try:
                df = pd.read_csv(io.BytesIO(file_content))
            except:
                return pd.DataFrame()

        # --- PNB / Bank Format Handling ---
        header_row_idx = -1
        # Defensive check: ensure df is not empty
        if not df.empty:
            for i, row in df.head(20).iterrows():
                # Force convert row values to string safely
                row_str = [str(val).lower() for val in row.values]
                
                # Safer checks using str(x) to avoid 'float' errors
                has_date = any('date' in str(x) for x in row_str)
                has_amt = any('amount' in str(x) or 'balance' in str(x) or 'withdrawal' in str(x) for x in row_str)
                
                if has_date and has_amt:
                    header_row_idx = i
                    break
        
        if header_row_idx != -1:
            if filename.endswith('.xlsx') or filename.endswith('.xls'):
                df = pd.read_excel(io.BytesIO(file_content), header=header_row_idx+1)
            else:
                 new_header = df.iloc[header_row_idx]
                 df = df[header_row_idx+1:]
                 df.columns = new_header
        
        # Normalize Headers
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        column_map = {}
        
        # 1. Date
        date_keywords = ['transaction date', 'txn date', 'date']
        for col in df.columns:
            if any(k in str(col) for k in date_keywords):
                column_map[col] = 'date'
                break
                
        # 2. Description
        desc_keywords = ['narration', 'remarks', 'description', 'details']
        for col in df.columns:
            if any(k in str(col) for k in desc_keywords):
                column_map[col] = 'description'
                break

        # 3. Amount
        withdrawal_col = next((c for c in df.columns if 'withdrawal' in str(c) or 'debit' in str(c)), None)
        deposit_col = next((c for c in df.columns if 'deposit' in str(c) or 'credit' in str(c)), None)
        
        df_clean = pd.DataFrame()
        
        # Fallback for Missing Columns
        user_date_col = next((k for k,v in column_map.items() if v=='date'), None)
        user_desc_col = next((k for k,v in column_map.items() if v=='description'), None)

        if not user_date_col or not user_desc_col:
            print(f"Missing columns. Found: {df.columns.tolist()}")
            # Last ditch effort: Assume col 0 is date, col 1 is desc if nothing found
            if len(df.columns) >= 2:
                print("Using default column index 0 and 1 as fallback.")
                df_clean['date'] = pd.to_datetime(df.iloc[:, 0], errors='coerce')
                df_clean['description'] = df.iloc[:, 1].fillna('Unknown')
                # Try to find an amount column by type?
                # No, just look for one with 'amt'
                amt_col = next((c for c in df.columns if 'amt' in str(c)), None)
                if amt_col:
                     df_clean['amount'] = pd.to_numeric(df[amt_col].astype(str).str.replace(',',''), errors='coerce').fillna(0)
                else:
                     df_clean['amount'] = 0.0
                return df_clean.dropna(subset=['date'])
            return pd.DataFrame()
            
        df_clean['date'] = pd.to_datetime(df[user_date_col], errors='coerce', dayfirst=True)
        df_clean['description'] = df[user_desc_col].fillna('Unknown')
        
        if withdrawal_col and deposit_col:
            def calc_amount(row):
                w = str(row[withdrawal_col]).replace(',','')
                d = str(row[deposit_col]).replace(',','')
                try: w = float(w) 
                except: w = 0.0
                try: d = float(d) 
                except: d = 0.0
                
                if d > 0: return d
                return -w if w > 0 else 0.0
            
            df_clean['amount'] = df.apply(calc_amount, axis=1)
        else:
             amt_col = next((c for c in df.columns if 'amount' in str(c) or 'txn amt' in str(c)), None)
             if amt_col:
                 df_clean['amount'] = df[amt_col].astype(str).str.replace(',','').astype(float)
             else:
                 df_clean['amount'] = 0.0
        
        # Replace all NaN values with 0 to prevent JSON serialization errors
        df_clean = df_clean.fillna(0)
        return df_clean.dropna(subset=['date'])

    except Exception as e:
        print(f"Normalization failed: {e}")
        traceback.print_exc()
        return pd.DataFrame()
