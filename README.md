# ReactFireChat (React + FastAPI)

A modern, lightweight real-time chat application. Originally built with Firebase, now completely refactored to a robust **FastAPI** backend with **PostgreSQL** persistence and **WebSocket** real-time communication.

🚀 **[Live Demo: https://reactfirechat.onrender.com\]\(https://reactfirechat.onrender.com/\)\*\*

> **Note:** The application runs on Render's Free Tier. If you are the first visitor in a while, please allow **30-50 seconds** for the services to spin up.

---

## 🏗️ Architecture & Refactor

This project started as a serverless experiment using Firebase Realtime Database. To gain more control over the infrastructure, improve performance, and learn modern backend patterns, it was migrated to a containerized microservices architecture.

### **The Migration (Firebase ➔ FastAPI)**
- **Old Architecture:** React directly querying Firebase (client-heavy logic).
- **New Architecture:** 
  - **Frontend:** React application serves as a dumb client, communicating via REST and WebSockets.
  - **Backend:** Python FastAPI handles business logic, validation, and state management.
  - **Persistence:** SQLAlchemy with PostgreSQL (Production) or SQLite (Local).
  - **Real-time:** Native WebSockets replacing Firebase listeners.

### **Current System Design**
The application is deployed as two separate Docker services on Render.com:
1.  **Frontend Service:** Nginx/Node container serving the React SPA.
2.  **Backend Service:** Python container running FastAPI with Uvicorn/Gunicorn.
3.  **Database:** Managed PostgreSQL instance.

---

## ✨ Features

- **Real-Time Communication:** Instant message delivery via WebSockets.
- **Room-Based Chat:** Dynamic room creation—just enter a room name to join.
- **Mobile Optimized:** Full-screen responsive design with touch-friendly controls.
- **Session Management:** Unique nickname enforcement per room.
- **Security & Anti-Spam:**
    - Input validation and sanitization.
    - Bad word filtering.
    - Rate limiting protection.
    - Automatic cleanup of inactive users.
- **Visuals:** Auto-generated avatar colors based on nickname hash.

---

## 🛠️ Tech Stack

### **Frontend**
- **Library:** React 18
- **Styling:** SCSS, Material-UI (MUI)
- **State:** React Hooks + WebSocket Event Listeners
- **Build Tool:** Create React App (Dockerized with multi-stage build)

### **Backend**
- **Framework:** FastAPI (Python 3.11)
- **ASGI Server:** Uvicorn + Gunicorn
- **ORM:** SQLAlchemy
- **Database:** PostgreSQL (Prod) / SQLite (Dev)
- **Protocol:** REST API + WebSocket

### **DevOps**
- **Containerization:** Docker & Docker Compose
- **Hosting:** Render.com (Web Services + Managed DB)
- **Config:** Dynamic runtime configuration via Entrypoint scripts

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
