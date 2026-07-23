import React, { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import { Grid } from '@mui/material';
import './style.scss';

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [userData, setUserData] = useState(null);

  const signUserOut = () => {
    setIsAuth(false);
    setUserData(null);
    window.location.hash = '';
  };

  if (!isAuth) {
    return (
      <div>
        <Auth setIsAuth={setIsAuth} setUserData={setUserData} />
      </div>
    );
  }

  return (
    <>
      <Chat
        room={userData.room}
        userNick={userData.nick}
        signUserOut={signUserOut}
        roomExpiresIn={userData.roomExpiresIn}
        token={userData.token}
        tokenHash={userData.tokenHash}
      />
      <Grid className='sign-out'>
        <button onClick={signUserOut}>Leave Room</button>
      </Grid>
    </>
  );
}

export default App;
