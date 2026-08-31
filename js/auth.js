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
    renderAuthUI();
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
    await getSupabase().auth.signOut();
    currentUser = null;
    renderAuthUI();
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
    else showToast('☁️ Saved to cloud!');
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
    showToast('☁️ Loaded from cloud!');
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

function renderAuthUI() {
    const btn = document.getElementById('authBtn');
    if (currentUser) {
        const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
        btn.innerHTML = `<span class="text-[10px] text-[#d4a017] font-bold truncate max-w-[80px]">${escHtml(name)}</span>`;
        btn.onclick = toggleAuthMenu;
        document.getElementById('cloudActions').classList.remove('hidden');
    } else {
        btn.innerHTML = '<span class="text-[10px] text-zinc-400">Sign In</span>';
        btn.onclick = openAuthModal;
        document.getElementById('cloudActions').classList.add('hidden');
    }
}

function toggleAuthMenu() {
    const menu = document.getElementById('authMenu');
    menu.classList.toggle('hidden');
    // Close on outside click
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
            const handler = (e) => {
                if (!menu.contains(e.target) && e.target !== document.getElementById('authBtn')) {
                    menu.classList.add('hidden');
                    document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 0);
    }
}

function showToast(message) {
    const toast = document.getElementById('feedbackToast');
    toast.querySelector('.font-bold').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}
