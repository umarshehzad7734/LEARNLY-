FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Pre-create directories for persistence
RUN mkdir -p /app/uploads /app/vector_stores && chmod 777 /app/uploads /app/vector_stores

# Copy requirements and install dependencies
COPY requirements.txt .
# Use BuildKit cache and performance flags for faster repeated installs
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install --prefer-binary --timeout 100 -r requirements.txt

# Copy application code last (most frequent changes)
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

