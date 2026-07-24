// ========== COMPENDIUM ==========
const GITHUB_RAW = "https://raw.githubusercontent.com/daggersearch/daggerheart-data/main/core/";
const CATEGORIES = ['ancestries','armors','classes','communities','consumables','domain-cards','items','rules','subclasses','weapons'];
const COMPENDIUM_CACHE_KEY = 'dh_compendium_cache';
let compendiumData = [];
let activeCategory = 'all';
let searchTimeout = null;

async function loadCompendium() {
    const cached = localStorage.getItem(COMPENDIUM_CACHE_KEY);
    if (cached) {
        try {
            compendiumData = JSON.parse(cached);
            document.getElementById('compendiumStatus').textContent = `${compendiumData.length} entries loaded. Start typing to search.`;
            return;
        } catch { /* fall through to fetch */ }
    }

    document.getElementById('compendiumStatus').textContent = 'Fetching compendium data...';

    try {
        const results = await Promise.all(
            CATEGORIES.map(cat =>
                fetch(GITHUB_RAW + cat + '.json')
                    .then(r => r.json())
                    .then(data => {
                        const items = Array.isArray(data) ? data : (data.items || data.entries || Object.values(data));
                        return items.map(item => ({ ...item, _category: cat }));
                    })
                    .catch(() => [])
            )
        );
        compendiumData = results.flat();
        localStorage.setItem(COMPENDIUM_CACHE_KEY, JSON.stringify(compendiumData));
        document.getElementById('compendiumStatus').textContent = `${compendiumData.length} entries loaded. Start typing to search.`;
    } catch (err) {
        document.getElementById('compendiumStatus').textContent = 'Failed to load compendium data. Check your connection.';
    }
}

// ========== CATEGORY FILTERS ==========
const CATEGORY_FILTERS = {
    'weapons': [
        { field: 'tier', label: 'Tier', values: ['1','2','3','4'] },
        { field: 'damage.type', label: 'Damage', values: ['PHYSICAL','MAGIC'] },
        { field: 'range', label: 'Range', values: ['MELEE','RANGED'] },
        { field: 'burden', label: 'Hands', values: ['ONE_HANDED','TWO_HANDED'] },
        { field: 'trait', label: 'Trait', values: ['AGILITY','STRENGTH','FINESSE','INSTINCT','PRESENCE','KNOWLEDGE'] },
    ],
    'armors': [
        { field: 'tier', label: 'Tier', values: ['1','2','3','4'] },
        { field: 'baseScore', label: 'Score', values: ['2','3','4','5','6'] },
    ],
    'domain-cards': [
        { field: 'domain', label: 'Domain', values: ['ARCANA','BLADE','BONE','CODEX','GRACE','MIDNIGHT','SAGE','SPLENDOR','VALOR'] },
        { field: 'type', label: 'Type', values: ['ABILITY','SPELL'] },
        { field: 'level', label: 'Level', values: ['1','2','3','4','5','6','7','8','9','10'] },
    ],
    'subclasses': [
        { field: 'class', label: 'Class', values: ['BARD','DRUID','GUARDIAN','RANGER','ROGUE','SERAPH','SORCERER','WARRIOR','WIZARD'] },
        { field: 'spellcastTrait', label: 'Spellcast', values: ['AGILITY','STRENGTH','FINESSE','INSTINCT','PRESENCE','KNOWLEDGE'] },
    ],
    'classes': [
        { field: 'domains_includes', label: 'Domain', values: ['ARCANA','BLADE','BONE','CODEX','GRACE','MIDNIGHT','SAGE','SPLENDOR','VALOR'] },
    ],
};

let activeFilters = {};

function setCategory(cat) {
    activeCategory = cat;
    activeFilters = {};
    document.querySelectorAll('#categoryFilters .filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().toLowerCase().replace(' ', '-') === cat || (cat === 'all' && btn.textContent.trim().toLowerCase() === 'all'));
    });
    renderContextFilters();
    runSearch();
}

