// ========== VAULT ==========
const VAULT_KEY = 'dh_dm_vault';
let vaultCreatures = [];

function autoCacheVault() {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vaultCreatures));
}

// ========== STASH FROM TRACKER ==========
function stashToVault(id) {
    const idx = creatures.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (!confirm('Move this creature to the vault?')) return;
    const creature = creatures.splice(idx, 1)[0];
    vaultCreatures.push(creature);
    autoCache();
    autoCacheVault();
    renderGrid();
    renderVaultGrid();
}

// ========== DEPLOY TO TRACKER ==========
function deployToTracker(id, asIs) {
    const idx = vaultCreatures.findIndex(c => c.id === id);
    if (idx === -1) return;
    const creature = vaultCreatures.splice(idx, 1)[0];
    if (!asIs) {
        creature.hpFilled = creature.hpMax;
        creature.stressFilled = creature.stressMax;
        creature.hopeFilled = creature.hopeMax;
        creature.armorFilled = creature.armorMax;
    }
    creatures.push(creature);
    autoCache();
    autoCacheVault();
    renderGrid();
    renderVaultGrid();
}

// ========== VAULT CREATURE MANAGEMENT ==========
function removeVaultCreature(id, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Remove this creature from vault?')) return;
    vaultCreatures = vaultCreatures.filter(c => c.id !== id);
    autoCacheVault();
    renderVaultGrid();
}

