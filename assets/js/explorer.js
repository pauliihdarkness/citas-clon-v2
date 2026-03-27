import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, addDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { showToast } from './utils.js';

const elements = {
  collectionList: document.getElementById('collection-list'),
  documentList: document.getElementById('document-list'),
  documentDetail: document.getElementById('document-detail'),
  searchInput: document.getElementById('search-input'),
  footer: document.getElementById('explorer-footer'),
  progressBar: document.getElementById('progress-bar'),
  processName: document.getElementById('process-name'),
  progressPercent: document.getElementById('progress-percent')
};

let currentCollection = 'users';
let allDocs = []; // Store all documents for filtering
let currentDocData = null;
let currentDocPath = "";
let modifiedData = {};
let progressInterval = null;

function showProgress(name) {
  if (progressInterval) clearInterval(progressInterval);
  elements.processName.textContent = `EJECUTANDO: ${name.toUpperCase()}...`;
  elements.footer.classList.add('active');
  let width = 0;
  elements.progressBar.style.width = '0%';
  elements.progressPercent.textContent = '0%';

  progressInterval = setInterval(() => {
    if (width >= 90) {
      clearInterval(progressInterval);
    } else {
      width += Math.random() * 15;
      if (width > 90) width = 90;
      elements.progressBar.style.width = width + '%';
      elements.progressPercent.textContent = Math.round(width) + '%';
    }
  }, 100);
}

function finishProgress() {
  clearInterval(progressInterval);
  elements.progressBar.style.width = '100%';
  elements.progressPercent.textContent = '100%';
  setTimeout(() => {
    elements.footer.classList.remove('active');
  }, 500);
}

async function fetchDocuments(collName) {
  showProgress(`LISTANDO ${collName}`);
  elements.documentList.innerHTML = '<p class="loading">Cargando docs de ' + collName + '...</p>';
  try {
    const collRef = collection(db, collName);
    const q = query(collRef);
    const snapshot = await getDocs(q);

    allDocs = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      data: docSnap.data()
    }));

    renderDocuments(allDocs);
    finishProgress();
  } catch (err) {
    finishProgress();
    console.error(err);
    elements.documentList.innerHTML = `<p class="error">Error al cargar: ${err.message}</p>`;
  }
}

function renderDocuments(docs) {
  elements.documentList.innerHTML = '';
  if (docs.length === 0) {
    elements.documentList.innerHTML = '<p class="empty">No hay resultados.</p>';
    return;
  }

  docs.forEach(docObj => {
    const data = docObj.data;
    const item = document.createElement('button');
    item.className = 'list-item';
    item.dataset.id = docObj.id;

    const label = data.alias || data.participantes?.join(', ') || docObj.id;
    item.textContent = `> ${label}`;

    item.onclick = () => showDocument(currentCollection, docObj.id);
    elements.documentList.appendChild(item);
  });
}

// Search Logic
elements.searchInput.oninput = (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allDocs.filter(docObj => {
    const data = docObj.data;
    const label = (data.alias || data.participantes?.join(', ') || docObj.id).toLowerCase();
    return label.includes(query);
  });
  renderDocuments(filtered);
};

