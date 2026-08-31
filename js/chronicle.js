// ========== CHRONICLE ==========
const CHRONICLE_KEY = 'dh_dm_chronicle';
let chronicleEntries = [];

function autoCacheChronicle() {
    localStorage.setItem(CHRONICLE_KEY, JSON.stringify(chronicleEntries));
    if (typeof markCloudDirty === 'function') markCloudDirty();
}

function addEntry() {
    chronicleEntries.unshift({
        id: 'ch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        title: 'New Chapter',
        text: '',
        npcs: [],
        music: [],
        open: true
    });
    autoCacheChronicle();
    renderChronicle();
}

function removeEntry(id) {
    if (!confirm('Remove this chapter?')) return;
    chronicleEntries = chronicleEntries.filter(c => c.id !== id);
    autoCacheChronicle();
    renderChronicle();
}

function updateEntryTitle(id, value) {
    const ch = chronicleEntries.find(c => c.id === id);
    if (!ch) return;
    ch.title = value || 'Untitled Chapter';
    autoCacheChronicle();
}

function updateEntryText(id, value) {
    const ch = chronicleEntries.find(c => c.id === id);
    if (!ch) return;
    ch.text = value;
    autoCacheChronicle();
}

function toggleEntry(id) {
    const ch = chronicleEntries.find(c => c.id === id);
    if (!ch) return;
    ch.open = !ch.open;
    autoCacheChronicle();
    renderChronicle();
}

// ========== NPC ROWS ==========
function addChapterNpc(chId) {
    const ch = chronicleEntries.find(c => c.id === chId);
    if (!ch) return;
    if (!ch.npcs) ch.npcs = [];
    ch.npcs.push({ name: '', faction: '', disposition: '', notes: '' });
    autoCacheChronicle();
    renderChronicle();
}

function removeChapterNpc(chId, idx) {
    const ch = chronicleEntries.find(c => c.id === chId);
    if (!ch || !ch.npcs) return;
    ch.npcs.splice(idx, 1);
    autoCacheChronicle();
    renderChronicle();
}

function updateChapterNpc(chId, idx, field, value) {
    const ch = chronicleEntries.find(c => c.id === chId);
    if (!ch || !ch.npcs || !ch.npcs[idx]) return;
    ch.npcs[idx][field] = value;
    autoCacheChronicle();
}

// ========== MUSIC CUE ROWS ==========
function addChapterMusic(chId) {
    const ch = chronicleEntries.find(c => c.id === chId);
    if (!ch) return;
    if (!ch.music) ch.music = [];
    ch.music.push({ scene: '', cue: '' });
    autoCacheChronicle();
    renderChronicle();
}

function removeChapterMusic(chId, idx) {
    const ch = chronicleEntries.find(c => c.id === chId);
    if (!ch || !ch.music) return;
    ch.music.splice(idx, 1);
    autoCacheChronicle();
    renderChronicle();
}

