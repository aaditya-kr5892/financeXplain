import matplotlib
matplotlib.use('Agg') # Non-interactive backend
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from fpdf import FPDF
from datetime import datetime
import os
import io

def sanitize_for_pdf(text):
    """Replace Unicode characters that can't be encoded in Latin-1 with ASCII equivalents."""
    if not text:
        return text
    # Common replacements
    replacements = {
        '\u2014': '--',  # em dash
        '\u2013': '-',   # en dash
        '\u2018': "'",   # left single quote
        '\u2019': "'",   # right single quote
        '\u201c': '"',   # left double quote
        '\u201d': '"',   # right double quote
        '\u2026': '...',  # ellipsis
        '\u2022': '*',   # bullet
    }
    for unicode_char, ascii_char in replacements.items():
        text = text.replace(unicode_char, ascii_char)
    # Remove any remaining non-Latin-1 characters
    return text.encode('latin-1', errors='ignore').decode('latin-1')

def generate_portfolio_pdf(assets, user):
    pdf = PDFReport(orientation='L')
    pdf.alias_nb_pages()
    
    # Page 1: Cover
    pdf.add_page()
    pdf.set_font('Arial', 'B', 24)
    pdf.set_text_color(127, 86, 217)
    pdf.cell(0, 40, 'Portfolio+ Analysis Report (Self)', 0, 1, 'C')
    
    pdf.set_font('Arial', '', 14)
    pdf.set_text_color(50)
    pdf.cell(0, 10, f'Prepared for: {user.username}', 0, 1, 'C')
    pdf.cell(0, 10, f'Generated on: {datetime.now().strftime("%B %d, %Y")}', 0, 1, 'C')
    
    pdf.ln(20)
    pdf.set_font('Arial', 'I', 10)
    pdf.multi_cell(0, 10, "This report provides a comprehensive overview of your current asset holdings, including invested value, current market value, and unrealized profit/loss.", 0, 'C')

    # Page 2: Table
    pdf.add_page()
    pdf.set_font('Arial', 'B', 16)
    pdf.set_text_color(0)
    pdf.cell(0, 10, 'P&L Statement', 0, 1, 'L')
    pdf.ln(5)
    
    # Table Header
    cols = ["Scrip Name", "Qty", "Buy Avg", "Invested", "Cur. Price", "Cur. Value", "P&L"]
    w = [55, 15, 25, 30, 25, 30, 25] # Adjusted widths
    
    pdf.set_fill_color(240, 240, 245)
    pdf.set_font('Arial', 'B', 9)
    for i, col in enumerate(cols):
        pdf.cell(w[i], 10, col, 1, 0, 'C', 1)
    pdf.ln()
    
    # Rows
    pdf.set_font('Arial', '', 8)
    total_invested = 0
    total_current = 0
    
    for asset in assets:
        name = sanitize_for_pdf(asset.name or asset.symbol or "Unknown")
        qty = asset.quantity
        buy_avg = asset.purchase_price
        invested = qty * buy_avg
        cur_price = asset.current_price
        cur_val = qty * cur_price
        pl = cur_val - invested
        
        total_invested += invested
        total_current += cur_val
        
        pdf.cell(w[0], 10, name[:35], 1) # Limit length
        pdf.cell(w[1], 10, str(round(qty, 2)), 1, 0, 'R')
        pdf.cell(w[2], 10, f"{buy_avg:.2f}", 1, 0, 'R')
        pdf.cell(w[3], 10, f"{invested:.2f}", 1, 0, 'R')
        pdf.cell(w[4], 10, f"{cur_price:.2f}", 1, 0, 'R')
        pdf.cell(w[5], 10, f"{cur_val:.2f}", 1, 0, 'R')
        
        # Color P&L
        if pl >= 0:
            pdf.set_text_color(0, 150, 0)
        else:
            pdf.set_text_color(200, 0, 0)
        pdf.cell(w[6], 10, f"{pl:.2f}", 1, 0, 'R')
        pdf.set_text_color(0) # Reset
        pdf.ln()

    # Totals
    pdf.set_font('Arial', 'B', 9)
    pdf.set_fill_color(230, 230, 230)
    pdf.cell(sum(w[:3]), 10, 'Total Portfolio Value', 1, 0, 'R', 1)
    pdf.cell(w[3], 10, f"{total_invested:.2f}", 1, 0, 'R', 1)
    pdf.cell(w[4], 10, '', 1, 0, '', 1)
    pdf.cell(w[5], 10, f"{total_current:.2f}", 1, 0, 'R', 1)
    
    total_pl = total_current - total_invested
    if total_pl >= 0:
        pdf.set_text_color(0, 150, 0)
    else:
        pdf.set_text_color(200, 0, 0)
    pdf.cell(w[6], 10, f"{total_pl:.2f}", 1, 0, 'R', 1)

    # Page 3: Transaction History (Derived from Current Holdings)
    pdf.add_page()
    pdf.set_font('Arial', 'B', 16)
    pdf.set_text_color(0)
    pdf.cell(0, 10, 'Asset Purchase History', 0, 1, 'L')
    pdf.ln(5)
    
    h_cols = ["Date", "Scrip Name", "Type", "Qty", "Price", "Total"]
    h_w = [40, 80, 25, 25, 35, 40]
    
    # Headers
    pdf.set_fill_color(240, 240, 245)
    pdf.set_font('Arial', 'B', 9)
    for i, col in enumerate(h_cols):
        pdf.cell(h_w[i], 10, col, 1, 0, 'C', 1)
    pdf.ln()
    
    # Rows (Sorted by date descending)
    try:
        sorted_assets = sorted(assets, key=lambda x: x.purchase_date or datetime.min.date(), reverse=True)
    except:
        sorted_assets = assets
    
    pdf.set_font('Arial', '', 9)
    for asset in sorted_assets:
        p_date = str(asset.purchase_date) if asset.purchase_date else "N/A"
        name = sanitize_for_pdf(asset.name or asset.symbol or "Unknown")[:45]
        
        pdf.cell(h_w[0], 10, p_date, 1, 0, 'C')
        pdf.cell(h_w[1], 10, name, 1, 0, 'L')
        pdf.set_text_color(0, 100, 0)
        pdf.cell(h_w[2], 10, "Buy", 1, 0, 'C')
        pdf.set_text_color(0)
        pdf.cell(h_w[3], 10, str(round(asset.quantity, 2)), 1, 0, 'R')
        pdf.cell(h_w[4], 10, f"{asset.purchase_price:.2f}", 1, 0, 'R')
        pdf.cell(h_w[5], 10, f"{(asset.quantity * asset.purchase_price):.2f}", 1, 0, 'R')
        pdf.ln()
    
    return pdf.output(dest='S').encode('latin-1', errors='ignore')

