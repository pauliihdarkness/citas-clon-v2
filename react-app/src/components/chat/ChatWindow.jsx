import React, { useEffect, useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Send, CheckCircle, CheckCheck } from 'lucide-react';
import { formatRelativeTime } from '../../lib/profileTextUtils';

export function ChatWindow({ conversationId, currentUserAlias, otherAlias, otherUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  const isOnline = otherUser?.isOnline;
  const lastSeenStr = otherUser?.lastSeen ? formatRelativeTime(otherUser.lastSeen) : 'Desconocido';
  const statusLabel = isOnline ? 'EN LÍNEA' : `ÚLTIMA VEZ: ${lastSeenStr.toUpperCase()}`;

  // Load messages
  useEffect(() => {
    if (!conversationId) return;

    const messagesRef = collection(db, 'conversaciones', conversationId, 'mensajes');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      // Mark received messages as read
      msgs.forEach(msg => {
        if (msg.remitente !== currentUserAlias && !msg.leido) {
          updateDoc(doc(db, 'conversaciones', conversationId, 'mensajes', msg.id), { leido: true });
        }
      });
    });

    return () => unsubscribe();
  }, [conversationId, currentUserAlias]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !conversationId) return;

    const text = inputText.trim();
    setInputText('');

    try {
      const messagesRef = collection(db, 'conversaciones', conversationId, 'mensajes');
      await addDoc(messagesRef, {
        remitente: currentUserAlias,
        destinatario: otherAlias,
        contenido: text,
        timestamp: serverTimestamp(),
        leido: false
      });

      // Update conversation metadata
      await updateDoc(doc(db, 'conversaciones', conversationId), {
        ultimoMensaje: text,
        ultimoRemitente: currentUserAlias,
        visto: false,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const onKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="inbox-main chat-flicker" id="active-chat-window" key={conversationId}>
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <button className="back-btn btn-hud-icon" onClick={onBack} title="Volver">
            <ArrowLeft size={18} />
          </button>
          
          {!otherUser ? (
            /* Skeleton Loading State */
            <div className="chat-header-skeleton" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div className="skeleton-avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255, 176, 0, 0.1)', border: '1px dashed var(--secondary)' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-line" style={{ width: '100px', height: '14px', background: 'rgba(255, 176, 0, 0.1)', marginBottom: '4px' }} />
                <div className="skeleton-line" style={{ width: '150px', height: '8px', background: 'rgba(255, 176, 0, 0.05)' }} />
              </div>
            </div>
          ) : (
            /* Live Header Content */
            <>
              <div style={{ position: 'relative' }}>
                <img 
                  src={otherUser?.fotoPerfilUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(otherAlias)} 
                  className="profile-photo"
                  style={{ width: 40, height: 40, border: '2px solid var(--border)', filter: 'sepia(1) saturate(5) hue-rotate(-20deg) contrast(1.2)' }}
                />
                {isOnline && (
                  <div style={{ 
                    position: 'absolute', bottom: 0, right: 0, 
                    width: 10, height: 10, borderRadius: '50%', 
                    background: '#00ff00', border: '2px solid var(--bg)',
                    boxShadow: '0 0 5px #00ff00'
                  }} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {otherAlias}
                </h3>
                <span style={{ 
                  fontSize: '0.65rem', 
                  color: isOnline ? '#00ff00' : 'var(--secondary)', 
                  opacity: isOnline ? 1 : 0.8,
                  fontWeight: isOnline ? 'bold' : 'normal',
                  letterSpacing: '1px'
                }}>
                  {statusLabel}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="inbox-empty" style={{ opacity: 0.3 }}>
            No hay mensajes aún. ¡Comienza la conversación!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.remitente === currentUserAlias;
            const date = msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000) : new Date();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={msg.id} className={`message-bubble ${isMe ? 'sent' : 'received'}`}>
                <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {msg.contenido}
                </div>
                <div className="message-time">
                  <span>{timeStr}</span>
                  {isMe && (
                    <span style={{ display: 'flex' }}>
                      {msg.leido ? (
                        <CheckCheck size={12} color="var(--accent)" />
                      ) : (
                        <CheckCircle size={12} />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="chat-input-container" onSubmit={handleSend}>
        <textarea
          className="chat-input"
          placeholder="Escribe un mensaje..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={onKeyPress}
          rows={1}
          autoFocus={!window.matchMedia('(max-width: 768px)').matches}
        />
        <button 
          type="submit" 
          className="btn" 
          title="Enviar" 
          disabled={!inputText.trim()}
          style={{ padding: '0 12px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
