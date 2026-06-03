import requests
import sys

BASE_URL = "http://127.0.0.1:8000"
USERNAME = "test_debugger_user"
PASSWORD = "password123"

def run_test():
    print(f"Testing API at {BASE_URL}...")

    # 1. Register/Login
    print("\n[1] Authentication...")
    session = requests.Session()
    
    # Try login first
    try:
        login_payload = {"username": USERNAME, "password": PASSWORD}
        res = session.post(f"{BASE_URL}/api/login", json=login_payload)
        
        if res.status_code == 401:
            print("User does not exist, registering...")
            reg_payload = {"username": USERNAME, "password": PASSWORD, "initial_balance": 10000}
            res = session.post(f"{BASE_URL}/api/register", json=reg_payload)
            if res.status_code != 200:
                print(f"Registration failed: {res.text}")
                return
            print("Registration success.")
            # Login again
            res = session.post(f"{BASE_URL}/api/login", json=login_payload)
        
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return
            
        print("Login success.")
        # In this app, the token is just the username, and it expects X-User-ID header
        token = res.json().get("token")
        headers = {"X-User-ID": token}
        print(f"Auth Token (Username): {token}")
        
    except requests.exceptions.ConnectionError:
        print("ERROR: Connection refused. Is the backend running?")
        return

    # 2. Check Data Availability
    print("\n[2] Checking Operations Data...")
    res = session.get(f"{BASE_URL}/api/transactions", headers=headers)
    if res.status_code == 200:
        txns = res.json()
        print(f"Found {len(txns)} transactions.")
        if len(txns) == 0:
            print("Seeding dummy transaction...")
            # Seed anomaly just to get some data
            session.post(f"{BASE_URL}/api/seed-anomaly", headers=headers)
    else:
        print(f"Failed to get transactions: {res.text}")
        return

    # 3. Test LLM Endpoint
    print("\n[3] Testing LLM Advisor Endpoint...")
    question = "What is my current balance?"
    payload = {"context": question}
    
    try:
        res = session.post(f"{BASE_URL}/api/ask-advisor", json=payload, headers=headers)
        
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            print("Response:", res.json())
        else:
            print("Error Response:", res.text)
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    run_test()
