import requests
import sys

BASE_URL = "http://127.0.0.1:8000"
USER_A = "alice_split"
USER_B = "bob_split"
PASSWORD = "password123"

def get_token(username):
    print(f"Logging in as {username}...")
    res = requests.post(f"{BASE_URL}/api/login", json={"username": username, "password": PASSWORD})
    if res.status_code == 401:
         # Register
         print(f"Registering {username}...")
         requests.post(f"{BASE_URL}/api/register", json={"username": username, "password": PASSWORD, "initial_balance": 5000})
         res = requests.post(f"{BASE_URL}/api/login", json={"username": username, "password": PASSWORD})
    
    return res.json().get("token")

def run_test():
    print("Testing Splitwise Feature...")
    
    token_a = get_token(USER_A)
    token_b = get_token(USER_B)
    
    headers_a = {"X-User-ID": token_a}
    headers_b = {"X-User-ID": token_b}
    
    # 1. Create Group (Alice)
    print("\n[1] Alice creating group 'Trip'...")
    res = requests.post(f"{BASE_URL}/api/groups", json={"name": "Trip"}, headers=headers_a)
    group_data = res.json()
    group_id = group_data['id']
    print(f"Group Created: {group_id}")
    
    # 2. Add Member (Alice adds Bob)
    print("\n[2] Alice adding Bob...")
    res = requests.post(f"{BASE_URL}/api/groups/{group_id}/members", json={"username": USER_B}, headers=headers_a)
    print(f"Add Member Status: {res.status_code}")
    
    # 3. Add Expense (Alice pays 100)
    print("\n[3] Alice paying 100 for Lunch...")
    res = requests.post(f"{BASE_URL}/api/groups/{group_id}/expenses", 
                        json={"description": "Lunch", "amount": 100.0}, headers=headers_a)
    print(f"Expense Status: {res.status_code}")
    
    # 4. Check Balances
    print("\n[4] Checking Balances...")
    
    # Alice Check
    res = requests.get(f"{BASE_URL}/api/groups/{group_id}/balances", headers=headers_a)
    bal_a = res.json()
    print(f"Alice's Balance: {bal_a['net_balance']} ({bal_a['status']})")
    
    # Bob Check
    res = requests.get(f"{BASE_URL}/api/groups/{group_id}/balances", headers=headers_b)
    bal_b = res.json()
    print(f"Bob's Balance: {bal_b['net_balance']} ({bal_b['status']})")
    
    if bal_a['net_balance'] == 50.0 and bal_b['net_balance'] == -50.0:
        print("\nSUCCESS: Split calculation correct.")
    else:
        print("\nFAILURE: Calculation mismatch.")

if __name__ == "__main__":
    run_test()
