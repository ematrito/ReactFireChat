import { useEffect, useState, useRef } from 'react';
import { API_BASE } from '../api-config';
import { importKey, encryptMessage, decryptMessage } from '../crypto';
import QRCode from 'qrcode';

const Chat = (props) => {
  const { room, userNick, signUserOut, roomExpiresIn, token, tokenHash } = props;

  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [timeLeft, setTimeLeft] = useState(roomExpiresIn || 300);
  const [roomExpired, setRoomExpired] = useState(false);
  const [key, setKey] = useState(null);
  const [keyReceived, setKeyReceived] = useState(false);
  const [showShare, setShowShare] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const messagesContainerRef = useRef(null);
  const wsRef = useRef(null);
  const expiryHandledRef = useRef(false);
  const pendingRef = useRef([]);
  const keyRef = useRef(null);

  keyRef.current = key;

  const shareUrl = `${window.location.origin}/#${token}`;

  useEffect(() => {
    if (!token) return;
    QRCode.toDataURL(shareUrl, { width: 200, margin: 2 })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [token, shareUrl]);

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

  const appendDecrypted = async (cryptoKey, ciphertext, msgId, createdAt) => {
    try {
      const dec = await decryptMessage(cryptoKey, ciphertext);
      setMessages(prev => [...prev, { id: msgId, user: dec.n, text: dec.t, createdAt: new Date(createdAt) }]);
    } catch {
      setMessages(prev => [...prev, { id: msgId, user: '?', text: '[encrypted]', createdAt: new Date(createdAt) }]);
    }
  };

  useEffect(() => {
    if (!tokenHash) return;

    const wsUrl = API_BASE.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ws/${tokenHash}`);

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'room_key') {
        const cryptoKey = await importKey(data.key);
        setKey(cryptoKey);
        setKeyReceived(true);

        for (const msg of pendingRef.current) {
          await appendDecrypted(cryptoKey, msg.ciphertext, msg.id, msg.created_at);
        }
        pendingRef.current = [];
        return;
      }

      if (data.type === 'room_expired') {
        if (!expiryHandledRef.current) {
          expiryHandledRef.current = true;
          setRoomExpired(true);
          ws.close();
        }
        return;
      }

      if (data.type === 'message') {
        const k = keyRef.current;
        if (k) {
          await appendDecrypted(k, data.ciphertext, data.id, data.created_at);
        } else {
          pendingRef.current.push(data);
        }
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [tokenHash]);

  useEffect(() => {
    if (!tokenHash || !key) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/messages/${tokenHash}`);
        const msgs = await res.json();
        const decrypted = await Promise.all(
          msgs.map(async (m) => {
            try {
              const dec = await decryptMessage(key, m.ciphertext);
              return { id: m.id, user: dec.n, text: dec.t, createdAt: new Date(m.created_at) };
            } catch {
              return { id: m.id, user: '?', text: '[encrypted]', createdAt: new Date(m.created_at) };
            }
          })
        );
        setMessages(prev => {
          const existing = new Set(prev.map(m => m.id));
          const combined = [...prev];
          for (const msg of decrypted) {
            if (!existing.has(msg.id)) {
              combined.push(msg);
            }
          }
          return combined.sort((a, b) => a.createdAt - b.createdAt);
        });
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [tokenHash, key]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const k = keyRef.current;
    if (newMessage.trim() === "" || !k) return;

    const text = newMessage;
    setNewMessage("");

    try {
      const ciphertext = await encryptMessage(k, userNick, text);
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciphertext, token_hash: tokenHash }),
      });
      if (!response.ok) throw new Error('Failed to send');
    } catch (error) {
      console.error("Error sending:", error);
      setNewMessage(text);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  };

  return (
    <div className='container'>
      <div className='chat-app'>
        <div className='header'>
          <span>Welcome to: {room.toUpperCase()} as {userNick}</span>
          <span className='room-timer'>
            {roomExpired ? (
              <span style={{ color: '#ff4444', fontWeight: 'bold' }}>Room closed</span>
            ) : timeLeft <= 30 ? (
              <span style={{ color: '#ff4444' }}>Closing in {formatTime(timeLeft)}</span>
            ) : (
              <span style={{ opacity: 0.7, fontSize: '0.85em' }}>{formatTime(timeLeft)}</span>
            )}
          </span>
          {!showShare && !roomExpired && (
            <button className='share-btn' onClick={() => setShowShare(true)}>Share</button>
          )}
          <button className='mobile-leave-btn' onClick={signUserOut}>Leave</button>
        </div>

        {showShare && (
          <div className='share-panel'>
            <div className='share-header'>
              <span>Share this room</span>
              <button onClick={() => setShowShare(false)}>&times;</button>
            </div>
            <div className='share-body'>
              {qrDataUrl && <img src={qrDataUrl} alt="Room QR code" className='qr-code' />}
              <div className='share-url'>
                <code>{shareUrl}</code>
                <button onClick={copyShareLink} className='copy-btn'>Copy</button>
              </div>
              <p className='share-note'>Anyone with this link can join. Room self-destructs in {formatTime(timeLeft)}.</p>
            </div>
          </div>
        )}

        {roomExpired && (
          <div className='expired-banner'>
            This room has been closed after 5 minutes.
            <button onClick={signUserOut} className='rejoin-btn'>Start a new room</button>
          </div>
        )}

        <div className='messages' ref={messagesContainerRef}>
          {messages.map((message) => (
            <div
              className='message'
              key={message.id}
              style={{ textAlign: message.user === userNick ? 'right' : 'left', padding: '5px' }}
            >
              <span className='user' style={{ fontWeight: 'bold', color: getColorForUser(message.user) }}>
                {message.user}:
              </span>
              <span>{message.text}</span>
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
            <button type='button' onClick={handleSubmit} className='send-button'>
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
  );
};

export default Chat;
