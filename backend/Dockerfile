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

# Listens on IPv4 and IPv6 on $PORT (Railway's healthcheck uses IPv4, private networking may use IPv6).
# Plain `uvicorn --host ::` would be IPv6-only; see app/serve.py.
CMD ["python", "-m", "app.serve"]