async function showDocument(collName, docId) {
  // Update active state in list
  elements.documentList.querySelectorAll('.list-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === docId);
  });

  try {
    showProgress(`ABRIENDO ${docId}`);
    elements.documentDetail.innerHTML = '<p class="loading">Cargando detalle...</p>';
    const docSnap = await getDoc(doc(db, collName, docId));

    if (!docSnap.exists()) {
      elements.documentDetail.innerHTML = '<p class="empty">Documento no encontrado</p>';
      return;
    }

    currentDocData = docSnap.data();
    currentDocPath = `${collName}/${docId}`;
    modifiedData = {}; // Reset changes

    renderDetailWithFilter("");

    // If it's a conversation, also show subcollection "mensajes"
    if (collName === 'conversaciones') {
      const msgsHeader = document.createElement('h4');
      msgsHeader.textContent = 'Subcolección: Mensajes';
      msgsHeader.style.marginTop = '24px';
      elements.documentDetail.appendChild(msgsHeader);

      const msgsList = document.createElement('div');
      msgsList.className = 'messages-preview';
      elements.documentDetail.appendChild(msgsList);

      fetchMessages(docId, msgsList);
    }

    // If it's a user, also show subcollection "likesGiven"
    if (collName === 'users') {
      const likesHeader = document.createElement('h4');
      likesHeader.textContent = 'Subcolección: Likes Dados (likesGiven)';
      likesHeader.style.marginTop = '24px';
      elements.documentDetail.appendChild(likesHeader);

      const likesList = document.createElement('div');
      likesList.className = 'messages-preview'; // Usamos isma clase para reciclar el CSS
      elements.documentDetail.appendChild(likesList);

      fetchlikesGivenn(docId, likesList);
    }
    finishProgress();
  } catch (err) {
    finishProgress();
    elements.documentDetail.innerHTML = `<p class="error">Error: ${err.message}</p>`;
  }
}

function renderDetailWithFilter(query) {
  if (!currentDocData) return;

  const displayData = { ...currentDocData, ...modifiedData };
  const filteredData = {};
  const lowerQuery = query.toLowerCase();

  Object.keys(displayData).forEach(key => {
    if (key.toLowerCase().includes(lowerQuery) ||
      String(displayData[key]).toLowerCase().includes(lowerQuery)) {
      filteredData[key] = displayData[key];
    }
  });

  // Convert JSON to HTML string and make specific fields clickable/editable
  let jsonLines = JSON.stringify(filteredData, null, 2).split('\n');

  const processedLines = jsonLines.map(line => {
    // Regex to match "key": "value" or "key": number/boolean
    const match = line.match(/^(\s*)"([^"]+)":\s*(.*),?$/);
    if (match) {
      const indent = match[1];
      const key = match[2];
      let valRaw = match[3].replace(/,$/, '');

      // If it's a primitive value (not object/array)
      if (!valRaw.startsWith('{') && !valRaw.startsWith('[')) {
        const isModified = modifiedData.hasOwnProperty(key);
        const displayValue = valRaw.startsWith('"') ? valRaw.slice(1, -1) : valRaw;

        // Check if it's an image link
        if (key === 'fotoPerfilUrl' || key === 'dniUrl') {
          return `${indent}"${key}": "<span class="clickable-link" data-url="${displayValue}">${displayValue}</span>",`;
        }

        return `${indent}"${key}": <span class="editable-value ${isModified ? 'modified' : ''}" data-key="${key}" data-val="${displayValue}">${valRaw}</span>,`;
      }
    }
    return line;
  });

  const hasChanges = Object.keys(modifiedData).length > 0;

  elements.documentDetail.innerHTML = `
    <div class="doc-path-bar">
      <span class="path-label">PATH: ${currentDocPath}/</span>
      <input type="text" class="path-search-input" placeholder="buscar..." value="${query}">
      <div style="display: flex; gap: 8px;">
        <button class="btn-small" id="delete-doc-btn" style="background: var(--bg); border-color: var(--error); color: var(--error);">ELIMINAR DOC</button>
        <button class="btn-small" id="add-field-btn" style="background: var(--bg); border-color: var(--accent); color: var(--accent);">+ AGREGAR CAMPO</button>
        <button class="btn-save ${hasChanges ? 'visible' : ''}" id="save-btn">GUARDAR CAMBIOS</button>
      </div>
    </div>
    <div class="json-view">
      <pre>${processedLines.join('\n')}</pre>
    </div>
  `;

  // Restore focus if it was a search
  const pathInput = elements.documentDetail.querySelector('.path-search-input');
  if (query) {
    pathInput.focus();
    pathInput.setSelectionRange(query.length, query.length);
  }

  pathInput.oninput = (e) => {
    renderDetailWithFilter(e.target.value);
  };

  // Click to Edit Logic
  elements.documentDetail.querySelectorAll('.editable-value').forEach(el => {
    el.onclick = () => {
      const key = el.dataset.key;
      const oldVal = el.dataset.val;
      openEditModal(key, oldVal);
    };
  });

  // Save changes logic (Backend Update)
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'GUARDANDO...';
      showProgress(`ACTUALIZANDO ${currentDocPath}`);
      try {
        const [coll, id] = currentDocPath.split('/');
        await updateDoc(doc(db, coll, id), modifiedData);
        showToast('Documento actualizado correctamente.');
        currentDocData = { ...currentDocData, ...modifiedData };
        modifiedData = {};
        renderDetailWithFilter("");
        finishProgress();
      } catch (err) {
        finishProgress();
        showToast('Error al guardar: ' + err.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'GUARDAR CAMBIOS';
      }
    };
  }

  // Add Field Logic
  const addFieldBtn = document.getElementById('add-field-btn');
  if (addFieldBtn) {
    addFieldBtn.onclick = () => openAddModal();
  }

  // Delete Document Logic
  const deleteBtn = document.getElementById('delete-doc-btn');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (!confirm(`¿ESTÁS SEGURO DE QUE DESEAS ELIMINAR ESTE DOCUMENTO?\n${currentDocPath}\n\nEsta acción no se puede deshacer.`)) return;

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'ELIMINANDO...';
      showProgress(`ELIMINANDO ${currentDocPath}`);
      try {
        const [coll, id] = currentDocPath.split('/');
        await deleteDoc(doc(db, coll, id));
        showToast('Documento eliminado correctamente.');

        // Refresh list and clear detail
        fetchDocuments(currentCollection);
        elements.documentDetail.innerHTML = '<p class="empty">Documento eliminado</p>';
        currentDocData = null;
        currentDocPath = "";
        finishProgress();
      } catch (err) {
        finishProgress();
        showToast('Error al eliminar: ' + err.message, 'error');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'ELIMINAR DOC';
      }
    };
  }

  // Add click listeners to image links
  elements.documentDetail.querySelectorAll('.clickable-link').forEach(link => {
    link.onclick = (e) => {
      openModal(e.target.dataset.url, currentDocData.nombre || currentDocData.alias || "IMAGEN");
    };
  });
}

