# Learnly - AI-Powered Learning Management System 🎓

A modern, cloud-powered learning management system with AI-driven features including quiz generation, intelligent tutoring, and automated content analysis.

## 🌟 Features

- **AI Chat Assistant**: Groq-powered intelligent tutoring for students and teachers
- **Smart Quiz Generation**: Automated quiz creation from course materials with pedagogical insights
- **Course Management**: Complete course creation, material upload, and student enrollment
- **RAG (Retrieval-Augmented Generation)**: Context-aware AI responses based on course content
- **Content Moderation**: Built-in content safety checks
- **Analytics Dashboard**: Track student performance and course analytics
- **Google OAuth**: Secure authentication with Google
- **Real-time Updates**: Live progress tracking and notifications

## 🏗️ Architecture

**Frontend**: React + Vite + TailwindCSS  
**Backend**: FastAPI + Python 3.11  
**Database**: MongoDB Atlas (Cloud)  
**AI Provider**: Groq Cloud (Llama 3.1 models)  
**Embeddings**: Hugging Face API  
**Deployment**: Docker + Docker Compose

## 📋 Prerequisites

Before you begin, ensure you have:

- **Docker Desktop** installed and running ([Download](https://www.docker.com/products/docker-desktop))
- **Git** for version control
- **API Keys**:
  - [Groq API Key](https://console.groq.com/) (for AI chat & quiz generation)
  - [Hugging Face API Key](https://huggingface.co/settings/tokens) (for embeddings)
  - [Google OAuth Credentials](https://console.cloud.google.com/) (for authentication)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Learnly-2025
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB (Already configured with cloud instance)
MONGODB_URL=

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# AI Services (REQUIRED)
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL=llama-3.1-8b-instant
HUGGINGFACE_API_KEY=your-huggingface-api-key-here
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Frontend
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
```

### 3. Start the Application

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. Stop the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean reset)
docker-compose down -v
```

## 🎯 First-Time Setup

1. **Open the app** at http://localhost:3000
2. **Sign in with Google** (or create an account)
3. **Create a course** (teacher role required)
4. **Upload materials** (PDF, PPTX, DOCX supported)
5. **Generate quizzes** using AI
6. **Chat with AI tutor** about course content

## 🛠️ Development

### Project Structure

```
Learnly-2025/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   └── core/        # Config & security
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   └── utils/       # Utilities & API client
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml   # Docker orchestration
├── .env                 # Environment variables
└── README.md           # This file
```

### Running Services Individually

**Backend only:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend only:**
```bash
cd frontend
npm install
npm run dev
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# View backend logs only
docker logs learnly_backend

# View frontend logs only
docker logs learnly_frontend

# Follow logs in real-time
docker logs -f learnly_backend
```

## 🔧 Troubleshooting

### Container Fails to Start

```bash
# Check container status
docker ps -a

# View specific container logs
docker logs learnly_backend --tail 50

# Restart a specific service
docker-compose restart backend
```

### Database Connection Issues

- Ensure MongoDB URL in `.env` is correct
- Check if network is stable (using cloud MongoDB)

### Port Already in Use

```bash
# Stop the conflicting service or change ports in docker-compose.yml
# Frontend: change '3000:3000' to '3001:3000'
# Backend: change '8000:8000' to '8001:8000'
```

### API Keys Not Working

1. Verify keys are correctly added to `.env`
2. Restart services: `docker-compose restart`
3. Check API provider dashboards for rate limits

### Frontend Can't Connect to Backend

1. Ensure `VITE_API_URL=http://localhost:8000` in `.env`
2. Verify backend is running: `curl http://localhost:8000/health`
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

- `POST /auth/google` - Google OAuth login
- `GET /courses` - List all courses
- `POST /quiz/generate` - Generate AI quiz
- `POST /rag/query` - Chat with AI tutor
- `POST /courses/:id/materials` - Upload course material

## 🤖 AI Features

### Quiz Generation

Powered by **Groq's Llama 3.1-8b-instant** model:
- Generates pedagogically sound questions
- Supports easy/medium/hard difficulty levels
- Provides explanations and source context
- Covers material comprehensively

### AI Chat Tutor

Uses **RAG (Retrieval-Augmented Generation)**:
- Answers questions based on course materials
- Provides sources for transparency
- Maintains conversation context
- Content moderation for safety

### Document Processing

- Supports: PDF, PPTX, DOCX, TXT, MD
- Intelligent chunking strategies
- Vector embeddings for semantic search
- FAISS vector store for fast retrieval

## 🔒 Security

- **JWT Authentication**: Secure token-based auth
- **Google OAuth2**: Industry-standard SSO
- **Content Moderation**: Automated safety checks
- **Input Validation**: Pydantic models
- **CORS Protection**: Configured origins

## 📊 Supported File Formats

| Type | Formats | Max Size |
|------|---------|----------|
| Documents | PDF, DOCX, TXT, MD | 50 MB |
| Presentations | PPTX | 50 MB |
| Spreadsheets | XLSX | 50 MB |
| Images | JPG, PNG | 10 MB |

## 🌐 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URL` | MongoDB connection string | Yes | (cloud configured) |
| `JWT_SECRET` | Secret for JWT tokens | Yes | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes | - |
| `GROQ_API_KEY` | Groq AI API key | Yes | - |
| `HUGGINGFACE_API_KEY` | HuggingFace API key | Yes | - |
| `VITE_API_URL` | Backend API URL | Yes | http://localhost:8000 |

## 💡Tips & Best Practices

1. **Always use `.env` file** - Never commit API keys to Git
2. **Monitor Groq usage** - Free tier has rate limits
3. **Upload indexed materials first** - For better AI responses
4. **Use specific queries** - More context = better AI answers
5. **Check logs regularly** - `docker logs` helps debug issues

## 📝 License

This project is part of a Final Year Project (FYP).

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check Docker logs for errors
4. Verify all environment variables

---

**Built with ❤️ using Groq AI, FastAPI, React, and Docker**
