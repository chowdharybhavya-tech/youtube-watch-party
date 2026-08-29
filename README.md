# 🎬 YouTube Watch Party

A real-time YouTube Watch Party web application that allows multiple users to watch YouTube videos together in a shared room.

Users can create or join a room using a unique room code. The host can control video playback, while all participants receive synchronized play, pause, and seek updates in real time.

The application also includes real-time chat and a role-based moderation system where the host can assign moderators and moderators can remove participants.

---

## 🚀 Live Demo

**Frontend:**  
https://youtube-watch-party-swart.vercel.app/

**Backend:**  
https://youtube-watch-party-bejz.onrender.com

**GitHub:**  
https://github.com/chowdharybhavya-tech/youtube-watch-party.git

---

## ✨ Features

### 🏠 Room Management
- Create a new watch party room
- Automatically generate a unique room code
- Join an existing room using the room code
- Copy room code to invite other users
- Leave the room

### 🎥 Synchronized YouTube Player
- YouTube video playback
- Host can play the video
- Host can pause the video
- Host can seek to a different time
- Host can change the YouTube video
- Video state is synchronized between participants

### 👥 Participant Management
- Real-time participant list
- Shows the number of participants
- Displays user roles:
  - 👑 Host
  - 🛡️ Moderator
  - 👤 Participant

### 🛡️ Moderation
- Host can make a participant a moderator
- Host can remove moderator privileges
- Host can remove participants
- Moderators can remove normal participants
- Moderators cannot remove the host
- Moderators cannot remove other moderators

### 💬 Real-Time Chat
- Users can send messages inside the room
- Messages are delivered instantly to all room members

### 🔄 Real-Time Communication
The application uses Socket.IO to communicate between users in real time.

---

# 🛠️ Tech Stack

## Frontend

- **React.js** – Building the user interface
- **JavaScript** – Application logic
- **Vite** – Frontend development and build tool
- **CSS** – Styling and responsive layout
- **Socket.IO Client** – Real-time communication
- **YouTube IFrame API** – YouTube video playback

## Backend

- **Node.js** – JavaScript runtime
- **Express.js** – Backend server and HTTP routes
- **Socket.IO** – Real-time communication
- **CORS** – Allows communication between frontend and backend

## Deployment

- **Vercel** – Frontend deployment
- **Render** – Backend deployment

---

# 📂 Project Structure

```text
youtube-watch-party/
│
├── client/
│   │
│   ├── src/
│   │   ├── components/
│   │   │   └── YouTubePlayer.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── socket.js
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── ...
│
├── server/
│   │
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── README.md
└── .gitignore


## ▶️ How to Run Locally

### Backend

```bash
cd server
npm install
node server.js

### Frontend

cd client
npm install
npm run dev