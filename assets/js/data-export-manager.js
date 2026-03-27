/**
 * Data Export Manager - Descargar todos los datos de la aplicación
 * 
 * Funciones:
 * - downloadAllUsers()      → Descargar todos los users
 * - downloadGlobalChat()    → Descargar conversación global
 * - downloadAllConversations() → Descargar todas las conversaciones
 * - exportAsJSON()          → Exportar como archivo JSON
 * - exportAsCSV()           → Exportar como archivo CSV
 */

import { 
  db, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  getDoc 
} from './firebase-config.js';

export class DataExportManager {
  constructor() {
    this.allUsers = [];
    this.allConversations = {};
    this.globalChat = null;
  }

  /**
   * 📥 Descargar TODOS les usuaries
   * @returns {Promise<Array>} Array de usuaries con todos sus datos
   */
  async downloadAllUsers() {
    console.log('📥 Descargando todos les usuaries...');
    
    try {
      const usersCol = collection(db, 'users');
      const snap = await getDocs(usersCol);
      
      this.allUsers = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✓ ${this.allUsers.length} usuaries descargades`);
      
      return this.allUsers;
    } catch (e) {
      console.error('❌ Error descargando usuaries:', e);
      throw e;
    }
  }

  /**
   * 🌐 Descargar CONVERSACIÓN GLOBAL (chat global)
   * @returns {Promise<Object>} Mensajes de la conversación global
   */
  async downloadGlobalChat() {
    console.log('🌐 Descargando conversación global...');
    
    try {
      // 1. Buscar la conversación con nombre "global"
      const convCol = collection(db, 'conversaciones');
      const snap = await getDocs(convCol);
      
      let globalConvId = null;
      
      // Buscar conversación con nombre "global" o id "global"
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (doc.id === 'global' || data.nombre === 'global' || data.tipo === 'global') {
          globalConvId = doc.id;
          console.log(`✓ Conversación global encontrada: ${globalConvId}`);
        }
      });

      if (!globalConvId) {
        console.warn('⚠️ No se encontró conversación global. Usando primer documento encontrado.');
        if (snap.docs.length > 0) {
          globalConvId = snap.docs[0].id;
        } else {
          throw new Error('No hay conversaciones disponibles');
        }
      }

      // 2. Descargar mensajes de la conversación global
      const messagesCol = collection(db, 'conversaciones', globalConvId, 'mensajes');
      const messagesQuery = query(messagesCol, orderBy('timestamp', 'asc'));
      const messagesSnap = await getDocs(messagesQuery);

      this.globalChat = {
        conversationId: globalConvId,
        messages: messagesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };

      console.log(`✓ ${this.globalChat.messages.length} mensajes descargados de ${globalConvId}`);
      
      return this.globalChat;
    } catch (e) {
      console.error('❌ Error descargando chat global:', e);
      throw e;
    }
  }

  /**
   * 💬 Descargar TODAS las conversaciones con sus mensajes
   * @returns {Promise<Object>} Objeto con todas las conversaciones
   */
  async downloadAllConversations() {
    console.log('💬 Descargando todas las conversaciones...');
    
    try {
      const convCol = collection(db, 'conversaciones');
      const convSnap = await getDocs(convCol);

      this.allConversations = {};

      // Para cada conversación, descargar sus mensajes
      for (const convDoc of convSnap.docs) {
        const convId = convDoc.id;
        const convData = convDoc.data();

        console.log(`  📥 Descargando mensajes de "${convId}"...`);

        // Obtener mensajes
        const messagesCol = collection(db, 'conversaciones', convId, 'mensajes');
        const messagesQuery = query(messagesCol, orderBy('timestamp', 'asc'));
        const messagesSnap = await getDocs(messagesQuery);

        this.allConversations[convId] = {
          metadata: convData,
          messageCount: messagesSnap.size,
          messages: messagesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        };

        console.log(`    ✓ ${messagesSnap.size} mensajes`);
      }

      console.log(`✓ ${Object.keys(this.allConversations).length} conversaciones descargadas`);
      
      return this.allConversations;
    } catch (e) {
      console.error('❌ Error descargando conversaciones:', e);
      throw e;
    }
  }

  /**
   * 📊 Obtener estadísticas de los datos (mejorado)
   */
  getStats() {
    let totalMessagesPersonal = 0;
    let totalConversationsPersonal = 0;

    Object.entries(this.allConversations).forEach(([convId, convData]) => {
      if (convId !== 'global') {
        totalMessagesPersonal += convData.messages?.length || 0;
        totalConversationsPersonal += 1;
      }
    });

    return {
      usuarios: this.allUsers.length,
      conversacionesPersonales: totalConversationsPersonal,
      mensajesGlobales: this.globalChat?.messages.length || 0,
      mensajesPersonales: totalMessagesPersonal,
      mensajesTotales: (this.globalChat?.messages.length || 0) + totalMessagesPersonal,
      chatGlobalId: this.globalChat?.conversationId || 'No descargado',
      fechaDescarga: new Date().toISOString()
    };
  }

  /**
   * 📋 Obtener resumen legible de los datos
   */
  getSummary() {
    const stats = this.getStats();
    console.log(`
    ╔════════════════════════════════════════╗
    ║         RESUMEN DE DATOS               ║
    ╠════════════════════════════════════════╣
    ║ 👥 Usuaries:              ${String(stats.usuarios).padEnd(16)} ║
    ║ 💬 Chat Global:           ${String(stats.mensajesGlobales + ' msgs').padEnd(16)} ║
    ║ 👤 Chats Personales:      ${String(stats.conversacionesPersonal).padEnd(16)} ║
    ║ 📧 Mensajes Personales:   ${String(stats.mensajesPersonales + ' msgs').padEnd(16)} ║
    ║ 🗣️ TOTAL MENSAJES:         ${String(stats.mensajesTotales + ' msgs').padEnd(16)} ║
    ╚════════════════════════════════════════╝
    `);
    return stats;
  }

  /**
   * 💾 Exportar como JSON
   * @param {string} filename - Nombre del archivo a descargar
   * @param {string} type - Tipo de datos: 'users', 'global', 'all'
   */
  exportAsJSON(type = 'all', filename = null) {
    console.log(`💾 Exportando como JSON (${type})...`);
    
    let data = {};
    let defaultFilename = `export-${type}-${new Date().toISOString().split('T')[0]}.json`;

    if (type === 'users' || type === 'all') {
      data.users = this.allUsers;
    }
    if (type === 'global' || type === 'all') {
      data.globalChat = this.globalChat;
    }
    if (type === 'all') {
      data.allConversations = this.allConversations;
      data.stats = this.getStats();
    }

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    this.downloadFile(blob, filename || defaultFilename);

    console.log(`✓ Archivo descargado: ${filename || defaultFilename}`);
  }

  /**
   * 📄 Exportar usuaries como CSV
   */
  async exportUsersCSV() {
    console.log('📄 Exportando usuaries como CSV...');
    
    if (this.allUsers.length === 0) {
      console.warn('⚠️ No hay usuaries para exportar');
      return;
    }

    // Obtener todas las keys de los usuaries
    const allKeys = new Set();
    this.allUsers.forEach(user => {
      Object.keys(user).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const rows = this.allUsers.map(user => {
      return headers.map(header => {
        const value = user[header];
        // Escapar valores para CSV
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      });
    });

    const csv = [headers.map(h => `"${h}"`), ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const defaultFilename = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    this.downloadFile(blob, filename || defaultFilename);
    console.log(`✓ CSV descargado: ${filename || defaultFilename}`);
  }

  /**
   * � Detectar tipo de mensaje (global vs personal)
   */
  detectMessageType(msg) {
    if (msg.from !== undefined && msg.remitente === undefined) {
      return 'global';      // Tiene 'from' pero no 'remitente'
    } else if (msg.remitente !== undefined && msg.destinatario !== undefined) {
      return 'personal';    // Tiene 'remitente' Y 'destinatario'
    }
    return 'unknown';
  }

  /**
   * 🔄 Normalizar mensaje a estructura uniforme
   */
  normalizeMessage(msg, type = null) {
    const msgType = type || this.detectMessageType(msg);
    
    return {
      id: msg.id || '',
      remitente: msgType === 'global' ? msg.from : msg.remitente,
      destinatario: msgType === 'global' ? 'Chat Global' : msg.destinatario,
      texto: msg.text || msg.mensaje || '',
      fechaHora: msg.timestamp 
        ? new Date(msg.timestamp.seconds * 1000).toISOString() 
        : '',
      leido: msg.leido ?? (msgType === 'global' ? true : false),
      tipo: msg.tipo || 'text',
      tipoChat: msgType
    };
  }

  /**
   * 💬 Exportar conversación global como CSV (mejorado)
   * @param {string} filename - Nombre del archivo
   */
  exportGlobalChatAsCSV(filename = null) {
    console.log('💬 Exportando chat global como CSV...');
    
    if (!this.globalChat || this.globalChat.messages.length === 0) {
      console.warn('⚠️ No hay mensajes para exportar');
      return;
    }

    // Normalizar mensajes
    const normalizedMessages = this.globalChat.messages.map(msg => 
      this.normalizeMessage(msg, 'global')
    );

    const headers = ['id', 'remitente', 'destinatario', 'texto', 'fechaHora', 'leido', 'tipo'];
    const rows = normalizedMessages.map(msg => [
      msg.id,
      msg.remitente || 'Desconocido',
      msg.destinatario,
      `"${msg.texto.replace(/"/g, '""')}"`,
      msg.fechaHora,
      msg.leido ? 'Sí' : 'No',
      msg.tipo
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => typeof cell === 'string' ? cell : `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const defaultFilename = `chat-global-${new Date().toISOString().split('T')[0]}.csv`;
    
    this.downloadFile(blob, filename || defaultFilename);
    console.log(`✓ CSV descargado: ${filename || defaultFilename}`);
  }

  /**
   * 👥 Exportar todos los chats personales como CSV
   * @param {string} filename - Nombre del archivo
   */
  exportPersonalChatsAsCSV(filename = null) {
    console.log('👥 Exportando chats personales como CSV...');
    
    const allMessages = [];

    // Recopilar todos los mensajes personales
    Object.entries(this.allConversations).forEach(([convId, convData]) => {
      if (convId !== 'global' && convData.messages && convData.messages.length > 0) {
        convData.messages.forEach(msg => {
          allMessages.push(this.normalizeMessage(msg, 'personal'));
        });
      }
    });

    if (allMessages.length === 0) {
      console.warn('⚠️ No hay mensajes personales para exportar');
      return;
    }

    const headers = ['id', 'remitente', 'destinatario', 'texto', 'fechaHora', 'leido', 'tipo'];
    const rows = allMessages.map(msg => [
      msg.id,
      msg.remitente || 'Desconocido',
      msg.destinatario || 'Desconocido',
      `"${msg.texto.replace(/"/g, '""')}"`,
      msg.fechaHora,
      msg.leido ? 'Sí' : 'No',
      msg.tipo
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => typeof cell === 'string' ? cell : `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const defaultFilename = `chats-personales-${new Date().toISOString().split('T')[0]}.csv`;
    
    this.downloadFile(blob, filename || defaultFilename);
    console.log(`✓ CSV descargado: ${filename || defaultFilename}`);
  }

  /**
   * 🗣️ Exportar todos los mensajes normalizados como CSV
   * @param {string} filename - Nombre del archivo
   */
  exportAllMessagesAsCSV(filename = null) {
    console.log('🗣️ Exportando todos los mensajes como CSV...');
    
    const allMessages = [];

    // Agregar mensajes globales
    if (this.globalChat && this.globalChat.messages.length > 0) {
      this.globalChat.messages.forEach(msg => {
        allMessages.push(this.normalizeMessage(msg, 'global'));
      });
    }

    // Agregar mensajes personales
    Object.entries(this.allConversations).forEach(([convId, convData]) => {
      if (convId !== 'global' && convData.messages && convData.messages.length > 0) {
        convData.messages.forEach(msg => {
          allMessages.push(this.normalizeMessage(msg, 'personal'));
        });
      }
    });

    if (allMessages.length === 0) {
      console.warn('⚠️ No hay mensajes para exportar');
      return;
    }

    // Ordenar por fecha
    allMessages.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

    const headers = ['id', 'remitente', 'destinatario', 'texto', 'fechaHora', 'leido', 'tipo', 'tipoChat'];
    const rows = allMessages.map(msg => [
      msg.id,
      msg.remitente || 'Desconocido',
      msg.destinatario || 'Desconocido',
      `"${msg.texto.replace(/"/g, '""')}"`,
      msg.fechaHora,
      msg.leido ? 'Sí' : 'No',
      msg.tipo,
      msg.tipoChat
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => typeof cell === 'string' ? cell : `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const defaultFilename = `todos-mensajes-${new Date().toISOString().split('T')[0]}.csv`;
    
    this.downloadFile(blob, filename || defaultFilename);
    console.log(`✓ CSV descargado: ${filename || defaultFilename}`);
  }

  /**
   * 🔍 Separar conversaciones globales y personales
   */
  separateConversations() {
    const global = {};
    const personal = {};

    Object.entries(this.allConversations).forEach(([convId, convData]) => {
      if (convId === 'global') {
        global[convId] = convData;
      } else {
        personal[convId] = convData;
      }
    });

    return { global, personal };
  }

  /**
   * 📥 Obtener solo conversaciones personales
   */
  getPersonalConversations() {
    const { personal } = this.separateConversations();
    return personal;
  }

  /**
   * 🌐 Obtener solo conversación global
   */
  getGlobalConversation() {
    const { global } = this.separateConversations();
    return global;
  }

  /**
   * 🔄 Filtrar datos descargados
   * @param {string} type - Tipo: 'users', 'global'
   * @param {Function} filterFn - Función de filtro
   */
  filter(type, filterFn) {
    if (type === 'users') {
      return this.allUsers.filter(filterFn);
    } else if (type === 'global') {
      return this.globalChat?.messages.filter(filterFn) || [];
    }
  }

  /**
   * 🔍 Buscar en los datos descargados
   */
  search(type, searchTerm) {
    const term = searchTerm.toLowerCase();

    if (type === 'users') {
      return this.allUsers.filter(user => 
        JSON.stringify(user).toLowerCase().includes(term)
      );
    } else if (type === 'global') {
      return this.globalChat?.messages.filter(msg =>
        JSON.stringify(msg).toLowerCase().includes(term)
      ) || [];
    }
  }

  /**
   * 📥 Descargar archivo
   */
  downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * 🧹 Limpiar datos en memoria
   */
  clear() {
    this.allUsers = [];
    this.allConversations = {};
    this.globalChat = null;
    console.log('✓ Datos limpiados de memoria');
  }

  /**
   * 📊 Obtener información sin descargar (más rápido)
   */
  async getInfo() {
    console.log('📊 Obteniendo información...');
    
    try {
      // Contar usuaries
      const usersSnap = await getDocs(collection(db, 'users'));
      
      // Contar conversaciones
      const convSnap = await getDocs(collection(db, 'conversaciones'));

      const info = {
        users: {
          count: usersSnap.size,
          sample: usersSnap.docs.slice(0, 3).map(d => ({ id: d.id, ...d.data() }))
        },
        conversations: {
          count: convSnap.size,
          ids: convSnap.docs.map(d => d.id)
        },
        timestamp: new Date().toISOString()
      };

      console.log('✓ Información obtenida');
      return info;
    } catch (e) {
      console.error('❌ Error obteniendo info:', e);
      throw e;
    }
  }
}

// Exportar instancia singleton
export default new DataExportManager();
