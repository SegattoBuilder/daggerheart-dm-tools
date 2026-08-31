// ========== SUPABASE AUTH ==========
let supabaseClient = null;
let currentUser = null;

function getSupabase() {
    if (!supabaseClient) {
        const sb = window.supabase;
        if (!sb || !sb.createClient) {
            console.error('Supabase SDK not loaded. window.supabase =', sb);
            alert('Supabase failed to load. Please refresh the page.');
            return null;
        }
        supabaseClient = sb.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    return supabaseClient;
}

// ========== AUTH STATE ==========
async function initAuth() {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (session) setUser(session.user);

    sb.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
    });
}

function setUser(user) {
    currentUser = user;
    currentProfile = null;
    renderAuthUI();
    if (user) startCloudAutoSave();
    else stopCloudAutoSave();
}

// ========== AUTH ACTIONS ==========
async function signInWithGoogle() {
    const { error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) alert('Google sign-in failed: ' + error.message);
}

async function signInWithEmail() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) { alert('Please enter email and password.'); return; }

    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) alert('Sign-in failed: ' + error.message);
    else closeAuthModal();
}

async function signUpWithEmail() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!email || !password) { alert('Please enter email and password.'); return; }
    if (password.length < 6) { alert('Password must be at least 6 characters.'); return; }

    const { error } = await getSupabase().auth.signUp({ email, password });
    if (error) alert('Sign-up failed: ' + error.message);
    else { alert('Check your email for a confirmation link!'); closeAuthModal(); }
}

async function signOut() {
    if (cloudDirty) {
        const save = confirm('You have unsaved changes. Save to cloud before signing out?');
        if (save) await cloudSave();
    }
    await getSupabase().auth.signOut();
    currentUser = null;
    renderAuthUI();
    // Reset to clean local state
    creatures = [];
    actionCounters = [];
    fearFilled = 0;
    vaultCreatures = [];
    chronicleEntries = [];
    document.getElementById('campaignName').value = '';
    localStorage.removeItem(CAMPAIGN_KEY);
    autoCache();
    autoCacheVault();
    autoCacheChronicle();
    renderFearDots();
    renderGrid();
    renderVaultGrid();
    renderChronicle();
    switchTab('tracker');
}

