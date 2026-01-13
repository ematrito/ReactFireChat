import React from "react";
import { useState } from "react";
import { API_BASE } from "../api-config";
import "../style.scss";

export const Auth = ({ setIsAuth, setUserData }) => {
    const [tempNick, setTempNick] = useState("");
    const [tempRoom, setTempRoom] = useState("");
    const [error, setError] = useState(null);


    const handleEnterChat = async (e) => {
        e.preventDefault();
        if (!tempNick.trim() || !tempRoom.trim()) {
            setError("Please fill in both fields");
            return;
        }

        console.log("Starting authentication...");

        let cleanNick = tempNick.trim().replace(/\s/g, '_');
        const cleanRoom = tempRoom.trim().toUpperCase();

        // Check for vulgar nicknames
        const badWords = ['fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy', 'cock', 'tits', 'boobs'];
        if (badWords.some(word => cleanNick.toLowerCase().includes(word))) {
            setError("Nickname contains inappropriate content. Please choose another.");
            return;
        }


        try {
            // 1. CHECK IF NICKNAME IS IN COOLDOWN
            console.log("checking cooldown...");
            const sessionResponse = await fetch(`${API_BASE}/room_sessions/${cleanNick}/${cleanRoom}`);
            const sessionData = await sessionResponse.json();
            if (sessionData.last_exit) {
                const lastExit = new Date(sessionData.last_exit);
                const now = new Date();
                const diffMinutes = (now - lastExit) / 1000 / 60;
                if (diffMinutes < 30) {
                    setError(`Nickname "${cleanNick}" was used recently in room ${cleanRoom}. Please wait ${Math.ceil(30 - diffMinutes)} minutes.`);
                    return;
                }
            }

            // 2. CHECK IF NICKNAME EXISTS
            console.log("checking if user exists...");
            const response = await fetch(`${API_BASE}/active_users/${cleanRoom}/${cleanNick}`);
            const data = await response.json();
            if (data.exists) {
                setError(`Nickname "${cleanNick}" is already taken in room ${cleanRoom}.`);
                return;
            }

            console.log("Registering user...");

            const createResponse = await fetch(`${API_BASE}/active_users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nick: cleanNick, room: cleanRoom })
            });
            if (!createResponse.ok) {
                throw new Error('Failed to create user');
            }

            console.log("User registered successfully!");

            // 3. SUCCESS: Update App state
            setUserData({ nick: cleanNick, room: cleanRoom });
            setIsAuth(true); // Logged in effectively
            setError(null);

        } catch (err) {
            console.error("Error joining:", err);
            setError("Connection error. Please try again.");
        }
        
    }
    return (
        <div className="enter-room">
            <form onSubmit={handleEnterChat}>
                <label>Join a Chat Room</label>

                <input
                    placeholder="Room Name"
                    onChange={(e) => setTempRoom(e.target.value)}
                    style={{ marginBottom: '10px' }}
                />

                <input
                    placeholder="Choose a Nickname"
                    onChange={(e) => setTempNick(e.target.value)}
                />

                <button type="submit">Enter Chat</button>

                {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
            </form>
        </div>
    );
};

export default Auth;