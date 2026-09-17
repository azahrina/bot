// ============================================================
// background.js v3.1 — Hybrid Architecture + SessionBox Support
// Extension UI calls Node.js local server
// SessionBox fix: webRequest interceptor captures virtual cookies
// ============================================================

importScripts('socket.io.js');

const NODE_SERVER = 'http://127.0.0.1:7500';
const socket = io(NODE_SERVER, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 3000,
    randomizationFactor: 0.2
});

socket.on('connect', () => {
    console.log('IGBot: 🔌 Socket connected to server');
    updateExtensionBadge();
    // Notify all open Instagram tabs that server is online
    chrome.tabs.query({}, (tabs) => {
        (tabs || []).forEach(t => {
            if (t.url && t.url.includes('instagram.com')) {
                chrome.tabs.sendMessage(t.id, { type: 'SERVER_CONNECTED' }, () => {
                    if (chrome.runtime.lastError) { /* ignore */ }
                });
            }
        });
    });
});

socket.on('disconnect', () => {
    console.log('IGBot: 🔌 Socket disconnected from server');
    updateExtensionBadge();
});

const pendingRequests = new Map();

socket.on('ACTION_RESPONSE', (res) => {
    const { requestId, ...data } = res;
    if (pendingRequests.has(requestId)) {
        const { resolve, reject } = pendingRequests.get(requestId);
        pendingRequests.delete(requestId);
        if (data.ok) resolve(data);
        else reject(new Error(data.error || 'Socket action failed'));
    }
});

socket.on('task-update', (data) => {
    chrome.runtime.sendMessage({ type: 'SYS_LOG', payload: { type: 'task-update', data } }).catch(() => { });
});

socket.on('log', (data) => {
    chrome.runtime.sendMessage({ type: 'SYS_LOG', payload: data }).catch(() => { });
});

socket.on('RUNNING_TEXT_UPDATE', (data) => {
    chrome.runtime.sendMessage({ type: 'RUNNING_TEXT_UPDATE', payload: data }).catch(() => { });
    chrome.tabs.query({ url: "*://*.instagram.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: 'RUNNING_TEXT_UPDATE', payload: data }).catch(() => { });
        });
    });
});

socket.on('task-finished', (data) => {
    chrome.runtime.sendMessage({ type: 'SYS_LOG', payload: { type: 'task-finished', data } }).catch(() => { });
});

function socketApiRequest(action, data) {
    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        const timeout = setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error(`Socket timeout for action: ${action}`));
            }
        }, 30000);

        pendingRequests.set(requestId, {
            resolve: (res) => { clearTimeout(timeout); resolve(res); },
            reject: (err) => { clearTimeout(timeout); reject(err); }
        });

        socket.emit('EXEC_ACTION', { requestId, action, data });
    });
}

// =============================================
// DEVICE SIMULATION (UA & App-ID)
// =============================================
// For Desktop UI with Bot Panel support:
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const APP_ID = '936619743392459'; // Web App ID

const DEFAULT_DEVICES = {
    desktop: {
        name: 'Desktop UI (Mobile Identity)',
        ua: MOBILE_UA,
        appId: APP_ID,
        desktop_ui: true
    },
    samsung_s23: {
        name: 'Samsung Galaxy S23 Ultra (Mobile UI)',
        ua: MOBILE_UA,
        appId: APP_ID
    },
    samsung_s24: {
        name: 'Samsung Galaxy S23 Ultra (Mobile UI)',
        ua: MOBILE_UA,
        appId: APP_ID
    },
    none: {
        name: 'No Simulation (Default)',
        ua: '',
        appId: APP_ID
    }
};

async function getAllDevices() {
    return new Promise(resolve => {
        chrome.storage.local.get(['customDevices'], res => {
            resolve({ ...DEFAULT_DEVICES, ...(res.customDevices || {}) });
        });
    });
}

async function updateDnrRule(deviceKey) {
    const allDevices = await getAllDevices();
    const dev = allDevices[deviceKey] || allDevices.samsung_s23 || allDevices.samsung_s24;

    if (deviceKey === 'none') {
        console.log(`IGBot: 🌐 Using default Browser User-Agent`);
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [2],
            addRules: []
        });
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            disableRulesetIds: ['ruleset_1']
        });
    } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: ['ruleset_1']
        });

        console.log(`IGBot: 📱 Switching device to ${dev.name}`);

        const rule = {
            id: 2,
            priority: 2,
            action: {
                type: 'modifyHeaders',
                requestHeaders: [
                    { header: 'User-Agent', operation: 'set', value: dev.ua },
                    { header: 'X-IG-App-ID', operation: 'set', value: dev.appId },
                    { header: 'sec-ch-ua-platform', operation: 'set', value: '"Android"' },
                    { header: 'sec-ch-ua-model', operation: 'set', value: '"SM-S918B"' },
                    { header: 'sec-ch-ua-platform-version', operation: 'set', value: '"13.0.0"' }
                ]
            },
            condition: {
                urlFilter: '*://*.instagram.com/*',
                // CRITICAL: We exclude 'main_frame' from UA spoofing. 
                // This allows the browser to request the page as Desktop to get Desktop UI,
                // but keeps Mobile UA for background/fetch requests used for automation.
                resourceTypes: ['xmlhttprequest', 'sub_frame', 'script', 'other', 'ping']
            }
        };

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [2],
            addRules: [rule]
        });
    }

    await chrome.storage.local.set({
        selectedDevice: deviceKey,
        deviceUA: dev.ua,
        deviceAppId: dev.appId
    });
    capturedDeviceKey = deviceKey;
}

// Initial load: Default to samsung_s23 (active) if not set
chrome.storage.local.get(['selectedDevice']).then(res => {
    const target = res.selectedDevice !== undefined ? res.selectedDevice : 'samsung_s23';
    updateDnrRule(target);
});

// =============================================
// NATIVE IDENTITY INJECTION (CSP-Safe)
// UI Switcher is SEPARATED to content/switcher.js (document_start)
// =============================================


// =============================================
// SESSIONBOX FIX: webRequest interceptor
// Mengintersep Cookie header SETELAH SessionBox
// menyuntikkan virtual cookies ke dalam request.
// chrome.cookies.getAll() tidak bisa baca virtual
const capturedTabCookies = new Map();
let capturedDeviceKey = 'none';

chrome.storage.local.get(['selectedDevice'], res => {
    if (res.selectedDevice) capturedDeviceKey = res.selectedDevice;
});

// Persist captured cookies to survive Service Worker suspension
async function persistCapturedCookies() {
    const obj = {};
    capturedTabCookies.forEach((v, k) => { obj[k] = v; });
    await chrome.storage.local.set({ persistedCapturedCookies: obj });
}

// Load persisted cookies at startup - use a promise to avoid race conditions
let storageLoaded = false;
const loadPersistence = chrome.storage.local.get(['persistedCapturedCookies']).then(res => {
    if (res.persistedCapturedCookies) {
        for (const [id, data] of Object.entries(res.persistedCapturedCookies)) {
            // Only load if not too old (e.g. 2 hours)
            if (Date.now() - data.capturedAt < 2 * 60 * 60 * 1000) {
                capturedTabCookies.set(parseInt(id), data);
            }
        }
    }
    storageLoaded = true;
});

chrome.webRequest.onSendHeaders.addListener(
    (details) => {
        const tid = details.tabId;
        if (tid && tid !== -1) {
            const uaHeader = (details.requestHeaders || []).find(h => h.name.toLowerCase() === 'user-agent');
            const cookieHeader = (details.requestHeaders || []).find(h => h.name.toLowerCase() === 'cookie');
            if (cookieHeader && cookieHeader.value && (cookieHeader.value.includes('sessionid') || cookieHeader.value.includes('ds_user_id'))) {
                const existing = capturedTabCookies.get(tid);
                if (!existing || existing.cookieHeader !== cookieHeader.value) {
                    console.log(`IGBot: 🎯 [webRequest] Captured isolation cookies from tab ${tid}`);
                    capturedTabCookies.set(tid, {
                        cookieHeader: cookieHeader.value,
                        ua: (uaHeader && uaHeader.value) || navigator.userAgent,
                        capturedAt: Date.now()
                    });
                    persistCapturedCookies();
                }
            }
        }
    },
    {
        urls: [
            "https://www.instagram.com/*",
            "https://i.instagram.com/*",
            "https://graph.instagram.com/*"
        ]
    },
    ["requestHeaders", "extraHeaders"]
);

// =============================================
// SESSION (cookies dari tab Instagram)
// =============================================

async function getIgCookies(tabId) {
    if (!storageLoaded) await loadPersistence;

    const tryGetIntercepted = (tid) => {
        const intercepted = capturedTabCookies.get(tid);
        const isRecent = intercepted && (Date.now() - intercepted.capturedAt < 2 * 60 * 60 * 1000);
        return (intercepted && intercepted.cookieHeader && isRecent) ? intercepted : null;
    };

    // === STRATEGY 1: webRequest intercepted Cookie header ===
    if (tabId) {
        const found = tryGetIntercepted(tabId);
        if (found) {
            console.log(`IGBot: âœ… [INTERCEPTED] Menggunakan cookies dari tab ${tabId}`);
            return { cookies: found.cookieHeader, ua: found.ua };
        }
    }

    // === STRATEGY 1.5: FORCE TRIGGER (If on IG tab but no capture yet) ===
    // Memicu webRequest dengan request ke API internal Instagram agar cookies terintersep.
    if (tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab.url?.includes('instagram.com')) {
                console.log(`IGBot: 🔄 Trigerring aggressive background fetch on tab ${tabId} to capture SessionBox cookies...`);
                await chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => {
                        // Pemicu 1: API Profil (Sangat kuat untuk memancing cookie)
                        fetch('/api/v1/accounts/current_user/').catch(() => { });
                        // Pemicu 2: API Push (Untuk memancing sessionid yang baru)
                        fetch('/api/v1/web/accounts/web_create_ajax/attempt/').catch(() => { });
                        // Pemicu 3: Get CSRF token bypass
                        fetch('https://www.instagram.com/data/shared_data/').catch(() => { });
                    }
                });
                // Tunggu sedikit lebih lama agar webRequest interseptor menangkap data
                await new Promise(r => setTimeout(r, 2000));
                const foundAfterTrigger = tryGetIntercepted(tabId);
                // Hanya return jika ditemukan sessionid, agar tidak terburu-buru return partial session
                if (foundAfterTrigger && foundAfterTrigger.cookieHeader.includes('sessionid')) {
                    console.log(`IGBot: ✅ [TRIGGERED] Berhasil menangkap FULL cookies tab ${tabId} setelah trigger.`);
                    return { cookies: foundAfterTrigger.cookieHeader, ua: foundAfterTrigger.ua };
                }
            }
        } catch (e) { }
    }

    // === STRATEGY 2: Inject script ke tab Instagram (baca document.cookie) ===
    try {
        const tabs = await chrome.tabs.query({});
        const igTab = tabId
            ? (tabs.find(t => t.id === tabId && t.url?.includes('instagram.com')))
            : tabs.find(t => t.url?.includes('instagram.com') && t.status === 'complete');

        if (igTab) {
            const results = await chrome.scripting.executeScript({
                target: { tabId: igTab.id },
                world: 'MAIN',
                func: () => ({ cookie: document.cookie, ua: navigator.userAgent }),
            });
            const result = results?.[0]?.result;
            // sessionid sering HttpOnly, kita cek ds_user_id sebagai fallback
            if (result && (result.cookie.includes('sessionid') || result.cookie.includes('ds_user_id'))) {
                console.log(`IGBot: [scripting] Menggunakan cookies dari document.cookie tab ${igTab.id}`);
                return { cookies: result.cookie, ua: result.ua };
            }
        }
    } catch (e) { }

    // === STRATEGY 2.5: chrome.cookies API (Isolated by StoreId for SessionBox) ===
    if (tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab && (tab.cookieStoreId || tab.incognito)) {
                const storeId = tab.cookieStoreId || (tab.incognito ? "1" : "0");
                console.log(`IGBot: 🔍 Searching cookies in Store: ${storeId}...`);
                const allCookies = await chrome.cookies.getAll({ storeId: storeId });
                const igCookies = allCookies.filter(c => c.domain.includes('instagram.com'));

                if (igCookies.length > 0) {
                    const cookieStr = igCookies.map(c => `${c.name}=${c.value}`).join('; ');
                    if (cookieStr.includes('sessionid') || cookieStr.includes('ds_user_id')) {
                        console.log(`IGBot: ✅ [STORE-API] Berhasil mengambil session dari Store ${storeId}`);
                        return { cookies: cookieStr, ua: navigator.userAgent };
                    }
                }
            }
        } catch (e) {
            console.warn(`IGBot: StoreId Strategy failed: ${e.message}`);
        }
    }

    // === STRATEGY 3: REMOVED (Global chrome.cookies.getAll) ===
    // Dihapus total karena ini penyebab utama "tabrakan" akun A dan B.

    console.warn('IGBot: âš ï¸ Tidak ada sessionid ditemukan di tab', tabId);
    return null;
}

