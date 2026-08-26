// Auto-capture JS errors
window.onerror = function(msg, src, line, col) {
  fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'error', message: msg, source: src, line, col, page: location.pathname })
  }).catch(() => {});
};

// Manual bug report
function submitBugReport() {
  const input = document.getElementById('bugReportText');
  const msg = input.value.trim();
  if (!msg) return;
  fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'feedback', message: msg, page: location.pathname })
  }).then(() => {
    input.value = '';
    alert('Thanks! Your report has been submitted.');
  }).catch(() => alert('Failed to send report. Try again later.'));
}
