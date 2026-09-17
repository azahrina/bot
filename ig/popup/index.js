const toolsDesc = document.getElementById('tools-desc');
const mobileIdToggle = document.getElementById('mobile-id-toggle');
const toolsBtn = document.getElementById('btn-tools');
const toolsLock = document.getElementById('tools-lock');
const appMainView = document.getElementById('app-main-view');

const NODE_SERVER = 'http://127.0.0.1:7500';

function updateToolsState(enabled) {
    if (toolsLock) toolsLock.style.display = 'none';
    if (toolsBtn) toolsBtn.classList.add('active');
    if (toolsDesc) toolsDesc.textContent = 'Buka panel otomasi';
}

updateToolsState(true);
chrome.runtime.sendMessage({ type: 'REFRESH_STATUS' });

// Initial Sync
chrome.runtime.sendMessage({ type: 'GET_UA_STATE' }, (response) => {
    if (chrome.runtime.lastError) return;
    const enabled = (response && response.success && response.data && response.data.enabled !== undefined) ? !!response.data.enabled : true;
    mobileIdToggle.checked = enabled;
    updateToolsState(true);
});

// Toggle Listener
mobileIdToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    const device = enabled ? 'samsung_s23' : 'none';
    chrome.runtime.sendMessage({ type: 'TOGGLE_MOBILE_UA', payload: { enabled, device } }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response && response.success) {
            updateToolsState(enabled);
            // Reload the active tab if it's Instagram to apply the new UA immediately
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('instagram.com')) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        }
    });
});

const floatingIconToggle = document.getElementById('floating-icon-toggle');
chrome.storage.local.get(['showFloatingIcon'], (res) => {
    floatingIconToggle.checked = res.showFloatingIcon !== false;
});
floatingIconToggle.addEventListener('change', (e) => {
    const show = e.target.checked;
    chrome.storage.local.set({ showFloatingIcon: show }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes('instagram.com')) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_FLOATING_ICON', show }, () => {
                    if (chrome.runtime.lastError) { /* ignore */ }
                });
            }
        });
    });
});

document.getElementById('btn-clear').addEventListener('click', () => {
    const btn = document.getElementById('btn-clear');
    btn.disabled = true;
    btn.classList.add('active');

    const label = btn.querySelector('.label');
    const oldText = label.textContent;
    label.textContent = 'CLEANING...';

    chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, (response) => {
        if (chrome.runtime.lastError) {
            btn.disabled = false;
            btn.classList.remove('active');
            label.textContent = oldText;
            return;
        }
        if (response && response.success) {
            // Reload the active tab if it's Instagram
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('instagram.com')) {
                    chrome.tabs.reload(tabs[0].id);
                }
                setTimeout(() => {
                    btn.classList.remove('active');
                    window.close();
                }, 500);
            });
        } else {
            btn.disabled = false;
            btn.classList.remove('active');
            label.textContent = oldText;
            alert('Gagal membersihkan data: ' + (response ? response.error : 'Unknown error'));
        }
    });
});

toolsBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('instagram.com')) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_PANEL' }, () => {
                if (chrome.runtime.lastError) { /* ignore */ }
            });
            window.close();
        } else {
            alert('Silakan buka tab Instagram terlebih dahulu!');
        }
    });
});

function navSyncToUrl(targetUrl) {
    if (!targetUrl) return;
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        tabs.forEach(tab => {
            chrome.tabs.update(tab.id, { url: targetUrl });
        });
        window.close();
    });
}

// Mass Tab Navigator Logic
document.getElementById('btn-nav-sync').addEventListener('click', () => {
    let targetUrl = document.getElementById('nav-sync-input').value.trim();
    if (!targetUrl) return alert('Masukkan link tujuan!');
    navSyncToUrl(targetUrl);
});

// ====================================================
// QUICK URL BUTTONS (PERSISTENCE & SHORTCUTS)
// ====================================================
const DEFAULT_QUICK_URLS = [
    { id: '1', name: 'Edit Profil', url: 'https://www.instagram.com/accounts/edit/' },
    { id: '2', name: 'Direct DM', url: 'https://www.instagram.com/direct/inbox/' },
    { id: '3', name: 'Explore', url: 'https://www.instagram.com/explore/' }
];

const quickChipsContainer = document.getElementById('quick-url-chips');
const quickUrlForm = document.getElementById('quick-url-form');
const btnToggleAddUrl = document.getElementById('btn-toggle-add-url');
const btnSaveQuickUrl = document.getElementById('btn-save-quick-url');
const btnCancelQuickUrl = document.getElementById('btn-cancel-quick-url');
const inpQuickName = document.getElementById('inp-quick-name');
const inpQuickUrl = document.getElementById('inp-quick-url');

