/**
 * ========================================
 * PUNTO DE ENTRADA DE LA APLICACIÓN
 * ========================================
 * 
 * Propósito: Inicializar todos los módulos y arrancar la app.
 * Este es el último script que se carga (ver orden en index.html).
 * 
 * Orden de inicialización:
 * 1. Referencias DOM
 * 2. Tema (modo oscuro/claro)
 * 3. Event listeners
 * 4. Polling automático
 * 5. Service Worker (para PWA offline)
 */

const App = {
    /**
     * Inicializa la aplicación completa.
     */
    init() {
        console.log(`🚀 ${CONFIG.APP_NAME} v${CONFIG.VERSION} iniciando...`);
        
        // 1. Inicializamos referencias al DOM
        UI.initElements();
        
        // 2. Aplicamos el tema guardado (o default oscuro)
        const isDark = Storage.getDarkMode();
        UI.applyTheme(isDark);
        
        // 3. Configuramos event listeners
        UI.setupEventListeners();
        
        // 4. Verificamos si hay IP configurada
        const ip = Storage.getIP();
        if (!ip) {
            UI.showToast('⚙️ Bienvenido a EcoLock. Configurá la IP del dispositivo.', 'info', 6000);
            UI.openSettings();
        } else {
            // 5. Iniciamos polling automático
            API.startPolling();
            UI.showToast(`🔗 Conectando a ${ip}...`, 'info');
        }
        
        // 6. Cargamos logs previos si existen
        this.loadPreviousLogs();
        
        // 7. Registramos Service Worker para PWA
        this.registerServiceWorker();
        
        console.log('✅ EcoLock iniciado correctamente');
    },
    
    /**
     * Carga logs previos del localStorage.
     */
    loadPreviousLogs() {
        const logs = Storage.get(CONFIG.STORAGE_KEYS.LOGS) || [];
        // Mostramos los últimos 5 logs
        const recentLogs = logs.slice(-5);
        recentLogs.forEach(log => {
            UI.addLogEntry({
                time: Utils.formatDateTime(new Date(log.timestamp)),
                event: log.message || log.event || 'Evento previo',
                type: log.type || 'info'
            });
        });
    },
    
    /**
     * Registra el Service Worker para funcionalidad PWA.
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registrado:', registration.scope);
                })
                .catch(error => {
                    console.log('⚠️ Service Worker no registrado:', error);
                    // No es crítico, la app funciona sin SW
                });
        }
    }
};

// ========================================
// INICIO DE LA APLICACIÓN
// ========================================
// Esperamos a que el DOM esté completamente cargado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    // DOM ya cargado (si el script se carga dinámicamente)
    App.init();
}
