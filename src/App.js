import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import { API_BASE } from './api-config';
import { Grid } from '@mui/material';
import './style.scss';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  
  // We store the current user info here
  const [userData, setUserData] = useState(null);
  // This tries to delete the nickname if the user closes the browser.
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

    // 1. Free the Nickname in the Database
    try {
        await fetch(`${API_BASE}/active_users/${userData.room}/${userData.nick}`, { method: 'DELETE' });
    } catch (e) {
        console.error("Error removing user:", e);
    }

    // 2. Set last exit
    try {
        await fetch(`${API_BASE}/room_sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick: userData.nick, room: userData.room })
        });
    } catch (e) {
        console.error("Error setting session:", e);
    }

    // 3. Reset Local State
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
      <Chat room={userData.room} userNick={userData.nick} />

      <Grid className='sign-out'>
        <button onClick={signUserOut}>
          Leave Room
        </button>
      </Grid>
    </>
  );
}

export default App;