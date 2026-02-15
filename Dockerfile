# ============================================================
# Self-contained Dockerfile for cloud deployment (Render, etc.)
# Single container: FastAPI backend + React frontend + Nginx
# ============================================================

# --- Stage 1: Build React frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# --- Stage 2: Python backend + Nginx ---
FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ gfortran libgeos-dev libproj-dev git \
    nginx supervisor curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install OpenOA (bundled in repo)
COPY OpenOA/ /app/OpenOA/
RUN cd /app/OpenOA && \
    sed -i 's/include = \["openoa", "test", "examples"\]/include = ["openoa", "openoa.*", "test", "examples"]/' pyproject.toml && \
    pip install --no-cache-dir .

# Install backend deps
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend source
COPY backend/ /app/backend/

# Copy built frontend to Nginx
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default
# Also ensure no default server block in main nginx.conf
RUN sed -i '/include \/etc\/nginx\/sites-enabled/d' /etc/nginx/nginx.conf
# Use localhost instead of Docker service name for single-container
RUN sed -i 's/backend:8000/127.0.0.1:8000/g' /etc/nginx/conf.d/default.conf \
    && sed -i 's/backend_server/backend_local/g' /etc/nginx/conf.d/default.conf

# Supervisor config (runs both Nginx + Uvicorn)
# Use envsubst to inject PORT at runtime for Railway/Render compatibility
RUN cat > /etc/supervisor/conf.d/app.conf << 'EOF'
[supervisord]
nodaemon=true
logfile=/var/log/supervisord.log

[program:backend]
command=uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 --timeout-keep-alive 300 --limit-max-requests 50
directory=/app/backend
environment=PYTHONPATH="/app/backend",OPENOA_ROOT="/app/OpenOA"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

# Create entrypoint script that injects PORT into nginx config at runtime
RUN cat > /app/entrypoint.sh << 'SCRIPT'
#!/bin/bash
# Default to port 80 if PORT not set (local Docker)
export PORT=${PORT:-80}
# Replace listen port in nginx config
sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/conf.d/default.conf
exec supervisord -c /etc/supervisor/supervisord.conf
SCRIPT
RUN chmod +x /app/entrypoint.sh

ENV PYTHONPATH=/app/backend
ENV OPENOA_ROOT=/app/OpenOA

EXPOSE 80

CMD ["/app/entrypoint.sh"]
