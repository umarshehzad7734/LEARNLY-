#!/bin/bash
# Learnly Docker Compose Startup Script with Enhanced RAG

echo "🚀 Starting Learnly with Enhanced RAG Features..."
echo ""

# Stop any existing containers
echo "📦 Stopping existing containers..."
docker-compose down

# Build with no cache to ensure all new dependencies are installed
echo "🔨 Building containers with latest dependencies..."
docker-compose build --no-cache

# Start all services
echo "▶️  Starting all services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check Ollama and pull required models
echo "🤖 Setting up Ollama models..."
docker exec learnly_ollama ollama pull llama3.2
docker exec learnly_ollama ollama pull nomic-embed-text

# Run database migrations
echo "💾 Running database migrations..."
docker exec learnly_backend alembic upgrade head

echo ""
echo "✅ Learnly is ready!"
echo ""
echo "📍 Access points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   Ollama:    http://localhost:11434"
echo ""
echo "📊 Check logs:"
echo "   docker-compose logs -f backend"
echo "   docker-compose logs -f frontend"
echo "   docker-compose logs -f ollama"
echo ""
echo "🛑 To stop: docker-compose down"
