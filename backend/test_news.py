import yfinance as yf
import json

symbol = "RELIANCE.NS"
print(f"Fetching news for {symbol}...")

try:
    ticker = yf.Ticker(symbol)
    news = ticker.news
    first = news[0]
    print("Keys:", first.keys())
    print("Title:", first.get('title'))
    print("Content keys:", first.get('content', {}).keys())
except Exception as e:
    print(f"Error: {e}")
