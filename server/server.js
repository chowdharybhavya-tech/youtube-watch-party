const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// =====================================
// CORS
// =====================================

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// =====================================
// SOCKET.IO
// =====================================

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// =====================================
// ROOMS
// =====================================

const rooms = {};

// Generate 6-character room code
function generateRoomCode() {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}

// =====================================
// SOCKET CONNECTION
// =====================================

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  // =====================================
  // CREATE ROOM
  // =====================================

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
          username: username,
          role: "host",
        },
      ],

      // Default video
      videoId: "dQw4w9WgXcQ",

      // Playback state
      isPlaying: false,
      currentTime: 0,
    };

    socket.join(roomId);

    socket.roomId = roomId;
    socket.username = username;

    // Send room information to host
    socket.emit("room-created", {
      roomId: roomId,
      participants: rooms[roomId].participants,
      videoId: rooms[roomId].videoId,
      isPlaying: rooms[roomId].isPlaying,
      currentTime: rooms[roomId].currentTime,
    });

    console.log("✅ Room created:", roomId);
  });

  // =====================================
  // JOIN ROOM
  // =====================================

  socket.on("join-room", ({ roomId, username }) => {
    roomId = roomId.trim().toUpperCase();

    console.log(
      `🚪 ${username} trying to join room ${roomId}`
    );

    const room = rooms[roomId];

    if (!room) {
      socket.emit(
        "error-message",
        "Room does not exist"
      );
      return;
    }

    const participant = {
      id: socket.id,
      username: username,
      role: "participant",
    };

    room.participants.push(participant);

    socket.join(roomId);

    socket.roomId = roomId;
    socket.username = username;

    // Send complete current room state
    socket.emit("room-joined", {
      roomId: roomId,
      participants: room.participants,
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
    });

    // Tell everyone about participants
    io.to(roomId).emit(
      "participants-updated",
      room.participants
    );

    console.log(
      `✅ ${username} joined room ${roomId}`
    );
  });

  // =====================================
  // PLAYER READY
  // =====================================

  socket.on("player-ready", ({ roomId }) => {
    const room = rooms[roomId];

    if (!room) {
      return;
    }

    console.log(
      `🎬 Player ready: ${socket.id} in ${roomId}`
    );

    // Send latest room state to this player
    socket.emit("sync-video-state", {
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
    });
  });

  // =====================================
  // CHANGE VIDEO
  // =====================================

  socket.on(
    "change-video",
    ({ roomId, videoId }) => {
      const room = rooms[roomId];

      if (!room) {
        return;
      }

      // Only host can change video
      if (socket.id !== room.hostId) {
        console.log(
          "❌ Non-host tried to change video"
        );
        return;
      }

      console.log(
        `📺 Changing video in ${roomId}: ${videoId}`
      );

      // Update server state
      room.videoId = videoId;
      room.currentTime = 0;
      room.isPlaying = false;

      // Send new video to EVERYONE
      io.to(roomId).emit("video-changed", {
        videoId: videoId,
        currentTime: 0,
        isPlaying: false,
      });

      console.log(
        "✅ Video changed for everyone"
      );
    }
  );

  // =====================================
  // PLAY VIDEO
  // =====================================

  socket.on(
    "play-video",
    ({ roomId, currentTime }) => {
      const room = rooms[roomId];

      if (!room) {
        return;
      }

      // Only host controls playback
      if (socket.id !== room.hostId) {
        console.log(
          "❌ Participant tried to play video"
        );
        return;
      }

      // Update server state
      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      room.isPlaying = true;

      console.log(
        `▶️ PLAY ${roomId} at ${room.currentTime}`
      );

      // Send to everyone except host
      socket.to(roomId).emit(
        "video-play",
        {
          currentTime: room.currentTime,
        }
      );
    }
  );

  // =====================================
  // PAUSE VIDEO
  // =====================================

  socket.on(
    "pause-video",
    ({ roomId, currentTime }) => {
      const room = rooms[roomId];

      if (!room) {
        return;
      }

      // Only host controls playback
      if (socket.id !== room.hostId) {
        console.log(
          "❌ Participant tried to pause video"
        );
        return;
      }

      // Update server state
      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      room.isPlaying = false;

      console.log(
        `⏸️ PAUSE ${roomId} at ${room.currentTime}`
      );

      // Send to everyone except host
      socket.to(roomId).emit(
        "video-pause",
        {
          currentTime: room.currentTime,
        }
      );
    }
  );

  // =====================================
  // SEEK VIDEO
  // =====================================

  socket.on(
    "seek-video",
    ({ roomId, currentTime }) => {
      const room = rooms[roomId];

      if (!room) {
        return;
      }

      // Only host controls seeking
      if (socket.id !== room.hostId) {
        console.log(
          "❌ Participant tried to seek video"
        );
        return;
      }

      // Update server state
      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      console.log(
        `⏩ SEEK ${roomId} to ${room.currentTime}`
      );

      // Send seek position to everyone except host
      socket.to(roomId).emit(
        "video-seek",
        {
          currentTime: room.currentTime,
        }
      );
    }
  );

  // =====================================
  // CHAT
  // =====================================

  socket.on(
    "send-message",
    ({ roomId, username, message }) => {
      const room = rooms[roomId];

      if (!room) {
        return;
      }

      const chatMessage = {
        id: Date.now(),
        username: username,
        message: message,
      };

      io.to(roomId).emit(
        "receive-message",
        chatMessage
      );
    }
  );
  // =====================================
// LEAVE ROOM
// =====================================

socket.on("leave-room", () => {
  const roomId = socket.roomId;

  if (!roomId) {
    return;
  }

  const room = rooms[roomId];

  if (!room) {
    return;
  }

  console.log(
    `🚪 ${socket.username} leaving room ${roomId}`
  );

  // If host leaves, close room
  if (socket.id === room.hostId) {
    io.to(roomId).emit(
      "error-message",
      "Host left the room. Room closed."
    );

    delete rooms[roomId];

    socket.leave(roomId);
    socket.roomId = null;

    console.log(
      `❌ Room ${roomId} deleted`
    );

    return;
  }

  // Remove participant
  room.participants =
    room.participants.filter(
      (participant) =>
        participant.id !== socket.id
    );

  socket.leave(roomId);
  socket.roomId = null;

  // Update remaining users
  io.to(roomId).emit(
    "participants-updated",
    room.participants
  );

  console.log(
    `👋 ${socket.username} left ${roomId}`
  );
});

  // =====================================
  // DISCONNECT
  // =====================================

  socket.on("disconnect", () => {
    console.log(
      "🔴 Disconnected:",
      socket.id
    );

    const roomId = socket.roomId;

    if (!roomId) {
      return;
    }

    const room = rooms[roomId];

    if (!room) {
      return;
    }

    // =====================================
    // HOST LEFT
    // =====================================

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

    // =====================================
    // PARTICIPANT LEFT
    // =====================================

    room.participants =
      room.participants.filter(
        (participant) =>
          participant.id !== socket.id
      );

    io.to(roomId).emit(
      "participants-updated",
      room.participants
    );

    console.log(
      `👋 Participant left ${roomId}`
    );
  });
});

// =====================================
// BASIC ROUTE
// =====================================

app.get("/", (req, res) => {
  res.send(
    "🎬 YouTube Watch Party Server Running"
  );
});

// =====================================
// START SERVER
// =====================================

const PORT = 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  );
});