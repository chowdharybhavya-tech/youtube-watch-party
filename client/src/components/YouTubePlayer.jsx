import { useEffect, useRef } from "react";
import YouTube from "react-youtube";
import socket from "../socket";

function YouTubePlayer({
  videoId,
  roomCode,
  isHost,
  currentTime,
  isPlaying,
}) {
  const playerRef = useRef(null);

  // Prevent remote actions from triggering socket events again
  const isRemoteAction = useRef(false);

  // Store latest room state
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // =====================================================
  // PLAYER READY
  // =====================================================

  const onReady = (event) => {
    playerRef.current = event.target;

    console.log("✅ YouTube player ready:", videoId);

    // Apply current room time
    if (typeof currentTimeRef.current === "number") {
      event.target.seekTo(currentTimeRef.current, true);
    }

    // Apply current room playing state
    if (isPlayingRef.current) {
      isRemoteAction.current = true;

      event.target.playVideo();

      setTimeout(() => {
        isRemoteAction.current = false;
      }, 1000);
    }
  };

  // =====================================================
  // HOST PLAY
  // =====================================================

  const onPlay = (event) => {
    // Don't send remote actions back to server
    if (isRemoteAction.current) {
      return;
    }

    // Only HOST controls playback
    if (!isHost) {
      return;
    }

    if (!roomCode) {
      return;
    }

    const time = event.target.getCurrentTime();

    console.log("▶️ HOST PLAY:", time);

    socket.emit("play-video", {
      roomId: roomCode,
      currentTime: time,
    });
  };

  // =====================================================
  // HOST PAUSE
  // =====================================================

  const onPause = (event) => {
    if (isRemoteAction.current) {
      return;
    }

    // Only HOST controls playback
    if (!isHost) {
      return;
    }

    if (!roomCode) {
      return;
    }

    const time = event.target.getCurrentTime();

    console.log("⏸️ HOST PAUSE:", time);

    socket.emit("pause-video", {
      roomId: roomCode,
      currentTime: time,
    });
  };

  // =====================================================
  // REMOTE PLAY
  // =====================================================

  useEffect(() => {
    const handleRemotePlay = (data) => {
      console.log("📡 REMOTE PLAY RECEIVED:", data);

      if (!playerRef.current) {
        console.log("❌ Player not ready");
        return;
      }

      isRemoteAction.current = true;

      if (typeof data?.currentTime === "number") {
        playerRef.current.seekTo(data.currentTime, true);
      }

      playerRef.current.playVideo();

      setTimeout(() => {
        isRemoteAction.current = false;
      }, 1000);
    };

    socket.on("video-play", handleRemotePlay);

    return () => {
      socket.off("video-play", handleRemotePlay);
    };
  }, []);

  // =====================================================
  // REMOTE PAUSE
  // =====================================================

  useEffect(() => {
    const handleRemotePause = (data) => {
      console.log("📡 REMOTE PAUSE RECEIVED:", data);

      if (!playerRef.current) {
        console.log("❌ Player not ready");
        return;
      }

      isRemoteAction.current = true;

      if (typeof data?.currentTime === "number") {
        playerRef.current.seekTo(data.currentTime, true);
      }

      playerRef.current.pauseVideo();

      setTimeout(() => {
        isRemoteAction.current = false;
      }, 1000);
    };

    socket.on("video-pause", handleRemotePause);

    return () => {
      socket.off("video-pause", handleRemotePause);
    };
  }, []);

  // =====================================================
  // REMOTE SEEK
  // =====================================================

  useEffect(() => {
    const handleRemoteSeek = (data) => {
      console.log("📡 REMOTE SEEK RECEIVED:", data);

      if (!playerRef.current) {
        console.log("❌ Player not ready");
        return;
      }

      if (typeof data?.currentTime !== "number") {
        return;
      }

      isRemoteAction.current = true;

      playerRef.current.seekTo(data.currentTime, true);

      setTimeout(() => {
        isRemoteAction.current = false;
      }, 1000);
    };

    socket.on("video-seek", handleRemoteSeek);

    return () => {
      socket.off("video-seek", handleRemoteSeek);
    };
  }, []);

  // =====================================================
  // YOUTUBE OPTIONS
  // =====================================================

  const opts = {
    width: "100%",
    height: "500",

    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,

      // Important for YouTube iframe
      origin: window.location.origin,
    },
  };

  return (
    <div className="youtube-player">
      <YouTube
        key={videoId}
        videoId={videoId}
        opts={opts}
        onReady={onReady}
        onPlay={onPlay}
        onPause={onPause}
      />
    </div>
  );
}

export default YouTubePlayer;