/**
 * ========================================
 * GENERACIÓN Y MANEJO DE QR
 * ========================================
 * 
 * Propósito: Crear códigos QR para acceso temporal al candado.
 * El QR contiene un token que el ESP32 puede validar.
 * 
 * Dependencia: QRCode.js (cargada desde CDN en index.html)
 */

const QRManager = {
    // ========================================
    // PROPIEDADES
    // ========================================
    
    // Instancia del generador QR
    qrInstance: null,
    
    // Timer para la cuenta regresiva del QR
    countdownInterval: null,
    
    // Token actual
    currentToken: null,
    
    // ========================================
    // GENERACIÓN DE QR
    // ========================================
    
    /**
     * Genera un nuevo QR de acceso temporal.
     * Crea un token, lo muestra como QR, e inicia la cuenta regresiva.
     */
    generate() {
        // Validamos que tengamos IP configurada
        const ip = Storage.getIP();
        if (!ip) {
            UI.showToast('⚙️ Configurá primero la IP del EcoLock', 'warning');
            UI.openSettings();
            return;
        }
        
        // Generamos un token nuevo
        this.currentToken = Utils.generateToken();
        
        // Construimos la URL que contendrá el QR
        // El formato es: http://[IP]/qr-verify?token=[TOKEN]
        // Esto permite que cualquier lector de QR redirija directamente
        const qrUrl = `http://${ip}:${CONFIG.ESP_PORT}${CONFIG.ENDPOINTS.QR_VERIFY}?token=${encodeURIComponent(this.currentToken)}`;
        
        // Limpiamos el contenedor anterior
        const container = document.getElementById('qrcode');
        container.innerHTML = '';
        
        // Creamos el QR usando la librería
        this.qrInstance = new QRCode(container, {
            text: qrUrl,
            width: CONFIG.QR.SIZE,
            height: CONFIG.QR.SIZE,
            colorDark: '#0f172a',      // Color oscuro (modo oscuro de la app)
            colorLight: '#ffffff',      // Fondo blanco (siempre)
            correctLevel: CONFIG.QR.CORRECTION_LEVEL
        });
        
        // Mostramos el contenedor
        document.getElementById('qr-container').classList.remove('hidden');
        
        // Iniciamos la cuenta regresiva
        this.startCountdown();
        
        // Registramos en logs
        UI.addLogEntry({
            time: Utils.formatDateTime(),
            event: 'QR de acceso temporal generado (válido 5 min)',
            type: 'success'
        });
        
        UI.showToast('📱 QR generado. Válido por 5 minutos.', 'success');
    },
    
    /**
     * Inicia la cuenta regresiva de 5 minutos para el QR.
     */
    startCountdown() {
        // Limpiamos cualquier timer anterior
        this.clearCountdown();
        
        const endTime = Date.now() + CONFIG.QR.EXPIRATION_TIME;
        const timerElement = document.getElementById('qr-timer');
        
        const updateTimer = () => {
            const remaining = endTime - Date.now();
            
            if (remaining <= 0) {
                this.clearCountdown();
                timerElement.textContent = '⏰ Expirado';
                timerElement.style.color = 'var(--accent-red)';
                
                // Opcional: ocultar el QR después de un tiempo
                setTimeout(() => {
                    document.getElementById('qr-container').classList.add('hidden');
                }, 3000);
                
                return;
            }
            
            timerElement.textContent = `Expira en: ${Utils.formatCountdown(remaining)}`;
        };
        
        // Actualizamos inmediatamente y luego cada segundo
        updateTimer();
        this.countdownInterval = setInterval(updateTimer, 1000);
    },
    
    /**
     * Limpia el timer de cuenta regresiva.
     */
    clearCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    },
    
    /**
     * Obtiene el token actual (útil para debugging).
     * @returns {string|null}
     */
    getCurrentToken() {
        return this.currentToken;
    },
    
    /**
     * Verifica si un token ha expirado.
     * @param {string} token - Token a verificar
     * @returns {boolean}
     */
    isTokenExpired(token) {
        const payload = Utils.decodeToken(token);
        if (!payload || !payload.exp) return true;
        return Date.now() > payload.exp;
    }
};

window.QRManager = QRManager;
