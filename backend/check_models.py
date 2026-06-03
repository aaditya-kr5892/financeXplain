import os
import requests
# from dotenv import load_dotenv

# load_dotenv()

API_KEY = "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"

def check_models():
    print(f"Checking models with key: {API_KEY[:10]}...")
    try:
        res = requests.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10
        )
        if res.status_code == 200:
            data = res.json()
            models = data.get("data", [])
            print(f"Found {len(models)} models.")
            free_models = [m['id'] for m in models if 'free' in m['id'] or m.get('pricing', {}).get('prompt') == '0']
            
            print("\nAvailable Free Models:")
            for m in free_models:
                print(f"- {m}")
                
            # Check specifically for the ones we use
            print("\nChecking target models:")
            targets = [
                "google/gemini-2.0-flash-exp:free",
                "meta-llama/llama-3-8b-instruct:free",
                "mistralai/mistral-7b-instruct:free"
            ]
            for t in targets:
                found = any(m['id'] == t for m in models)
                print(f"{t}: {'AVAILABLE' if found else 'NOT FOUND'}")
        else:
            print(f"Failed to fetch models: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_models()