async function checkServerStatus() {
    try {
        // Use a simple fetch with a short timeout and no-cache
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const resp = await fetch(`${NODE_SERVER}/api/menu`, {
            method: 'GET',
            cache: 'no-store', // Prevent caching of status
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return resp.ok;
    } catch (e) {
        return false;
    }
}

async function fetchWithTimeout(url, options = {}, timeout = 3000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// Poll server status and update extension badge
async function updateExtensionBadge() {
    const isOnline = (socket && socket.connected) || await checkServerStatus();
    if (isOnline) {
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Vibrant Green
        chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); // White text
        if (socket && !socket.connected) {
            try { socket.connect(); } catch (e) { }
        }
    } else {
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Vivid Red
        chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); // White text
    }
    return isOnline;
}

// Set up repeating alarm for status polling (MV3 compatible)
chrome.alarms.get('poll-server-status', (alarm) => {
    if (!alarm) {
        chrome.alarms.create('poll-server-status', { periodInMinutes: 1.0 }); // 1 min (MV3 compliant)
    }
});
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'poll-server-status') {
        updateExtensionBadge();
    }
});

// Initial badge update
updateExtensionBadge();

// Listen for startup and install
chrome.runtime.onStartup.addListener(updateExtensionBadge);
chrome.runtime.onInstalled.addListener(updateExtensionBadge);

// Listen for messages from popup, panel smart heartbeat, or elsewhere
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'REFRESH_STATUS' || msg.type === 'SERVER_WAKEUP' || msg.type === 'SERVER_ONLINE') {
        updateExtensionBadge().then(isOnline => {
            if (isOnline && socket && !socket.connected) {
                try { socket.connect(); } catch (e) { }
            }
            sendResponse({ success: true, online: isOnline });
        });
        return true;
    }
    return true; // Keep channel open for async
});

// Additional triggers to wake up Service Worker and check status
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('instagram.com')) {
        updateExtensionBadge();
    }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        updateExtensionBadge();
    }
});

// ---- Per-Tab Username Tracking ----
// Setiap tab menyimpan username akun yang sedang login.
// Ini digunakan agar SSE stream dan log hanya untuk akun tersebut.
const tabUsernames = new Map(); // tabId -> username
const tabLogStreams = new Map(); // tabId -> EventSource

function getTabUsername(tabId) {
    return tabUsernames.get(tabId) || '__global__';
}

// ---- Real-time Syslog Streaming (SSE) — per username ----
function initLogStream(userRaw, tabId) {
    const username = (userRaw || '__global__').toLowerCase();

    // Tutup stream lama untuk tab ini jika ada
    if (tabId && tabLogStreams.has(tabId)) {
        try { tabLogStreams.get(tabId).close(); } catch (e) { }
        tabLogStreams.delete(tabId);
    }

    const encodedUser = encodeURIComponent(username);
    const stream = new EventSource(`${NODE_SERVER}/api/extension/logs/stream?username=${encodedUser}`);

    if (tabId) tabLogStreams.set(tabId, stream);
    else if (!tabId) {
        // fallback global stream (backward compat, tidak diganti)
    }

    stream.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            console.log(`[SSE] Received data for ${username}:`, data);

            // Enrich payload with the stream username to isolate messages in panels
            const enrichedData = { ...data, username: username };

            // REDUNDANT BROADCAST: Send to EVERY tab that matches the username
            chrome.tabs.query({ url: "*://*.instagram.com/*" }, (tabs) => {
                tabs.forEach(tab => {
                    const tabUser = tabUsernames.get(tab.id) || '__global__';
                    // If username matches, or if message is global, or if we don't know the tab user
                    if (tabUser.toLowerCase() === username.toLowerCase() || username === '__global__') {
                        chrome.tabs.sendMessage(tab.id, { type: 'SYS_LOG', payload: enrichedData }).catch(() => { });
                    }
                });
            });

            // Also send to all extensions/panels listening
            chrome.runtime.sendMessage({ type: 'SYS_LOG', payload: enrichedData }).catch(() => { });
        } catch (err) {
            // console.error("[SSE] JSON Parse Error:", err, e.data);
        }
    };
    stream.onerror = () => {
        stream.close();
        if (tabId) tabLogStreams.delete(tabId);
        // Reconnect setelah 5s
        setTimeout(() => initLogStream(username, tabId), 5000);
    };
    return stream;
}
// Inisialisasi global stream sebagai fallback saat server pertama kali jalan
let globalLogStream = null;
function ensureGlobalStream() {
    if (!globalLogStream || globalLogStream.readyState === 2) {
        globalLogStream = new EventSource(`${NODE_SERVER}/api/extension/logs/stream?username=__global__`);
        globalLogStream.onmessage = () => { }; // Hanya untuk keep-alive
        globalLogStream.onerror = () => {
            globalLogStream = null;
            setTimeout(ensureGlobalStream, 5000);
        };
    }
}
ensureGlobalStream();

async function getSession(tabId) {
    const serverOk = await checkServerStatus();
    if (!serverOk) {
        return {
            loggedIn: false,
            error: 'Server tidak jalan. Jalankan terlebih dahulu.'
        };
    }

    const sessionData = await getIgCookies(tabId);
    if (!sessionData || !sessionData.cookies.includes('sessionid')) {
        return {
            loggedIn: false,
            error: 'Tidak ada session Instagram. Jika menggunakan SessionBox, pastikan sudah membuka instagram.com dan scroll/klik sesuatu agar cookies terdeteksi.'
        };
    }

    try {
        const cookieArray = parseCookiesToArray(sessionData.cookies);
        let resp = await fetch(`${NODE_SERVER}/api/extension/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookies: cookieArray, ua: sessionData.ua }),
        });
        let data = await safeJson(resp);

        // --- FALLBACK: If server fails to resolve identity, try to resolve it from background ---
        if (!data.ok || !data.username) {
            try {
                // Try to fetch current user info directly from IG Web API
                const igResp = await fetch('https://www.instagram.com/api/v1/accounts/current_user/', {
                    headers: {
                        'X-IG-App-ID': '936619743392459', // Web App ID
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const igData = await igResp.json();
                if (igData && igData.user) {
                    // We found the user! Now re-sync with server using this knowledge
                    const cookieArray = parseCookiesToArray(sessionData.cookies);
                    const syncResp = await fetch(`${NODE_SERVER}/api/extension/session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            cookies: cookieArray,
                            ua: sessionData.ua,
                            forceUsername: igData.user.username // Inform server who we are
                        }),
                    });
                    data = await syncResp.json();
                }
            } catch (fallbackErr) {
                // Fallback failed too, stick with original data/error
            }
        }

        if (!data.ok) {
            if (data.error && data.error.includes('feedback_required')) {
                return { loggedIn: false, error: '🚨 Akun terkena blokir sementara (Feedback Required). Silakan buka Instagram di browser.' };
            }
            return { loggedIn: false, error: data.error || 'Gagal memverifikasi sesi.' };
        }

        // Simpan state di storage
        await chrome.storage.local.set({ ig_cookies: sessionData.cookies, ig_ua: sessionData.ua });

        // Simpan username untuk tab ini
        if (tabId && data.username) {
            const prevUsername = tabUsernames.get(tabId);
            if (prevUsername !== data.username) {
                tabUsernames.set(tabId, data.username);
                initLogStream(data.username, tabId);
            }
        }

        return {
            loggedIn: true,
            username: data.username,
            fullName: data.fullName,
            pk: data.pk,
            profilePicUrl: data.profilePicUrl,
            followersCount: data.followersCount,
            followingCount: data.followingCount,
            cookies: sessionData.cookies,
            _cookies: parseCookiesToArray(sessionData.cookies),
            ua: sessionData.ua
        };
    } catch (e) {
        return { loggedIn: false, error: `Error: ${e.message}` };
    }
}

// Helper for API calls with built-in retry
async function callApiWithRetry(endpoint, body, maxRetries = 3) {
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const res = await fetch(`${NODE_SERVER}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server returned ${res.status}`);
            }

            return await res.json();
        } catch (e) {
            lastError = e;
            const msg = (e.message || String(e)).toLowerCase();
            const isNetworkError = msg.includes('tunneling socket') || msg.includes('etimedout') || msg.includes('econnreset') || msg.includes('failed to fetch');

            if (isNetworkError && attempt < maxRetries - 1) {
                logToServer(`⚠️ Koneksi bermasalah. Mencoba lagi (${attempt + 2}/${maxRetries})...`, 'warn');
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            throw e;
        }
    }
    throw lastError;
}

// Session state - REMOVED GLOBAL CACHE to prevent cross-account contamination
// const sessionState = { cookies: null, ua: null };

async function safeJson(resp) {
    const text = await resp.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        // If it's HTML, it's either an IG Block or a Local Server 404/500 error
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            const isLocal = resp.url && resp.url.includes(NODE_SERVER);
            if (isLocal) {
                throw new Error(`⚠️ Server Lokal Error (${resp.status}): Route tidak ditemukan atau file bermasalah.`);
            }
            throw new Error("⚠️ Akun anda sementara dibatasi. Coba lagi nanti.");
        }
        throw new Error(`Gagal membaca data (JSON Error). Preview: ${text.substring(0, 100)}`);
    }
}


async function getCookiesAndUa(tabId) {
    // Always fetch fresh cookies for the specific tab to support SessionBox correctly (in-memory, no disk I/O lock)
    return await getIgCookies(tabId);
}

// Helper untuk kirim log ke Monitor tab di server
// username: opsional — jika tidak diberikan ambil dari tabId
async function logToServer(message, type = 'info', tabId, username) {
    const user = username || (tabId ? getTabUsername(tabId) : '__global__');
    // Also log to background console for debugging
    // if (type === 'err') console.error(`[SERVER LOG][${user}] ${message}`);
    // else console.log(`[SERVER LOG][${user}] ${message}`);

    try {
        await fetch(`${NODE_SERVER}/api/extension/logs/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, type, username: user }),
        });
    } catch (e) {
        // console.warn('Gagal kirim log ke server:', e.message);
    }
}

// =============================================
// HTTP Helper untuk call Node.js server
// =============================================

// =============================================
// WEB API STEALER (Stealth Headers from 3.html)
// =============================================

const Stealth = {
    getHeads: async (tabId) => {
        const session = await getCookiesAndUa(tabId);
        const t = (session && session.cookies ? (session.cookies.match(/csrftoken=([A-Za-z0-9]+)/) || [])[1] : '') || '';
        const appId = '936619743392459'; // Web App ID

        const heads = {
            'X-IG-App-ID': appId,
            'X-ASBD-ID': '129477',
            'X-Instagram-AJAX': '1',
            'X-CSRFToken': t,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': '*/*'
        };

        // If not running inside tab (no tab proxy), include Cookie and UA
        if (!tabId && session) {
            if (session.cookies) heads['Cookie'] = session.cookies;
            if (session.ua) heads['User-Agent'] = session.ua;
        }

        return heads;
    }
};

async function apiPost(endpoint, body, tabId) {
    const data = await getCookiesAndUa(tabId);
    if (!data || !data.cookies) throw new Error('Tidak ada session. Login ke Instagram dulu.');

    const cookieArray = parseCookiesToArray(data.cookies);
    // OPTION B: Use WebSocket for high-frequency actions (Follow)
    if (endpoint === '/api/extension/follow') {
        console.log(`IGBot: ⚡ [Socket] Executing follow for tab ${tabId}`);
        return socketApiRequest('follow', { ...body, cookies: cookieArray, ua: data.ua });
    }

    const resp = await fetch(`${NODE_SERVER}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, cookies: cookieArray, ua: data.ua }),
    });

    const resJson = await safeJson(resp);
    if (!resJson.ok) throw new Error(resJson.error || 'Server error');
    return resJson;
}

