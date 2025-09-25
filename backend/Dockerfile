# syntax=registry.buildkit.org/docker/dockerfile:1

# ---------- Builder ----------
FROM python:3.11-slim AS builder
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN python -m pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt

# ---------- Runtime ----------
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

# minimal runtime libs; add others if your deps need them
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 tzdata curl \
 && rm -rf /var/lib/apt/lists/*

# non-root user
RUN useradd -m -u 10001 app
WORKDIR /app

# bring installed packages from builder
COPY --from=builder /install /usr/local

# app code
COPY . .

EXPOSE 8000

# healthcheck expects /health in your app; adjust if different
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

USER app

# run EXACTLY like you do locally: uvicorn main:app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]