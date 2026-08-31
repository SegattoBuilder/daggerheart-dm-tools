// ========== SAVE / LOAD ==========
function saveSession() {
    const campaign = document.getElementById('campaignName').value.trim();
    const slug = campaign ? campaign.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' : '';
    const data = { creatures, actionCounters, fearFilled, campaign, vaultCreatures };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug + 'dh-session-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

function loadSession(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            creatures = data.creatures || [];
            actionCounters = data.actionCounters || [];
            fearFilled = data.fearFilled || 0;
            vaultCreatures = data.vaultCreatures || [];
            if (data.campaign) {
                document.getElementById('campaignName').value = data.campaign;
                localStorage.setItem(CAMPAIGN_KEY, data.campaign);
            }
            autoCache();
            autoCacheVault();
            renderFearDots();
            renderGrid();
            renderVaultGrid();
        } catch {
            alert('Invalid session file.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ========== ACTION COUNTERS ==========
function addCounter() {
    actionCounters.push({ id: 'ac-' + Date.now(), label: 'Action Counter', value: 0 });
    autoCache();
    renderGrid();
}

function removeCounter(id) {
    if (!confirm('Remove this counter?')) return;
    actionCounters = actionCounters.filter(c => c.id !== id);
    autoCache();
    renderGrid();
}

function stepCounter(id, delta) {
    const c = actionCounters.find(c => c.id === id);
    if (!c) return;
    c.value = Math.max(0, Math.min(100, c.value + delta));
    autoCache();
    renderCounterCard(c);
}

function renameCounter(id, val) {
    const c = actionCounters.find(c => c.id === id);
    if (!c) return;
    c.label = val || 'Action Counter';
    autoCache();
}

function buildCounterCard(c) {
    const atZero = c.value === 0;
    return `
        <div id="${c.id}" class="creature-card flex flex-col w-48 ${atZero ? 'ring-1 ring-[#d4a01760]' : ''}" style="border-top-color: #d4a017; padding: 12px;">
            <div class="flex justify-between items-center mb-2">
                <input value="${escHtmlAttr(c.label)}" onchange="renameCounter('${c.id}', this.value)" class="bg-transparent font-bold text-[11px] uppercase font-[Cinzel] text-[#f5efe6] outline-none border-b border-transparent focus:border-[#d4a017] w-full mr-2">
                <button onclick="removeCounter('${c.id}')" class="text-zinc-700 hover:text-red-500 text-xs leading-none flex-shrink-0">✕</button>
            </div>
            <div class="flex items-center justify-center gap-3">
                <button onclick="stepCounter('${c.id}', -1)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-[#2a2418] border border-[#3d362a] text-zinc-300 hover:text-white text-sm font-bold">−</button>
                <span class="text-2xl font-black font-[Cinzel] ${atZero ? 'text-[#d4a017]' : 'text-[#f5efe6]'} min-w-[2rem] text-center">${c.value}</span>
                <button onclick="stepCounter('${c.id}', 1)" class="w-7 h-7 flex items-center justify-center rounded-lg bg-[#2a2418] border border-[#3d362a] text-zinc-300 hover:text-white text-sm font-bold">+</button>
            </div>
        </div>`;
}

function renderCounterCard(c) {
    const el = document.getElementById(c.id);
    if (!el) return;
    el.outerHTML = buildCounterCard(c);
}

// ========== FEAR POOL ==========
function buildFearDots() {
    let html = '';
    for (let i = 0; i < 12; i++) {
        html += `<div id="fear-${i}" class="dot ${i < fearFilled ? 'filled-fear' : ''}" onclick="toggleFear(${i})"></div>`;
    }
    return html;
}

function renderFearDots() {
    document.getElementById('fearDots').innerHTML = buildFearDots();
}

function toggleFear(index) {
    fearFilled = index < fearFilled ? index : index + 1;
    localStorage.setItem(FEAR_KEY, String(fearFilled));
    renderFearDots();
}

function resetFear() {
    fearFilled = 0;
    localStorage.setItem(FEAR_KEY, fearFilled);
    renderFearDots();
}

// ========== ADD TYPE SELECTION ==========
function openAddModal() {
    document.getElementById('addTypeModal').classList.remove('hidden');
}

function closeAddTypeModal() {
    document.getElementById('addTypeModal').classList.add('hidden');
}

// ========== ADD CHARACTER MODAL ==========
function openCharacterModal() {
    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('modalName').value = '';
    document.getElementById('modalEvasion').value = '10';
    document.getElementById('modalHp').value = '1';
    document.getElementById('modalStress').value = '0';
    document.getElementById('modalHope').value = '0';
    document.getElementById('modalArmor').value = '0';
    document.getElementById('modalQty').value = '1';
    document.getElementById('modalMajor').value = '';
    document.getElementById('modalSevere').value = '';
    document.getElementById('modalAtk').value = '';
    document.getElementById('modalFeatures').value = '';
    document.getElementById('modalName').focus();
}

function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
    document.getElementById('addModal').removeAttribute('data-edit-id');
    document.getElementById('modalQtyRow').classList.remove('hidden');
    document.getElementById('modalSubmitBtn').textContent = 'Add';
}

function editCharacterCard(creatureId, fromVault) {
    const creature = (fromVault ? vaultCreatures : creatures).find(c => c.id === creatureId);
    if (!creature) return;
    const ed = creature.enemyData;
    const thresholds = ed ? (ed.thresholds || '') : '';
    const [major, severe] = thresholds ? thresholds.split('/').map(s => s.trim()) : ['', ''];
    const featuresText = ed && ed.feature ? ed.feature.map(f => f.text ? `${f.name}: ${f.text}` : f.name).join('\n') : '';

    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('addModal').setAttribute('data-edit-id', creatureId);
    document.getElementById('modalQtyRow').classList.add('hidden');
    document.getElementById('modalSubmitBtn').textContent = 'Save';
    document.getElementById('modalName').value = creature.name;
    document.getElementById('modalEvasion').value = creature.evasion || '10';
    document.getElementById('modalHp').value = creature.hpMax || '1';
    document.getElementById('modalStress').value = creature.stressMax || '0';
    document.getElementById('modalHope').value = creature.hopeMax || '0';
    document.getElementById('modalArmor').value = creature.armorMax || '0';
    document.getElementById('modalMajor').value = major === '?' ? '' : (major || '');
    document.getElementById('modalSevere').value = severe === '?' ? '' : (severe || '');
    document.getElementById('modalAtk').value = ed ? (ed.attack || '') : '';
    document.getElementById('modalFeatures').value = featuresText;
    document.getElementById('modalName').focus();
}

function addCreatures() {
    const name = document.getElementById('modalName').value.trim();
    const evasion = parseInt(document.getElementById('modalEvasion').value) || 0;
    const hp = parseInt(document.getElementById('modalHp').value) || 0;
    const stress = parseInt(document.getElementById('modalStress').value) || 0;
    const hope = parseInt(document.getElementById('modalHope').value) || 0;
    const armor = parseInt(document.getElementById('modalArmor').value) || 0;
    const qty = Math.max(1, Math.min(20, parseInt(document.getElementById('modalQty').value) || 1));
    const major = document.getElementById('modalMajor').value.trim();
    const severe = document.getElementById('modalSevere').value.trim();
    const atk = document.getElementById('modalAtk').value.trim();
    const featuresRaw = document.getElementById('modalFeatures').value.trim();

    if (!name) { alert('Please enter a name.'); return; }

    const hasExtra = major || severe || atk || featuresRaw;
    let enemyData = null;

    if (hasExtra) {
        const thresholds = (major || severe) ? `${major || '?'}/${severe || '?'}` : '';
        const features = featuresRaw ? featuresRaw.split('\n').filter(l => l.trim()).map(line => {
            const colonIdx = line.indexOf(':');
            if (colonIdx > -1) return { name: line.slice(0, colonIdx).trim(), text: line.slice(colonIdx + 1).trim() };
            return { name: line.trim(), text: '' };
        }) : [];

        enemyData = {
            name,
            difficulty: '',
            hp: String(hp),
            stress: String(stress),
            thresholds,
            atk: atk.match(/[+-]\d+/)?.[0] || '',
            attack: atk,
            damage: '',
            range: '',
            description: '',
            experience: '',
            motives_and_tactics: '',
            ability: '',
            feature: features,
            type: 'Character',
            tier: ''
        };
    }

    // Edit mode
    const editId = document.getElementById('addModal').getAttribute('data-edit-id');
    if (editId) {
        const creature = creatures.find(c => c.id === editId) || vaultCreatures.find(c => c.id === editId);
        const isVault = vaultCreatures.includes(creature);
        if (creature) {
            if (hasNameConflict(name, editId)) { alert('Name already in use. Please choose a different name.'); return; }
            creature.name = name;
            creature.evasion = evasion;
            creature.hpMax = hp;
            creature.hpFilled = Math.min(creature.hpFilled, hp);
            creature.stressMax = stress;
            creature.stressFilled = Math.min(creature.stressFilled, stress);
            creature.hopeMax = hope;
            creature.hopeFilled = Math.min(creature.hopeFilled, hope);
            creature.armorMax = armor;
            creature.armorFilled = Math.min(creature.armorFilled, armor);
            creature.enemyData = enemyData;
            if (isVault) { autoCacheVault(); renderVaultCard(creature); }
            else { autoCache(); renderCard(creature); }
            closeAddModal();
            return;
        }
    }

    // Create mode

    const toVault = isVaultActive();
    for (let i = 1; i <= qty; i++) {
        const creatureName = qty > 1 ? `${name} ${i}` : getNextName(name);
        const creature = {
            id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            name: creatureName,
            evasion,
            hpMax: hp, hpFilled: hp,
            stressMax: stress, stressFilled: stress,
            hopeMax: hope, hopeFilled: hope,
            armorMax: armor, armorFilled: armor
        };
        if (enemyData) creature.enemyData = enemyData;
        if (toVault) vaultCreatures.push(creature);
        else creatures.push(creature);
    }

    if (toVault) { autoCacheVault(); renderVaultGrid(); }
    else { autoCache(); renderGrid(); }
    closeAddModal();
}

// ========== ADD ENEMY MODAL ==========
const ADVERSARIES_URL = 'https://raw.githubusercontent.com/seansbox/daggerheart-srd/main/.build/03_json/adversaries.json';
const ADVERSARIES_CACHE_KEY = 'dh_adversaries_cache';
let adversariesData = [];
let selectedEnemy = null;

async function loadAdversaries() {
    const cached = localStorage.getItem(ADVERSARIES_CACHE_KEY);
    if (cached) {
        try { adversariesData = JSON.parse(cached); return; } catch { /* fetch */ }
    }
    try {
        const r = await fetch(ADVERSARIES_URL);
        adversariesData = await r.json();
        localStorage.setItem(ADVERSARIES_CACHE_KEY, JSON.stringify(adversariesData));
    } catch { adversariesData = []; }
}

function openEnemyModal() {
    document.getElementById('enemyModal').classList.remove('hidden');
    document.getElementById('enemySearch').value = '';
    document.getElementById('enemyResults').classList.add('hidden');
    document.getElementById('enemyPreview').classList.add('hidden');
    document.getElementById('enemyQty').value = '1';
    selectedEnemy = null;
    const btn = document.getElementById('enemyAddBtn');
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    document.getElementById('enemySearch').focus();
    if (adversariesData.length === 0) loadAdversaries();
}

function closeEnemyModal() {
    document.getElementById('enemyModal').classList.add('hidden');
}

function searchEnemies(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return adversariesData.filter(a => a.name.toLowerCase().includes(q)).slice(0, 10);
}

function selectEnemy(index) {
    selectedEnemy = adversariesData[index];
    document.getElementById('enemySearch').value = selectedEnemy.name;
    document.getElementById('enemyResults').classList.add('hidden');

    const thresholds = selectedEnemy.thresholds || '';
    const [major, severe] = thresholds.split('/').map(s => s.trim());

    document.getElementById('enemyPreview').classList.remove('hidden');
    document.getElementById('enemyPreview').innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <span class="font-black text-sm font-[Cinzel] text-[#f5efe6]">${escHtml(selectedEnemy.name)}</span>
            <span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(selectedEnemy.type || '')} • T${escHtml(selectedEnemy.tier || '')}</span>
        </div>
        <div class="flex flex-wrap gap-2 mb-2 text-[10px]">
            <span class="text-blue-300">Difficulty ${escHtml(selectedEnemy.difficulty || '')}</span>
            <span class="text-red-300">HP ${escHtml(selectedEnemy.hp || '')}</span>
            <span class="text-purple-300">Stress ${escHtml(selectedEnemy.stress || '')}</span>
            ${major ? `<span class="text-amber-300">Major ${escHtml(major)}+</span>` : ''}
            ${severe ? `<span class="text-red-400">Severe ${escHtml(severe)}+</span>` : ''}
        </div>
        <div class="text-[10px] text-zinc-500 mb-1">⚔️ ${escHtml(selectedEnemy.attack || '')} ${escHtml(selectedEnemy.damage || '')} (${escHtml(selectedEnemy.range || '')})</div>
        ${selectedEnemy.description ? `<div class="text-[10px] text-zinc-600 italic">${escHtml(selectedEnemy.description)}</div>` : ''}
    `;

    const btn = document.getElementById('enemyAddBtn');
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
}

function addEnemy() {
    if (!selectedEnemy) return;
    const qty = Math.max(1, Math.min(20, parseInt(document.getElementById('enemyQty').value) || 1));
    const hp = parseInt(selectedEnemy.hp) || 1;
    const stress = parseInt(selectedEnemy.stress) || 0;
    const evasion = parseInt(selectedEnemy.difficulty) || 10;
    const toVault = isVaultActive();

    for (let i = 1; i <= qty; i++) {
        const name = qty > 1 ? `${selectedEnemy.name} ${i}` : getNextName(selectedEnemy.name);
        const c = {
            id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            name,
            evasion,
            hpMax: hp, hpFilled: hp,
            stressMax: stress, stressFilled: stress,
            hopeMax: 0, hopeFilled: 0,
            armorMax: 0, armorFilled: 0,
            enemyData: selectedEnemy
        };
        if (toVault) vaultCreatures.push(c);
        else creatures.push(c);
    }

    if (toVault) { autoCacheVault(); renderVaultGrid(); }
    else { autoCache(); renderGrid(); }
    closeEnemyModal();
}

// Enemy search input listener
document.getElementById('enemySearch').addEventListener('input', (e) => {
    const results = searchEnemies(e.target.value);
    const container = document.getElementById('enemyResults');
    if (results.length === 0) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');
    container.innerHTML = results.map(a => {
        const idx = adversariesData.indexOf(a);
        return `<div onclick="selectEnemy(${idx})" class="px-4 py-2 text-sm hover:bg-[#2a2418] cursor-pointer border-b border-[#3d362a] last:border-0">
            <span class="text-[#f5efe6]">${escHtml(a.name)}</span>
            <span class="text-[10px] text-zinc-500 ml-2">${escHtml(a.type || '')} • T${escHtml(a.tier || '')}</span>
        </div>`;
    }).join('');
});

// ========== CUSTOM ATTACK ROWS ==========
function addCustomAttackRow(name = '', atk = '', damage = '', range = '') {
    const list = document.getElementById('customAttacksList');
    const row = document.createElement('div');
    row.className = 'border border-[#3d362a] rounded-lg p-2 relative';
    row.innerHTML = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <input type="text" placeholder="Name" value="${escHtmlAttr(name)}" class="bg-[#1a1714] border border-[#4a3f30] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#d4a017] text-center">
            <input type="text" placeholder="ATK" value="${escHtmlAttr(atk)}" class="bg-[#1a1714] border border-[#4a3f30] rounded-lg px-2 py-2 text-xs outline-none focus:border-[#d4a017] text-center">
            <input type="text" placeholder="Damage" value="${escHtmlAttr(damage)}" class="bg-[#1a1714] border border-[#4a3f30] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#d4a017] text-center">
            <input type="text" placeholder="Range" value="${escHtmlAttr(range)}" class="bg-[#1a1714] border border-[#4a3f30] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#d4a017] text-center">
        </div>
        <button type="button" onclick="if(confirm('Remove this attack?'))this.parentElement.remove()" class="absolute top-1 right-1 text-zinc-700 hover:text-red-500 text-xs leading-none">✕</button>
    `;
    list.appendChild(row);
}

function getCustomAttacks() {
    const rows = document.getElementById('customAttacksList').querySelectorAll(':scope > div');
    const attacks = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const name = inputs[0].value.trim();
        const atk = inputs[1].value.trim();
        const damage = inputs[2].value.trim();
        const range = inputs[3].value.trim();
        if (name || damage) attacks.push({ name, atk, damage, range });
    });
    return attacks;
}