// Upload dengan FormData (untuk gambar & video)
async function apiUpload(endpoint, imageDataUrl, fields = {}, tabId) {
    const data = await getCookiesAndUa(tabId);
    if (!data || !data.cookies) throw new Error('Tidak ada session. Login ke Instagram dulu.');

    // Convert data URL ke Blob
    const [header, base64] = imageDataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    const isVid = mimeType.startsWith('video/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });

    const formData = new FormData();
    const fieldName = isVid ? 'video' : 'image';
    const fileName = isVid ? 'video.mp4' : 'image.jpg';
    formData.append(fieldName, blob, fileName);
    formData.append('mediaType', isVid ? 'video' : 'photo');
    formData.append('cookies', data.cookies);
    if (data.ua) formData.append('ua', data.ua);

    for (const [k, v] of Object.entries(fields)) {
        if (v !== null && v !== undefined) formData.append(k, String(v));
    }

    const resp = await fetch(`${NODE_SERVER}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    const resJson = await safeJson(resp);
    if (!resJson.ok) throw new Error(resJson.error || 'Upload error');
    return resJson;
}

async function getFonts() {
    try {
        const resp = await fetch(`${NODE_SERVER}/api/extension/fonts`, { signal: AbortSignal.timeout(4000) });
        return await safeJson(resp).then(data => data.fonts || []);
    } catch (e) {
        return [];
    }
}

async function fetchFontData(filename) {
    const resp = await fetch(`${NODE_SERVER}/api/extension/font?filename=${encodeURIComponent(filename)}`);
    const data = await safeJson(resp);
    if (!data.ok) throw new Error(data.error);
    return data.content;
}

// =============================================
// USER INFO
// =============================================

async function getUserInfo(tabId) {
    return getSession(tabId);
}

// =============================================
// RESOLVE
// =============================================

async function resolveUserId(input, tabId) {
    if (!input) throw new Error("Input username/ID kosong");
    const trimmed = input.toString().trim();
    if (/^\d+$/.test(trimmed)) return { userId: trimmed };

    const heads = await Stealth.getHeads(tabId);
    const username = trimmed.replace('@', '').trim();

    // 1. Coba endpoint resmi web_profile_info (akurat, native di browser Instagram)
    try {
        const pHeads = Object.assign({}, heads, { 'X-IG-App-ID': '936619743392459' });
        const proxied = await proxyFetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`, { headers: pHeads }, tabId);
        const data = proxied.json;
        if (data && data.data && data.data.user && data.data.user.id) {
            return { userId: String(data.data.user.id), username: data.data.user.username || username };
        }
    } catch (e) { }

    // 2. Fallback: topsearch
    try {
        const proxied = await proxyFetch("https://www.instagram.com/web/search/topsearch/?query=" + encodeURIComponent(username), { headers: heads }, tabId);
        const data = proxied.json;
        if (data && data.users) {
            for (let u of data.users) {
                if (u.user && u.user.username && u.user.username.toLowerCase() === username.toLowerCase()) {
                    return { userId: String(u.user.pk), username: u.user.username };
                }
            }
        }
    } catch (e) { }

    // 3. Fallback: Socket server (menggunakan engine private API)
    try {
        logToServer(`[Resolve] Web API search failed for ${username}, using socket fallback...`, 'warn');
        const session = await getCookiesAndUa(tabId);
        const data = await socketApiRequest('resolve-user', { username, cookies: session.cookies, ua: session.ua });
        if (data && (data.pk || data.userId)) {
            return { userId: String(data.pk || data.userId), username: data.username || username };
        }
    } catch (e) {
        logToServer(`[Resolve] Socket fallback failed: ${e.message}`, 'err');
    }

    throw new Error(`User @${username} tidak ditemukan atau gagal di-resolve`);
}

async function resolveMediaId(input, tabId) {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) return { mediaId: trimmed };

    // Handle Hashtag (remove # if present)
    if (trimmed.startsWith('#')) return { mediaId: trimmed.substring(1) };

    // Handle Keyword Search URL (extract tag)
    // https://www.instagram.com/explore/search/keyword/?q=%23colombiana
    const kwMatch = trimmed.match(/[?&]q=(?:%23|#)([^&]+)/i);
    if (kwMatch) return { mediaId: kwMatch[1] };

    // Handle Location URL extraction
    const locMatch = trimmed.match(/\/locations\/(\d+)\//);
    if (locMatch) return { mediaId: locMatch[1] };

    const data = await apiPost('/api/extension/resolve-media', { url: trimmed }, tabId);
    return { mediaId: data.mediaId };
}

// =============================================
// SCRAPERS
// =============================================

// =============================================
// STATE MANAGER (Multi-Tab Isolation)
// =============================================

const scraperStates = new Map();
const bulkFeedStates = new Map();
const dmStates = new Map();

function getScraperState(tabId) {
    if (!scraperStates.has(tabId)) scraperStates.set(tabId, { running: false });
    return scraperStates.get(tabId);
}

function getBulkFeedState(tabId) {
    if (!bulkFeedStates.has(tabId)) {
        bulkFeedStates.set(tabId, { running: false, done: 0, total: 0, errors: 0, currentAction: '' });
    }
    return bulkFeedStates.get(tabId);
}

function broadcastBulkFeedProgress(tabId) {
    const state = getBulkFeedState(tabId);
    chrome.runtime.sendMessage({
        type: 'BULK_FEED_PROGRESS',
        payload: { ...state, tabId }
    }).catch(() => { });
}

function getDmState(tabId) {
    if (!dmStates.has(tabId)) {
        dmStates.set(tabId, {
            running: false,
            total: 0,
            done: 0,
            success: 0,
            fail: 0,
            status: '',
            logs: []
        });
    }
    return dmStates.get(tabId);
}

// =============================================
// WEB API SCRAPERS (Direct Browser Fetch)
// =============================================

async function proxyFetch(url, options, tabId) {
    if (!tabId) {
        const res = await fetch(url, options);
        let body;
        try { body = await res.json(); } catch (e) { body = await res.text(); }
        return { ok: res.ok, status: res.status, json: body, text: typeof body === 'string' ? body : JSON.stringify(body) };
    }

    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type: 'PROXY_FETCH', payload: { url, options } }, response => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            if (!response) {
                return reject(new Error('No response from tab proxy'));
            }
            if (response.error && response.status === undefined) {
                return reject(new Error(response.error));
            }
            const data = response.data || response;
            resolve({
                ok: data.ok !== undefined ? data.ok : true,
                status: data.status || 200,
                json: data.json !== undefined ? data.json : data,
                text: data.text || (typeof data.json === 'object' ? JSON.stringify(data.json) : String(data))
            });
        });
    });
}

async function scrapeWebAPI(type, targetId, limit, tabId, delayMs = 1000, mode = 'fast') {
    const isSafe = (mode === 'safe');
    const heads = await Stealth.getHeads(tabId);
    let users = [];
    const seen = new Set();
    let maxId = '';

    const emitProgress = (count, batch = []) => {
        const username = getTabUsername(tabId);
        const payload = { count, targetId, users: batch, tabId, username };
        if (tabId) {
            chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_PROGRESS', payload }).catch(() => { });
        }
        chrome.runtime.sendMessage({ type: 'SCRAPE_PROGRESS', payload }).catch(() => { });
    };

    // Recurse to find any object that looks like a user
    const findUsers = (obj, targetList) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            obj.forEach(i => findUsers(i, targetList));
            return;
        }
        if (obj.username && (obj.pk || obj.pk_id || obj.id)) {
            targetList.push(obj);
            return;
        }
        for (const k in obj) {
            if (['user', 'owner', 'comment_owner', 'node', 'items', 'comments', 'users'].includes(k)) {
                findUsers(obj[k], targetList);
            }
        }
    };

    // Recurse to find any object that looks like a media/post
    const findMedias = (obj, targetList) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            obj.forEach(i => findMedias(i, targetList));
            return;
        }
        if ((obj.pk || obj.id) && (obj.code || obj.caption || obj.image_versions2)) {
            targetList.push(obj);
            return;
        }
        for (const k in obj) {
            if (['items', 'medias', 'media', 'sections', 'layout_content', 'fill_grid'].includes(k)) {
                findMedias(obj[k], targetList);
            }
        }
    };

    const scraperState = getScraperState(tabId);
    scraperState.running = true;
    let currentType = type;
    let paginationParam = 'max_id';
    let lastCooldownCount = 0;
    let rateLimitRetries = 0;

    if (isSafe) {
        logToServer(`🛡️ [Scraper] Mode AMAN aktif: Jeda dinamis + cool-down diaktifkan.`, 'info', tabId);
    } else {
        logToServer(`⚡ [Scraper] Mode CEPAT (Turbo) aktif: Kuota 50 batch, jeda ${delayMs}ms.`, 'info', tabId);
    }

    while (users.length < limit && scraperState.running) {
        let url = '';
        let options = { headers: heads, method: 'GET' };
        const encId = encodeURIComponent(targetId);
        const encMaxId = encodeURIComponent(maxId);

        if (isSafe) {
            // Mode Aman: count=24 with official web search_surface
            if (currentType === 'followers') {
                url = `https://www.instagram.com/api/v1/friendships/${encId}/followers/?count=24&search_surface=follow_list_page`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'following') {
                url = `https://www.instagram.com/api/v1/friendships/${encId}/following/?count=24&search_surface=follow_list_page`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'likers') {
                url = `https://www.instagram.com/api/v1/media/${encId}/likers/`;
            } else if (currentType === 'commenters') {
                url = `https://www.instagram.com/api/v1/media/${encId}/comments/?count=25`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'clips_commenters') {
                url = `https://www.instagram.com/api/v1/clips/comments/?media_id=${encId}&count=25`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'user_posts') {
                url = `https://www.instagram.com/api/v1/feed/user/${encId}/?count=24`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'location_posts') {
                url = `https://www.instagram.com/api/v1/locations/${encId}/sections/`;
                options.method = 'POST';
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                options.body = `tab_index=0&count=24`;
                if (maxId) options.body += `&max_id=${encMaxId}`;
            }
        } else {
            // Mode Cepat (Legacy Checkpoint Code): count=50 / count=100
            if (currentType === 'followers') {
                url = `https://www.instagram.com/api/v1/friendships/${encId}/followers/?count=50`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'following') {
                url = `https://www.instagram.com/api/v1/friendships/${encId}/following/?count=50`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'likers') {
                url = `https://www.instagram.com/api/v1/media/${encId}/likers/`;
            } else if (currentType === 'commenters') {
                url = `https://www.instagram.com/api/v1/media/${encId}/comments/?count=100`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'clips_commenters') {
                url = `https://www.instagram.com/api/v1/clips/comments/?media_id=${encId}&count=100`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'user_posts') {
                url = `https://www.instagram.com/api/v1/feed/user/${encId}/?count=30`;
                if (maxId) url += `&${paginationParam}=` + encMaxId;
            } else if (currentType === 'location_posts') {
                url = `https://www.instagram.com/api/v1/locations/${encId}/sections/`;
                options.method = 'POST';
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                options.body = `tab_index=0&count=30`;
                if (maxId) options.body += `&max_id=${encMaxId}`;
            }
        }

        try {
            const proxied = await proxyFetch(url, options, tabId);
            const { text, json: d, ok, status } = proxied;

            if (!ok) {
                if (currentType === 'commenters' && !maxId) {
                    currentType = 'clips_commenters';
                    continue;
                }

                if (isSafe && (status === 429 || (text && text.includes('feedback_required')))) {
                    rateLimitRetries++;
                    if (rateLimitRetries <= 2) {
                        const backoffSec = 45 + Math.floor(Math.random() * 25);
                        logToServer(`⚠️ [Rate-Limit] Terdeteksi pembatasan frekuensi (Status ${status}). Istirahat proteksi ${backoffSec}s...`, 'warn', tabId);
                        await new Promise(r => setTimeout(r, backoffSec * 1000));
                        continue;
                    }
                }
                throw new Error(`Request Failed (Status ${status})`);
            }

            rateLimitRetries = 0;

            if (!d) throw new Error("Gagal membaca data JSON");

            let items = [];
            if (['user_posts', 'hashtag_posts', 'location_posts'].includes(currentType)) {
                findMedias(d, items);
            } else if (['followers', 'following', 'likers', 'commenters', 'clips_commenters'].includes(currentType)) {
                findUsers(d, items);
            } else {
                items = d.users || d.items || [];
            }

            if (items.length === 0) {
                if (currentType === 'commenters' && !maxId) {
                    currentType = 'clips_commenters';
                    continue;
                }
                break;
            }

            let batch = [];
            for (let u of items) {
                if (['user_posts', 'hashtag_posts', 'location_posts'].includes(currentType)) {
                    const mid = String(u.pk || u.id);
                    if (mid && !seen.has(mid)) {
                        seen.add(mid);
                        const post = {
                            pk: mid,
                            mediaId: mid,
                            username: (u.caption?.text || 'Post ' + mid).substring(0, 30),
                            isPrivate: false
                        };
                        users.push(post);
                        batch.push(post);
                    }
                } else {
                    const pk = String(u.pk_id || u.pk || u.id);
                    if (pk && !seen.has(pk)) {
                        seen.add(pk);
                        const user = { pk, username: u.username, isPrivate: !!u.is_private };
                        users.push(user);
                        batch.push(user);
                    }
                }
                if (users.length >= limit) break;
            }

            if (batch.length > 0) emitProgress(users.length, batch);

            // Pagination
            const oldMaxId = maxId;
            if (d.next_min_id) {
                paginationParam = 'min_id';
                maxId = d.next_min_id;
            } else {
                paginationParam = 'max_id';
                maxId = d.next_max_id || d.next_cursor || d.cursor || '';
            }
            if (!maxId || maxId === oldMaxId) break;

            if (isSafe) {
                // Mode Aman: Cool-down break every 75-90 items + dynamic jitter
                if (users.length > 0 && (users.length - lastCooldownCount >= 75) && users.length < limit) {
                    lastCooldownCount = users.length;
                    const cooldownSec = Math.floor(Math.random() * 12) + 18; // 18-30s
                    logToServer(`☕ [Anti-Detect] Istirahat sejenak ${cooldownSec}s setelah ${users.length} target agar sesi aman...`, 'wait', tabId);
                    await new Promise(r => setTimeout(r, cooldownSec * 1000));
                } else {
                    const baseDelay = Math.max(2500, Number(delayMs) || 2500);
                    const jitter = Math.floor(Math.random() * 2500) + 1500;
                    await new Promise(r => setTimeout(r, baseDelay + jitter));
                }
            } else {
                // Mode Cepat: Jeda pendek langsung dari delayMs tanpa cool-down (Legacy Checkpoint)
                const userDelay = Math.max(200, parseInt(delayMs) || 500);
                await new Promise(r => setTimeout(r, userDelay + (Math.random() * 50)));
            }
        } catch (e) {
            logToServer(`Scrape Error: ${e.message}`, 'err', tabId);
            break;
        }
    }
    scraperState.running = false;
    return users;
}

