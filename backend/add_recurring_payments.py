"""
Migration script to add recurring_payments and payment_notifications tables
"""
from database import engine, Base
from models import RecurringPayment, PaymentNotification

def migrate():
    print("Creating recurring_payments and payment_notifications tables...")
    Base.metadata.create_all(bind=engine, tables=[
        RecurringPayment.__table__,
        PaymentNotification.__table__
    ])
    print("✓ Tables created successfully!")

if __name__ == "__main__":
    migrate()