function setCustomAttacks(attacks) {
    document.getElementById('customAttacksList').innerHTML = '';
    if (!attacks || attacks.length === 0) {
        addCustomAttackRow();
        return;
    }
    attacks.forEach(a => addCustomAttackRow(a.name || '', a.atk || '', a.damage || '', a.range || ''));
}

// Convert legacy single attack fields to attacks array
function enemyDataToAttacks(ed) {
    if (ed.attacks && ed.attacks.length) return ed.attacks;
    if (ed.attack || ed.damage) return [{ name: ed.attack || '', atk: ed.atk || '', damage: ed.damage || '', range: ed.range || '' }];
    return [];
}

// ========== ADD CUSTOM MODAL ==========
function openCustomModal() {
    document.getElementById('customModal').classList.remove('hidden');
    document.getElementById('customName').value = '';
    document.getElementById('customDifficulty').value = '10';
    document.getElementById('customHp').value = '1';
    document.getElementById('customStress').value = '0';
    document.getElementById('customMajor').value = '';
    document.getElementById('customSevere').value = '';
    document.getElementById('customType').value = '';
    document.getElementById('customRange').value = '';
    setCustomAttacks([]);
    document.getElementById('customMotives').value = '';
    document.getElementById('customExperience').value = '';
    document.getElementById('customDescription').value = '';
    document.getElementById('customFeatures').value = '';
    document.getElementById('customQty').value = '1';
    document.getElementById('customName').focus();
}