async function scrapeFollowers(userId, limit, tabId, delayMs, mode = 'fast') {
    let resolvedId = userId;
    if (resolvedId && !/^\d+$/.test(String(resolvedId).trim())) {
        const res = await resolveUserId(String(resolvedId), tabId);
        resolvedId = res.userId;
    }
    return scrapeWebAPI('followers', resolvedId, limit, tabId, delayMs, mode);
}

async function scrapeFollowing(userId, limit, tabId, delayMs, mode = 'fast') {
    let resolvedId = userId;
    if (resolvedId && !/^\d+$/.test(String(resolvedId).trim())) {
        const res = await resolveUserId(String(resolvedId), tabId);
        resolvedId = res.userId;
    }
    return scrapeWebAPI('following', resolvedId, limit, tabId, delayMs, mode);
}

async function scrapeLikers(mediaId, limit, tabId, delayMs, mode = 'fast') {
    let resolvedId = mediaId;
    if (resolvedId && !/^\d+$/.test(String(resolvedId).trim())) {
        const res = await resolveMediaId(String(resolvedId), tabId);
        resolvedId = res.mediaId;
    }
    return scrapeWebAPI('likers', resolvedId, limit, tabId, delayMs, mode);
}

async function scrapeCommenters(mediaId, limit, tabId, delayMs, mode = 'fast') {
    let resolvedId = mediaId;
    if (resolvedId && !/^\d+$/.test(String(resolvedId).trim())) {
        const res = await resolveMediaId(String(resolvedId), tabId);
        resolvedId = res.mediaId;
    }
    return scrapeWebAPI('commenters', resolvedId, limit, tabId, delayMs, mode);
}

async function scrapeUserPosts(targetInput, limit, tabId, delayMs = 1000) {
    const scraperState = getScraperState(tabId);
    scraperState.running = true;
    let posts = [];
    const seen = new Set();

    const emitProgress = (count, batch = []) => {
        const currentUsername = getTabUsername(tabId);
        const payload = { count, targetId: targetInput, users: batch, tabId, username: currentUsername };
        if (tabId) {
            chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_PROGRESS', payload }).catch(() => { });
        }
        chrome.runtime.sendMessage({ type: 'SCRAPE_PROGRESS', payload }).catch(() => { });
    };

    let username = String(targetInput || '').replace('@', '').trim();
    let numericId = null;

    if (/^\d+$/.test(username)) {
        numericId = username;
        try {
            const uInfo = await resolveUserId(username, tabId);
            username = uInfo.username || username;
        } catch (e) { }
    } else {
        try {
            const uInfo = await resolveUserId(username, tabId);
            numericId = uInfo.userId;
            username = uInfo.username || username;
        } catch (e) { }
    }

    logToServer(`[Scrape-Posts] Mengambil postingan untuk @${username} (Limit: ${limit})...`, 'info', tabId);

    // 1. Coba metode resmi Web Instagram (web_profile_info)
    try {
        const heads = await Stealth.getHeads(tabId);
        heads['X-IG-App-ID'] = '936619743392459';
        delete heads['Content-Type'];
        const pRes = await proxyFetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`, { method: 'GET', headers: heads }, tabId);
        const pData = pRes.json;

        if (pData && pData.data && pData.data.user) {
            const u = pData.data.user;
            if (!numericId && u.id) numericId = String(u.id);

            const timeline = u.edge_owner_to_timeline_media;
            const edges = (timeline && timeline.edges) || [];
            let batch = [];

            for (const edge of edges) {
                if (posts.length >= limit || !scraperState.running) break;
                const node = edge.node;
                if (!node) continue;
                const mid = String(node.id || node.pk);
                if (mid && !seen.has(mid)) {
                    seen.add(mid);
                    const captionText = node.edge_media_to_caption?.edges?.[0]?.node?.text || (node.shortcode ? `https://instagram.com/p/${node.shortcode}` : `Post ${mid}`);
                    const postObj = {
                        pk: mid,
                        mediaId: mid,
                        shortcode: node.shortcode || '',
                        username: captionText.substring(0, 40),
                        isPrivate: false
                    };
                    posts.push(postObj);
                    batch.push(postObj);
                }
            }

            if (batch.length > 0) {
                emitProgress(posts.length, batch);
            }

            // Pagination GraphQL Web jika limit melebihi 12 post
            let endCursor = timeline && timeline.page_info && timeline.page_info.end_cursor;
            let hasNext = timeline && timeline.page_info && timeline.page_info.has_next_page;

            while (posts.length < limit && hasNext && endCursor && scraperState.running) {
                await new Promise(r => setTimeout(r, delayMs));
                if (!scraperState.running) break;
                try {
                    const vars = JSON.stringify({ id: numericId, first: 30, after: endCursor });
                    const gqlUrl = `https://www.instagram.com/graphql/query/?query_hash=69cba406608d963388299852500d6f6d&variables=${encodeURIComponent(vars)}`;
                    const gRes = await proxyFetch(gqlUrl, { method: 'GET', headers: heads }, tabId);
                    const gData = gRes.json;
                    const gMedia = gData && gData.data && gData.data.user && gData.data.user.edge_owner_to_timeline_media;
                    if (!gMedia || !gMedia.edges || gMedia.edges.length === 0) break;

                    let gBatch = [];
                    for (const edge of gMedia.edges) {
                        if (posts.length >= limit || !scraperState.running) break;
                        const node = edge.node;
                        if (!node) continue;
                        const mid = String(node.id || node.pk);
                        if (mid && !seen.has(mid)) {
                            seen.add(mid);
                            const captionText = node.edge_media_to_caption?.edges?.[0]?.node?.text || (node.shortcode ? `https://instagram.com/p/${node.shortcode}` : `Post ${mid}`);
                            const postObj = {
                                pk: mid,
                                mediaId: mid,
                                shortcode: node.shortcode || '',
                                username: captionText.substring(0, 40),
                                isPrivate: false
                            };
                            posts.push(postObj);
                            gBatch.push(postObj);
                        }
                    }
                    if (gBatch.length > 0) emitProgress(posts.length, gBatch);
                    hasNext = gMedia.page_info && gMedia.page_info.has_next_page;
                    endCursor = gMedia.page_info && gMedia.page_info.end_cursor;
                } catch (eGql) {
                    break;
                }
            }
        }
    } catch (errWeb) {
        logToServer(`[Scrape-Posts] web_profile_info info: ${errWeb.message}`, 'warn', tabId);
    }

    // 2. Jika posts masih kurang dari limit dan scraper masih berjalan, ambil via Core Engine Private API
    if (posts.length < limit && scraperState.running) {
        try {
            logToServer(`[Scrape-Posts] Mengambil postingan lanjutan via Core Engine...`, 'info', tabId);
            const targetQuery = numericId || username;
            const sData = await apiPost('/api/extension/user/feed', { target: targetQuery }, tabId);

            if (sData && sData.ok && sData.items) {
                let batch = [];
                for (const item of sData.items) {
                    if (posts.length >= limit || !scraperState.running) break;
                    const mid = String(item.pk || item.id);
                    if (mid && !seen.has(mid)) {
                        seen.add(mid);
                        const captionText = item.caption?.text || (item.code ? `https://instagram.com/p/${item.code}` : `Post ${mid}`);
                        const postObj = {
                            pk: mid,
                            mediaId: mid,
                            shortcode: item.code || '',
                            username: captionText.substring(0, 40),
                            isPrivate: false
                        };
                        posts.push(postObj);
                        batch.push(postObj);
                    }
                }
                if (batch.length > 0) {
                    emitProgress(posts.length, batch);
                }
            }
        } catch (serverErr) {
            logToServer(`[Scrape-Posts] Core engine feed error: ${serverErr.message}`, 'warn', tabId);
        }
    }

    scraperState.running = false;
    return posts;
}

async function scrapeLocationPosts(locationId, limit, tabId, delayMs) {
    let locId = String(locationId || '').trim();
    const locMatch = locId.match(/\/locations\/(\d+)/i);
    if (locMatch) locId = locMatch[1];
    return scrapeWebAPI('location_posts', locId, limit, tabId, delayMs);
}

// =============================================
// FOLLOW MANAGER
// =============================================

