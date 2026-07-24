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
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
    const existing = creatures.filter(c => c.name === baseName || c.name.match(new RegExp('^' + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\d+$')));
    if (existing.length === 0) return baseName;
    const nums = existing.map(c => { const m = c.name.match(/ (\d+)$/); return m ? parseInt(m[1]) : 1; });
    return `${baseName} ${Math.max(...nums) + 1}`;
}

// ========== TAB SWITCHING ==========
function switchTab(tab) {
    document.getElementById('panelTracker').classList.toggle('hidden', tab !== 'tracker');
    document.getElementById('panelCompendium').classList.toggle('hidden', tab !== 'compendium');
    document.getElementById('panelSupport').classList.toggle('hidden', tab !== 'support');
    document.getElementById('tabTracker').classList.toggle('active', tab === 'tracker');
    document.getElementById('tabCompendium').classList.toggle('active', tab === 'compendium');
    document.getElementById('tabSupport').classList.toggle('active', tab === 'support');
    document.getElementById('trackerActions').classList.toggle('hidden', tab !== 'tracker');
}

// ========== INIT ==========
window.onload = () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
        try { creatures = JSON.parse(raw) || []; } catch { creatures = []; }
    }
    fearFilled = parseInt(localStorage.getItem(FEAR_KEY)) || 0;
    renderFearDots();
    try { actionCounters = JSON.parse(localStorage.getItem(COUNTERS_KEY)) || []; } catch { actionCounters = []; }
    const savedCampaign = localStorage.getItem(CAMPAIGN_KEY) || '';
    const cnInput = document.getElementById('campaignName');
    cnInput.value = savedCampaign;
    if (savedCampaign) cnInput.style.width = Math.min(savedCampaign.length + 2, 56) + 'ch';
    renderGrid();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeAddTypeModal(); closeAddModal(); closeEnemyModal(); closeCustomModal(); closeCardModal(); }
        if (e.key === 'Enter' && !document.getElementById('addModal').classList.contains('hidden')) addCreatures();
    });

    loadCompendium();
};