function renderContextFilters() {
    const container = document.getElementById('contextFilters');
    const filterDefs = CATEGORY_FILTERS[activeCategory];

    if (!filterDefs) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = filterDefs.map(f => {
        const selected = activeFilters[f.field] || '';
        const options = f.values.map(v => {
            const label = v.replace(/_/g, ' ');
            return `<option value="${escHtml(v)}" ${selected === v ? 'selected' : ''}>${label}</option>`;
        }).join('');
        return `
            <div class="flex flex-col">
                <label class="text-[9px] text-zinc-500 uppercase tracking-wide font-bold mb-0.5">${escHtml(f.label)}</label>
                <select onchange="setFilter('${f.field}', this.value)" class="bg-[#1e1b16] border border-[#4a3f30] rounded-lg px-2 py-1.5 text-[11px] outline-none focus:border-[#d4a017] cursor-pointer">
                    <option value="">All</option>
                    ${options}
                </select>
            </div>
        `;
    }).join('');
}

function setFilter(field, value) {
    if (value) {
        activeFilters[field] = value;
    } else {
        delete activeFilters[field];
    }
    runSearch();
}

function getNestedField(item, field) {
    if (field === 'domains_includes') return item.domains || [];
    const parts = field.split('.');
    let val = item;
    for (const p of parts) {
        if (val == null) return undefined;
        val = val[p];
    }
    return val;
}

function itemMatchesFilters(item) {
    for (const [field, expected] of Object.entries(activeFilters)) {
        const actual = getNestedField(item, field);
        if (field === 'domains_includes') {
            if (!Array.isArray(actual) || !actual.includes(expected)) return false;
        } else {
            if (String(actual) !== String(expected)) return false;
        }
    }
    return true;
}

// ========== SEARCH ==========
function runSearch() {
    const query = document.getElementById('compendiumSearch').value.trim().toLowerCase();
    const resultsEl = document.getElementById('compendiumResults');
    const statusEl = document.getElementById('compendiumStatus');

    let filtered = compendiumData;

    if (activeCategory !== 'all') {
        filtered = filtered.filter(item => item._category === activeCategory);
    }

    if (Object.keys(activeFilters).length > 0) {
        filtered = filtered.filter(item => itemMatchesFilters(item));
    }

    if (query.length > 0) {
        filtered = filtered.filter(item => {
            const name = getLocStr(item.name).toLowerCase();
            const desc = Array.isArray(item.description)
                ? item.description.map(d => d.paragraph ? getLocStr(d.paragraph) : (d.list ? d.list.map(li => getLocStr(li)).join(' ') : '')).join(' ').toLowerCase()
                : (typeof item.description === 'string' ? item.description.toLowerCase() : '');
            let featText = '';
            const featureSources = [
                item.features,
                item.classFeatures,
                item.foundation && item.foundation.features,
                item.specialization && item.specialization.features,
                item.mastery && item.mastery.features,
                item.hopeFeature ? [item.hopeFeature] : null
            ];
            for (const src of featureSources) {
                if (!Array.isArray(src)) continue;
                for (const f of src) {
                    if (f.name) featText += ' ' + getLocStr(f.name).toLowerCase();
                    if (f.description && Array.isArray(f.description)) {
                        featText += ' ' + f.description.map(d => d.paragraph ? getLocStr(d.paragraph) : '').join(' ').toLowerCase();
                    }
                }
            }
            return name.includes(query) || desc.includes(query) || featText.includes(query);
        });
    }

    const limited = filtered.slice(0, 60);

    if (query.length === 0 && activeCategory === 'all' && Object.keys(activeFilters).length === 0) {
        resultsEl.innerHTML = '';
        statusEl.textContent = `${compendiumData.length} entries loaded. Start typing to search.`;
        statusEl.classList.remove('hidden');
        return;
    }

    if (filtered.length === 0) {
        resultsEl.innerHTML = '';
        statusEl.textContent = 'No results found.';
        statusEl.classList.remove('hidden');
        return;
    }

    statusEl.textContent = filtered.length > 60 ? `Showing 60 of ${filtered.length} results.` : `${filtered.length} result${filtered.length > 1 ? 's' : ''}.`;
    statusEl.classList.remove('hidden');

    resultsEl.innerHTML = limited.map(item => renderCompendiumCard(item)).join('');
}