function closeCustomModal() {
    document.getElementById('customModal').classList.add('hidden');
    document.getElementById('customModal').removeAttribute('data-edit-id');
    document.getElementById('customModal').removeAttribute('data-edit-type');
    document.getElementById('customQtyRow').classList.remove('hidden');
    document.getElementById('customSubmitBtn').textContent = 'Add';
}

function editCustomCard(creatureId, fromVault) {
    const creature = (fromVault ? vaultCreatures : creatures).find(c => c.id === creatureId);
    if (!creature || !creature.enemyData) return;
    const ed = creature.enemyData;
    const thresholds = ed.thresholds || '';
    const [major, severe] = thresholds.split('/').map(s => s.trim());
    const featuresText = (ed.feature || []).map(f => f.text ? `${f.name}: ${f.text}` : f.name).join('\n');

    document.getElementById('customModal').classList.remove('hidden');
    document.getElementById('customModal').setAttribute('data-edit-id', creatureId);
    document.getElementById('customModal').setAttribute('data-edit-type', ed.type || 'Custom');
    document.getElementById('customQtyRow').classList.add('hidden');
    document.getElementById('customSubmitBtn').textContent = 'Save';
    document.getElementById('customName').value = creature.name;
    document.getElementById('customDifficulty').value = ed.difficulty || creature.evasion || '10';
    document.getElementById('customHp').value = ed.hp || creature.hpMax || '1';
    document.getElementById('customStress').value = ed.stress || creature.stressMax || '0';
    document.getElementById('customMajor').value = major === '?' ? '' : (major || '');
    document.getElementById('customSevere').value = severe === '?' ? '' : (severe || '');
    document.getElementById('customType').value = ed.type || '';
    document.getElementById('customRange').value = ed.range || '';
    setCustomAttacks(enemyDataToAttacks(ed));
    document.getElementById('customMotives').value = ed.motives_and_tactics || '';
    document.getElementById('customExperience').value = ed.experience || '';
    document.getElementById('customDescription').value = ed.description || '';
    document.getElementById('customFeatures').value = featuresText;
    document.getElementById('customName').focus();
}

