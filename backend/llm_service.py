import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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",
    default_headers={
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Fintech Dashboard Hackathon",
    }
)

def generate_financial_advice(user_question: str, financial_data: str = "") -> str:
    """
    Generates financial advice using OpenRouter LLM with multi-model fallback.
    
    Args:
        user_question: The user's specific question
        financial_data: Rich context about the user's financial situation
    """
    prompt = f"""
You are an expert financial advisor AI for a Fintech Dashboard.

{financial_data}

USER QUESTION:
"{user_question}"

INSTRUCTIONS:
1. Analyze the financial data provided above
2. Answer the user's question directly and concisely
3. Use specific numbers from the data to justify your answer
4. Provide actionable advice (max 4 sentences)
5. Be encouraging and helpful
"""

    models_to_try = [
        "deepseek/deepseek-r1-distill-llama-70b:free",
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.2-11b-vision-instruct:free",
    ]

    # 1. Try API Models
    for model in models_to_try:
        try:
            print(f"Attempting with model: {model}")
            completion = client.chat.completions.create(
                model=model, 
                messages=[
                    {"role": "system", "content": "You are a helpful financial assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Model {model} failed: {e}")
            continue # Try next model

    # 2. Local Fallback (Essential if API is down)
    print("CRITICAL: All APIs failed. Engaging Local Rule Engine.")
    
    # Try to extract data from financial_data if available
    balance = "your current balance"
    food_spending = "Food expenses"
    
    if financial_data:
        # Extract balance if present
        if "Current Balance:" in financial_data:
            balance_line = [line for line in financial_data.split('\n') if 'Current Balance:' in line]
            if balance_line:
                balance = balance_line[0].split(':')[1].strip()
        
        # Extract food spending if present
        if "Food" in financial_data or "food" in financial_data:
            food_lines = [line for line in financial_data.split('\n') if 'Food' in line or 'food' in line]
            if food_lines:
                food_spending = food_lines[0].strip()
    
    # A simple Rule-Based "AI" for the demo
    q = user_question.lower()
    
    if "balance" in q:
        return f"Based on your data, {balance}. (Offline Mode)"
        
    if "vacation" in q or "trip" in q:
        return f"Based on {balance}, you should review your upcoming expenses. Ensure you cover essential bills first! (Offline Mode)"
        
    if "food" in q or "eating" in q or "restaurant" in q:
        return f"To save on food expenses, try: 1) Meal prep on weekends, 2) Cook at home 4-5 days/week, 3) Set a weekly food budget. These strategies can save you 30-40% on food costs. (Offline Mode)"
        
    if "save" in q or "invest" in q:
         return f"Based on your financial data, consider: 1) Setting up automatic transfers to savings, 2) Reducing variable expenses, 3) Exploring high-yield savings accounts. (Offline Mode)"
         
    return (
        "Based on your recent transaction history (Offline Analysis):\n"
        "1. Review your spending patterns to identify savings opportunities.\n"
        "2. Consider setting budget limits for variable expense categories.\n"
        "3. Monitor your balance regularly to stay on track."
    )
