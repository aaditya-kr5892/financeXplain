# Quick Diagnostic for Frontend Blank Screen

## Most Common Causes:

### 1. Frontend Dev Server Not Running
**Check**: Is `npm run dev` running in the frontend directory?
**Fix**: 
```bash
cd c:\Users\thesa\OneDrive\Documents\Devhack_final\frontend
npm run dev
```

### 2. JavaScript Error in Browser Console
**Check**: Open browser DevTools (F12) → Console tab
**Look for**: Red error messages

### 3. React Component Error
**Likely culprit**: The ₹ symbol we just added might need proper encoding

## Quick Fix: Revert to $ Temporarily

If the ₹ symbol is causing issues, we can use `Rs.` instead:

**In Dashboard.jsx** (lines 71, 78, 85):
```javascript
amount={`Rs. ${stats.balance}`}
amount={`Rs. ${stats.income}`}
amount={`Rs. ${Math.abs(stats.expense)}`}
```

**In Transactions.jsx** (line 77):
```javascript
Rs. {txn.amount > 0 ? '+' : ''}{Math.abs(txn.amount).toFixed(2)}
```

## Steps to Debug:

1. **Check if frontend is running**:
   - Look for terminal with "VITE" and "Local: http://localhost:5173"
   - If not running, start it: `cd frontend && npm run dev`

2. **Open Browser Console** (F12):
   - Look for any red errors
   - Common errors:
     - "Unexpected token" → Syntax error in JSX
     - "Cannot read property" → Runtime error
     - "Failed to fetch" → Backend not running

3. **Check Backend**:
   - Should be running on http://127.0.0.1:8000
   - Test: Open http://127.0.0.1:8000/docs in browser

4. **Hard Refresh Browser**:
   - Press Ctrl+Shift+R (Windows)
   - This clears cached JavaScript

## If Still Blank:

The ₹ symbol might not be rendering correctly. Let me know the error from the browser console and I'll fix it immediately.