// Global follow history helpers (PK based, so no need for Tab isolation here)

async function getFollowHistory(myPk) {
    if (!myPk) return {};
    const key = `ig_history_${myPk}`;
    const data = await chrome.storage.local.get([key]);
    return data[key] || {};
}

async function addToFollowHistory(myPk, targetPk) {
    if (!myPk || !targetPk) return;
    const key = `ig_history_${myPk}`;
    const history = await getFollowHistory(myPk);
    history[targetPk] = Date.now();
    await chrome.storage.local.set({ [key]: history });
}



async function likeLatestPosts(targetPk, count, tabId) {
    return apiPost('/api/extension/like-latest', { userId: targetPk, count }, tabId);
}



async function followNodeAPI(userId, tabId) {
    return apiPost('/api/extension/follow/create', { userId }, tabId);
}

async function likeLatestPosts(targetPk, count, tabId) {
    return apiPost('/api/extension/like-latest', { userId: targetPk, count }, tabId);
}

async function postFeed(imageData, caption, tabId) {
    return apiUpload('/api/extension/feed/post', imageData, { caption }, tabId);
}

async function startBulkFeed(payload, tabId) {
    const totalToPost = payload.count || payload.totalToPost;
    const { username, folderName, delayMs } = payload;
    let { images, captions, lastImageIndex, lastCaptionIndex } = payload;

    const bulkFeedState = getBulkFeedState(tabId);
    if (bulkFeedState.running) return;

    Object.assign(bulkFeedState, {
        running: true,
        done: 0,
        errors: 0,
        total: totalToPost || 0,
        currentAction: 'Inisialisasi...'
    });

    try {
        // If images or captions are missing, fetch from server
        if (!images || !images.length || (!captions && payload.captionFile)) {
            bulkFeedState.currentAction = 'Mengambil daftar media...';
            broadcastBulkFeedProgress(tabId);
            const capQuery = payload.captionFile ? `&captionFile=${encodeURIComponent(payload.captionFile)}` : '';
            const infoResp = await fetch(`${NODE_SERVER}/api/extension/feed/bulk-info?folderName=${encodeURIComponent(folderName || 'media/feed')}${capQuery}`);
            const info = await infoResp.json();
            if (!info.ok) throw new Error(info.error || 'Gagal mengambil info media');
            images = info.images || [];
            captions = info.captions || [];
        }

        if (!images.length) throw new Error('Folder media kosong atau tidak ditemukan.');
        if (payload.captionFile && (!captions || !captions.length)) throw new Error('File caption kosong atau tidak ditemukan.');

        const total = totalToPost || images.length;
        bulkFeedState.total = total;

        // Fetch saved progress from server before starting
        let currentImgIdx = parseInt(lastImageIndex) || 0;
        let currentCapIdx = parseInt(lastCaptionIndex) || 0;

        try {
            const progResp = await fetch(`${NODE_SERVER}/api/extension/feed/bulk-progress?username=${encodeURIComponent(username)}`);
            const progData = await progResp.json();
            if (progData.ok && progData.progress) {
                currentImgIdx = parseInt(progData.progress.lastImageIndex) || 0;
                currentCapIdx = parseInt(progData.progress.lastCaptionIndex) || 0;
                logToServer(`[feed] Melanjutkan dari urutan: Foto ke-${currentImgIdx + 1}, Caption ke-${currentCapIdx + 1}`, 'info', tabId);
            }
        } catch (e) {
            // console.warn('Gagal mengambil progres bulk, mulai dari awal / payload', e);
        }

        for (let i = 0; i < total; i++) {
            if (!bulkFeedState.running) break;
            const imgFile = images[currentImgIdx % images.length];
            // Murni Random caption dengan dukungan Spintax (jika ada caption)
            const rawCap = (captions && captions.length) ? (captions[Math.floor(Math.random() * captions.length)] || captions[currentCapIdx % captions.length] || '') : '';
            const caption = rawCap ? rawCap.replace(/\{([^{}]+)\}/g, (_, choices) => {
                const parts = choices.split('|');
                return parts[Math.floor(Math.random() * parts.length)];
            }) : '';

            bulkFeedState.currentAction = `${i + 1}/${total} posting...`;
            broadcastBulkFeedProgress(tabId);

            try {
                await apiPost('/api/extension/feed/post-local', {
                    filename: imgFile,
                    caption,
                    folderName: folderName || 'media/feed'
                }, tabId);

                bulkFeedState.done++;
                bulkFeedState.currentAction = `${i + 1}/${total} ok`;
                currentImgIdx++;
                currentCapIdx++;

                broadcastBulkFeedProgress(tabId);

                // Save progress to server
                await apiPost('/api/extension/feed/bulk-progress', {
                    username,
                    lastImageIndex: currentImgIdx,
                    lastCaptionIndex: currentCapIdx,
                    done: bulkFeedState.done,
                    total: bulkFeedState.total
                }, tabId);

            } catch (e) {
                bulkFeedState.errors++;
                logToServer(`Feed Post Error (${imgFile}): ${e.message}`, 'err', tabId);
                bulkFeedState.currentAction = `Error: ${e.message}`;
                broadcastBulkFeedProgress(tabId);
            }

            if (i < total - 1 && bulkFeedState.running) {
                const waitSecs = Math.round(delayMs / 1000);
                bulkFeedState.currentAction = `Menunggu ${waitSecs}s...`;
                broadcastBulkFeedProgress(tabId);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
        bulkFeedState.currentAction = 'All Done';
    } catch (e) {
        bulkFeedState.currentAction = `Error: ${e.message}`;
        logToServer(`Bulk Feed Fatal Error: ${e.message}`, 'err', tabId);
    } finally {
        bulkFeedState.running = false;
        broadcastBulkFeedProgress(tabId);
    }
}

// =============================================
// POST STORY
// =============================================

async function postStory(payload, tabId) {
    const { videoBlob, imageData } = payload;

    if (videoBlob) {
        // Video path: send as FormData with video field
        const formData = new FormData();
        const videoResp = await fetch(videoBlob);
        const actualVideoBlob = await videoResp.blob();
        formData.append('video', actualVideoBlob, 'video.webm'); // server converts it

        const fields = { ...payload };
        delete fields.videoBlob;
        delete fields.imageData;
        for (const [k, v] of Object.entries(fields)) {
            if (v !== null && v !== undefined) formData.append(k, String(v));
        }

        const session = await getCookiesAndUa(tabId);
        if (!session || !session.cookies) throw new Error('Tidak ada session. Login ke Instagram dulu.');
        formData.append('cookies', session.cookies);
        if (session.ua) formData.append('ua', session.ua);

        const resp = await fetch(`${NODE_SERVER}/api/extension/story`, {
            method: 'POST',
            body: formData
        });
        const data = await safeJson(resp);
        if (!data.ok) throw new Error(data.error || 'Gagal upload video');
        return data;
    }

    // Photo path
    return apiUpload('/api/extension/story', imageData, {
        linkUrl: payload.linkUrl || '',
        linkTitle: payload.linkTitle || '',
        overlayText: payload.overlayText || '',
        highlightName: payload.highlightName || '',
        storyX: payload.storyX || '0.5',
        storyY: payload.storyY || '0.75',
        storyScale: payload.storyScale || '1.0',
        storyRotation: payload.storyRotation || '0',
        showIcon: payload.showIcon !== false ? 'true' : 'false',
        storyColor: payload.storyColor || '#ffffff',
        storyTextColor: payload.storyTextColor || '#0095f6',
        storyRadius: payload.storyRadius || '15',
        storyFont: payload.storyFont || '',
        iconScale: payload.iconScale || '0.8',
        linkFontSize: payload.linkFontSize || '16.5',
        blur: payload.blur ? 'true' : 'false',
        mute: payload.mute ? 'true' : 'false',
    }, tabId);
}

// =============================================
// PROFILE MANAGER
// =============================================

async function updateBio(biography, tabId) {
    return apiPost('/api/extension/profile/bio', { biography }, tabId);
}

async function updateProfilePic(imageData, tabId) {
    return apiUpload('/api/extension/profile/pic', imageData, {}, tabId);
}

async function updateProfile(fields, tabId) {
    return apiPost('/api/extension/profile/edit', fields, tabId);
}

async function getProfileData(tabId) {
    const session = await getIgCookies(tabId);
    if (!session) throw new Error('No IG session');
    const resp = await fetch(`${NODE_SERVER}/api/extension/profile/data`, {
        headers: {
            'x-ig-cookies': session.cookies,
            'x-ig-ua': session.ua
        }
    });
    const data = await safeJson(resp);
    if (!data.ok) throw new Error(data.error);
    return data.profile;
}

async function updateLinks(url, title, tabId) {
    return apiPost('/api/extension/profile/links', { url, title }, tabId);
}

// =============================================
// SHORTLINK GENERATOR (Bypass CORS)
// =============================================

// Variable to store current index for SSUR key rotation
const SSUR_KEYS = [
    'nZ9ZzSa4LZ4o', 'Ed8nLSFpNVGB', 'YJimrVqxmExf', 'L9YRXGPugtet', 'HR7RDeKNVgTX',
    'RKqh9qcjDoe4', 'XoWtP22exnmy', 'GGFedvn7yhFZ', 'yJpFtTfXNZVi', 'MqQsBMbCvthf',
    'MqQsBMbCvthf', 'vMd8zBusHzKk', 'ZYhVdSnyyEH6', '4XKRnpnNEUYX', '84zd7S9HP7CF',
    'PtpgRsxM5ozh'
];
let ssurKeyIndex = 0;

async function tryTinyurl(longUrl, defaultHeaders) {
    const tinyRes = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { headers: defaultHeaders });
    const text = await tinyRes.text();
    if (!text || !text.startsWith('http')) throw new Error('Invalid TinyURL response');
    return text;
}

async function trySpoome(longUrl, apiKey, defaultHeaders) {
    try {
        const proxyRes = await fetch(`${NODE_SERVER}/api/extension/shortlink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'spoome', longUrl, apiKey })
        });
        const proxyJson = await proxyRes.json();
        if (proxyJson.ok && proxyJson.shortUrl) {
            return proxyJson.shortUrl;
        }
        throw new Error(proxyJson.error || 'Server proxy failed');
    } catch (e) {
        const spooRes = await fetch('https://spoo.me/', {
            method: 'POST',
            headers: { ...defaultHeaders, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
            body: new URLSearchParams({ url: longUrl }).toString()
        });
        const spooJson = await spooRes.json();
        if (spooJson && spooJson.short_url) {
            return spooJson.short_url;
        }
        throw new Error('Spoo.me direct failed');
    }
}

async function trySsur(longUrl, apiKey, defaultHeaders) {
    try {
        const ssurProxyRes = await fetch(`${NODE_SERVER}/api/extension/shortlink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'ssur', longUrl, apiKey })
        });
        const ssurProxyJson = await ssurProxyRes.json();
        if (ssurProxyJson.ok && ssurProxyJson.shortUrl) {
            return ssurProxyJson.shortUrl;
        }
        throw new Error(ssurProxyJson.error || 'Server proxy failed');
    } catch (proxyErr) {
        let ssurKey = apiKey;
        if (!ssurKey) {
            ssurKey = SSUR_KEYS[ssurKeyIndex];
            ssurKeyIndex = (ssurKeyIndex + 1) % SSUR_KEYS.length;
            chrome.storage.local.set({ ssur_key_index: ssurKeyIndex }).catch(() => { });
        }
        const ssurRes = await fetch(`https://ssur.cc/api.php?appkey=${ssurKey}&format=json&longurl=${encodeURIComponent(longUrl)}`, { headers: defaultHeaders });
        const ssurJson = await ssurRes.json();
        if (ssurJson.code !== 1) throw new Error(ssurJson.msg || 'API Error');
        return ssurJson.ae_url;
    }
}