// Image Modal Logic
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = modal.querySelector('.modal-header span');
const closeModal = document.getElementById('close-modal');

// Edit Modal Logic
const editModal = document.getElementById('edit-modal');
const editInput = document.getElementById('edit-value-input');
const editKeyDisplay = document.getElementById('edit-key-display');
const saveEditBtn = document.getElementById('save-edit');
const cancelEditBtn = document.getElementById('cancel-edit');
const closeEditBtn = document.getElementById('close-edit-modal');

let currentEditingKey = null;

function openEditModal(key, val) {
  currentEditingKey = key;
  editKeyDisplay.textContent = `CAMPO: ${key}`;
  editInput.value = val;
  editModal.classList.add('active');
  editInput.focus();
}

function closeEditModal() {
  editModal.classList.remove('active');
}

closeEditBtn.onclick = closeEditModal;
cancelEditBtn.onclick = closeEditModal;

saveEditBtn.onclick = () => {
  if (!currentEditingKey) return;
  const newVal = editInput.value;
  const oldVal = String(currentDocData[currentEditingKey]);

  if (newVal !== oldVal) {
    let parsedVal = newVal;
    if (newVal.toLowerCase() === 'true') parsedVal = true;
    else if (newVal.toLowerCase() === 'false') parsedVal = false;
    else if (!isNaN(newVal) && newVal.trim() !== '') parsedVal = Number(newVal);

    modifiedData[currentEditingKey] = parsedVal;

    // Get current search query to maintain view context
    const pathInput = elements.documentDetail.querySelector('.path-search-input');
    renderDetailWithFilter(pathInput ? pathInput.value : "");
  }
  closeEditModal();
};