function editEnemyCard(creatureId, fromVault) {
    const creature = (fromVault ? vaultCreatures : creatures).find(c => c.id === creatureId);
    if (!creature || !creature.enemyData) return;
    const ed = creature.enemyData;
    const thresholds = ed.thresholds || '';
    const [major, severe] = thresholds.split('/').map(s => s.trim());
    const featuresText = (ed.feature || []).map(f => f.text ? `${f.name}: ${f.text}` : f.name).join('\n');

    document.getElementById('customModal').classList.remove('hidden');
    document.getElementById('customModal').setAttribute('data-edit-id', creatureId);
    document.getElementById('customModal').setAttribute('data-edit-type', 'Enemy (Edited)');
    document.getElementById('customQtyRow').classList.add('hidden');
    document.getElementById('customSubmitBtn').textContent = 'Save';
    document.getElementById('customName').value = creature.name;
    document.getElementById('customDifficulty').value = ed.difficulty || creature.evasion || '10';
    document.getElementById('customHp').value = ed.hp || creature.hpMax || '1';
    document.getElementById('customStress').value = ed.stress || creature.stressMax || '0';
    document.getElementById('customMajor').value = major === '?' ? '' : (major || '');
    document.getElementById('customSevere').value = severe === '?' ? '' : (severe || '');
    document.getElementById('customType').value = ed.type || '';
    document.getElementById('customRange').value = ed.range || '';
    setCustomAttacks(enemyDataToAttacks(ed));
    document.getElementById('customMotives').value = ed.motives_and_tactics || '';
    document.getElementById('customExperience').value = ed.experience || '';
    document.getElementById('customDescription').value = ed.description || '';
    document.getElementById('customFeatures').value = featuresText;
    document.getElementById('customName').focus();
}

