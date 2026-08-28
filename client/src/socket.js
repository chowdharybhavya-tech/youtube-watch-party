import { io } from "socket.io-client";

const socket = io("https://youtube-watch-party-1ihc.onrender.com", {
  transports: ["polling", "websocket"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});

export default socket;