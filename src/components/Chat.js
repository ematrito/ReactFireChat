import { useEffect, useState, useRef } from 'react';
import { API_BASE } from '../api-config';

const Chat = (props) => {
  const { room, userNick, signUserOut, roomExpiresIn } = props;

  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [lastExitTime, setLastExitTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(roomExpiresIn || 300);
  const [roomExpired, setRoomExpired] = useState(false);

  const messagesContainerRef = useRef(null);
  const wsRef = useRef(null);
  const expiryHandledRef = useRef(false);

  useEffect(() => {
    if (roomExpired || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [roomExpired]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getColorForUser = (nick) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#3b82f6', '#14b8a6', '#eab308', '#dc2626', '#a855f7', '#0891b2', '#65a30d'];
    let hash = 0;
    for (let i = 0; i < nick.length; i++) {
      hash = nick.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    if (!userNick || !room) return;

    const fetchExitTime = async () => {
      try {
        const response = await fetch(`${API_BASE}/room_sessions/${userNick}/${room}`);
        const data = await response.json();
        if (data.last_exit) {
          setLastExitTime(new Date(data.last_exit));
        } else {
          setLastExitTime(null);
        }
      } catch (error) {
        console.error("Errore nel recupero del timestamp di uscita:", error);
        setLastExitTime(null);
      }
    };

    fetchExitTime();

  }, [userNick, room]);


  useEffect(() => {
    if (!room) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_BASE}/messages/${room}`);
        const fetchedMessages = await response.json();
        const parsedMessages = fetchedMessages.map(m => ({ ...m, createdAt: new Date(m.created_at) }));
        const filteredMessages = lastExitTime
          ? parsedMessages.filter(msg => msg.createdAt > lastExitTime)
          : parsedMessages;
        setMessages(filteredMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    console.log('API_BASE:', API_BASE);
    
    const wsUrl = API_BASE.replace('http', 'ws');
    console.log('wsUrl:', wsUrl);
    wsRef.current = new WebSocket(`${wsUrl}/ws/${room}`); wsRef.current.onopen = () => console.log('WS open for room', room);
    
    wsRef.current.onerror = (error) => console.log('WS error', error); 
    
    wsRef.current.onmessage = (event) => {
      console.log('WS received:', event.data);
      const data = JSON.parse(event.data);
      if (data.type === 'room_expired') {
        if (!expiryHandledRef.current) {
          expiryHandledRef.current = true;
          setRoomExpired(true);
          if (wsRef.current) {
            wsRef.current.close();
          }
        }
        return;
      }
      setMessages(prev => [...prev, { ...data, createdAt: new Date(data.created_at) }]);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    }

  }, [room, lastExitTime]);


  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting message:", newMessage);
    if (newMessage.trim() === "") return;

    const messageToSend = newMessage;
    setNewMessage("");

    try {
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageToSend, user: userNick, room: room })
      });
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageToSend);
      alert("Error sending message, please try again.");
    }
  };


  return (
    <div className='container'>
      <div className='chat-app'>
        <div className='header'>
          <span>Welcome to: {room.toUpperCase()} as {userNick}</span>
          <span className='room-timer'>
            {roomExpired ? (
              <span style={{color: '#ff4444', fontWeight: 'bold'}}>Room closed</span>
            ) : timeLeft <= 30 ? (
              <span style={{color: '#ff4444'}}>Closing in {formatTime(timeLeft)}</span>
            ) : (
              <span style={{opacity: 0.7, fontSize: '0.85em'}}>{formatTime(timeLeft)}</span>
            )}
          </span>
          <button className='mobile-leave-btn' onClick={signUserOut}>Leave</button>
        </div>
        {roomExpired && (
          <div className='expired-banner'>
            This room has been closed due to {Math.round((roomExpiresIn || 300) / 60)} minutes of inactivity.
            <button onClick={signUserOut} className='rejoin-btn'>Start a new room</button>
          </div>
        )}
        <div
          className='messages'
          ref={messagesContainerRef}
        >
          {messages.map((message) => (
            <div
              className='message'
              key={message.id}
              style={{
                textAlign: message.user === userNick ? 'right' : 'left',
                padding: '5px',
              }}
            >
              <span className='user' style={{ fontWeight: 'bold', color: getColorForUser(message.user) }}>
                {message.user}:
              </span>
              <span>
                {message.text}
              </span>
            </div>
          ))}
        </div>
        {!roomExpired && (
        <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
          <textarea
            className='new-message-input'
            placeholder='Message...'
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            value={newMessage}
          />
          <button type='button'
            onClick={handleSubmit}
            className='send-button'>
            <span className="btn-text">Send</span>
            <span className="btn-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </span>
          </button>
        </form>
        )}
      </div>
    </div>

  )
}

export default Chat;
