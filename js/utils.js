/**
 * ========================================
 * UTILIDADES Y VALIDACIONES
 * ========================================
 * 
 * Propósito: Funciones auxiliares reutilizables que no dependen
 * de otros módulos. Incluyen validaciones, formateo de datos,
 * y utilidades generales.
 * 
 * Principio: "No repetirse" (DRY - Don't Repeat Yourself)
 */

const Utils = {
    // ========================================
    // VALIDACIONES
    // ========================================
    
    /**
     * Valida si una string es una dirección IPv4 válida.
     * @param {string} ip - La dirección IP a validar
     * @returns {boolean} - True si es válida, false si no
     */
    isValidIP(ip) {
        // Usamos la regex definida en config.js
        if (!ip || typeof ip !== 'string') return false;
        return CONFIG.IP_REGEX.test(ip.trim());
    },
    
    /**
     * Valida que un texto no esté vacío y no exceda la longitud máxima.
     * @param {string} text - Texto a validar
     * @param {number} maxLength - Longitud máxima permitida
     * @returns {boolean}
     */
    isValidText(text, maxLength = CONFIG.MAX_INPUT_LENGTH) {
        if (!text || typeof text !== 'string') return false;
        const trimmed = text.trim();
        return trimmed.length > 0 && trimmed.length <= maxLength;
    },
    
    /**
     * Sanitiza una entrada de texto para prevenir XSS.
     * Reemplaza caracteres HTML peligrosos por entidades seguras.
     * @param {string} text - Texto a sanitizar
     * @returns {string} - Texto sanitizado
     */
    sanitizeInput(text) {
        if (!text || typeof text !== 'string') return '';
        
        // Mapa de caracteres peligrosos a entidades HTML
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        
        return text.replace(/[&<>"'/`=]/g, char => escapeMap[char]);
    },
    
    // ========================================
    // FORMATEO DE FECHAS Y TIEMPOS
    // ========================================
    
    /**
     * Formatea una fecha a string legible en español.
     * @param {Date} date - Objeto Date (usa actual si no se proporciona)
     * @returns {string} - Fecha formateada: "DD/MM/YYYY HH:MM:SS"
     */
    formatDateTime(date = new Date()) {
        const pad = (n) => String(n).padStart(2, '0');
        
        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1); // Los meses empiezan en 0
        const year = date.getFullYear();
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    },
    
    /**
     * Formatea milisegundos a formato MM:SS.
     * Útil para mostrar tiempo restante del QR.
     * @param {number} ms - Milisegundos
     * @returns {string} - "MM:SS"
     */
    formatCountdown(ms) {
        if (ms <= 0) return '00:00';
        
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(minutes)}:${pad(seconds)}`;
    },
    
    // ========================================
    // GENERACIÓN DE TOKENS
    // ========================================
    
    /**
     * Genera un token pseudo-aleatorio para el QR.
     * No es criptográficamente seguro, pero suficiente para este proyecto educativo.
     * En producción real se usaría JWT o similar.
     * @returns {string} - Token en formato base64
     */
    generateToken() {
        // Combinamos timestamp + random para unicidad
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        const data = `${timestamp}-${random}`;
        
        // Simulamos un "JWT-like" simple: header.payload (sin signature por simplicidad)
        const header = btoa(JSON.stringify({ alg: 'none', typ: 'ECO' }));
        const payload = btoa(JSON.stringify({
            device: 'ecolock-001',      // ID del dispositivo
            iat: Date.now(),            // Issued at (emitido en)
            exp: Date.now() + CONFIG.QR.EXPIRATION_TIME, // Expiration
            nonce: random               // Número único para evitar reutilización
        }));
        
        return `${header}.${payload}`;
    },
    
    /**
     * Decodifica un token QR para extraer su payload.
     * @param {string} token - Token a decodificar
     * @returns {object|null} - Payload decodificado o null si es inválido
     */
    decodeToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 2) return null;
            
            const payload = JSON.parse(atob(parts[1]));
            return payload;
        } catch (e) {
            return null;
        }
    },
    
    // ========================================
    // UTILIDADES DE RED
    // ========================================
    
    /**
     * Construye la URL completa para una petición al ESP32.
     * @param {string} endpoint - Ruta del endpoint (ej: '/status')
     * @param {string} ip - IP del ESP32 (opcional, usa la guardada)
     * @returns {string} - URL completa
     */
    buildUrl(endpoint, ip) {
        const baseIP = ip || Storage.get(CONFIG.STORAGE_KEYS.IP);
        if (!baseIP) {
            throw new Error('No se configuró la IP del ESP32');
        }
        return `http://${baseIP}:${CONFIG.ESP_PORT}${endpoint}`;
    },
    
    // ========================================
    // DELAYS Y UTILIDADES ASÍNCRONAS
    // ========================================
    
    /**
     * Crea una promesa que se resuelve después de N milisegundos.
     * Útil para delays controlados entre reintentos.
     * @param {number} ms - Milisegundos a esperar
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Genera un delay con backoff exponencial.
     * Útil para reintentos: intento 1 = 1s, intento 2 = 2s, intento 3 = 4s
     * @param {number} attempt - Número de intento (empezando en 1)
     * @returns {number} - Milisegundos de delay
     */
    exponentialBackoff(attempt) {
        return CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
    },
    
    // ========================================
    // UTILIDADES DE DISPOSITIVO
    // ========================================
    
    /**
     * Detecta si el dispositivo es iOS (para ajustes específicos).
     * @returns {boolean}
     */
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    },
    
    /**
     * Detecta si la app está instalada como PWA (standalone).
     * @returns {boolean}
     */
    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    },
    
    /**
     * Vibra el dispositivo si es compatible (feedback táctil).
     * @param {number} duration - Duración en ms (default 50ms)
     */
    vibrate(duration = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    },
    
    // ========================================
    // UTILIDADES DE ARRAYS/OBJETOS
    // ========================================
    
    /**
     * Limita un array a N elementos (útil para logs, evita crecimiento infinito).
     * @param {Array} array - Array a limitar
     * @param {number} maxSize - Tamaño máximo
     * @returns {Array} - Array limitado
     */
    limitArraySize(array, maxSize = 50) {
        if (array.length <= maxSize) return array;
        return array.slice(array.length - maxSize);
    }
};

// Exponemos globalmente
window.Utils = Utils;