function loadQuickUrls() {
    chrome.storage.local.get(['quick_urls'], (res) => {
        let urls = res.quick_urls;
        if (!urls || !Array.isArray(urls)) {
            urls = DEFAULT_QUICK_URLS;
            chrome.storage.local.set({ quick_urls: urls });
        }
        renderQuickUrlChips(urls);
    });
}

function renderQuickUrlChips(urls) {
    if (!quickChipsContainer) return;
    quickChipsContainer.innerHTML = '';

    if (urls.length === 0) {
        quickChipsContainer.innerHTML = '<span style="font-size:9px; color:#94a3b8; font-style:italic;">Belum ada tombol cepat. Klik + Tambah</span>';
        return;
    }

    urls.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'quick-chip';
        chip.title = `Buka: ${item.url}`;
        chip.innerHTML = `
            <span class="chip-name">${item.name}</span>
            <span class="chip-del" title="Hapus tombol">×</span>
        `;

        chip.addEventListener('click', () => {
            document.getElementById('nav-sync-input').value = item.url;
            navSyncToUrl(item.url);
        });

        const delBtn = chip.querySelector('.chip-del');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeQuickUrl(item.id);
        });

        quickChipsContainer.appendChild(chip);
    });
}

function removeQuickUrl(id) {
    chrome.storage.local.get(['quick_urls'], (res) => {
        let urls = (res.quick_urls || DEFAULT_QUICK_URLS).filter(u => u.id !== id);
        chrome.storage.local.set({ quick_urls: urls }, () => {
            renderQuickUrlChips(urls);
        });
    });
}

btnToggleAddUrl?.addEventListener('click', () => {
    const isHidden = quickUrlForm.style.display === 'none';
    quickUrlForm.style.display = isHidden ? 'block' : 'none';
    btnToggleAddUrl.textContent = isHidden ? '✕ Tutup' : '+ Tambah';
    if (isHidden) inpQuickName.focus();
});

btnCancelQuickUrl?.addEventListener('click', () => {
    quickUrlForm.style.display = 'none';
    btnToggleAddUrl.textContent = '+ Tambah';
    inpQuickName.value = '';
    inpQuickUrl.value = '';
});

btnSaveQuickUrl?.addEventListener('click', () => {
    const name = inpQuickName.value.trim();
    let url = inpQuickUrl.value.trim();
    if (!name || !url) return alert('Silakan isi Nama dan URL tombol cepat!');

    if (!url.startsWith('http')) url = 'https://' + url;

    chrome.storage.local.get(['quick_urls'], (res) => {
        const urls = res.quick_urls || DEFAULT_QUICK_URLS;
        const newItem = { id: Date.now().toString(), name, url };
        urls.push(newItem);

        chrome.storage.local.set({ quick_urls: urls }, () => {
            renderQuickUrlChips(urls);
            quickUrlForm.style.display = 'none';
            btnToggleAddUrl.textContent = '+ Tambah';
            inpQuickName.value = '';
            inpQuickUrl.value = '';
        });
    });
});

loadQuickUrls();

// ====================================================
// PANEL FEATURE VISIBILITY (HIDE / SHOW MENU)
// ====================================================
const ALL_PANEL_FEATURES = [
    { id: 'scraper', label: '🔍 Scraper' },
    { id: 'dm', label: '✉️ DM' },
    { id: 'ocypus', label: '🚀 Follow' },
    { id: 'story', label: '📖 Story' },
    { id: 'viewstory', label: '👁️ View Story' },
    { id: 'shortlink', label: '🔗 Link' },
    { id: 'like', label: '❤️ Like' },
    { id: 'comment', label: '💬 Comment' },
    { id: 'autosetup', label: '⚙️ Auto' },
    { id: 'feed', label: '🖼️ Feed' },
    { id: 'profile', label: '👤 Profil' },
    { id: 'logs', label: '🖥️ Logs' }
];

const btnToggleFeatures = document.getElementById('btn-toggle-features');
const btnCloseFeatures = document.getElementById('btn-close-features');
const featuresContainer = document.getElementById('features-edit-container');
const featuresGrid = document.getElementById('features-checkbox-grid');
const btnSelectAllFeatures = document.getElementById('btn-select-all-features');
const btnResetFeatures = document.getElementById('btn-reset-features');

function loadPanelFeatures() {
    chrome.storage.local.get(['hidden_panel_tabs'], (res) => {
        const hiddenTabs = res.hidden_panel_tabs || [];
        renderFeaturesCheckboxes(hiddenTabs);
    });
}

