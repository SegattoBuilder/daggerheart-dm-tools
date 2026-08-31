// ========== MODE TOGGLE ==========
const MODE_KEY = 'dh_dm_mode';

function toggleMode() {
    const isLight = document.body.getAttribute('data-mode') === 'light';
    const newMode = isLight ? 'dark' : 'light';
    document.body.setAttribute('data-mode', newMode);
    localStorage.setItem(MODE_KEY, newMode);
    document.getElementById('modeToggleIcon').textContent = newMode === 'light' ? '☀️' : '🌙';
}

function initMode() {
    const saved = localStorage.getItem(MODE_KEY) || 'dark';
    document.body.setAttribute('data-mode', saved);
    const chk = document.getElementById('modeToggleChk');
    if (chk) chk.checked = saved === 'light';
    document.getElementById('modeToggleIcon').textContent = saved === 'light' ? '☀️' : '🌙';
}

// ========== SHARED CONSTANTS ==========
const SAVE_KEY = 'dh_dm_creatures';
const FEAR_KEY = 'dh_dm_fear';
const COUNTERS_KEY = 'dh_dm_counters';
const CAMPAIGN_KEY = 'dh_campaign_name';

// ========== SHARED STATE ==========
let creatures = [];
let fearFilled = 0;
let actionCounters = [];

// ========== UTILITIES ==========
function escHtmlAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function getLocStr(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj['en-US'] || obj['en'] || Object.values(obj)[0] || '';
}

function autoCache() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(creatures));
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(actionCounters));
    localStorage.setItem(FEAR_KEY, String(fearFilled));
}

function getNextName(baseName) {
    const all = [...creatures, ...vaultCreatures];
    const existing = all.filter(c => c.name === baseName || c.name.match(new RegExp('^' + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\d+$')));
    if (existing.length === 0) return baseName;
    const nums = existing.map(c => { const m = c.name.match(/ (\d+)$/); return m ? parseInt(m[1]) : 1; });
    return `${baseName} ${Math.max(...nums) + 1}`;
}

function hasNameConflict(name, excludeId) {
    const all = [...creatures, ...vaultCreatures];
    return all.some(c => c.id !== excludeId && c.name === name);
}

function isVaultActive() {
    return !document.getElementById('panelVault').classList.contains('hidden');
}

// ========== TAB SWITCHING ==========
function switchTab(tab) {
    ['tracker','adversaries','compendium','vault','support'].forEach(t => {
        document.getElementById('panel' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('hidden', tab !== t);
        document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', tab === t);
    });
    document.getElementById('trackerActions').classList.toggle('hidden', tab !== 'tracker');
    document.getElementById('vaultActions').classList.toggle('hidden', tab !== 'vault');
}

// ========== INIT ==========
window.onload = () => {
    initMode();
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
        try { creatures = JSON.parse(raw) || []; } catch { creatures = []; }
    }
    try { vaultCreatures = JSON.parse(localStorage.getItem(VAULT_KEY)) || []; } catch { vaultCreatures = []; }
    fearFilled = parseInt(localStorage.getItem(FEAR_KEY)) || 0;
    renderFearDots();
    try { actionCounters = JSON.parse(localStorage.getItem(COUNTERS_KEY)) || []; } catch { actionCounters = []; }
    const savedCampaign = localStorage.getItem(CAMPAIGN_KEY) || '';
    const cnInput = document.getElementById('campaignName');
    cnInput.value = savedCampaign;
    if (savedCampaign) cnInput.style.width = Math.min(savedCampaign.length + 2, 56) + 'ch';
    renderGrid();
    renderVaultGrid();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeAddTypeModal(); closeAddModal(); closeEnemyModal(); closeCustomModal(); closeCardModal(); }
        if (e.key === 'Enter' && !document.getElementById('addModal').classList.contains('hidden')) addCreatures();
    });

    loadCompendium();
};
