from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from database import Base
import uuid
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    
    transactions = relationship("Transaction", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    
    # Splitwise Relationships
    created_groups = relationship("ExpenseGroup", back_populates="created_by")
    group_memberships = relationship("GroupMember", back_populates="user")
    paid_expenses = relationship("SharedExpense", back_populates="payer")
    expense_splits = relationship("ExpenseSplit", back_populates="user")
    
    # Recurring Payments
    recurring_payments = relationship("RecurringPayment", back_populates="user")
    payment_notifications = relationship("PaymentNotification", back_populates="user")
    
    # Wealth Management
    assets = relationship("Asset", back_populates="user")
    portfolio_snapshots = relationship("PortfolioSnapshot", back_populates="user")
    investment_goals = relationship("InvestmentGoal", back_populates="user")
    risk_profile = relationship("RiskProfile", back_populates="user", uselist=False)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, default=datetime.date.today)
    description = Column(String)
    amount = Column(Float)
    category = Column(String)
    is_resolved = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String)
    amount = Column(Float)

    user = relationship("User", back_populates="budgets")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Chat")
    created_at = Column(Date, default=datetime.date.today)
    
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    role = Column(String) # 'user' or 'assistant'
    content = Column(String)
    timestamp = Column(Date, default=datetime.datetime.now)
    
    session = relationship("ChatSession", back_populates="messages")

class ExpenseGroup(Base):
    __tablename__ = "expense_groups"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(Date, default=datetime.date.today)

    created_by = relationship("User", back_populates="created_groups")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("SharedExpense", back_populates="group", cascade="all, delete-orphan")

class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("expense_groups.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(Date, default=datetime.date.today)

    group = relationship("ExpenseGroup", back_populates="members")
    user = relationship("User", back_populates="group_memberships")

class SharedExpense(Base):
    __tablename__ = "shared_expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("expense_groups.id"))
    payer_id = Column(Integer, ForeignKey("users.id"))
    description = Column(String)
    amount = Column(Float)
    date = Column(Date, default=datetime.date.today)
    category = Column(String)

    group = relationship("ExpenseGroup", back_populates="expenses")
    payer = relationship("User", back_populates="paid_expenses")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id = Column(String, ForeignKey("shared_expenses.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    amount_owed = Column(Float)
    status = Column(String, default="pending") # pending, paid, rejected

    expense = relationship("SharedExpense", back_populates="splits")
    user = relationship("User", back_populates="expense_splits")

class RecurringPayment(Base):
    __tablename__ = "recurring_payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)  # e.g., "Electricity Bill", "Home Loan EMI"
    amount = Column(Float)
    category = Column(String)
    frequency = Column(String)  # daily, weekly, monthly, yearly
    start_date = Column(Date)
    next_due_date = Column(Date)
    is_active = Column(Boolean, default=True)
    auto_pay = Column(Boolean, default=False)
    description = Column(String, nullable=True)
    created_at = Column(Date, default=datetime.date.today)
    updated_at = Column(Date, default=datetime.date.today, onupdate=datetime.date.today)

    user = relationship("User", back_populates="recurring_payments")
    notifications = relationship("PaymentNotification", back_populates="recurring_payment", cascade="all, delete-orphan")

class PaymentNotification(Base):
    __tablename__ = "payment_notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    recurring_payment_id = Column(String, ForeignKey("recurring_payments.id"))
    due_date = Column(Date)
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    created_at = Column(Date, default=datetime.date.today)

    user = relationship("User", back_populates="payment_notifications")
    recurring_payment = relationship("RecurringPayment", back_populates="notifications")

# ==================== WEALTH MANAGEMENT MODELS ====================

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    symbol = Column(String, nullable=True) # Ticker symbol for API
    type = Column(String) # Stock, MF, Gold, RealEstate, Crypto, FixedDeposit
    quantity = Column(Float)
    purchase_price = Column(Float)
    current_price = Column(Float)
    purchase_date = Column(Date, default=datetime.date.today)
    metrics = Column(String, nullable=True) # JSON data
    user = relationship("User", back_populates="assets")

class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, default=datetime.date.today)
    total_value = Column(Float)
    details = Column(String) # JSON string for asset allocation details
    user = relationship("User", back_populates="portfolio_snapshots")

class InvestmentGoal(Base):
    __tablename__ = "investment_goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    target_amount = Column(Float)
    current_amount = Column(Float, default=0.0)
    deadline = Column(Date)
    user = relationship("User", back_populates="investment_goals")

class RiskProfile(Base):
    __tablename__ = "risk_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Integer) # 1-10
    profile_type = Column(String) # Conservative, Moderate, Aggressive
    answers = Column(String) # JSON string of questionnaire answers
    user = relationship("User", back_populates="risk_profile")
