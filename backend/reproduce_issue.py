import requests
import uuid

BASE_URL = "http://localhost:8000/api"

# Helper to register/login
def get_auth_headers():
    # Use a test user
    username = "delete_test_user"
    password = "password"
    
    # Try login first
    resp = requests.post(f"{BASE_URL}/login", json={"username": username, "password": password})
    if resp.status_code == 200:
        return {"X-User-ID": username}
    
    # Register if fails
    resp = requests.post(f"{BASE_URL}/register", json={"username": username, "password": password, "initial_balance": 1000})
    if resp.status_code == 200:
        return {"X-User-ID": username}
        
    print(f"Auth failed: {resp.text}")
    return None

def reproduce():
    headers = get_auth_headers()
    if not headers:
        return

    # 1. Create a session
    resp = requests.post(f"{BASE_URL}/chat/sessions", json={"title": "Delete Test"}, headers=headers)
    if resp.status_code != 200:
        print(f"Create session failed: {resp.text}")
        return
    
    session_id = resp.json()['id']
    print(f"Created session: {session_id}")

    # 2. Send a message to ensure messages exist
    resp = requests.post(f"{BASE_URL}/chat/{session_id}/message", json={"context": "Hello"}, headers=headers)
    if resp.status_code != 200:
        print(f"Send message failed: {resp.text}")
        return
    print("Added message to session")

    # 3. Delete the session
    print("Attempting to delete session...")
    resp = requests.delete(f"{BASE_URL}/chat/{session_id}", headers=headers)
    
    if resp.status_code == 200:
        print("SUCCESS: Session deleted.")
    else:
        print(f"FAILURE: Could not delete session. Code: {resp.status_code}")
        print(f"Response: {resp.text}")

if __name__ == "__main__":
    reproduce()
