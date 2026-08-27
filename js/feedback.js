// Auto-capture JS errors
window.onerror = function(msg, src, line, col) {
  fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'error', message: msg, source: src, line, col, page: location.pathname })
  }).catch(() => {});
};

// Migration notice for GitHub Pages users
if (location.hostname !== 'segattobuilder.github.io') {
  const banner = document.createElement('div');
  banner.id = 'migrationBanner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:rgba(26,23,20,0.97);border-bottom:2px solid #d4a017;padding:14px 20px;text-align:center;font-size:13px;color:#f5efe6;backdrop-filter:blur(8px)';
  banner.innerHTML = '🚀 We\'ve moved! Save your session and switch to the new link: <a href="https://daggerheart-dm-tools.pages.dev" style="color:#d4a017;font-weight:bold;text-decoration:underline">daggerheart-dm-tools.pages.dev</a> <button onclick="this.parentElement.remove()" style="margin-left:16px;color:#6b5d4d;font-size:18px;background:none;border:none;cursor:pointer">✕</button>';
  document.body.prepend(banner);
  setTimeout(() => { if (document.getElementById('migrationBanner')) banner.remove(); }, 10000);
}

// Manual user report
function submitBugReport() {
  const input = document.getElementById('bugReportText');
  const type = document.querySelector('input[name="reportType"]:checked')?.value;
  const msg = input.value.trim();
  if (!msg || !type) return;
  fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, message: msg, page: location.pathname })
  }).then(() => {
    input.value = '';
    document.querySelectorAll('input[name="reportType"]').forEach(r => r.checked = false);
    document.getElementById('feedbackForm').classList.add('hidden');
    const toast = document.getElementById('feedbackToast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 6000);
  }).catch(() => alert('Failed to send report. Try again later.'));
}
