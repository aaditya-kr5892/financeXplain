from database import engine
from sqlalchemy import text

def add_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE assets ADD COLUMN symbol VARCHAR"))
            conn.commit()
            print("Successfully added symbol column to assets table")
        except Exception as e:
            print(f"Error adding column (might already exist): {e}")

if __name__ == "__main__":
    add_column()