function addCustom() {
    const name = document.getElementById('customName').value.trim();
    if (!name) { alert('Please enter a name.'); return; }

    const difficulty = parseInt(document.getElementById('customDifficulty').value) || 10;
    const hp = parseInt(document.getElementById('customHp').value) || 1;
    const stress = parseInt(document.getElementById('customStress').value) || 0;
    const major = document.getElementById('customMajor').value.trim();
    const severe = document.getElementById('customSevere').value.trim();
    const customType = document.getElementById('customType').value.trim();
    const customRange = document.getElementById('customRange').value.trim();
    const attacks = getCustomAttacks();
    const motives = document.getElementById('customMotives').value.trim();
    const experience = document.getElementById('customExperience').value.trim();
    const description = document.getElementById('customDescription').value.trim();
    const featuresRaw = document.getElementById('customFeatures').value.trim();
    const qty = Math.max(1, Math.min(20, parseInt(document.getElementById('customQty').value) || 1));

    const thresholds = (major || severe) ? `${major || '?'}/${severe || '?'}` : '';
    const features = featuresRaw ? featuresRaw.split('\n').filter(l => l.trim()).map(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) return { name: line.slice(0, colonIdx).trim(), text: line.slice(colonIdx + 1).trim() };
        return { name: line.trim(), text: '' };
    }) : [];

    const enemyData = {
        name,
        difficulty: String(difficulty),
        hp: String(hp),
        stress: String(stress),
        thresholds,
        atk: attacks.length ? (attacks[0].name.match(/[+-]\d+/)?.[0] || '') : '',
        attack: attacks.length ? attacks[0].name : '',
        damage: attacks.length ? attacks[0].damage : '',
        range: attacks.length ? attacks[0].range : customRange,
        attacks: attacks,
        description: description,
        experience: experience,
        motives_and_tactics: motives,
        ability: '',
        feature: features,
        type: customType || document.getElementById('customModal').getAttribute('data-edit-type') || 'Custom',
        tier: ''
    };

    // Edit mode
    const editId = document.getElementById('customModal').getAttribute('data-edit-id');
    if (editId) {
        const creature = creatures.find(c => c.id === editId) || vaultCreatures.find(c => c.id === editId);
        const isVault = vaultCreatures.includes(creature);
        if (creature) {
            if (hasNameConflict(name, editId)) { alert('Name already in use. Please choose a different name.'); return; }
            creature.name = name;
            creature.evasion = difficulty;
            creature.hpMax = hp;
            creature.hpFilled = Math.min(creature.hpFilled, hp);
            creature.stressMax = stress;
            creature.stressFilled = Math.min(creature.stressFilled, stress);
            creature.enemyData = enemyData;
            if (isVault) { autoCacheVault(); renderVaultCard(creature); }
            else { autoCache(); renderCard(creature); }
            closeCustomModal();
            return;
        }
    }

    // Create mode
    const toVault = isVaultActive();
    for (let i = 1; i <= qty; i++) {
        const creatureName = qty > 1 ? `${name} ${i}` : getNextName(name);
        const c = {
            id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            name: creatureName,
            evasion: difficulty,
            hpMax: hp, hpFilled: hp,
            stressMax: stress, stressFilled: stress,
            hopeMax: 0, hopeFilled: 0,
            armorMax: 0, armorFilled: 0,
            enemyData
        };
        if (toVault) vaultCreatures.push(c);
        else creatures.push(c);
    }

    if (toVault) { autoCacheVault(); renderVaultGrid(); }
    else { autoCache(); renderGrid(); }
    closeCustomModal();
}

