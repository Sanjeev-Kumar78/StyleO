FROM python:3.11-slim

WORKDIR /app

# System deps (important for some Python libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc g++ curl \
 && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install --no-cache-dir uv

# Install dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy app code
COPY . .

EXPOSE 8080
