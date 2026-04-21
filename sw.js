/**
 * ========================================
 * SERVICE WORKER - EcoLock PWA
 * ========================================
 * 
 * Propósito: Habilitar funcionalidad offline de la PWA.
 * - Cachea los archivos estáticos para uso sin conexión
 * - Estrategia: Cache First, luego Network
 * 
 * NOTA: Para desarrollo local, algunos navegadores requieren HTTPS
 * para registrar el SW. En producción (GitHub Pages/Netlify) funciona automáticamente.
 */

const CACHE_NAME = 'ecolock-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/errorHandler.js',
    '/js/storage.js',
    '/js/api.js',
    '/js/qr.js',
    '/js/ui.js',
    '/js/app.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// ========================================
// INSTALACIÓN: Cacheamos archivos estáticos
// ========================================
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cacheando archivos estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(err => {
                console.log('[SW] Error cacheando:', err);
            })
    );
    
    // Activamos inmediatamente (sin esperar a que cierren pestañas)
    self.skipWaiting();
});

// ========================================
// ACTIVACIÓN: Limpiamos caches antiguos
// ========================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    
    // Tomamos control inmediatamente
    self.clients.claim();
});

// ========================================
// FETCH: Estrategia Cache First
// ========================================
self.addEventListener('fetch', (event) => {
    // Solo interceptamos peticiones GET a nuestros archivos
    if (event.request.method !== 'GET') return;
    
    // No cacheamos peticiones al ESP32 (son dinámicas)
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/status') || 
        url.pathname.startsWith('/lock') || 
        url.pathname.startsWith('/unlock') ||
        url.pathname.startsWith('/qr-verify')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Si está en cache, devolvemos cache
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Si no, vamos a la red
                return fetch(event.request)
                    .then(networkResponse => {
                        // Opcional: guardar en cache para la próxima
                        if (networkResponse.ok) {
                            const clone = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, clone);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Si falla la red y no está en cache...
                        // Para la página principal, devolvemos index.html cacheado
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});
