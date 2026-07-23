import React, { useState } from "react";
import { API_BASE } from "../api-config";
import "../style.scss";

export const Auth = ({ setIsAuth, setUserData }) => {
  const [tempNick, setTempNick] = useState("");
  const [tempRoom, setTempRoom] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const urlToken = window.location.hash.replace("#", "");

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError(null);
    if (!tempNick.trim() || !tempRoom.trim()) {
      setError("Please fill in both fields");
      return;
    }

    let cleanNick = tempNick.trim().replace(/\s/g, "_");
    const cleanRoom = tempRoom.trim().toUpperCase();

    const badWords = [
      "fuck", "shit", "damn", "bitch", "asshole", "bastard",
      "cunt", "dick", "pussy", "cock", "tits", "boobs",
    ];
    if (badWords.some((w) => cleanNick.toLowerCase().includes(w))) {
      setError("Inappropriate nickname. Please choose another.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/create_room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick: cleanNick, room: cleanRoom }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create room");
      }
      const data = await res.json();
      window.location.hash = data.token;
      setUserData({
        nick: cleanNick,
        room: data.room,
        token: data.token,
        tokenHash: data.token_hash,
        roomExpiresIn: data.room_expires_in_seconds,
      });
      setIsAuth(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setError(null);
    if (!tempNick.trim()) {
      setError("Please enter a nickname");
      return;
    }

    let cleanNick = tempNick.trim().replace(/\s/g, "_");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick: cleanNick, token: urlToken }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to join room");
      }
      const data = await res.json();
      setUserData({
        nick: cleanNick,
        room: data.room,
        token: urlToken,
        tokenHash: data.token_hash,
        roomExpiresIn: data.room_expires_in_seconds,
      });
      setIsAuth(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="enter-room">
      {urlToken ? (
        <form onSubmit={handleJoinRoom}>
          <label>Join Private Room</label>
          <input
            placeholder="Choose a Nickname"
            value={tempNick}
            onChange={(e) => setTempNick(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Joining..." : "Join Chat"}
          </button>
          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        </form>
      ) : (
        <form onSubmit={handleCreateRoom}>
          <label>Create a Chat Room</label>
          <input
            placeholder="Room Name"
            value={tempRoom}
            onChange={(e) => setTempRoom(e.target.value)}
          />
          <input
            placeholder="Choose a Nickname"
            value={tempNick}
            onChange={(e) => setTempNick(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Room"}
          </button>
          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        </form>
      )}
    </div>
  );
};

export default Auth;
