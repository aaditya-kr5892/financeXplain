"""
Migration script to add 'category' column to shared_expenses table
"""
from database import engine
from sqlalchemy import text

def migrate():
    print("Adding 'category' column to shared_expenses table...")
    with engine.connect() as conn:
        try:
            # Check if column exists (simple check by selecting it)
            try:
                conn.execute(text("SELECT category FROM shared_expenses LIMIT 1"))
                print("Column 'category' already exists.")
            except Exception:
                # Add column
                conn.execute(text("ALTER TABLE shared_expenses ADD COLUMN category VARCHAR"))
                # Update existing rows with a default category
                conn.execute(text("UPDATE shared_expenses SET category = 'SplitBill' WHERE category IS NULL"))
                conn.commit()
                print("✓ Column 'category' added successfully!")
                
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