function renderFeaturesCheckboxes(hiddenTabs) {
    if (!featuresGrid) return;
    featuresGrid.innerHTML = '';

    ALL_PANEL_FEATURES.forEach(feat => {
        const item = document.createElement('label');
        item.className = 'feature-item';
        const isVisible = !hiddenTabs.includes(feat.id);

        item.innerHTML = `
            <input type="checkbox" data-feat-id="${feat.id}" ${isVisible ? 'checked' : ''}>
            <span>${feat.label}</span>
        `;

        const cb = item.querySelector('input');
        cb.addEventListener('change', () => {
            saveFeatureVisibility();
        });

        featuresGrid.appendChild(item);
    });
}

function saveFeatureVisibility() {
    const checkboxes = featuresGrid.querySelectorAll('input[type="checkbox"]');
    const hiddenTabs = [];

    checkboxes.forEach(cb => {
        if (!cb.checked) {
            hiddenTabs.push(cb.getAttribute('data-feat-id'));
        }
    });

    // Save to persistence
    chrome.storage.local.set({ hidden_panel_tabs: hiddenTabs }, () => {
        // Broadcast directly to all tabs for instant response
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_PANEL_TABS', hiddenTabs }, () => {
                    if (chrome.runtime.lastError) { /* ignore */ }
                });
            });
        });
    });
}

btnSelectAllFeatures?.addEventListener('click', () => {
    const checkboxes = featuresGrid.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    saveFeatureVisibility();
});

btnResetFeatures?.addEventListener('click', () => {
    chrome.storage.local.remove(['hidden_panel_tabs'], () => {
        loadPanelFeatures();
        // Broadcast reset
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_PANEL_TABS', hiddenTabs: [] }, () => {
                    if (chrome.runtime.lastError) { /* ignore */ }
                });
            });
        });
    });
});

btnToggleFeatures?.addEventListener('click', () => {
    const isShowing = featuresContainer.style.display === 'block';
    featuresContainer.style.display = isShowing ? 'none' : 'block';
    if (!isShowing) {
        presetContainer.style.display = 'none';
        loadPanelFeatures();
    }
});

btnCloseFeatures?.addEventListener('click', () => {
    featuresContainer.style.display = 'none';
});

// PRESET EDIT LOGIC
const btnTogglePreset = document.getElementById('btn-toggle-preset');
const btnClosePreset = document.getElementById('btn-close-preset');
const presetContainer = document.getElementById('preset-edit-container');
const btnSavePresets = document.getElementById('btn-save-presets');

btnTogglePreset?.addEventListener('click', () => {
    featuresContainer.style.display = 'none';
    // Fetch current presets before showing
    chrome.runtime.sendMessage({ type: 'GET_SHORTLINK_URLS' }, (response) => {
        if (chrome.runtime.lastError) {
            alert('Gagal mengambil data dari server. Pastikan server lokal sudah jalan.');
            return;
        }
        if (response && response.success && response.data) {
            const data = response.data;
            document.getElementById('inp-imo').value = data.imo || '';
            document.getElementById('inp-clickdealer').value = data.clickdealer || '';
            document.getElementById('inp-trafee').value = data.trafee || '';

            presetContainer.style.display = 'block';
        } else {
            alert('Gagal mengambil data dari server. Pastikan server lokal sudah jalan.');
        }
    });
});

btnClosePreset?.addEventListener('click', () => {
    presetContainer.style.display = 'none';
});

btnSavePresets?.addEventListener('click', () => {
    const payload = {
        imo: document.getElementById('inp-imo').value.trim(),
        clickdealer: document.getElementById('inp-clickdealer').value.trim(),
        trafee: document.getElementById('inp-trafee').value.trim()
    };

    if (!payload.imo || !payload.clickdealer || !payload.trafee) {
        return alert('Semua URL harus diisi!');
    }

    btnSavePresets.disabled = true;
    btnSavePresets.textContent = 'Menyimpan...';

    chrome.runtime.sendMessage({ type: 'UPDATE_SHORTLINK_URLS', payload }, (response) => {
        btnSavePresets.disabled = false;
        btnSavePresets.textContent = 'Simpan Perubahan';

        if (chrome.runtime.lastError) {
            alert('Gagal menyimpan: Hubungan ke server terputus.');
            return;
        }

        if (response && response.success) {
            alert('Preset berhasil diperbarui! ✨');
            presetContainer.style.display = 'none';
        } else {
            alert('Gagal menyimpan: ' + (response ? response.error : 'Unknown error'));
        }
    });
});