// ========== CARD RENDERING ==========
function renderCompendiumCard(item) {
    const cat = item._category;
    const name = getLocStr(item.name) || item.title || 'Unnamed';
    const catClass = 'cat-' + cat;

    let body = '';
    switch(cat) {
        case 'weapons': body = renderWeaponCard(item); break;
        case 'armors': body = renderArmorCard(item); break;
        case 'classes': body = renderClassCard(item); break;
        case 'subclasses': body = renderSubclassCard(item); break;
        case 'ancestries': body = renderAncestryCard(item); break;
        case 'communities': body = renderCommunityCard(item); break;
        case 'domain-cards': body = renderDomainCard(item); break;
        case 'consumables': body = renderConsumableCard(item); break;
        case 'items': body = renderItemCard(item); break;
        case 'rules': body = renderRuleCard(item); break;
        default: body = renderGenericCard(item);
    }

    return `
        <div class="compendium-card border-t-3 ${catClass} cursor-pointer" style="border-top: 3px solid" onclick="openCardModal(${compendiumData.indexOf(item)})">
            <div class="flex items-start justify-between mb-2">
                <span class="font-black text-sm font-[Cinzel] text-[#f5efe6]">${escHtml(name)}</span>
                <span class="card-category ${catClass} ml-2 whitespace-nowrap">${cat.replace('-', ' ')}</span>
            </div>
            ${body}
        </div>
    `;
}

function renderDescBlocks(descArr) {
    if (!descArr || !Array.isArray(descArr)) return '';
    return descArr.map(d => {
        if (d.paragraph) return `<p>${escHtml(getLocStr(d.paragraph))}</p>`;
        if (d.list) return `<ul class="ml-4 list-disc">${d.list.map(li => `<li>${escHtml(getLocStr(li))}</li>`).join('')}</ul>`;
        return '';
    }).join('');
}

function renderWeaponCard(item) {
    let html = '';
    const type = (item.type || '').replace(/_/g, ' ');
    const burden = (item.burden || '').replace(/_/g, ' ');
    html += `<div class="flex flex-wrap gap-2 mb-1.5">`;
    if (type) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(type)}</span>`;
    if (item.range) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(item.range)}</span>`;
    if (burden) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(burden)}</span>`;
    if (item.tier) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">Tier ${item.tier}</span>`;
    html += `</div>`;
    if (item.damage) {
        let dmg = item.damage.dice || '';
        if (item.damage.modifier) dmg += `+${item.damage.modifier}`;
        if (item.damage.type) dmg += ` ${item.damage.type.toLowerCase()}`;
        html += `<div class="text-xs text-red-300 mb-1">⚔️ ${escHtml(dmg)}</div>`;
    }
    if (item.trait) html += `<div class="text-xs text-amber-300 mb-1">Trait: ${escHtml(item.trait)}</div>`;
    if (item.features && item.features.length) {
        html += item.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            const fdesc = f.description ? renderDescBlocks(f.description) : '';
            return `<div class="mt-1"><span class="text-[10px] font-bold text-amber-200">${escHtml(fname)}</span> <span class="text-xs text-zinc-500">${fdesc}</span></div>`;
        }).join('');
    }
    return html;
}

function renderArmorCard(item) {
    let html = '';
    html += `<div class="flex flex-wrap gap-2 mb-1.5">`;
    if (item.tier) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">Tier ${item.tier}</span>`;
    if (item.baseScore) html += `<span class="text-[9px] bg-[#1a2a3b] border border-[#2a3d5a] rounded px-1.5 py-0.5 text-blue-300">Score ${item.baseScore}</span>`;
    if (item.baseMajorThreshold) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-amber-300">Major ${item.baseMajorThreshold}+</span>`;
    if (item.baseSevereThreshold) html += `<span class="text-[9px] bg-[#2a1a1a] border border-[#3d2a2a] rounded px-1.5 py-0.5 text-red-300">Severe ${item.baseSevereThreshold}+</span>`;
    html += `</div>`;
    if (item.features && item.features.length) {
        html += item.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            const fdesc = f.description ? renderDescBlocks(f.description) : '';
            return `<div class="mt-1"><span class="text-[10px] font-bold text-blue-200">${escHtml(fname)}</span> <span class="text-xs text-zinc-400">${fdesc}</span></div>`;
        }).join('');
    }
    return html;
}