function updateChapterMusic(chId, idx, field, value) {
    const ch = chronicleEntries.find(c => c.id === chId);
    if (!ch || !ch.music || !ch.music[idx]) return;
    const wasLink = ch.music[idx].cue && ch.music[idx].cue.match(/^https?:\/\//);
    ch.music[idx][field] = value;
    autoCacheChronicle();
    if (field === 'cue') {
        const isLink = value && value.match(/^https?:\/\//);
        if (!!wasLink !== !!isLink) renderChronicle();
    }
}

// ========== DRAG & DROP ==========
let advDraggedId = null;

function onAdvDragStart(e, id) {
    advDraggedId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.4';
}

function onAdvDragEnd(e) {
    e.target.style.opacity = '';
    advDraggedId = null;
    document.querySelectorAll('#chronicleList .drag-over').forEach(el => el.classList.remove('drag-over'));
}

function onAdvDragEnter(e, id) {
    if (id === advDraggedId) return;
    const el = document.getElementById(id);
    if (el) el.classList.add('drag-over');
}

function onAdvDragLeave(e, id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('drag-over');
}

function onAdvDrop(e, targetId) {
    e.preventDefault();
    if (!advDraggedId || advDraggedId === targetId) return;
    const fromIdx = chronicleEntries.findIndex(c => c.id === advDraggedId);
    const toIdx = chronicleEntries.findIndex(c => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = chronicleEntries.splice(fromIdx, 1);
    chronicleEntries.splice(toIdx, 0, moved);
    autoCacheChronicle();
    renderChronicle();
}

// ========== RENDER HELPERS ==========
function renderNpcRows(ch) {
    const npcs = ch.npcs || [];
    if (npcs.length === 0) return '';
    return npcs.map((npc, i) => `
        <div class="grid grid-cols-[auto_auto_auto_1fr_auto] gap-2 items-center">
            <input value="${escHtmlAttr(npc.name)}" oninput="updateChapterNpc('${ch.id}', ${i}, 'name', this.value)" placeholder="Name"
                class="bg-[#1a1714] border border-[#3d362a] rounded-lg px-2 py-1.5 text-xs text-[#e8e0d4] outline-none focus:border-[#d4a017] placeholder-zinc-700">
            <input value="${escHtmlAttr(npc.faction)}" oninput="updateChapterNpc('${ch.id}', ${i}, 'faction', this.value)" placeholder="Faction"
                class="bg-[#1a1714] border border-[#3d362a] rounded-lg px-2 py-1.5 text-xs text-[#e8e0d4] outline-none focus:border-[#d4a017] placeholder-zinc-700">
            <select onchange="updateChapterNpc('${ch.id}', ${i}, 'disposition', this.value)"
                class="bg-[#1a1714] border border-[#3d362a] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#d4a017] cursor-pointer ${npc.disposition === 'Friendly' ? 'text-green-400' : npc.disposition === 'Hostile' ? 'text-red-400' : npc.disposition === 'Neutral' ? 'text-amber-400' : 'text-zinc-600'}">
                <option value="" ${!npc.disposition ? 'selected' : ''} class="text-zinc-600">Disposition</option>
                <option value="Friendly" ${npc.disposition === 'Friendly' ? 'selected' : ''} class="text-green-400">Friendly</option>
                <option value="Neutral" ${npc.disposition === 'Neutral' ? 'selected' : ''} class="text-amber-400">Neutral</option>
                <option value="Hostile" ${npc.disposition === 'Hostile' ? 'selected' : ''} class="text-red-400">Hostile</option>
            </select>
            <input value="${escHtmlAttr(npc.notes)}" oninput="updateChapterNpc('${ch.id}', ${i}, 'notes', this.value)" placeholder="Notes"
                class="bg-[#1a1714] border border-[#3d362a] rounded-lg px-2 py-1.5 text-xs text-[#e8e0d4] outline-none focus:border-[#d4a017] placeholder-zinc-700">
            <button onclick="removeChapterNpc('${ch.id}', ${i})" class="text-zinc-700 hover:text-red-500 text-xs leading-none">✕</button>
        </div>
    `).join('');
}

function renderMusicRows(ch) {
    const music = ch.music || [];
    if (music.length === 0) return '';
    return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">' + music.map((m, i) => `
        <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-1.5 items-center">
            ${m.cue && m.cue.match(/^https?:\/\//) ? `<a href="${escHtmlAttr(m.cue)}" target="_blank" rel="noopener" class="text-[#d4a017] hover:text-amber-300 text-sm leading-none" title="Open link">🔗</a>` : '<span class="w-4"></span>'}
            <input value="${escHtmlAttr(m.scene)}" oninput="updateChapterMusic('${ch.id}', ${i}, 'scene', this.value)" placeholder="Scene"
                class="bg-[#1a1714] border border-[#3d362a] rounded-lg px-2 py-1.5 text-xs text-[#e8e0d4] outline-none focus:border-[#d4a017] placeholder-zinc-700">
            <input value="${escHtmlAttr(m.cue)}" oninput="updateChapterMusic('${ch.id}', ${i}, 'cue', this.value)" placeholder="Link or text"
                class="bg-[#1a1714] border border-[#3d362a] rounded-lg px-2 py-1.5 text-xs text-[#e8e0d4] outline-none focus:border-[#d4a017] placeholder-zinc-700">
            <button onclick="removeChapterMusic('${ch.id}', ${i})" class="text-zinc-700 hover:text-red-500 text-xs leading-none">✕</button>
        </div>
    `).join('') + '</div>';
}

// ========== RENDER ==========
function renderChronicle() {
    const list = document.getElementById('chronicleList');
    if (chronicleEntries.length === 0) {
        list.innerHTML = '<div class="text-center py-20"><div class="text-zinc-600 text-sm italic">No chapters yet. Click "+ Chapter" to start your chronicle.</div></div>';
        return;
    }
    list.innerHTML = chronicleEntries.map(ch => {
        const npcs = ch.npcs || [];
        const music = ch.music || [];

        return `
        <div id="${ch.id}" class="fear-pool p-4 rounded-xl border border-[#3d362a] bg-[#1e1b16]" draggable="true"
            ondragstart="onAdvDragStart(event, '${ch.id}')" ondragend="onAdvDragEnd(event)"
            ondragover="onDragOver(event)" ondragenter="onAdvDragEnter(event, '${ch.id}')"
            ondragleave="onAdvDragLeave(event, '${ch.id}')" ondrop="onAdvDrop(event, '${ch.id}')">
            <div class="section-divider flex items-center gap-2 mb-3 pb-2 border-b border-[#3d362a] cursor-pointer select-none" onclick="toggleEntry('${ch.id}')">
                <span class="text-[10px] text-zinc-600 transition-transform ${ch.open ? 'rotate-90' : ''}">▶</span>
                <input value="${escHtmlAttr(ch.title)}" onclick="event.stopPropagation()" oninput="updateEntryTitle('${ch.id}', this.value)"
                    class="flex-1 bg-transparent section-header font-[Cinzel] text-xs uppercase tracking-widest text-zinc-500 outline-none border-b border-transparent focus:border-[#d4a017] placeholder-zinc-700" placeholder="Chapter title...">
                <button onclick="event.stopPropagation(); removeEntry('${ch.id}')" class="text-zinc-700 hover:text-red-500 text-sm leading-none" title="Remove">✕</button>
            </div>
            <div class="${ch.open ? '' : 'hidden'} space-y-4">
                <textarea oninput="updateEntryText('${ch.id}', this.value)" placeholder="Write your notes here..."
                    class="w-full min-h-[200px] bg-[#1a1714] border border-[#3d362a] rounded-lg px-4 py-3 text-sm text-[#e8e0d4] outline-none focus:border-[#d4a017] resize-y placeholder-zinc-700">${escHtml(ch.text)}</textarea>

                ${npcs.length ? `
                <div>
                    <div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">🧑 NPCs & Factions</div>
                    <div class="space-y-1">${renderNpcRows(ch)}</div>
                </div>` : ''}

                ${music.length ? `
                <div>
                    <div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">🎵 Music Cues</div>
                    <div class="space-y-1">${renderMusicRows(ch)}</div>
                </div>` : ''}

                <div class="flex gap-2 pt-1">
                    <button onclick="addChapterNpc('${ch.id}')" class="text-[10px] px-2 py-1.5 rounded-lg bg-[#2a2418] border border-[#4a3f30] text-[#d4a017] font-bold uppercase hover:border-[#d4a017]">+ NPC</button>
                    <button onclick="addChapterMusic('${ch.id}')" class="text-[10px] px-2 py-1.5 rounded-lg bg-[#2a2418] border border-[#4a3f30] text-[#d4a017] font-bold uppercase hover:border-[#d4a017]">+ Music Cue</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function clearChronicle(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Clear all chapters? This cannot be undone.')) return;
    chronicleEntries = [];
    autoCacheChronicle();
    renderChronicle();
}
