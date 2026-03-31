import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    
    // Añadimos el toast al estado
    setToasts((prev) => [...prev, { id, message, type, visible: false }]);

    // Pequeño delay para activar la animación CSS de entrada (translateX de 120% a 0)
    setTimeout(() => {
      setToasts((prev) => 
        prev.map(t => t.id === id ? { ...t, visible: true } : t)
      );
    }, 50);

    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    // Primero activamos la animación de salida (haciendo visible = false)
    setToasts((prev) => 
      prev.map(t => t.id === id ? { ...t, visible: false } : t)
    );
    
    // Luego eliminamos el elemento del DOM tras la transición CSS (0.3s)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Contenedor de Toasts (usando los estilos de style.css) */}
      <div id="toast-container">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`toast ${t.visible ? 'visible' : ''} ${t.type === 'error' ? 'toast-error' : ''}`}
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-indicator">
              {t.type === 'error' ? '[ ERROR ]' : '[ ALERTA ]'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
