const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://youtube-watch-party-swart.vercel.app",
  "https://youtube-watch-party-gpd05qzpo-chowdharybhavya-techs-projects.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"],
});

const rooms = {};

function generateRoomCode() {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("create-room", ({ username }) => {
    console.log("🏠 Creating room for:", username);

    let roomId;

    do {
      roomId = generateRoomCode();
    } while (rooms[roomId]);

    rooms[roomId] = {
      hostId: socket.id,
      participants: [
        {
          id: socket.id,
          username,
          role: "host",
        },
      ],
      videoId: "dQw4w9WgXcQ",
      isPlaying: false,
      currentTime: 0,
    };

    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    socket.emit("room-created", {
      roomId,
      participants: rooms[roomId].participants,
      videoId: rooms[roomId].videoId,
      isPlaying: rooms[roomId].isPlaying,
      currentTime: rooms[roomId].currentTime,
    });

    console.log("✅ Room created:", roomId);
  });

  socket.on("join-room", ({ roomId, username }) => {
    roomId = roomId.trim().toUpperCase();

    console.log(`${username} trying to join ${roomId}`);

    const room = rooms[roomId];

    if (!room) {
      socket.emit("error-message", "Room does not exist");
      return;
    }

    const participant = {
      id: socket.id,
      username,
      role: "participant",
    };

    room.participants.push(participant);

    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;

    socket.emit("room-joined", {
      roomId,
      participants: room.participants,
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
    });

    io.to(roomId).emit(
      "participants-updated",
      room.participants
    );

    console.log(`✅ ${username} joined ${roomId}`);
  });

  socket.on("player-ready", ({ roomId }) => {
    const room = rooms[roomId];

    if (!room) return;

    socket.emit("sync-video-state", {
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
    });
  });

  socket.on(
    "change-video",
    ({ roomId, videoId }) => {
      const room = rooms[roomId];

      if (!room) return;

      if (socket.id !== room.hostId) {
        return;
      }

      room.videoId = videoId;
      room.currentTime = 0;
      room.isPlaying = false;

      io.to(roomId).emit("video-changed", {
        videoId: room.videoId,
        currentTime: 0,
        isPlaying: false,
      });

      console.log(
        `📺 Video changed in ${roomId}: ${videoId}`
      );
    }
  );

  socket.on(
    "play-video",
    ({ roomId, currentTime }) => {
      const room = rooms[roomId];

      if (!room) return;

      if (socket.id !== room.hostId) {
        return;
      }

      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      room.isPlaying = true;

      socket.to(roomId).emit("video-play", {
        currentTime: room.currentTime,
      });

      console.log(
        `▶️ PLAY ${roomId} at ${room.currentTime}`
      );
    }
  );

  socket.on(
    "pause-video",
    ({ roomId, currentTime }) => {
      const room = rooms[roomId];

      if (!room) return;

      if (socket.id !== room.hostId) {
        return;
      }

      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      room.isPlaying = false;

      socket.to(roomId).emit("video-pause", {
        currentTime: room.currentTime,
      });

      console.log(
        `⏸️ PAUSE ${roomId} at ${room.currentTime}`
      );
    }
  );

  socket.on(
    "seek-video",
    ({ roomId, currentTime }) => {
      const room = rooms[roomId];

      if (!room) return;

      if (socket.id !== room.hostId) {
        return;
      }

      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      socket.to(roomId).emit("video-seek", {
        currentTime: room.currentTime,
      });

      console.log(
        `⏩ SEEK ${roomId} to ${room.currentTime}`
      );
    }
  );

  socket.on(
    "send-message",
    ({ roomId, username, message }) => {
      const room = rooms[roomId];

      if (!room) return;

      const chatMessage = {
        id: Date.now(),
        username,
        message,
      };

      io.to(roomId).emit(
        "receive-message",
        chatMessage
      );
    }
  );

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);

    const roomId = socket.roomId;

    if (!roomId) return;

    const room = rooms[roomId];

    if (!room) return;

    if (socket.id === room.hostId) {
      io.to(roomId).emit(
        "error-message",
        "Host left the room. Room closed."
      );

      delete rooms[roomId];

      console.log(
        `❌ Room ${roomId} deleted`
      );

      return;
    }

    room.participants =
      room.participants.filter(
        (participant) =>
          participant.id !== socket.id
      );

    io.to(roomId).emit(
      "participants-updated",
      room.participants
    );
  });
});

app.get("/", (req, res) => {
  res.send(
    "🎬 YouTube Watch Party Server Running"
  );
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    socketio: true,
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});