// Auto-capture JS errors
window.onerror = function(msg, src, line, col) {
  fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'error', message: msg, source: src, line, col, page: location.pathname })
  }).catch(() => {});
};

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
    document.getElementById('feedbackThanks').classList.remove('hidden');
    setTimeout(() => document.getElementById('feedbackThanks').classList.add('hidden'), 8000);
  }).catch(() => alert('Failed to send report. Try again later.'));
}
