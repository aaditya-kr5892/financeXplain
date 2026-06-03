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
        6. If the user refers to previous messages, use the PREVIOUS CONVERSATION context.

        FORMAT REQUIREMENTS (STRICT):
        - Output MUST be Markdown bullet points ONLY.
        - Output MUST contain EXACTLY 4 bullet points.
        - EACH bullet point MUST be on its OWN LINE.
        - EACH bullet point MUST start with "- ".
        - EACH bullet point MUST end with a newline character "\\n".
        - Do NOT combine multiple bullets on one line.
        - Do NOT include any text before or after the bullets.
        - Do NOT use paragraphs.

        EXAMPLE OUTPUT (FOLLOW THIS FORMAT EXACTLY):
        - First point with numbers and insight.\\n
        - Second point with numbers and insight.\\n
        - Third point with actionable advice.\\n
        - Fourth point with actionable advice.\\n
    """


    models_to_try = [
        "liquid/lfm-2.5-1.2b-thinking:free",
        "liquid/lfm-2.5-1.2b-instruct:free",
        "xiaomi/mimo-v2-flash:free",
        "google/gemini-2.0-flash-exp:free",
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
