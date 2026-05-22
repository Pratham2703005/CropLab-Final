FROM python:3.11-slim

WORKDIR /app

# curl is needed for the compose healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a non-root user; it must own /app so the app can write to cache/
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

ENV PYTHONUNBUFFERED=1
# Default port for local/compose; hosts like Render override $PORT at runtime.
ENV PORT=8000

EXPOSE 8000

# Entry file is app.py with `app = FastAPI()` -> app:app.
# sh -c expands ${PORT} (Render injects its own $PORT); exec replaces the
# shell so uvicorn is PID 1 and receives SIGTERM/SIGINT for clean shutdown.
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
