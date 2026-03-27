/**
 * Export Manager — Maneja exportación de datos de la app
 * Descarga en JSON y CSV según el tipo de dato
 */

import { db, collection, getDocs, query, where, orderBy } from './firebase-config.js';
import { auth, onAuthStateChanged } from './firebase-config.js';

let currentUser = null;

// Obtener usuario actual
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    window.location.replace('./login.html');
  }
});

// Setup de botones
document.addEventListener('DOMContentLoaded', () => {
  setupExportButtons();
});

function setupExportButtons() {
  // Usuaries
  document.getElementById('export-users-json')?.addEventListener('click', () => exportUsersJSON());
  document.getElementById('export-users-csv')?.addEventListener('click', () => exportUsersCSV());

  // Chat Global
  document.getElementById('export-global-json')?.addEventListener('click', () => exportGlobalJSON());
  document.getElementById('export-global-csv')?.addEventListener('click', () => exportGlobalCSV());

  // Conversaciones Personales
  document.getElementById('export-personal-json')?.addEventListener('click', () => exportPersonalJSON());
  document.getElementById('export-personal-csv')?.addEventListener('click', () => exportPersonalCSV());

  // Todos
  document.getElementById('export-all-json')?.addEventListener('click', () => exportAllJSON());
  document.getElementById('export-all-csv')?.addEventListener('click', () => exportAllCSV());
}

// ==========================================
// EXPORTAR USUARIES
// ==========================================