// ========== CREATURE MANAGEMENT ==========
function copyCreature(id) {
    const source = creatures.find(c => c.id === id);
    if (!source) return;
    const baseName = source.name.replace(/ \d+$/, '');
    const copy = {
        ...JSON.parse(JSON.stringify(source)),
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        name: getNextName(baseName),
        notes: ''
    };
    const idx = creatures.indexOf(source);
    creatures.splice(idx + 1, 0, copy);
    autoCache();
    renderGrid();
}

function removeCreature(id, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Remove this creature?')) return;
    creatures = creatures.filter(c => c.id !== id);
    autoCache();
    renderGrid();
}

function toggleDot(creatureId, type, index) {
    const creature = creatures.find(c => c.id === creatureId);
    if (!creature) return;

    const key = type + 'Filled';
    if (index < creature[key]) {
        creature[key] = index;
    } else {
        creature[key] = index + 1;
    }

    autoCache();
    renderCard(creature);
}

function adjustMax(creatureId, type, delta) {
    const creature = creatures.find(c => c.id === creatureId);
    if (!creature) return;

    if (type === 'evasion') {
        creature.evasion = Math.max(0, Math.min(30, (creature.evasion || 0) + delta));
        autoCache();
        renderCard(creature);
        return;
    }

    const maxKey = type + 'Max';
    const filledKey = type + 'Filled';
    const newMax = (creature[maxKey] || 0) + delta;

    if (newMax < 0 || newMax > 30) return;

    creature[maxKey] = newMax;
    if (creature[filledKey] > newMax) creature[filledKey] = newMax;
    if (delta > 0) creature[filledKey] = Math.min((creature[filledKey] || 0) + 1, newMax);

    autoCache();
    renderCard(creature);
}

function renderDots(creature, type) {
    const max = creature[type + 'Max'];
    const filled = creature[type + 'Filled'];
    let html = '';
    for (let i = 0; i < max; i++) {
        html += `<div class="dot ${i < filled ? 'filled-' + type : ''}" onclick="toggleDot('${creature.id}', '${type}', ${i})"></div>`;
    }
    return html;
}

function isCreatureDead(creature) {
    return creature.hpFilled <= 0;
}

function renderCard(creature) {
    const el = document.getElementById(creature.id);
    if (!el) return;
    const dead = isCreatureDead(creature);
    el.className = `creature-card ${dead ? 'dead' : ''}`;
    el.innerHTML = buildCardInner(creature, dead);
}

