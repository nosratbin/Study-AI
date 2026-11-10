# Production image for the FastAPI backend (used by Railway; works on any container host).
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN useradd --create-home --uid 10001 app && chown -R app /app
USER app

# "::" listens on IPv4 and IPv6 (Railway private networking). --proxy-headers makes the
# rate limiter see the visitor's IP from X-Forwarded-For instead of the proxy's.
CMD ["sh", "-c", "exec uvicorn app.main:app --host :: --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
