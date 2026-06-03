from database import engine, Base
from models import Asset, PortfolioSnapshot, InvestmentGoal, RiskProfile

print("Creating wealth management tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully!")
