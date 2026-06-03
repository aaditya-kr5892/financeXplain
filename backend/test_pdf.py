import sys
import os
sys.path.append(os.getcwd())

from reports import create_pdf_report
import pandas as pd
from datetime import datetime

# Mock Data
user = "Test User"
stats = {"balance": 15000, "income": 50000, "expense": 35000}
health = {"score": 85, "status": "Excellent", "savings_rate": 30}
anomalies = [{"date": "2023-10-01", "description": "Suspicious Purchase", "amount": -5000, "category": "Shopping"}]
top_category = "Food (₹12000)"
forecast = [{"date": "2023-10-02", "predicted_balance": 15100, "upper_bound": 15200, "lower_bound": 15000}]
advice = "This is a test summary from the AI."

# Create Mock DataFrame
data = {
    'date': ['2023-09-01', '2023-09-02'],
    'description': ['Salary', 'Rent'],
    'amount': [50000, -20000],
    'category': ['Income', 'Rent']
}
df = pd.DataFrame(data)

print("Attempting to create PDF...")
try:
    pdf = create_pdf_report(user, stats, health, anomalies, top_category, forecast, advice, df)
    pdf.output("test_report.pdf")
    print("PDF created successfully: test_report.pdf")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