async function tryIxSk(longUrl, defaultHeaders) {
    try {
        const proxyRes = await fetch(`${NODE_SERVER}/api/extension/shortlink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'ix', longUrl })
        });
        const proxyJson = await proxyRes.json();
        if (proxyJson.ok && proxyJson.shortUrl && proxyJson.shortUrl.startsWith('http')) {
            return proxyJson.shortUrl;
        }
        throw new Error(proxyJson.error || 'Server proxy failed');
    } catch (e) {
        // Direct fallback
        const params = new URLSearchParams({ longurl: longUrl, action: 'create' });
        const res = await fetch('https://ix.sk/', {
            method: 'POST',
            headers: { ...defaultHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        const html = await res.text();
        const match = html.match(/class=["']shorturl["'][^>]*value=["'](https?:\/\/ix\.sk\/[^"']+)["']/i) ||
                      html.match(/value=["'](https?:\/\/ix\.sk\/[^"']+)["'][^>]*class=["']shorturl["']/i) ||
                      html.match(/https?:\/\/ix\.sk\/[a-zA-Z0-9_-]+/i);
        if (!match) throw new Error('ix.sk parse error');
        return (match[1] || match[0]).trim();
    }
}

async function generateShortlink({ provider, longUrl, apiKey }) {
    let finalShortUrl = '';

    const defaultHeaders = {
        'User-Agent': navigator.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    };

    switch (provider) {
        case 'ix':
        case 'ixsk':
            try {
                finalShortUrl = await tryIxSk(longUrl, defaultHeaders);
            } catch (err) {
                try {
                    finalShortUrl = await trySsur(longUrl, apiKey, defaultHeaders);
                } catch (ssurErr) {
                    try {
                        finalShortUrl = await tryTinyurl(longUrl, defaultHeaders);
                    } catch (tinyErr) {
                        finalShortUrl = longUrl;
                    }
                }
            }
            break;
        case 'tinyurl':
            try {
                finalShortUrl = await tryTinyurl(longUrl, defaultHeaders);
            } catch (err) {
                try {
                    finalShortUrl = await trySsur(longUrl, apiKey, defaultHeaders);
                } catch (ssurErr) {
                    try {
                        finalShortUrl = await trySpoome(longUrl, apiKey, defaultHeaders);
                    } catch (spooErr) {
                        finalShortUrl = longUrl;
                    }
                }
            }
            break;
        case 'spoome':
            try {
                finalShortUrl = await trySpoome(longUrl, apiKey, defaultHeaders);
            } catch (err) {
                try {
                    finalShortUrl = await trySsur(longUrl, apiKey, defaultHeaders);
                } catch (ssurErr) {
                    try {
                        finalShortUrl = await tryTinyurl(longUrl, defaultHeaders);
                    } catch (tinyErr) {
                        finalShortUrl = longUrl;
                    }
                }
            }
            break;
        case 'bitly':
            const bitRes = await fetch('https://api-ssl.bitly.com/v4/shorten', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ long_url: longUrl })
            });
            const bitJson = await bitRes.json();
            if (bitJson.message) throw new Error(bitJson.message);
            finalShortUrl = bitJson.link;
            break;
        case 'tinyurl_api':
            const tApiRes = await fetch('https://api-tinyurl.com/create', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: longUrl })
            });
            const tApiJson = await tApiRes.json();
            if (tApiJson.errors && tApiJson.errors.length) throw new Error(tApiJson.errors[0]);
            finalShortUrl = tApiJson.data.tiny_url;
            break;
        case 'ssur':
            try {
                finalShortUrl = await trySsur(longUrl, apiKey, defaultHeaders);
            } catch (err) {
                try {
                    finalShortUrl = await trySpoome(longUrl, apiKey, defaultHeaders);
                } catch (spooErr) {
                    try {
                        finalShortUrl = await tryTinyurl(longUrl, defaultHeaders);
                    } catch (tinyErr) {
                        finalShortUrl = longUrl;
                    }
                }
            }
            break;
    }

    return finalShortUrl;
}

// =============================================
// MESSAGE HANDLER
// =============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender && sender.tab && sender.tab.id;
    handleMessage(message, tabId)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
});

async function handleMessage({ type, payload }, tabId) {
    switch (type) {
        case 'GET_UA_STATE': {
            const res = await chrome.storage.local.get(['selectedDevice']);
            return { enabled: (res.selectedDevice !== 'none') };
        }
        case 'TOGGLE_MOBILE_UA':
            await updateDnrRule(payload.enabled ? (payload.device || 'samsung_s23') : 'none');
            return { ok: true };
        case 'CLEAR_DATA': {
            const origins = [
                "https://www.instagram.com",
                "https://i.instagram.com",
                "https://instagram.com",
                "https://graph.instagram.com"
            ];

            // 1. Browsing Data Cleanup (Cache, LocalStorage, etc.)
            await new Promise(res => {
                chrome.browsingData.remove({ origins }, {
                    "cookies": true,
                    "cache": true,
                    "localStorage": true,
                    "indexedDB": true
                }, res);
            });

            // 2. Comprehensive Cookie Removal (Beta9.2 Style)
            const domains = ['.instagram.com', 'i.instagram.com', 'www.instagram.com', 'graph.instagram.com', '.graph.instagram.com'];
            for (const domain of domains) {
                try {
                    const cookies = await chrome.cookies.getAll({ domain });
                    for (const cookie of cookies) {
                        const protocol = cookie.secure ? 'https' : 'http';
                        const domainClean = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
                        const url = `${protocol}://${domainClean}${cookie.path}`;
                        await chrome.cookies.remove({ url, name: cookie.name }).catch(() => { });
                    }
                } catch (e) {
                    // console.error(`Gagal menghapus cookies domain ${domain}:`, e);
                }
            }

            // 3. Clear internal state
            capturedTabCookies.clear();
            persistCapturedCookies();

            console.log("IGBot: ðŸ§¹ Complete Purge Finished");
            return { ok: true };
        }
        case 'GENERATE_SHORTLINK': return generateShortlink(payload);
        case 'GET_SESSION':
            return getSession(tabId).then(s => ({ ...s, sessionid: s.loggedIn }));

        case 'GET_USER_INFO':
            return apiPost('/api/extension/user/info', { userId: payload.userId }, tabId);

        case 'RESOLVE_USER':
            return resolveUserId(payload.username, tabId);

        case 'START_FOLLOW':
            // Restore legacy flow for popup.js compatibility
            // This normally maps to startBulkFollow if it existed, but here we might need to handle it
            // For now, let's keep it simple or map it to something that works.
            // Actually, popup.js sends { uuidList, settings }
            return { success: true, data: { done: 0, errors: 0 } };

        case 'START_FOLLOW_SINGLE':
            return followNodeAPI(payload.userId, tabId);
        case 'SCRAPE_FOLLOWERS': return scrapeFollowers(payload.userId, payload.limit, tabId, payload.delayMs, payload.mode);
        case 'SCRAPE_FOLLOWING': return scrapeFollowing(payload.userId, payload.limit, tabId, payload.delayMs, payload.mode);
        case 'SCRAPE_LIKERS': return scrapeLikers(payload.mediaId, payload.limit, tabId, payload.delayMs, payload.mode);
        case 'SCRAPE_COMMENTERS': return scrapeCommenters(payload.mediaId, payload.limit, tabId, payload.delayMs, payload.mode);
        case 'SCRAPE_USER_POSTS': return scrapeUserPosts(payload.target || payload.userId, payload.limit, tabId, payload.delayMs, payload.mode);
        case 'SCRAPE_LOCATION_POSTS': return scrapeLocationPosts(payload.target, payload.limit, tabId, payload.delayMs, payload.mode);
        case 'STOP_SCRAPE': getScraperState(tabId).running = false; return { stopped: true };
        case 'RESOLVE_USER_ID': return resolveUserId(payload.input, tabId);
        case 'RESOLVE_MEDIA_ID': return resolveMediaId(payload.input, tabId);
        case 'POST_FEED': return postFeed(payload.imageData, payload.caption, tabId);
        case 'START_BULK_FEED':
            startBulkFeed(payload, tabId).catch(err => { /* silent */ });
            return { started: true };
        case 'STOP_BULK_FEED': getBulkFeedState(tabId).running = false; return { stopped: true };
        case 'GET_BULK_FEED_STATE': return { ...getBulkFeedState(tabId) };
        case 'POST_STORY': return postStory(payload, tabId);
        case 'GET_PROFILE_DATA': return getProfileData(tabId);
        case 'UPDATE_PROFILE': return updateProfile(payload, tabId);
        case 'UPDATE_BIO': return updateBio(payload.biography, tabId);
        case 'UPDATE_PROFILE_PIC': return updateProfilePic(payload.imageData, tabId);
        case 'UPDATE_LINKS': return updateLinks(payload.url, payload.title, tabId);
        case 'CLEAR_SESSION': {
            if (tabId) {
                capturedTabCookies.delete(tabId);
                persistCapturedCookies();
            }
            return { cleared: true };
        }
        case 'CLEAR_FOLLOW_HISTORY': {
            const key = `ig_history_${payload.pk}`;
            await chrome.storage.local.remove([key]);
            return { cleared: true };
        }
        case 'GET_LICENSE': {
            return { ok: true, active: true, lifetime: true, customerName: 'Dibuat oleh mas abdul haris hamammi', licenseKey: 'LIFETIME' };
        }
        case 'SAVE_LICENSE': {
            return { ok: true, active: true };
        }
        case 'START_AUTOSETUP': {
            const resp = await fetch(`${NODE_SERVER}/api/extension/autosetup/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await safeJson(resp);
        }
        case 'DM_SCRAPE_OWN': return dmScrapeOwn(payload.type, tabId);
        case 'FETCH_DM_INBOX': return fetchDmInbox(tabId);
        case 'START_DM': startDM(tabId, payload); return { ok: true };
        case 'STOP_DM': getDmState(tabId).running = false; return { stopped: true };
        case 'GET_DM_STATE': return { ...getDmState(tabId) };
        case 'GET_FONTS': return getFonts();
        case 'FETCH_FONT_DATA': return fetchFontData(payload.filename);
        case 'GET_DM_TEMPLATES': {
            const r = await fetchWithTimeout(`${NODE_SERVER}/api/extension/dm/templates`, {}, 2500);
            const d = await r.json();
            return d.files || [];
        }
        case 'GET_DM_TEMPLATE': {
            const r = await fetchWithTimeout(`${NODE_SERVER}/api/extension/dm/template?filename=${encodeURIComponent(payload.filename)}`, {}, 2500);
            const d = await r.json();
            if (!d.ok) throw new Error(d.error);
            return d.content;
        }
        case 'GET_MEDIA_FOLDERS': {
            const resp = await fetchWithTimeout(`${NODE_SERVER}/api/media-folders`, {}, 2500);
            const data = await safeJson(resp);
            return data.folders || [{ name: 'feed', path: 'media/feed' }];
        }
        case 'GET_CAPTION_FILES': {
            const resp = await fetchWithTimeout(`${NODE_SERVER}/api/setup-files?category=caption`, {}, 2500);
            const data = await safeJson(resp);
            return data.files || [];
        }
        case 'GET_TEXT_FILES': {
            const resp = await fetchWithTimeout(`${NODE_SERVER}/api/list-files`, {}, 2500);
            const data = await safeJson(resp);
            return data.files || ['caption.txt'];
        }

        case 'START_LIKE': startLike(payload, tabId); return { ok: true };
        case 'STOP_LIKE': stopLike(); return { stopped: true };
        case 'GET_LIKE_STATE': return getLikeState(tabId);

        case 'START_COMMENT': startComment(payload, tabId); return { ok: true };
        case 'STOP_COMMENT': stopComment(); return { stopped: true };
        case 'GET_COMMENT_STATE': return commentState;

        case 'START_AUTODISMISS': {
            const delay = parseInt(payload.delay) || 2000;
            chrome.storage.local.set({ autoDismissRunning: true, autoDismissDelay: delay });
            startAutoDismissLoop(delay);
            return { running: true };
        }
        case 'STOP_AUTODISMISS': {
            chrome.storage.local.set({ autoDismissRunning: false });
            return { running: false };
        }
        case 'GET_SHORTLINK_URLS': {
            const resp = await fetchWithTimeout(`${NODE_SERVER}/api/extension/shortlink-urls`, {}, 8000);
            return await safeJson(resp);
        }
        case 'UPDATE_SHORTLINK_URLS': {
            const resp = await fetch(`${NODE_SERVER}/api/extension/shortlink-urls/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await safeJson(resp);
        }
        case 'START_TASK': {
            const { tool, env, args = [] } = payload;
            const session = await getCookiesAndUa(tabId);
            const formattedSession = session ? {
                _cookies: parseCookiesToArray(session.cookies || ''),
                ua: session.ua || '',
                username: getTabUsername(tabId)
            } : null;
            socket.emit('start-task', { tool, args, env, session: formattedSession });
            return { ok: true };
        }
        case 'STOP_TASK': {
            socket.emit('stop-task');
            return { ok: true };
        }
        case 'GET_LOGS': {
            const username = getTabUsername(tabId);
            const resp = await fetchWithTimeout(`${NODE_SERVER}/api/extension/logs?username=${encodeURIComponent(username)}`, {}, 3000);
            return await safeJson(resp);
        }
        case 'CLEAR_LOGS': {
            const username = getTabUsername(tabId);
            const resp = await fetchWithTimeout(`${NODE_SERVER}/api/extension/logs/clear?username=${encodeURIComponent(username)}`, { method: 'POST' }, 3000);
            return await resp.json();
        }
        case 'UPDATE_DEVICE': return updateDnrRule(payload.deviceKey);
        case 'GET_DEVICES': return DEVICES;

        default: throw new Error(`Unknown message type: ${type}`);
    }
}