// ========== CLOUD SAVE / LOAD ==========
async function cloudSave() {
    if (!currentUser) { openAuthModal(); return; }
    const sb = getSupabase();
    const campaign = document.getElementById('campaignName').value.trim() || 'My Campaign';
    const data = { creatures, actionCounters, fearFilled, campaign, vaultCreatures, chronicleEntries };

    const { data: existing } = await sb
        .from('sessions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('campaign_name', campaign)
        .limit(1);

    let error;
    if (existing && existing.length > 0) {
        ({ error } = await sb
            .from('sessions')
            .update({ data, updated_at: new Date().toISOString() })
            .eq('id', existing[0].id));
    } else {
        ({ error } = await sb
            .from('sessions')
            .insert({ user_id: currentUser.id, campaign_name: campaign, data }));
    }

    if (error) alert('Cloud save failed: ' + error.message);
    else showSyncStatus('☁️ Saved');
}

async function cloudLoad() {
    if (!currentUser) { openAuthModal(); return; }

    const { data: sessions, error } = await getSupabase()
        .from('sessions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });

    if (error) { alert('Cloud load failed: ' + error.message); return; }
    if (!sessions || sessions.length === 0) { alert('No cloud saves found.'); return; }

    // Show session picker
    const picker = document.getElementById('cloudSessionList');
    picker.innerHTML = sessions.map(s => `
        <div class="flex items-center gap-2 p-3 bg-[#1a1714] border border-[#4a3f30] rounded-xl hover:border-[#d4a017] cursor-pointer transition-colors" onclick="loadCloudSession('${s.id}')">
            <div class="flex-1">
                <div class="text-sm font-bold text-[#f5efe6] font-[Cinzel]">${escHtml(s.campaign_name)}</div>
                <div class="text-[10px] text-zinc-500">${new Date(s.updated_at).toLocaleString()}</div>
            </div>
            <button onclick="event.stopPropagation(); deleteCloudSession('${s.id}')" class="text-zinc-700 hover:text-red-500 text-sm" title="Delete">🗑</button>
        </div>
    `).join('');
    document.getElementById('cloudPickerModal').classList.remove('hidden');
}

async function loadCloudSession(sessionId) {
    const { data: session, error } = await getSupabase()
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (error || !session) { alert('Failed to load session.'); return; }

    const d = session.data;
    creatures = d.creatures || [];
    actionCounters = d.actionCounters || [];
    fearFilled = d.fearFilled || 0;
    vaultCreatures = d.vaultCreatures || [];
    chronicleEntries = d.chronicleEntries || [];
    if (d.campaign) {
        document.getElementById('campaignName').value = d.campaign;
        localStorage.setItem(CAMPAIGN_KEY, d.campaign);
    }
    autoCache();
    autoCacheVault();
    autoCacheChronicle();
    renderFearDots();
    renderGrid();
    renderVaultGrid();
    renderChronicle();
    closeCloudPicker();
    showSyncStatus('☁️ Loaded');
}

async function deleteCloudSession(sessionId) {
    if (!confirm('Delete this cloud save?')) return;
    const { error } = await getSupabase().from('sessions').delete().eq('id', sessionId);
    if (error) alert('Delete failed: ' + error.message);
    else cloudLoad();
}

function closeCloudPicker() {
    document.getElementById('cloudPickerModal').classList.add('hidden');
}

// ========== AUTH UI ==========
function openAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
}

let currentProfile = null;

function renderAuthUI() {
    const btn = document.getElementById('authBtn');
    const localActions = document.getElementById('localActions');
    const cloudActions = document.getElementById('cloudActions');
    if (currentUser) {
        const avatarUrl = currentProfile?.avatar_url || currentUser.user_metadata?.picture || '';
        const name = currentProfile?.nickname || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
        if (avatarUrl) {
            btn.innerHTML = `<img src="${escHtmlAttr(avatarUrl)}" alt="" class="w-10 h-10 rounded-full border-2 border-[#d4a017] object-cover">`;
        } else {
            btn.innerHTML = `<span class="w-10 h-10 rounded-full border-2 border-[#d4a017] bg-[#2a2418] flex items-center justify-center text-sm font-bold text-[#d4a017]">${escHtml(name.charAt(0).toUpperCase())}</span>`;
        }
        btn.onclick = toggleAuthMenu;
        btn.className = 'h-10 w-10 flex items-center justify-center rounded-full hover:opacity-80 transition-opacity cursor-pointer';
        localActions.classList.add('hidden');
        cloudActions.classList.remove('hidden');
        if (!currentProfile) loadProfile();
    } else {
        btn.innerHTML = '<span class="text-[10px] text-zinc-400">Sign In</span>';
        btn.onclick = openAuthModal;
        btn.className = 'h-10 px-3 flex items-center justify-center rounded-lg bg-[#2a2418] border border-[#4a3f30] hover:border-[#d4a017] transition-colors';
        localActions.classList.remove('hidden');
        cloudActions.classList.add('hidden');
        currentProfile = null;
    }
}

let authMenuHandler = null;

function toggleAuthMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('authMenu');
    const wasHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');

    // Clean up previous handler
    if (authMenuHandler) {
        document.removeEventListener('click', authMenuHandler);
        authMenuHandler = null;
    }

    if (wasHidden) {
        authMenuHandler = (ev) => {
            const btn = document.getElementById('authBtn');
            if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
                menu.classList.add('hidden');
                document.removeEventListener('click', authMenuHandler);
                authMenuHandler = null;
            }
        };
        setTimeout(() => document.addEventListener('click', authMenuHandler), 0);
    }
}

// ========== PROFILE ==========
let profileLoading = false;

async function loadProfile() {
    if (!currentUser || currentProfile || profileLoading) return;
    profileLoading = true;
    const { data } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    profileLoading = false;
    if (data) {
        currentProfile = data;
        renderAuthUI();
    }
}