function renderClassCard(item) {
    let html = '';
    html += `<div class="flex flex-wrap gap-2 mb-1.5">`;
    if (item.domains && item.domains.length) html += item.domains.map(d => `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-pink-300">${escHtml(d)}</span>`).join('');
    if (item.startingHitPoints) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-red-300">HP ${item.startingHitPoints}</span>`;
    if (item.startingEvasion) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-blue-300">Evasion ${item.startingEvasion}</span>`;
    html += `</div>`;
    if (item.description && Array.isArray(item.description)) {
        const desc = renderDescBlocks(item.description);
        html += `<div class="text-xs text-zinc-500 mb-2">${desc}</div>`;
    }
    if (item.hopeFeature) {
        const fname = item.hopeFeature.name ? getLocStr(item.hopeFeature.name) : '';
        const fdesc = item.hopeFeature.description ? renderDescBlocks(item.hopeFeature.description) : '';
        html += `<div class="mt-1.5"><span class="text-[9px] font-bold text-zinc-500 uppercase">Hope Feature</span></div>`;
        html += `<div class="mt-0.5"><span class="text-[10px] font-bold text-pink-200">${escHtml(fname)}</span> <span class="text-xs text-zinc-400">${fdesc}</span></div>`;
    }
    if (item.classFeatures && item.classFeatures.length) {
        html += `<div class="mt-1.5"><span class="text-[9px] font-bold text-zinc-500 uppercase">Class Features</span></div>`;
        html += item.classFeatures.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            return `<div class="mt-0.5"><span class="text-[10px] font-bold text-pink-200">${escHtml(fname)}</span></div>`;
        }).join('');
    }
    return html;
}

function renderSubclassCard(item) {
    let html = '';
    html += `<div class="flex flex-wrap gap-2 mb-1.5">`;
    if (item.class) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(item.class)}</span>`;
    if (item.domains && item.domains.length) html += item.domains.map(d => `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-pink-300">${escHtml(d)}</span>`).join('');
    if (item.spellcastTrait) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-amber-300">Spellcast: ${escHtml(item.spellcastTrait)}</span>`;
    html += `</div>`;
    if (item.foundation && item.foundation.features) {
        html += `<div class="mt-1.5"><span class="text-[9px] font-bold text-zinc-500 uppercase">Foundation</span></div>`;
        html += item.foundation.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            const fdesc = f.description ? renderDescBlocks(f.description) : '';
            return `<div class="mt-0.5"><span class="text-[10px] font-bold text-pink-200">${escHtml(fname)}</span> <span class="text-xs text-zinc-500">${fdesc}</span></div>`;
        }).join('');
    }
    if (item.specialization && item.specialization.features) {
        html += `<div class="mt-1.5"><span class="text-[9px] font-bold text-zinc-500 uppercase">Specialization</span></div>`;
        html += item.specialization.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            return `<div class="mt-0.5"><span class="text-[10px] font-bold text-pink-200">${escHtml(fname)}</span></div>`;
        }).join('');
    }
    if (item.mastery && item.mastery.features) {
        html += `<div class="mt-1.5"><span class="text-[9px] font-bold text-zinc-500 uppercase">Mastery</span></div>`;
        html += item.mastery.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            return `<div class="mt-0.5"><span class="text-[10px] font-bold text-pink-200">${escHtml(fname)}</span></div>`;
        }).join('');
    }
    return html;
}

function renderAncestryCard(item) {
    let html = '';
    if (item.description && Array.isArray(item.description)) {
        const desc = renderDescBlocks(item.description);
        html += `<div class="text-xs text-zinc-500 mb-2">${desc}</div>`;
    }
    if (item.features && item.features.length) {
        html += item.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            const fdesc = f.description ? renderDescBlocks(f.description) : '';
            return `<div class="mt-1"><span class="text-[10px] font-bold text-green-200">${escHtml(fname)}</span> <span class="text-xs text-zinc-400">${fdesc}</span></div>`;
        }).join('');
    }
    return html;
}

function renderCommunityCard(item) {
    let html = '';
    if (item.description && Array.isArray(item.description)) {
        const desc = renderDescBlocks(item.description);
        html += `<div class="text-xs text-zinc-500 mb-2">${desc}</div>`;
    }
    if (item.personalities && item.personalities.length) {
        html += `<div class="flex flex-wrap gap-1 mb-2">${item.personalities.map(p => `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-yellow-300">${escHtml(getLocStr(p))}</span>`).join('')}</div>`;
    }
    if (item.features && item.features.length) {
        html += item.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            const fdesc = f.description ? renderDescBlocks(f.description) : '';
            return `<div class="mt-1"><span class="text-[10px] font-bold text-yellow-200">${escHtml(fname)}</span> <span class="text-xs text-zinc-400">${fdesc}</span></div>`;
        }).join('');
    }
    return html;
}

