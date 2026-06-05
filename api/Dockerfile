FROM python:3.11-slim

WORKDIR /app

# Install backend dependencies
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY api/ ./api
COPY src/ ./src
COPY config/ ./config
COPY data/ ./data

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]