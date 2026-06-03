import yfinance as yf
import sys

symbol = "AAPL"
print(f"Testing yfinance for symbol: {symbol}")

try:
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="1d")
    
    if hist.empty:
        print("Error: History is empty. Ticker might be invalid or no data.")
    else:
        print("Success! Fetched data:")
        print(hist.tail())
        print(f"Current Price: {hist['Close'].iloc[-1]}")
        
    try:
        info = ticker.info
        print(f"P/E: {info.get('trailingPE')}")
        print(f"Currency: {info.get('currency')}")
        print(f"Lot related keys: {lot_keys}")
        print(f"Previous Close: {info.get('previousClose')}")
        print(f"Regular Market Previous Close: {info.get('regularMarketPreviousClose')}")
        for k in lot_keys:
            print(f"{k}: {info[k]}")
    except Exception as e:
        print(f"Error fetching info: {e}")

except Exception as e:
    print(f"Critical Error: {e}")
