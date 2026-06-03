from database import engine
from sqlalchemy import text

def add_metrics_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE assets ADD COLUMN metrics VARCHAR"))
            conn.commit()
            print("Successfully added metrics column to assets table")
        except Exception as e:
            print(f"Error adding metrics column (might already exist): {e}")

if __name__ == "__main__":
    add_metrics_column()
