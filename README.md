# PolyChat 🌐💬  
**Real-time multilingual chat application with AI-powered translation**

🚀 **[Live Demo](https://polychat-translation.vercel.app/profile)**

[![GitHub license](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)

## Features ✨
- **Real-time multilingual messaging** with <1s translation-reception latency
- **Gemini 2.0 Flash integration** for accurate message translation
- Supports **10+ languages** with 96%+ translation accuracy
- **Socket.io** for instant message delivery
- **MongoDB** for persistent chat history
- Responsive **React** frontend with modern UI

## Tech Stack 🛠️
| Category       | Technologies |
|----------------|-------------|
| **Frontend**   | React, Socket.io-client |
| **Backend**    | Node.js, Express, Socket.io |
| **AI**         | Gemini Pro API |
| **Database**   | MongoDB |
| **DevOps**     | Git, GitHub 

## Installation ⚙️


### Local Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/polychat.git
cd polychat

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Set up environment variables
# Backend (.env in server folder)
cd ../server
cp .env.example .env
# Edit .env and add your values:
# PORT=8747
# JWT_KEY=your_secure_random_string
# ORIGIN=http://localhost:5173
# DATABASE_URL=your_mongodb_connection_string
# GEMINI_API_KEY=your_gemini_api_key

# Frontend (.env in client folder)
cd ../client
cp .env.example .env
# Edit .env and add:
# VITE_SERVER_URL=http://localhost:8747

# Run backend server (from server folder)
cd ../server
npm start
# or for development with auto-reload:
npm run dev

# Run frontend (from client folder, in a new terminal)
cd ../client
npm run dev
```

## Deployment 🚀

This application is ready for deployment with:
- **Backend**: Render.com (or any Node.js hosting)
- **Frontend**: Vercel (or Netlify)

📖 **Deployment Guides:**
- [Complete Deployment Guide](./DEPLOYMENT.md) - Full detailed guide
- [Render Backend Guide](./RENDER_DEPLOYMENT.md) - Deploy backend first
- [Vercel Frontend Guide](./VERCEL_DEPLOYMENT.md) - Deploy frontend second

### Quick Deployment Steps:
1. 🔧 Deploy backend on Render first → [Guide](./RENDER_DEPLOYMENT.md)
2. 🔗 Get backend URL and update frontend environment variable
3. 🎨 Deploy frontend on Vercel → [Guide](./VERCEL_DEPLOYMENT.md)
4. ✅ Update backend CORS settings with frontend URL

## Environment Variables 🔐

### Backend (server/.env)
```env
PORT=8747
JWT_KEY=your_jwt_secret_key_here
ORIGIN=http://localhost:5173,https://your-frontend-url.vercel.app
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname
GEMINI_API_KEY=your_gemini_api_key_here
```

### Frontend (client/.env)
```env
VITE_SERVER_URL=http://localhost:8747
# For production: https://your-backend-url.onrender.com
```


