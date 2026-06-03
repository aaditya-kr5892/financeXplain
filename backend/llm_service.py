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
                temperature=0.3,
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Model {model} failed: {e}")
            continue # Try next model

    # 2. Local Rule-Based Engine (Robust Fallback)
    print("API unavailable. Using Local Financial Expert Engine.")
    
    # Defaults
    balance = 0.0
    income = 0.0
    expense = 0.0
    
    # 3. Parse Context Data
    try:
        lines = financial_data.split('\n')
        for line in lines:
            # Normalize currency symbol
            clean_line = line.replace('Rs.', '₹')
            
            if "Current Balance:" in clean_line:
                balance = float(clean_line.split('₹')[1].strip())
            if "Total Income:" in clean_line:
                income = float(clean_line.split('₹')[1].strip())
            if "Total Expenses:" in clean_line:
                expense = float(clean_line.split('₹')[1].strip())
    except:
        pass # Keep defaults
        
    q = user_question.lower()
    
    # 4. Generate Specific Advice
    advice = []
    
    # General Assessment
    if income > 0:
        savings_ratio = (income - abs(expense)) / income
        if savings_ratio < 0.2:
            advice.append(f"Your savings rate is only {savings_ratio*100:.1f}%, which is below the recommended 20%.")
            advice.append("Try to limit discretionary spending on dining and entertainment.")
        elif savings_ratio > 0.4:
            advice.append(f"Great job! You're saving {savings_ratio*100:.1f}% of your income. Consider investing the surplus.")
    
    # Specific Topics
    if "food" in q or "eat" in q:
        advice.append("Food is often the biggest variable expense. Cooking at home 3 days a week can save you ~Rs. 4000/month.")
    elif "travel" in q or "vacation" in q:
        if balance > 20000:
            advice.append(f"With a balance of Rs. {balance:.0f}, you have some room for a short trip, but keep it budget-friendly.")
        else:
            advice.append(f"Your current balance (Rs. {balance:.0f}) is tight. I'd recommend delaying major travel plans until you have more liquidity.")
    elif "invest" in q:
        advice.append("Consider starting with low-risk index funds or a recurring deposit for safe growth.")
    
    # Fallback General Advice if no specific triggers
    if not advice:
        if balance < 5000:
            advice.append(f"Your balance is low (Rs. {balance:.0f}). Focus on essential bills and avoid new debt.")
        else:
            advice.append(f"You are in a stable position with Rs. {balance:.0f}. Review your subscription costs to optimize further.")
            
    header = "Based on your financial data (Local Analysis): "
    return header + " ".join(advice)
