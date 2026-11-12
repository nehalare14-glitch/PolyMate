# PolyMate

PolyMate is a diploma education platform designed
for polytechnic students and faculty in Telangana.

## Features

- Student and faculty dashboards
- Firebase authentication
- Study materials and question papers
- PDF upload and preview
- Student bookmarks
- Faculty management
- AI-powered learning assistant
- Automatic multi-model AI routing

## Technology Stack

### Frontend
- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Lucide React

### Backend
- Python
- Flask
- Firebase Admin SDK

### Database and Storage
- Supabase PostgreSQL
- Supabase Storage

### AI Assistant
- Ollama
- Qwen2.5 0.5B - Fast answers
- Qwen2.5 1.5B - Balanced answers
- Qwen3 4B Instruct - Advanced answers

### Deployment
- Frontend: Vercel
- Backend: Render
- AI: Local Ollama (separate hosting required
  for public deployment)

## Project Structure

- frontend/ - Next.js application
- backend/ - Flask API and AI services

## Security

Environment variables and private credentials
are excluded from version control.

## Local Development

Configure Firebase, Supabase and Ollama before
starting the frontend and backend servers.