function openProfileModal() {
    document.getElementById('profileModal').classList.remove('hidden');
    document.getElementById('profileNickname').value = currentProfile?.nickname || '';
    document.getElementById('profileAvatar').value = currentProfile?.avatar_url || '';
    document.getElementById('profileCountry').value = currentProfile?.country || '';
    document.getElementById('profileState').value = currentProfile?.state || '';
    document.getElementById('profileExperience').value = currentProfile?.dm_experience || '';
    previewAvatar(currentProfile?.avatar_url || '');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.add('hidden');
}

function previewAvatar(url) {
    const preview = document.getElementById('profileAvatarPreview');
    if (url && url.match(/^https?:\/\//)) {
        preview.innerHTML = `<img src="${escHtmlAttr(url)}" alt="" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='\uD83C\uDFB2'">`;
    } else {
        preview.innerHTML = '\uD83C\uDFB2';
    }
}

async function saveProfile() {
    if (!currentUser) return;
    const profile = {
        id: currentUser.id,
        nickname: document.getElementById('profileNickname').value.trim() || null,
        avatar_url: document.getElementById('profileAvatar').value.trim() || null,
        country: document.getElementById('profileCountry').value.trim() || null,
        state: document.getElementById('profileState').value.trim() || null,
        dm_experience: document.getElementById('profileExperience').value || null
    };

    const { error } = await getSupabase()
        .from('profiles')
        .upsert(profile);

    if (error) { alert('Failed to save profile: ' + error.message); return; }
    currentProfile = profile;
    renderAuthUI();
    closeProfileModal();
    showToast('\uD83D\uDC64 Profile saved!');
}

// ========== IMPORT LOCAL TO CLOUD ==========
async function importLocalToCloud() {
    if (!currentUser) return;
    const hasData = creatures.length || vaultCreatures.length || chronicleEntries.length || actionCounters.length;
    if (!hasData) {
        // Try loading from localStorage directly
        let localCreatures = [], localVault = [], localChronicle = [], localCounters = [];
        try { localCreatures = JSON.parse(localStorage.getItem(SAVE_KEY)) || []; } catch {}
        try { localVault = JSON.parse(localStorage.getItem(VAULT_KEY)) || []; } catch {}
        try { localChronicle = JSON.parse(localStorage.getItem(CHRONICLE_KEY)) || []; } catch {}
        try { localCounters = JSON.parse(localStorage.getItem(COUNTERS_KEY)) || []; } catch {}
        if (!localCreatures.length && !localVault.length && !localChronicle.length && !localCounters.length) {
            alert('No local data found to import.'); return;
        }
        creatures = localCreatures;
        vaultCreatures = localVault;
        chronicleEntries = localChronicle;
        actionCounters = localCounters;
        fearFilled = parseInt(localStorage.getItem(FEAR_KEY)) || 0;
        const campaign = localStorage.getItem(CAMPAIGN_KEY) || '';
        if (campaign) document.getElementById('campaignName').value = campaign;
        renderFearDots();
        renderGrid();
        renderVaultGrid();
        renderChronicle();
    }
    if (!confirm('Upload your current local data to the cloud as a new save?')) return;
    await cloudSave();
}

// ========== SYNC STATUS INDICATOR ==========
let syncStatusTimer = null;

function showSyncStatus(text) {
    const el = document.getElementById('syncStatus');
    el.textContent = text;
    el.classList.remove('hidden');
    if (syncStatusTimer) clearTimeout(syncStatusTimer);
    syncStatusTimer = setTimeout(() => el.classList.add('hidden'), 10000);
}

// ========== CLOUD AUTO-SAVE (every 5 min if changes) ==========
let cloudDirty = false;
let cloudAutoSaveInterval = null;

function markCloudDirty() {
    if (currentUser) cloudDirty = true;
}

function startCloudAutoSave() {
    if (cloudAutoSaveInterval) return;
    cloudAutoSaveInterval = setInterval(async () => {
        if (!currentUser || !cloudDirty) return;
        cloudDirty = false;
        await cloudSave();
    }, 30 * 1000);
}

function stopCloudAutoSave() {
    if (cloudAutoSaveInterval) {
        clearInterval(cloudAutoSaveInterval);
        cloudAutoSaveInterval = null;
    }
    cloudDirty = false;
}

function showToast(message) {
    const toast = document.getElementById('feedbackToast');
    toast.querySelector('.font-bold').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}
