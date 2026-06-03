# ==================== RECURRING PAYMENTS ====================

from datetime import timedelta
from dateutil.relativedelta import relativedelta

class RecurringPaymentCreate(BaseModel):
    name: str
    amount: float
    category: str
    frequency: str  # daily, weekly, monthly, yearly
    start_date: str  # YYYY-MM-DD
    auto_pay: bool = False
    description: Optional[str] = None

class RecurringPaymentUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None
    auto_pay: Optional[bool] = None
    description: Optional[str] = None

def calculate_next_due_date(current_date, frequency):
    """Calculate next due date based on frequency"""
    if frequency == "daily":
        return current_date + timedelta(days=1)
    elif frequency == "weekly":
        return current_date + timedelta(weeks=1)
    elif frequency == "monthly":
        return current_date + relativedelta(months=1)
    elif frequency == "yearly":
        return current_date + relativedelta(years=1)
    return current_date

@app.post("/api/recurring-payments")
def create_recurring_payment(
    payment: RecurringPaymentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        start_date = datetime.strptime(payment.start_date, "%Y-%m-%d").date()
        
        new_payment = RecurringPayment(
            user_id=user.id,
            name=payment.name,
            amount=payment.amount,
            category=payment.category,
            frequency=payment.frequency,
            start_date=start_date,
            next_due_date=start_date,
            auto_pay=payment.auto_pay,
            description=payment.description
        )
        
        db.add(new_payment)
        db.commit()
        db.refresh(new_payment)
        
        return {
            "id": new_payment.id,
            "name": new_payment.name,
            "amount": new_payment.amount,
            "category": new_payment.category,
            "frequency": new_payment.frequency,
            "next_due_date": new_payment.next_due_date.strftime("%Y-%m-%d"),
            "is_active": new_payment.is_active,
            "auto_pay": new_payment.auto_pay
        }
    except Exception as e:
        print(f"Error creating recurring payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recurring-payments")
def get_recurring_payments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        payments = db.query(RecurringPayment).filter(
            RecurringPayment.user_id == user.id
        ).all()
        
        result = []
        today = datetime.now().date()
        
        for p in payments:
            days_until_due = (p.next_due_date - today).days
            status = "overdue" if days_until_due < 0 else "due" if days_until_due == 0 else "upcoming"
            
            result.append({
                "id": p.id,
                "name": p.name,
                "amount": p.amount,
                "category": p.category,
                "frequency": p.frequency,
                "next_due_date": p.next_due_date.strftime("%Y-%m-%d"),
                "is_active": p.is_active,
                "auto_pay": p.auto_pay,
                "description": p.description,
                "status": status,
                "days_until_due": days_until_due
            })
        
        return result
    except Exception as e:
        print(f"Error fetching recurring payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/recurring-payments/{payment_id}")
def update_recurring_payment(
    payment_id: str,
    payment: RecurringPaymentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_payment = db.query(RecurringPayment).filter(
            RecurringPayment.id == payment_id,
            RecurringPayment.user_id == user.id
        ).first()
        
        if not db_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Update fields if provided
        if payment.name is not None:
            db_payment.name = payment.name
        if payment.amount is not None:
            db_payment.amount = payment.amount
        if payment.category is not None:
            db_payment.category = payment.category
        if payment.frequency is not None:
            db_payment.frequency = payment.frequency
        if payment.is_active is not None:
            db_payment.is_active = payment.is_active
        if payment.auto_pay is not None:
            db_payment.auto_pay = payment.auto_pay
        if payment.description is not None:
            db_payment.description = payment.description
        
        db_payment.updated_at = datetime.now().date()
        
        db.commit()
        db.refresh(db_payment)
        
        return {"status": "success", "message": "Payment updated"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating recurring payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/recurring-payments/{payment_id}")
def delete_recurring_payment(
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_payment = db.query(RecurringPayment).filter(
            RecurringPayment.id == payment_id,
            RecurringPayment.user_id == user.id
        ).first()
        
        if not db_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        db.delete(db_payment)
        db.commit()
        
        return {"status": "success", "message": "Payment deleted"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting recurring payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recurring-payments/{payment_id}/pay")
def mark_payment_as_paid(
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_payment = db.query(RecurringPayment).filter(
            RecurringPayment.id == payment_id,
            RecurringPayment.user_id == user.id
        ).first()
        
        if not db_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Create transaction
        new_transaction = Transaction(
            user_id=user.id,
            date=datetime.now().date(),
            description=f"{db_payment.name} (Recurring)",
            amount=-abs(db_payment.amount),  # Negative for expense
            category=db_payment.category
        )
        
        db.add(new_transaction)
        
        # Update next due date
        db_payment.next_due_date = calculate_next_due_date(
            db_payment.next_due_date,
            db_payment.frequency
        )
        
        # Dismiss any notifications for this payment
        db.query(PaymentNotification).filter(
            PaymentNotification.recurring_payment_id == payment_id,
            PaymentNotification.is_dismissed == False
        ).update({"is_dismissed": True})
        
        db.commit()
        
        return {
            "status": "success",
            "message": "Payment marked as paid",
            "transaction_id": new_transaction.id,
            "next_due_date": db_payment.next_due_date.strftime("%Y-%m-%d")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking payment as paid: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recurring-payments/due")
def get_due_payments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        today = datetime.now().date()
        upcoming_threshold = today + timedelta(days=3)  # 3 days ahead
        
        payments = db.query(RecurringPayment).filter(
            RecurringPayment.user_id == user.id,
            RecurringPayment.is_active == True,
            RecurringPayment.next_due_date <= upcoming_threshold
        ).all()
        
        result = []
        for p in payments:
            days_until_due = (p.next_due_date - today).days
            
            result.append({
                "id": p.id,
                "name": p.name,
                "amount": p.amount,
                "category": p.category,
                "next_due_date": p.next_due_date.strftime("%Y-%m-%d"),
                "days_until_due": days_until_due,
                "is_overdue": days_until_due < 0
            })
        
        return result
    except Exception as e:
        print(f"Error fetching due payments: {e}")
        raise HTTPException(status_code=500, detail=str(e))