editModal.onclick = (e) => {
  if (e.target === editModal) closeEditModal();
};

// Add Field Modal Logic
const addModal = document.getElementById('add-field-modal');
const addKeyInput = document.getElementById('add-key-input');
const addValueInput = document.getElementById('add-value-input');
const saveAddBtn = document.getElementById('save-add');
const cancelAddBtn = document.getElementById('cancel-add');
const closeAddBtn = document.getElementById('close-add-modal');

function openAddModal() {
  addKeyInput.value = '';
  addValueInput.value = '';
  addModal.classList.add('active');
  addKeyInput.focus();
}

function closeAddModal() {
  addModal.classList.remove('active');
}

closeAddBtn.onclick = closeAddModal;
cancelAddBtn.onclick = closeAddModal;

saveAddBtn.onclick = async () => {
  const key = addKeyInput.value.trim();
  const val = addValueInput.value;

  if (key === "") {
    showToast('La clave no puede estar vacía', 'error');
    return;
  }

  saveAddBtn.disabled = true;
  saveAddBtn.textContent = 'GUARDANDO...';

  try {
    let parsedVal = val;
    if (val.toLowerCase() === 'true') parsedVal = true;
    else if (val.toLowerCase() === 'false') parsedVal = false;
    else if (!isNaN(val) && val.trim() !== '') parsedVal = Number(val);

    const [coll, id] = currentDocPath.split('/');
    const docRef = doc(db, coll, id);

    await updateDoc(docRef, { [key]: parsedVal });

    showToast(`Campo "${key}" agregado correctamente.`);
    currentDocData[key] = parsedVal;

    const pathInput = elements.documentDetail.querySelector('.path-search-input');
    renderDetailWithFilter(pathInput ? pathInput.value : "");
    closeAddModal();
  } catch (err) {
    showToast('Error al agregar campo: ' + err.message, 'error');
  } finally {
    saveAddBtn.disabled = false;
    saveAddBtn.textContent = '[ ACEPTAR ]';
  }
};

addModal.onclick = (e) => {
  if (e.target === addModal) closeAddModal();
};

// Add Document Modal Logic
const addDocModal = document.getElementById('add-doc-modal');
const addDocIdInput = document.getElementById('add-doc-id-input');
const addDocCollDisplay = document.getElementById('add-doc-collection-display');
const addDocFieldsContainer = document.getElementById('add-doc-fields-container');
const saveAddDocBtn = document.getElementById('save-add-doc');
const cancelAddDocBtn = document.getElementById('cancel-add-doc');
const closeAddDocBtn = document.getElementById('close-add-doc-modal');
const addDocBtn = document.getElementById('add-doc-btn');

const userFormFields = [
  { name: 'alias', type: 'text', default: '' },
  { name: 'authUid', type: 'text', default: '' },
  { name: 'edad', type: 'number', default: 18 },
  { name: 'pais', type: 'text', default: 'Argentina' },
  { name: 'provincia', type: 'text', default: '' },
  { name: 'ciudad', type: 'text', default: '' },
  { name: 'departamento', type: 'text', default: '' },
  { name: 'orientacion', type: 'text', default: '' },
  { name: 'busqueda', type: 'text', default: 'Lo que se pueda' },
  { name: 'soledad', type: 'text', default: 'Nop' },
  { name: 'animales', type: 'text', default: '' },
  { name: 'torta', type: 'text', default: '' },
  { name: 'salud', type: 'text', default: '' },
  { name: 'link', type: 'text', default: '' },
  { name: 'fotoPerfilUrl', type: 'text', default: '' },
  { name: 'fcmToken', type: 'text', default: '' },
  { name: 'platform', type: 'text', default: 'android' },
  { name: 'membresia', type: 'checkbox', default: false },
  { name: 'isOnline', type: 'checkbox', default: false },
  { name: 'showOnlineStatus', type: 'checkbox', default: true },
  { name: 'tycAccepted', type: 'checkbox', default: true },
  { name: 'notifPreference', type: 'checkbox', default: true },
  { name: 'likeCount', type: 'number', default: 0 },
  { name: 'mensajesEnviados', type: 'number', default: 0 },
  { name: 'ageFilterMin', type: 'number', default: 18 },
  { name: 'ageFilterMax', type: 'number', default: 99 },
  { name: 'filterPais', type: 'text', default: '' },
  { name: 'filterProvincia', type: 'text', default: '' },
  { name: 'filterCiudad', type: 'text', default: '' },
  { name: 'filterOrientacion', type: 'text', default: 'todas' }
];