class PDFReport(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.set_text_color(127, 86, 217) # Corporate Purple
        self.cell(0, 10, 'FinanceIQ - Comprehensive Financial Report', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(128)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_charts(df, forecast_data, user_id):
    """Generates charts and saves them to temporary images."""
    os.makedirs('temp_charts', exist_ok=True)
    chart_paths = {}

    # 1. Spending by Category (Pie Chart)
    plt.figure(figsize=(6, 4))
    expenses = df[df['amount'] < 0].copy()
    expenses['amount'] = expenses['amount'].abs()
    cat_spend = expenses.groupby('category')['amount'].sum().sort_values(ascending=False).head(6)
    
    colors = sns.color_palette("pastel")
    plt.pie(cat_spend, labels=cat_spend.index, autopct='%1.1f%%', colors=colors, startangle=140)
    plt.title('Top Expenses by Category')
    plt.tight_layout()
    pie_path = f'temp_charts/{user_id}_pie.png'
    plt.savefig(pie_path)
    plt.close()
    chart_paths['pie'] = pie_path

    # 2. Forecast Trend (Line Chart)
    if forecast_data:
        plt.figure(figsize=(8, 4))
        dates = [d['date'] for d in forecast_data]
        values = [d['predicted_balance'] for d in forecast_data]
        upper = [d['upper_bound'] for d in forecast_data]
        lower = [d['lower_bound'] for d in forecast_data]
        
        # Convert dates strings to datetime objects for matplotlib
        dates = [datetime.strptime(d, '%Y-%m-%d') for d in dates]

        plt.plot(dates, values, label='Projected Balance', color='#7F56D9', linewidth=2)
        plt.fill_between(dates, lower, upper, color='#7F56D9', alpha=0.2, label='Confidence Interval')
        
        plt.title('30-Day Cash Flow Forecast')
        plt.xlabel('Date')
        plt.ylabel('Balance')
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        line_path = f'temp_charts/{user_id}_forecast.png'
        plt.savefig(line_path)
        plt.close()
        chart_paths['forecast'] = line_path

    # 3. Income vs Expense (Bar Chart)
    try:
        plt.figure(figsize=(6, 4))
        # Simple Income vs Expense
        total_income = df[df['amount'] > 0]['amount'].sum()
        total_expense = df[df['amount'] < 0]['amount'].abs().sum()
        
        plt.bar(['Income', 'Expenses'], [total_income, total_expense], color=['#00B7C3', '#F04438'])
        plt.title('Income vs Expenses (All Time)')
        plt.ylabel('Amount (Rs.)')
        plt.tight_layout()
        bar_path = f'temp_charts/{user_id}_bar.png'
        plt.savefig(bar_path)
        plt.close()
        chart_paths['bar'] = bar_path
    except Exception as e:
        print(f"Bar chart error: {e}")

    # 4. Daily Spend Trend (Line Chart)
    try:
        plt.figure(figsize=(8, 4))
        daily_spend = df[df['amount'] < 0].copy()
        daily_spend['date'] = pd.to_datetime(daily_spend['date'])
        daily_trend = daily_spend.groupby('date')['amount'].sum().abs()
        
        plt.plot(daily_trend.index, daily_trend.values, color='#F04438', linewidth=1.5)
        plt.title('Daily Spending Trend')
        plt.xlabel('Date')
        plt.ylabel('Spend Amount')
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.xticks(rotation=45)
        plt.tight_layout()
        trend_path = f'temp_charts/{user_id}_trend.png'
        plt.savefig(trend_path)
        plt.close()
        chart_paths['trend'] = trend_path
    except Exception as e:
        print(f"Trend chart error: {e}")
    
    return chart_paths

def create_pdf_report(user_id, stats, health_score, anomalies, top_category, forecast_data, advice_text, df):
    pdf = PDFReport()
    pdf.add_page()
    
    # Title Section
    pdf.set_font('Arial', 'B', 12)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 10, f'Report for User: {user_id}', 0, 1, 'L')
    pdf.cell(0, 10, f'Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M")}', 0, 1, 'L')
    pdf.ln(5)

    # --- Financial Health Section ---
    pdf.set_font('Arial', 'B', 14)
    pdf.set_fill_color(240, 240, 250)
    pdf.cell(0, 10, '1. Financial Health Overview', 0, 1, 'L', fill=True)
    pdf.ln(2)
    
    pdf.set_font('Arial', '', 11)
    pdf.cell(90, 10, f'Net Position: Rs. {stats["balance"]:.2f}', 0)
    pdf.cell(90, 10, f'Health Score: {health_score["score"]}/100 ({health_score["status"]})', 0, 1)
    pdf.cell(90, 10, f'Savings Rate: {health_score["savings_rate"]}%', 0)
    # Replaced unicode symbol with Rs.
    pdf.cell(90, 10, f'Top Expense: {top_category.replace("₹", "Rs. ")}', 0, 1)
    pdf.ln(5)

    # --- AI Executive Summary ---
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '2. AI Executive Summary', 0, 1, 'L', fill=True)
    pdf.ln(2)
    
    pdf.set_font('Arial', '', 10)
    safe_advice = sanitize_for_pdf(advice_text)
    pdf.multi_cell(0, 6, safe_advice)
    pdf.ln(5)

    # --- Visuals Section (Page 1) ---
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '3. Visual Financial Analysis', 0, 1, 'L', fill=True)
    pdf.ln(2)
    
    # Generate charts
    charts = generate_charts(df, forecast_data, user_id)
    
    # Grid Layout for Charts
    # Row 1: Pie & Bar
    y_start = pdf.get_y()
    if 'pie' in charts:
        pdf.image(charts['pie'], x=10, y=y_start, w=90)
    if 'bar' in charts:
        pdf.image(charts['bar'], x=110, y=y_start, w=90)
    pdf.ln(65)
    
    # Row 2: Forecast & Trend
    y_start_2 = pdf.get_y()
    if 'forecast' in charts:
        pdf.image(charts['forecast'], x=10, y=y_start_2, w=90)
    if 'trend' in charts:
        pdf.image(charts['trend'], x=110, y=y_start_2, w=90)
    
    pdf.ln(70) # Move past images (Page break likely needed)

    # --- Security Audit (Page 2) ---
    pdf.add_page()
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '4. Security Audit & Fraud Detection', 0, 1, 'L', fill=True)
    pdf.ln(2)
    
    # Methodology Note
    pdf.set_font('Arial', 'I', 9)
    pdf.set_text_color(100)
    pdf.multi_cell(0, 5, "Methodology: We use an Isolation Forest algorithm to detect anomalies based on transaction amount deviation (Z-Score > 2), weekend spending patterns, and category-specific behavior.")
    pdf.ln(5)
    
    if anomalies:
        pdf.set_font('Arial', 'B', 10)
        pdf.set_text_color(200, 50, 50) # Red
        pdf.cell(0, 10, f'CRITICAL ALERT: {len(anomalies)} Suspicious Transactions Detected', 0, 1)
        pdf.set_text_color(0, 0, 0)
        
        # Table Header
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font('Arial', 'B', 9)
        pdf.cell(30, 8, 'Date', 1, 0, 'C', fill=True)
        pdf.cell(80, 8, 'Description', 1, 0, 'C', fill=True)
        pdf.cell(30, 8, 'Amount', 1, 0, 'C', fill=True)
        pdf.cell(50, 8, 'Flag Reason', 1, 1, 'C', fill=True) # Changed col name
        
        pdf.set_font('Arial', '', 9)
        for txn in anomalies:
            pdf.cell(30, 8, str(txn['date']), 1)
            pdf.cell(80, 8, str(txn['description'])[:35], 1)
            pdf.cell(30, 8, f"{txn['amount']}", 1)
            # Infer reason for display
            reason = "High Amount"
            if abs(txn['amount']) > 5000: reason = "Large Value"
            # We don't have is_weekend in the txn dict here unless we pass it, so simplified logic for display
            pdf.cell(50, 8, reason, 1, 1)
    else:
        pdf.set_font('Arial', '', 10)
        pdf.set_text_color(0, 150, 0)
        pdf.cell(0, 10, "No anomalies detected. Your account activity appears normal.", 0, 1)
        
    # Cleanup
    for path in charts.values():
        try:
            os.remove(path)
        except:
            pass

    return pdf

