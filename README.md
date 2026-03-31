# CITAS CLON V2 — BIOS HUD 🖥️

Una plataforma social inmersiva con una estética retro-futurista de terminal (CRT/BIOS) construida con **React** y **Firebase**. El proyecto simula un entorno de monitoreo "BIOS" para conectar usuarios mediante geolocalización, mensajería en tiempo real y una interfaz HUD premium.

---

## 🚀 Características Avanzadas (v2.0 Beta)

### 1. Sistema de Presencia & Latencia (Heartbeat)
- **Monitoreo Automático**: La aplicación registra la actividad cada 5 minutos (`serverTimestamp`) para mantener el campo `lastSeen` actualizado.
- **Modo Incógnito**: Los usuarios pueden desactivar su visibilidad desde los ajustes, manteniendo la actualización de sesión pero ocultando el estado "En línea" (verde) a los demás.

### 2. Mapa Radar CRT (HUD)
- **Interactividad Táctica**: Marcadores personalizados con animaciones de pulso (`pulse-glow`).
- **Codificación de Estado**:
    - 🟢 **Verde**: Usuarios conectados en tiempo real (`isOnline: true`).
    - 🟡 **Ámbar**: Usuarios desconectados o en modo incógnito.
- **Filtros de Pantalla**: Efectos de líneas de escaneo, parpadeo CRT y una paleta de colores de alto contraste optimizada para entornos oscuros.

### 3. Centro de Notificaciones HUD
- **Real-time Toasts**: Notificaciones flotantes en el centro superior con un lenguaje de "Alerta de Sistema" para mensajes entrantes.
- **Indicadores de Navegación (Badges)**: Puntos de alerta animados en el `TabBar` (móvil) y `Sidebar` (escritorio) que indican mensajes no leídos sin obstruir la vista.

### 4. Mensajería Directa (Inbox)
- **Chat 1-1**: Conversaciones encriptadas visualmente con burbujas de estilo HUD.
- **Sincronización Total**: Estado de lectura ("visto") integrado con el sistema global de notificaciones.

---

## 🛠️ Stack Tecnológico

- **Núcleo:** React 19 + Vite.
- **Base de Datos:** Firebase Firestore (Real-time).
- **Autenticación:** Firebase Auth (Soporta Anonymous y persistencia avanzada).
- **Mapas:** Leaflet.js con capas de diseño oscuro personalizadas.
- **Estilos:** Vanilla CSS con variables de diseño para una fácil tematización (Ámbar, Verde Fósforo, etc.).

---

## 📂 Estructura del Proyecto (Versión React)

```text
citas-clon-v2/
├── react-app/
│   ├── src/
│   │   ├── components/    # Layout, Radar, Toasts, HUD Elements
│   │   ├── context/       # AuthContext, ToastContext (Servicios globales)
│   │   ├── pages/         # MapPage, InboxPage, FeedPage, MyProfile
│   │   ├── lib/           # Utilidades (Firebase, Geo-logic)
│   │   └── App.jsx        # Lógica central (Heartbeat presence)
├── assets/                # Estilos (.css) y recursos compartidos
├── public/                # Favicon.ico y assets estáticos del navegador
└── vite.config.js         # Configuración del entorno de construcción
```

---

## ⚙️ Instalación

1. **Clonar y Preparar**:
   ```bash
   git clone <url-repo>
   cd citas-clon-v2
   npm install
   ```

2. **Variables de Entorno**:
   Crea un archivo `.env.local` con tus credenciales de Firebase.

3. **Lanzar Sistema**:
   ```bash
   npm run dev
   ```

---

## 📡 Protocolo de Desarrollo (Próximos Pasos)
- [ ] Implementación de "Likes Recibidos" con notificaciones HUD.
- [ ] Efectos de sonido de terminal para interacciones.
- [ ] Optimización de carga de imágenes con WebP.

---
*Diseñado para wowear. Estética premium garantizada.*
