FROM python:3.11-slim

WORKDIR /app

# System dependencies for SQLite and curl (for healthcheck)
RUN apt-get update && apt-get install -y \
    sqlite3 \
    libsqlite3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project
COPY . .

# Set working directory to backend
WORKDIR /app/backend

# Expose FastAPI port
EXPOSE 8000

# Health check — /health endpoint exists in main.py
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run FastAPI with 1 worker (SQLite is not safe with multiple processes)
# --proxy-headers + --forwarded-allow-ips ensures correct client IPs behind Render's proxy
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*", \
     "--log-level", "info"]
