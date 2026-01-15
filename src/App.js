import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import { API_BASE } from './api-config';
import { Grid } from '@mui/material';
import './style.scss';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  
  const [userData, setUserData] = useState(null);

  useEffect(() => {
  const handleBeforeUnload = async () => {
    if (isAuth && userData) {
      try {
        await fetch(`${API_BASE}/active_users/${userData.room}/${userData.nick}`, { method: 'DELETE' });
      } catch (e) {
        console.error("Error removing user:", e);
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [isAuth, userData]);


  const signUserOut = async () => {
    if (!userData) return;

    try {
        await fetch(`${API_BASE}/active_users/${userData.room}/${userData.nick}`, { method: 'DELETE' });
    } catch (e) {
        console.error("Error removing user:", e);
    }

    try {
        await fetch(`${API_BASE}/room_sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick: userData.nick, room: userData.room })
        });
    } catch (e) {
        console.error("Error setting session:", e);
    }

    setIsAuth(false);
    setUserData(null);
  };

  if (!isAuth) {
    return (
      <div>
        <Auth setIsAuth={setIsAuth} setUserData={setUserData} />
      </div>
    )
  }

  return (
    <>
      <Chat room={userData.room} userNick={userData.nick} signUserOut={signUserOut} />

      <Grid className='sign-out'>
        <button onClick={signUserOut}>
          Leave Room
        </button>
      </Grid>
    </>
  );
}

export default App;