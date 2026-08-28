import { useEffect, useState } from "react";
import socket from "./socket";
import YouTubePlayer from "./components/YouTubePlayer";
import "./App.css";

function App() {
  // =====================================================
  // STATE
  // =====================================================

  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const [participants, setParticipants] = useState([]);

  const [isHost, setIsHost] = useState(false);
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);

  const [videoId, setVideoId] = useState("dQw4w9WgXcQ");
  const [videoUrl, setVideoUrl] = useState("");

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  // =====================================================
  // SOCKET EVENTS
  // =====================================================

  useEffect(() => {
    // -----------------------------------------------------
    // CONNECT
    // -----------------------------------------------------

    const handleConnect = () => {
      console.log("🟢 Connected to server:", socket.id);
      setConnected(true);
    };

    // -----------------------------------------------------
    // DISCONNECT
    // -----------------------------------------------------

    const handleDisconnect = () => {
      console.log("🔴 Disconnected from server");
      setConnected(false);
    };

    // -----------------------------------------------------
    // ROOM CREATED
    // -----------------------------------------------------

    const handleRoomCreated = (data) => {
      console.log("🏠 ROOM CREATED:", data);

      setRoomCode(data.roomId);
      setParticipants(data.participants || []);

      setIsHost(true);
      setJoined(true);

      if (data.videoId) {
        setVideoId(data.videoId);
      }

      setCurrentTime(
        typeof data.currentTime === "number"
          ? data.currentTime
          : 0
      );

      setIsPlaying(data.isPlaying === true);
    };

    // -----------------------------------------------------
    // ROOM JOINED
    // -----------------------------------------------------

    const handleRoomJoined = (data) => {
      console.log("🚪 ROOM JOINED:", data);

      setRoomCode(data.roomId);
      setParticipants(data.participants || []);

      setIsHost(false);
      setJoined(true);

      if (data.videoId) {
        setVideoId(data.videoId);
      }

      setCurrentTime(
        typeof data.currentTime === "number"
          ? data.currentTime
          : 0
      );

      setIsPlaying(data.isPlaying === true);
    };

    // -----------------------------------------------------
    // PARTICIPANTS UPDATED
    // -----------------------------------------------------

    const handleParticipantsUpdated = (data) => {
      console.log("👥 PARTICIPANTS UPDATED:", data);

      setParticipants(data || []);
    };

    // -----------------------------------------------------
    // VIDEO CHANGED
    // -----------------------------------------------------

    const handleVideoChanged = (data) => {
      console.log("📺 VIDEO CHANGED:", data);

      if (!data?.videoId) {
        return;
      }

      setVideoId(data.videoId);

      setCurrentTime(
        typeof data.currentTime === "number"
          ? data.currentTime
          : 0
      );

      setIsPlaying(data.isPlaying === true);
    };

    // -----------------------------------------------------
    // REMOTE PLAY
    // -----------------------------------------------------

    const handleVideoPlay = (data) => {
      console.log("▶️ REMOTE PLAY:", data);

      if (typeof data?.currentTime === "number") {
        setCurrentTime(data.currentTime);
      }

      setIsPlaying(true);
    };

    // -----------------------------------------------------
    // REMOTE PAUSE
    // -----------------------------------------------------

    const handleVideoPause = (data) => {
      console.log("⏸️ REMOTE PAUSE:", data);

      if (typeof data?.currentTime === "number") {
        setCurrentTime(data.currentTime);
      }

      setIsPlaying(false);
    };

    // -----------------------------------------------------
    // REMOTE SEEK
    // -----------------------------------------------------

    const handleVideoSeek = (data) => {
      console.log("⏩ REMOTE SEEK:", data);

      if (typeof data?.currentTime === "number") {
        setCurrentTime(data.currentTime);
      }
    };

    // -----------------------------------------------------
    // SYNC VIDEO STATE
    // -----------------------------------------------------

    const handleSyncVideoState = (data) => {
      console.log("🔄 SYNC VIDEO STATE:", data);

      if (data?.videoId) {
        setVideoId(data.videoId);
      }

      setCurrentTime(
        typeof data?.currentTime === "number"
          ? data.currentTime
          : 0
      );

      setIsPlaying(data?.isPlaying === true);
    };

    // -----------------------------------------------------
    // CHAT
    // -----------------------------------------------------

    const handleReceiveMessage = (chatMessage) => {
      console.log("💬 NEW MESSAGE:", chatMessage);

      setMessages((previousMessages) => [
        ...previousMessages,
        chatMessage,
      ]);
    };

    // -----------------------------------------------------
    // ERROR
    // -----------------------------------------------------

    const handleError = (msg) => {
      console.error("❌ SERVER ERROR:", msg);

      alert(msg);
    };

    // -----------------------------------------------------
    // REMOVED FROM ROOM
    // -----------------------------------------------------

    const handleRemovedFromRoom = (msg) => {
      console.log("🚫 Removed from room:", msg);

      alert(msg);

      setJoined(false);
      setRoomCode("");
      setParticipants([]);
      setIsHost(false);

      setVideoId("dQw4w9WgXcQ");
      setVideoUrl("");

      setCurrentTime(0);
      setIsPlaying(false);

      setMessages([]);
      setMessage("");
    };

    // =====================================================
    // REGISTER EVENTS
    // =====================================================

    socket.on("connect", handleConnect);

    socket.on("disconnect", handleDisconnect);

    socket.on("room-created", handleRoomCreated);

    socket.on("room-joined", handleRoomJoined);

    socket.on(
      "participants-updated",
      handleParticipantsUpdated
    );

    socket.on(
      "video-changed",
      handleVideoChanged
    );

    socket.on(
      "video-play",
      handleVideoPlay
    );

    socket.on(
      "video-pause",
      handleVideoPause
    );

    socket.on(
      "video-seek",
      handleVideoSeek
    );

    socket.on(
      "sync-video-state",
      handleSyncVideoState
    );

    socket.on(
      "receive-message",
      handleReceiveMessage
    );

    socket.on(
      "error-message",
      handleError
    );

    socket.on(
      "removed-from-room",
      handleRemovedFromRoom
    );

    // IMPORTANT:
    // If socket was already connected before this effect
    // started, update the UI immediately.

    if (socket.connected) {
      setConnected(true);
    }

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);

      socket.off(
        "room-created",
        handleRoomCreated
      );

      socket.off(
        "room-joined",
        handleRoomJoined
      );

      socket.off(
        "participants-updated",
        handleParticipantsUpdated
      );

      socket.off(
        "video-changed",
        handleVideoChanged
      );

      socket.off(
        "video-play",
        handleVideoPlay
      );

      socket.off(
        "video-pause",
        handleVideoPause
      );

      socket.off(
        "video-seek",
        handleVideoSeek
      );

      socket.off(
        "sync-video-state",
        handleSyncVideoState
      );

      socket.off(
        "receive-message",
        handleReceiveMessage
      );

      socket.off(
        "error-message",
        handleError
      );

      socket.off(
        "removed-from-room",
        handleRemovedFromRoom
      );
    };
  }, []);

  // =====================================================
  // CREATE ROOM
  // =====================================================

  const createRoom = () => {
    if (!connected) {
      alert(
        "Server is not connected. Please wait a moment and try again."
      );
      return;
    }

    if (!username.trim()) {
      alert("Please enter your username");
      return;
    }

    console.log(
      "🏠 Creating room for:",
      username
    );

    socket.emit("create-room", {
      username: username.trim(),
    });
  };

  // =====================================================
  // JOIN ROOM
  // =====================================================

  const joinRoom = () => {
    if (!connected) {
      alert(
        "Server is not connected. Please wait a moment and try again."
      );
      return;
    }

    if (!username.trim()) {
      alert("Please enter your username");
      return;
    }

    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }

    const finalRoomCode =
      roomCode.trim().toUpperCase();

    console.log(
      "🚪 Joining room:",
      finalRoomCode
    );

    socket.emit("join-room", {
      roomId: finalRoomCode,
      username: username.trim(),
    });
  };

  // =====================================================
  // CHANGE VIDEO
  // =====================================================

  const changeVideo = () => {
    if (!videoUrl.trim()) {
      alert("Paste a YouTube URL");
      return;
    }

    try {
      const url = new URL(videoUrl.trim());

      let newVideoId = "";

      // youtu.be/VIDEO_ID

      if (
        url.hostname.includes("youtu.be")
      ) {
        newVideoId =
          url.pathname.substring(1);
      }

      // youtube.com/watch?v=VIDEO_ID

      else if (
        url.hostname.includes("youtube.com")
      ) {
        newVideoId =
          url.searchParams.get("v");
      }

      if (!newVideoId) {
        alert("Invalid YouTube URL");
        return;
      }

      console.log(
        "📺 HOST CHANGING VIDEO:",
        newVideoId
      );

      // Update host immediately

      setVideoId(newVideoId);
      setCurrentTime(0);
      setIsPlaying(false);

      // Tell server

      socket.emit(
        "change-video",
        {
          roomId: roomCode,
          videoId: newVideoId,
        }
      );

      setVideoUrl("");
    } catch (error) {
      console.error(error);

      alert(
        "Please enter a valid YouTube URL"
      );
    }
  };

  // =====================================================
  // MAKE MODERATOR
  // =====================================================

  const makeModerator = (participantId) => {
    console.log(
      "🛡️ Making moderator:",
      participantId
    );

    socket.emit(
      "make-moderator",
      {
        roomId: roomCode,
        participantId: participantId,
      }
    );
  };

  // =====================================================
  // REMOVE MODERATOR
  // =====================================================

  const removeModerator = (participantId) => {
    console.log(
      "👤 Removing moderator:",
      participantId
    );

    socket.emit(
      "remove-moderator",
      {
        roomId: roomCode,
        participantId: participantId,
      }
    );
  };

  // =====================================================
  // REMOVE PARTICIPANT
  // =====================================================

  const removeParticipant = (participantId) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this participant?"
    );

    if (!confirmed) {
      return;
    }

    console.log(
      "🚫 Removing participant:",
      participantId
    );

    socket.emit(
      "remove-participant",
      {
        roomId: roomCode,
        participantId: participantId,
      }
    );
  };

  // =====================================================
  // LEAVE ROOM
  // =====================================================

  const leaveRoom = () => {
    if (!joined) {
      return;
    }

    console.log(
      "🚪 Leaving room:",
      roomCode
    );

    socket.emit("leave-room");

    setJoined(false);
    setRoomCode("");
    setParticipants([]);
    setIsHost(false);

    setVideoId("dQw4w9WgXcQ");
    setVideoUrl("");

    setCurrentTime(0);
    setIsPlaying(false);

    setMessages([]);
    setMessage("");
  };

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = () => {
    if (!message.trim()) {
      return;
    }

    if (!joined) {
      alert(
        "Please create or join a room first"
      );
      return;
    }

    const chatData = {
      roomId: roomCode,
      username: username.trim(),
      message: message.trim(),
    };

    console.log(
      "💬 Sending message:",
      chatData
    );

    socket.emit(
      "send-message",
      chatData
    );

    setMessage("");
  };

  // =====================================================
  // ENTER KEY
  // =====================================================

  const handleMessageKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="app">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        {/* LOGO */}

        <div className="logo">
          🎬 WatchParty
        </div>

        {/* ROOM */}

        <div className="sidebar-section">

          <h3>ROOM</h3>

          {joined ? (
            <div className="room-card">

              <span>
                Room Code
              </span>

              <strong>
                {roomCode}
              </strong>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    roomCode
                  );

                  alert(
                    "Room code copied!"
                  );
                }}
              >
                📋 Copy Code
              </button>

            </div>
          ) : (
            <div className="room-card">

              <span>
                Room Code
              </span>

              <strong>
                ------
              </strong>

            </div>
          )}

        </div>

        {/* =================================================
            PARTICIPANTS
        ================================================= */}

        <div className="sidebar-section participants-section">

          <h3>
            👥 PEOPLE ({participants.length})
          </h3>

          {participants.length === 0 ? (

            <p className="no-participants">
              No participants yet
            </p>

          ) : (

            <div className="participants-list">

              {participants.map(
                (participant) => (

                  <div
                    className="participant"
                    key={participant.id}
                  >

                    {/* AVATAR */}

                    <div className="participant-avatar">

                      {participant.username
                        ? participant.username
                            .charAt(0)
                            .toUpperCase()
                        : "U"}

                    </div>

                    {/* INFORMATION */}

                    <div className="participant-info">

                      <strong>
                        {participant.username}
                      </strong>

                      <span>

                        {participant.role ===
                        "host"
                          ? "👑 Host"
                          : participant.role ===
                            "moderator"
                          ? "🛡️ Moderator"
                          : "👤 Participant"}

                      </span>

                    </div>

                    {/* =================================================
                        MODERATOR CONTROLS
                    ================================================= */}

                    {isHost &&
                      participant.id !==
                        socket.id && (

                        <div className="moderator-controls">

                          {/* MAKE / REMOVE MODERATOR */}

                          {participant.role ===
                          "moderator" ? (

                            <button
                              onClick={() =>
                                removeModerator(
                                  participant.id
                                )
                              }
                            >
                              👤 Remove Moderator
                            </button>

                          ) : (

                            <button
                              onClick={() =>
                                makeModerator(
                                  participant.id
                                )
                              }
                            >
                              🛡️ Make Moderator
                            </button>

                          )}

                          {/* REMOVE PARTICIPANT */}

                          <button
                            onClick={() =>
                              removeParticipant(
                                participant.id
                              )
                            }
                          >
                            🚫 Remove
                          </button>

                        </div>

                      )}

                  </div>

                )
              )}

            </div>

          )}

        </div>

        {/* =================================================
            LEAVE ROOM
        ================================================= */}

        {joined && (

          <button
            className="leave-room-btn"
            onClick={leaveRoom}
          >
            🚪 Leave Room
          </button>

        )}

      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="main-content">

        {/* HEADER */}

        <header className="header">

          <div>

            <h1>
              YouTube Watch Party
            </h1>

            <p>
              Watch together. Stay connected.
            </p>

          </div>

          <div className="user-badge">

            {connected
              ? "🟢 Connected"
              : "🔴 Disconnected"}

            {" | "}

            👤 {username || "Guest"}

          </div>

        </header>

        {/* =================================================
            ROOM SETUP
        ================================================= */}

        {!joined && (

          <section className="setup-card">

            <h2>
              🎉 Create or Join a Room
            </h2>

            <p>
              Enter your name to start
              watching with friends.
            </p>

            {/* CREATE ROOM */}

            <div className="input-group">

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                placeholder="Enter your name"
              />

              <button
                onClick={createRoom}
              >
                ✨ Create Room
              </button>

            </div>

            <div className="or">
              OR
            </div>

            {/* JOIN ROOM */}

            <div className="input-group">

              <input
                type="text"
                value={roomCode}
                onChange={(e) =>
                  setRoomCode(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Enter room code"
              />

              <button
                onClick={joinRoom}
              >
                Join Room →
              </button>

            </div>

          </section>

        )}

        {/* =================================================
            WATCH PARTY
        ================================================= */}

        {joined && (

          <div className="watch-party">

            {/* =================================================
                VIDEO
            ================================================= */}

            <section className="video-card">

              <div className="card-header">

                <div>

                  <h2>
                    🎥 Now Playing
                  </h2>

                  <p>
                    Everyone is watching together
                  </p>

                </div>

                {/* HOST BADGE */}

                {isHost && (

                  <span className="host-badge">
                    👑 HOST
                  </span>

                )}

              </div>

              {/* YOUTUBE PLAYER */}

              <YouTubePlayer
                videoId={videoId}
                roomCode={roomCode}
                isHost={isHost}
                currentTime={currentTime}
                isPlaying={isPlaying}
              />

              {/* CHANGE VIDEO */}

              {isHost && (

                <div className="change-video">

                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) =>
                      setVideoUrl(
                        e.target.value
                      )
                    }
                    placeholder="Paste YouTube URL..."
                  />

                  <button
                    onClick={changeVideo}
                  >
                    Change Video
                  </button>

                </div>

              )}

            </section>

            {/* =================================================
                CHAT
            ================================================= */}

            <section className="chat-card">

              <div className="chat-header">

                <div>

                  <h2>
                    💬 Chat
                  </h2>

                  <p>
                    Talk with everyone
                  </p>

                </div>

              </div>

              {/* MESSAGES */}

              <div className="messages">

                {messages.length === 0 ? (

                  <div className="empty-chat">

                    💬 No messages yet.

                    <br />

                    Start the conversation!

                  </div>

                ) : (

                  messages.map(
                    (chatMessage, index) => (

                      <div
                        className="message"
                        key={index}
                      >

                        <div className="message-avatar">

                          {chatMessage.username
                            ? chatMessage.username
                                .charAt(0)
                                .toUpperCase()
                            : "U"}

                        </div>

                        <div className="message-content">

                          <strong>
                            {chatMessage.username}
                          </strong>

                          <p>
                            {chatMessage.message}
                          </p>

                        </div>

                      </div>

                    )
                  )

                )}

              </div>

              {/* CHAT INPUT */}

              <div className="chat-input">

                <input
                  type="text"
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  onKeyDown={
                    handleMessageKeyDown
                  }
                  placeholder="Type a message..."
                />

                <button
                  onClick={sendMessage}
                >
                  ➤
                </button>

              </div>

            </section>

          </div>

        )}

      </main>

    </div>
  );
}

export default App;