/* ──────────────────────────────────────
   Admin Portal – app logic
   ────────────────────────────────────── */

let currentAppointments = [];

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, skip login screen
    const token = localStorage.getItem('admin_token');
    if (token) showDashboard();

    document.getElementById('admin-login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('refresh-btn')?.addEventListener('click', () => { loadStats(); loadAppointments(); });
    document.getElementById('export-csv-btn')?.addEventListener('click', exportToCSV);

    document.getElementById('search-input')?.addEventListener('input', debounce(loadAppointments, 300));
    document.getElementById('dept-select')?.addEventListener('change', loadAppointments);
    document.getElementById('status-select')?.addEventListener('change', loadAppointments);
});

/* ── Authentication ──────────────────────────── */
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.textContent = 'Signing in…';
    btn.disabled = true;

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value.trim();

    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('admin_token', data.token);
            localStorage.setItem('admin_id', email);
            showDashboard();
        } else {
            errorDiv.textContent = data.error || 'Invalid credentials. Please check your Admin ID and Password.';
            errorDiv.style.display = 'block';
        }
    } catch {
        errorDiv.textContent = 'Server connection error. Is the server running?';
        errorDiv.style.display = 'block';
    } finally {
        btn.textContent = '🔐 Sign In to Portal';
        btn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_id');
    window.location.reload();
}

function showDashboard() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'flex';

    const adminId = localStorage.getItem('admin_id') || 'admin';
    const label = document.getElementById('admin-id-label');
    if (label) label.textContent = `👤 ${adminId}`;

    loadStats();
    loadDepartmentsFilter();
    loadAppointments();
}

/* ── Stats ─────────────────────────────────── */
async function loadStats() {
    const token = localStorage.getItem('admin_token');
    try {
        const res = await fetch('/api/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const stats = await res.json();
        document.getElementById('stat-total-patients').textContent  = stats.totalPatients        ?? '—';
        document.getElementById('stat-today-patients').textContent  = stats.todaysPatients       ?? '—';
        document.getElementById('stat-total-doctors').textContent   = stats.totalDoctors         ?? '—';
        document.getElementById('stat-confirmed').textContent       = stats.confirmedAppointments ?? '—';
        document.getElementById('stat-completed').textContent       = stats.completedAppointments ?? '—';
    } catch { /* silently fail, keep showing dashes */ }
}

/* ── Department Filter Dropdown ─────────────── */
async function loadDepartmentsFilter() {
    try {
        const res = await fetch('/api/appointments/doctors');
        const docs = await res.json();
        const depts = [...new Set(docs.map(d => d.department))].sort();
        const sel = document.getElementById('dept-select');
        if (!sel) return;
        sel.innerHTML = `<option value="">All Departments</option>` +
            depts.map(d => `<option value="${d}">${d}</option>`).join('');
    } catch { /* ignore */ }
}

/* ── Appointments Table ─────────────────────── */
async function loadAppointments() {
    const token = localStorage.getItem('admin_token');
    const search     = document.getElementById('search-input')?.value  || '';
    const department = document.getElementById('dept-select')?.value   || '';
    const status     = document.getElementById('status-select')?.value || '';

    const query = new URLSearchParams({ search, department, status }).toString();

    try {
        const res = await fetch(`/api/admin/appointments?${query}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) { handleLogout(); return; }
        currentAppointments = await res.json();
        renderTable(currentAppointments);
    } catch {
        document.getElementById('appointments-tbody').innerHTML =
            `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8;">Failed to load appointments.</td></tr>`;
    }
}

function renderTable(appointments) {
    const tbody = document.getElementById('appointments-tbody');
    if (!tbody) return;

    if (!appointments.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8;">No appointments found.</td></tr>`;
        return;
    }

    tbody.innerHTML = appointments.map(app => `
        <tr>
            <td><strong style="color:#0d9488;">${app.appointment_id}</strong></td>
            <td>
                ${app.patient_name}<br>
                <small style="color:#94a3b8;">${app.patient_email}</small>
            </td>
            <td>${app.department}</td>
            <td>${app.doctor_name || '<em style="color:#94a3b8;">Unassigned</em>'}</td>
            <td>
                ${app.appointment_date}<br>
                <small style="color:#64748b;">${app.appointment_time}</small>
            </td>
            <td><span class="status-badge ${app.status}">${app.status}</span></td>
            <td>
                <select class="status-select" onchange="updateStatus(${app.id}, this.value)">
                    <option value="Confirmed"  ${app.status==='Confirmed'  ? 'selected' : ''}>Confirmed</option>
                    <option value="Completed"  ${app.status==='Completed'  ? 'selected' : ''}>Completed</option>
                    <option value="Cancelled"  ${app.status==='Cancelled'  ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
        </tr>
    `).join('');
}

/* ── Status Update ──────────────────────────── */
async function updateStatus(id, status) {
    const token = localStorage.getItem('admin_token');
    try {
        const res = await fetch(`/api/admin/appointments/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status })
        });
        if (res.ok) { loadStats(); loadAppointments(); }
    } catch { alert('Failed to update appointment status.'); }
}

/* ── CSV Export ─────────────────────────────── */
function exportToCSV() {
    if (!currentAppointments.length) return alert('No data to export.');

    const headers = ['ID', 'Patient Name', 'Email', 'Phone', 'Department', 'Doctor', 'Date', 'Time', 'Status'];
    const rows = currentAppointments.map(a => [
        a.appointment_id, a.patient_name, a.patient_email, a.patient_phone || '',
        a.department, a.doctor_name || 'Unassigned', a.appointment_date, a.appointment_time, a.status
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ── Debounce ───────────────────────────────── */
function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