function buildCardInner(creature, dead) {
    const adjBtn = (type, delta) => `<button onclick="adjustMax('${creature.id}', '${type}', ${delta})" class="w-4 h-4 flex items-center justify-center rounded bg-[#2a2418] border border-[#3d362a] text-zinc-500 hover:text-white text-[10px] leading-none">${delta < 0 ? '−' : '+'}</button>`;

    const dotRow = (type, label, color) => {
        const max = creature[type + 'Max'] || 0;
        if (max === 0) return '';
        const filled = creature[type + 'Filled'] || 0;
        return `
            <div class="mb-2.5">
                <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[10px] font-bold ${color} uppercase tracking-wide">${label}</span>
                        ${adjBtn(type, -1)}${adjBtn(type, 1)}
                    </div>
                    <span class="text-[10px] text-zinc-600">${filled}/${max}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">${renderDots(creature, type)}</div>
            </div>`;
    };

    const evasion = creature.evasion || 0;
    const ed = creature.enemyData;

    let enemyInfo = '';
    if (ed) {
        const thresholds = ed.thresholds || '';
        const [major, severe] = thresholds.split('/').map(s => s.trim());
        const features = ed.feature || [];

        enemyInfo = `
            <div class="mt-3 pt-3 border-t border-[#2a2418] space-y-2">
                <div class="flex flex-wrap gap-1.5">
                    <span class="text-[10px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-300">${escHtml(ed.type || '')} • T${escHtml(ed.tier || '')}</span>
                    ${major ? `<span class="text-[10px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-amber-300">Major ${escHtml(major)}+</span>` : ''}
                    ${severe ? `<span class="text-[10px] bg-[#2a1a1a] border border-[#3d2a2a] rounded px-1.5 py-0.5 text-red-300">Severe ${escHtml(severe)}+</span>` : ''}
                </div>
                <div class="text-xs text-[#e8e0d4]">${(ed.attacks && ed.attacks.length ? ed.attacks : (ed.attack ? [{name: ed.attack, damage: ed.damage, range: ed.range, atk: ed.atk}] : [])).map(a => { const atkVal = a.atk || ed.atk || ''; return `⚔️ <span class="font-bold">${escHtml(a.name || '')}</span>${atkVal ? ' • ' + escHtml(atkVal) : ''} • ${escHtml(a.damage || '')} • ${escHtml(a.range || '')}`; }).join('<br>')}</div>
                ${ed.experience ? `<div class="text-xs text-[#e8e0d4]">📋 ${escHtml(ed.experience)}</div>` : ''}
                ${ed.motives_and_tactics ? `<div class="text-xs text-[#e8e0d4]">🎯 ${escHtml(ed.motives_and_tactics)}</div>` : ''}
                ${ed.ability ? `<div class="text-xs text-[#e8e0d4]">✨ ${escHtml(ed.ability)}</div>` : ''}
                ${ed.description ? `<div class="text-xs text-zinc-400 italic">${escHtml(ed.description)}</div>` : ''}
                ${features.length ? `<div class="space-y-1.5 mt-2">${features.map(f => `
                    <div>
                        <div class="text-xs font-bold text-amber-200">${escHtml(f.name || '')}</div>
                        <div class="text-xs text-[#e8e0d4]">${escHtml(f.text || '')}</div>
                    </div>`).join('')}
                </div>` : ''}
            </div>`;
    }

    return `
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
                ${dead ? '<span class="text-red-500 text-sm">💀</span>' : (ed ? (ed.type === 'Custom' ? '<span class="text-zinc-600 text-sm">⚙️</span>' : ed.type === 'Enemy (Edited)' ? '<span class="text-zinc-600 text-sm">👹⚙️</span>' : '<span class="text-zinc-600 text-sm">👹</span>') : '<span class="text-zinc-600 text-sm">⚔️</span>')}
                <span class="font-black text-sm uppercase font-[Cinzel] ${dead ? 'text-zinc-600 line-through' : 'text-[#f5efe6]'}">${creature.name}</span>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="copyCreature('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Duplicate">➕</button>
                <button onclick="stashToVault('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Stash to Vault">📦</button>
                ${ed && (ed.type === 'Custom' || ed.type === 'Enemy (Edited)') ? `<button onclick="editCustomCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>` : ''}
                ${ed && ed.type === 'Character' ? `<button onclick="editCharacterCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>` : ''}
                ${!ed ? `<button onclick="editCharacterCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>` : ''}
                ${ed && ed.type !== 'Custom' && ed.type !== 'Character' && ed.type !== 'Enemy (Edited)' ? `<button onclick="editEnemyCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>` : ''}
                <button onclick="flipCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Notes">📝</button>
                <button onclick="removeCreature('${creature.id}', event)" class="text-zinc-700 hover:text-red-500 text-sm leading-none" title="Remove">✕</button>
            </div>
        </div>
        ${evasion > 0 ? `
        <div class="flex items-center gap-2 mb-3 pb-2.5 border-b border-[#2a2418]">
            <span class="text-[10px] font-bold text-blue-300 uppercase tracking-wide">${ed ? 'Difficulty' : 'Evasion'}</span>
            ${adjBtn('evasion', -1)}
            <span class="text-sm font-bold text-blue-200">${evasion}</span>
            ${adjBtn('evasion', 1)}
        </div>` : ''}
        ${dotRow('hp', 'HP', 'text-red-400')}
        ${dotRow('stress', 'Stress', 'text-purple-400')}
        ${dotRow('hope', 'Hope', 'text-amber-400')}
        ${dotRow('armor', 'Armor', 'text-blue-400')}
        ${enemyInfo}
    `;
}

// ========== CARD FLIP (NOTES) ==========
function flipCard(creatureId) {
    const creature = creatures.find(c => c.id === creatureId);
    if (!creature) return;
    const el = document.getElementById(creature.id);
    if (!el) return;
    el.innerHTML = buildCardBack(creature);
}

function flipBack(creatureId) {
    const creature = creatures.find(c => c.id === creatureId);
    if (!creature) return;
    renderCard(creature);
}

function updateNotes(creatureId, value) {
    const creature = creatures.find(c => c.id === creatureId);
    if (!creature) return;
    creature.notes = value;
    autoCache();
}

function buildCardBack(creature) {
    return `
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
                <span class="text-zinc-600 text-sm">📝</span>
                <span class="font-black text-sm uppercase font-[Cinzel] text-[#f5efe6]">${creature.name}</span>
            </div>
            <button onclick="flipBack('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-[10px] uppercase tracking-wide font-bold">← Back</button>
        </div>
        <textarea oninput="updateNotes('${creature.id}', this.value)" placeholder="Add notes..." class="w-full h-40 bg-[#1a1714] border border-[#3d362a] rounded-lg px-3 py-2 text-xs text-[#e8e0d4] outline-none focus:border-[#d4a017] resize-none placeholder-zinc-700">${escHtml(creature.notes || '')}</textarea>
    `;
}

// ========== DRAG & DROP REORDER ==========
let draggedId = null;

function onDragStart(e, id) {
    draggedId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.4';
}

function onDragEnd(e) {
    e.target.style.opacity = '';
    draggedId = null;
    document.querySelectorAll('.creature-card.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function onDragEnter(e, id) {
    if (id === draggedId) return;
    const el = document.getElementById(id);
    if (el) el.classList.add('drag-over');
}

function onDragLeave(e, id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('drag-over');
}

function onDrop(e, targetId) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const fromIdx = creatures.findIndex(c => c.id === draggedId);
    const toIdx = creatures.findIndex(c => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = creatures.splice(fromIdx, 1);
    creatures.splice(toIdx, 0, moved);

    autoCache();
    renderGrid();
}

// ========== GRID RENDERING ==========
function renderGrid() {
    const grid = document.getElementById('creatureGrid');

    if (creatures.length === 0 && actionCounters.length === 0) {
        grid.innerHTML = '<div id="emptyState" class="col-span-full text-center py-20"><div class="text-zinc-600 text-sm italic">No creatures yet. Click "+ Adversary" to get started.</div></div>';
        return;
    }

    grid.innerHTML = '';

    // Counters in their own row
    if (actionCounters.length > 0) {
        const counterRow = document.createElement('div');
        counterRow.className = 'col-span-full flex flex-wrap gap-3 mb-2';
        actionCounters.forEach(c => {
            const div = document.createElement('div');
            div.innerHTML = buildCounterCard(c);
            counterRow.appendChild(div.firstElementChild);
        });
        grid.appendChild(counterRow);

        const sep = document.createElement('div');
        sep.className = 'col-span-full border-b border-[#3d362a] mb-2';
        grid.appendChild(sep);
    }

    creatures.forEach(creature => {
        const dead = isCreatureDead(creature);
        const div = document.createElement('div');
        div.id = creature.id;
        div.className = `creature-card ${dead ? 'dead' : ''}`;
        div.draggable = true;
        div.setAttribute('ondragstart', `onDragStart(event, '${creature.id}')`);
        div.setAttribute('ondragend', 'onDragEnd(event)');
        div.setAttribute('ondragover', 'onDragOver(event)');
        div.setAttribute('ondragenter', `onDragEnter(event, '${creature.id}')`);
        div.setAttribute('ondragleave', `onDragLeave(event, '${creature.id}')`);
        div.setAttribute('ondrop', `onDrop(event, '${creature.id}')`);
        div.innerHTML = buildCardInner(creature, dead);
        grid.appendChild(div);
    });
}

// ========== CLEAR FUNCTIONS ==========
function clearCreatures(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Remove all adversaries?')) return;
    creatures = [];
    autoCache();
    renderGrid();
}

function clearCounters(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Remove all counters?')) return;
    actionCounters = [];
    autoCache();
    renderGrid();
}

function clearAll(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Clear all creatures, counters and fear pool? This cannot be undone.')) return;
    creatures = [];
    actionCounters = [];
    fearFilled = 0;
    localStorage.setItem(FEAR_KEY, 0);
    autoCache();
    renderFearDots();
    renderGrid();
}
