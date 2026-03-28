import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ConversationItem } from '../components/chat/ConversationItem';
import { ChatWindow } from '../components/chat/ChatWindow';
import { MessageSquare, Search } from 'lucide-react';
import { fetchUserProfile } from '../lib/fetchUserProfile';

export function InboxPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOtherUser, setActiveOtherUser] = useState(null);

  const currentUserAlias = profile?.alias || localStorage.getItem('alias');

  // URL search params logic
  useEffect(() => {
    if (!currentUserAlias) return;

    const params = new URLSearchParams(location.search);
    const targetAlias = params.get('with');

    if (targetAlias && targetAlias !== currentUserAlias) {
      setActiveOtherUser(null); // Limpiar datos previos antes de cargar el nuevo perfil
      initiateChatWith(targetAlias);
    }
  }, [location.search, currentUserAlias]);

  async function initiateChatWith(targetAlias) {
    const participants = [currentUserAlias, targetAlias].sort();
    const convId = participants.join('_');

    const convRef = doc(db, 'conversaciones', convId);
    const convSnap = await getDoc(convRef);

    if (!convSnap.exists()) {
      const targetUser = await fetchUserProfile(targetAlias);
      if (!targetUser) return;

      await setDoc(convRef, {
        participantes: participants,
        timestamp: serverTimestamp(),
        ultimoMensaje: '',
        ultimoRemitente: '',
        visto: true
      });
    }

    setActiveConvId(convId);
    const res = await fetchUserProfile(targetAlias);
    if (res) setActiveOtherUser(res.data);
  }

  // Real-time conversations list
  useEffect(() => {
    if (!currentUserAlias) return;

    const q = query(
      collection(db, 'conversaciones'),
      where('participantes', 'array-contains', currentUserAlias)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by timestamp desc
      convs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setConversations(convs);
    });

    return () => unsubscribe();
  }, [currentUserAlias]);

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const s = searchTerm.toLowerCase();
    return conversations.filter(c => {
      const other = c.participantes.find(p => p !== currentUserAlias) || '';
      return other.toLowerCase().includes(s);
    });
  }, [conversations, searchTerm, currentUserAlias]);

  const activeConv = useMemo(() => {
    return conversations.find(c => c.id === activeConvId);
  }, [conversations, activeConvId]);

  const otherAlias = useMemo(() => {
    if (!activeConv) return null;
    return activeConv.participantes.find(p => p !== currentUserAlias);
  }, [activeConv, currentUserAlias]);

  const handleSelectConv = (conv) => {
    const other = conv.participantes.find(p => p !== currentUserAlias);
    if (!other) return;
    
    // Al navegar a la misma ruta con diferente query param, el useEffect de [location.search] se encargará del resto
    navigate(`/inbox?with=${encodeURIComponent(other)}`, { replace: true });
  };

  return (
    <div className="inbox-container">
      {/* Sidebar */}
      <aside className={`inbox-sidebar ${activeConvId ? 'is-hidden' : ''}`}>
        <div className="inbox-sidebar-header">
          <h2>MENSAJES</h2>
          <div style={{ position: 'relative', marginTop: 12 }}>
            <Search 
              size={16} 
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} 
            />
            <input 
              type="text" 
              className="chat-input"
              style={{ paddingLeft: 34, width: '100%', fontSize: '0.9rem' }}
              placeholder="Buscar conversación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="conversations-list">
          {filteredConversations.length === 0 ? (
            <div className="inbox-empty" style={{ opacity: 0.3 }}>
              {searchTerm ? 'Búsqueda sin resultados' : 'No hay conversaciones'}
            </div>
          ) : (
            filteredConversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                currentUserAlias={currentUserAlias}
                isActive={activeConvId === conv.id}
                onClick={() => handleSelectConv(conv)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Main Chat area */}
      {activeConvId ? (
        <ChatWindow 
          conversationId={activeConvId}
          currentUserAlias={currentUserAlias}
          otherAlias={otherAlias}
          otherUser={activeOtherUser}
          onBack={() => {
            setActiveConvId(null);
            setActiveOtherUser(null);
            navigate('/inbox', { replace: true });
          }}
        />
      ) : (
        <div className="inbox-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="inbox-empty">
            <MessageSquare size={64} style={{ marginBottom: 20 }} />
            <p style={{ letterSpacing: 4 }}>SELECCIONA UN CANAL</p>
          </div>
        </div>
      )}
    </div>
  );
}