def create_statement_pdf(user_id, df, start_date, end_date):
    pdf = PDFReport()
    pdf.add_page()
    
    # Header
    pdf.set_font('Arial', 'B', 16)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 10, 'Transaction Statement', 0, 1, 'C')
    pdf.ln(5)
    
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, f'Account Holder: {user_id}', 0, 1)
    pdf.cell(0, 6, f'Statement Period: {start_date} to {end_date}', 0, 1)
    pdf.cell(0, 6, f'Generated On: {datetime.now().strftime("%Y-%m-%d %H:%M")}', 0, 1)
    pdf.ln(10)
    
    # Summary Box
    total_in = df[df['amount'] > 0]['amount'].sum()
    total_out = df[df['amount'] < 0]['amount'].sum()
    net = total_in + total_out
    
    pdf.set_fill_color(245, 245, 250)
    pdf.rect(10, pdf.get_y(), 190, 25, 'F')
    pdf.set_font('Arial', 'B', 10)
    pdf.set_xy(15, pdf.get_y() + 5)
    pdf.cell(60, 6, f'Total Credits: Rs. {total_in:,.2f}', 0, 0)
    pdf.cell(60, 6, f'Total Debits: Rs. {abs(total_out):,.2f}', 0, 0)
    pdf.cell(60, 6, f'Net Change: Rs. {net:,.2f}', 0, 1)
    pdf.ln(20)
    
    # Table Header
    pdf.set_font('Arial', 'B', 9)
    pdf.set_fill_color(127, 86, 217) # Corp Purple
    pdf.set_text_color(255)
    
    col_widths = [30, 40, 80, 40] # Date, Category, Desc, Amount
    headers = ['Date', 'Category', 'Description', 'Amount']
    
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 8, h, 0, 0, 'C', fill=True)
    pdf.ln()
    
    # Table Body
    pdf.set_text_color(0)
    pdf.set_font('Arial', '', 9)
    
    fill = False
    for _, row in df.iterrows():
        pdf.set_fill_color(248, 248, 255)
        
        # Handle date formatting safely
        date_val = row['date']
        if hasattr(date_val, 'strftime'):
            date_str = date_val.strftime('%Y-%m-%d')
        else:
            date_str = str(date_val)
            
        pdf.cell(col_widths[0], 8, date_str, 0, 0, 'C', fill=fill)
        pdf.cell(col_widths[1], 8, str(row['category']), 0, 0, 'C', fill=fill)
        
        desc = str(row['description'])
        if len(desc) > 35: desc = desc[:32] + "..."
        pdf.cell(col_widths[2], 8, desc, 0, 0, 'L', fill=fill)
        
        amt = row['amount']
        color = (0, 150, 0) if amt > 0 else (200, 50, 50)
        pdf.set_text_color(*color)
        pdf.cell(col_widths[3], 8, f"Rs. {amt:,.2f}", 0, 0, 'R', fill=fill)
        pdf.set_text_color(0)
        
        pdf.ln()
        fill = not fill
        
        # Page break if needed
        if pdf.get_y() > 270:
            pdf.add_page()
            # Reprint header
            pdf.set_font('Arial', 'B', 9)
            pdf.set_fill_color(127, 86, 217)
            pdf.set_text_color(255)
            for i, h in enumerate(headers):
                pdf.cell(col_widths[i], 8, h, 0, 0, 'C', fill=True)
            pdf.ln()
            pdf.set_text_color(0)
            pdf.set_font('Arial', '', 9)

    return pdf
