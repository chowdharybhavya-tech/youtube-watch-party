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
// HELPER - CHECK MODERATOR
// =====================================

function canModerate(room, socketId) {
  if (!room) return false;

  // Host can always moderate
  if (room.hostId === socketId) {
    return true;
  }

  // Moderator can moderate
  const participant = room.participants.find(
    (p) => p.id === socketId
  );

  return participant && participant.role === "moderator";
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
      `🚪 ${username} trying to join ${roomId}`
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

    socket.emit("room-joined", {
      roomId: roomId,
      participants: room.participants,
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
    });

    io.to(roomId).emit(
      "participants-updated",
      room.participants
    );

    console.log(
      `✅ ${username} joined ${roomId}`
    );
  });

  // =====================================
  // PROMOTE PARTICIPANT TO MODERATOR
  // =====================================

  socket.on(
    "make-moderator",
    ({ roomId, participantId }) => {
      const room = rooms[roomId];

      if (!room) return;

      // ONLY HOST CAN MAKE MODERATOR
      if (socket.id !== room.hostId) {
        socket.emit(
          "error-message",
          "Only the host can make a moderator."
        );
        return;
      }

      const participant = room.participants.find(
        (p) => p.id === participantId
      );

      if (!participant) {
        socket.emit(
          "error-message",
          "Participant not found."
        );
        return;
      }

      // Don't change host role
      if (participant.id === room.hostId) {
        return;
      }

      participant.role = "moderator";

      console.log(
        `🛡️ ${participant.username} is now a moderator`
      );

      io.to(roomId).emit(
        "participants-updated",
        room.participants
      );

      io.to(roomId).emit(
        "moderator-updated",
        {
          participantId: participant.id,
          username: participant.username,
          role: "moderator",
        }
      );
    }
  );

  // =====================================
  // REMOVE MODERATOR ROLE
  // =====================================

  socket.on(
    "remove-moderator",
    ({ roomId, participantId }) => {
      const room = rooms[roomId];

      if (!room) return;

      // ONLY HOST CAN REMOVE MODERATOR
      if (socket.id !== room.hostId) {
        socket.emit(
          "error-message",
          "Only the host can remove moderator."
        );
        return;
      }

      const participant = room.participants.find(
        (p) => p.id === participantId
      );

      if (!participant) return;

      if (participant.id === room.hostId) {
        return;
      }

      participant.role = "participant";

      console.log(
        `👤 ${participant.username} is no longer a moderator`
      );

      io.to(roomId).emit(
        "participants-updated",
        room.participants
      );
    }
  );

  // =====================================
  // KICK PARTICIPANT
  // =====================================

  socket.on(
    "kick-participant",
    ({ roomId, participantId }) => {
      const room = rooms[roomId];

      if (!room) return;

      // Host or moderator can kick
      if (!canModerate(room, socket.id)) {
        socket.emit(
          "error-message",
          "You do not have permission to remove participants."
        );
        return;
      }

      // Cannot kick host
      if (participantId === room.hostId) {
        socket.emit(
          "error-message",
          "Host cannot be removed."
        );
        return;
      }

      const participant = room.participants.find(
        (p) => p.id === participantId
      );

      if (!participant) return;

      // Moderator cannot kick another moderator
      const currentUser = room.participants.find(
        (p) => p.id === socket.id
      );

      if (
        currentUser &&
        currentUser.role === "moderator" &&
        participant.role === "moderator"
      ) {
        socket.emit(
          "error-message",
          "Moderator cannot remove another moderator."
        );
        return;
      }

      // Remove from room
      room.participants =
        room.participants.filter(
          (p) => p.id !== participantId
        );

      // Find target socket
      const targetSocket =
        io.sockets.sockets.get(participantId);

      if (targetSocket) {
        targetSocket.leave(roomId);
        targetSocket.roomId = null;

        targetSocket.emit(
          "kicked-from-room",
          "You have been removed from the room."
        );
      }

      io.to(roomId).emit(
        "participants-updated",
        room.participants
      );

      console.log(
        `🚫 ${participant.username} was removed from ${roomId}`
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

    console.log(
      `🎬 Player ready: ${socket.id}`
    );

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

      // Host OR moderator can change video
      if (!canModerate(room, socket.id)) {
        console.log(
          "❌ User tried to change video without permission"
        );
        return;
      }

      console.log(
        `📺 Changing video in ${roomId}: ${videoId}`
      );

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

      // Host OR moderator
      if (!canModerate(room, socket.id)) {
        return;
      }

      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      room.isPlaying = true;

      console.log(
        `▶️ PLAY ${roomId} at ${room.currentTime}`
      );

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

      // Host OR moderator
      if (!canModerate(room, socket.id)) {
        return;
      }

      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      room.isPlaying = false;

      console.log(
        `⏸️ PAUSE ${roomId} at ${room.currentTime}`
      );

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

      // Host OR moderator
      if (!canModerate(room, socket.id)) {
        return;
      }

      room.currentTime =
        typeof currentTime === "number"
          ? currentTime
          : 0;

      console.log(
        `⏩ SEEK ${roomId} to ${room.currentTime}`
      );

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
      socket.roomId = null;
      return;
    }

    // =====================================
    // HOST LEAVES
    // =====================================

    if (socket.id === room.hostId) {
      io.to(roomId).emit(
        "error-message",
        "Host left the room. Room closed."
      );

      io.to(roomId).emit(
        "room-closed"
      );

      delete rooms[roomId];

      socket.leave(roomId);
      socket.roomId = null;

      console.log(
        `❌ Room ${roomId} deleted because host left`
      );

      return;
    }

    // =====================================
    // PARTICIPANT LEAVES
    // =====================================

    const leavingParticipant =
      room.participants.find(
        (p) => p.id === socket.id
      );

    room.participants =
      room.participants.filter(
        (p) => p.id !== socket.id
      );

    socket.leave(roomId);
    socket.roomId = null;

    io.to(roomId).emit(
      "participants-updated",
      room.participants
    );

    console.log(
      `👋 ${
        leavingParticipant
          ? leavingParticipant.username
          : socket.username
      } left ${roomId}`
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

      io.to(roomId).emit(
        "room-closed"
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