function renderDomainCard(item) {
    let html = '';
    html += `<div class="flex flex-wrap gap-2 mb-1.5">`;
    if (item.domain) html += `<span class="text-[9px] bg-[#1a2a2a] border border-[#2a3d3d] rounded px-1.5 py-0.5 text-cyan-300">${escHtml(item.domain)}</span>`;
    if (item.type) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">${escHtml(item.type)}</span>`;
    if (item.level !== undefined) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-zinc-400">Lv ${item.level}</span>`;
    if (item.recallCost !== undefined) html += `<span class="text-[9px] bg-[#2a2418] border border-[#3d362a] rounded px-1.5 py-0.5 text-amber-300">Recall: ${item.recallCost}</span>`;
    html += `</div>`;
    if (item.features && item.features.length) {
        html += item.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            const fdesc = f.description ? renderDescBlocks(f.description) : '';
            return `<div class="mt-1">${fname ? `<span class="text-[10px] font-bold text-cyan-200">${escHtml(fname)}</span> ` : ''}<span class="text-xs text-zinc-400">${fdesc}</span></div>`;
        }).join('');
    }
    return html;
}

function renderConsumableCard(item) {
    let html = '';
    if (item.features && item.features.length) {
        html += item.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            const fdesc = f.description ? renderDescBlocks(f.description) : '';
            return `<div class="mt-1">${fname ? `<span class="text-[10px] font-bold text-emerald-200">${escHtml(fname)}</span> ` : ''}<span class="text-xs text-emerald-300">${fdesc}</span></div>`;
        }).join('');
    }
    return html;
}

function renderItemCard(item) {
    let html = '';
    if (item.features && item.features.length) {
        html += item.features.map(f => {
            const fname = f.name ? getLocStr(f.name) : '';
            const fdesc = f.description ? renderDescBlocks(f.description) : '';
            return `<div class="mt-1">${fname ? `<span class="text-[10px] font-bold text-purple-200">${escHtml(fname)}</span> ` : ''}<span class="text-xs text-zinc-400">${fdesc}</span></div>`;
        }).join('');
    }
    return html;
}

function renderRuleCard(item) {
    let html = '';
    if (item.description && Array.isArray(item.description)) {
        html += item.description.slice(0, 3).map(block => {
            if (block.paragraph) return `<p class="text-xs text-zinc-400 mt-1">${escHtml(getLocStr(block.paragraph))}</p>`;
            if (block.list) return `<ul class="text-xs text-zinc-500 mt-1 ml-3 list-disc">${block.list.slice(0, 4).map(li => `<li class="mb-0.5">${escHtml(getLocStr(li))}</li>`).join('')}${block.list.length > 4 ? '<li class="text-zinc-600">...</li>' : ''}</ul>`;
            return '';
        }).join('');
    }
    return html;
}

function renderGenericCard(item) {
    const desc = item.description || item.text || item.effect || '';
    return desc ? `<div class="text-xs text-zinc-500 mt-1">${escHtml(desc)}</div>` : '';
}

// ========== CARD MODAL ==========
function openCardModal(index) {
    const item = compendiumData[index];
    if (!item) return;
    const cat = item._category;
    const name = getLocStr(item.name) || item.title || 'Unnamed';
    const catClass = 'cat-' + cat;
    let body = '';
    switch(cat) {
        case 'weapons': body = renderWeaponCard(item); break;
        case 'armors': body = renderArmorCard(item); break;
        case 'classes': body = renderClassCard(item); break;
        case 'subclasses': body = renderSubclassCard(item); break;
        case 'ancestries': body = renderAncestryCard(item); break;
        case 'communities': body = renderCommunityCard(item); break;
        case 'domain-cards': body = renderDomainCard(item); break;
        case 'consumables': body = renderConsumableCard(item); break;
        case 'items': body = renderItemCard(item); break;
        case 'rules': body = renderRuleCard(item); break;
        default: body = renderGenericCard(item);
    }
    document.getElementById('cardModalContent').innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <span class="font-black text-2xl font-[Cinzel] text-[#f5efe6]">${escHtml(name)}</span>
            <span class="card-category ${catClass} ml-2 whitespace-nowrap">${cat.replace('-', ' ')}</span>
        </div>
        <div class="modal-scaled">${body}</div>
    `;
    document.getElementById('cardModal').classList.remove('hidden');
}

function closeCardModal() {
    document.getElementById('cardModal').classList.add('hidden');
}

// ========== SEARCH INPUT LISTENER ==========
document.getElementById('compendiumSearch').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(runSearch, 200);
});
