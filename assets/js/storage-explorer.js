import { storage, ref, listAll, getDownloadURL, uploadBytes, deleteObject } from './firebase-config.js';

const folderList = document.getElementById('folder-list');
const fileList = document.getElementById('file-list');
const breadcrumb = document.getElementById('breadcrumb');
const uploadBtn = document.getElementById('upload-btn');
const createFolderBtn = document.getElementById('create-folder-btn');
const refreshBtn = document.getElementById('refresh-btn');
const fileInput = document.getElementById('file-input');
const uploadZone = document.getElementById('upload-zone');
const footer = document.getElementById('explorer-footer');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const processName = document.getElementById('process-name');
const searchInput = document.getElementById('search-input');
const deepSearchBtn = document.getElementById('deep-search-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const editPathBtn = document.getElementById('edit-path-btn'); // Nuevo botón de salto manual
const uploadUrlBtn = document.getElementById('upload-url-btn');

const breadcrumbItems = document.getElementById('breadcrumb-items');
const storageCounters = document.getElementById('storage-counters');

let currentPath = 'fotos';
let allItems = []; // Store current directory items for filtering

// --- UI Utilities ---

function updateCounters(items) {
    const folders = items.filter(i => i.isFolder).length;
    const files = items.filter(i => !i.isFolder).length;
    storageCounters.textContent = `_ARCHIVOS: ${files} | _CARPETAS: ${folders}`;
}

function showFooter(text) {
    footer.classList.add('active');
    processName.textContent = text;
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
}

function hideFooter() {
    setTimeout(() => {
        footer.classList.remove('active');
    }, 1000);
}

function updateProgress(percent) {
    progressBar.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
}

// --- Search Implementation ---

searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allItems.filter(item => item.name.toLowerCase().includes(query));
    renderList(filtered);
    updateCounters(filtered);
};

deepSearchBtn.onclick = async () => {
    const queryStr = searchInput.value.toLowerCase();
    if (!queryStr) {
        alert("Por favor ingresa un término de búsqueda para el Escaneo Profundo.");
        return;
    }

    showFooter(`Iniciando escaneo recursivo en ${currentPath}...`);
    fileList.innerHTML = '<p class="loading">Iniciando protocolo de búsqueda recursiva...</p>';
    
    try {
        const foundItems = [];
        await performDeepScan(currentPath, queryStr, foundItems);
        
        allItems = foundItems; // Temporary set results for counters
        renderList(foundItems);
        updateCounters(foundItems);
        
        if (foundItems.length === 0) {
            fileList.innerHTML = `<p class="empty">No se encontraron coincidencias para "${queryStr}" en el sector ${currentPath} y subsectores.</p>`;
        }
    } catch (error) {
        console.error("Deep Scan error:", error);
        fileList.innerHTML = `<p class="error">ERROR DE ESCANEO PROFUNDO: ${error.message}</p>`;
    } finally {
        hideFooter();
    }
};

async function performDeepScan(path, queryStr, results) {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);

    // Add files that match
    for (const itemRef of result.items) {
        if (itemRef.name.toLowerCase().includes(queryStr)) {
            results.push({ ref: itemRef, isFolder: false, name: itemRef.name });
        }
        updateProgress((results.length % 100)); // Just to show some activity
    }

    // Add folders that match
    for (const prefixRef of result.prefixes) {
        if (prefixRef.name.toLowerCase().includes(queryStr)) {
            results.push({ ref: prefixRef, isFolder: true, name: prefixRef.name });
        }
    }

    // Recurse into all folders
    for (const prefixRef of result.prefixes) {
        await performDeepScan(prefixRef.fullPath, queryStr, results);
    }
}

