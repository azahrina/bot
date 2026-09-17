// content.js - Injected into instagram.com pages
// Reads Instagram session data and relays to background service worker

(function () {
  'use strict';

  // Read cookies from document.cookie (accessible in Session Box containers)
  function parseCookies() {
    const cookies = {};
    document.cookie.split(';').forEach(pair => {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        const key = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        cookies[key] = val;
      }
    });
    return cookies;
  }

  // Try to get shared_data from window object (Instagram loads this)
  function getSharedData() {
    try {
      return window.__additionalData || window._sharedData || null;
    } catch {
      return null;
    }
  }

  // Read Instagram session info
  function getSessionData() {
    const cookies = parseCookies();
    const sharedData = getSharedData();

    return {
      sessionid: cookies['sessionid'] || null,
      csrftoken: cookies['csrftoken'] || null,
      ds_user_id: cookies['ds_user_id'] || null,
      mid: cookies['mid'] || null,
      // Try to get username from page if available
      username: (() => {
        try {
          const metaEl = document.querySelector('meta[name="description"]');
          const profileLink = document.querySelector('a[href*="/accounts/"]');
          return null;
        } catch { return null; }
      })(),
      url: window.location.href,
      source: 'content_script'
    };
  }

  // Listen for requests from background/popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_SESSION_DATA') {
      sendResponse(getSessionData());
    } else if (message.type === 'PROXY_FETCH') {
      const { url, options } = message.payload;
      fetch(url, Object.assign({ credentials: 'include' }, options || {}))
        .then(async r => {
          const contentType = r.headers.get('content-type') || '';
          let body;
          try {
            if (contentType.includes('application/json')) body = await r.json();
            else body = await r.text();
          } catch (e) {
            body = await r.text();
          }
          sendResponse({
            success: true,
            ok: r.ok,
            status: r.status,
            json: body,
            text: typeof body === 'string' ? body : JSON.stringify(body)
          });
        })
        .catch(err => sendResponse({ success: false, ok: false, error: err.message }));
      return true;
    }
    return true;
  });

  // Auto-send session data when page loads (for Session Box sessions)
  const sessionData = getSessionData();
  if (sessionData.sessionid) {
    chrome.runtime.sendMessage({
      type: 'SESSION_DATA_FROM_PAGE',
      payload: sessionData
    }).catch(() => { }); // Ignore if background not ready
  }

})();
