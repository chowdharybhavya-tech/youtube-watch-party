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
    origin: "*",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// =====================================
// SOCKET.IO
// =====================================

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["polling", "websocket"],
});

// =====================================
// ROOMS
// =====================================

const rooms = {};

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

      videoId: "dQw4w9WgXcQ",
      isPlaying: false,
      currentTime: 0,
    };

    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    socket.role = "host";

    socket.emit("room-created", {
      roomId,
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

    console.log(`🚪 ${username} trying to join ${roomId}`);

    const room = rooms[roomId];

    if (!room) {
      socket.emit("error-message", "Room does not exist");
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
    socket.role = "participant";

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

  // =====================================
  // MAKE MODERATOR
  // =====================================

  socket.on(
    "make-moderator",
    ({ roomId, participantId }) => {
      const room = rooms[roomId];

      if (!room) {
        return;
      }

      // Only host can make someone moderator
      if (socket.id !== room.hostId) {
        console.log(
          "❌ Non-host tried to make moderator"
        );
        return;
      }

      const participant = room.participants.find(
        (p) => p.id === participantId
      );

      if (!participant) {
        return;
      }

      // Don't change host role
      if (participant.id === room.hostId) {
        return;
      }

      participant.role = "moderator";

      console.log(
        `🛡️ ${participant.username} is now moderator`
      );

      io.to(roomId).emit(
        "participants-updated",
        room.participants
      );
    }
  );

  // =====================================
  // REMOVE MODERATOR
  // =====================================

  socket.on(
    "remove-moderator",
    ({ roomId, participantId }) => {
      const room = rooms[roomId];

      if (!room) {
        return;
      }

      // Only host can remove moderator role
      if (socket.id !== room.hostId) {
        return;
      }

      const participant = room.participants.find(
        (p) => p.id === participantId
      );

      if (!participant) {
        return;
      }

      participant.role = "participant";

      console.log(
        `👤 ${participant.username} is no longer moderator`
      );

      io.to(roomId).emit(
        "participants-updated",
        room.participants
      );
    }
  );

  // =====================================
  // REMOVE PARTICIPANT
  // =====================================

  socket.on(
    "remove-participant",
    ({ roomId, participantId }) => {
      const room = rooms[roomId];

      if (!room) {
        return;
      }

      // Host or moderator can remove participant
      const currentUser = room.participants.find(
        (p) => p.id === socket.id
      );

      if (
        !currentUser ||
        (currentUser.role !== "host" &&
          currentUser.role !== "moderator")
      ) {
        console.log(
          "❌ User is not allowed to remove participants"
        );
        return;
      }

      // Cannot remove the host
      if (participantId === room.hostId) {
        return;
      }

      const participant = room.participants.find(
        (p) => p.id === participantId
      );

      if (!participant) {
        return;
      }

      // Moderator cannot remove another moderator
      if (
        currentUser.role === "moderator" &&
        participant.role === "moderator"
      ) {
        return;
      }

      room.participants = room.participants.filter(
        (p) => p.id !== participantId
      );

      io.to(roomId).emit(
        "participants-updated",
        room.participants
      );

      io.to(participantId).emit(
        "removed-from-room",
        "You have been removed from the room by a moderator."
      );

      const targetSocket = io.sockets.sockets.get(
        participantId
      );

      if (targetSocket) {
        targetSocket.leave(roomId);
        targetSocket.roomId = null;
      }

      console.log(
        `🚫 ${participant.username} removed from ${roomId}`
      );
    }
  );

  // =====================================
  // PLAYER READY
  // =====================================

  socket.on("player-ready", ({ roomId }) => {
    const room = rooms[roomId];

    if (!room) {
      return;
    }

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
        return;
      }

      room.videoId = videoId;
      room.currentTime = 0;
      room.isPlaying = false;

      io.to(roomId).emit(
        "video-changed",
        {
          videoId: room.videoId,
          currentTime: 0,
          isPlaying: false,
        }
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
        return;
      }

      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      room.isPlaying = true;

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
        return;
      }

      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      room.isPlaying = false;

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
        return;
      }

      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

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
        username,
        message,
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

    // Host leaves → close room
    if (socket.id === room.hostId) {
      io.to(roomId).emit(
        "error-message",
        "Host left the room. Room closed."
      );

      delete rooms[roomId];

      socket.leave(roomId);
      socket.roomId = null;

      console.log(`❌ Room ${roomId} deleted`);

      return;
    }

    // Participant/moderator leaves
    room.participants =
      room.participants.filter(
        (participant) =>
          participant.id !== socket.id
      );

    socket.leave(roomId);
    socket.roomId = null;

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

    // Host disconnected
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

    // Participant/moderator disconnected
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

// =====================================
// BASIC ROUTE
// =====================================

app.get("/", (req, res) => {
  res.send(
    "🎬 YouTube Watch Party Server Running"
  );
});

// =====================================
// HEALTH CHECK
// =====================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    socketio: true,
  });
});

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});