import sys
import os
sys.path.append(os.getcwd())

from llm_service import generate_financial_advice

print("Testing LLM Service...")
question = "How is my financial health?"
context = "Current Balance: 15000\nTotal Income: 50000\nTotal Expenses: 35000"

response = generate_financial_advice(question, context)
print("\n--- RESPONSE ---")
print(response)
print("\n----------------")
