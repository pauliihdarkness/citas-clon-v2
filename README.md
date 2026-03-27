# Citas Clon V2 🖥️

Una aplicación web social retro con temática de terminal (CRT/MS-DOS) que incluye funcionalidades de geolocalización, perfiles de usuario, mensajería en tiempo real y más.

## 🚀 Características Principales

- **Interfaz Retro CRT:** Estilo inmersivo y nostálgico que simula un entorno de terminal clásico, con colores vibrantes y monospaced fonts, efectos de brillo (glow) y elementos UI detallados.
- **Feed de Usuarios:** Visualización de perfiles con filtros avanzados por alias, ciudad, edad, estado en línea, dispositivo y membresía premium («Corona»).
- **Geo Tracker (Mapa interactivo):** Integración con mapas para visualizar a los usuarios en función de su geolocalización. Sistema optimizado de resolución de coordenadas con `geonames.org` y jerarquía geográfica enfocada (ej., Argentina por defecto para datos ambiguos).
- **Sistema de Chat:**
  - **Global (`chat.html`):** Sala de chat en tiempo real para todos los usuarios conectados.
  - **Inbox/Personal (`chat-personal.html`):** Mensajería directa 1 a 1 entre usuarios con indicación de estado ("escribiendo...").
- **Perfiles de Usuario:** Creación detallada de perfiles (`create-profile.html`) con campos interactivos, edición de preferencias, carga de imágenes y contador de caracteres en tiempo real.
- **Panel de Actividad (`activity.html`):** Seguimiento de las interacciones recientes, histórico de likes (likes dados y recibidos).
- **Explorador y Almacenamiento:** Módulos para explorar la base de datos (`explorer.html`) y acceder al sistema de almacenamiento (`storage-explorer.html`).
- **Sistema de Exportación:** Herramienta dedicada (`export-panel.html`) para visualizar o respaldar datos.
- **Diseño Responsive:** Adaptado para funcionar de manera fluida en dispositivos móviles, incluyendo un menú tipo hamburguesa en pantallas pequeñas.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+ modular).
- **Backend / BaaS:** Firebase (Firestore, Authentication, Storage).
- **Build Tool:** Vite (^8.0).
- **Iconografía:** Lucide Icons.
- **APIs de Terceros:** Integración de geocodificación para la precisión de ubicaciones.

## 📂 Estructura del Proyecto

```text
citas-clon-v2/
├── assets/           # Recursos estáticos (CSS, JS, imágenes)
│   ├── css/          # Estilos de la aplicación y animaciones CRT
│   └── js/           # Lógica JavaScript dividida en módulos
├── node_modules/     # Dependencias del proyecto
├── .env / .env.local # Variables de entorno (Firebase config, etc.)
├── index.html        # Página principal (Feed de perfiles)
├── create-profile.html # Creación y edición de perfiles
├── map.html          # Vista de mapas e interfaces geográficas
├── chat*.html        # Módulos de mensajería (Global e Inbox)
├── profile.html      # Visualización de perfiles de otros usuarios
├── activity.html     # Historial de actividades y likes
├── vite.config.js    # Configuración de inicialización y build de Vite
├── package.json      # Configuración de dependencias y scripts npm
├── firebase.json     # Configuración de hosting e integración Firebase
└── firestore.rules   # Reglas de seguridad de la base de datos Firestore
```

## ⚙️ Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd citas-clon-v2
   ```

2. **Instalar dependencias:**
   Asegúrate de tener Node.js instalado. Luego ejecuta:
   ```bash
   npm install
   ```

3. **Configuración de Variables de Entorno:**
   El proyecto requiere credenciales de Firebase. Renombra `.env.example` a `.env.local` e introduce las credenciales correspondientes a tu proyecto de Firebase.
   ```env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_dominio.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu_project_id
   VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id
   ```

## 🏃🏽‍♂️ Levantar en Modo Desarrollo

Para lanzar el servidor de desarrollo en local con Vite, ejecuta:

```bash
npm run dev
```

La aplicación normalmente estará disponible en `http://localhost:5173/`.

## 📦 Construcción para Producción

Para compilar y minificar la aplicación en la carpeta `dist/` lista para ser desplegada:

```bash
npm run build
```

*(Puedes probar el build de manera local con `npm run preview`)*
