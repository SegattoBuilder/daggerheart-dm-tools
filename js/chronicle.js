// ========== CHRONICLE ==========
const CHRONICLE_KEY = 'dh_dm_chronicle';
let chronicleEntries = [];

function autoCacheChronicle() {
    localStorage.setItem(CHRONICLE_KEY, JSON.stringify(chronicleEntries));
}

function addEntry() {
    chronicleEntries.unshift({
        id: 'ch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        title: 'New Chapter',
        text: '',
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

// ========== RENDER ==========
function renderChronicle() {
    const list = document.getElementById('chronicleList');
    if (chronicleEntries.length === 0) {
        list.innerHTML = '<div class="text-center py-20"><div class="text-zinc-600 text-sm italic">No chapters yet. Click "+ Chapter" to start your chronicle.</div></div>';
        return;
    }
    list.innerHTML = chronicleEntries.map(ch => `
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
            <div class="${ch.open ? '' : 'hidden'}">
                <textarea oninput="updateEntryText('${ch.id}', this.value)" placeholder="Write your notes here..."
                    class="w-full min-h-[200px] bg-[#1a1714] border border-[#3d362a] rounded-lg px-4 py-3 text-sm text-[#e8e0d4] outline-none focus:border-[#d4a017] resize-y placeholder-zinc-700">${escHtml(ch.text)}</textarea>
            </div>
        </div>
    `).join('');
}

function clearChronicle(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!confirm('Clear all chapters? This cannot be undone.')) return;
    chronicleEntries = [];
    autoCacheChronicle();
    renderChronicle();
}
