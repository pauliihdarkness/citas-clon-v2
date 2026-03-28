import React, { useEffect, useState } from 'react';
import { fetchUserProfile } from '../../lib/fetchUserProfile';
import { User, Crown } from 'lucide-react';

export function ConversationItem({ conversation, currentUserAlias, isActive, onClick }) {
  const [otherUser, setOtherUser] = useState(null);
  const otherAlias = conversation.participantes.find(p => p !== currentUserAlias) || 'Usuario';

  useEffect(() => {
    fetchUserProfile(otherAlias).then(res => {
      if (res) setOtherUser(res.data);
    });
  }, [otherAlias]);

  const hasUnread = !conversation.visto && conversation.ultimoRemitente !== currentUserAlias;
  const lastMsg = conversation.ultimoMensaje || '...';
  
  const timestamp = conversation.timestamp?.seconds 
    ? new Date(conversation.timestamp.seconds * 1000) 
    : new Date();
  
  const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className={`conv-item ${isActive ? 'active' : ''}`} 
      onClick={onClick}
      style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
    >
      <div style={{ position: 'relative' }}>
        {otherUser?.fotoPerfilUrl ? (
          <img 
            src={otherUser.fotoPerfilUrl} 
            alt={otherAlias} 
            className="conv-avatar"
            style={{ filter: 'sepia(1) saturate(5) hue-rotate(-20deg) contrast(1.2)' }}
          />
        ) : (
          <div className="conv-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
            <User size={24} color="var(--secondary)" />
          </div>
        )}
        {hasUnread && (
          <div 
            style={{ 
              position: 'absolute', 
              top: 0, 
              right: 0, 
              width: 12, 
              height: 12, 
              background: 'var(--accent)', 
              borderRadius: '50%',
              boxShadow: '0 0 10px var(--accent)',
              border: '2px solid var(--bg)'
            }}
          />
        )}
      </div>

      <div className="conv-info">
        <div className="conv-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {otherAlias}
            {otherUser?.membresia && <Crown size={12} color="var(--accent)" />}
          </span>
          <span className="conv-time">{timeStr}</span>
        </div>
        <div className="conv-preview" style={{ fontWeight: hasUnread ? 'bold' : 'normal', color: hasUnread ? 'var(--text)' : 'var(--secondary)' }}>
          {lastMsg}
        </div>
      </div>
    </div>
  );
}