function renderUserForm() {
  addDocFieldsContainer.innerHTML = '<h4 style="margin: 0 0 10px 0; color: var(--accent);">Campos de Usuario</h4>';

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gap = '10px';
  addDocFieldsContainer.appendChild(grid);

  userFormFields.forEach(field => {
    const box = document.createElement('div');
    if (field.type === 'checkbox') {
      box.innerHTML = `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85em; color: var(--secondary); margin-top: 10px; cursor: pointer;">
          <input type="checkbox" id="form-field-${field.name}" ${field.default ? 'checked' : ''} style="cursor: pointer;">
          ${field.name.toUpperCase()}
        </label>
      `;
    } else {
      box.innerHTML = `
        <label style="font-size: 0.8em; color: var(--secondary); display: block; margin-bottom: 4px;">${field.name.toUpperCase()}:</label>
        <input type="${field.type}" id="form-field-${field.name}" value="${field.default}" style="width: 100%; border: 1px solid var(--border); background: var(--bg); color: var(--text); padding: 6px; box-sizing: border-box;" />
      `;
    }
    grid.appendChild(box);
  });
}

function getFormData() {
  const data = {};
  userFormFields.forEach(field => {
    const el = document.getElementById(`form-field-${field.name}`);
    if (!el) return;
    if (field.type === 'checkbox') {
      data[field.name] = el.checked;
    } else if (field.type === 'number') {
      data[field.name] = Number(el.value);
    } else {
      data[field.name] = el.value;
    }
  });

  // Agregar timestamps requeridos de firestore para la BD actual
  const now = new Date();
  data.creadoEn = now;
  data.lastSeen = now;
  data.lastTokenUpdate = now.toISOString();

  return data;
}

if (addDocBtn) {
  addDocBtn.onclick = () => {
    addDocCollDisplay.textContent = `COLECCIÓN: ${currentCollection}`;
    addDocIdInput.value = '';

    if (currentCollection === 'users') {
      renderUserForm();
      setTimeout(() => {
        if (addDocFieldsContainer) addDocFieldsContainer.scrollTop = 0;
      }, 10);
    } else {
      addDocFieldsContainer.innerHTML = '<p style="color:var(--secondary); font-size: 0.9em; margin-bottom: 0;">Se creará un documento vacío. Podrás agregar campos más tarde desde la vista de detalle.</p>';
    }

    addDocModal.classList.add('active');
    addDocIdInput.focus();
  };
}

function closeAddDocModal() {
  addDocModal.classList.remove('active');
}

closeAddDocBtn.onclick = closeAddDocModal;
cancelAddDocBtn.onclick = closeAddDocModal;