exportCsvBtn.onclick = async () => {
    if (!confirm("Esto realizará un escaneo profundo de /fotos para exportar todas las imágenes. ¿Continuar?")) return;
    
    showFooter("Iniciando escaneo global de imágenes para exportación...");
    try {
        const imagesList = [];
        await collectAllImages('fotos', imagesList);
        
        if (imagesList.length === 0) {
            alert("No se encontraron imágenes para exportar.");
            return;
        }

        showFooter(`Generando links de descarga para ${imagesList.length} imágenes...`);
        let csvContent = "data:text/csv;charset=utf-8,Nombre,Ruta,URL de Descarga\n";
        
        let processed = 0;
        for (const img of imagesList) {
            const url = await getDownloadURL(img.ref);
            csvContent += `"${img.name}","${img.ref.fullPath}","${url}"\n`;
            processed++;
            updateProgress((processed / imagesList.length) * 100);
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `fotos_storage_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showFooter("✓ Exportación completada con éxito.");
    } catch (error) {
        console.error("Export error:", error);
        alert("Error durante la exportación: " + error.message);
    } finally {
        hideFooter();
    }
};

async function collectAllImages(path, list) {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);

    // Collect files that match image extensions
    for (const itemRef of result.items) {
        if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(itemRef.name)) {
            list.push({ ref: itemRef, name: itemRef.name });
        }
        updateProgress(0); // reset or just show we are working
    }

    // Recurse
    for (const prefixRef of result.prefixes) {
        await collectAllImages(prefixRef.fullPath, list);
    }
}

// --- Navigation ---

async function listStorage(path = 'fotos') {
    currentPath = path;
    fileList.innerHTML = '<p class="loading">Escaneando sectores de memoria...</p>';
    searchInput.value = ''; // Clear search on navigation
    
    // Update breadcrumb
    updateBreadcrumb(path);

    try {
        const storageRef = ref(storage, path);
        const result = await listAll(storageRef);

        // Combine prefixes (folders) and items (files) into a single array for easier filtering
        allItems = [
            ...result.prefixes.map(ref => ({ ref, isFolder: true, name: ref.name })),
            ...result.items.map(ref => ({ ref, isFolder: false, name: ref.name }))
        ];

        renderList(allItems);
        updateCounters(allItems);

    } catch (error) {
        console.error("Error listing storage:", error);
        fileList.innerHTML = `<p class="error">ERROR DE ACCESO: ${error.message}</p>`;
        storageCounters.textContent = `_ERROR: SIN PERMISOS`;
    }
}

function renderList(items) {
    fileList.innerHTML = '';
    
    if (items.length === 0) {
        fileList.innerHTML = '<p class="empty">Sector vacío o sin coincidencias.</p>';
        return;
    }

    items.forEach(item => {
        renderFileItem(item.ref, item.isFolder);
    });
}

function updateBreadcrumb(path) {
    breadcrumbItems.innerHTML = '<span class="breadcrumb-item" data-path="">root</span>';
    if (!path) return;

    const parts = path.split('/').filter(p => p);
    let accumulatedPath = '';
    
    parts.forEach(part => {
        accumulatedPath += (accumulatedPath ? '/' : '') + part;
        const span = document.createElement('span');
        span.innerHTML = ` / <span class="breadcrumb-item" data-path="${accumulatedPath}">${part}</span>`;
        breadcrumbItems.appendChild(span);
    });

    // Add click listeners
    const items = breadcrumbItems.querySelectorAll('.breadcrumb-item');
    items.forEach(item => {
        item.onclick = (e) => {
            const newPath = e.target.getAttribute('data-path');
            listStorage(newPath);
        };
    });
}

if (editPathBtn) {
    editPathBtn.onclick = () => {
        const manualPath = prompt("Ingresa la ruta exacta de Storage para explorar\n(Ejemplo: fotos/galeria/2026):", currentPath);
        if (manualPath !== null) {
            listStorage(manualPath.trim());
        }
    };
}

function renderFileItem(itemRef, isFolder) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const icon = isFolder ? '📁' : '📄';
    const name = itemRef.name;
    
    item.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-name">${name}</div>
        <div class="file-actions">
            ${isFolder ? '' : `<button class="action-btn download" data-name="${name}">DESCARGAR</button>`}
            <button class="action-btn delete" data-name="${name}" data-folder="${isFolder}">ELIMINAR</button>
        </div>
    `;

    if (isFolder) {
        item.onclick = () => listStorage(itemRef.fullPath);
    } else {
        item.onclick = (e) => {
            if (e.target.classList.contains('action-btn')) return;
            previewFile(itemRef);
        };
    }

    // Actions
    const deleteBtn = item.querySelector('.delete');
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteItem(itemRef, isFolder);
    };

    if (!isFolder) {
        const downloadBtn = item.querySelector('.download');
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            downloadFile(itemRef);
        };
    }

    fileList.appendChild(item);
}

// --- Actions ---

async function previewFile(itemRef) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const fileInfo = document.getElementById('file-info-preview');
    const downloadCurrent = document.getElementById('download-current');
    
    modal.style.display = 'flex';
    modalImg.style.display = 'none';
    fileInfo.textContent = 'Cargando previsualización...';

    try {
        const url = await getDownloadURL(itemRef);
        const name = itemRef.name;
        
        if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) {
            modalImg.src = url;
            modalImg.style.display = 'block';
            fileInfo.textContent = `ARCHIVO: ${name}`;
        } else {
            fileInfo.textContent = `ARCHIVO: ${name}\n(Previsualización no disponible para este tipo de archivo)`;
        }

        downloadCurrent.onclick = () => window.open(url, '_blank');

    } catch (error) {
        fileInfo.textContent = `ERROR AL CARGAR: ${error.message}`;
    }

    document.getElementById('close-modal').onclick = () => {
        modal.style.display = 'none';
    };
}