function copyVaultCreature(id) {
    const source = vaultCreatures.find(c => c.id === id);
    if (!source) return;
    const baseName = source.name.replace(/ \d+$/, '');
    const allNames = [...creatures, ...vaultCreatures];
    const existing = allNames.filter(c => c.name === baseName || c.name.match(new RegExp('^' + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\d+$')));
    let newName = baseName;
    if (existing.length > 0) {
        const nums = existing.map(c => { const m = c.name.match(/ (\d+)$/); return m ? parseInt(m[1]) : 1; });
        newName = `${baseName} ${Math.max(...nums) + 1}`;
    }
    const copy = {
        ...JSON.parse(JSON.stringify(source)),
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        name: newName,
        notes: ''
    };
    const idx = vaultCreatures.indexOf(source);
    vaultCreatures.splice(idx + 1, 0, copy);
    autoCacheVault();
    renderVaultGrid();
}

function toggleVaultDot(creatureId, type, index) {
    const creature = vaultCreatures.find(c => c.id === creatureId);
    if (!creature) return;
    const key = type + 'Filled';
    creature[key] = index < creature[key] ? index : index + 1;
    autoCacheVault();
    renderVaultCard(creature);
}

function adjustVaultMax(creatureId, type, delta) {
    const creature = vaultCreatures.find(c => c.id === creatureId);
    if (!creature) return;
    if (type === 'evasion') {
        creature.evasion = Math.max(0, Math.min(30, (creature.evasion || 0) + delta));
        autoCacheVault();
        renderVaultCard(creature);
        return;
    }
    const maxKey = type + 'Max';
    const filledKey = type + 'Filled';
    const newMax = (creature[maxKey] || 0) + delta;
    if (newMax < 0 || newMax > 30) return;
    creature[maxKey] = newMax;
    if (creature[filledKey] > newMax) creature[filledKey] = newMax;
    if (delta > 0) creature[filledKey] = Math.min((creature[filledKey] || 0) + 1, newMax);
    autoCacheVault();
    renderVaultCard(creature);
}

function renderVaultDots(creature, type) {
    const max = creature[type + 'Max'];
    const filled = creature[type + 'Filled'];
    let html = '';
    for (let i = 0; i < max; i++) {
        html += `<div class="dot ${i < filled ? 'filled-' + type : ''}" onclick="toggleVaultDot('${creature.id}', '${type}', ${i})"></div>`;
    }
    return html;
}

function flipVaultCard(creatureId) {
    const creature = vaultCreatures.find(c => c.id === creatureId);
    if (!creature) return;
    const el = document.getElementById('v-' + creature.id);
    if (!el) return;
    el.innerHTML = buildVaultCardBack(creature);
}

function flipVaultBack(creatureId) {
    const creature = vaultCreatures.find(c => c.id === creatureId);
    if (!creature) return;
    renderVaultCard(creature);
}

function updateVaultNotes(creatureId, value) {
    const creature = vaultCreatures.find(c => c.id === creatureId);
    if (!creature) return;
    creature.notes = value;
    autoCacheVault();
}

function buildVaultCardBack(creature) {
    return `
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
                <span class="text-zinc-600 text-sm">📝</span>
                <span class="font-black text-sm uppercase font-[Cinzel] text-[#f5efe6]">${creature.name}</span>
            </div>
            <button onclick="flipVaultBack('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-[10px] uppercase tracking-wide font-bold">← Back</button>
        </div>
        <textarea oninput="updateVaultNotes('${creature.id}', this.value)" placeholder="Add notes..." class="w-full h-40 bg-[#1a1714] border border-[#3d362a] rounded-lg px-3 py-2 text-xs text-[#e8e0d4] outline-none focus:border-[#d4a017] resize-none placeholder-zinc-700">${escHtml(creature.notes || '')}</textarea>
    `;
}

// ========== EDIT VAULT CARDS ==========
function editVaultCharacterCard(creatureId) {
    editCharacterCard(creatureId, true);
}

function editVaultCustomCard(creatureId) {
    editCustomCard(creatureId, true);
}

function editVaultEnemyCard(creatureId) {
    editEnemyCard(creatureId, true);
}

// ========== VAULT CARD RENDERING ==========
function buildVaultCardInner(creature) {
    const dead = creature.hpFilled <= 0;
    const adjBtn = (type, delta) => `<button onclick="adjustVaultMax('${creature.id}', '${type}', ${delta})" class="w-4 h-4 flex items-center justify-center rounded bg-[#2a2418] border border-[#3d362a] text-zinc-500 hover:text-white text-[10px] leading-none">${delta < 0 ? '−' : '+'}</button>`;

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
                <div class="flex flex-wrap gap-1.5">${renderVaultDots(creature, type)}</div>
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

    // Edit button logic (same as tracker)
    let editBtn = '';
    if (ed && (ed.type === 'Custom' || ed.type === 'Enemy (Edited)')) {
        editBtn = `<button onclick="editVaultCustomCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>`;
    } else if (ed && ed.type === 'Character') {
        editBtn = `<button onclick="editVaultCharacterCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>`;
    } else if (!ed) {
        editBtn = `<button onclick="editVaultCharacterCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>`;
    } else {
        editBtn = `<button onclick="editVaultEnemyCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Edit">✏️</button>`;
    }

    return `
        <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2">
                ${dead ? '<span class="text-red-500 text-sm">💀</span>' : '<span class="text-zinc-600 text-sm">📦</span>'}
                <span class="font-black text-sm uppercase font-[Cinzel] ${dead ? 'text-zinc-600 line-through' : 'text-[#f5efe6]'}">${creature.name}</span>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="copyVaultCreature('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Duplicate">➕</button>
                ${editBtn}
                <button onclick="flipVaultCard('${creature.id}')" class="text-zinc-500 hover:text-[#d4a017] text-sm leading-none" title="Notes">📝</button>
                <button onclick="removeVaultCreature('${creature.id}', event)" class="text-zinc-700 hover:text-red-500 text-sm leading-none" title="Remove">✕</button>
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
        <div class="mt-3 pt-3 border-t border-[#2a2418] flex gap-2">
            <button onclick="deployToTracker('${creature.id}', false)" class="flex-1 btn-action text-[10px] py-2 rounded-lg font-bold uppercase text-white font-[Cinzel]">⚔️ Deploy</button>
            <button onclick="deployToTracker('${creature.id}', true)" class="flex-1 bg-[#2a2418] border border-[#4a3f30] text-[10px] py-2 rounded-lg font-bold uppercase text-zinc-400 font-[Cinzel] hover:border-[#d4a017] hover:text-[#d4a017]">⚔️ As-Is</button>
        </div>
    `;
}

function renderVaultCard(creature) {
    const el = document.getElementById('v-' + creature.id);
    if (!el) return;
    const dead = creature.hpFilled <= 0;
    el.className = `creature-card ${dead ? 'dead' : ''}`;
    el.innerHTML = buildVaultCardInner(creature);
}

// ========== DRAG & DROP (VAULT) ==========
let vaultDraggedId = null;

function onVaultDragStart(e, id) {
    vaultDraggedId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.4';
}

function onVaultDragEnd(e) {
    e.target.style.opacity = '';
    vaultDraggedId = null;
    document.querySelectorAll('#vaultGrid .creature-card.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function onVaultDragEnter(e, id) {
    if (id === vaultDraggedId) return;
    const el = document.getElementById('v-' + id);
    if (el) el.classList.add('drag-over');
}

function onVaultDragLeave(e, id) {
    const el = document.getElementById('v-' + id);
    if (el) el.classList.remove('drag-over');
}

function onVaultDrop(e, targetId) {
    e.preventDefault();
    if (!vaultDraggedId || vaultDraggedId === targetId) return;
    const fromIdx = vaultCreatures.findIndex(c => c.id === vaultDraggedId);
    const toIdx = vaultCreatures.findIndex(c => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = vaultCreatures.splice(fromIdx, 1);
    vaultCreatures.splice(toIdx, 0, moved);
    autoCacheVault();
    renderVaultGrid();
}

// ========== VAULT GRID ==========
function renderVaultGrid() {
    const grid = document.getElementById('vaultGrid');
    if (vaultCreatures.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-20"><div class="text-zinc-600 text-sm italic">Vault is empty. Use 📦 on tracker cards to stash creatures here.</div></div>';
        return;
    }
    grid.innerHTML = '';
    vaultCreatures.forEach(creature => {
        const dead = creature.hpFilled <= 0;
        const div = document.createElement('div');
        div.id = 'v-' + creature.id;
        div.className = `creature-card ${dead ? 'dead' : ''}`;
        div.draggable = true;
        div.setAttribute('ondragstart', `onVaultDragStart(event, '${creature.id}')`);
        div.setAttribute('ondragend', 'onVaultDragEnd(event)');
        div.setAttribute('ondragover', 'onDragOver(event)');
        div.setAttribute('ondragenter', `onVaultDragEnter(event, '${creature.id}')`);
        div.setAttribute('ondragleave', `onVaultDragLeave(event, '${creature.id}')`);
        div.setAttribute('ondrop', `onVaultDrop(event, '${creature.id}')`);
        div.innerHTML = buildVaultCardInner(creature);
        grid.appendChild(div);
    });
}

function clearVault(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Clear entire vault? This cannot be undone.')) return;
    vaultCreatures = [];
    autoCacheVault();
    renderVaultGrid();
}
