# Real-Time Chat Application (React & FastAPI + SQLite)

## 📝 Project Description

This is a simple, real-time web chat application built using **React** for the user interface and **FastAPI** with **SQLite** for the backend. Users can create or join chat rooms by entering a room name and nickname. All users in the same room share the conversation in real-time via WebSockets.

Originally, the app used **Firebase Firestore** for data storage and real-time sync. It has been migrated to a self-hosted backend for better control, cost savings, and to avoid vendor lock-in.

## ✨ Key Features

* **Real-Time Messaging:** Messages are synchronized instantly among users via WebSockets.
* **Dynamic Room Joining:** Join any chat room by typing a name. Rooms are created on-the-fly.
* **Nickname-Based Access:** Choose a nickname; duplicates in the same room are prevented. Nicknames with spaces are converted to underscores, and vulgar words are blocked.
* **User Color Coding:** Each user's nickname has a unique color for easy identification.
* **Cooldown System:** After leaving a room, the same nickname can't be reused in that room for 30 minutes.
* **Keyboard Shortcuts:** Press Enter to send a message; Shift+Enter for new lines.
* **Responsive Design:** Clean UI adaptable to desktop and mobile.

## 🔄 Migration from Firebase

### What It Did Before
- Used Firebase Firestore for storing messages, active users, and session data.
- Real-time updates via Firestore's `onSnapshot`.
- Authentication was implicit via Firebase tokens.
- Data was cloud-hosted, with costs scaling with usage.

### What Changed
- **Backend:** Replaced Firestore with a FastAPI server using SQLite for local data storage.
- **Real-Time:** Switched from Firestore listeners to WebSockets for instant message broadcasting.
- **Authentication:** Custom nickname-based system with checks for duplicates and cooldowns.
- **Data Persistence:** SQLite database for messages, active users, and room sessions.
- **Deployment:** Self-hosted via Docker, eliminating Firebase dependencies.

### Benefits of the Change
- **Cost:** No Firebase bills; runs on any server.
- **Control:** Full ownership of data and code.
- **Performance:** Direct WebSocket connections for real-time chat.
- **Privacy:** Data stays local or on your server.

## 🚀 How to Run the App

### Prerequisites
- Docker and Docker Compose installed.

### Quick Start with Docker
1. Clone the repo: `git clone <repo-url>`
2. Navigate to the project: `cd reafirechat`
3. Run with Docker Compose: `docker-compose up --build`
4. Open your browser to `http://localhost:3000` (frontend) and `http://localhost:8000` (backend API, if needed).

### Local Network Deployment
For multiple users on the same local network (e.g., home Wi-Fi):
1. Run `docker-compose up` on your machine.
2. Find your machine's local IP (e.g., 192.168.1.100) with `hostname -I` or `nmcli` on Linux, `ifconfig` on macOS, or `ipconfig` on Windows.
3. Users on the same network access `http://your-local-ip:3000` to chat in real-time.

This demonstrates Docker containerization for multi-device access on a shared network.

### Local Development
1. **Backend:**
   - `cd backend`
   - `python3 -m venv venv && source venv/bin/activate`
   - `pip install -r requirements.txt`
   - `uvicorn main:app --reload`

2. **Frontend:**
   - `npm install`
   - `npm start`


## 🏗️ Architecture

- **Frontend:** React app with components for Auth, Chat, and Theme.
- **Backend:** FastAPI with SQLAlchemy (SQLite), WebSockets for real-time, and REST APIs.
- **Database:** SQLite file (`chat.db`) with tables for messages, active_users, room_sessions.

## 📋 API Endpoints

- `GET /messages/{room}`: Fetch messages for a room.
- `POST /messages`: Send a message.
- `GET /active_users/{room}/{nick}`: Check if nickname is taken.
- `POST /active_users`: Join with nickname.
- `DELETE /active_users/{room}/{nick}`: Leave room.
- `GET /room_sessions/{nick}/{room}`: Get last exit time.
- `POST /room_sessions`: Update last exit.
- `WebSocket /ws/{room}`: Real-time message updates.

## 🤝 Contributing

Feel free to fork and improve! Open issues for bugs or features.

## 📄 License

MIT License.
