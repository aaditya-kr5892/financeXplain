import requests
import sys

BASE_URL = "http://127.0.0.1:8000"
USERNAME = "test_debugger_user"
PASSWORD = "password123"

def run_test():
    print(f"Testing Chat API at {BASE_URL}...")
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

    # 2. Create Session
    print("\n[2] Creating New Chat...")
    res = session.post(f"{BASE_URL}/api/chat/sessions", json={"title": "Test Chat"}, headers=headers)
    if res.status_code != 200:
        print(f"Create failed: {res.text}")
        return
    chat_data = res.json()
    session_id = chat_data['id']
    print(f"Created Session: {session_id}")
    print(f"Initial Messages: {len(chat_data['messages'])}")

    # 3. Send Message
    print("\n[3] Sending Message...")
    msg_payload = {"context": "My salary is 50000"}
    res = session.post(f"{BASE_URL}/api/chat/{session_id}/message", json=msg_payload, headers=headers)
    if res.status_code == 200:
        reply = res.json()
        print(f"AI Reply: {reply['content'][:50]}...")
    else:
        print(f"Send failed: {res.text}")

    # 4. Get History
    print("\n[4] Fetching History...")
    res = session.get(f"{BASE_URL}/api/chat/{session_id}", headers=headers)
    history = res.json()['messages']
    print(f"Total Messages in History: {len(history)}")
    
    # 5. List Sessions
    print("\n[5] Listing Sessions...")
    res = session.get(f"{BASE_URL}/api/chat/sessions", headers=headers)
    sessions = res.json()
    print(f"Total Sessions: {len(sessions)}")
    
    # 6. Delete Session
    print("\n[6] Deleting Session...")
    res = session.delete(f"{BASE_URL}/api/chat/{session_id}", headers=headers)
    print(f"Delete Status: {res.status_code}")

if __name__ == "__main__":
    run_test()
