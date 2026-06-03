import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY", "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"), # Fallback to hardcoded if env not set
    default_headers={
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Fintech Dashboard Hackathon",
    }
)

def generate_financial_advice(user_question: str, financial_data: str = "", history: list = []) -> str:
    """
    Generates financial advice using OpenRouter LLM with multi-model fallback.
    Now supports conversation history.
    """
    # Check if we have a valid key (basic check)
    api_key = client.api_key
    if not api_key or "sk-or-v1" not in api_key:
        print("Warning: No valid OpenRouter API Key found.")

    # Format history for context
    history_text = ""
    if history:
        history_text = "PREVIOUS CONVERSATION:\n" + "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history[-5:]]) + "\n\n"

    prompt = f"""
        You are an expert financial advisor AI for a Fintech Dashboard.

        {financial_data}

        {history_text}

        USER QUESTION:
        "{user_question}"

        INSTRUCTIONS (MANDATORY — FOLLOW EXACTLY):
        1. Analyze the financial data provided above.
        2. Answer the user's question directly and concisely.
        3. Use specific numeric values from the data in every point.
        4. Provide actionable advice.
        5. Be encouraging and professional.

        FORMAT REQUIREMENTS (STRICT):
        - Output MUST be Markdown bullet points ONLY.
        - EACH bullet point MUST be on its OWN LINE.
        - EACH bullet point MUST start with "- ".
        - EACH bullet point MUST end with a newline character .
        - Do NOT combine multiple bullets on one line.
        - Do NOT include any text before or after the bullets.
        - Do NOT use paragraphs.

        EXAMPLE OUTPUT (FOLLOW THIS FORMAT EXACTLY):
        - Use Detailed Explanation of the Query.
        - Also Provide Actionable Advice.

    """


    models_to_try = [
        # "liquid/lfm-2.5-1.2b-thinking:free",
        # "liquid/lfm-2.5-1.2b-instruct:free",
        # "xiaomi/mimo-v2-flash:free",
        # "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b-instruct:free",
    ]

    # 1. Try API Models
    last_error = "Unknown error"
    for model in models_to_try:
        try:
            print(f"Attempting with model: {model}")
            completion = client.chat.completions.create(
                model=model, 
                messages=[
                    {"role": "system", "content": "You are a helpful financial assistant. Keep answers short (max 3 sentences)."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                timeout=45 # Increased timeout
            )
            if completion.choices and completion.choices[0].message.content:
                return completion.choices[0].message.content
        except Exception as e:
            print(f"Model {model} failed: {e}")
            last_error = str(e)
            continue # Try next model

    # 2. API Unavailable
    print("API unavailable (All models failed).")
    
    return f"I'm currently unable to connect to my AI brain. (Error: {last_error})"

import json

def analyze_purchase_confidence(amount: float, category: str, description: str, financial_context: str) -> dict:
    """
    Analyzes a potential purchase using AI to determine necessity, type, and alternatives.
    Returns a JSON object with scoring and reasoning.
    """
    prompt = f"""
    You are FinanceIQ, an AI purchase advisor.
    
    USER WANT TO BUY:
    - Item: {description}
    - Category: {category}
    - Cost: {amount}
    
    USER FINANCIAL CONTEXT:
    {financial_context}
    
    TASK:
    Analyze this purchase deepy based on the user's financial context.
    
    OUTPUT FORMAT:
    Return ONLY a raw JSON object (no markdown, no backticks) with this structure:
    {{
        "necessity_score": (int 1-10, where 10 is critical survival need, 1 is pure luxury),
        "purchase_type": (one of: "Essential", "Important", "Discretionary", "Luxury", "Impulse"),
        "sentiment": (one of: "Positive", "Neutral", "Caution", "Negative"),
        "reasoning": "Short 1-sentence explanation of why",
        "recommendation": "Short 1-sentence actionable advice (e.g. 'Wait 5 days', 'Buy generic')",
        "alternatives": ["Alt 1", "Alt 2"] (List of 2 short specific alternative ideas if applicable, else empty)
    }}
    
    SCORING GUIDE:
    - Medicine, Rent, Basic Food -> Score 9-10 (Essential)
    - Work tools, Repairs -> Score 6-8 (Important)
    - Dining out, Hobby -> Score 3-5 (Discretionary)
    - High-end brands, Jewelry -> Score 1-2 (Luxury)
    """
    
    models_to_try = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemini-2.0-flash-exp:free"
    ]
    
    for model in models_to_try:
        try:
            print(f"FinanceIQ analyzing with: {model}")
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a JSON-only financial analysis engine. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4, # Lower temp for consistent JSON
                timeout=45
            )
            
            content = completion.choices[0].message.content.strip()
            # Clean possible markdown code blocks
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "")
            
            return json.loads(content)
            
        except Exception as e:
             print(f"Model {model} failed for analysis: {e}")
             continue
             
    # Fallback
    return {
        "necessity_score": 5,
        "purchase_type": "Discretionary",
        "sentiment": "Neutral",
        "reasoning": "AI Analysis unavailable, proceed with caution.",
        "recommendation": "Check your budget manually.",
        "alternatives": []
    }

