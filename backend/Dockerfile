FROM python:3.11-slim

# System deps for OpenOA (scipy, shapely, pygam, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ gfortran libgeos-dev libproj-dev git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install OpenOA library first (cached layer)
COPY OpenOA/ /app/OpenOA/

# Fix: setuptools find config only lists top-level packages, need to include subpackages
RUN cd /app/OpenOA && \
    sed -i 's/include = \["openoa", "test", "examples"\]/include = ["openoa", "openoa.*", "test", "examples"]/' pyproject.toml && \
    pip install --no-cache-dir .

# Install backend deps
COPY openoa-app/backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend source
COPY openoa-app/backend/ /app/backend/

# Copy example data (needed for demo dataset)
COPY OpenOA/examples/ /app/OpenOA/examples/

ENV PYTHONPATH=/app/backend
ENV OPENOA_ROOT=/app/OpenOA
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
