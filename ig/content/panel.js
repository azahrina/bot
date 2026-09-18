// ============================================================
// content/panel.js — Floating Panel v3.2
// Story: draggable pill, font-from-server, working color pickers
// ============================================================

(function () {
  if (document.getElementById('ig-tools-host')) return;

  const NODE_SERVER = 'http://127.0.0.1:7500';
  const host = document.createElement('div');
  host.id = 'ig-tools-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;pointer-events:none;';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :host, #panel, #panel * { color-scheme: light !important; }

    #toggle-btn {
        position:fixed; bottom:80px; left:24px; width:50px; height:50px;
        background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);
        border-radius:50%; display:flex; align-items:center; justify-content:center;
        cursor:pointer; pointer-events:all;
        box-shadow:0 4px 20px rgba(131,58,180,.45);
        transition:transform .2s,box-shadow .2s; z-index:2147483647;
    }
    #toggle-btn:hover { transform:scale(1.1); box-shadow:0 6px 28px rgba(131,58,180,.65); }
    #toggle-btn svg { width:24px; height:24px; fill:white; }

    #panel {
        position:fixed; top:60px; left:20px; width:min(460px, 95vw);
        max-height:calc(100vh - 80px);
        background:#ffffff; border:1px solid #e8e8e8;
        border-radius:18px;
        box-shadow:0 8px 40px rgba(0,0,0,.15),0 2px 8px rgba(0,0,0,.08);
        display:none; flex-direction:column; overflow:hidden;
        pointer-events:all; font-family:'Inter',system-ui,sans-serif;
        color:#1a1a1a; z-index:2147483647;
        color-scheme: light !important;
    }
    @media (max-width: 480px) {
        #panel { left: 4vw; top: 10px; width: 92vw; max-width: 420px; max-height: calc(100vh - 40px); max-height: calc(100dvh - 20px); border-radius: 10px; }
        .panel-header { padding: 6px 10px; }
        .panel-title { font-size: 12px; }
        .panel-title span { font-size: 8px; }
        .tabs { width: 52px; }
        .tab { font-size: 7.5px; font-weight: 800; padding: 8px 1px; gap: 1px; }
        .tab-icon { font-size: 14px; }
        .tab-content { padding: 8px 6px; gap: 6px; }
        .card { padding: 6px; }
        .sect { font-size: 7px; margin-bottom: 3px; }
        
        /* Adjust density for mobile */
        label { font-size: 9px; margin-bottom: 2px; }
        input, select, textarea { font-size: 10px; padding: 4px 6px; border-radius: 6px; }
        .btn { padding: 7px 10px; font-size: 10px; border-radius: 8px; }

        /* Story/DM/Follow side-by-side adjustment - Stack vertically on mobile */
        .story-flex-container, .dm-flex-container, .follow-flex-container { flex-direction: column; align-items: stretch; gap: 10px; }
        .story-preview-side { display: flex; flex-direction: column; align-items: center; width: 100%; }
        .dm-side, .follow-side { display: flex; flex-direction: column; align-items: stretch; width: 100%; }
        .story-preview-outer { height: 180px !important; margin-bottom: 5px; }
        .story-controls-side { width: 100%; }

        .upload-zone { padding: 10px; min-height: 40px; font-size: 9px; }
        .upload-zone svg { width: 20px; height: 20px; }

        .session-bar { padding: 4px 8px; gap: 4px; }
        .session-info { font-size: 9px; min-width: 120px; }
        .btn-sm-txt { font-size: 9px; padding: 2px 5px; }
        
        .stat-num { font-size: 14px; }
        .stat-label { font-size: 7px; }
        .stat-card { padding: 6px 2px; }
    }
    #panel.visible { display:flex; }

    .panel-header {
        background:linear-gradient(135deg,#1e1e1c 0%,#833ab4 55%,#1e1e1c 100%);
        padding:13px 16px; display:flex; align-items:center; gap:10px;
        cursor:move; user-select:none; flex-shrink:0;
    }
    .panel-logo { width:30px; height:30px; background:rgba(255,255,255,.25); border-radius:8px; display:flex; align-items:center; justify-content:center; }
    .panel-logo svg { width:17px; height:17px; fill:white; }
    .panel-title { font-weight:800; font-size:16px; flex:1; color:white; letter-spacing:-0.3px; }
    .panel-title span { font-size:11px; font-weight:700; color:rgba(255,255,255,.85); margin-left:6px; }
    .btn-close { width:26px; height:26px; background:rgba(255,255,255,.2); border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:white; font-size:15px; transition:background .15s; }
    .btn-close:hover { background:rgba(255,255,255,.35); }

    .session-bar { background:#f8f8f8; padding:7px 14px; display:flex; align-items:center; gap:8px; border-bottom:1px solid #efefef; flex-shrink:0; flex-wrap:wrap; }
    .session-dot { width:8px; height:8px; border-radius:50%; background:#ccc; flex-shrink:0; }
    .session-dot.ok { background:#22c55e; box-shadow:0 0 6px #22c55e88; }
    .session-dot.err { background:#ef4444; }
    .session-info { font-size:11px; color:#888; flex:1; min-width:180px; }
    .session-info strong { color:#333; }
    .btn-sm-txt { font-size:10px; background:white; border:1px solid #ddd; border-radius:5px; color:#888; padding:3px 8px; cursor:pointer; }

    .panel-body { display:flex; flex:1; overflow:hidden; min-height:0; }

    .tabs {
        display:flex; flex-direction:column; background:#fafafc;
        border-right:1px solid #f0f0f4; flex-shrink:0; width:68px;
        overflow-y:auto; scrollbar-width:none; -ms-overflow-style:none;
        padding:8px 5px 12px 5px; gap:4px;
    }
    .tabs::-webkit-scrollbar { display:none; }
    .tab {
        padding:7px 3px 6px 3px; text-align:center; font-size:8.5px; font-weight:700;
        color:#64748b; cursor:pointer; transition:all .18s ease;
        border-radius:12px; white-space:nowrap;
        text-transform:uppercase; letter-spacing:0.2px;
        display:flex; flex-direction:column; align-items:center; gap:4px;
        min-height: 46px; justify-content: center; box-sizing:border-box;
        border:1px solid transparent;
    }
    .tab:hover { color:#833ab4; background:#f1f0f7; }
    .tab.active {
        color:#7c3aed;
        background:linear-gradient(180deg,#ede9fe 0%,#e0e7ff 100%);
        border-color:#ddd6fe;
        box-shadow:0 2px 8px rgba(124,58,237,0.12);
        font-weight:800;
    }
    .tab-icon {
        width:20px; height:20px; display:flex; align-items:center; justify-content:center;
        flex-shrink:0;
    }
    .tab-icon svg {
        width:19px; height:19px; stroke:currentColor; stroke-width:1.9;
        fill:none; stroke-linecap:round; stroke-linejoin:round; transition:stroke .18s;
    }

    .tab-content-container { flex:1; display:flex; flex-direction:column; overflow:hidden; background:#fff; min-height:0; position:relative; }
    .tab-content { display:none; flex-direction:column; flex:1; overflow-y:auto; padding:12px; gap:8px; min-height:0; }
    .tab-content.active { display:flex; }
    .tab-content::-webkit-scrollbar { width:4px; }
    .tab-content::-webkit-scrollbar-thumb { background:#ddd; border-radius:2px; }

    label, .dm-label { font-size:11px; font-weight:600; color:#1f2937; margin-bottom:4px; display:block; }
    .dm-help { font-size:9px; color:#4b5563; margin-top:5px; }
    input, select, textarea {
        width:100%; background:#f9f9f9; border:1.5px solid #ebebeb;
        border-radius:9px; color:#1a1a1a; font-size:12px; font-family:inherit;
        padding:7px 10px; transition:border-color .15s; outline:none;
    }
    input:focus, select:focus, textarea:focus { border-color:#a855f7; background:#fff; }
    textarea { resize:vertical; min-height:55px; }
    select option { background:#fff; color:#1a1a1a; }
    .input-row { display:flex; gap:7px; }
    .input-row > * { flex:1; }

    .btn { padding:9px 14px; border-radius:10px; font-size:12px; font-weight:600; font-family:inherit; cursor:pointer; border:none; transition:all .18s; display:flex; align-items:center; justify-content:center; gap:6px; }
    .btn-primary { background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045); background-size:200% 200%; color:white; box-shadow:0 2px 12px rgba(131,58,180,.3); }
    .btn-primary:hover { box-shadow:0 4px 18px rgba(131,58,180,.45); transform:translateY(-1px); }
    .btn-secondary { background:#f5f5f5; color:#555; border:1.5px solid #e8e8e8; }
    .btn-secondary:hover { background:#eee; }
    .btn-secondary.active { background:linear-gradient(135deg,#833ab4,#fd1d1d); color:white; border-color:transparent; font-weight:700; box-shadow:0 2px 10px rgba(131,58,180,.35); }
    .btn-danger { background:#fff0f0; color:#e53e3e; border:1.5px solid #fcc; }
    .btn-success { background:#f0fff4; color:#22863a; border:1.5px solid #c6f6d5; }
    .btn-sm { padding:5px 10px; font-size:11px; }
    .btn-full { width:100%; }
    .btn-row { display:flex; gap:6px; }
    .btn:disabled { opacity:.5; cursor:not-allowed; transform:none !important; }

    input[type="checkbox"], input[type="radio"] { color-scheme: light !important; accent-color: #833ab4; cursor: pointer; vertical-align: middle; }
    label:has(input[type="checkbox"]), label:has(input[type="radio"]) { color: #666; font-weight: 500; margin-bottom: 0; }
    label:has(input[type="checkbox"]:checked), label:has(input[type="radio"]:checked) { color: #833ab4; font-weight: 600; }

    .sw-toggle { position: relative; display: inline-block; width: 44px; height: 22px; }
    .sw-toggle input { opacity: 0; width: 0; height: 0; }
    .sw-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 22px; }
    .sw-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .sw-slider { background-color: #2ecc71; }
    input:checked + .sw-slider:before { transform: translateX(22px); }

    .follow-stats-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; margin:10px 0; }
    @media (max-width: 480px) {
      .follow-stats-grid { gap: 4px; }
      .follow-stats-grid .stat-num { font-size: 13px; }
      .follow-stats-grid .stat-label { font-size: 7px; }
    }
    .stat-card { background:#fff; border:1px solid #efefef; border-radius:12px; padding:10px 5px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.04); }
    .stat-card.error { border-color:#fee2e2; background:#fffafb; }
    .stat-num { font-size:18px; font-weight:800; color:#1a1a1a; line-height:1; margin-bottom:4px; }
    .stat-card.error .stat-num { color:#ef4444; }
    .stat-label { font-size:9px; color:#4b5563; text-transform:uppercase; font-weight:700; letter-spacing:0.3px; }

    .timer-board { display:flex; justify-content:space-around; background:#f9f9f9; padding:6px; border-radius:8px; margin-bottom:8px; border:1px dashed #ddd; }
    .timer-item { display:flex; gap:6px; align-items:center; font-size:10px; color:#666; }
    .timer-item strong { color:#333; font-family:monospace; font-size:11px; }

    .btn-processing { background: linear-gradient(45deg, #f09433, #e6683c); animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity:1; } 50% { opacity:0.8; } 100% { opacity:1; } }

    .card { background:#fafafa; border:1.5px solid #f0f0f0; border-radius:12px; padding:11px; }
    .card-title { font-size:10px; font-weight:700; color:#111827; text-transform:uppercase; letter-spacing:.8px; margin-bottom:9px; }

    .progress-wrap { background:#f0f0f0; border-radius:6px; overflow:hidden; height:5px; }
    .progress-bar { height:100%; background:linear-gradient(90deg,#833ab4,#fd1d1d); border-radius:6px; transition:width .4s; width:0%; }
    .progress-text { font-size:11px; color:#999; margin-top:4px; }

    .result-list { background:#fafafa; border:1.5px solid #efefef; border-radius:10px; max-height:120px; overflow-y:auto; font-size:11px; padding:7px; }
    .result-item { padding:3px 0; border-bottom:1px solid #f5f5f5; display:flex; justify-content:space-between; }
    .result-item:last-child { border-bottom:none; }
    .result-item .uname { color:#333; font-weight:500; }
    .result-item .pk { color:#aaa; font-size:10px; }

    .follow-stats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
    .stat-box { background:#fafafa; border:1.5px solid #f0f0f0; border-radius:10px; padding:9px; text-align:center; }
    .stat-val { font-size:19px; font-weight:700; color:#833ab4; }
    .stat-lbl { font-size:10px; color:#4b5563; margin-top:2px; font-weight:600; }

    .upload-zone { background:#fafafa; border:2px dashed #e0e0e0; border-radius:12px; padding:18px; text-align:center; cursor:pointer; transition:all .2s; color:#aaa; font-size:11px; }
    .upload-zone:hover { border-color:#a855f7; color:#a855f7; background:#fdf8ff; }
    .upload-zone svg { width:26px; height:26px; fill:currentColor; display:block; margin:0 auto 5px; }

    /* ---- Story Preview — TRUE 9:16 PORTRAIT ---- */
    /* Width = height * (9/16) = 284 * 0.5625 = ~160px  ← portrait ✓ */
    .story-preview-wrap {
        display:flex; justify-content:center; width:100%;
    }
    .story-preview-outer {
        position:relative;
        height:340px;          /* increased height as requested */
        aspect-ratio:9/16;     /* portrait aspect-ratio remains */
        background:#111; border-radius:12px; overflow:hidden;
        border:1.5px solid #e8e8e8; flex-shrink:0;
    }
    .story-flex-container {
        display:flex; gap:12px; align-items:flex-start; margin-bottom:10px;
    }

    /* DM SUB-TABS */
    .dm-tabs { display:flex; gap:4px; background:#f4f2f8; border-radius:12px; padding:6px; margin-bottom:12px; align-items: center; justify-content: center; }
    .dm-sub-tab {
        flex:1; padding:8px 4px; text-align:center; font-size:10px; font-weight:600;
        color:#777; cursor:pointer; border-radius:8px; transition:all .2s;
        display:flex; align-items:center; justify-content:center; gap:6px;
        white-space: nowrap;
    }
    .dm-sub-tab.active { background:white; color:#833ab4; font-weight:800; box-shadow:0 3px 10px rgba(0,0,0,.08); }
    .dm-sub-content { display:none; flex-direction:column; gap:10px; animation: fadeIn .2s ease; }
    .dm-sub-content.active { display:flex; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(3px); } to { opacity:1; transform:translateY(0); } }

    /* SC TABS (Scraper & Convert) */
    .sc-tabs { display:flex; gap:4px; background:#f4f2f8; border-radius:12px; padding:6px; margin-bottom:12px; align-items: center; justify-content: center; }
    .sc-sub-tab {
        flex:1; padding:8px 4px; text-align:center; font-size:10px; font-weight:600;
        color:#777; cursor:pointer; border-radius:8px; transition:all .2s;
        display:flex; align-items:center; justify-content:center; gap:6px;
        white-space: nowrap;
    }
    .sc-sub-tab.active { background:white; color:#833ab4; font-weight:800; box-shadow:0 3px 10px rgba(0,0,0,.08); }
    .sc-sub-content { display:none; flex-direction:column; gap:10px; animation: fadeIn .2s ease; }
    .sc-sub-content.active { display:flex; }

    .story-preview-side {
        flex:0 0 auto; display:flex; flex-direction:column; align-items:center;
    }
    .story-controls-side {
        flex:1; display:flex; flex-direction:column; gap:8px; min-width:0;
    }
    .dm-flex-container {
        display:flex; gap:12px; align-items:stretch; margin-bottom:10px;
    }
    .dm-side {
        flex:1; display:flex; flex-direction:column; gap:8px; min-width:0;
    }
    .follow-flex-container {
        display:flex; gap:12px; align-items:stretch; margin-bottom:10px;
    }
    .follow-side {
        flex:1; display:flex; flex-direction:column; gap:8px; min-width:0;
    }
    .story-preview-outer .story-bg-img {
        position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
    }
    .story-placeholder-txt { color:#888; font-size:9px; pointer-events:none; text-align:center; padding:6px; }

    /* Draggable pill in preview */
    .story-pill-drag {
        position:absolute;
        border-radius:50px;
        padding:4px 10px;
        font-size:8px; font-weight:700;
        display:flex; align-items:center; gap:2px;
        cursor:grab; user-select:none;
        box-shadow:0 2px 10px rgba(0,0,0,.3);
        white-space:nowrap;
        transform:translate(-50%,-50%);
        z-index:10;
    }
    .pill-icon { display:inline-block; flex-shrink:0; vertical-align:middle; }
    .story-pill-drag:active { cursor:grabbing; }
    .story-pill-drag.active { outline: 2px dashed #a855f7; outline-offset: 4px; }

    /* Handles */
    .sticker-handle {
        position: absolute; width:12px; height:12px;
        background:#fff; border:1.5px solid #a855f7;
        border-radius:50%; pointer-events:all; cursor:pointer;
        display:none; align-items:center; justify-content:center;
        box-shadow:0 2px 6px rgba(0,0,0,.15);
        z-index:20;
    }
    .story-pill-drag.active .sticker-handle { display:flex; }
    .handle-rotate { top:-30px; left:50%; transform:translateX(-50%); }
    .handle-rotate::after { content:''; position:absolute; top:18px; left:50%; width:1.5px; height:12px; background:#a855f7; }
    .handle-resize { bottom:-8px; right:-8px; cursor:nwse-resize; }
    .sticker-handle svg { width:10px; height:10px; fill:#a855f7; }

    /* ---- Story Controls ---- */
    .story-ctrl { background:#fafafa; border:1.5px solid #f0f0f0; border-radius:12px; padding:11px; display:flex; flex-direction:column; gap:9px; }

    /* Color picker row */
    .cpick-row { display:flex; align-items:center; gap:8px; }
    .cpick-row label { margin:0; flex:1; white-space:nowrap; }
    .cpick-box {
        width:38px; height:30px; border-radius:7px; border:1.5px solid #ddd;
        overflow:hidden; cursor:pointer; flex-shrink:0; position:relative;
    }
    .cpick-box input[type="color"] {
        position:absolute; inset:-6px; width:calc(100% + 12px); height:calc(100% + 12px);
        border:none; padding:0; cursor:pointer; opacity:1;
    }

    /* Font section */
    .font-import-area { display:flex; gap:6px; align-items:center; }
    .font-import-btn { padding:6px 10px; font-size:11px; background:#fff; border:1.5px solid #e8e8e8; border-radius:8px; cursor:pointer; color:#666; white-space:nowrap; transition:all .15s; }
    .font-import-btn:hover { border-color:#a855f7; color:#a855f7; }
    .font-status { font-size:10px; color:#aaa; margin-top:2px; }

    .profile-card { background:linear-gradient(135deg,#fdf8ff,#fff9f5); border:1.5px solid #f0e6ff; border-radius:12px; padding:13px; display:flex; align-items:center; gap:12px; }
    .profile-avatar { width:44px; height:44px; border-radius:50%; border:2px solid #a855f7; object-fit:cover; flex-shrink:0; background:#f0f0f0; }
    .profile-name { font-weight:700; font-size:13px; color:#1a1a1a; }
    .profile-sub { font-size:10px; color:#888; margin-top:2px; }

    .toast { position:fixed; bottom:88px; left:24px; background:white; border:1.5px solid #eee; border-radius:12px; padding:9px 15px; font-size:12px; font-weight:500; color:#333; pointer-events:none; opacity:0; transform:translateY(10px); transition:all .25s; max-width:300px; box-shadow:0 6px 24px rgba(0,0,0,.12); z-index:2147483647; }
    .toast.show { opacity:1; transform:translateY(0); }
    .toast.ok { border-color:#c6f6d5; color:#22863a; }
    .toast.err { border-color:#fcc; color:#e53e3e; }

    .divider { border:none; border-top:1px solid #f0f0f0; }
    .sect { font-size:10px; font-weight:700; color:#111827; text-transform:uppercase; letter-spacing:.6px; display:flex; align-items:center; gap:6px; }
    .sect::after { content:''; flex:1; height:1px; background:#e5e7eb; }




    /* RESIZE HANDLE */
    #resize-handle {
        position: absolute;
        bottom: 0; right: 0;
        width: 20px; height: 20px;
        cursor: nwse-resize;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 4px;
        z-index: 100;
    }
    #resize-handle svg { width: 12px; height: 12px; opacity: 0.5; }
    #resize-handle:hover svg { opacity: 1; }

    `;
  shadow.appendChild(style);



  const panel = document.createElement('div');
  panel.id = 'panel';
  panel.innerHTML = `
    <div class="panel-header" id="drag-handle">
      <div class="panel-logo"><svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></div>
            <div class="panel-title">BOT TOLOL<span id="bot-owner-name">( Dibuat oleh mas abdul haris hamammi )</span></div>
      <div class="btn-close" id="btn-close">✕</div>
    </div>

    <div class="session-bar">
      <div style="display:flex; align-items:center; gap:8px; flex:1; overflow:hidden">
        <div class="session-dot" id="sess-dot"></div>
        <div class="session-info" id="sess-info" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:8px; width:100%">
          <span id="sess-user" style="font-weight:bold; flex-shrink:0;">Menghubungkan...</span>
          <div id="sess-marquee" style="flex:1; overflow:hidden; white-space:nowrap; font-size:10px; color:#833ab4; font-weight:600;"></div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:10px">

        <button class="btn-sm-txt" id="btn-refresh-sess" style="background:#eee; border-radius:4px; padding:2px 6px">↺</button>
      </div>
    </div>

    <div class="panel-body">
      <div class="tabs">
        <div class="tab active" data-tab="scraper">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/><path d="M11 8v6M8 11h6"/></svg></span>
          Scraper
        </div>
        <div class="tab" data-tab="dm">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></span>
          DM
        </div>
        <div class="tab" data-tab="ocypus">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg></span>
          Follow
        </div>
        <div class="tab" data-tab="story">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><line x1="16" x2="20" y1="7" y2="7"/><line x1="18" x2="18" y1="5" y2="9"/></svg></span>
          Story
        </div>
        <div class="tab" data-tab="viewstory">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></span>
          View Story
        </div>
        <div class="tab" data-tab="shortlink">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg></span>
          Link
        </div>
        <div class="tab" data-tab="like">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></span>
          Like
        </div>
        <div class="tab" data-tab="comment">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
          Comment
        </div>
        <div class="tab" data-tab="autosetup">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M19 3v4M21 5h-4"/></svg></span>
          Auto
        </div>
        <div class="tab" data-tab="feed">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/></svg></span>
          Feed
        </div>
        <div class="tab" data-tab="profile">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19a6 6 0 0 1 11 0"/></svg></span>
          Profil
        </div>
        <div class="tab" data-tab="logs">
          <span class="tab-icon"><svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg></span>
          Logs
        </div>
      </div>

      <div class="tab-content-container">

    <!-- SCRAPER -->
    <div class="tab-content active" id="tab-scraper">
      <div class="sc-tabs">
          <div class="sc-sub-tab active" data-sc-tab="sc-sub-main">🔍 Scraper</div>
          <div class="sc-sub-tab" data-sc-tab="sc-sub-convert">🔄 Convert ID</div>
      </div>

      <div class="sc-tab-container">
        <!-- SUB-TAB: MAIN SCRAPER -->
        <div class="sc-sub-content active" id="sc-sub-main">
          <div class="card">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div class="card-title" style="margin:0;">Target Scrape</div>
              <select id="sc-mode" style="width:auto; height:26px; padding:2px 8px; font-size:11px; border-radius:6px; border:1px solid #d1d5db; background:#f9fafb; font-weight:600; cursor:pointer;" title="Pilih Mode Scrape: Cepat (Turbo 50-batch) atau Aman (Anti-Detect dengan jeda acak)">
                <option value="fast">⚡ Cepat</option>
                <option value="safe">🛡️ Aman</option>
              </select>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
              <div style="flex:1.2; min-width:0;">
                <label style="display:block; font-size:10px; font-weight:700; color:#374151; text-transform:uppercase; margin-bottom:3px; letter-spacing:0.3px;">Tipe</label>
                <select id="sc-type" style="width:100%; height:34px; padding:4px 4px; font-size:11px;" title="Tipe Sumber Data Scrape">
                  <option value="followers">Followers</option>
                  <option value="following">Following</option>
                  <option value="likers">Likers</option>
                  <option value="commenters">Comments</option>
                  <option value="user_posts">Posts</option>
                  <option value="location_posts">Lokasi ID</option>
                </select>
              </div>
              <div style="flex:1; min-width:0;">
                <label style="display:block; font-size:10px; font-weight:700; color:#374151; text-transform:uppercase; margin-bottom:3px; letter-spacing:0.3px;">Filter</label>
                <select id="sc-filter" style="width:100%; height:34px; padding:4px 4px; font-size:11px;" title="Filter Privasi Akun (ALL = Semua Akun, PUB = Publik Saja, PRIV = Privat Saja)">
                  <option value="all">Semua</option>
                  <option value="public">Publik</option>
                  <option value="private">Privat</option>
                </select>
              </div>
              <div style="flex:0.9; min-width:0;">
                <label style="display:block; font-size:10px; font-weight:700; color:#374151; text-transform:uppercase; margin-bottom:3px; letter-spacing:0.3px;">Limit</label>
                <input id="sc-limit" type="number" value="1000" min="1" title="Batas Maksimal Data yang Diambil" style="width:100%; height:34px; padding:4px 4px; font-size:11px; text-align:center;">
              </div>
              <div style="flex:0.9; min-width:0;">
                <label style="display:block; font-size:10px; font-weight:700; color:#374151; text-transform:uppercase; margin-bottom:3px; letter-spacing:0.3px;">Delay(ms)</label>
                <input id="sc-delay" type="number" value="500" min="500" step="100" title="Jeda Waktu Antar Request (Minimal 500 ms)" style="width:100%; height:34px; padding:4px 4px; font-size:11px; text-align:center;">
              </div>
            </div>
            <label style="display:block; font-size:10px; font-weight:700; color:#374151; text-transform:uppercase; margin-bottom:3px; letter-spacing:0.3px;">Target (Username / URL / Media ID):</label>
            <textarea id="sc-target" placeholder="Contoh: username / URL postingan / Media ID&#10;Satu per baris..." rows="3"></textarea>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary btn-full" id="btn-scrape">🔍 Mulai Scrape</button>
            <button class="btn btn-danger" id="btn-stop-scrape" style="display:none">⏹ Stop</button>
          </div>
          <div class="progress-wrap" id="sc-prog-wrap" style="display:none"><div class="progress-bar" id="sc-bar"></div></div>
          <div class="progress-text" id="sc-status" style="font-size:11px; color:#833ab4; font-weight:700"></div>
          <div class="result-list" id="sc-results" style="display:none"></div>
          <div class="btn-row" id="sc-actions" style="display:none">
            <button class="btn btn-secondary btn-sm" id="btn-copy-uuid">📋 UUID</button>
            <button class="btn btn-secondary btn-sm" id="btn-copy-uname">📋 Username</button>
            <button class="btn btn-success btn-sm" id="btn-scrape-engager" style="display:none; background:#8e44ad; border:none; color:white;">✦ Scrape Engager</button>
            <button class="btn btn-success btn-sm" id="btn-send-follow">→ Follow</button>
          </div>
        </div>

        <!-- SUB-TAB: CONVERT ID -->
        <div class="sc-sub-content" id="sc-sub-convert">
          <div class="card">
            <div class="card-title">Converter (Massal)</div>
            <div class="btn-row" style="margin-bottom:10px; gap:6px">
              <button class="btn btn-secondary btn-sm active" id="btn-mode-u2i" style="flex:1">User to ID</button>
              <button class="btn btn-secondary btn-sm" id="btn-mode-i2u" style="flex:1">ID to User</button>
            </div>
            <label id="conv-label" style="font-size:10px; color:#1f2937; margin-bottom:5px">Mode: User to ID (Input Username)</label>
            <textarea id="conv-target" placeholder="Contoh: @username1\n@username2" rows="5"></textarea>
            <div class="input-row" style="margin-top:8px">
               <button class="btn btn-primary btn-full" id="btn-convert-id">⚡️ Mulai Konversi</button>
            </div>
          </div>
          <div class="progress-text" id="conv-status" style="font-size:11px; color:#833ab4; font-weight:700; text-align:center; margin-top:5px"></div>
          <label style="font-size:10px; color:#1f2937; margin-top:8px">Hasil (Username [tab] UUID):</label>
          <textarea id="conv-results" placeholder="Hasil akan muncul di sini..." rows="8" readonly style="background:#fcfcfc; color:#555; white-space:pre; margin-top:5px"></textarea>
          <div class="btn-row" style="margin-top:5px">
            <button class="btn btn-secondary btn-sm btn-full" id="btn-copy-conv">📋 Copy Hasil</button>
          </div>
        </div>
      </div>
    </div>

    <!-- DM -->
    <div class="tab-content" id="tab-dm">
      <!-- Sub-Nav -->
      <div class="dm-tabs">
          <div class="dm-sub-tab active" data-dm-tab="dm-sub-target">🎯 Target</div>
          <div class="dm-sub-tab" data-dm-tab="dm-sub-msg">✉️ Pesan</div>
          <div class="dm-sub-tab" data-dm-tab="dm-sub-set">⚙️ Setting</div>
      </div>

      <div class="dm-tab-container">
        <!-- SUB-TAB: TARGET -->
        <div class="dm-sub-content active" id="dm-sub-target">
          <div class="card">
            <div class="card-title">Scrape Target</div>
            <div class="btn-row" style="gap:4px; margin-bottom:8px">
              <button class="btn btn-secondary btn-sm" id="btn-dm-get-followers" style="flex:1">Followers</button>
              <button class="btn btn-secondary btn-sm" id="btn-dm-get-following" style="flex:1">Following</button>
              <button class="btn btn-secondary btn-sm" id="btn-dm-fetch-inbox" style="flex:1">Inbox</button>
            </div>
            <label>Mode</label>
            <select id="dm-mode" style="margin-bottom:8px">
              <option value="new">New DM (UUIDs)</option>
              <option value="followup">Repeat (Inbox)</option>
            </select>
            <div id="dm-new-target">
              <label>Recipient Target (Username / UUID)</label>
              <textarea id="dm-uuids" rows="5" placeholder="Contoh:&#10;username&#10;12345678&#10;another_user"></textarea>
            </div>
            <div id="dm-followup-target" style="display:none">
              <label>Threads (Inbox)</label>
              <div id="dm-threads-list" style="max-height:350px; overflow-y:auto; background:rgba(0,0,0,0.03); border-radius:6px; padding:5px; font-size:10px; border:1px solid #eee">
                <div style="color:#aaa; text-align:center; padding:5px">Silakan Fetch Inbox dahulu</div>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-TAB: MESSAGE -->
        <div class="dm-sub-content" id="dm-sub-msg">
          <div class="card">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px">
              <div class="card-title" style="margin:0">Message Settings</div>
              <button class="btn-sm-txt" id="btn-dm-reload-tpl">↺ Reload</button>
            </div>
            <select id="dm-template-select" style="margin-bottom:8px">
              <option value="">✏️ Manual (ketik di bawah)</option>
            </select>
            <label>Pesan (| pisah pesan, Enter = baris baru)</label>
            <textarea id="dm-message" rows="5" placeholder="Tulis pesan di sini..."></textarea>
            <div id="dm-tpl-badge" style="display:none; font-size:9px; color:#833ab4; background:#fdf8ff; border:1px solid #e9d5ff; border-radius:4px; padding:3px 8px; margin-top:5px">📄 Mode file aktif — hapus pilihan untuk edit manual</div>
            
            <!-- Link Random (Always Visible) -->
            <div style="margin-top:10px; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden">
              <div style="background:#f8fafc; padding:8px 12px; font-size:10px; font-weight:700; color:#1e293b; display:flex; justify-content:space-between; align-items:center">
                <span>🔗 Link Random <span id="dm-link-count" style="margin-left:5px; background:#e2e8f0; padding:1px 5px; border-radius:4px">0</span></span>
              </div>
              <div style="padding:10px; background:#fff">
                <textarea id="dm-links" rows="3" placeholder="https://link1.com&#10;https://link2.com" style="font-size:11px"></textarea>
                <div style="font-size:9px; color:#475569; margin-top:5px">Setiap pesan akan mengambil 1 link acak. Kosongkan jika tidak pakai.</div>
              </div>
            </div>

            <!-- Media DM (New) -->
            <div style="margin-top:10px; border:1px solid #e0e7ff; border-radius:10px; overflow:hidden">
              <div style="background:#f5f3ff; padding:8px 12px; font-size:10px; font-weight:700; color:#6d28d9; display:flex; justify-content:space-between; align-items:center">
                <span>📷 Media DM <span id="dm-media-badge" style="margin-left:5px; background:#ede9fe; color:#7c3aed; padding:1px 5px; border-radius:4px">OFF</span></span>
                <button id="btn-reload-dm-folders" style="background:none; border:none; font-size:11px; cursor:pointer; color:#7c3aed; padding:0">↺</button>
              </div>
              <div style="padding:10px; background:#fff">
                <select id="dm-media-folder" style="font-size:11px; width:100%; margin-bottom:5px">
                  <option value="">-- Tanpa Media (Teks saja) --</option>
                </select>
                <div style="font-size:9px; color:#475569">Pilih folder untuk mengirim gambar acak sebelum teks. Kosongkan jika tidak pakai media.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- SUB-TAB: SETTING -->
        <div class="dm-sub-content" id="dm-sub-set">
          <div class="card">
            <div class="card-title">Automation Settings</div>
            <div class="input-row" style="gap:8px">
              <div><label>Delay (ms)</label><input id="dm-delay" type="number" value="10000"></div>
              <div style="flex:0.7"><label>Mem/DM</label><input id="dm-members" type="number" value="1"></div>
            </div>
            
            <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #eee">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:#833ab4; font-weight:700">
                <input type="checkbox" id="dm-use-jeda" style="width:auto"> ⏱️ Aktifkan Sistem Jeda
              </label>
              <div id="dm-jeda-config" style="display:none; margin-top:8px; background:#fdf8ff; border:1px solid #e9d5ff; border-radius:8px; padding:10px">
                <div class="input-row" style="gap:8px">
                  <div>
                    <label style="font-size:10px">Jeda Setiap (X) Pesan</label>
                    <input id="dm-jeda-threshold" type="number" value="10" min="1">
                  </div>
                  <div>
                    <label style="font-size:10px">Lama Jeda (Menit)</label>
                    <input id="dm-jeda-time" type="number" value="2" min="1">
                  </div>
                </div>
              </div>
            </div>
            <div style="font-size:9.5px; color:#4b5563; font-weight:500; margin-top:8px">💡 <b>Mem/DM:</b> Jumlah member dalam satu grup (untuk mode Grup). <b>Sistem Jeda:</b> Berikan istirahat setelah mencapai jumlah pesan tertentu.</div>
          </div>
        </div>
      </div>


      <div class="follow-stats-grid" id="dm-stats-grid" style="margin-top:0; display:none;">
        <div class="stat-card"><div class="stat-num" id="dm-done">0</div><div class="stat-label">Sukses</div></div>
        <div class="stat-card"><div class="stat-num" id="dm-fail">0</div><div class="stat-label">Gagal</div></div>
        <div class="stat-card"><div class="stat-num" id="dm-total">0/0</div><div class="stat-label">Total</div></div>
      </div>

      <div class="progress-wrap" style="height:6px"><div class="progress-bar" id="dm-bar"></div></div>
      
      <div class="btn-row" style="margin-top:5px">
        <button class="btn btn-primary" style="flex:2" id="btn-start-dm">▶ Start</button>
        <button class="btn btn-danger" id="btn-stop-dm">⏹ Stop</button>
      </div>
      <div class="progress-text" id="dm-status" style="font-weight:600; color:#833ab4; font-size:11px; text-align:center; min-height:16px"></div>
      
      <div class="card" style="margin-top:5px">
        <div class="card-title">DM Logs</div>
        <div class="result-list" id="dm-logs" style="height:110px"></div>
      </div>
    </div>



    <!-- STORY -->
    <div class="tab-content" id="tab-story">
      <div class="story-flex-container">
        <!-- Area Kiri: Preview -->
        <div class="story-preview-side">
          <div class="upload-zone" id="st-upload-zone" style="height:340px; aspect-ratio:9/16; padding:10px; font-size:10px">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Klik/Drag Story (9:16)
          </div>
          <div class="story-preview-wrap">
            <div class="story-preview-outer" id="st-preview" style="display:none">
              <img class="story-bg-img" id="st-img" alt="">
              <div class="story-pill-drag" id="st-pill" style="left:50%;top:75%;display:none">
                <div class="sticker-handle handle-rotate" id="st-h-rotate">
                  <svg viewBox="0 0 24 24"><path d="M12 21c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8c0 1.221-.283 2.403-.815 3.466l1.794.887C21.6 16.039 22 14.541 22 13c0-5.514-4.486-10-10-10S2 7.486 2 13s4.486 10 10 10c1.541 0 3.039-.4 4.353-1.021l-.887-1.794A7.94 7.94 0 0112 21z"/><path d="M18 16h-4v4h2v-2h2z"/></svg>
                </div>
                <div class="sticker-handle handle-resize" id="st-h-resize">
                  <svg viewBox="0 0 24 24"><path d="M21 15h2v6c0 1.1-.9 2-2 2h-6v-2h6v-6zM3 9H1v-6c0-1.1.9-2 2-2h6v2H3v4z"/></svg>
                </div>
                <span class="pill-icon">🔗</span><span id="st-pill-text">Tap here</span>
              </div>
              <div class="story-placeholder-txt" id="st-no-link">Isi link sticker dulu</div>
            </div>
          </div>
          <div style="font-size:9.5px;color:#bbb;text-align:center;margin-top:4px" id="st-pos-label"></div>
        </div>

        <!-- Area Kanan: Controls -->
        <div class="story-controls-side">
          <button class="btn btn-secondary btn-sm btn-full" id="btn-st-autofill" style="margin-bottom:8px; background:#f0f7ff; border-color:#0095f6; color:#0095f6; font-weight:800; font-size:11px">✨ AUTO FILL (SETUP)</button>
          <div class="sect">Link Sticker</div>
          <input id="st-link" placeholder="URL (https://wa.me/...)" style="margin-bottom:4px">
          <input id="st-linktitle" placeholder="Teks sticker (cth: Habla di sini 🔥)">

          <div class="sect">Font</div>
          <div class="story-ctrl" style="padding:8px; gap:6px">
            <div style="display:flex; align-items:center; gap:5px">
              <select id="st-font" style="font-size:11px; flex:1"><option value="">Memuat font...</option></select>
              <input id="st-fontsize" type="number" value="16.5" step="0.5" style="width:45px; height:24px; padding:2px" title="Font Size Sticker">
            </div>
            <div class="font-import-area" style="margin-top:4px">
              <button class="font-import-btn" id="btn-import-font" style="padding:4px 8px; font-size:10px">⬆ Import</button>
              <button class="font-import-btn" id="btn-reload-fonts" style="padding:4px 8px; font-size:10px">↺ Reload</button>
            </div>
            <div class="font-status" id="st-font-status" style="font-size:9px"></div>
          </div>

          <div class="sect">Warna, Radius & Ikon</div>
          <div class="story-ctrl" style="padding:8px; gap:8px; box-sizing:border-box; width:100%; overflow:hidden">
            <!-- Row 1: Colors & Radius -->
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; width:100%; box-sizing:border-box">
              <div style="display:flex; gap:5px; align-items:center; flex-shrink:0">
                <div class="cpick-box" id="cpick-bg" title="Background Stiker" style="width:28px; height:24px; border-radius:6px"><input type="color" id="st-color" value="#ffffff"></div>
                <div class="cpick-box" id="cpick-txt" title="Warna Teks & Ikon" style="width:28px; height:24px; border-radius:6px; background:#0095f6"><input type="color" id="st-textcolor" value="#0095f6"></div>
              </div>
              <div style="display:flex; gap:4px; align-items:center; flex-shrink:1; min-width:0">
                <span style="font-size:10px; color:#1f2937; white-space:nowrap">Radius:</span>
                <input id="st-radius" type="number" value="15" min="0" max="60" style="width:36px; min-width:30px; max-width:40px; height:24px; padding:2px 4px; font-size:10px; text-align:center; box-sizing:border-box; border:1px solid #ddd; border-radius:6px" title="Corner Radius (Sudut Kotak)">
              </div>
            </div>

            <!-- Row 2: Ikon Settings (Checkbox & Ukuran) -->
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; width:100%; box-sizing:border-box; padding-top:2px; border-top:1px dashed #eee">
              <label style="display:flex; align-items:center; gap:4px; cursor:pointer; font-size:10px; color:#555; white-space:nowrap; margin:0">
                <input type="checkbox" id="st-showicon" checked style="width:auto; margin:0"> Ikon
              </label>
              <div style="display:flex; gap:4px; align-items:center; flex-shrink:1; min-width:0" id="st-iconscale-wrap">
                <span style="font-size:10px; color:#1f2937; white-space:nowrap">Ukuran:</span>
                <input id="st-iconscale" type="number" value="0.8" step="0.1" min="0.3" max="2.5" style="width:42px; min-width:35px; max-width:46px; height:24px; padding:2px 4px; font-size:10px; text-align:center; box-sizing:border-box; border:1px solid #ddd; border-radius:6px" title="Skala Ukuran Ikon (0.3x - 2.5x)">
              </div>
            </div>

            <!-- Row 3: Blur & Mute options -->
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; width:100%; box-sizing:border-box; padding-top:2px">
              <label style="display:flex; align-items:center; gap:4px; cursor:pointer; margin:0"><input type="checkbox" id="st-blur" style="width:auto; margin:0"> <span style="font-size:10px; color:#666">Blur</span></label>
              <label style="display:flex; align-items:center; gap:4px; cursor:pointer; margin:0"><input type="checkbox" id="st-mute" style="width:auto; margin:0"> <span style="font-size:10px; color:#666">Mute Video</span></label>
            </div>
          </div>

          <div style="background:rgba(0,0,0,0.03); padding:8px; border-radius:10px; border:1px solid #f0f0f0">
            <label style="font-size:11px; margin-bottom:4px">Nama Highlight (isi untuk aktifkan)</label>
            <input id="st-highlight-name" placeholder="Nama highlight (cth: My Day)" style="font-size:11px; padding:6px">
          </div>
        </div>
      </div>

      <div class="progress-wrap" id="st-prog" style="display:none"><div class="progress-bar" id="st-bar"></div></div>
      <div class="progress-text" id="st-status"></div>

      <div class="btn-row" style="margin-top:6px; gap:6px;">
        <button class="btn btn-secondary" id="btn-st-reset" style="flex:0 0 auto; padding:8px 10px; font-size:11px; white-space:nowrap;" title="Ganti foto atau video story">🔄 Ganti Media</button>
        <button class="btn btn-primary" id="btn-post-story" style="flex:1; padding:8px 12px; font-size:11.5px; white-space:nowrap; justify-content:center;">📤 Post Story</button>
      </div>
    </div>

    <!-- FEED -->
    <div class="tab-content" id="tab-feed">
      <div class="card">
        <div class="sect">Single Post</div>
        <div class="upload-zone" id="fd-upload-zone">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          Klik atau drag foto / video feed
        </div>
        <img id="fd-preview" alt="" style="display:none;width:100%;border-radius:10px;max-height:150px;object-fit:cover;border:1.5px solid #efefef">
        <video id="fd-video-preview" controls style="display:none;width:100%;border-radius:10px;max-height:180px;object-fit:contain;border:1.5px solid #efefef;background:#000"></video>
        <div style="margin-top:8px;margin-bottom:4px;">
          <label style="font-size:10px;color:#1f2937;display:flex;justify-content:space-between;align-items:center;">
            File Caption (Opsional)
            <span style="font-size:9px;color:#6b7280;">Pilih file atau ketik manual</span>
          </label>
          <select id="fd-caption-file" style="font-size:11px;width:100%;margin-top:3px;margin-bottom:4px;"><option value="" selected>None (Tanpa Caption)</option></select>
        </div>
        <textarea id="fd-caption" placeholder="Caption..."></textarea>
        <div class="progress-wrap" id="fd-prog" style="display:none"><div class="progress-bar" id="fd-bar"></div></div>
        <div class="progress-text" id="fd-status"></div>
        <button class="btn btn-primary btn-full" id="btn-post-feed">📤 Post Feed</button>
      </div>

      <div class="card" style="margin-top:10px">
        <div class="sect">Bulk Post (Folder)</div>
        <div style="font-size:10px;color:#1f2937;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          Pengaturan Folder & Caption
          <button class="btn-sm-txt" id="btn-reload-bulk-opts" style="padding:2px 6px;font-size:9px">↺ Refresh</button>
        </div>
        <div class="input-row" style="margin-bottom:6px">
          <div><label>Folder Media</label><select id="bulk-fd-folder" style="font-size:11px"><option value="media/feed">media/feed</option></select></div>
          <div><label>File Caption</label><select id="bulk-fd-caption" style="font-size:11px"><option value="" selected>None (Tanpa Caption)</option></select></div>
        </div>
        <div class="input-row">
          <div><label>Jumlah Post</label><input id="bulk-fd-count" type="number" value="4" min="1"></div>
          <div><label>Delay (ms)</label><input id="bulk-fd-delay" type="number" value="10000" min="2000"></div>
        </div>
        <div class="progress-wrap" id="bulk-fd-prog" style="display:none;margin-top:8px"><div class="progress-bar" id="bulk-fd-bar"></div></div>
        <div class="progress-text" id="bulk-fd-status"></div>
        <button class="btn btn-primary btn-full" id="btn-bulk-feed" style="background:#a855f7;margin-top:5px">📤 Post dari Folder</button>
      </div>
    </div>

    <!-- PROFILE -->
    <div class="tab-content" id="tab-profile">
      <div class="profile-card" id="prof-card" style="display:none">
        <img class="profile-avatar" id="prof-avatar" src="" alt="">
        <div><div class="profile-name" id="prof-name"></div><div class="profile-sub" id="prof-sub"></div></div>
      </div>
      <div class="card">
        <div class="card-title" style="display:flex; justify-content:space-between; align-items:center">
          Update Profil
          <button id="btn-fetch-profile" style="background:#f0f9ff; border:1px solid #bae6fd; color:#0369a1; padding:3px 8px; border-radius:6px; font-size:10px; cursor:pointer">🔄 Ambil Data</button>
        </div>
        <div class="upload-zone" id="pr-pic-zone">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
          Upload foto profil baru
        </div>
        <img id="pr-pic-prev" alt="" style="display:none;width:80px;height:80px;border-radius:50%;margin:8px auto 8px;object-fit:cover;border:2px solid #a855f7">
        
        <label style="font-size:11px; margin-top:8px">Nama Lengkap</label>
        <input id="pr-fullname" placeholder="Nama Lengkap" style="margin-top:2px; font-size:11px">

        <label style="font-size:11px; margin-top:8px">Website / Link</label>
        <input id="pr-website" placeholder="https://..." style="margin-top:2px; font-size:11px">

        <label style="font-size:11px; margin-top:8px">Bio</label>
        <textarea id="pr-bio" placeholder="Bio baru..." rows="3" style="margin-top:2px; font-size:11px"></textarea>

        <div class="input-row" style="margin-top:8px; gap:8px">
          <div style="flex:1">
            <label style="font-size:11px">Gender</label>
            <select id="pr-gender" style="margin-top:2px; font-size:11px">
              <option value="1">Laki-laki</option>
              <option value="2">Perempuan</option>
              <option value="3">Tidak Disebutkan</option>
            </select>
          </div>
          <div style="flex:1; display:flex; align-items:flex-end">
            <label style="display:flex; align-items:center; gap:6px; font-size:11px; margin-bottom:8px; cursor:pointer">
              <input type="checkbox" id="pr-chaining" style="width:auto"> Akun Terkait
            </label>
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="btn-save-profile" style="margin-top:12px">💾 Simpan Profil</button>
      </div>
      <div class="progress-text" id="pr-status"></div>
    </div>

    <div class="tab-content" id="tab-shortlink">
      <div class="card">
        <div class="card-title">Generate Shortlink</div>
        <label>Layanan API</label>
        <select id="sl-provider" style="margin-bottom:8px">
          <option value="none">Tanpa Shortlink</option>
          <option value="ix">ix.sk (Recommended)</option>
          <option value="ssur">ssur.cc</option>
          <option value="tinyurl">TinyURL</option>
          <option value="spoome">Spoo.me</option>
          <option value="bitly">Bitly Pro</option>
          <option value="tinyurl_api">TinyURL Pro</option>
        </select>
        
        <div id="sl-apikey-wrap" style="display:none; margin-bottom:8px">
          <label>API Key (Bearer Token)</label>
          <input type="password" id="sl-apikey" placeholder="Masukkan rahasia API Key Anda">
        </div>

        <label>List URL Tujuan</label>
        <select id="sl-preset-url" style="margin-bottom:8px">
          <option value="custom">-- Link Custom (Ketik Manual) --</option>
          <option value="setuplink">Setup Link (link.txt)</option>
        </select>


        <div id="sl-custom-url-wrap" style="display:block">
          <label>URL Panjang Asli</label>
          <textarea id="sl-longurl" placeholder="https://contoh.com/halaman-sangat-panjang/..." rows="1" style="margin-bottom:8px"></textarea>
        </div>
        
        <div class="input-row" style="margin-bottom:8px">
          <div><label>Jumlah Link</label><input id="sl-bulk-count" type="number" value="1" min="1" max="50"></div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary btn-full" id="btn-generate-shortlink" style="border-radius: 50px; height: 44px; font-size: 13px; letter-spacing: 0.3px; box-shadow: 0 4px 15px rgba(131, 58, 180, 0.3);">⚡ Generate Shortlink</button>
        </div>
      </div>

      <div class="card" style="margin-top:10px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px">
          <label style="margin:0">Hasil Shortlink</label>
          <button class="btn-sm-txt" id="btn-copy-shortlink" style="padding:3px 10px; border:1px solid #ccc; background:#fff">📋 Salin Semua</button>
        </div>
        <textarea id="sl-result" readonly placeholder="Hasil akan muncul di baris ini..." rows="4" style="font-family:monospace; resize:vertical;"></textarea>
        <div class="progress-wrap" id="sl-prog-sl" style="display:none; margin-top:8px"><div class="progress-bar" id="sl-bar"></div></div>
        <div class="progress-text" id="sl-status" style="margin-top:5px; text-align:center"></div>
      </div>
    </div>
    
    <!-- LIKE RUNNER -->
    <div class="tab-content" id="tab-like">
      <div class="dm-tabs" id="like-sub-nav">
          <div class="dm-sub-tab active" data-like-tab="like-sub-post">🎯 Like Post</div>
          <div class="dm-sub-tab" data-like-tab="like-sub-comment">💬 Like Comment</div>
          <div class="dm-sub-tab" data-like-tab="like-sub-set">⚙️ Setting</div>
      </div>

      <div class="like-tab-container">
        <!-- SUB-TAB: LIKE POST -->
        <div class="dm-sub-content active" id="like-sub-post">
          <div class="card">
            <div class="card-title">Target Akun/UUID</div>
            <textarea id="like-post-targets" rows="6" placeholder="Username atau UUID...&#10;Satu per baris..."></textarea>
            <div style="font-size:9px; color:#4b5563; margin-top:5px">Bot akan men-like postingan TERAKHIR dari setiap akun di atas.</div>
          </div>
        </div>

        <!-- SUB-TAB: LIKE COMMENT -->
        <div class="dm-sub-content" id="like-sub-comment">
          <div class="card">
            <div class="card-title">Target Media (Post/Reels)</div>
            <textarea id="like-comment-targets" rows="6" placeholder="URL Post atau Shortcode...&#10;Satu per baris..."></textarea>
            <div style="font-size:9px; color:#4b5563; margin-top:5px">Bot akan meload komentar dan memberikan Like sesuai limit yang ditentukan.</div>
          </div>
        </div>

        <!-- SUB-TAB: SETTING -->
        <div class="dm-sub-content" id="like-sub-set">
          <div class="card">
            <div class="card-title">Automation Settings</div>
            <div class="input-row" style="gap:8px">
              <div><label>Delay (ms)</label><input id="like-delay" type="number" value="300"></div>
              <div style="flex:1"><label>Limit Komen/Post</label><input id="like-limit-comment" type="number" value="1"></div>
            </div>
            
            <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #eee">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:#833ab4; font-weight:700">
                <input type="checkbox" id="like-use-jeda" style="width:auto"> ⏱️ Aktifkan Sistem Jeda
              </label>
              <div id="like-jeda-config" style="display:none; margin-top:8px; background:#fdf8ff; border:1px solid #e9d5ff; border-radius:8px; padding:10px">
                <div class="input-row" style="gap:8px">
                  <div>
                    <label style="font-size:10px">Jeda Setiap (X) Like</label>
                    <input id="like-jeda-threshold" type="number" value="50" min="1">
                  </div>
                  <div>
                    <label style="font-size:10px">Lama Jeda (Menit)</label>
                    <input id="like-jeda-time" type="number" value="2" min="1">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="follow-stats-grid" id="like-stats-grid" style="margin-top:5px">
        <div class="stat-card"><div class="stat-num" id="like-done">0</div><div class="stat-label">Sukses</div></div>
        <div class="stat-card"><div class="stat-num" id="like-fail">0</div><div class="stat-label">Gagal</div></div>
        <div class="stat-card"><div class="stat-num" id="like-skip">0</div><div class="stat-label">Skip</div></div>
        <div class="stat-card"><div class="stat-num" id="like-total">0/0</div><div class="stat-label">Progres</div></div>
      </div>

      <div class="progress-wrap" style="height:6px"><div class="progress-bar" id="like-bar"></div></div>
      
      <div class="btn-row" style="margin-top:5px">
        <button class="btn btn-primary" style="flex:2" id="btn-start-like">❤️ Start Like</button>
        <button class="btn btn-danger" id="btn-stop-like" style="display:none">⏹ Stop</button>
      </div>
      <div class="progress-text" id="like-status" style="font-weight:600; color:#833ab4; font-size:11px; text-align:center; min-height:16px"></div>
      
      <div class="card" style="margin-top:5px">
        <div class="card-title">Like Reports</div>
        <div class="result-list" id="like-logs" style="height:110px"></div>
      </div>
    </div>

    <!-- TAB COMMENT RUNNER -->
    <div class="tab-content" id="tab-comment">
      <div class="dm-tabs">
        <div class="dm-sub-tab active" data-comment-tab="comment-target-content">🎯 Auto Comment</div>
        <div class="dm-sub-tab" data-comment-tab="comment-reply-content">💬 Auto Reply</div>
        <div class="dm-sub-tab" data-comment-tab="comment-setting-content">⚙️ Setting</div>
      </div>

      <!-- Mode: Auto Comment -->
      <div class="dm-sub-content active" id="comment-target-content">
        <div class="card">
          <div class="card-title">TARGET AKUN/UUID (Auto Comment)</div>
          <textarea id="comment-post-targets" class="dm-input" style="height:100px" placeholder="Username atau UUID...\nSatu per baris..."></textarea>
          <div class="dm-help">Bot akan mengecek postingan TERAKHIR dan mengirim komen sesuai filter waktu.</div>
        </div>
      </div>

      <!-- Mode: Auto Reply -->
      <div class="dm-sub-content" id="comment-reply-content">
        <div class="card">
          <div class="card-title">TARGET MEDIA (Auto Reply)</div>
          <textarea id="comment-reply-targets" class="dm-input" style="height:100px" placeholder="Link Post atau Shortcode...\nSatu per baris..."></textarea>
          <div class="dm-help">Bot akan meload komentar di postingan tersebut dan membalasnya.</div>
        </div>
      </div>

      <!-- Setting -->
      <div class="dm-sub-content" id="comment-setting-content">
        <div class="card">
          <div class="card-title">Automation Settings</div>
          
          <div class="dm-form-group">
            <label class="dm-label">Pilih Template Komentar (.txt)</label>
            <select id="comment-template-file" class="dm-input"></select>
          </div>

          <div class="dm-form-group">
            <div class="dm-form-row">
              <div style="flex: 1;">
                <label class="dm-label">Delay (ms)</label>
                <input type="number" id="comment-delay" class="dm-input" value="6000">
              </div>
              <div style="flex: 1;">
                <label class="dm-label">Limit Komen/Sesi</label>
                <input type="number" id="comment-limit" class="dm-input" value="1">
              </div>
            </div>
          </div>

          <!-- Time Filter Switch -->
          <div class="dm-form-group" style="padding-top:10px; border-top:1px dashed #eee">
            <div style="font-size:10px; font-weight:700; color:#1f2937; margin-bottom:8px; display:flex; align-items:center; gap:5px">
              Filter Waktu Postingan (Hanya Auto Comment)
            </div>
            <div style="display:flex; align-items:center; gap:10px; background:#f9fafb; padding:8px; border-radius:8px; border:1px solid #e5e7eb">
              <div class="time-toggle-group" style="display:flex; background:#eee; padding:2px; border-radius:6px; flex:1">
                <button id="time-filter-off" class="time-btn active" style="flex:1; border:none; background:#fff; border-radius:4px; font-size:10px; padding:4px 0; cursor:pointer; font-weight:700; box-shadow:0 1px 2px rgba(0,0,0,0.1)">OFF</button>
                <button id="time-filter-min" class="time-btn" style="flex:1; border:none; background:transparent; border-radius:4px; font-size:10px; padding:4px 0; cursor:pointer; font-weight:700; color:#4b5563">MENIT</button>
                <button id="time-filter-hour" class="time-btn" style="flex:1; border:none; background:transparent; border-radius:4px; font-size:10px; padding:4px 0; cursor:pointer; font-weight:700; color:#4b5563">JAM</button>
              </div>
              <input type="number" id="comment-time-val" value="24" style="width:50px; border:1px solid #ddd; border-radius:4px; padding:3px; font-size:11px; text-align:center">
            </div>
            <div id="time-filter-desc" style="font-size:10px; color:#4b5563; font-weight:500; margin-top:6px; line-height:1.4">
              Komentar akan dikirim ke postingan terakhir <b>kapanpun</b>.
            </div>
          </div>

          <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #eee">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:#2ecc71; font-weight:700">
              <input type="checkbox" id="comment-use-jeda" style="width:auto"> ⏱️ Aktifkan Sistem Jeda
            </label>
            <div id="comment-jeda-config" style="display:none; margin-top:8px; background:#f0fff4; border:1px solid #c6f6d5; border-radius:8px; padding:10px">
              <div class="input-row" style="gap:8px">
                <div>
                  <label style="font-size:10px">Jeda Setiap (X) Komen</label>
                  <input id="comment-jeda-threshold" type="number" value="5" min="1">
                </div>
                <div>
                  <label style="font-size:10px">Lama Jeda (Menit)</label>
                  <input id="comment-jeda-time" type="number" value="5" min="1">
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="follow-stats-grid" style="margin-top:5px">
        <div class="stat-card"><div class="stat-num" id="comment-done">0</div><div class="stat-label">Sukses</div></div>
        <div class="stat-card"><div class="stat-num" id="comment-fail">0</div><div class="stat-label">Gagal</div></div>
        <div class="stat-card"><div class="stat-num" id="comment-skip">0</div><div class="stat-label">Skip</div></div>
        <div class="stat-card"><div class="stat-num" id="comment-total">0/0</div><div class="stat-label">Progres</div></div>
      </div>

      <div class="btn-row" style="margin-top:5px">
        <button class="btn btn-primary" style="flex:2; background:#2ecc71; border-color:#2ecc71" id="btn-start-comment">💬 Start Comment</button>
        <button class="btn btn-danger" id="btn-stop-comment" style="display:none">⏹ Stop</button>
      </div>
      <div class="progress-text" id="comment-status" style="font-weight:600; color:#27ae60; font-size:11px; text-align:center; min-height:16px"></div>
      
      <div class="card" style="margin-top:5px">
        <div class="card-title">Comment Reports</div>
        <div class="result-list" id="comment-logs" style="height:110px"></div>
      </div>
    </div>

    <div class="tab-content" id="tab-ocypus">
      <div class="card" style="border-left: 4px solid #8e44ad;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
          <div style="display:flex; align-items:center; gap:8px">
            <div class="card-title" style="margin:0; color:#8e44ad">FOLLOW RUNNER</div>
            <span class="m-lbl" style="background:#8e44ad; color:#fff; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:bold; text-transform:uppercase;">LIFETIME</span>
          </div>
          <button id="btn-oc-toggle-settings" class="btn-sm-txt" style="background:#f8f9fa; border:1px solid #eee; padding:2px 8px; font-size:9.5px">Configure Runner ↓</button>
        </div>
        
        <textarea id="oc-res" class="o-ta" style="height:90px; font-size:11px" placeholder="UIDs List..."></textarea>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; color:#374151; font-weight:600; margin-top:4px">
          <span>Antrean: <b id="oc-tot">0</b></span>
          <label style="margin:0; font-size:10px; color:#888"><input type="checkbox" id="oc-silence" style="width:auto; vertical-align:middle"> 🔇 Silence</label>
        </div>

        <div id="oc-runner-settings" style="display:none; margin-top:10px; border-top:1px dashed #eee; padding-top:10px">
          <div class="input-row" style="margin-bottom:8px; gap:6px">
            <div style="flex:1.2">
              <label style="font-size:9px">Method</label>
              <select id="oc-method" style="padding:4px">
                <option value="adap">Adaptive</option>
                <option value="burst">Burst</option>
                <option value="stag">Staggered</option>
                <option value="seq">Sequential</option>
              </select>
            </div>
            <div style="flex:1"><label style="font-size:9px">Min(ms)</label><input id="a-mn" type="number" value="300" style="padding:4px"></div>
            <div style="flex:1"><label style="font-size:9px">Max(ms)</label><input id="a-mx" type="number" value="300" style="padding:4px"></div>
            <div style="flex:1"><label style="font-size:9px; color:#e74c3c; font-weight:bold">Error</label><input id="oc-fail-limit" type="number" value="3" style="padding:4px; border-color:#fab1a0"></div>
            <div style="flex:1"><label style="font-size:9px; color:#f39c12; font-weight:bold">Skip</label><input id="oc-skip-limit" type="number" value="3" style="padding:4px; border-color:#f39c12"></div>
          </div>

          <div id="oc-sett-adap" class="oc-method-sett" style="display:flex; flex-direction:column; gap:6px; background:rgba(142,68,173,0.03); padding:6px; border-radius:6px; border:1px solid rgba(142,68,173,0.1)">
            <div style="display:flex; gap:6px">
              <div style="flex:1"><label style="font-size:9px">Start Wave (S)</label><input id="oc-wav-s" type="number" value="3" style="padding:4px"></div>
              <div style="flex:1"><label style="font-size:9px">Max Wave (M)</label><input id="oc-wav-m" type="number" value="3" style="padding:4px"></div>
              <div style="flex:1"><label style="font-size:9px">Gap (Sg) ms</label><input id="oc-wav-g" type="number" value="300" style="padding:4px"></div>
            </div>
          </div>

          <div id="oc-sett-burst" class="oc-method-sett" style="display:none; background:rgba(230,126,34,0.03); padding:6px; border-radius:6px; border:1px solid rgba(230,126,34,0.1)">
            <div style="display:flex; gap:6px">
              <div style="flex:1"><label style="font-size:9px">antrean</label><input id="b-bs" type="number" value="5" style="padding:4px"></div>
              <div style="flex:1"><label style="font-size:9px">CD(ms)</label><input id="b-cd" type="number" value="3000" style="padding:4px"></div>
            </div>
          </div>

          <div id="oc-sett-stag" class="oc-method-sett" style="display:none; background:rgba(52,152,219,0.03); padding:6px; border-radius:6px; border:1px solid rgba(52,152,219,0.1)">
            <div style="display:flex; gap:6px">
              <div style="flex:1"><label style="font-size:9px">antrean</label><input id="st-bs" type="number" value="5" style="padding:4px"></div>
              <div style="flex:1"><label style="font-size:9px">Stag(ms)</label><input id="st-sg" type="number" value="250" style="padding:4px"></div>
              <div style="flex:1"><label style="font-size:9px">CD(ms)</label><input id="st-cd" type="number" value="3000" style="padding:4px"></div>
            </div>
          </div>

          <div id="oc-sett-seq" class="oc-method-sett" style="display:none; background:rgba(46,204,113,0.03); padding:6px; border-radius:6px; border:1px solid rgba(46,204,113,0.1)">
            <div style="font-size:10px; color:#27ae60">Mode Sequential: Follow satu per satu dengan delay random.</div>
          </div>
        </div>

        </div> <!-- Closing card -->
        
        <div class="follow-stats-grid" id="oc-stat-bar" style="margin-top:8px">
          <div class="stat-card"><div class="stat-num" id="oc-ok" style="color:#22c55e">0</div><div class="stat-label">Sukses</div></div>
          <div class="stat-card"><div class="stat-num" id="oc-req" style="color:#3498db">0</div><div class="stat-label">Request</div></div>
          <div class="stat-card"><div class="stat-num" id="oc-er" style="color:#ef4444">0</div><div class="stat-label">Gagal</div></div>
          <div class="stat-card"><div class="stat-num" id="oc-prog">0</div><div class="stat-label">Total</div></div>
        </div>

        <div class="btn-row" style="margin-top:0px; align-items:center; gap:6px">
          <button class="btn btn-primary" id="btn-oc-run" style="flex:1.5; background:#8e44ad; font-weight:600; min-height:32px">🚀 FOLLOW</button>
          <div id="oc-timer" style="font-family:monospace; font-size:11px; font-weight:700; color:#111827; background:#f8f9fa; padding:4px 6px; border:1px solid #eee; border-radius:4px; min-width:60px; text-align:center; height:24px; display:flex; align-items:center; justify-content:center">00:00:00</div>
          <button class="btn btn-danger" id="btn-oc-stop" style="flex:unset; width:45px; min-height:32px">⏹</button>
        </div>
      



      <div class="card" style="margin-top:10px">
        <div class="card-title">Console Log</div>
        <div class="o-log" id="oc-log" style="height:250px; background:#1e1e1e; color:#00ff00; font-family:monospace; font-size:10px; overflow-y:auto; padding:8px; border-radius:6px; border:1px solid #333"></div>
      </div>
    </div>

    <div class="tab-content" id="tab-autosetup">
      <div class="card">
        <div class="card-title">Auto Setup Configuration</div>

        <div class="sect">0. Config Management</div>
        <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:12px; border:1px dashed rgba(255,255,255,0.1)">
          <div class="input-row" style="margin-bottom:8px">
            <div style="flex:2"><label style="font-size:10px;color:#1f2937">Pilih Config</label><select id="auto-config-list" style="font-size:11px"><option value="">-- Custom / New --</option></select></div>
            <div style="flex:0.5; display:flex; align-items:flex-end; gap:4px">
               <button class="btn btn-danger" id="btn-delete-config" style="padding:0; width:28px; height:24px; font-size:11px; display:flex; align-items:center; justify-content:center" title="Hapus Config">🗑️</button>
            </div>
          </div>
          <div class="input-row">
            <div style="flex:2"><label style="font-size:10px;color:#1f2937">Nama Config Baru</label><input id="auto-config-name" type="text" placeholder="Misal: Sport Style 1" style="font-size:11px; padding:4px"></div>
            <div style="flex:1; display:flex; align-items:flex-end">
               <button class="btn btn-primary" id="btn-save-named-config" style="width:100%; height:24px; font-size:10px; background:#27ae60; border:none">💾 Simpan</button>
            </div>
          </div>
        </div>
        
        <div class="sect">1. Post Feed Setup</div>
        <div class="input-row" style="margin-bottom:8px">
          <div><label>Folder Media</label><select id="auto-fd-folder"><option value="">-- Pilih Folder --</option></select></div>
          <div><label>Caption File</label><select id="auto-fd-caption"><option value="">-- Pilih File --</option></select></div>
        </div>
        <div class="input-row" style="margin-bottom:12px">
          <div><label>Count</label><input id="auto-fd-count" type="number" value="1"></div>
          <div><label>Delay (s)</label><input id="auto-fd-delay" type="number" value="30"></div>
        </div>

        <div class="sect">2. Profile Setup</div>
        <div class="input-row" style="margin-bottom:8px">
          <div><label>Avatar Folder</label><select id="auto-pr-folder"><option value="">-- Pilih Folder --</option></select></div>
          <div><label>Bio File</label><select id="auto-pr-bio"><option value="">-- Pilih File --</option></select></div>
        </div>

        <div class="sect">3. Story Setup</div>
        <div class="input-row" style="margin-bottom:8px">
          <div><label>Story Folder</label><select id="auto-st-folder"><option value="">-- Pilih Folder --</option></select></div>
          <div><label>Tipe Media</label><select id="auto-st-mediatype"><option value="mix">Acak (Foto & Vid)</option><option value="photo">Hanya Foto</option><option value="video">Hanya Video</option></select></div>
        </div>
        <div class="input-row" style="margin-bottom:8px">
          <div><label>Sticker Text</label><select id="auto-st-text"><option value="">-- Pilih File --</option></select></div>
          <div><label>Story Count</label><input id="auto-st-count" type="number" value="1"></div>
        </div>
        <div class="input-row" style="margin-bottom:8px">
          <div style="flex:1">
            <label>Target URL</label>
            <select id="auto-st-target">
              <option value="imo">IMO</option>
              <option value="clickdealer">ClickDealer</option>
              <option value="trafee">Trafee</option>
              <option value="setuplink">Setup Link</option>
              <option value="custom">Custom URL</option>
            </select>

            <input type="text" id="auto-st-custom-url" placeholder="https://..." style="display:none; width:100%; font-size:11px; margin-top:4px; padding:4px;" />
          </div>
          <div style="flex:1">
            <label>Shortlink Auto</label>
            <select id="auto-st-short-provider">
              <option value="none">Tanpa Shortlink</option>
              <option value="ix">ix.sk (Recommended)</option>
              <option value="ssur">ssur.cc</option>
              <option value="tinyurl">TinyURL</option>
              <option value="spoome">Spoo.me</option>
              <option value="bitly">Bitly Pro</option>
              <option value="tinyurl_api">TinyURL Pro</option>
            </select>
            <input type="password" id="auto-st-short-apikey" placeholder="API Key (Opsional)" style="display:none; width:100%; font-size:11px; margin-top:4px; padding:4px;" title="Isi jika pakai Bitly atau TinyURL Pro" />
          </div>
        </div>
        <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap">
          <label style="display:flex; align-items:center; gap:4px; font-size:11px"><input type="checkbox" id="auto-st-blur" style="width:auto"> Blur</label>
          <label style="display:flex; align-items:center; gap:4px; font-size:11px"><input type="checkbox" id="auto-st-mute" style="width:auto"> Mute</label>
        </div>

        <div class="sect">4. Highlight Setup</div>
        <div class="input-row" style="margin-bottom:8px">
          <div><label>Highlight Titles (.txt)</label><select id="auto-hl-titles"><option value="">-- Pilih File --</option></select></div>
        </div>
        <div style="margin-bottom:12px">
          <label style="display:flex; align-items:center; gap:4px; font-size:11px"><input type="checkbox" id="auto-hl-enabled" style="width:auto"> Enable Highlight (After Story)</label>
        </div>
      </div>

      <div class="progress-wrap" id="auto-prog-wrap" style="display:none; margin:10px 0"><div class="progress-bar" id="auto-bar"></div></div>
      <div class="progress-text" id="auto-status" style="text-align:center; font-weight:700; color:#833ab4; min-height:20px; font-size:11px; margin:5px 0"></div>
      <button class="btn btn-primary btn-full" id="btn-start-autosetup" style="background:linear-gradient(135deg,#6366f1,#a855f7)">🚀 Start Auto Setup</button>
    </div>
    <!-- VIEW STORY -->
    <div class="tab-content" id="tab-viewstory">
      <!-- Sub-Nav -->
      <div class="dm-tabs">
          <div class="dm-sub-tab active" data-vs-tab="vs-sub-target">🎯 Target</div>
          <div class="dm-sub-tab" data-vs-tab="vs-sub-set">⚙️ Setting</div>
      </div>

      <div class="dm-tab-container">
        <!-- SUB-TAB: TARGET -->
        <div class="dm-sub-content active" id="vs-sub-target">
          <div class="card">
            <div class="card-title">Target Source</div>
            <div class="btn-row" style="margin-bottom:10px; gap:6px">
              <button type="button" class="btn btn-secondary btn-sm active" id="btn-vs-mode-timeline" style="flex:1">Timeline / Feed</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-vs-mode-uuid" style="flex:1">Target UUID</button>
            </div>
            <input type="hidden" id="vs-mode-val" value="timeline">
            <div id="vs-uuid-area" style="display:none">
              <label>Daftar Target (Username atau UUID)</label>
              <textarea id="vs-targets" rows="6" placeholder="Satu target per baris..."></textarea>
            </div>
          </div>
        </div>

        <!-- SUB-TAB: SETTING -->
        <div class="dm-sub-content" id="vs-sub-set">
          <div class="card">
            <div class="card-title">Automation Settings</div>
            <div class="input-row" style="gap:8px">
              <div><label>Min Delay (ms)</label><input id="vs-delay-min" type="number" value="300"></div>
              <div><label>Max Delay (ms)</label><input id="vs-delay-max" type="number" value="500"></div>
            </div>
            <div class="input-row" style="gap:8px; margin-top:8px">
              <div><label>Limit Total Target</label><input id="vs-limit" type="number" value="200"></div>
              <div><label>Max Story / User</label><input id="vs-max-per-user" type="number" value="1"></div>
            </div>
            <div style="margin-top:8px">
              <label style="display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer; color:#666">
                <input type="checkbox" id="vs-do-like" style="width:auto"> ❤️ Like Story
              </label>
            </div>
            <div class="sect" style="margin: 12px 0 8px 0">Sleep Management</div>
            <div class="input-row" style="gap:8px">
              <div><label>Setelah N Target</label><input id="vs-sleep-after" type="number" value="50"></div>
              <div><label>Lama Sleep (s)</label><input id="vs-sleep-delay" type="number" value="30"></div>
            </div>
          </div>
        </div>
      </div>

      <div id="vs-prog-wrap" style="display:none; margin-top:10px">
        <div style="height:6px; background:#eee; border-radius:3px; overflow:hidden; margin-bottom:8px">
          <div id="vs-bar" style="height:100%; width:0%; background:linear-gradient(90deg,#833ab4,#fd1d1d); transition:width 0.3s"></div>
        </div>
        <div id="vs-status" style="text-align:center; font-size:11px; min-height:16px; color:#833ab4; font-weight:700"></div>
      </div>

      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-primary" style="flex:2" id="btn-start-vs">▶ Start View Story</button>
        <button class="btn btn-danger" id="btn-stop-vs" style="display:none">⏹ Stop</button>
      </div>

      <div id="vs-log-box" style="margin-top:15px; background:#fcfcfc; border:1px solid #eee; border-radius:8px; height:180px; overflow-y:auto; padding:8px; font-size:10px; box-shadow:inset 0 1px 3px rgba(0,0,0,0.05)">
        <div id="vs-log-empty" style="color:#aaa; text-align:center; margin-top:75px;">Belum ada aktivitas.</div>
      </div>
    </div>

    <!-- LOGS -->
    <div class="tab-content" id="tab-logs">
      <div class="card" style="display:flex; flex-direction:column; height:100%; min-height:300px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
          <div class="card-title" style="margin:0">System Logs</div>
          <button class="btn-sm-txt" id="btn-clear-syslogs" style="padding:2px 8px; font-size:9.5px">🗑️ Clear</button>
        </div>
        <div class="o-log" id="sys-log-box" style="flex:1; background:#1e1e1e; color:#00ff00; font-family:monospace; font-size:10px; overflow-y:auto; padding:8px; border-radius:6px; border:1px solid #333; white-space:pre-wrap; word-break:break-all;"></div>
      </div>
    </div>



      </div> <!-- end tab-content-container -->
    </div> <!-- end panel-body -->

    <div id="resize-handle">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 22H10v-2h10V10h2v12zm-4-4H6v-2h12v-12h2v14zm-4-4H2V2h12v12z"/></svg>
    </div>
    `;
  shadow.appendChild(panel);

  const toast = document.createElement('div');
  toast.className = 'toast';
  shadow.appendChild(toast);

  // File inputs
  const stFileInput = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*,video/*', style: 'display:none' });
  const fdFileInput = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*,video/*', style: 'display:none' });
  const prFileInput = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', style: 'display:none' });
  const fontFileInput = Object.assign(document.createElement('input'), { type: 'file', accept: '.ttf,.otf,.woff,.woff2', style: 'display:none' });
  shadow.append(stFileInput, fdFileInput, prFileInput, fontFileInput);

  // State
  let storyImageUrl = null, storyVideoFile = null, feedImageUrl = null, profilePicUrl = null, scrapedUsers = [], scrapingActive = false, autoSetupActive = false;
  let pillX = 0.5, pillY = 0.75; // fractional position 0-1
  let pillRotation = 0;          // degrees
  let pillScale = 1.0;           // multiplier
  let currentFontFamily = ''; // CSS font-family name for preview
  let currentFontFile = '';   // filename for server

  const $ = id => shadow.getElementById(id);
  const $$ = sel => shadow.querySelectorAll(sel);
  const showToast = (msg, type = '') => {
    toast.textContent = msg; toast.className = `toast show ${type}`;
    setTimeout(() => toast.className = 'toast', 3200);
  };
  const bg = (type, payload = {}) => new Promise((res, rej) => {
    chrome.runtime.sendMessage({ type, payload }, r => {
      if (chrome.runtime.lastError) return rej(new Error(chrome.runtime.lastError.message));
      if (!r?.success) return rej(new Error(r?.error || 'Error'));
      res(r.data);
    });
  });

  // ---- SMART HEARTBEAT DETECTOR ----
  // Tab Instagram selalu aktif di browser. Tab ini memantau kesiapan server lokal (127.0.0.1:7500).
  // Begitu server nyala, kirim sinyal 'SERVER_WAKEUP' ke background service worker agar langsung ON dan connect socket,
  // tanpa user perlu repot buka chrome://extensions dan reload manual.
  let _serverOnline = false;
  let _heartbeatTimer = null;

  async function checkServerHeartbeat() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${NODE_SERVER}/api/menu`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        if (!_serverOnline) {
          _serverOnline = true;
          try {
            chrome.runtime.sendMessage({ type: 'SERVER_WAKEUP' });
          } catch (e) { }
          refreshSession();
          if (typeof loadStorySettings === 'function') loadStorySettings();
          if (typeof loadFonts === 'function') loadFonts();
        }
      } else {
        _serverOnline = false;
      }
    } catch (e) {
      _serverOnline = false;
    } finally {
      // Jika server belum online, cek setiap 3 detik.
      // Jika server sudah online, cek santai setiap 15 detik.
      const nextDelay = _serverOnline ? 15000 : 3000;
      clearTimeout(_heartbeatTimer);
      _heartbeatTimer = setTimeout(checkServerHeartbeat, nextDelay);
    }
  }

  function startSmartHeartbeat() {
    setTimeout(checkServerHeartbeat, 2000);
  }

  // Listen for real-time updates from background (Scraper, Follow, etc.)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'RUNNING_TEXT_UPDATE') {
      const sMarquee = $('sess-marquee');
      if (sMarquee) {
        if (msg.payload && msg.payload.runningText) {
          sMarquee.innerHTML = `<marquee scrollamount="3" behavior="scroll" direction="left" style="vertical-align: middle;">🚀 ${msg.payload.runningText} 🚀</marquee>`;
        } else {
          sMarquee.innerHTML = '';
        }
      }
      return;
    }

    if (msg.type === 'SCRAPE_PROGRESS') {
      // Isolate scrape progress based on current active user session
      const activeUser = ($('sess-info').innerText.match(/@([a-zA-Z0-9._]+)/) || [])[1];
      if (activeUser && msg.payload && msg.payload.username && msg.payload.username.toLowerCase() !== activeUser.toLowerCase()) {
        return; // Ignore progress meant for another active session
      }

      let batch = msg.payload.users || [];
      if (batch.length === 0) return;

      // Respect Privacy Filter (PUB/PRIV/ALL)
      const filter = shadow.getElementById('sc-filter')?.value || 'all';
      if (filter === 'public') batch = batch.filter(u => !u.isPrivate);
      else if (filter === 'private') batch = batch.filter(u => u.isPrivate);

      if (batch.length === 0) return;

      batch.forEach(u => {
        if (!scrapedUsers.find(x => x.pk === u.pk)) {
          scrapedUsers.push(u);
          const resDiv = shadow.getElementById('sc-results');
          if (resDiv) {
            resDiv.style.display = 'block';
            const item = document.createElement('div');
            item.className = 'result-item';

            // Minimalist Post Labeling
            const scType = shadow.getElementById('sc-type')?.value;
            const isPostScrape = ['user_posts', 'location_posts'].includes(scType);
            const label = isPostScrape ? `Post ${scrapedUsers.length}` : `@${u.username}`;
            const privIcon = u.isPrivate ? ' 🔒' : '';

            item.innerHTML = `<span class="uname">${label}${privIcon}</span> <span class="pk">${u.pk}</span>`;
            resDiv.appendChild(item);
            resDiv.scrollTop = resDiv.scrollHeight;
          }
        }
      });

      const actDiv = shadow.getElementById('sc-actions');
      if (actDiv) actDiv.style.display = 'flex';

      const statusEl = shadow.getElementById('sc-status');
      if (statusEl) {
        statusEl.textContent = `Scraping... Hasil: ${scrapedUsers.length}`;
      }
    } else if (msg.type === 'PROXY_FETCH') {
      const { url, options } = msg.payload;
      fetch(url, options)
        .then(async r => {
          const text = await r.text();
          let json = null;
          try { json = JSON.parse(text); } catch (e) { }
          sendResponse({ success: true, data: { ok: r.ok, status: r.status, text, json } });
        })
        .catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep channel open for async response
    } else if (msg.type === 'FOLLOW_STOPPED') {
      window.ocypusRunning = false;
      $('btn-oc-run').disabled = false;
      $('btn-oc-stop').style.display = 'none';
      if (window.ocypusTimerIntv) clearInterval(window.ocypusTimerIntv);
      addOcLog('<i>Scheduler stopped.</i>');
    } else if (msg.type === 'SYS_LOG') {
      const payload = msg.payload;
      if (!payload) return;

      // Isolate syslog messages based on current active user session (multi-account/SessionBox safe)
      const activeUser = ($('sess-info').innerText.match(/@([a-zA-Z0-9._]+)/) || [])[1];
      if (activeUser && payload.username && payload.username !== '__global__' && payload.username.toLowerCase() !== activeUser.toLowerCase()) {
        return; // Ignore logs belonging to another active session in SessionBox
      }

      if (payload && (payload.type === 'task-update' || (payload.message && payload.message.startsWith('[@TASK_UPDATE@]')))) {
        try {
          const data = payload.type === 'task-update' ? payload.data : JSON.parse(payload.message.replace('[@TASK_UPDATE@]', ''));
          updateStatusUI(data);
        } catch (e) { }
      } else if (payload && payload.message) {
        const rawMsg = String(payload.message || '');

        // STRICT WHITELIST: Hanya log Story dan Feed yang diizinkan tampil live di menu System Logs!
        const isStoryLog = rawMsg.includes('[story]') || rawMsg.includes('[highlight]') || /Memulai Post Story|Mempersiapkan upload video|Memproses video|Mengunggah video|Mengunggah foto|Mempersiapkan foto|Upload custom video selesai|Berhasil diposting|Menambahkan story ke highlight|Berhasil menambahkan ke highlight|Menunggu/i.test(rawMsg);
        const isFeedLog = rawMsg.includes('[feed]') || /Memulai Post Feed|Memulai Bulk Feed|Mempersiapkan media feed|Mengunggah feed|Sukses posting feed|Semua postingan selesai|Menunggu jeda delay/i.test(rawMsg);

        // Fitur lain (View Story, DM, Like, Comment, Scraper, Convert ID, dll) 100% diabaikan dari menu System Logs
        const isOtherFeature = /view[-_]?story|\[DM|\[like|\[comment|\[scrape|convert|Menonton story|Melihat story|Watching stories|Found \d+ stories|Menemukan \d+ akun/i.test(rawMsg);

        if ((isStoryLog || isFeedLog) && !isOtherFeature) {
          appendSysLogEntry(rawMsg, payload.type);
        }
      }
    } else if (msg.type === 'TOGGLE_FLOATING_ICON') {
      const icon = shadow.getElementById('ocypus-floating-icon');
      if (icon) icon.style.display = msg.show ? 'flex' : 'none';
    } else if (msg.type === 'SERVER_CONNECTED') {
      _serverOnline = true;
      refreshSession();
      if (typeof loadStorySettings === 'function') loadStorySettings();
      if (typeof loadFonts === 'function') loadFonts();
    } else if (msg.type === 'OPEN_PANEL') {
      panel.classList.add('visible');
      refreshSession();
      if (typeof loadStorySettings === 'function') loadStorySettings();
      if (typeof loadFonts === 'function') loadFonts();
      if (typeof loadDmTemplates === 'function') loadDmTemplates();
      if (typeof loadSysLogs === 'function') loadSysLogs();
    }
  });

  // Floating Icon Initialization (Visible by default)
  const floatingIcon = document.createElement('div');
  floatingIcon.id = 'ocypus-floating-icon';
  floatingIcon.innerHTML = '🚀';
  floatingIcon.style.cssText = `
    position: fixed; bottom: 80px; left: 24px;
    width: 48px; height: 48px;
    background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 24px; color: white;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    cursor: pointer; z-index: 9999999; transition: transform 0.2s;
    pointer-events: all;
  `;
  floatingIcon.onmouseover = () => floatingIcon.style.transform = 'scale(1.1)';
  floatingIcon.onmouseout = () => floatingIcon.style.transform = 'scale(1)';
  floatingIcon.onclick = () => {
    panel.classList.add('visible');
    refreshSession();
    if (typeof loadStorySettings === 'function') loadStorySettings();
    if (typeof loadFonts === 'function') loadFonts();
    if (typeof loadDmTemplates === 'function') loadDmTemplates();
    if (typeof loadSysLogs === 'function') loadSysLogs();
  };
  shadow.appendChild(floatingIcon);

  chrome.storage.local.get(['showFloatingIcon'], (res) => {
    if (res.showFloatingIcon === false) floatingIcon.style.display = 'none';
    else floatingIcon.style.display = 'flex';
  });

  function updateStatusUI(data) {
    if (!data) return;

    // Handle View Story specific progress
    if (data.type === 'progress' || data.type === 'done' || data.type === 'error' || data.type === 'user-done') {
      const statusEl = $('vs-status');
      const barEl = $('vs-bar');
      const wrapEl = $('vs-prog-wrap');
      const logBox = $('vs-log-box');
      const btnStart = $('btn-start-vs');
      const btnStop = $('btn-stop-vs');

      if (data.type === 'progress') {
        if (wrapEl) wrapEl.style.display = 'block';
        if (logBox) logBox.style.display = 'block';
        if (statusEl) statusEl.textContent = `Memproses: ${data.current} / ${data.total} (${data.success} story)`;
        if (barEl && data.total) {
          const p = Math.min(100, (data.current / data.total) * 100);
          barEl.style.width = p + '%';
        }
      } else if (data.type === 'user-done') {
        if (logBox) {
          logBox.style.display = 'block';
          let color = data.ok ? '#22c55e' : (data.skip ? '#facc15' : '#ef4444');
          let icon = data.ok ? '✅' : (data.skip ? '⏭️' : '❌');
          let status = data.ok ? 'SUKSES' : (data.skip ? 'SKIP' : 'GAGAL');
          let countStr = data.count !== undefined ? ` (${data.count} story)` : '';

          logBox.innerHTML += `<div style="padding:4px 6px; border-bottom:1px solid #f5f5f5; color:#444; font-size:10px;">
              <span style="color:${color}; font-weight:800;">${icon} ${status}</span> : 
              <span style="font-weight:500;">@${data.username}${countStr}</span>
            </div>`;
          logBox.scrollTop = logBox.scrollHeight;
        }
      } else if (data.type === 'done' || data.type === 'error') {
        if (btnStart) {
          btnStart.disabled = false;
          btnStart.textContent = '▶ Start View Story';
        }
        if (btnStop) btnStop.style.display = 'none';
        if (data.type === 'done') {
          if (barEl) barEl.style.width = '100%';
          const successMsg = data.success !== undefined ? ` (${data.success} story sukses)` : '';
          if (statusEl) statusEl.textContent = '✅ ' + (data.message || 'Selesai!') + successMsg;
        } else {
          if (statusEl) statusEl.textContent = '❌ Error: ' + (data.message || 'Terjadi kesalahan');
        }
      }
      return; // Exit after handling vs status
    }

    const statusEl = $('auto-status');
    const barEl = $('auto-bar');
    const wrapEl = $('auto-prog-wrap');

    if (wrapEl) wrapEl.style.display = 'block';

    if (data.phase === 'done' || data.phase === 'error') {
      autoSetupActive = false;
      const btn = shadow.getElementById('btn-start-autosetup');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🚀 Start Auto Setup';
      }
      if (data.phase === 'done') {
        if (barEl) barEl.style.width = '100%';
        if (statusEl) statusEl.textContent = '✅ Selesai: ' + (data.message || 'Auto Setup Berhasil');
      } else {
        if (statusEl) statusEl.textContent = '❌ Error: ' + (data.message || 'Terjadi kesalahan');
      }
    } else {
      const phase = (data.phase || '').toUpperCase();
      const msgText = data.message || data.status || '';
      if (statusEl) statusEl.textContent = `[${phase}] ${msgText}`;
      if (barEl && data.total) {
        const p = Math.round((data.current / data.total) * 100);
        barEl.style.width = p + '%';
      }
    }
  }

  let lastSysLogEntry = { text: '', time: 0 };
  function appendSysLogEntry(message, type = 'info') {
    const box = shadow.getElementById('sys-log-box');
    if (!box) return;
    let cleanMsg = String(message)
      .replace(/\[story\]\s*/i, '')
      .replace(/\[feed\]\s*/i, '')
      .replace(/\[highlight\]\s*/i, '')
      .replace(/\[SYSTEM\]\s*/i, '')
      .trim();
    if (!cleanMsg) return;

    // Filter ketat: Sembunyikan pesan teknis/debugging dari System Logs
    if (/\[P\d\]|chunks|duration=|metadata|rupload|uploadFinish|configureToStory|validate_reel_url|isDirectStory|JSON|\{|\}|\[vid-unique\]|Menyiapkan overlay stiker/i.test(cleanMsg)) {
      return;
    }

    // Normalisasi teks agar selalu ringkas dan rapi
    if (cleanMsg.startsWith('Mempersiapkan upload video:')) {
      cleanMsg = 'Mempersiapkan upload video';
    } else if (cleanMsg.includes('Memproses video (Blur & Stickers)')) {
      cleanMsg = 'Memproses video...';
    } else if (cleanMsg.includes('Mengunggah video chunks')) {
      cleanMsg = 'Mengunggah video';
    } else if (cleanMsg.startsWith('Menunggu indexing')) {
      cleanMsg = 'Menunggu';
    }

    // Deduplikasi ketat: jika baris identik masuk dalam rentang 2.5 detik, abaikan
    const now = Date.now();
    if (lastSysLogEntry.text === cleanMsg && (now - lastSysLogEntry.time) < 2500) {
      return;
    }
    lastSysLogEntry = { text: cleanMsg, time: now };

    // Bersihkan placeholder jika masih ada
    if (box.innerText.includes('Siap untuk aktivitas baru') || box.innerText.includes('Belum ada aktivitas')) {
      box.innerHTML = '';
    }

    const d = new Date();
    const time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
    const color = type === 'err' ? '#ff5555' : (type === 'ok' ? '#55ff55' : (type === 'warn' ? '#ffaa00' : '#00ff00'));
    const line = document.createElement('div');
    line.style.color = color;
    line.style.marginBottom = '2px';
    line.textContent = `[${time}] ${cleanMsg}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  async function resetSysLogs(actionName = '') {
    const box = shadow.getElementById('sys-log-box');
    if (box) {
      box.innerHTML = actionName ? `<div style="color:#833ab4;font-weight:600;margin-bottom:4px;">--- Memulai ${actionName} ---</div>` : '';
    }
    lastSysLogEntry = { text: '', time: 0 };
    try {
      const session = await bg('GET_SESSION');
      const u = session?.username || '__global__';
      await fetch(`${NODE_SERVER}/api/extension/logs/clear?username=${encodeURIComponent(u)}`, { method: 'POST' });
    } catch (e) { }
  }

  // Init SysLog clear button
  shadow.getElementById('btn-clear-syslogs')?.addEventListener('click', async () => {
    await resetSysLogs();
  });

  $('btn-close').addEventListener('click', () => panel.classList.remove('visible'));

  // Initial load when constructed
  setTimeout(async () => {
    loadBulkOptions();
  }, 1500);

  // ---- Load initial syslogs ----
  async function loadSysLogs() {
    const box = shadow.getElementById('sys-log-box');
    if (!box) return;
    // Jangan menumpahkan 200 logs lama ke UI saat buka panel / reload.
    // Tampilkan placeholder bersih hanya jika box belum ada aktivitas berjalan.
    if (!box.children.length || box.children.length === 0) {
      box.innerHTML = '<div style="color:#888;text-align:center;margin-top:60px;font-style:italic;">Siap untuk aktivitas baru.</div>';
    }
  }

  // ---- Drag panel ----
  let isDragging = false, ox = 0, oy = 0;

  const handleDragStart = (e) => {
    if (e.target.closest('#btn-close')) return; // ignore close button
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const r = panel.getBoundingClientRect();
    ox = clientX - r.left;
    oy = clientY - r.top;
    panel.style.transition = 'none';
  };

  $('drag-handle').addEventListener('mousedown', handleDragStart);
  $('drag-handle').addEventListener('touchstart', handleDragStart, { passive: true });

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    panel.style.left = Math.max(0, Math.min(clientX - ox, window.innerWidth - panel.offsetWidth)) + 'px';
    panel.style.top = Math.max(0, Math.min(clientY - oy, window.innerHeight - panel.offsetHeight)) + 'px';
  };

  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('touchmove', handleDragMove, { passive: true });

  const handleDragEnd = () => isDragging = false;
  document.addEventListener('mouseup', handleDragEnd);
  document.addEventListener('touchend', handleDragEnd);

  // ---- Resize panel ----
  let isResizing = false, startW = 0, startH = 0, startX = 0, startY = 0;

  const handleResizeStart = (e) => {
    isResizing = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startW = panel.offsetWidth;
    startH = panel.offsetHeight;
    startX = clientX;
    startY = clientY;
    panel.style.transition = 'none';
    e.stopPropagation(); // Prevent drag from firing
    e.preventDefault(); // Prevent text selection
  };

  $('resize-handle').addEventListener('mousedown', handleResizeStart);
  $('resize-handle').addEventListener('touchstart', handleResizeStart, { passive: false });

  const handleResizeMove = (e) => {
    if (!isResizing) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Calculate new dimensions (Minimum bounds: 250x300 for UI integrity)
    const newW = Math.max(250, startW + (clientX - startX));
    const newH = Math.max(300, startH + (clientY - startY));

    // Constrain to window bounds
    const maxW = window.innerWidth - panel.getBoundingClientRect().left;
    const maxH = window.innerHeight - panel.getBoundingClientRect().top;

    panel.style.width = Math.min(newW, maxW) + 'px';
    panel.style.height = Math.min(newH, maxH) + 'px';
  };

  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('touchmove', handleResizeMove, { passive: false });

  const handleResizeEnd = () => isResizing = false;
  document.addEventListener('mouseup', handleResizeEnd);
  document.addEventListener('touchend', handleResizeEnd);

  // ---- Tabs ----
  shadow.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      shadow.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      shadow.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.tab;
      const tc = $('tab-' + mode);
      if (tc) tc.classList.add('active');

      // Removed on-demand fetch for Profile Data to prevent auto-error
      if (mode === 'profile') {
        // Just clear status, wait for manual click
        $('pr-status').textContent = '';
      } else if (mode === 'dm') {
        loadDmTemplates();
        loadDmMediaFolders();
      } else if (mode === 'autosetup') {
        initAutoSetup();
      } else {
        // Clear status when leaving tab if it was an error
        if ($('pr-status').textContent.includes('⚠️')) $('pr-status').textContent = '';
      }
    });
  });

  // ---- TAB VISIBILITY (PERSISTENCE & SYNC) ----
  const applyTabVisibility = (hiddenTabs = []) => {
    shadow.querySelectorAll('.tabs .tab').forEach(tab => {
      const tabName = tab.dataset.tab;
      if (hiddenTabs.includes(tabName)) {
        tab.style.display = 'none';
      } else {
        tab.style.display = '';
      }
    });

    // Jika tab aktif saat ini disembunyikan, pindahkan ke tab pertama yang masih tampak
    const activeTab = shadow.querySelector('.tabs .tab.active');
    if (activeTab && activeTab.style.display === 'none') {
      const firstVisible = Array.from(shadow.querySelectorAll('.tabs .tab')).find(t => t.style.display !== 'none');
      if (firstVisible) firstVisible.click();
    }
  };

  // Muat status sembunyikan/tampilkan dari storage
  chrome.storage.local.get(['hidden_panel_tabs'], (res) => {
    if (res && res.hidden_panel_tabs) {
      applyTabVisibility(res.hidden_panel_tabs);
    }
  });

  // Dengarkan perubahan realtime dari popup via storage
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.hidden_panel_tabs) {
      applyTabVisibility(changes.hidden_panel_tabs.newValue || []);
    }
  });

  // Dengarkan juga pesan langsung dari popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'UPDATE_PANEL_TABS') {
      applyTabVisibility(msg.hiddenTabs || []);
    }
  });

  // --- DM SUB-TAB LOGIC ---
  shadow.querySelectorAll('.dm-sub-tab[data-dm-tab]').forEach(stab => {
    stab.addEventListener('click', () => {
      const parent = stab.closest('.tab-content');
      parent.querySelectorAll('.dm-sub-tab').forEach(t => t.classList.remove('active'));
      parent.querySelectorAll('.dm-sub-content').forEach(c => c.classList.remove('active'));
      stab.classList.add('active');
      const targetId = stab.dataset.dmTab;
      const tc = $(targetId);
      if (tc) tc.classList.add('active');
    });
  });

  // --- VIEW STORY SUB-TAB LOGIC ---
  shadow.querySelectorAll('.dm-sub-tab[data-vs-tab]').forEach(stab => {
    stab.addEventListener('click', () => {
      const parent = stab.closest('.tab-content');
      parent.querySelectorAll('.dm-sub-tab').forEach(t => t.classList.remove('active'));
      parent.querySelectorAll('.dm-sub-content').forEach(c => c.classList.remove('active'));
      stab.classList.add('active');
      const targetId = stab.dataset.vsTab;
      const tc = $(targetId);
      if (tc) tc.classList.add('active');
    });
  });

  // --- LIKE RUNNER SUB-TAB LOGIC ---
  shadow.querySelectorAll('.dm-sub-tab[data-like-tab]').forEach(stab => {
    stab.addEventListener('click', () => {
      const parent = stab.closest('.tab-content');
      parent.querySelectorAll('.dm-sub-tab').forEach(t => t.classList.remove('active'));
      parent.querySelectorAll('.dm-sub-content').forEach(c => c.classList.remove('active'));
      stab.classList.add('active');
      const targetId = stab.dataset.likeTab;
      const tc = $(targetId);
      if (tc) tc.classList.add('active');
    });
  });

  // --- SC TABS LOGIC (Scraper / Convert ID) ---
  shadow.querySelectorAll('.sc-tabs').forEach(container => {
    container.addEventListener('click', (e) => {
      const tab = e.target.closest('.sc-sub-tab');
      if (!tab) return;
      container.querySelectorAll('.sc-sub-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.dataset.scTab;
      shadow.querySelectorAll('.sc-sub-content').forEach(c => c.classList.remove('active'));
      $(targetId)?.classList.add('active');
    });
  });

  // --- CONVERT ID LOGIC ---
  let convMode = 'u2i'; // u2i or i2u

  $('btn-mode-u2i')?.addEventListener('click', () => {
    convMode = 'u2i';
    $('btn-mode-u2i').classList.add('active');
    $('btn-mode-i2u').classList.remove('active');
    $('conv-label').textContent = 'Mode: User to ID (Input Username)';
    $('conv-target').placeholder = 'Contoh: @username1\n@username2';
  });

  $('btn-mode-i2u')?.addEventListener('click', () => {
    convMode = 'i2u';
    $('btn-mode-i2u').classList.add('active');
    $('btn-mode-u2i').classList.remove('active');
    $('conv-label').textContent = 'Mode: ID to User (Input UUID)';
    $('conv-target').placeholder = 'Contoh: 123456789\n987654321';
  });

  $('btn-convert-id')?.addEventListener('click', async () => {
    const inp = $('conv-target').value || '';
    const lines = inp.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return showToast('Masukan data target dahulu.', 'err');

    const btn = $('btn-convert-id');
    const resArea = $('conv-results');
    const status = $('conv-status');
    btn.disabled = true;
    resArea.value = '';
    let results = [];

    for (let i = 0; i < lines.length; i++) {
      const item = lines[i].replace('@', '');
      status.textContent = `⏳ Memproses (${i + 1}/${lines.length}): ${item}...`;

      try {
        let resolved = null;
        if (convMode === 'i2u') {
          // ID to User
          const info = await bg('GET_USER_INFO', { userId: item });
          if (info && info.username) resolved = { username: info.username, pk: item };
        } else {
          // User to ID
          const info = await bg('RESOLVE_USER_ID', { input: item });
          if (info && info.userId) resolved = { username: item, pk: info.userId };
        }

        if (resolved) {
          const line = (convMode === 'u2i') ? resolved.pk : resolved.username;
          results.push(line);
          resArea.value = results.join('\n');
          resArea.scrollTop = resArea.scrollHeight;
        } else {
          results.push(`[NOT_FOUND]`);
          resArea.value = results.join('\n');
        }
      } catch (e) {
        results.push(`[ERROR]`);
        resArea.value = results.join('\n');
      }
      await new Promise(r => setTimeout(r, 800));
    }

    status.textContent = `✅ Selesai konversi ${lines.length} item.`;
    btn.disabled = false;
  });

  $('btn-copy-conv')?.addEventListener('click', () => {
    const val = $('conv-results').value;
    if (!val) return;
    navigator.clipboard.writeText(val);
    showToast('Hasil berhasil disalin ke clipboard!');
  });

  // --- COMMENT RUNNER SUB-TAB LOGIC ---
  shadow.querySelectorAll('.dm-sub-tab[data-comment-tab]').forEach(stab => {
    stab.addEventListener('click', () => {
      const parent = stab.closest('.tab-content');
      parent.querySelectorAll('.dm-sub-tab').forEach(t => t.classList.remove('active'));
      parent.querySelectorAll('.dm-sub-content').forEach(c => c.classList.remove('active'));
      stab.classList.add('active');
      const targetId = stab.dataset.commentTab;
      const tc = $(targetId);
      if (tc) tc.classList.add('active');
    });
  });

  // --- VIEW STORY MODE TOGGLE (BUTTON TABS LIKE CONVERT ID) ---
  let vsCurrentMode = 'timeline';
  $('btn-vs-mode-timeline')?.addEventListener('click', () => {
    vsCurrentMode = 'timeline';
    $('btn-vs-mode-timeline').classList.add('active');
    $('btn-vs-mode-uuid').classList.remove('active');
    const valInput = $('vs-mode-val');
    if (valInput) valInput.value = 'timeline';
    const uuidArea = $('vs-uuid-area');
    if (uuidArea) uuidArea.style.display = 'none';
  });

  $('btn-vs-mode-uuid')?.addEventListener('click', () => {
    vsCurrentMode = 'uuid';
    $('btn-vs-mode-uuid').classList.add('active');
    $('btn-vs-mode-timeline').classList.remove('active');
    const valInput = $('vs-mode-val');
    if (valInput) valInput.value = 'uuid';
    const uuidArea = $('vs-uuid-area');
    if (uuidArea) uuidArea.style.display = 'block';
  });

  // --- START VIEW STORY ---
  $('btn-start-vs').addEventListener('click', async () => {
    const mode = vsCurrentMode || $('vs-mode-val')?.value || 'timeline';
    const config = {
      mode,
      limit: $('vs-limit').value,
      delayMin: $('vs-delay-min').value,
      delayMax: $('vs-delay-max').value,
      doLike: $('vs-do-like').checked,
      maxPerUser: $('vs-max-per-user').value,
      sleepAfter: $('vs-sleep-after').value,
      sleepDelay: $('vs-sleep-delay').value,
      targetList: $('vs-targets').value
    };

    if (mode === 'uuid' && !config.targetList.trim()) {
      showToast('⚠️ Masukkan daftar target UUID/Username!', 'err');
      return;
    }

    $('btn-start-vs').disabled = true;
    try {
      const session = await bg('GET_SESSION');
      const resp = await fetch(`${NODE_SERVER}/api/extension/task/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'viewstory.js',
          env: { VIEW_STORY_CONFIG: JSON.stringify(config) },
          session: session
        })
      });

      const data = await resp.json();
      if (!data.ok) throw new Error(data.error);

      const logBox = $('vs-log-box');
      if (logBox) {
        logBox.innerHTML = '';
        logBox.style.display = 'block';
      }

      $('vs-status').textContent = 'Mempersiapkan tools...';
      $('btn-start-vs').disabled = true;
      $('btn-start-vs').textContent = '⏳ Task Running...';
      $('btn-stop-vs').style.display = 'flex';
    } catch (err) {
      showToast('Error: ' + err.message, 'err');
      $('btn-start-vs').disabled = false;
      $('btn-start-vs').textContent = '▶ Start View Story';
      $('btn-stop-vs').style.display = 'none';
    }
  });

  $('btn-stop-vs').addEventListener('click', async () => {
    try {
      const session = await bg('GET_SESSION');
      await fetch(`${NODE_SERVER}/api/extension/task/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'viewstory.js',
          username: session ? session.username : null
        })
      });
      $('btn-start-vs').disabled = false;
      $('btn-start-vs').textContent = '▶ Start View Story';
      $('btn-stop-vs').style.display = 'none';
      $('vs-status').textContent = 'Task dihentikan oleh user.';
    } catch (err) { }
  });


  // --- DM LINK TOGGLE (Disabled) ---

  // ---- DM Template Loader ----
  async function loadDmTemplates() {
    const sel = $('dm-template-select');
    if (!sel) return;
    const current = sel.value;
    try {
      const files = await bg('GET_DM_TEMPLATES');
      sel.innerHTML = '<option value="">✏️ Manual (ketik di bawah)</option>';
      (files || []).forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = '📄 ' + f.replace(/\.txt$/i, '');
        sel.appendChild(opt);
      });
      if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
    } catch (e) { /* server mungkin tidak aktif */ }
  }

  // ---- DM Media Folder Loader ----
  async function loadDmMediaFolders() {
    const sel = $('dm-media-folder');
    if (!sel) return;
    const current = sel.value;
    try {
      const folders = await bg('GET_MEDIA_FOLDERS');
      sel.innerHTML = '<option value="">-- Tanpa Media (Teks saja) --</option>';
      (folders || []).forEach(f => {
        const o = document.createElement('option');
        o.value = f.path || f;
        o.textContent = '📁 ' + (f.name || (f.path ? f.path.split('/').pop() : f));
        sel.appendChild(o);
      });
      if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
    } catch (e) { }
  }

  // Template & Settings change handlers
  shadow.addEventListener('change', async (e) => {
    // ⏱️ Toggle Jeda Config (DM)
    if (e.target.id === 'dm-use-jeda') {
      const cfg = $('dm-jeda-config');
      if (cfg) cfg.style.display = e.target.checked ? 'block' : 'none';
      return;
    }

    // ⏱️ Toggle Jeda Config (Like)
    if (e.target.id === 'like-use-jeda') {
      const cfg = $('like-jeda-config');
      if (cfg) cfg.style.display = e.target.checked ? 'block' : 'none';
      return;
    }

    // ⏱️ Toggle Jeda Config (Comment)
    if (e.target.id === 'comment-use-jeda') {
      const cfg = $('comment-jeda-config');
      if (cfg) cfg.style.display = e.target.checked ? 'block' : 'none';
      return;
    }

    if (e.target.id !== 'dm-template-select') return;
    const filename = e.target.value;
    const ta = $('dm-message');
    const badge = $('dm-tpl-badge');
    if (!filename) {
      ta.disabled = false;
      ta.style.opacity = '1';
      ta.value = '';
      ta.placeholder = 'Halo! 👋\nKami hadir untuk Anda!\n|\nHai, ada yang bisa dibantu? 😊';
      badge.style.display = 'none';
      return;
    }
    try {
      const content = await bg('GET_DM_TEMPLATE', { filename });
      ta.value = content;
      ta.disabled = true;
      ta.style.opacity = '0.7';
      badge.style.display = 'block';
    } catch (err) {
      ta.value = '';
      ta.disabled = false;
      ta.style.opacity = '1';
    }
  });

  // OCYPUS PRO LOGIC
  let ocState = {
    running: false,
    ok: 0,
    requested: 0,
    er: 0,
    consecutiveFails: 0,
    consecutiveSkips: 0,
    consecutiveNetworkErrors: 0,
    cooldownUntil: 0,
    sC: 0,
    index: 0,
    startTime: 0,
    timerInterval: null
  };

  function ocLog(m, c) {
    const p = $('oc-log'); if (!p) return;
    const d = document.createElement('div');
    d.style.color = c || '#00ff00';
    d.innerText = '> ' + m;
    p.prepend(d);
    if (p.children.length > 100) p.lastChild.remove();
  }
  function ocUpdateTimer() {
    const elapsed = Date.now() - ocState.startTime;
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    const el = $('oc-timer');
    if (el) el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  let ocKeepAliveCtx = null;
  function ocStartKeepAlive() {
    try {
      if (!ocKeepAliveCtx || ocKeepAliveCtx.state === 'closed') {
        ocKeepAliveCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ocKeepAliveCtx.state === 'suspended') {
        ocKeepAliveCtx.resume();
      }
      if (!ocKeepAliveCtx._osc) {
        const osc = ocKeepAliveCtx.createOscillator();
        const gain = ocKeepAliveCtx.createGain();
        gain.gain.value = 0.00001; // Silent audio: tab tetap berstatus aktif di Chrome sehingga timer 300ms tidak dicekik ke 1000ms saat di background
        osc.connect(gain);
        gain.connect(ocKeepAliveCtx.destination);
        osc.start();
        ocKeepAliveCtx._osc = osc;
      }
    } catch (e) { }
  }

  function ocStopKeepAlive() {
    try {
      if (ocKeepAliveCtx) {
        if (ocKeepAliveCtx._osc) {
          try { ocKeepAliveCtx._osc.stop(); } catch (e) { }
          ocKeepAliveCtx._osc = null;
        }
        ocKeepAliveCtx.close().catch(() => {});
        ocKeepAliveCtx = null;
      }
    } catch (e) { }
  }

  function ocStopRunner(reason = 'finished') {
    ocState.running = false;
    ocStopKeepAlive();
    if (ocState.timerInterval) { clearInterval(ocState.timerInterval); ocState.timerInterval = null; }
    if (reason === 'finished') {
      ocSnd('finished');
      $('btn-oc-run').innerHTML = '✅ SELESAI';
      $('btn-oc-run').style.background = '#22c55e';
    } else {
      $('btn-oc-run').innerHTML = '🚀 FOLLOW';
      $('btn-oc-run').style.background = '#8e44ad';
    }
  }
  function ocSnd(type = 'success') {
    if ($('oc-silence') && $('oc-silence').checked) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (type === 'success') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'fail') {
        // Pistol/Gunshot sound (Noise) - From Standalone
        const bufferSize = audioCtx.sampleRate * 0.2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        noise.connect(filter); filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
      } else if (type === 'finished') {
        [880, 1100, 1320].forEach((freq, i) => {
          const o2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
          o2.connect(g2); g2.connect(audioCtx.destination);
          o2.type = 'sine';
          o2.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.2);
          g2.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.2);
          g2.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + i * 0.2 + 0.05);
          g2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + i * 0.2 + 0.5);
          o2.start(audioCtx.currentTime + i * 0.2); o2.stop(audioCtx.currentTime + i * 0.2 + 0.5);
        });
      }
    } catch (e) { }
  }

  // Standalone 4-Step Error Handling Integration
  function categorizeError(error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('feedback_required') || msg.includes('checkpoint') || msg.includes('challenge') || msg.includes('login_required') || msg.includes('login') || msg.includes('verifikasi') || msg.includes('spam') || msg.includes('block') || msg.includes('try again later')) {
      return { type: 'CRITICAL', stop: true };
    }
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('fetch') || msg.includes('socket') || msg.includes('connreset') || msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('enotfound')) {
      return { type: 'NETWORK', stop: false, retryable: true };
    }
    if (msg.includes('not found') || msg.includes('user not found') || msg.includes('invalid user') || msg.includes('tidak ditemukan')) {
      return { type: 'NOT_FOUND', stop: false, skip: true };
    }
    if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('429')) {
      return { type: 'RATE_LIMIT', stop: false, cooldown: true };
    }
    return { type: 'NORMAL', stop: false };
  }

  async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 2000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try { return await fn(); } catch (error) {
        lastError = error;
        const category = categorizeError(error);
        if (category.stop || category.type !== 'NETWORK') throw error;
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        ocLog(`🌐 Network error, retry ${i + 1}/${maxRetries} in ${Math.round(delay)}ms...`, 'orange');
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  async function checkCooldown() {
    const now = Date.now();
    if (now < ocState.cooldownUntil) {
      const waitTime = Math.ceil((ocState.cooldownUntil - now) / 1000);
      ocLog(`⏳ Cooldown: ${waitTime}s remaining...`, '#e74c3c');
      await new Promise(r => setTimeout(r, ocState.cooldownUntil - now));
    }
  }

  function handleRateLimit() {
    ocState.consecutiveNetworkErrors++;
    if (ocState.consecutiveNetworkErrors >= 5) {
      ocState.cooldownUntil = Date.now() + 300000; // 5 mins
      ocLog(`⚠️ Terlalu banyak error, cooldown 5 menit`, '#e74c3c');
      return true;
    }
    return false;
  }

  function resetErrorCounters() {
    ocState.consecutiveNetworkErrors = 0;
  }

  function ocUpStats() {
    const list = $('oc-res').value.split('\n').filter(l => l.trim() !== '');
    const current = ocState.index;
    const total = list.length;
    $('oc-ok').innerText = ocState.ok;
    $('oc-req').innerText = ocState.requested;
    $('oc-er').innerText = ocState.er;
    const progressText = `${current} / ${total}`;
    if ($('oc-prog')) $('oc-prog').innerText = progressText;
    if ($('oc-tot')) $('oc-tot').innerText = progressText;
  }
  function ocTrim(uid) {
    // Disabled for index-based system to avoid UI lag
    // ocState.index increments in runners instead
  }

  // No bypass, substituted with consecutive failure stop

  async function ocFollowOne(uid, initialPriv = false) {
    try {
      // await checkCooldown(); // Bypass fitur tunggu ala beta9

      const result = await (async () => {
        const res = await bg('START_FOLLOW_SINGLE', { userId: uid.trim() });

        // Server returns { ok: true, result: { friendship_status: ... } }
        const data = res.result || res;
        let isReq = initialPriv || data.requested || data.outgoing_request;

        if (data.friendship_status) {
          if (data.friendship_status.outgoing_request) isReq = true;
          if (data.friendship_status.following === false && data.friendship_status.is_private === true) isReq = true;
        }
        return { ok: true, isPrivate: isReq };
      })();

      // Success Logic
      if (result.isPrivate) {
        ocState.requested++;
        ocLog('✅ REQUEST : ' + uid.trim(), '#3498db');
      } else {
        ocState.ok++;
        ocLog('✅ SUKSES : ' + uid.trim(), '#2ecc71');
      }

      ocState.consecutiveFails = 0;
      ocState.consecutiveSkips = 0;
      resetErrorCounters();
      ocUpStats();
      ocSnd('success');

      return { ok: true, uid: uid.trim(), isPrivate: result.isPrivate };

    } catch (error) {
      const category = categorizeError(error);
      const msg = (error.message || '').toLowerCase();

      // 1. Critical Error - Stop
      if (category.stop) {
        ocSnd('fail');
        ocLog(`🛑 STOP: TERDETEKSI BLOKIR/LOGIN/SPAM (${msg})`, 'red');
        ocStopRunner('stopped');
        return { ok: false, st: 'stopped' };
      }

      // 2. Not Found - Skip
      if (category.type === 'NOT_FOUND') {
        ocState.consecutiveSkips++;
        ocLog(`⏭️ SKIP: USER TIDAK ADA (${uid})`, 'orange');

        const skipLimit = parseInt($('oc-skip-limit').value) || 5;
        if (ocState.consecutiveSkips >= skipLimit) {
          ocLog(`BERHENTI: ${skipLimit} Skip Beruntun!`, 'red');
          ocState.running = false;
          ocStopRunner('stopped');
          return { ok: false, st: 'stopped' };
        }
        return { ok: false, st: 'skipped' };
      }

      // 3. Rate Limit / Network - Trigger Cooldown logic
      if (category.type === 'RATE_LIMIT' || category.type === 'NETWORK') {
        handleRateLimit();
      }

      // 4. Default Fail (Count towards consecutive failures)
      ocState.consecutiveFails++;
      ocState.er++;
      ocUpStats();
      ocSnd('fail');
      ocLog('❎ GAGAL : ' + uid.trim(), '#ff9800');

      const limit = parseInt($('oc-fail-limit').value) || 3;
      if (ocState.consecutiveFails >= limit) {
        ocLog(`BERHENTI: ${limit} Gagal Beruntun!`, 'red');
        ocState.running = false;
        ocStopRunner('stopped');
        return { ok: false, st: 'stopped' };
      }
      return { ok: false, uid: uid.trim(), st: msg };
    }
  }




  // RUNNER
  $('oc-method').onchange = (e) => {
    $$('.oc-method-sett').forEach(el => el.style.display = 'none');
    $('oc-sett-' + e.target.value).style.display = 'flex';
  };

  async function runSeq() {
    ocLog('[SEQUENTIAL] START...', '#2ecc71');
    const list = $('oc-res').value.split('\n').filter(l => l.trim() !== '');
    while (ocState.running && ocState.index < list.length) {
      const line = list[ocState.index].trim();
      const [uid, priv] = line.split(':');
      await ocFollowOne(uid, priv === 'priv');


      ocState.index++;
      ocUpStats();

      if (ocState.running && ocState.index < list.length) {
        let v1 = parseInt($('s-d1').value), v2 = parseInt($('s-d2').value);
        let d1 = isNaN(v1) ? 1000 : v1, d2 = isNaN(v2) ? 2000 : v2;
        await new Promise(r => setTimeout(r, d1 + Math.random() * (d2 - d1)));
      }
    }
    ocStopRunner('finished');
    ocLog('DONE!', '#2ecc71');
  }
  async function runBurst() {
    const bs = parseInt($('b-bs').value) || 5;
    ocLog('[BURST] START...', '#e67e22');
    const list = $('oc-res').value.split('\n').filter(l => l.trim() !== '');
    while (ocState.running && ocState.index < list.length) {
      const batch = list.slice(ocState.index, ocState.index + bs);
      ocLog('Mengirim antrean (' + batch.length + ')...', '#e67e22');
      const rls = await Promise.all(batch.map(line => {
        const [uid, priv] = line.split(':');
        return ocFollowOne(uid, priv === 'priv');
      }));


      ocState.index += batch.length;
      ocUpStats();

      if (rls.some(r => r.st === 'stopped')) break;
      if (ocState.running && ocState.index < list.length) {
        let v = parseInt($('b-cd').value);
        await new Promise(r => setTimeout(r, isNaN(v) ? 3000 : v));
      }
    }
    ocStopRunner('finished');
    ocLog('DONE!', '#e67e22');
  }
  async function runStag() {
    const bs = parseInt($('st-bs') ? $('st-bs').value : 5) || 5;
    const sg = parseInt($('st-sg').value) || 250;
    ocLog('[STAGGERED] START...', '#3498db');
    const list = $('oc-res').value.split('\n').filter(l => l.trim() !== '');
    while (ocState.running && ocState.index < list.length) {
      const batch = list.slice(ocState.index, ocState.index + bs);
      const rls = await Promise.all(batch.map((line, idx) => {
        const [uid, priv] = line.split(':');
        return new Promise(r => setTimeout(r, idx * sg)).then(() => ocFollowOne(uid, priv === 'priv'));
      }));


      ocState.index += batch.length;
      ocUpStats();

      if (rls.some(r => r.st === 'stopped')) break;
      if (ocState.running && ocState.index < list.length) {
        let v = parseInt($('st-cd').value);
        await new Promise(r => setTimeout(r, isNaN(v) ? 3000 : v));
      }
    }
    ocStopRunner('finished');
    ocLog('DONE!', '#3498db');
  }
  async function runAdap() {
    let bs = parseInt($('oc-wav-s').value) || 3;
    let mx = parseInt($('oc-wav-m').value) || 5;
    let sgInput = parseInt($('oc-wav-g').value);
    let sg = isNaN(sgInput) ? 300 : sgInput;
    ocLog('[ADAPTIVE] START...', '#9b59b6');
    let dInput = parseInt($('a-mn').value);
    let delay = isNaN(dInput) ? 300 : dInput;
    const list = $('oc-res').value.split('\n').filter(l => l.trim() !== '');

    while (ocState.running && ocState.index < list.length) {
      const batch = list.slice(ocState.index, ocState.index + bs);

      //  ocLog(`Wave: Batch Size=${bs}, Delay=${delay}ms`, '#9b59b6', true);
      const rls = await Promise.all(batch.map((line, idx) => {
        const [uid, priv] = line.split(':');
        return new Promise(r => setTimeout(r, idx * sg)).then(() => ocFollowOne(uid, priv === 'priv'));
      }));


      let failCountInBatch = rls.filter(r => !r.ok).length;

      ocState.index += batch.length;
      ocUpStats();

      if (rls.some(r => r.st === 'stopped')) break;

      // Adaptive Logic: increase batch if all OK, decrease if fails
      if (failCountInBatch === 0 && bs < mx) {
        bs++;
      } else if (failCountInBatch > 0) {
        bs = Math.max(1, bs - 1);
      }

      if (ocState.running && ocState.index < list.length) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
    ocStopRunner('finished');
    ocLog('ADAPTIVE SELESAI!', '#2ecc71');
  }

  $('btn-oc-run').onclick = () => {
    if (ocState.running) return;
    ocStartKeepAlive();
    ocState.running = true; ocState.ok = 0; ocState.requested = 0; ocState.er = 0;
    ocState.consecutiveFails = 0; ocState.consecutiveSkips = 0;
    ocState.sC = 0; ocState.fC = 0; ocState.index = 0;
    resetErrorCounters(); ocState.cooldownUntil = 0;

    ocState.startTime = Date.now();
    if (ocState.timerInterval) clearInterval(ocState.timerInterval);
    ocState.timerInterval = setInterval(ocUpdateTimer, 1000);
    $('oc-timer').textContent = '00:00:00';
    $('btn-oc-run').innerHTML = '⏳ PROSES...';
    $('btn-oc-run').style.background = '#6366f1';

    ocUpStats();
    const m = $('oc-method').value;
    if (m === 'seq') runSeq(); else if (m === 'burst') runBurst(); else if (m === 'stag') runStag(); else if (m === 'adap') runAdap();
  };
  $('btn-oc-stop').onclick = () => {
    ocStopRunner('stopped');
    ocLog('STOPPED BY USER', 'red');
  };


  $('btn-oc-toggle-settings').onclick = () => {
    const body = $('oc-runner-settings');
    const btn = $('btn-oc-toggle-settings');
    if (body.style.display === 'none') {
      body.style.display = 'block';
      btn.textContent = 'Hide Settings ↑';
    } else {
      body.style.display = 'none';
      btn.textContent = 'Configure Runner ↓';
    }
  };



  // Auto-reset dropdown when user types manually
  shadow.addEventListener('input', (e) => {
    if (e.target.id === 'dm-message') {
      const sel = $('dm-template-select');
      if (sel && sel.value !== '') {
        sel.value = '';
        const badge = $('dm-tpl-badge');
        if (badge) badge.style.display = 'none';
      }
    }
    // Update link count badge
    if (e.target.id === 'dm-links') {
      const links = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
      const cnt = $('dm-link-count');
      if (cnt) {
        cnt.textContent = links.length + ' link';
        cnt.style.backgroundColor = links.length > 0 ? '#c8f7c5' : '#fdf3b0';
        cnt.style.color = links.length > 0 ? '#1a7a1a' : '#a0890a';
      }
    }
  });

  // Reload button
  shadow.addEventListener('click', (e) => {
    if (e.target.id === 'btn-dm-reload-tpl') loadDmTemplates();
    if (e.target.id === 'btn-reload-dm-folders') loadDmMediaFolders();
  });

  shadow.addEventListener('change', (e) => {
    if (e.target.id === 'dm-media-folder') {
      const badge = $('dm-media-badge');
      if (badge) {
        const active = !!e.target.value;
        badge.textContent = active ? 'ON' : 'OFF';
        badge.style.background = active ? '#22c55e' : '#ede9fe';
        badge.style.color = active ? '#fff' : '#7c3aed';
      }
    }
  });

  // ---- Session ----
  async function refreshSession() {
    const sUser = $('sess-user');
    const sMarquee = $('sess-marquee');
    if (sUser) sUser.textContent = '⏳ Menarik data session...';
    if (sMarquee) sMarquee.textContent = '';
    $('sess-dot').className = 'session-dot';
    try {
      const licRes = await fetch(`${NODE_SERVER}/api/extension/license`).then(r => r.json()).catch(() => ({}));
      if (licRes.ok && licRes.customerName) {
        const botOwner = shadow.getElementById('bot-owner-name');
        if (botOwner) botOwner.textContent = `( ${licRes.customerName} )`;
      }

      const s = await bg('GET_SESSION');
      if (s.loggedIn) {
        $('sess-dot').className = 'session-dot ok';
        if (sUser) sUser.innerHTML = `<strong>@${s.username}</strong>`;

        // Render Running Text jika ada dari Reseller / Master
        if (sMarquee) {
          if (licRes.ok && licRes.runningText) {
            sMarquee.innerHTML = `<marquee scrollamount="3" behavior="scroll" direction="left" style="vertical-align: middle;">🚀 ${licRes.runningText} 🚀</marquee>`;
          } else {
            sMarquee.innerHTML = '';
          }
        }

        $('prof-card').style.display = 'flex';
        $('prof-name').textContent = s.fullName || s.username;
        $('prof-sub').textContent = `@${s.username} • ${s.followersCount || 0} followers`;
        if (s.profilePicUrl) $('prof-avatar').src = s.profilePicUrl;
      } else {
        $('sess-dot').className = 'session-dot err';
        if (sUser) {
          sUser.style.whiteSpace = 'normal';
          sUser.innerHTML = `<span style="color:#ef4444; font-weight:800; font-size:12px">SILAHKAN LOGIN</span>`;
        }
        if (sMarquee) sMarquee.innerHTML = '';
        // Clear UI on logout/error
        $('prof-card').style.display = 'none';
        $('prof-name').textContent = '';
        $('prof-sub').textContent = '';
        $('prof-avatar').src = '';
        if (!$('prof-name').textContent) $('pr-status').textContent = '';
      }
    } catch (e) {
      $('sess-dot').className = 'session-dot err';
      if (sMarquee) sMarquee.innerHTML = '';
      if (sUser) sUser.innerHTML = `<span style="color:#ef4444">${e.message}</span>`;
    }
  }
  $('btn-refresh-sess').addEventListener('click', refreshSession);

  // ---- FONTS ---- (routed via background.js to avoid content-script CORS issues)
  let _savedStoryFont = null;
  async function loadFonts() {
    try {
      const fonts = await bg('GET_FONTS'); // background.js fetches from server
      const sel = $('st-font');
      sel.innerHTML = '<option value="">Default (System)</option>';
      (fonts || []).forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/_PERSONAL_USE_ONLY/gi, '').replace(/_/g, ' ');
        sel.appendChild(opt);
      });
      $('st-font-status').textContent = fonts?.length ? `${fonts.length} font di server/fonts/` : 'Belum ada font — letakkan .ttf/.otf di server/fonts/';

      if (_savedStoryFont) {
        const matchingOpt = Array.from(sel.options).find(o => o.value === _savedStoryFont);
        if (matchingOpt) {
          sel.value = _savedStoryFont;
          applyFont(_savedStoryFont);
        }
      } else if (fonts && fonts.length > 0) {
        // Default ke Instagram Sans Condensed.ttf jika belum ada settingan tersimpan
        const defaultCandidate = fonts.find(f => f.toLowerCase().includes('condensed') && !f.toLowerCase().includes('bold'))
          || fonts.find(f => f === 'Instagram Sans Condensed.ttf')
          || fonts[0];
        if (defaultCandidate) {
          sel.value = defaultCandidate;
          applyFont(defaultCandidate);
        }
      }
    } catch (e) {
      $('st-font-status').textContent = `❌ ${e.message} — pastikan server jalan`;
    }
  }

  async function applyFont(filename) {
    currentFontFile = filename;
    if (!filename) {
      currentFontFamily = '';
      updatePillStyle();
      $('st-font-status').textContent = 'Default font';
      return;
    }
    try {
      const safeName = 'IGToolFont_' + filename.replace(/[^a-z0-9]/gi, '_');
      $('st-font-status').textContent = '⏳ Loading font...';
      const dataUrl = await bg('FETCH_FONT_DATA', { filename });
      const ff = new FontFace(safeName, `url("${dataUrl}")`);
      await ff.load();
      document.fonts.add(ff);
      currentFontFamily = safeName;
      updatePillStyle();
      $('st-font-status').textContent = `✅ ${filename.replace(/\.[^.]+$/, '')} aktif (via server)`;
    } catch (e) {
      $('st-font-status').textContent = `❌ Gagal: ${e.message}`;
    }
  }

  $('st-font').addEventListener('change', () => {
    _savedStoryFont = $('st-font').value;
    applyFont($('st-font').value);
    if (typeof debouncedSaveStorySettings === 'function') debouncedSaveStorySettings();
  });
  $('btn-reload-fonts').addEventListener('click', loadFonts);

  // ---- Bulk Post (Folder) ----
  let bulkInt = null;
  $('btn-bulk-feed').addEventListener('click', async () => {
    if (bulkInt) {
      clearInterval(bulkInt);
      bulkInt = null;
      $('btn-bulk-feed').textContent = 'Mulai Bulk Post';
      $('bulk-fd-status').textContent = '';
      $('bulk-fd-prog').style.display = 'none';
      return;
    }

    const folderName = $('bulk-fd-folder').value;
    const captionFile = $('bulk-fd-caption').value;
    const count = parseInt($('bulk-fd-count').value) || 1;
    const delayMs = parseInt($('bulk-fd-delay').value) || 5000;
    const username = ($('sess-info').innerText.match(/@([a-zA-Z0-9._]+)/) || [])[1] || 'unknown';

    $('btn-bulk-feed').textContent = 'Memulai...';
    $('bulk-fd-status').textContent = 'Memulai bulk post...';
    await resetSysLogs('Bulk Feed');
    try {
      await bg('START_BULK_FEED', { folderName, captionFile, count, delayMs, username });
      $('btn-bulk-feed').textContent = 'Hentikan Bulk Post';
      $('bulk-fd-status').textContent = 'Bulk post berjalan...';
      $('bulk-fd-prog').style.display = 'block';
    } catch (e) {
      $('btn-bulk-feed').textContent = 'Mulai Bulk Post';
      $('bulk-fd-status').textContent = `Error: ${e.message}`;
      return;
    }

    bulkInt = setInterval(async () => {
      try {
        const s = await bg('GET_BULK_FEED_STATE');
        $('bulk-fd-bar').style.width = s.total ? Math.round(s.done / s.total * 100) + '%' : '0%';
        $('bulk-fd-status').textContent = s.currentAction;
        if (!s.running) {
          clearInterval(bulkInt); bulkInt = null;
          $('btn-bulk-feed').textContent = '📤 Post dari Folder';
          $('bulk-fd-prog').style.display = 'none';
          if (s.done >= s.total && s.total > 0) showToast('Bulk post selesai! ✅', 'ok');
        }
      } catch (e) {
        if (!bulkInt) return;
        $('bulk-fd-status').textContent = 'Loading status...';
      }
    }, 1500);
  });

  // ---- Bulk API Loaders ----
  async function loadBulkOptions() {
    try {
      const foldersList = await bg('GET_MEDIA_FOLDERS');
      const captionsList = await bg('GET_CAPTION_FILES');

      const fSel = $('bulk-fd-folder');
      const cSel = $('bulk-fd-caption');
      const fdCapSel = $('fd-caption-file');

      const currFolder = fSel ? fSel.value : '';
      const currCap = cSel ? cSel.value : '';
      const currFdCap = fdCapSel ? fdCapSel.value : '';

      if (fSel) {
        fSel.innerHTML = '';
        (foldersList || []).forEach(f => {
          const o = document.createElement('option');
          o.value = f.path || f;
          o.textContent = f.name || (f.path ? f.path.split('/').pop() : f);
          fSel.appendChild(o);
        });
        if (currFolder && [...fSel.options].some(o => o.value === currFolder)) fSel.value = currFolder;
        else if (fSel.options.length > 0) {
          // Default to media/feed if available
          const feedOpt = [...fSel.options].find(o => o.value === 'media/feed');
          if (feedOpt) fSel.value = 'media/feed';
          else fSel.selectedIndex = 0;
        }
      }

      if (cSel) {
        cSel.innerHTML = '';
        const noneOpt = document.createElement('option');
        noneOpt.value = '';
        noneOpt.textContent = 'None (Tanpa Caption)';
        cSel.appendChild(noneOpt);

        (captionsList || []).forEach(f => {
          const o = document.createElement('option');
          o.value = f.path || f;
          o.textContent = f.filename || f;
          cSel.appendChild(o);
        });
        if (currCap && [...cSel.options].some(o => o.value === currCap)) cSel.value = currCap;
        else cSel.value = '';
      }

      if (fdCapSel) {
        fdCapSel.innerHTML = '';
        const noneOpt2 = document.createElement('option');
        noneOpt2.value = '';
        noneOpt2.textContent = 'None (Tanpa Caption)';
        fdCapSel.appendChild(noneOpt2);

        (captionsList || []).forEach(f => {
          const o = document.createElement('option');
          o.value = f.path || f;
          o.textContent = f.filename || f;
          fdCapSel.appendChild(o);
        });
        if (currFdCap && [...fdCapSel.options].some(o => o.value === currFdCap)) fdCapSel.value = currFdCap;
        else fdCapSel.value = '';
      }
    } catch (e) {
      // Silent fail, server might be down
    }
  }

  $('fd-caption-file')?.addEventListener('change', async (e) => {
    const file = e.target.value;
    if (!file) {
      $('fd-caption').value = '';
      return;
    }
    try {
      const resp = await fetch(`${NODE_SERVER}/api/files/${encodeURIComponent(file)}`);
      const data = await resp.json();
      if (data && data.content) {
        const lines = data.content.split('|').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          const raw = lines[Math.floor(Math.random() * lines.length)];
          const cap = raw.replace(/\{([^{}]+)\}/g, (_, choices) => {
            const parts = choices.split('|');
            return parts[Math.floor(Math.random() * parts.length)];
          });
          $('fd-caption').value = cap;
        }
      }
    } catch (err) {
      console.warn('Gagal memuat caption file', err);
    }
  });

  if ($('btn-reload-bulk-opts')) {
    $('btn-reload-bulk-opts').addEventListener('click', loadBulkOptions);
  }

  // Font import
  $('btn-import-font').addEventListener('click', () => fontFileInput.click());
  fontFileInput.addEventListener('change', async () => {
    const file = fontFileInput.files[0];
    if (!file) return;
    $('st-import-status').textContent = 'Uploading...';
    try {
      const fd = new FormData();
      fd.append('font', file, file.name);
      const r = await fetch(`${NODE_SERVER}/api/extension/fonts/upload`, { method: 'POST', body: fd });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      $('st-import-status').textContent = '✅ Upload OK';
      await loadFonts();
      // Auto select the newly uploaded font
      $('st-font').value = data.filename;
      await applyFont(data.filename);
    } catch (e) { $('st-import-status').textContent = '❌ ' + e.message; }
    fontFileInput.value = '';
  });

  // ---- STORY SETTINGS PERSISTENCE ----
  const STORY_SETTINGS_KEY = 'story_sticker_settings';
  let _saveSettingsTimer = null;

  function debouncedSaveStorySettings() {
    if (_saveSettingsTimer) clearTimeout(_saveSettingsTimer);
    _saveSettingsTimer = setTimeout(saveStorySettings, 200);
  }

  function saveStorySettings() {
    try {
      const settings = {
        radius: $('st-radius')?.value,
        iconScale: $('st-iconscale')?.value,
        fontSize: $('st-fontsize')?.value,
        color: $('st-color')?.value,
        textColor: $('st-textcolor')?.value,
        showIcon: $('st-showicon')?.checked,
        blur: $('st-blur')?.checked,
        mute: $('st-mute')?.checked,
        font: $('st-font')?.value || _savedStoryFont || ''
      };
      chrome.storage.local.set({ [STORY_SETTINGS_KEY]: settings });
    } catch (e) { }
  }

  function loadStorySettings() {
    try {
      chrome.storage.local.get([STORY_SETTINGS_KEY], (res) => {
        const s = res?.[STORY_SETTINGS_KEY];
        if (!s) return;

        if (s.radius !== undefined && $('st-radius')) $('st-radius').value = s.radius;
        if (s.iconScale !== undefined && $('st-iconscale')) $('st-iconscale').value = s.iconScale;
        if (s.fontSize !== undefined && $('st-fontsize')) $('st-fontsize').value = s.fontSize;
        if (s.color !== undefined && $('st-color')) $('st-color').value = s.color;
        if (s.textColor !== undefined && $('st-textcolor')) $('st-textcolor').value = s.textColor;
        if (s.showIcon !== undefined && $('st-showicon')) $('st-showicon').checked = !!s.showIcon;
        if (s.blur !== undefined && $('st-blur')) {
          $('st-blur').checked = !!s.blur;
          const stImg = $('st-img');
          if (stImg) {
            stImg.style.filter = s.blur ? 'blur(6px)' : 'none';
            stImg.style.transform = s.blur ? 'scale(1.05)' : 'scale(1)';
          }
        }
        if (s.mute !== undefined && $('st-mute')) $('st-mute').checked = !!s.mute;
        if (s.font !== undefined) {
          _savedStoryFont = s.font;
          const fontSelect = $('st-font');
          if (fontSelect) {
            const fontOpt = Array.from(fontSelect.options).find(o => o.value === s.font);
            if (fontOpt) {
              fontSelect.value = s.font;
              applyFont(s.font);
            }
          }
        }

        updateColors();
        updatePillStyle();
      });
    } catch (e) { }
  }

  // ---- COLOR PICKERS ----
  function updateColors() {
    const bg_col = $('st-color').value;
    const txt_col = $('st-textcolor').value;
    const cBg = $('cpick-bg');
    const cTxt = $('cpick-txt');
    if (cBg) cBg.style.background = bg_col;
    if (cTxt) cTxt.style.background = txt_col;

    // Update hex text only if elements exist
    const hBg = $('st-color-hex');
    const hTxt = $('st-textcolor-hex');
    if (hBg) hBg.textContent = bg_col;
    if (hTxt) hTxt.textContent = txt_col;

    updatePillStyle();
  }
  // Events for compatibility (some browsers still fire these correctly)
  ['input', 'change'].forEach(ev => {
    $('st-color').addEventListener(ev, () => { updateColors(); debouncedSaveStorySettings(); });
    $('st-textcolor').addEventListener(ev, () => { updateColors(); debouncedSaveStorySettings(); });
    $('st-radius').addEventListener(ev, () => { updatePillStyle(); debouncedSaveStorySettings(); });
  });

  // Polling fallback — Chrome/Shadow DOM native color picker often doesn't fire input events
  // RAF poll: only checks when Story tab is active, only calls update if values changed
  let _lastBg = null, _lastTxt = null, _lastRadius = null;
  (function colorPollLoop() {
    const storyActive = $('tab-story')?.classList.contains('active');
    if (storyActive) {
      const bg = $('st-color')?.value;
      const txt = $('st-textcolor')?.value;
      const rad = $('st-radius')?.value;
      if (bg !== _lastBg || txt !== _lastTxt || rad !== _lastRadius) {
        _lastBg = bg; _lastTxt = txt; _lastRadius = rad;
        updateColors();
        debouncedSaveStorySettings();
      }
    }
    requestAnimationFrame(colorPollLoop);
  })();

  // ---- PILL STYLE ----
  function updatePillStyle() {
    const pill = $('st-pill');
    const bg_col = $('st-color').value;
    const txt_col = $('st-textcolor').value;
    const radius = Math.min(60, parseInt($('st-radius').value) || 15);
    const showIcon = $('st-showicon').checked;
    const iconScale = Math.max(0.3, Math.min(2.5, parseFloat($('st-iconscale')?.value) || 0.8));
    const text = $('st-linktitle').value.trim() || $('st-link').value.replace(/^https?:\/\/(www\.)?/, '').slice(0, 20);

    pill.style.background = bg_col;
    pill.style.color = txt_col;

    const fsReg = parseFloat($('st-fontsize').value) || 16.5;
    const isMobile = window.innerWidth <= 480;
    const previewScale = isMobile ? (0.5 * 180 / 340) : 0.5; // Scale down for mobile 180px height preview
    const fsPreview = fsReg * previewScale;

    pill.style.fontSize = fsPreview + 'px';
    pill.style.padding = (fsPreview * 0.15) + 'px ' + (fsPreview * 0.5) + 'px'; // Reduced vertical (0.15 vs 0.25)

    // Corner radius murni pada 4 sudut kotak (rounded box)
    const maxCornerRadius = Math.round(fsPreview * 0.55);
    const boxCornerRadius = Math.min(radius * previewScale, maxCornerRadius);
    pill.style.borderRadius = boxCornerRadius + 'px';
    pill.style.fontFamily = currentFontFamily ? `'${currentFontFamily}', Inter, sans-serif` : 'Inter, sans-serif';
    $('st-pill-text').textContent = text || 'Link sticker';

    const iconEl = pill.querySelector('.pill-icon');
    if (iconEl) {
      iconEl.style.display = showIcon ? 'inline' : 'none';
      const iconPx = Math.max(2, Math.round(fsPreview * 1.05 * iconScale));
      iconEl.style.fontSize = iconPx + 'px';
      iconEl.style.lineHeight = '1';
      iconEl.style.verticalAlign = 'middle';
      iconEl.style.marginRight = '-1px';
    }
    pill.style.left = (pillX * 100) + '%';
    pill.style.top = (pillY * 100) + '%';
    pill.style.transform = `translate(-50%, -50%) rotate(${pillRotation}deg) scale(${pillScale})`;
    updatePosLabel();
  }

  ['st-radius', 'st-showicon', 'st-iconscale', 'st-linktitle', 'st-link', 'st-fontsize'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      updatePillStyle();
      if (['st-radius', 'st-showicon', 'st-iconscale', 'st-fontsize'].includes(id)) {
        debouncedSaveStorySettings();
      }
    });
  });

  const blurEl = $('st-blur');
  if (blurEl) {
    blurEl.addEventListener('change', (e) => {
      const stImg = $('st-img');
      if (stImg) {
        // Menggunakan 6px karena rasio panel preview lebih kecil dari 1080p
        stImg.style.filter = e.target.checked ? 'blur(6px)' : 'none';
        stImg.style.transform = e.target.checked ? 'scale(1.05)' : 'scale(1)'; // Menghindari border putih tembus pandang
        stImg.style.transition = 'filter 0.3s, transform 0.3s';
      }
      debouncedSaveStorySettings();
    });
  }

  const muteEl = $('st-mute');
  if (muteEl) {
    muteEl.addEventListener('change', () => {
      debouncedSaveStorySettings();
    });
  }

  // Load saved story settings on initialization
  loadStorySettings();

  function updatePosLabel() {
    $('st-pos-label').textContent = `X ${(pillX * 100).toFixed(0)}% · Y ${(pillY * 100).toFixed(0)}% · Rot ${pillRotation.toFixed(0)}° · Scl ${pillScale.toFixed(1)}x`;
  }

  // ---- STORY IMAGE UPLOAD ----
  function setupDragDrop(zone, cb) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = '#a855f7'; });
    zone.addEventListener('dragleave', () => zone.style.borderColor = '');
    zone.addEventListener('drop', e => { e.preventDefault(); zone.style.borderColor = ''; if (e.dataTransfer.files[0]) cb(e.dataTransfer.files[0]); });
  }
  $('st-upload-zone').addEventListener('click', () => stFileInput.click());
  setupDragDrop($('st-upload-zone'), loadStoryImage);
  stFileInput.addEventListener('change', () => { if (stFileInput.files[0]) loadStoryImage(stFileInput.files[0]); });

  function loadStoryImage(file) {
    if (file.type.startsWith('video/')) {
      storyVideoFile = file;
      storyImageUrl = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.src = storyImageUrl;
      v.muted = true; v.playsInline = true;
      v.onloadedmetadata = () => { v.currentTime = 0.1; };
      v.onseeked = () => {
        const c = document.createElement('canvas');
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        $('st-img').src = c.toDataURL('image/jpeg');
        $('st-upload-zone').style.display = 'none';
        $('st-preview').style.display = 'flex';
        updatePillFromLink();
      };
      return;
    }
    storyVideoFile = null;
    const reader = new FileReader();
    reader.onload = e => {
      storyImageUrl = e.target.result;
      $('st-img').src = storyImageUrl;
      $('st-upload-zone').style.display = 'none';
      $('st-preview').style.display = 'flex';
      updatePillFromLink();
    };
    reader.readAsDataURL(file);
  }

  function updatePillFromLink() {
    const link = $('st-link').value.trim();
    const pill = $('st-pill');
    const noLink = $('st-no-link');
    if (link) {
      pill.style.display = 'flex';
      noLink.style.display = 'none';
    } else {
      pill.style.display = 'none';
      noLink.style.display = 'block';
    }
    updatePillStyle();
  }
  $('st-link').addEventListener('input', updatePillFromLink);

  // ---- ADVANCED STICKER CONTROLS ----
  (function setupStickerControls() {
    const pill = $('st-pill');
    const preview = $('st-preview');
    const hRotate = $('st-h-rotate');
    const hResize = $('st-h-resize');

    let mode = null; // 'drag', 'rotate', 'scale', 'touch'
    let startX, startY, startPillX, startPillY, startRot, startScale, startDist, startAngle;

    const getDist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const getAngle = (t1, t2) => Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI;

    // Helper to get center of pill in client coords
    const getPillCenter = () => {
      const r = pill.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const onDown = (e) => {
      if (!storyImageUrl) return;
      e.stopPropagation();
      const touch = e.touches?.[0] || e;

      // Deselect if clicking preview but not pill
      if (e.target === preview || e.target.classList.contains('story-bg-img')) {
        pill.classList.remove('active');
        return;
      }

      pill.classList.add('active');
      startX = touch.clientX; startY = touch.clientY;
      startPillX = pillX; startPillY = pillY;
      startRot = pillRotation;
      startScale = pillScale;

      const center = getPillCenter();
      startAngle = Math.atan2(touch.clientY - center.y, touch.clientX - center.x) * 180 / Math.PI;

      if (e.target.closest('.handle-rotate')) {
        mode = 'rotate';
      } else if (e.target.closest('.handle-resize')) {
        mode = 'scale';
      } else if (e.target.closest('#st-pill')) {
        mode = 'drag';
        pill.style.cursor = 'grabbing';
      }

      if (e.touches?.length === 2) {
        mode = 'touch';
        startDist = getDist(e.touches[0], e.touches[1]);
        startAngle = getAngle(e.touches[0], e.touches[1]);
      }

      document.addEventListener(e.touches ? 'touchmove' : 'mousemove', onMove, { passive: false });
      document.addEventListener(e.touches ? 'touchend' : 'mouseup', onUp);
    };

    const onMove = (e) => {
      if (!mode) return;
      e.preventDefault();
      const touch = e.touches?.[0] || e;
      const rect = preview.getBoundingClientRect();

      if (mode === 'drag') {
        const dx = (touch.clientX - startX) / rect.width;
        const dy = (touch.clientY - startY) / rect.height;
        pillX = Math.max(0, Math.min(1, startPillX + dx));
        pillY = Math.max(0, Math.min(1, startPillY + dy));
      } else if (mode === 'rotate') {
        const center = getPillCenter();
        const angle = Math.atan2(touch.clientY - center.y, touch.clientX - center.x) * 180 / Math.PI;
        pillRotation = startRot + (angle - startAngle);
      } else if (mode === 'scale') {
        const dx = touch.clientX - startX;
        pillScale = Math.max(0.4, Math.min(3.0, startScale + (dx / 100)));
      } else if (mode === 'touch' && e.touches?.length === 2) {
        const dist = getDist(e.touches[0], e.touches[1]);
        const angle = getAngle(e.touches[0], e.touches[1]);
        pillScale = Math.max(0.4, Math.min(3.0, startScale * (dist / startDist)));
        pillRotation = startRot + (angle - startAngle);
      }

      updatePillStyle();
    };

    const onUp = () => {
      mode = null;
      pill.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    pill.addEventListener('mousedown', onDown);
    pill.addEventListener('touchstart', onDown, { passive: false });
    preview.addEventListener('mousedown', onDown); // For deselect
    preview.addEventListener('touchstart', onDown, { passive: false });

  })();

  // st-highlight-toggle removed
  $('btn-st-autofill').addEventListener('click', async () => {
    const btn = $('btn-st-autofill');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Mengisi...';

    try {
      // 1. Get Random URL from 3 Presets (clickdealer, imo, trafee)
      let urls = {};
      try {
        urls = await bg('GET_SHORTLINK_URLS') || {};
      } catch (e) {}
      const fallback = { "imo": "https://firehouse-sand.vercel.app", "clickdealer": "https://date.melarata25.workers.dev", "trafee": "https://amorcute.pages.dev" };
      const combined = { ...fallback, ...urls };
      const candidates = [combined.imo, combined.clickdealer, combined.trafee].filter(u => typeof u === 'string' && u.trim().length > 0);
      let linkUrl = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : "https://date.melarata25.workers.dev";

      // 2. Generate Random Params (Triple Injection)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const randStr = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const v = randStr(5 + Math.floor(Math.random() * 3));   // 5-7 chars
      const token = randStr(7 + Math.floor(Math.random() * 4)); // 7-10 chars
      const hash = randStr(6 + Math.floor(Math.random() * 4));  // 6-9 chars

      const base = linkUrl.replace(/\/+$/, '').includes('?') ? linkUrl : linkUrl.replace(/\/+$/, '') + '/';
      const sep = base.includes('?') ? '&' : '?';
      linkUrl = `${base}${sep}v=${v}&token=${token}&hash=${hash}`;

      // 3. Parallel Execution: Fast Shortlink (ix.sk / active provider) + Sticker Text + Highlight Name
      const chosenProvider = ($('sl-provider')?.value && $('sl-provider').value !== 'none') ? $('sl-provider').value : 'ix';
      const shortPromise = bg('GENERATE_SHORTLINK', {
        provider: chosenProvider,
        longUrl: linkUrl,
        apiKey: $('sl-apikey')?.value || 'nZ9ZzSa4LZ4o'
      }).catch(err => {
        console.warn('Auto-fill shortlink failed, using longUrl', err);
        return linkUrl;
      });

      const stickerPromise = fetch(`${NODE_SERVER}/api/files/${encodeURIComponent('setup/sticker/sticker.txt')}`)
        .then(r => r.json())
        .catch(() => null);

      const highlightPromise = fetch(`${NODE_SERVER}/api/files/${encodeURIComponent('setup/highlights/sorotan.txt')}`)
        .then(r => r.json())
        .catch(() => null);

      const [shortRes, stickerData, highlightData] = await Promise.all([
        shortPromise,
        stickerPromise,
        highlightPromise
      ]);

      if (shortRes) {
        $('st-link').value = shortRes;
        updatePillFromLink();
      }

      // 4. Set Random Sticker Text
      if (stickerData && stickerData.content) {
        const lines = stickerData.content.split('|').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          $('st-linktitle').value = lines[Math.floor(Math.random() * lines.length)];
          updatePillStyle();
        }
      }

      // 5. Set Random Highlight Name
      if (highlightData && highlightData.content) {
        const lines = highlightData.content.split('|').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          $('st-highlight-name').value = lines[Math.floor(Math.random() * lines.length)];
        }
      }

      showToast('Berhasil mengisi dari setup! ✨', 'ok');
    } catch (e) {
      showToast('Gagal auto-fill: ' + e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  $('btn-st-reset').addEventListener('click', () => {
    storyImageUrl = null;
    storyVideoFile = null;
    pillX = 0.5; pillY = 0.75; pillRotation = 0; pillScale = 1.0;
    updatePillStyle();
    $('st-upload-zone').style.display = 'block';
    $('st-preview').style.display = 'none';
    $('st-status').textContent = '';
    $('st-prog').style.display = 'none';
    $('st-bar').style.width = '0%';
  });

  $('btn-post-story').addEventListener('click', async () => {
    if (!storyImageUrl) { showToast('Pilih gambar atau video dulu!', 'err'); return; }

    let finalImage = null;
    let finalVideoBlob = null;

    if (storyVideoFile) {
      $('st-status').textContent = '📹 Menyiapkan video...';
      const reader = new FileReader();
      finalVideoBlob = await new Promise(r => { reader.onload = () => r(reader.result); reader.readAsDataURL(storyVideoFile); });
    } else {
      const canvas = Object.assign(document.createElement('canvas'), { width: 1080, height: 1920 });
      const ctx = canvas.getContext('2d');
      const img = new Image(); img.src = storyImageUrl;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      const sc = Math.max(1080 / img.width, 1920 / img.height);
      if ($('st-blur').checked) ctx.filter = 'blur(20px)';
      ctx.drawImage(img, (1080 - img.width * sc) / 2, (1920 - img.height * sc) / 2, img.width * sc, img.height * sc);
      ctx.filter = 'none';
      finalImage = canvas.toDataURL('image/jpeg', 0.92);
    }

    $('st-prog').style.display = 'block'; $('st-bar').style.width = '10%';
    $('st-status').textContent = 'Mempersiapkan... 10%';

    const btn = $('btn-post-story'); btn.disabled = true;

    // Log Polling Interval
    const session = await bg('GET_SESSION');
    const pollUser = session?.username || '__global__';

    // Clear old logs so previous success messages don't contaminate the new run
    await resetSysLogs('Post Story');

    let maxStageReached = 0;
    let logPoll = setInterval(async () => {
      try {
        const resp = await fetch(`${NODE_SERVER}/api/extension/logs?username=${encodeURIComponent(pollUser)}`);
        const data = await resp.json();

        if (data.ok && data.logs && data.logs.length > 0) {
          const storyLogs = data.logs.filter(l => {
            const m = l.message;
            // Filter ketat: Hanya pantau kemajuan story
            const isFriendly = m.includes('Mengunggah') || m.includes('Mempersiapkan') || m.includes('Memproses') || m.includes('Menunggu') || m.includes('selesai') || m.includes('Berhasil');
            const isTechnical = /JSON|payload|configure|\{/i.test(m);

            return isFriendly && !isTechnical;
          }).reverse();

          if (storyLogs.length > 0) {
            let latest = storyLogs[0].message.replace('[story] ', '').replace('[SYSTEM] ', '');

            // Hitung tahap saat ini secara presisi
            let stageNum = 0;
            if (latest.includes('Memproses') || latest.includes('Mempersiapkan') || latest.includes('Mengonversi') || latest.includes('Konversi') || latest.includes('Menyiapkan') || latest.includes('[P0]')) {
              stageNum = 1;
            } else if (latest.includes('Mengunggah') || latest.includes('[P1]') || latest.includes('[P2]') || latest.includes('[P3]') || latest.includes('chunks')) {
              stageNum = 2;
            } else if (latest.includes('Menunggu') || latest.includes('[P4]') || latest.includes('[P5]') || latest.includes('indexing')) {
              stageNum = 3;
            } else if (latest.includes('selesai') || latest.includes('Berhasil') || latest.includes('Finalisasi') || latest.includes('Finalizing') || latest.includes('[P6]')) {
              stageNum = 4;
            }

            // Kunci tahap agar hanya bisa maju (tidak melompat mundur)
            if (stageNum > maxStageReached) {
              maxStageReached = stageNum;
            }

            // Map teks status & progress bar minimalis
            if (maxStageReached === 1) {
              latest = 'Mempersiapkan... 25%';
              $('st-bar').style.width = '25%';
            } else if (maxStageReached === 2) {
              latest = 'Mengunggah... 50%';
              $('st-bar').style.width = '50%';
            } else if (maxStageReached === 3) {
              latest = 'Menunggu konfirmasi... 75%';
              $('st-bar').style.width = '75%';
            } else if (maxStageReached === 4) {
              latest = 'Finalisasi... 90%';
              $('st-bar').style.width = '90%';
            } else {
              latest = 'Mempersiapkan... 10%';
              $('st-bar').style.width = '10%';
            }

            $('st-status').textContent = latest;

          }

        }
      } catch (e) { }
    }, 500);

    try {
      await bg('POST_STORY', {
        imageData: finalImage,
        videoBlob: finalVideoBlob,
        linkUrl: $('st-link').value.trim(),
        linkTitle: $('st-linktitle').value.trim(),
        linkFontSize: $('st-fontsize').value || '16.5',
        highlightName: $('st-highlight-name').value.trim() || null,
        storyX: String(pillX.toFixed(3)),
        storyY: String(pillY.toFixed(3)),
        storyScale: String(pillScale.toFixed(2)),
        storyRotation: String(pillRotation.toFixed(1)),
        storyColor: $('st-color').value,
        storyTextColor: $('st-textcolor').value,
        storyRadius: $('st-radius').value,
        showIcon: $('st-showicon').checked,
        iconScale: $('st-iconscale')?.value || '0.8',
        storyFont: currentFontFile,
        blur: $('st-blur').checked,
        mute: $('st-mute').checked,
      });
      // Selesaikan log polling sedikit lebih lambat agar User sempat melihat Tahap 4
      await new Promise(r => setTimeout(r, 1500));
      clearInterval(logPoll);
      $('st-bar').style.width = '100%';
      $('st-status').textContent = '✅ Berhasil diposting! 100%';
      showToast('Story berhasil! 🎉', 'ok');

    } catch (e) {
      clearInterval(logPoll);
      $('st-bar').style.width = '0%';
      $('st-status').textContent = '❌ ' + e.message;
      showToast(e.message, 'err');
    } finally { btn.disabled = false; }
  });

  // ---- SCRAPER ----
  $('btn-scrape').addEventListener('click', async () => {
    const type = $('sc-type').value,
      rawTargets = $('sc-target').value.split('\n').map(s => s.trim()).filter(Boolean),
      limit = parseInt($('sc-limit').value) || 200,
      privacyFilter = $('sc-filter').value,
      delayMs = Math.max(500, parseInt($('sc-delay').value) || 500),
      mode = $('sc-mode') ? $('sc-mode').value : 'fast';

    if (!rawTargets.length) { showToast('Isi target!', 'err'); return; }

    $('btn-scrape').style.display = 'none';
    $('btn-stop-scrape').style.display = 'block';
    scrapingActive = true;

    $('sc-prog-wrap').style.display = 'block';
    $('sc-bar').style.width = '10%';
    $('sc-status').textContent = 'Memulai...';
    $('sc-results').innerHTML = '';
    $('sc-results').style.display = 'none';
    $('sc-actions').style.display = 'none';
    scrapedUsers = [];

    try {
      for (let i = 0; i < rawTargets.length; i++) {
        const target = rawTargets[i];
        try {
          $('sc-status').textContent = `[${i + 1}/${rawTargets.length}] Resolving ${target}...`;

          let userId, mediaId;
          if (['followers', 'following', 'user_posts'].includes(type)) {
            const r = await bg('RESOLVE_USER_ID', { input: target });
            userId = r.userId;
          } else if (['likers', 'commenters'].includes(type)) {
            const r = await bg('RESOLVE_MEDIA_ID', { input: target });
            mediaId = r.mediaId;
          }

          $('sc-bar').style.width = Math.round(((i + 0.3) / rawTargets.length) * 100) + '%';
          $('sc-status').textContent = `[${i + 1}/${rawTargets.length}] Scraping ${target}... Hasil sementara: ${scrapedUsers.length}`;

          const T = {
            followers: 'SCRAPE_FOLLOWERS',
            following: 'SCRAPE_FOLLOWING',
            likers: 'SCRAPE_LIKERS',
            commenters: 'SCRAPE_COMMENTERS',
            user_posts: 'SCRAPE_USER_POSTS',
            hashtag_posts: 'SCRAPE_HASHTAG_POSTS',
            location_posts: 'SCRAPE_LOCATION_POSTS'
          }[type];

          // Scrape batches will be received via chrome.runtime.onMessage (SCRAPE_PROGRESS)
          await bg(T, { userId, mediaId, target, limit, delayMs, mode });

          $('sc-bar').style.width = Math.round(((i + 1) / rawTargets.length) * 100) + '%';
          $('sc-status').textContent = `[${i + 1}/${rawTargets.length}] Selesai scraping ${target}. Total saat ini: ${scrapedUsers.length}`;

          if (i < rawTargets.length - 1 && scrapingActive) {
            $('sc-status').textContent = `[${i + 1}/${rawTargets.length}] Menunggu jeda ${delayMs}ms...`;
            await new Promise(r => setTimeout(r, delayMs));
          }
        } catch (innerE) {
          // console.error(`Error processing ${target}:`, innerE);
          $('sc-status').textContent = `[${i + 1}/${rawTargets.length}] Skip ${target}: ${innerE.message}`;
          await new Promise(r => setTimeout(r, 2000));
        }
        if (!scrapingActive) break;
      }

      const pubCount = scrapedUsers.filter(u => !u.isPrivate).length;
      const privCount = scrapedUsers.filter(u => u.isPrivate).length;

      $('sc-status').textContent = `✅ Selesai! Total: ${scrapedUsers.length} (Public: ${pubCount}, Private: ${privCount})`;
      showToast(`${scrapedUsers.length} akun didapat!`, 'ok');
    } catch (e) {
      $('sc-status').textContent = '❌ ' + e.message;
      showToast(e.message, 'err');
    } finally {
      $('btn-scrape').style.display = 'block';
      $('btn-stop-scrape').style.display = 'none';
      scrapingActive = false;
    }
  });

  $('btn-stop-scrape').addEventListener('click', async () => {
    scrapingActive = false;
    $('btn-stop-scrape').disabled = true;
    $('btn-stop-scrape').textContent = 'Menghentikan...';
    $('sc-status').textContent = '🛑 Menghentikan proses scrape...';
    try {
      await bg('STOP_SCRAPE');
    } catch (e) { }
    $('btn-scrape').style.display = 'block';
    $('btn-stop-scrape').style.display = 'none';
    $('btn-stop-scrape').disabled = false;
    $('btn-stop-scrape').textContent = '⏹ Stop';
    $('sc-status').textContent = `🛑 Scrape dihentikan. Total didapat: ${scrapedUsers.length}`;
    showToast('Scrape dihentikan!', 'ok');
  });
  $('btn-copy-uuid').addEventListener('click', () => { navigator.clipboard.writeText(scrapedUsers.map(u => u.pk).join('\n')); showToast('UUID disalin!', 'ok'); });

  // Scraper Mode persistence
  if ($('sc-mode')) {
    chrome.storage.local.get(['savedScrapeMode'], (res) => {
      if (res && res.savedScrapeMode) {
        $('sc-mode').value = res.savedScrapeMode;
      }
    });
    $('sc-mode').addEventListener('change', () => {
      chrome.storage.local.set({ savedScrapeMode: $('sc-mode').value });
    });
  }

  // DM Handlers
  let selectedThreads = [];
  $('dm-mode').addEventListener('change', (e) => {
    const isFollowup = e.target.value === 'followup';
    $('dm-new-target').style.display = isFollowup ? 'none' : 'block';
    $('dm-followup-target').style.display = isFollowup ? 'block' : 'none';
  });

  $('dm-use-jeda')?.addEventListener('change', (e) => {
    const cfg = $('dm-jeda-config');
    if (cfg) cfg.style.display = e.target.checked ? 'block' : 'none';
  });

  $('btn-dm-fetch-inbox').addEventListener('click', async () => {
    try {
      // Auto-select Follow-up mode
      const dmMode = $('dm-mode');
      if (dmMode) {
        dmMode.value = 'followup';
        dmMode.dispatchEvent(new Event('change'));
      }

      $('btn-dm-fetch-inbox').disabled = true;
      showToast('Mengambil Inbox...', 'info');
      const res = await bg('FETCH_DM_INBOX');
      if (res.ok) {
        selectedThreads = [];
        $('dm-threads-list').innerHTML = res.threads.map(t => `
          <div class="thread-item" data-id="${t.threadId}" style="padding:8px; border-bottom:1px solid #efefef; cursor:pointer; display:flex; align-items:center; gap:10px; transition:background 0.2s">
            <div style="flex:1; min-width:0">
              <div style="font-weight:700; color:#1a1a1a; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
                ${t.threadTitle || t.users.map(u => u.username).join(', ')}
              </div>
              <div style="color:#666; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px">
                ${t.lastMessage || '(Pesan media / kosong)'}
              </div>
            </div>
            <input type="checkbox" class="thread-sel" value="${t.threadId}" style="width:16px; height:16px; pointer-events:none; flex-shrink:0; margin:0">
          </div>
        `).join('');

        shadow.querySelectorAll('.thread-item').forEach(el => {
          el.addEventListener('click', () => {
            const cb = el.querySelector('.thread-sel');
            cb.checked = !cb.checked;
            const tid = cb.value;
            if (cb.checked) {
              if (!selectedThreads.includes(tid)) selectedThreads.push(tid);
              el.style.background = '#f3e8ff'; // Light purple for selected
              el.style.borderLeft = '3px solid #a855f7';
            } else {
              selectedThreads = selectedThreads.filter(id => id !== tid);
              el.style.background = 'transparent';
              el.style.borderLeft = 'none';
            }
          });
        });
        showToast(`${res.threads.length} chat dimuat`, 'ok');
      }
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      $('btn-dm-fetch-inbox').disabled = false;
    }
  });

  $('btn-copy-uname').addEventListener('click', () => { navigator.clipboard.writeText(scrapedUsers.map(u => u.username).join('\n')); showToast('Username disalin!', 'ok'); });


  $('btn-send-follow').addEventListener('click', () => {
    const list = scrapedUsers.map(u => `${u.pk}`).join('\n');
    $('oc-res').value = list;
    shadow.querySelector('[data-tab="ocypus"]').click();
    showToast(`${scrapedUsers.length} Akun → Follow`, 'ok');
  });

  // ---- COMMENT RUNNER MAPPING ----
  const commentPostInp = $('comment-post-targets');
  const commentReplyInp = $('comment-reply-targets');

  if (commentPostInp && commentReplyInp) {
    commentPostInp.addEventListener('input', () => {
      if (commentPostInp.value.trim().length > 0) commentReplyInp.value = '';
    });
    commentReplyInp.addEventListener('input', () => {
      if (commentReplyInp.value.trim().length > 0) commentPostInp.value = '';
    });
  }

  const refreshCommentTemplates = async () => {
    try {
      const res = await fetch(`${NODE_SERVER}/api/extension/setup-files/comment`).then(r => r.json());
      if (res.ok) {
        const sel = $('comment-template-file');
        if (!sel) return;
        sel.innerHTML = res.files.map(f => `<option value="${f}">${f}</option>`).join('');
      }
    } catch (e) { }
  };
  refreshCommentTemplates();

  $('comment-use-jeda')?.addEventListener('change', (e) => {
    $('comment-jeda-config').style.display = e.target.checked ? 'block' : 'none';
  });

  $('btn-start-comment')?.addEventListener('click', () => {
    const postTargets = (commentPostInp?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
    const replyTargets = (commentReplyInp?.value || '').split('\n').map(s => s.trim()).filter(Boolean);

    let mode = '';
    let targets = [];

    if (postTargets.length > 0) {
      mode = 'post';
      targets = postTargets;
    } else if (replyTargets.length > 0) {
      mode = 'reply';
      targets = replyTargets;
    }

    if (!mode || targets.length === 0) {
      showToast('Silakan isi target Comment atau Reply.', 'err');
      return;
    }

    const template = $('comment-template-file')?.value;
    if (!template) {
      showToast('Pilih template file .txt dahulu.', 'err');
      return;
    }

    const delay = parseInt($('comment-delay')?.value || '6000');
    const limit = parseInt($('comment-limit')?.value || '1');
    const timeVal = parseInt($('comment-time-val')?.value || '24');

    // Deteksi mode yang aktif dari tombol
    let timeMode = 'off';
    if ($('time-filter-min')?.classList.contains('active')) timeMode = 'minutes';
    if ($('time-filter-hour')?.classList.contains('active')) timeMode = 'hours';

    const useJeda = $('comment-use-jeda')?.checked || false;
    const jedaThreshold = parseInt($('comment-jeda-threshold')?.value || '5');
    const jedaTime = parseInt($('comment-jeda-time')?.value || '5');

    bg('START_COMMENT', { mode, targets, template, delay, limit, timeVal, timeMode, useJeda, jedaThreshold, jedaTime });

    if (commentInt) clearInterval(commentInt);
    commentInt = setInterval(async () => {
      const st = await bg('GET_COMMENT_STATE');
      if (st) {
        $('comment-done').textContent = st.success || 0;
        $('comment-fail').textContent = st.fail || 0;
        $('comment-skip').textContent = st.skip || 0;
        $('comment-total').textContent = `${st.done || 0}/${st.total || 0}`;
        $('comment-status').textContent = st.status || '';

        if (st.logs && st.logs.length) {
          const lbox = $('comment-logs');
          lbox.innerHTML = st.logs.map(l => `<div class="result-item">${l}</div>`).reverse().join('');
        }

        if (!st.running) {
          clearInterval(commentInt);
          $('btn-start-comment').disabled = false;
          $('btn-stop-comment').style.display = 'none';
        }
      }
    }, 1000);

    $('btn-start-comment').disabled = true;
    $('btn-stop-comment').style.display = 'inline-block';
  });

  $('btn-stop-comment')?.addEventListener('click', () => {
    bg('STOP_COMMENT');
  });

  // Time Filter Button Logic (OFF/MIN/HOUR)
  const timeBtns = ['time-filter-off', 'time-filter-min', 'time-filter-hour'];
  timeBtns.forEach(id => {
    shadow.getElementById(id)?.addEventListener('click', () => {
      timeBtns.forEach(bid => {
        const b = shadow.getElementById(bid);
        if (b) {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = '#666';
          b.style.boxShadow = 'none';
        }
      });
      const btn = shadow.getElementById(id);
      btn.classList.add('active');
      btn.style.background = '#fff';
      btn.style.color = '#7c3aed';
      btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';

      const desc = shadow.getElementById('time-filter-desc');
      const val = shadow.getElementById('comment-time-val').value;
      if (id === 'time-filter-off') {
        desc.innerHTML = 'Komentar akan dikirim ke postingan terakhir <b>kapanpun</b>.';
      } else if (id === 'time-filter-min') {
        desc.innerHTML = `Komentar dikirim jika post berumur <b>0 sampai ${val} menit</b>.`;
      } else {
        desc.innerHTML = `Komentar dikirim jika post berumur <b>0 sampai ${val} jam 59 menit</b>.`;
      }
    });
  });

  $('btn-scrape-engager').addEventListener('click', () => {
    const mediaIds = scrapedUsers.map(u => u.mediaId || u.pk).filter(Boolean);
    if (!mediaIds.length) { showToast('Tidak ada Media ID!', 'err'); return; }

    $('sc-target').value = mediaIds.join('\n');
    $('sc-type').value = 'likers';
    $('sc-type').dispatchEvent(new Event('change'));
    scrapedUsers = [];
    $('sc-results').innerHTML = '';
    $('sc-results').style.display = 'none';
    $('sc-actions').style.display = 'none';
    $('sc-status').textContent = `Siap scrape ${mediaIds.length} Media ID. Pilih 'Likers' atau 'Comments' lalu klik Mulai.`;
    showToast('Media ID dipindahkan!', 'ok');
  });

  $('sc-type').addEventListener('change', () => {
    const type = $('sc-type').value;
    const isPostScrape = ['user_posts', 'hashtag_posts', 'location_posts'].includes(type);
    if (isPostScrape) {
      $('btn-scrape-engager').style.display = 'inline-block';
      $('btn-send-follow').style.display = 'none';
    } else {
      $('btn-scrape-engager').style.display = 'none';
      $('btn-send-follow').style.display = 'inline-block';
    }
  });

  // ---- LIKE RUNNER ----
  let likeInt = null;
  let commentInt = null;
  let slStopRequested = false;
  let slRunning = false;
  // --- LIKE RUNNER LOGIC ---
  const postTargetsInp = $('like-post-targets');
  const commentTargetsInp = $('like-comment-targets');

  if (postTargetsInp && commentTargetsInp) {
    postTargetsInp.addEventListener('input', () => {
      if (postTargetsInp.value.trim().length > 0) commentTargetsInp.value = '';
    });
    commentTargetsInp.addEventListener('input', () => {
      if (commentTargetsInp.value.trim().length > 0) postTargetsInp.value = '';
    });
  }

  $('btn-start-like')?.addEventListener('click', () => {
    const postTargets = (postTargetsInp?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
    const commentTargets = (commentTargetsInp?.value || '').split('\n').map(s => s.trim()).filter(Boolean);

    let mode = '';
    let targets = [];

    if (postTargets.length > 0) {
      mode = 'post';
      targets = postTargets;
    } else if (commentTargets.length > 0) {
      mode = 'comment';
      targets = commentTargets;
    }

    if (!mode || targets.length === 0) {
      showToast('Silakan isi daftar target terlebih dahulu.', 'err');
      return;
    }

    const delay = parseInt($('like-delay')?.value || '300');
    const limit = parseInt($('like-limit-comment')?.value || '1');
    const useJeda = $('like-use-jeda')?.checked || false;
    const jedaThreshold = parseInt($('like-jeda-threshold')?.value || '50');
    const jedaTime = parseInt($('like-jeda-time')?.value || '2');

    bg('START_LIKE', { mode, targets, delay, limit, useJeda, jedaThreshold, jedaTime });

    if (likeInt) clearInterval(likeInt);
    likeInt = setInterval(async () => {
      const st = await bg('GET_LIKE_STATE');
      if (st) {
        $('like-done').textContent = st.success || 0;
        $('like-fail').textContent = st.fail || 0;
        $('like-skip').textContent = st.skip || 0;
        $('like-total').textContent = `${st.done || 0}/${st.total || 0}`;
        $('like-bar').style.width = ((st.done / st.total) * 100 || 0) + '%';
        $('like-status').textContent = st.status || '';

        if (st.logs && st.logs.length) {
          const lbox = $('like-logs');
          lbox.innerHTML = st.logs.map(l => `<div class="result-item">${l}</div>`).reverse().join('');
        }

        if (!st.running) {
          clearInterval(likeInt);
          $('btn-start-like').disabled = false;
          $('btn-stop-like').style.display = 'none';
        }
      }
    }, 1000);

    $('btn-start-like').disabled = true;
    $('btn-stop-like').style.display = 'inline-block';
  });

  $('btn-stop-like').addEventListener('click', () => {
    bg('STOP_LIKE');
  });

  $('like-use-jeda')?.addEventListener('change', (e) => {
    const cfg = $('like-jeda-config');
    if (cfg) cfg.style.display = e.target.checked ? 'block' : 'none';
  });
  let dmInt = null;
  $('btn-dm-get-followers').addEventListener('click', async () => {
    // Auto-select New DM mode
    const dmMode = $('dm-mode');
    if (dmMode) {
      dmMode.value = 'new';
      dmMode.dispatchEvent(new Event('change'));
    }
    $('btn-dm-get-followers').disabled = true;

    $('dm-status').textContent = 'Mengambil followers...';
    try {
      const res = await bg('DM_SCRAPE_OWN', { type: 'followers' });
      $('dm-uuids').value = res.items.map(u => u.pk).join('\n');
      $('dm-status').textContent = `✅ Berhasil mengambil ${res.items.length} followers`;
      showToast('Followers berhasil diambil!', 'ok');
    } catch (e) {
      $('dm-status').textContent = '❌ ' + e.message;
      showToast(e.message, 'err');
    } finally { $('btn-dm-get-followers').disabled = false; }
  });

  $('btn-dm-get-following').addEventListener('click', async () => {
    // Auto-select New DM mode
    const dmMode = $('dm-mode');
    if (dmMode) {
      dmMode.value = 'new';
      dmMode.dispatchEvent(new Event('change'));
    }
    $('btn-dm-get-following').disabled = true;

    $('dm-status').textContent = 'Mengambil following...';
    try {
      const res = await bg('DM_SCRAPE_OWN', { type: 'following' });
      $('dm-uuids').value = res.items.map(u => u.pk).join('\n');
      $('dm-status').textContent = `✅ Berhasil mengambil ${res.items.length} following`;
      showToast('Following berhasil diambil!', 'ok');
    } catch (e) {
      $('dm-status').textContent = '❌ ' + e.message;
      showToast(e.message, 'err');
    } finally { $('btn-dm-get-following').disabled = false; }
  });

  $('btn-start-dm').addEventListener('click', async () => {
    const uuids = $('dm-uuids').value.trim().split('\n').map(s => s.trim()).filter(Boolean);
    const message = $('dm-message').value.trim();
    const delay = parseInt($('dm-delay').value) || 30000;
    const members = parseInt($('dm-members').value) || 1;
    const useJeda = $('dm-use-jeda')?.checked || false;
    const jedaThreshold = parseInt($('dm-jeda-threshold')?.value) || 10;
    const jedaTime = parseInt($('dm-jeda-time')?.value) || 2;
    const mode = $('dm-mode').value;
    const links = ($('dm-links')?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
    const mediaFolder = $('dm-media-folder')?.value || '';

    if (mode === 'new') {
      if (!uuids.length) { showToast('Isi UUID target!', 'err'); return; }
      if (!message && !mediaFolder) { showToast('Isi pesan atau pilih folder media!', 'err'); return; }
      bg('START_DM', { uuids, message, delay, members, useJeda, jedaThreshold, jedaTime, links, mediaFolder });
    } else {
      if (!selectedThreads.length) { showToast('Pilih chat di Inbox!', 'err'); return; }
      if (!message && !mediaFolder) { showToast('Isi pesan atau pilih folder media!', 'err'); return; }
      // Members always 1 for thread follow-up because we send to existing specific threads
      bg('START_DM', { message, delay, members: 1, useJeda, jedaThreshold, jedaTime, threadIds: selectedThreads, links, mediaFolder });
    }

    if (dmInt) clearInterval(dmInt);
    dmInt = setInterval(async () => {
      try {
        const s = await bg('GET_DM_STATE');
        $('dm-done').textContent = s.success;
        $('dm-fail').textContent = s.fail;
        $('dm-total').textContent = `${s.done}/${s.total}`;
        $('dm-bar').style.width = s.total ? Math.round(s.done / s.total * 100) + '%' : '0%';
        $('dm-status').textContent = s.status || `Proses: ${s.done}/${s.total}`;

        if (s.logs && s.logs.length) {
          $('dm-logs').innerHTML = s.logs.map(l => `<div class="result-item"><span class="uname">${l}</span></div>`).join('');
          $('dm-logs').scrollTop = $('dm-logs').scrollHeight;
        }

        if (!s.running && dmInt) {
          clearInterval(dmInt);
          dmInt = null;
          $('btn-start-dm').disabled = false;
        }
      } catch (e) { }
    }, 2000);

    $('dm-stats-grid').style.display = 'grid'; // Tampilkan card saat ditekan
    $('btn-start-dm').disabled = true;
    showToast('DM Blast dimulai!', 'ok');
  });

  $('btn-stop-dm').addEventListener('click', async () => {
    await bg('STOP_DM');
    if (dmInt) { clearInterval(dmInt); dmInt = null; }
    $('dm-status').textContent = '⏹ Terhenti';
    $('btn-start-dm').disabled = false;
    showToast('DM Blast dihentikan', 'ok');
  });



  let popupObs = null;
  function startPopupObserver() {
    if (popupObs) return;
    const delay = parseInt($('fl-ad-delay').value) || 2000;

    popupObs = new MutationObserver((mutations) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const dismissBtn = btns.find(b => {
        const t = b.innerText.toLowerCase();
        return t.includes('dismiss') || t.includes('not now') || t.includes('lain kali');
      });

      if (dismissBtn) {
        bg('POPUP_DETECTED').catch(() => { });
        setTimeout(() => {
          dismissBtn.click();
          bg('POPUP_CLEARED').catch(() => { });
        }, delay);
      }
    });
    popupObs.observe(document.body, { childList: true, subtree: true });
  }

  function stopPopupObserver() {
    if (popupObs) {
      popupObs.disconnect();
      popupObs = null;
      bg('POPUP_CLEARED').catch(() => { });
    }
  }

  // ---- FEED ----
  $('fd-upload-zone').addEventListener('click', () => fdFileInput.click());
  setupDragDrop($('fd-upload-zone'), loadFeedImage);
  fdFileInput.addEventListener('change', () => { if (fdFileInput.files[0]) loadFeedImage(fdFileInput.files[0]); });
  function loadFeedImage(file) {
    const isVid = file.type.startsWith('video/') || /\.(mp4|mov|mkv)$/i.test(file.name);
    const r = new FileReader();
    r.onload = e => {
      feedImageUrl = e.target.result;
      if (isVid) {
        $('fd-preview').style.display = 'none';
        $('fd-video-preview').src = feedImageUrl;
        $('fd-video-preview').style.display = 'block';
      } else {
        $('fd-video-preview').style.display = 'none';
        $('fd-video-preview').src = '';
        $('fd-preview').src = feedImageUrl;
        $('fd-preview').style.display = 'block';
      }
      $('fd-upload-zone').style.display = 'none';
    };
    r.readAsDataURL(file);
  }
  $('btn-post-feed').addEventListener('click', async () => {
    if (!feedImageUrl) { showToast('Pilih foto atau video!', 'err'); return; }
    await resetSysLogs('Post Feed');
    $('fd-prog').style.display = 'block'; $('fd-bar').style.width = '40%'; $('fd-status').textContent = 'Mengupload...';
    try {
      await bg('POST_FEED', { imageData: feedImageUrl, caption: $('fd-caption').value });
      $('fd-bar').style.width = '100%';
      $('fd-status').textContent = '✅ Feed berhasil!';
      showToast('Feed berhasil! 🎉', 'ok');
      setTimeout(() => {
        feedImageUrl = null;
        $('fd-preview').style.display = 'none';
        $('fd-video-preview').style.display = 'none';
        $('fd-video-preview').src = '';
        $('fd-upload-zone').style.display = 'block';
        $('fd-caption').value = '';
        if ($('fd-caption-file')) $('fd-caption-file').value = '';
        $('fd-prog').style.display = 'none';
        $('fd-bar').style.width = '0%';
        $('fd-status').textContent = '';
      }, 1500);
    }
    catch (e) { $('fd-bar').style.width = '0%'; $('fd-status').textContent = '❌ ' + e.message; showToast(e.message, 'err'); }
  });

  // ---- BULK FEED UI HANDLED EARLIER IN SCRIPT ----

  // ---- SHORTLINK ----
  $('sl-provider').addEventListener('change', (e) => {
    const val = e.target.value;
    $('sl-apikey-wrap').style.display = (val === 'bitly' || val === 'tinyurl_api') ? 'block' : 'none';
  });

  $('btn-copy-shortlink').addEventListener('click', () => {
    const res = $('sl-result').value;
    if (!res) return;
    navigator.clipboard.writeText(res).then(() => showToast('Shortlink disalin!', 'ok'));
  });

  // --- SHORTLINK PRESET CORE ---
  let shortlinkUrlMap = {};
  async function loadShortlinkPresets() {
    try {
      // Fetch via background script to bypass Instagram CSP
      const data = await bg('GET_SHORTLINK_URLS');
      shortlinkUrlMap = data;
      const select = $('sl-preset-url');
      if (!select) return;
      while (select.options.length > 1) select.remove(1);

      for (const [key, url] of Object.entries(data)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key.toUpperCase();
        select.appendChild(opt);
      }
    } catch (e) {
      // console.warn('Using fallback presets', e);
      const fallback = { "imo": "https://firehouse-sand.vercel.app", "clickdealer": "https://date.melarata25.workers.dev", "trafee": "https://amorcute.pages.dev" };
      shortlinkUrlMap = fallback;
      const select = $('sl-preset-url');
      if (select) {
        while (select.options.length > 1) select.remove(1);
        for (const [key, url] of Object.entries(fallback)) {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = key.toUpperCase();
          select.appendChild(opt);
        }
      }
    }
  }

  $('sl-preset-url').addEventListener('change', () => {
    const val = $('sl-preset-url').value;
    if (val === 'custom') {
      $('sl-custom-url-wrap').style.display = 'block';
      $('sl-longurl').value = '';
    } else {
      $('sl-custom-url-wrap').style.display = 'none';
      $('sl-longurl').value = shortlinkUrlMap[val] || '';
    }
  });

  loadShortlinkPresets();

  $('btn-generate-shortlink')?.addEventListener('click', async () => {
    if (slRunning) {
      slStopRequested = true;
      $('btn-generate-shortlink').disabled = true;
      $('sl-status').textContent = '⚠️ Menghentikan...';
      return;
    }

    const provider = $('sl-provider').value;
    const presetKey = $('sl-preset-url').value;
    let baseLongUrl = '';

    if (presetKey === 'custom') {
      baseLongUrl = $('sl-longurl').value.trim();
    } else {
      baseLongUrl = (shortlinkUrlMap[presetKey] || '').trim();
    }

    const apiKey = $('sl-apikey').value.trim();
    const qty = parseInt($('sl-bulk-count').value) || 1;
    const count = Math.min(50, Math.max(1, qty));

    const status = $('sl-status');
    const resultInput = $('sl-result');
    const progWrap = $('sl-prog-sl');
    const progBar = $('sl-bar');

    if (!baseLongUrl) { showToast('URL tidak boleh kosong', 'err'); return; }
    if (['bitly', 'tinyurl_api'].includes(provider) && !apiKey) {
      showToast('API Key wajib diisi untuk layanan ini', 'err'); return;
    }

    // Smart logic: Auto-prepend https:// if missing
    if (!/^https?:\/\//i.test(baseLongUrl)) {
      baseLongUrl = 'https://' + baseLongUrl;
      if (presetKey === 'custom') $('sl-longurl').value = baseLongUrl;
    }

    // Smart logic: Remove trailing slash
    baseLongUrl = baseLongUrl.replace(/\/+$/, '');

    slRunning = true;
    slStopRequested = false;

    // Change UI to STOP state
    const genBtn = $('btn-generate-shortlink');
    genBtn.innerHTML = '⏹ Stop Shortlink';
    genBtn.style.background = 'linear-gradient(135deg, #e53e3e, #f56565)';
    genBtn.style.boxShadow = '0 4px 15px rgba(229, 62, 62, 0.3)';

    resultInput.value = '';
    progWrap.style.display = 'block';
    progBar.style.width = '0%';
    status.style.color = '#555';

    let successCount = 0;

    for (let i = 0; i < count; i++) {
      if (slStopRequested) {
        status.textContent = `🛑 Dihentikan pada ${i}/${count}`;
        status.style.color = '#dc2626';
        break;
      }

      status.textContent = `Memproses... ${i + 1}/${count} ⏳`;
      progBar.style.width = `${((i) / count) * 100}%`;

      // Cache Bypass Injection (Randomly pick one parameter)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const paramTypes = [
        { name: 'v', len: 5 + Math.floor(Math.random() * 3) },     // 5-7 chars
        { name: 'token', len: 7 + Math.floor(Math.random() * 4) }, // 7-10 chars
        { name: 'hash', len: 6 + Math.floor(Math.random() * 4) }   // 6-9 chars
      ];
      const selected = paramTypes[Math.floor(Math.random() * paramTypes.length)];
      let randomVal = '';
      for (let j = 0; j < selected.len; j++) {
        randomVal += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const extraParam = `${selected.name}=${randomVal}`;
      const urlWithSlash = baseLongUrl.includes('?') ? baseLongUrl : (baseLongUrl.endsWith('/') ? baseLongUrl : baseLongUrl + '/');
      const longUrl = urlWithSlash.includes('?') ? `${urlWithSlash}&${extraParam}` : `${urlWithSlash}?${extraParam}`;

      try {
        let finalShortUrl = '';
        if (provider === 'none') {
          finalShortUrl = longUrl;
        } else {
          finalShortUrl = await bg('GENERATE_SHORTLINK', { provider, longUrl, apiKey });
        }

        if (!finalShortUrl || !finalShortUrl.startsWith('http')) {
          throw new Error('Respons API tidak valid: ' + finalShortUrl);
        }

        resultInput.value += finalShortUrl + '\n';
        successCount++;
      } catch (e) {
        resultInput.value += `[Error baris ${i + 1}] ${e.message}\n`;
      }

      // 1-second delay to prevent rate limiting, unless it's the last item
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    progBar.style.width = '100%';
    setTimeout(() => { if (progWrap) progWrap.style.display = 'none'; }, 1000);

    if (slStopRequested) {
      // Keep stop message
    } else if (successCount === count) {
      status.textContent = `✅ Berhasil generate ${successCount} link!`;
      status.style.color = '#16a34a';
    } else {
      status.textContent = `⚠️ Selesai dengan ${count - successCount} error.`;
      status.style.color = '#dc2626';
    }

    // Restore UI to GENERATE state
    const finalGenBtn = $('btn-generate-shortlink');
    finalGenBtn.innerHTML = '⚡ Generate Shortlink';
    finalGenBtn.style.background = ''; // Revert to CSS default
    finalGenBtn.style.boxShadow = '';
    finalGenBtn.disabled = false;
    slRunning = false;
  });

  // ---- PROFILE ----
  $('pr-pic-zone').addEventListener('click', () => prFileInput.click());
  prFileInput.addEventListener('change', () => { if (!prFileInput.files[0]) return; const r = new FileReader(); r.onload = e => { profilePicUrl = e.target.result; $('pr-pic-prev').src = profilePicUrl; $('pr-pic-prev').style.display = 'block'; $('pr-pic-zone').style.display = 'none'; }; r.readAsDataURL(prFileInput.files[0]); });

  $('btn-fetch-profile').addEventListener('click', async () => {
    try {
      const btn = $('btn-fetch-profile');
      btn.disabled = true;
      btn.textContent = '⏳ Memuat...';
      $('pr-status').textContent = '🔄 Memuat data profile...';
      const p = await bg('GET_PROFILE_DATA');
      $('pr-bio').value = p.biography || '';
      $('pr-fullname').value = p.fullName || '';
      $('pr-website').value = p.externalUrl || '';
      if (p.gender) $('pr-gender').value = String(p.gender);
      $('pr-chaining').checked = p.chainingEnabled !== false;

      if (p.profilePicUrl) $('prof-avatar').src = p.profilePicUrl;
      if (p.fullName) $('prof-name').textContent = p.fullName;

      $('pr-status').textContent = '✅ Data profil berhasil dimuat.';
      setTimeout(() => { $('pr-status').textContent = ''; }, 3000);
    } catch (e) {
      // console.warn('Fail fetching profile data', e);
      $('pr-status').innerHTML = `<span style="color:#ef4444">❌ Gagal: ${e.message || 'Cek login'}.</span>`;
    } finally {
      const btn = $('btn-fetch-profile');
      btn.disabled = false;
      btn.textContent = '🔄 Ambil Data';
    }
  });

  $('btn-save-profile').addEventListener('click', async () => {
    $('btn-save-profile').disabled = true;
    const bio = $('pr-bio').value;
    const fullName = $('pr-fullname').value;
    const externalUrl = $('pr-website').value;
    const gender = parseInt($('pr-gender').value);
    const chainingEnabled = $('pr-chaining').checked;

    try {
      // 1. Update Profile Fields
      $('pr-status').textContent = 'Mengupdate data profil...';
      await bg('UPDATE_PROFILE', {
        biography: bio,
        fullName: fullName,
        externalUrl: externalUrl,
        gender: gender,
        chainingEnabled: chainingEnabled
      });

      // 2. Update Profile Picture if selected
      if (profilePicUrl) {
        $('pr-status').textContent = 'Mengupload Foto Profil...';
        await bg('UPDATE_PROFILE_PIC', { imageData: profilePicUrl });
        profilePicUrl = null; // Clear after successful upload
        $('pr-pic-prev').style.display = 'none';
        $('pr-pic-zone').style.display = 'block';
      }
      $('pr-status').textContent = '✅ Profil berhasil diperbarui!';
      showToast('Profil diperbarui! ✨', 'ok');

      // Refresh user info
      setTimeout(refreshSession, 1500);

    } catch (e) {
      $('pr-status').textContent = '❌ ' + e.message;
      showToast(e.message, 'err');
    } finally {
      $('btn-save-profile').disabled = false;
    }
  });





  // Hook tab change
  const originalSwitch = tab => {
    if (tab === 'link') loadShortlinkPresets();
  };
  // The existing tab listener is already there, let's add our hooks
  shadow.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => originalSwitch(tab.dataset.tab));
  });

  // Safe Mode UI logic




  // Init
  updateColors();
  refreshSession();
  loadBulkOptions();
  initAutoSetup();
  startSmartHeartbeat();

  // ISOLATION: Prevent Instagram from catching keyboard events in panel
  // 1. Identity Override: Make the Shadow Host look like an INPUT to global listeners
  try {
    Object.defineProperty(host, 'tagName', { get: () => 'INPUT', configurable: true });
    Object.defineProperty(host, 'nodeName', { get: () => 'INPUT', configurable: true });
    Object.defineProperty(host, 'isContentEditable', { get: () => true, configurable: true });
  } catch (e) { }

  // 2. The Shadow Trap: Catch events at the host level and re-dispatch them as non-composed
  // This prevents keyboard events from ever "leaking" out of our shadow root.
  const shadowTrap = e => {
    if (!e.isTrusted) return; // Ignore our own clones

    // Stop the original event from reaching the document/window
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Re-dispatch a trapped copy to the original target
    // composed: false is the key here — it keeps the event inside our shadow bubble
    const trap = new KeyboardEvent(e.type, {
      key: e.key, code: e.code, location: e.location,
      ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
      repeat: e.repeat, isComposing: e.isComposing, keyCode: e.keyCode, charCode: e.charCode,
      bubbles: true, cancelable: true, composed: false
    });
    e.composedPath()[0].dispatchEvent(trap);
  };

  ['keydown', 'keyup', 'keypress'].forEach(type => {
    // We listen on the host (the entry point to the shadow)
    host.addEventListener(type, shadowTrap, true);
    panel.addEventListener(type, e => e.stopPropagation(), false);
  });

  // 3. MAIN WORLD SHIELD: Disabled due to CSP (Content Security Policy) in modern browsers/MV3.
  // The existing shadowTrap on the host level already provides keyboard isolation.

  // ---- AUTO SETUP ----
  async function initAutoSetup() {
    await populateAutoSetupDropdowns();
    await loadAvailableConfigs();
    await loadAutoSetupConfig();
  }

  async function populateAutoSetupDropdowns() {
    try {
      const folders = await bg('GET_MEDIA_FOLDERS');
      const files = await bg('GET_TEXT_FILES');

      const fldSelects = ['auto-fd-folder', 'auto-pr-folder', 'auto-st-folder'];
      const txtSelects = ['auto-fd-caption', 'auto-pr-bio', 'auto-st-urls', 'auto-st-text', 'auto-hl-titles'];

      fldSelects.forEach(id => {
        const sel = $(id);
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">-- Pilih Folder --</option>';
        (folders || []).forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.path || f;
          opt.textContent = f.name || (f.path ? f.path.split('/').pop() : f);
          sel.appendChild(opt);
        });
        if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
      });

      const txtConfig = {
        'auto-fd-caption': 'setup/caption/',
        'auto-pr-bio': 'setup/bio/',
        'auto-st-urls': 'setup/link/',
        'auto-st-text': 'setup/sticker/',
        'auto-hl-titles': 'setup/highlights/'
      };

      Object.entries(txtConfig).forEach(([id, prefix]) => {
        const sel = $(id);
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">-- Pilih File --</option>';
        (files || []).forEach(f => {
          if (f.startsWith(prefix)) {
            const opt = document.createElement('option');
            opt.value = f; opt.textContent = f.replace(prefix, '');
            sel.appendChild(opt);
          }
        });
        if (current) sel.value = current;
      });
    } catch (e) {
      // console.error('Error populating auto setup dropdowns', e);
    }
  }

  async function loadAutoSetupConfig() {
    try {
      const res = await fetch(`${NODE_SERVER}/api/extension/autosetup-config`).then(r => r.json());
      if (res.ok && res.config) {
        applyAutoSetupConfig(res.config);
      }
    } catch (e) { }
  }

  function applyAutoSetupConfig(c) {
    if (!c) return;
    if (c.feed) {
      $('auto-fd-folder').value = c.feed.folder || '';
      $('auto-fd-caption').value = c.feed.captionFile || '';
      $('auto-fd-count').value = c.feed.count || 1;
      $('auto-fd-delay').value = c.feed.delayMin || 30;
    }
    if (c.profile) {
      $('auto-pr-folder').value = c.profile.avatarFolder || '';
      $('auto-pr-bio').value = c.profile.bioFile || '';
    }
    if (c.story) {
      $('auto-st-folder').value = c.story.folder || '';
      if ($('auto-st-mediatype')) $('auto-st-mediatype').value = c.story.mediaType || 'mix';
      if ($('auto-st-target')) {
        $('auto-st-target').value = c.story.targetUrlType || 'imo';
        if ($('auto-st-custom-url')) {
          $('auto-st-custom-url').value = c.story.customUrlValue || '';
          $('auto-st-custom-url').style.display = $('auto-st-target').value === 'custom' ? 'block' : 'none';
        }
      }
      $('auto-st-text').value = c.story.stickerTextFile || '';
      $('auto-st-count').value = c.story.count || 1;
      if ($('auto-st-short-provider')) {
        $('auto-st-short-provider').value = c.story.shortlinkProvider || (c.story.useShortlink ? 'spoome' : 'none');
        if ($('auto-st-short-apikey')) {
          $('auto-st-short-apikey').value = c.story.shortlinkApiKey || '';
          $('auto-st-short-apikey').style.display = ['bitly', 'tinyurl_api'].includes($('auto-st-short-provider').value) ? 'block' : 'none';
        }
      }
      $('auto-st-blur').checked = c.story.blur || false;
      $('auto-st-mute').checked = c.story.mute || false;
    }
    if (c.highlight) {
      $('auto-hl-titles').value = c.highlight.titlesFile || '';
      $('auto-hl-enabled').checked = c.highlight.enabled || false;
    }
  }

  async function loadAvailableConfigs() {
    try {
      const res = await fetch(`${NODE_SERVER}/api/extension/autosetup/configs`).then(r => r.json());
      const sel = $('auto-config-list');
      if (res.ok && sel) {
        const current = sel.value;
        sel.innerHTML = '<option value="">-- Custom / New --</option>';
        res.configs.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name; opt.textContent = '📦 ' + name;
          sel.appendChild(opt);
        });
        if (current) sel.value = current;
      }
    } catch (e) { }
  }

  $('auto-config-list')?.addEventListener('change', async (e) => {
    const name = e.target.value;
    if (!name) return;
    try {
      const res = await fetch(`${NODE_SERVER}/api/extension/autosetup/configs/${encodeURIComponent(name)}`).then(r => r.json());
      if (res.ok && res.config) {
        applyAutoSetupConfig(res.config);
        $('auto-config-name').value = name;
        showToast(`Config "${name}" dimuat!`, 'ok');
      }
    } catch (e) {
      showToast('Gagal memuat config: ' + e.message, 'err');
    }
  });

  $('btn-save-named-config')?.addEventListener('click', async () => {
    const name = $('auto-config-name').value.trim();
    if (!name) return showToast('Masukkan nama konfigurasi!', 'err');

    const config = getAutoSetupConfigFromUI();
    try {
      const res = await fetch(`${NODE_SERVER}/api/extension/autosetup/configs/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      }).then(r => r.json());

      if (res.ok) {
        showToast(`Config "${name}" berhasil disimpan!`, 'ok');
        await loadAvailableConfigs();
        $('auto-config-list').value = name;
      }
    } catch (e) {
      showToast('Gagal menyimpan config: ' + e.message, 'err');
    }
  });

  $('btn-delete-config')?.addEventListener('click', async () => {
    const name = $('auto-config-list').value;
    if (!name) return;
    if (!confirm(`Hapus konfigurasi "${name}"?`)) return;

    try {
      const res = await fetch(`${NODE_SERVER}/api/extension/autosetup/configs/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      }).then(r => r.json());

      if (res.ok) {
        showToast(`Config "${name}" dihapus.`, 'ok');
        $('auto-config-list').value = '';
        $('auto-config-name').value = '';
        await loadAvailableConfigs();
      }
    } catch (e) {
      showToast('Gagal menghapus config: ' + e.message, 'err');
    }
  });

  function getAutoSetupConfigFromUI() {
    return {
      feed: {
        enabled: !!$('auto-fd-folder').value,
        folder: $('auto-fd-folder').value,
        captionFile: $('auto-fd-caption').value,
        count: parseInt($('auto-fd-count').value) || 1,
        delayMin: parseInt($('auto-fd-delay').value) || 30,
        delayMax: Math.round((parseInt($('auto-fd-delay').value) || 30) * 1.5)
      },
      profile: {
        enabled: !!($('auto-pr-folder').value || $('auto-pr-bio').value),
        avatarFolder: $('auto-pr-folder').value,
        bioFile: $('auto-pr-bio').value
      },
      story: {
        enabled: !!$('auto-st-folder').value,
        folder: $('auto-st-folder').value,
        mediaType: $('auto-st-mediatype') ? $('auto-st-mediatype').value : 'mix',
        targetUrlType: $('auto-st-target') ? $('auto-st-target').value : 'imo',
        customUrlValue: $('auto-st-custom-url') ? $('auto-st-custom-url').value : '',
        stickerTextFile: $('auto-st-text').value,
        count: parseInt($('auto-st-count').value) || 1,
        shortlinkProvider: $('auto-st-short-provider') ? $('auto-st-short-provider').value : 'none',
        shortlinkApiKey: $('auto-st-short-apikey') ? $('auto-st-short-apikey').value : '',
        blur: $('auto-st-blur').checked,
        mute: $('auto-st-mute').checked,
        x: typeof pillX !== 'undefined' ? parseFloat(pillX.toFixed(3)) : 0.5,
        y: typeof pillY !== 'undefined' ? parseFloat(pillY.toFixed(3)) : 0.75,
        scale: typeof pillScale !== 'undefined' ? parseFloat(pillScale.toFixed(2)) : 1.0,
        rotation: typeof pillRotation !== 'undefined' ? parseFloat(pillRotation.toFixed(1)) : 0,
        color: $('st-color') ? $('st-color').value : '#ffffff',
        textColor: $('st-textcolor') ? $('st-textcolor').value : '#0095f6',
        radius: $('st-radius') ? parseInt($('st-radius').value) || 15 : 15,
        fontSize: $('st-fontsize') ? parseFloat($('st-fontsize').value) || 16.5 : 16.5,
        fontFile: typeof currentFontFile !== 'undefined' && currentFontFile ? currentFontFile : ''
      },
      highlight: {
        enabled: $('auto-hl-enabled').checked,
        titlesFile: $('auto-hl-titles').value
      }
    };
  }

  async function saveAutoSetupConfig() {
    const config = getAutoSetupConfigFromUI();

    try {
      const res = await fetch(`${NODE_SERVER}/api/extension/autosetup-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      }).then(r => r.json());
      if (res.ok) showToast('Config Auto Setup disimpan! ✨', 'ok');
      return config;
    } catch (e) {
      showToast('Gagal menyimpan config: ' + e.message, 'err');
      return null;
    }
  }

  if ($('auto-st-target')) {
    $('auto-st-target').addEventListener('change', (e) => {
      if ($('auto-st-custom-url')) $('auto-st-custom-url').style.display = e.target.value === 'custom' ? 'block' : 'none';
      if (e.target.value === 'setuplink') {
        if ($('auto-st-short-provider')) {
          $('auto-st-short-provider').value = 'none';
          $('auto-st-short-provider').dispatchEvent(new Event('change'));
        }
      }
    });
  }

  if ($('auto-st-short-provider')) {
    $('auto-st-short-provider').addEventListener('change', (e) => {
      if ($('auto-st-short-apikey')) $('auto-st-short-apikey').style.display = ['bitly', 'tinyurl_api'].includes(e.target.value) ? 'block' : 'none';
    });
  }

  $('btn-start-autosetup').addEventListener('click', async () => {
    if (autoSetupActive) return;

    const session = await bg('GET_SESSION');
    if (!session || !session.loggedIn) {
      showToast('Silakan login ke Instagram terlebih dahulu.', 'err');
      return;
    }

    const config = await saveAutoSetupConfig();
    if (!config) return;

    autoSetupActive = true;
    $('btn-start-autosetup').disabled = true;
    $('btn-start-autosetup').textContent = '⌛ Auto Setup Running...';
    $('auto-status').textContent = 'Memulai proses Auto Setup...';
    $('auto-prog-wrap').style.display = 'block';
    $('auto-bar').style.width = '0%';

    try {
      // Clear old logs so previous success/completed status doesn't contaminate the new run
      await resetSysLogs('Auto Setup');

      // --- POLLING FALLBACK FOR BRAVE STATUS SYNC ---
      const pollInterval = setInterval(async () => {
        if (!autoSetupActive) {
          clearInterval(pollInterval);
          return;
        }
        try {
          const u = session.username || '__global__';
          const response = await fetch(`${NODE_SERVER}/api/extension/logs?username=${encodeURIComponent(u)}`);
          const logRes = await response.json();
          if (logRes.ok && logRes.logs) {
            // Filter out technical logs from the fallback polling too
            const filteredLogs = logRes.logs.filter(l => !/\[Shortlink\]|\[SKIP\]|\[story\]|\[DM-.*\]|\[dm\]|\[like\]|\[LIKE-RUNNER\]|view[-_]?story|Watching stories|Found \d+ stories|Menemukan \d+ akun|Mengambil story|Mempersiapkan tools|CONFIG PROCESSED|Mode: (Timeline|Target|UUID)|Istirahat sejenak|Auto Setup|Fase \d:|\[P\d\]|\[account\]|\[feed\]|\[highlight\]|\[vid-unique\]|broadcastPhoto|broadcastText|media\.like|media\.likeComment|can't project the same paths/i.test(l.message));
            const latestTask = [...filteredLogs].reverse().find(l => l.type === 'task-update');
            if (latestTask) {
              const taskData = JSON.parse(latestTask.message);
              updateStatusUI(taskData);
            }
          }
        } catch (e) { }
      }, 1500);

      await fetch(`${NODE_SERVER}/api/extension/autosetup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, session })
      });
    } catch (e) {
      $('auto-status').textContent = '❌ Gagal: ' + e.message;
      $('btn-start-autosetup').disabled = false;
      $('btn-start-autosetup').textContent = '🚀 Start Auto Setup';
      autoSetupActive = false;
    }
  });


})();

