import requests
import sys

BASE_URL = "http://127.0.0.1:8000"
USERNAME = "test_debugger_user"
PASSWORD = "password123"

def run_test():
    print(f"Testing Simulation API at {BASE_URL}...")
    session = requests.Session()
    
    # 1. Login
    login_payload = {"username": USERNAME, "password": PASSWORD}
    res = session.post(f"{BASE_URL}/api/login", json=login_payload)
    if res.status_code != 200:
        print("Login failed")
        return
    token = res.json().get("token")
    headers = {"X-User-ID": token}
    print("Login success.")

    # 2. Test Safe Amount
    print("\n[2] Simulating Small Amount (50)...")
    payload = {"amount": 50, "category": "Food"}
    res = session.post(f"{BASE_URL}/api/simulate", json=payload, headers=headers)
    print(res.json())

    # 3. Test Huge Amount (Exceeding specific budget/balance)
    print("\n[3] Simulating Huge Amount (1,000,000)...")
    payload = {"amount": 1000000, "category": "Shopping"}
    res = session.post(f"{BASE_URL}/api/simulate", json=payload, headers=headers)
    print(res.json())
    
    data = res.json()
    if data['impact'] == 'Safe' and data['new_balance'] < 0:
        print("FAILURE: System says Safe even when balance is negative!")
    else:
        print("System behaved reasonably (or user has infinite money).")

if __name__ == "__main__":
    run_test()
