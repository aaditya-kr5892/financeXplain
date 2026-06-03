import requests
import time

BASE_URL = "http://127.0.0.1:8000/api"
headers = {"X-User-ID": "test_user_fraud"}

# 1. Register User
try:
    requests.post(f"{BASE_URL}/register", json={"username": "test_user_fraud", "password": "password", "initial_balance": 1000}, timeout=5)
except:
    pass # Might already exist

# 2. Seed Anomaly
print("Seeding anomaly...")
resp = requests.post(f"{BASE_URL}/seed-anomaly", headers=headers, timeout=5)
print("Seed Status:", resp.status_code, resp.text)

# 3. Check Fraud
print("Checking fraud...")
time.sleep(1)
resp = requests.get(f"{BASE_URL}/fraud-check", headers=headers, timeout=5)
print("Fraud Check Status:", resp.status_code)
print("Fraud Check Result:", resp.json())