saveAddDocBtn.onclick = async () => {
  const docId = addDocIdInput.value.trim();

  saveAddDocBtn.disabled = true;
  saveAddDocBtn.textContent = 'CREANDO...';
  showProgress(`CREANDO DOCUMENTO EN ${currentCollection}`);

  try {
    const collRef = collection(db, currentCollection);
    let newDocRef;

    let initialData = {};
    if (currentCollection === 'users') {
      initialData = getFormData();
    } else {
      initialData = { alias: "NuevoDoc" };
    }

    if (docId) {
      newDocRef = doc(db, currentCollection, docId);
      await setDoc(newDocRef, initialData);
    } else {
      newDocRef = await addDoc(collRef, initialData);
    }

    showToast(`Documento ${newDocRef.id} creado.`);
    closeAddDocModal();
    fetchDocuments(currentCollection);
    showDocument(currentCollection, newDocRef.id);
    finishProgress();
  } catch (err) {
    finishProgress();
    showToast('Error al crear documento: ' + err.message, 'error');
  } finally {
    saveAddDocBtn.disabled = false;
    saveAddDocBtn.textContent = '[ CREAR ]';
  }
};

addDocModal.onclick = (e) => {
  if (e.target === addDocModal) closeAddDocModal();
};

function openModal(url, title = 'PREVISUALIZACIÓN') {
  modalImg.src = url;
  if (modalTitle) modalTitle.textContent = title.toUpperCase();
  modal.classList.add('active');
}

closeModal.onclick = () => {
  modal.classList.remove('active');
};

modal.onclick = (e) => {
  if (e.target === modal) modal.classList.remove('active');
};

async function fetchMessages(convId, container) {
  container.innerHTML = 'Cargando mensajes...';
  try {
    const messagesCol = collection(db, 'conversaciones', convId, 'mensajes');
    const q = query(messagesCol, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);

    container.innerHTML = '';
    snapshot.forEach(d => {
      const msgData = d.data();
      const div = document.createElement('div');
      div.className = 'msg-preview-item';
      div.innerHTML = `
        <strong>${msgData.from || msgData.remitente}:</strong> ${msgData.text || msgData.contenido}
        <small>${msgData.timestamp?.toDate().toLocaleString() || 'N/A'}</small>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    container.innerHTML = `Error: ${err.message}`;
  }
}

async function fetchlikesGivenn(userId, container) {
  container.innerHTML = 'Cargando likes dados...';
  try {
    const likesCol = collection(db, 'users', userId, 'likesGiven');
    const q = query(likesCol, orderBy('timestamp', 'desc')); // Intentamos con index
    let snapshot;

    try {
      snapshot = await getDocs(q);
    } catch (e) {
      if (e.message && e.message.includes("index")) {
        // Fallback en caso de no existir indice compuesto en Firestore
        const defaultQ = query(likesCol);
        snapshot = await getDocs(defaultQ);
      } else {
        throw e;
      }
    }

    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = '<p class="empty" style="color:var(--secondary);">No hay registros en likesGiven.</p>';
      return;
    }

    snapshot.forEach(d => {
      const likeData = d.data();
      const div = document.createElement('div');
      div.className = 'msg-preview-item';

      const toAlias = likeData.toAlias || likeData.to || d.id;
      const timestamp = likeData.timestamp?.toDate ? likeData.timestamp.toDate().toLocaleString() : 'Reciente / Desconocido';

      div.innerHTML = `
        <div style="display:flex; justify-content: space-between; align-items:flex-start;">
          <strong>ID DESTINO: ${d.id}</strong>
          <small style="color:var(--secondary);">${timestamp}</small>
        </div>
        <pre style="font-size: 0.8em; color: var(--accent); margin-top: 6px; overflow-x: auto; background: var(--bg); padding: 5px; border: 1px dashed var(--border);">${JSON.stringify(likeData, null, 2)}</pre>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
  }
}

// Initial state
elements.collectionList.onclick = (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  elements.collectionList.querySelectorAll('.list-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  currentCollection = btn.dataset.collection;
  fetchDocuments(currentCollection);
  elements.documentDetail.innerHTML = '<p class="empty">Selecciona un documento</p>';
};

fetchDocuments(currentCollection);