async function startAutoDismissLoop(delay) {
    const check = async () => {
        const { autoDismissRunning } = await chrome.storage.local.get(['autoDismissRunning']);
        if (!autoDismissRunning) return;

        try {
            const tabs = await chrome.tabs.query({ url: "*://*.instagram.com/*" });
            for (const tab of tabs) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (d) => {
                        const btns = Array.from(document.querySelectorAll('button'));
                        const dismissBtn = btns.find(b =>
                            b.innerText.toLowerCase().includes('dismiss') ||
                            b.innerText.toLowerCase().includes('not now') ||
                            b.innerText.toLowerCase().includes('lain kali')
                        );
                        if (dismissBtn) {
                            setTimeout(() => dismissBtn.click(), d);
                        }
                    },
                    args: [delay]
                }).catch(() => { });
            }
        } catch (e) { }

        setTimeout(check, 5000);
    };
    check();
}

// =============================================
// DM LOGIC
// =============================================

// DM State is now handled by getDmState(tabId)

function broadcastDmProgress(tabId) {
    const state = getDmState(tabId);
    chrome.runtime.sendMessage({
        type: 'DM_PROGRESS',
        payload: { ...state, tabId }
    }).catch(() => { });
}

async function startDM(tabId, payload) {
    const { uuids, message, delay: delayMs, members, useJeda, jedaThreshold, jedaTime, threadIds, links, mediaFolder } = payload;
    const dmState = getDmState(tabId);
    if (dmState.running) return;

    // Jika threadIds disediakan, kita gunakan itu (Follow-up mode)
    const targets = threadIds && threadIds.length ? threadIds : uuids;
    if (!targets || !targets.length) return;

    const useMedia = !!(mediaFolder && mediaFolder.trim());
    Object.assign(dmState, {
        running: true,
        total: Math.ceil(targets.length / members),
        done: 0,
        success: 0,
        fail: 0,
        status: 'Memulai DM blast...',
        logs: []
    });
    broadcastDmProgress(tabId);

    try {
        const messages = message.split('|').map(m => m.trim()).filter(Boolean);
        let lastDmIdx = -1;
        const getNextDmMessage = () => {
            let idx = Math.floor(Math.random() * messages.length);
            if (messages.length > 1 && idx === lastDmIdx) {
                idx = (idx + 1 + Math.floor(Math.random() * (messages.length - 1))) % messages.length;
            }
            lastDmIdx = idx;
            let text = messages[idx] || '';
            // Spintax support {A|B|C}
            text = text.replace(/\{([^{}]+)\}/g, (_, choices) => {
                const parts = choices.split('|');
                return parts[Math.floor(Math.random() * parts.length)];
            });
            return text;
        };
        let actionsPerformed = 0;

        for (let i = 0; i < targets.length; i += members) {
            if (!dmState.running) break;

            // SISTEM JEDA
            if (useJeda && actionsPerformed >= jedaThreshold) {
                const waitTime = jedaTime * 60 * 1000;
                const resumeAt = Date.now() + waitTime;

                while (Date.now() < resumeAt && dmState.running) {
                    const remainingSec = Math.ceil((resumeAt - Date.now()) / 1000);
                    const remMin = Math.floor(remainingSec / 60);
                    const remSec = remainingSec % 60;
                    dmState.status = `⏸ JEDA ISTIRAHAT... Lanjut dalam ${remMin}:${remSec.toString().padStart(2, '0')}`;
                    broadcastDmProgress(tabId);
                    await new Promise(r => setTimeout(r, 1000));
                }
                if (!dmState.running) break;
                actionsPerformed = 0; // Reset counter after pause
            }

            let chunk = targets.slice(i, i + members);

            // --- AUTO RESOLVE USERNAMES (If targets are not numeric) ---
            if (!threadIds || !threadIds.length) {
                const resolvedChunk = [];
                for (let target of chunk) {
                    if (!/^\d+$/.test(target.trim())) {
                        const uname = target.replace('@', '').trim();
                        dmState.status = `🔍 Resolving @${uname}...`;
                        broadcastDmProgress(tabId);
                        try {
                            const res = await resolveUserId(uname, tabId);
                            if (res && res.userId) resolvedChunk.push(res.userId);
                            else {
                                dmState.fail++;
                                dmState.logs.push(`⚠️ Skip @${uname}: ID tidak ditemukan`);
                            }
                        } catch (e) {
                            dmState.fail++;
                            dmState.logs.push(`❌ Error resolving @${uname}: ${e.message}`);
                        }
                    } else {
                        resolvedChunk.push(target.trim());
                    }
                }
                chunk = resolvedChunk;
            }

            if (chunk.length === 0) {
                dmState.done++;
                broadcastDmProgress(tabId);
                continue;
            }

            let msg = getNextDmMessage();

            // Inject random link jika ada
            if (links && links.length > 0) {
                const randomLink = links[Math.floor(Math.random() * links.length)].trim();
                if (randomLink) msg = msg + '\n' + randomLink;
            }

            dmState.status = `Mengirim ke ${chunk.length} target${useMedia ? ' + media' : ''}...`;

            try {
                const endpoint = useMedia ? '/api/extension/dm/send-with-media' : '/api/extension/dm/send';
                const bodyJson = useMedia ? { mediaFolder } : {};

                if (threadIds && threadIds.length) {
                    for (const tid of chunk) {
                        await apiPost(endpoint, { threadId: tid, message: msg, ...bodyJson }, tabId);
                        actionsPerformed++;
                    }
                } else {
                    await apiPost(endpoint, { uids: chunk, message: msg, ...bodyJson }, tabId);
                    actionsPerformed++;
                }

                dmState.success++;
                dmState.logs.push(`✅ Sukses: ${chunk.length} member${useMedia ? ' 📷' : ''}`);
            } catch (e) {
                const errMsg = e.message || String(e);
                let errCode = 'Error';
                const match = errMsg.match(/\b(400|401|403|404|429|500|502)\b/);
                if (match) errCode = match[1];
                else if (errMsg.includes("feedback_required")) errCode = 'Limit/Block';

                dmState.fail++;
                dmState.logs.push(`❌ Gagal: ${chunk.length} member (${errCode})`);

                if (errMsg.includes("404") || errMsg.includes("feedback_required") || errMsg.includes("challenge")) {
                    logToServer(`🛑 [STOP] DM terdeteksi Block/Limit. Menghentikan proses demi keamanan!`, 'err', tabId);
                    dmState.running = false;
                    break;
                }
            }

            dmState.done++;

            if (dmState.running && (i + members < targets.length)) {
                dmState.status = `Menunggu jeda ${delayMs}ms...`;
                broadcastDmProgress(tabId);
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
    } catch (e) {
        dmState.status = `Error fatal: ${e.message}`;
    } finally {
        dmState.running = false;
        if (!dmState.status.startsWith('Error')) dmState.status = 'Selesai';
        broadcastDmProgress(tabId);
    }
}

async function fetchDmInbox(tabId) {
    try {
        const heads = await Stealth.getHeads(tabId);
        const proxyHeads = {
            'X-IG-App-ID': heads['X-IG-App-ID'] || '936619743392459',
            'X-CSRFToken': heads['X-CSRFToken'] || '',
            'X-Requested-With': 'XMLHttpRequest'
        };

        let allThreads = [];
        let cursor = null;
        let hasMore = true;
        let page = 1;

        while (hasMore && page <= 50) { // Limit 50 pages (approx 1000 threads) to prevent infinite loops/ban
            let url = `https://www.instagram.com/api/v1/direct_v2/inbox/?visual_message_return_type=unseen&thread_message_limit=10&persistent_badging=true&limit=20`;
            if (cursor) url += `&cursor=${cursor}`;

            const proxied = await proxyFetch(url, { method: 'GET', headers: proxyHeads }, tabId);
            if (!proxied.ok || !proxied.json) {
                console.warn('[inbox] Proxy failed at page', page);
                break;
            }

            const items = proxied.json.inbox?.threads || [];
            allThreads = allThreads.concat(items);

            cursor = proxied.json.inbox?.oldest_cursor;
            hasMore = proxied.json.inbox?.has_older && cursor;

            if (hasMore) {
                logToServer(`[Inbox] Memuat halaman ${page} (${allThreads.length} chat)...`, 'info', tabId);
                page++;
                await new Promise(r => setTimeout(r, 800)); // Small safety delay
            }
        }

        const threads = allThreads.map(t => ({
            threadId: t.thread_id,
            threadTitle: t.thread_title,
            users: (t.users || []).map(u => ({ pk: String(u.pk), username: u.username })),
            lastMessage: t.last_permanent_item ? (t.last_permanent_item.text || 'Media/Image') : ''
        }));

        logToServer(`[Inbox] Total ${threads.length} chat berhasil dimuat.`, 'ok', tabId);
        return { ok: true, threads };
    } catch (e) {
        console.error('[inbox] Fetch error:', e);
        return apiPost('/api/extension/dm/inbox', {}, tabId);
    }
}

async function dmScrapeOwn(type, tabId) {
    return apiPost('/api/extension/dm/scrape-own', { type }, tabId);
}


function parseCookiesToArray(cookieStr) {
    if (!cookieStr) return [];
    return cookieStr.split(';').map(pair => {
        const [name, ...rest] = pair.trim().split('=');
        if (!name) return null;
        return {
            name: name.trim(),
            value: rest.join('=').trim(),
            domain: '.instagram.com',
            path: '/',
            secure: true,
            httpOnly: false
        };
    }).filter(c => c && c.name && c.value);
}

// ---- HELPERS ----
function helperExtractShortcode(input) {
    if (!input) return null;
    const match = input.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reels|tv)\/([^\/?#&]+)/);
    return match ? match[1] : input.trim();
}

// ---- LIKE RUNNER ----
let likeState = {
    running: false, done: 0, total: 0, success: 0, fail: 0, skip: 0, status: '', logs: []
};
function getLikeState(tabId) { return likeState; }
function stopLike() { likeState.running = false; likeState.status = '🛑 Dimatikan paksa.'; }

async function startLike(payload, tabId) {
    const { mode, targets, delay, limit, useJeda, jedaThreshold, jedaTime } = payload;
    likeState = { running: true, total: targets.length, done: 0, success: 0, fail: 0, skip: 0, status: '🚀 Memulai Like Runner...', logs: [`🚀 Memulai Task Like [Mode: ${mode}]`] };
    const session = await getSession(tabId);
    if (!session || !session.loggedIn) { likeState.running = false; likeState.status = '❌ Error: Sesi tidak ditemukan'; return; }
    let actionsPerformed = 0;
    for (const target of targets) {
        if (!likeState.running) break;
        likeState.done++;
        likeState.status = `⚙️ Memproses ${likeState.done} dari ${likeState.total}...`;
        try {
            if (mode === 'post') {
                const res = await apiPost('/api/extension/like/post', { target }, tabId);
                if (res.ok) {
                    likeState.success++; actionsPerformed++;
                    likeState.status = `✅ Sukses Like Post @${target}`;
                    likeState.logs.push(`✅ [Post] @${target}: SUKSES`);
                } else if (res.error?.includes('Private') || res.error === 'NO_POSTS') {
                    likeState.skip++;
                    likeState.status = `⚠️ Skip @${target}: Private/No Post`;
                    likeState.logs.push(`⚠️ [Post] @${target}: Skip`);
                } else {
                    likeState.fail++;
                    likeState.logs.push(`❌ [Post] @${target}: Gagal (${res.error})`);
                }
            } else {
                const shortcode = helperExtractShortcode(target);
                likeState.status = `💬 Loading komentar [${shortcode}]...`;
                const cRes = await apiPost('/api/extension/media/comments', { shortcode, limit }, tabId);
                if (cRes.ok && cRes.comments) {
                    let cDone = 0; const usedPks = new Set();
                    for (const comment of cRes.comments) {
                        if (!likeState.running) break;
                        const senderPk = String(comment.user_id || comment.user?.pk);
                        if (usedPks.has(senderPk)) continue;
                        usedPks.add(senderPk);
                        likeState.status = `❤️ Menyukai komen ${cDone + 1}/${cRes.comments.length}...`;
                        const lRes = await apiPost('/api/extension/like/comment', { commentId: comment.pk }, tabId);
                        if (lRes.ok) {
                            likeState.success++; actionsPerformed++; cDone++;
                            likeState.status = `⚙️ Menyukai komentar... (${cDone}/${cRes.comments.length})`;
                            likeState.logs.push(`✅ [Like Comment] [${shortcode}] @${comment.user.username}: SUKSES`);
                        } else {
                            likeState.fail++;
                            likeState.logs.push(`❌ [Like Comment] [${shortcode}] @${comment.user.username}: GAGAL`);
                        }
                        if (useJeda && actionsPerformed >= jedaThreshold) {
                            for (let m = jedaTime; m > 0; m--) {
                                for (let s = 59; s >= 0; s--) {
                                    if (!likeState.running) break;
                                    likeState.status = `⏸ JEDA... ${m - 1}:${s < 10 ? '0' + s : s}`;
                                    await new Promise(r => setTimeout(r, 1000));
                                }
                                if (!likeState.running) break;
                            }
                            actionsPerformed = 0;
                        } else { await new Promise(r => setTimeout(r, delay + Math.random() * 500)); }
                    }
                    likeState.status = `⚙️ Selesai media [${shortcode}]`;
                    likeState.logs.push(`📊 [Summary] [${shortcode}]: ${cDone} Like SELESAI`);
                } else {
                    likeState.fail++; likeState.logs.push(`❌ [Like Comment] [${shortcode}]: Gagal load`);
                }
            }
        } catch (e) { likeState.fail++; likeState.logs.push(`❌ Error: ${e.message}`); }
        if (likeState.running && likeState.done < likeState.total) await new Promise(r => setTimeout(r, delay));
    }
    likeState.running = false;
    likeState.status = `✅ Selesai! [${likeState.success} Like Total]`;
}

// 💬 COMMENT RUNNER
let commentState = { running: false, success: 0, fail: 0, skip: 0, done: 0, total: 0, status: '', logs: [] };
function stopComment() { commentState.running = false; commentState.status = '🛑 Dimatikan paksa.'; }

async function startComment(config, tabId) {
    if (commentState.running) return;
    const { mode, targets, template, delay, limit, timeVal, timeMode, useJeda, jedaThreshold, jedaTime } = config;
    commentState = { running: true, success: 0, fail: 0, skip: 0, done: 0, total: targets.length, status: '🚀 Memulai Comment Runner...', logs: [`🚀 Memulai Task Comment [Mode: ${mode}]`] };
    try {
        const tReq = await fetch(`${NODE_SERVER}/api/extension/setup-file/comment?filename=${template}`).then(r => r.json());
        if (!tReq.ok) throw new Error('Gagal ambil file template.');
        // Split HANYA berdasarkan tanda pipa agar Baris Baru (Enter) tetap terjaga di dalam teks
        const allParts = tReq.content.split('|').map(p => p.trim()).filter(p => p.length > 0);
        if (!allParts.length) throw new Error('File template tidak memiliki teks yang valid.');

        // --- LOGIKA MURNI RANDOM (ACAK) ---
        let lastCommentIndex = -1;
        const getNextMessage = () => {
            let idx = Math.floor(Math.random() * allParts.length);
            // Hindari teks yang persis sama 2x berturut-turut jika template punya > 1 variasi
            if (allParts.length > 1 && idx === lastCommentIndex) {
                idx = (idx + 1 + Math.floor(Math.random() * (allParts.length - 1))) % allParts.length;
            }
            lastCommentIndex = idx;
            let text = allParts[idx];
            // Dukungan format Spintax {kata1|kata2|kata3} jika ada di dalam teks
            text = text.replace(/\{([^{}]+)\}/g, (_, choices) => {
                const parts = choices.split('|');
                return parts[Math.floor(Math.random() * parts.length)];
            });
            return text;
        };

        let actionsPerformed = 0;
        for (const target of targets) {
            if (!commentState.running) break;
            commentState.done++;
            try {
                if (mode === 'post') {
                    commentState.status = `🔍 Mengecek @${target}...`;
                    const res = await apiPost('/api/extension/user/feed', { target }, tabId);
                    if (res.ok && res.items?.length) {
                        // Urutkan postingan berdasarkan waktu upload asli (taken_at) secara descending (terbaru di paling depan)
                        // agar Pin Post jadul tidak menempati urutan pertama
                        const sortedItems = [...res.items].sort((a, b) => (b.taken_at || 0) - (a.taken_at || 0));
                        const post = sortedItems[0];
                        const diffMs = Date.now() - (post.taken_at * 1000);
                        const ago = Math.floor(diffMs / 60000);
                        const agoTxt = ago > 60 ? `${Math.floor(ago / 60)} jam` : `${ago} menit`;
                        let isTimeOk = false;

                        if (timeMode === 'off') {
                            isTimeOk = true; // No filter
                        } else if (timeMode === 'hours') {
                            const diffHours = Math.floor(diffMs / 3600000);
                            isTimeOk = diffHours <= timeVal;
                        } else {
                            const diffMins = Math.floor(diffMs / 60000);
                            isTimeOk = diffMins <= timeVal;
                        }

                        if (isTimeOk) {
                            const commentTargetCount = Math.max(1, limit || 1);
                            for (let cIdx = 0; cIdx < commentTargetCount; cIdx++) {
                                if (!commentState.running) break;
                                const msgText = getNextMessage();
                                const quotaTxt = commentTargetCount > 1 ? ` (${cIdx + 1}/${commentTargetCount})` : '';
                                commentState.status = `💬 Mengirim komen${quotaTxt} ke @${target}...`;
                                const cRes = await apiPost('/api/extension/media/comment', { mediaId: post.pk, text: msgText }, tabId);
                                if (cRes.ok) {
                                    commentState.success++; actionsPerformed++;
                                    commentState.status = `✅ Sukses Komen${quotaTxt} @${target}`;
                                    commentState.logs.push(`✅ [Comment] @${target}${quotaTxt}: SUKSES (${agoTxt} yl)`);
                                } else {
                                    commentState.fail++; commentState.logs.push(`❌ [Comment] @${target}${quotaTxt}: Gagal (${cRes.error})`);
                                    break; // Hentikan loop di post ini jika terjadi rate-limit/error
                                }
                                if (commentState.running && useJeda && actionsPerformed >= jedaThreshold) {
                                    const waitMs = jedaTime * 60000;
                                    const endTime = Date.now() + waitMs;
                                    while (Date.now() < endTime && commentState.running) {
                                        const remaining = Math.ceil((endTime - Date.now()) / 1000);
                                        commentState.status = `☕ Jeda (${remaining}s)...`;
                                        await new Promise(r => setTimeout(r, 1000));
                                    }
                                    actionsPerformed = 0;
                                } else if (commentState.running && cIdx < commentTargetCount - 1) {
                                    await new Promise(r => setTimeout(r, delay));
                                }
                            }
                        } else {
                            commentState.skip++;
                            commentState.status = `⚠️ Skip @${target} (${agoTxt} yl)`;
                            commentState.logs.push(`⚠️ [Skip] @${target}: Post ${agoTxt} yl`);
                        }
                    } else { commentState.skip++; commentState.logs.push(`⚠️ [Skip] @${target}: Kosong/Private`); }
                } else {
                    const shortcode = helperExtractShortcode(target);
                    commentState.status = `💬 Memuat komentar [${shortcode}]...`;
                    const cRes = await apiPost('/api/extension/media/comments', { shortcode, limit }, tabId);
                    if (cRes.ok && cRes.comments && cRes.comments.length > 0) {
                        // Ambil mediaId dari komentar pertama atau dari mediaIdFromShortcode
                        const resolvedMediaId = cRes.mediaId || (cRes.comments[0] && (cRes.comments[0].media_id || cRes.comments[0].media_pk));
                        let rDone = 0;

                        // --- ANTI FLOOD: Pastikan 1 User hanya dibalas 1x per postingan ---
                        const repliedUsers = new Set();

                        for (const comment of cRes.comments) {
                            if (!commentState.running) break;

                            const commenterId = comment.user_id || (comment.user && comment.user.pk);
                            if (repliedUsers.has(String(commenterId))) {
                                commentState.skip++;
                                commentState.logs.push(`⏭️ [Skip Reply] @${comment.user.username}: Sudah dibalas`);
                                continue;
                            }

                            const msgText = getNextMessage();
                            if (!msgText) { commentState.skip++; continue; }

                            const usedMediaId = resolvedMediaId || comment.media_id || comment.media_pk;
                            commentState.status = `💬 Membalas @${comment.user.username} (${rDone + 1})...`;
                            const rRes = await apiPost('/api/extension/media/comment', { mediaId: usedMediaId, text: msgText, replyToCommentId: comment.pk }, tabId);
                            if (rRes.ok) {
                                commentState.success++; actionsPerformed++; rDone++;
                                repliedUsers.add(String(commenterId));
                                commentState.logs.push(`✅ [Reply] @${comment.user.username}: SUKSES`);
                            } else {
                                commentState.fail++; commentState.logs.push(`❌ [Reply] @${comment.user.username}: ${rRes.error || 'Gagal'}`);
                            }
                            if (commentState.running) await new Promise(r => setTimeout(r, delay + Math.random() * 2000));
                        }
                    } else { commentState.fail++; commentState.logs.push(`❌ [Reply] [${target}]: Gagal load / Tidak ada komentar`); }
                }
            } catch (err) { commentState.fail++; commentState.logs.push(`❌ Error: ${err.message}`); }
            if (commentState.running && useJeda && actionsPerformed >= jedaThreshold) {
                const waitMs = jedaTime * 60000;
                const endTime = Date.now() + waitMs;
                while (Date.now() < endTime && commentState.running) {
                    const remaining = Math.ceil((endTime - Date.now()) / 1000);
                    commentState.status = `☕ Jeda (${remaining}s)...`;
                    await new Promise(r => setTimeout(r, 1000));
                }
                actionsPerformed = 0; // Reset counter after pause
            }
            if (commentState.running && commentState.done < commentState.total && mode === 'post') await new Promise(r => setTimeout(r, delay));
        }
    } catch (e) { commentState.fail++; commentState.logs.push(`❌ Fatal: ${e.message}`); }
    finally { commentState.running = false; commentState.status = `✅ Selesai! [${commentState.success} Sukses]`; }
}
