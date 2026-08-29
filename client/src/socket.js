import { io } from "socket.io-client";

const socket = io(
  "https://youtube-watch-party-bejz.onrender.com",
  {
    transports: ["websocket", "polling"],
    autoConnect: true,
  }
);

socket.on("connect", () => {
  console.log("🟢 Connected to server:", socket.id);
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected from server");
});

socket.on("connect_error", (error) => {
  console.error(
    "❌ Socket connection error:",
    error.message
  );
});

export default socket;