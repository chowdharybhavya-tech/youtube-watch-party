import { io } from "socket.io-client";

const socket = io("https://youtube-watch-party-1ihc.onrender.com", {
  transports: ["websocket", "polling"],
  withCredentials: true,
});

export default socket;