FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Auto-install ALL system deps for Chromium, then install the browser
RUN playwright install-deps chromium && playwright install chromium

# Download Google Fonts for PDF generation
COPY download_fonts.py .
RUN python download_fonts.py || true

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