async function downloadFile(itemRef) {
    try {
        const url = await getDownloadURL(itemRef);
        window.open(url, '_blank');
    } catch (error) {
        alert("Error al obtener link de descarga: " + error.message);
    }
}

async function deleteItem(itemRef, isFolder) {
    if (isFolder) {
        alert("Para eliminar carpetas de Firebase Storage, primero debes vaciar su contenido.");
        return;
    }

    if (!confirm(`¿Eliminar permanently ${itemRef.name}?`)) return;

    try {
        showFooter(`Eliminando ${itemRef.name}...`);
        await deleteObject(itemRef);
        updateProgress(100);
        listStorage(currentPath);
    } catch (error) {
        alert("Error al eliminar: " + error.message);
    } finally {
        hideFooter();
    }
}

async function uploadFiles(files) {
    if (files.length === 0) return;

    showFooter(`Subiendo ${files.length} archivo(s)...`);
    
    let completed = 0;
    for (const file of files) {
        const fileRef = ref(storage, (currentPath ? currentPath + '/' : '') + file.name);
        try {
            await uploadBytes(fileRef, file);
            completed++;
            updateProgress((completed / files.length) * 100);
        } catch (error) {
            console.error("Upload error:", error);
            alert(`Error subiendo ${file.name}: ${error.message}`);
        }
    }

    listStorage(currentPath);
    hideFooter();
}

async function uploadFromUrl(url) {
    showFooter("Descargando imagen desde URL externa...");
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("No se pudo obtener la imagen (posible error CORS o URL inválida)");
        const blob = await response.blob();
        
        let filename = url.split('/').pop().split('?')[0];
        if (!filename || filename.length > 50 || !filename.includes('.')) {
            filename = `url_imagen_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
        }
        
        const file = new File([blob], filename, { type: blob.type });
        await uploadFiles([file]);
    } catch (error) {
        alert("Error al intentar subir desde URL: " + error.message);
        hideFooter();
    }
}

// --- Event Listeners ---

refreshBtn.onclick = () => listStorage(currentPath);

uploadBtn.onclick = () => fileInput.click();

if (uploadUrlBtn) {
    uploadUrlBtn.onclick = () => {
        const url = prompt("Ingresa la URL pública de la imagen a descargar y subir:");
        if (url) {
            uploadFromUrl(url.trim());
        }
    };
}

fileInput.onchange = (e) => {
    uploadFiles(e.target.files);
};

createFolderBtn.onclick = () => {
    const folderName = prompt("Nombre de la nueva carpeta:");
    if (!folderName) return;
    
    // Firebase Storage doesn't have "empty folders", so we create a placeholder
    const placeholderRef = ref(storage, (currentPath ? currentPath + '/' : '') + folderName + '/.keep');
    const blob = new Blob(["placeholder"], { type: 'text/plain' });
    
    showFooter(`Iniciando directorio ${folderName}...`);
    uploadBytes(placeholderRef, blob).then(() => {
        updateProgress(100);
        listStorage(currentPath);
        hideFooter();
    });
};

// Drag & Drop
uploadZone.ondragover = (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
};

uploadZone.ondragleave = () => {
    uploadZone.classList.remove('dragover');
};

uploadZone.ondrop = (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    uploadFiles(e.dataTransfer.files);
};

// Clipboard Paste Event
document.addEventListener('paste', async (e) => {
    // Si el usuario está escribiendo en el buscador de carpetas o inputs, no interceptar
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const files = [];

    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            if (blob) {
                let fileName = blob.name;
                if (fileName === 'image.png' || fileName === 'blob' || !fileName.includes('.')) {
                    fileName = `captura_${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
                }
                const newFile = new File([blob], fileName, { type: blob.type });
                files.push(newFile);
            }
        } else if (item.kind === 'string' && item.type === 'text/plain') {
            item.getAsString(async (text) => {
                if (text.startsWith('http://') || text.startsWith('https://')) {
                    if (confirm(`Se detectó una URL en el portapapeles:\n${text}\n\n¿Deseas descargarla y subirla a ${currentPath}?`)) {
                        uploadFromUrl(text.trim());
                    }
                }
            });
        }
    }

    if (files.length > 0) {
        if (confirm(`¿Subir ${files.length} imagen(es) desde el portapapeles a ${currentPath}?`)) {
            uploadFiles(files);
        }
    }
});

// Initial load
listStorage('fotos');
