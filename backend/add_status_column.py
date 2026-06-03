import sqlite3

DB_PATH = "backend/fintech.db"

def migrate():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(expense_splits)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "status" not in columns:
            print("Adding 'status' column to 'expense_splits'...")
            cursor.execute("ALTER TABLE expense_splits ADD COLUMN status VARCHAR DEFAULT 'pending'")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column 'status' already exists.")
            
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