async function exportUsersJSON() {
  try {
    showMessage('📥 Descargando usuaries...', 'loading');
    
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    
    const users = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const dataStr = JSON.stringify(users, null, 2);
    downloadFile(dataStr, `usuaries_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    
    showMessage(`✅ ${users.length} usuaries descargades correctamente`, 'success');
  } catch (e) {
    showMessage(`❌ Error: ${e.message}`, 'error');
  }
}

async function exportUsersCSV() {
  try {
    showMessage('📥 Descargando usuaries como CSV...', 'loading');
    
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    
    const users = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const csv = convertToCSV(users, ['id', 'alias', 'edad', 'ciudad', 'membresia', 'isOnline', 'creadoEn']);
    downloadFile(csv, `usuaries_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    
    showMessage(`✅ ${users.length} usuaries descargades como CSV`, 'success');
  } catch (e) {
    showMessage(`❌ Error: ${e.message}`, 'error');
  }
}

// ==========================================
// EXPORTAR CHAT GLOBAL
// ==========================================

async function exportGlobalJSON() {
  try {
    showMessage('📥 Descargando chat global...', 'loading');
    
    const msgCol = collection(db, 'conversaciones', 'global', 'mensajes');
    const q = query(msgCol, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    
    const messages = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const dataStr = JSON.stringify(messages, null, 2);
    downloadFile(dataStr, `chat-global_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    
    showMessage(`✅ ${messages.length} mensajes descargados correctamente`, 'success');
  } catch (e) {
    showMessage(`❌ Error: ${e.message}`, 'error');
  }
}

async function exportGlobalCSV() {
  try {
    showMessage('📥 Descargando chat global como CSV...', 'loading');
    
    const msgCol = collection(db, 'conversaciones', 'global', 'mensajes');
    const q = query(msgCol, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    
    const messages = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const csv = convertToCSV(messages, ['id', 'from', 'text', 'timestamp']);
    downloadFile(csv, `chat-global_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    
    showMessage(`✅ ${messages.length} mensajes descargados como CSV`, 'success');
  } catch (e) {
    showMessage(`❌ Error: ${e.message}`, 'error');
  }
}

// ==========================================
// EXPORTAR CONVERSACIONES PERSONALES
// ==========================================

async function exportPersonalJSON() {
  try {
    showMessage('📥 Descargando conversaciones personales...', 'loading');
    
    const convCol = collection(db, 'conversaciones');
    const q = query(convCol, where('participantes', 'array-contains', currentUser.alias));
    const snap = await getDocs(q);
    
    const conversations = [];
    
    for (const doc of snap.docs) {
      const conv = {
        id: doc.id,
        ...doc.data()
      };
      
      const msgCol = collection(db, 'conversaciones', doc.id, 'mensajes');
      const msgSnap = await getDocs(msgCol);
      conv.mensajes = msgSnap.docs.map(m => ({
        id: m.id,
        ...m.data()
      }));
      
      conversations.push(conv);
    }

    const dataStr = JSON.stringify(conversations, null, 2);
    downloadFile(dataStr, `conversaciones-personales_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    
    showMessage(`✅ ${conversations.length} conversaciones descargadas correctamente`, 'success');
  } catch (e) {
    showMessage(`❌ Error: ${e.message}`, 'error');
  }
}

async function exportPersonalCSV() {
  try {
    showMessage('📥 Descargando conversaciones personales como CSV...', 'loading');
    
    const convCol = collection(db, 'conversaciones');
    const q = query(convCol, where('participantes', 'array-contains', currentUser.alias));
    const snap = await getDocs(q);
    
    const messages = [];
    
    for (const doc of snap.docs) {
      const msgCol = collection(db, 'conversaciones', doc.id, 'mensajes');
      const msgSnap = await getDocs(msgCol);
      
      msgSnap.docs.forEach(m => {
        messages.push({
          conversationId: doc.id,
          ...m.data()
        });
      });
    }

    const csv = convertToCSV(messages, ['conversationId', 'from', 'text', 'timestamp']);
    downloadFile(csv, `conversaciones-personales_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    
    showMessage(`✅ ${messages.length} mensajes descargados como CSV`, 'success');
  } catch (e) {
    showMessage(`❌ Error: ${e.message}`, 'error');
  }
}

// ==========================================
// EXPORTAR TODO
// ==========================================

async function exportAllJSON() {
  try {
    showMessage('📥 Descargando todos los datos...', 'loading');
    
    // Usuaries
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Chat Global
    const globalMsgCol = collection(db, 'conversaciones', 'global', 'mensajes');
    const globalSnap = await getDocs(globalMsgCol);
    const globalMessages = globalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Conversaciones Personales
    const convCol = collection(db, 'conversaciones');
    const convSnap = await getDocs(convCol);
    const personalConversations = [];
    
    for (const doc of convSnap.docs) {
      const msgCol = collection(db, 'conversaciones', doc.id, 'mensajes');
      const msgSnap = await getDocs(msgCol);
      personalConversations.push({
        id: doc.id,
        ...doc.data(),
        mensajes: msgSnap.docs.map(m => ({ id: m.id, ...m.data() }))
      });
    }
    
    const allData = {
      exportDate: new Date().toISOString(),
      users,
      globalChat: globalMessages,
      personalConversations
    };

    const dataStr = JSON.stringify(allData, null, 2);
    downloadFile(dataStr, `export-completo_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    
    showMessage(`✅ Todos los datos descargados (${users.length} usuaries, ${globalMessages.length} msgs globales, ${personalConversations.length} convs)`, 'success');
  } catch (e) {
    showMessage(`❌ Error: ${e.message}`, 'error');
  }
}

async function exportAllCSV() {
  try {
    showMessage('📥 Descargando todos los datos como CSV...', 'loading');
    
    // Crear múltiples archivos CSV
    const csvFiles = [];
    
    // 1. Usuaries
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    csvFiles.push({
      name: `usuaries_${new Date().toISOString().split('T')[0]}.csv`,
      content: convertToCSV(users, ['id', 'alias', 'edad', 'ciudad', 'membresia', 'isOnline'])
    });
    
    // 2. Chat Global
    const globalMsgCol = collection(db, 'conversaciones', 'global', 'mensajes');
    const globalSnap = await getDocs(globalMsgCol);
    const globalMessages = globalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    csvFiles.push({
      name: `chat-global_${new Date().toISOString().split('T')[0]}.csv`,
      content: convertToCSV(globalMessages, ['id', 'from', 'text', 'timestamp'])
    });
    
    // Descargar el primero y mostrar nota sobre los demás
    downloadFile(csvFiles[0].content, csvFiles[0].name, 'text/csv');
    
    showMessage(`✅ Archivos CSV generados: ${csvFiles.map(f => f.name).join(', ')}`, 'success');
  } catch (e) {
    showMessage(`❌ Error: ${e.message}`, 'error');
  }
}

// ==========================================
// UTILIDADES
// ==========================================

function convertToCSV(data, headers) {
  if (!Array.isArray(data) || data.length === 0) return '';
  
  // Encabezados
  const headerRow = headers.join(',');
  
  // Rows
  const rows = data.map(item => {
    return headers.map(header => {
      const value = item[header];
      let stringValue = '';
      
      if (value === null || value === undefined) {
        stringValue = '';
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }
      
      // Escapar comillas y envolver en comillas si contiene comas
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
      }
      
      return stringValue;
    }).join(',');
  });
  
  return [headerRow, ...rows].join('\n');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showMessage(text, type = 'info') {
  const container = document.getElementById('message-container');
  if (!container) return;
  
  if (type === 'loading') {
    container.innerHTML = `<div class="loading">${text}</div>`;
  } else if (type === 'success') {
    container.innerHTML = `<div class="success-msg">${text}</div>`;
    // Auto-limpiar después de 3s
    setTimeout(() => {
      container.innerHTML = '';
    }, 3000);
  } else if (type === 'error') {
    container.innerHTML = `<div class="error-msg">${text}</div>`;
  }
}
