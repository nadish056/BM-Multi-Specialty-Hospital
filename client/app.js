// Global Application State
let globalDoctors = [];
let pendingBookingData = null;
let lastConfirmedBookingData = null;
let rawSymptomBackup = '';

document.addEventListener('DOMContentLoaded', () => {
    // Clear any browser-cached search text to prevent stale filter on load
    const searchInput = document.getElementById('doctor-search-input');
    if (searchInput) searchInput.value = '';

    fetchDoctors();
    setupThemeToggle();
    setupDoctorFilters();
    setupFormEventListeners();
    setupOTPInputs();
    setupAISymptomsEnhancer();
    setupAIChat();
    setupDoctorModal();
});



// Fetch Doctors and Populate UI
async function fetchDoctors() {
    try {
        const res = await fetch('/api/appointments/doctors');
        globalDoctors = await res.json();

        renderDoctorsGrid(globalDoctors);
        populateDepartmentOptions(globalDoctors);
        populateDoctorDropdown(globalDoctors);
    } catch (err) {
        console.error('Error fetching doctors:', err);
    }
}

// Department organ icons — Microsoft Fluent 3D emoji PNGs (stored locally)
const DEPT_ICONS = {
    'Cardiology': '/assets/organs/cardiology.png',
    'Neurology': '/assets/organs/neurology.png',
    'Orthopaedics': '/assets/organs/orthopaedics.png',
    'Orthopedics': '/assets/organs/orthopaedics.png',
    'Paediatrics': '/assets/organs/paediatrics.png',
    'Pediatrics': '/assets/organs/paediatrics.png',
    'Gynaecology': '/assets/organs/gynaecology.png',
    'Gynecology': '/assets/organs/gynaecology.png',
    'Oncology': '/assets/organs/oncology.png',
    'Ophthalmology': '/assets/organs/ophthalmology.png',
    'Dermatology': '/assets/organs/dermatology.png',
    'Gastroenterology': '/assets/organs/gastroenterology.png',
    'Pulmonology': '/assets/organs/pulmonology.png',
    'ENT': '/assets/organs/ent.png',
    'Urology': '/assets/organs/urology.png',
    'Nephrology': '/assets/organs/nephrology.png',
    'Endocrinology': '/assets/organs/endocrinology.png',
    'Psychiatry': '/assets/organs/psychiatry.png',
    'Rheumatology': '/assets/organs/rheumatology.png'
};

// Generate deterministic demo stats for a doctor (stable per doc.id across reloads)
function doctorStats(docId) {
    const patientsBases = [800, 1100, 950, 1350, 720, 1200, 1050, 880, 1450, 1000];
    const rates = [94, 96, 97, 95, 98, 93, 96, 99, 95, 97];
    const expYears = [7, 9, 11, 8, 14, 10, 6, 12, 15, 9];
    const awards = [
        'Best Cardiologist 2024', 'Excellence in Neurology', 'Top Surgeon Award',
        'Patient Choice Award 2024', 'Gold Standard Specialist', 'Clinical Excellence Award',
        'Best Doctor of the Year', 'Innovation in Medicine', 'Precision Medicine Award', 'Community Health Star'
    ];
    const i = (docId - 1) % patientsBases.length;
    return {
        patients: `${patientsBases[i]}+`,
        rate: `${rates[i]}%`,
        experience: `${expYears[i]}+ yrs`,
        award: awards[i]
    };
}

// Doctor photo helper — deterministic local asset selection based on gender & doctor ID
function docAvatar(name, docId, genderAvatar) {
    const initials = name ? name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('') : 'DR';
    const isFemale = genderAvatar && (genderAvatar.includes('👩') || genderAvatar.toLowerCase() === 'female' || genderAvatar.toLowerCase() === 'f');
    const genderDir = isFemale ? 'women' : 'men';
    const photoIndex = ((docId || 1) - 1) % 40;
    const photoUrl = `/assets/doctors/${genderDir}/${photoIndex}.jpg`;

    return `<img class="doc-photo" src="${photoUrl}" alt="${name || 'Doctor'}" onerror="this.outerHTML='<div class=\'doc-ava\'>${initials}</div>'">`;
}

// Render Doctor Cards
function renderDoctorsGrid(doctors) {
    const grid = document.getElementById('doctors-grid');
    if (!grid) return;

    if (doctors.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:2rem;">No doctors found matching your search.</div>`;
        return;
    }

    grid.innerHTML = doctors.map(doc => {
        const slotsHtml = (doc.slots || []).map(s =>
            `<span class="slot-chip">${s}</span>`
        ).join('');
        const deptClass = 'border-' + (doc.department || '').toLowerCase().replace(/[^a-z]/g, '');
        return `
            <div class="clay-card doctor-card ${deptClass}" data-dept="${doc.department}">
                <div class="doctor-card-top">
                    ${docAvatar(doc.name, doc.id, doc.avatar)}
                    <div class="doctor-card-meta">
                        <h3 class="doctor-card-name">${doc.name}</h3>
                        <p class="doctor-card-designation">${doc.designation || 'Specialist'}</p>
                        <span class="avail-badge yes">● Available Today</span>
                    </div>
                </div>
                <p style="font-size:0.84rem; margin-top:0.6rem;"><strong>Department:</strong> ${doc.department}</p>
                <p style="font-size:0.84rem; margin-top:4px;"><strong>Qualification:</strong> ${doc.qualification || 'MBBS, MD'}</p>
                <p style="font-size:0.82rem; margin-top:10px; font-weight:600;">Daily Consultation Slots:</p>
                <div class="slots-grid">${slotsHtml}</div>
                <div class="doctor-card-actions">
                    <button onclick="openDoctorModal(${doc.id})" class="clay-btn clay-btn-outline">View Doctor</button>
                    <button onclick="prefillBooking('${doc.department}', ${doc.id})" class="clay-btn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:text-bottom;margin-right:3px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>Book</button>
                </div>
            </div>
        `;
    }).join('');
}

// Open Doctor Detail Modal
window.openDoctorModal = function(docId) {
    const doc = globalDoctors.find(d => d.id === docId);
    if (!doc) return;

    const modal = document.getElementById('doctor-detail-modal');
    const stats = doctorStats(docId);
    const seed = encodeURIComponent(docId);
    const initials = doc.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('');

    const photoEl = document.getElementById('dm-photo');
    const initialsEl = document.getElementById('dm-initials');
    const isFemale = doc.avatar && (doc.avatar.includes('👩') || doc.avatar.toLowerCase() === 'female' || doc.avatar.toLowerCase() === 'f');
    const genderDir = isFemale ? 'women' : 'men';
    const photoIndex = ((doc.id || 1) - 1) % 40;

    photoEl.src = `/assets/doctors/${genderDir}/${photoIndex}.jpg`;
    photoEl.style.display = 'block';
    initialsEl.style.display = 'none';
    initialsEl.textContent = initials;

    document.getElementById('dm-name').textContent = doc.name;
    document.getElementById('dm-designation').textContent = doc.designation || 'Specialist';
    document.getElementById('dm-dept').textContent = doc.department;
    document.getElementById('dm-qual').textContent = doc.qualification || 'MBBS, MD';
    document.getElementById('dm-patients').textContent = stats.patients;
    document.getElementById('dm-rate').textContent = stats.rate;
    document.getElementById('dm-exp').textContent = stats.experience;
    document.getElementById('dm-award').textContent = stats.award;

    const bookBtn = document.getElementById('dm-book-btn');
    bookBtn.onclick = () => {
        modal.classList.remove('active');
        prefillBooking(doc.department, doc.id);
    };

    modal.classList.add('active');
    modal.style.opacity = '';

    if (typeof gsap !== 'undefined') {
        const card = modal.querySelector('.doctor-modal-card');
        gsap.fromTo(card, { y: 40, scale: 0.95 }, { y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.4)' });
    }
};

// Close Doctor Modal — window-scoped so inline onclick can also call it
window.closeDoctorModal = function() {
    const modal = document.getElementById('doctor-detail-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.opacity = '';
    }
};

// Wire up Doctor Modal close (addEventListener + Escape key)
function setupDoctorModal() {
    const closeBtn = document.getElementById('close-doctor-modal-btn');
    const modal = document.getElementById('doctor-detail-modal');
    if (!closeBtn || !modal) return;

    // Belt-and-suspenders: both addEventListener and inline onclick are wired
    closeBtn.addEventListener('click', window.closeDoctorModal);

    // Close on backdrop click (only when clicking the overlay itself, not the card)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) window.closeDoctorModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            window.closeDoctorModal();
        }
    });
}

// Populate Departments Dropdown & Grid
function populateDepartmentOptions(doctors) {
    const depts = [...new Set(doctors.map(d => d.department))].sort();
    const deptSelect = document.getElementById('f-dept');
    const filterSelect = document.getElementById('doctor-dept-filter');
    const deptGrid = document.getElementById('departments-grid');

    if (deptSelect) {
        deptSelect.innerHTML = `<option value="">Select Department</option>` +
            depts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    if (filterSelect) {
        filterSelect.innerHTML = `<option value="ALL">All Departments</option>` +
            depts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    if (deptGrid) {
        deptGrid.innerHTML = depts.map(d => {
            const iconPath = DEPT_ICONS[d] || '/assets/organs/default.svg';
            const deptClass = 'border-' + d.toLowerCase().replace(/[^a-z]/g, '');
            const docCount = doctors.filter(doc => doc.department === d).length;
            return `
            <div class="clay-card dept-card-box ${deptClass}" onclick="filterDoctorsByDept('${d}')">
                <div class="dept-icon"><img src="${iconPath}" class="dept-icon-img" alt="${d} icon" onerror="this.onerror=null; this.src='/assets/organs/default.svg';"></div>
                <h3>${d}</h3>
                <p>${docCount} Specialist${docCount !== 1 ? 's' : ''}</p>
            </div>`;
        }).join('');
    }
}

// Populate Doctor Dropdown
function populateDoctorDropdown(doctors, selectedDept = '') {
    const docSelect = document.getElementById('f-doctor');
    if (!docSelect) return;

    let filtered = doctors;
    if (selectedDept) {
        filtered = doctors.filter(d => d.department === selectedDept);
    }

    docSelect.innerHTML = `<option value="">Select Doctor</option>` +
        filtered.map(d => `<option value="${d.id}" data-dept="${d.department}">${d.name} (${d.department})</option>`).join('');
}

// Prefill Booking Form from AI or Doctor Card
window.prefillBooking = function (dept, docId) {
    const deptSelect = document.getElementById('f-dept');
    const docSelect = document.getElementById('f-doctor');
    const bookingSection = document.getElementById('booking');

    if (deptSelect) {
        deptSelect.value = dept;
        populateDoctorDropdown(globalDoctors, dept);
    }
    if (docSelect) {
        docSelect.value = docId;
        updateAvailableSlots();
    }

    if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
};

window.filterDoctorsByDept = function (dept) {
    const filterSelect = document.getElementById('doctor-dept-filter');
    if (filterSelect) {
        filterSelect.value = dept;
        filterSelect.dispatchEvent(new Event('change'));
    }
    document.getElementById('doctors').scrollIntoView({ behavior: 'smooth' });
};

// Filter Event Listeners
function setupDoctorFilters() {
    const filterSelect = document.getElementById('doctor-dept-filter');
    const searchInput = document.getElementById('doctor-search-input');

    const debounce = (func, wait) => {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    const applyFilters = () => {
        const selectedDept = filterSelect ? filterSelect.value : 'ALL';
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = globalDoctors.filter(d => {
            const matchesDept = selectedDept === 'ALL' || d.department === selectedDept;
            const matchesSearch = d.name.toLowerCase().includes(query) || d.department.toLowerCase().includes(query);
            return matchesDept && matchesSearch;
        });

        renderDoctorsGrid(filtered);
    };

    const debouncedApplyFilters = debounce(applyFilters, 120);

    if (filterSelect) filterSelect.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', debouncedApplyFilters);
}

// Update Slot Dropdown based on Selected Doctor & Date
async function updateAvailableSlots() {
    const docSelect = document.getElementById('f-doctor');
    const dateInput = document.getElementById('f-date');
    const slotSelect = document.getElementById('f-slot');

    if (!docSelect || !slotSelect) return;

    const docId = parseInt(docSelect.value);
    const dateVal = dateInput ? dateInput.value : '';

    if (!docId) {
        slotSelect.innerHTML = `<option value="">Select Time Slot (Select Doctor First)</option>`;
        return;
    }

    const doctor = globalDoctors.find(d => d.id === docId);
    if (!doctor) return;

    let bookedSlots = [];
    if (dateVal) {
        try {
            const res = await fetch(`/api/appointments/booked-slots?doctor_id=${docId}&date=${dateVal}`);
            bookedSlots = await res.json();
        } catch (e) {
            console.error('Error fetching booked slots:', e);
        }
    }

    // Filter past slots for today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const availableSlots = (doctor.slots || []).map(slot => {
        let isBooked = bookedSlots.includes(slot);
        let isPast = false;

        if (dateVal === todayStr) {
            // Parse time string e.g. "09:00 AM" or "02:00 PM"
            const [timeStr, period] = slot.split(' ');
            let [h, m] = timeStr.split(':').map(Number);
            if (period === 'PM' && h < 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;

            if (h < currentHour || (h === currentHour && m <= currentMin)) {
                isPast = true;
            }
        }

        // Only disable slots that are already booked in the DB
        return { slot, disabled: isBooked, reason: isBooked ? '(Booked)' : '' };
    });

    slotSelect.innerHTML = `<option value="">Select Time Slot</option>` +
        availableSlots.map(s => `
            <option value="${s.slot}" ${s.disabled ? 'disabled style="color: #94a3b8;"' : ''}>
                ${s.slot} ${s.reason}
            </option>
        `).join('');
}

// Form Event Listeners
function setupFormEventListeners() {
    const deptSelect = document.getElementById('f-dept');
    const docSelect = document.getElementById('f-doctor');
    const dateInput = document.getElementById('f-date');
    const bookingForm = document.getElementById('booking-form');

    // Default min date to today
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.value = new Date().toISOString().split('T')[0];
        dateInput.addEventListener('change', updateAvailableSlots);
    }

    if (deptSelect) {
        deptSelect.addEventListener('change', (e) => {
            populateDoctorDropdown(globalDoctors, e.target.value);
            updateAvailableSlots();
        });
    }

    if (docSelect) {
        docSelect.addEventListener('change', (e) => {
            const selectedOpt = e.target.selectedOptions[0];
            if (selectedOpt && selectedOpt.dataset.dept) {
                const docDept = selectedOpt.dataset.dept;
                if (deptSelect && deptSelect.value !== docDept) {
                    deptSelect.value = docDept;
                    showMismatchWarning(`Department automatically updated to <strong>${docDept}</strong> for the selected specialist.`);
                }
            }
            updateAvailableSlots();
        });
    }

    if (bookingForm) bookingForm.addEventListener('submit', handleBookingSubmit);

    // Modal Close Buttons
    const closeMismatchBtn = document.getElementById('close-mismatch-btn');
    if (closeMismatchBtn) {
        closeMismatchBtn.addEventListener('click', () => {
            const m = document.getElementById('mismatch-popup');
            if (m) m.classList.remove('active');
        });
    }

    const closeSuccessBtn = document.getElementById('close-success-btn');
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', window.closeSuccessModal);
    }

    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', generateAppointmentPDF);
    }
}

// Global Window-scoped Close Success Modal
window.closeSuccessModal = function() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.opacity = '';
    }
    if (window._glowTween) {
        window._glowTween.kill();
        window._glowTween = null;
    }
};

function showMismatchWarning(msg) {
    const popup = document.getElementById('mismatch-popup');
    const detail = document.getElementById('mismatch-detail');
    if (popup && detail) {
        detail.innerHTML = msg;
        popup.classList.add('active');
    }
}

// Handle Form Submission (Step 1: Request OTP)
async function handleBookingSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    pendingBookingData = Object.fromEntries(formData.entries());

    const submitBtn = document.getElementById('book-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Sending Verification OTP...';

    try {
        const res = await fetch('/api/appointments/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingBookingData.email })
        });

        const data = await res.json();

        if (res.ok) {
            const modal = document.getElementById('otp-modal');
            const inputs = modal.querySelectorAll('.otp-digit');
            inputs.forEach(i => i.value = '');
            modal.classList.add('active');
            document.getElementById('modal-email-display').textContent = pendingBookingData.email;
            if (inputs[0]) inputs[0].focus();
        } else {
            alert(data.error || 'Failed to send OTP.');
        }
    } catch (err) {
        alert('Server error. Please check your connection.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg> Confirm & Verify OTP';
    }
}

// Setup OTP Inputs (Auto-tabbing & Paste)
function setupOTPInputs() {
    const inputs = document.querySelectorAll('.otp-digit');
    if (!inputs.length) return;

    inputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length >= 1) {
                e.target.value = val.slice(-1);
                if (idx < inputs.length - 1) {
                    inputs[idx + 1].focus();
                }
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && idx > 0) {
                inputs[idx - 1].focus();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
            const digits = pasteData.replace(/\D/g, '').slice(0, 6);

            if (digits) {
                digits.split('').forEach((char, i) => {
                    if (inputs[i]) inputs[i].value = char;
                });
                const nextFocus = Math.min(digits.length - 1, inputs.length - 1);
                inputs[nextFocus].focus();
            }
        });
    });

    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    if (verifyOtpBtn) verifyOtpBtn.addEventListener('click', handleVerifyOTP);
}

// Step 2: Verify OTP & Complete Booking
async function handleVerifyOTP() {
    const otpInputs = document.querySelectorAll('.otp-digit');
    let otp = '';
    otpInputs.forEach(input => otp += input.value);

    if (otp.length !== 6) {
        alert('Please enter a 6-digit OTP code.');
        return;
    }

    const verifyBtn = document.getElementById('verify-otp-btn');
    const otpError = document.getElementById('otp-error');
    otpError.style.display = 'none';
    otpError.textContent = '';

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';

    try {
        const payload = { ...pendingBookingData, otp };
        const res = await fetch('/api/appointments/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            document.getElementById('otp-modal').classList.remove('active');

            lastConfirmedBookingData = {
                id: data.appointment_id,
                name: data.details.name,
                email: data.details.email,
                department: data.details.department,
                doctor: data.details.doctor,
                date: data.details.date,
                time: data.details.time,
                reason: pendingBookingData.reason || 'General Consultation'
            };

            // Populate Success Modal Slip — all 7 fields
            document.getElementById('s-id').textContent = lastConfirmedBookingData.id;
            document.getElementById('s-name').textContent = lastConfirmedBookingData.name;
            document.getElementById('s-email').textContent = lastConfirmedBookingData.email;
            document.getElementById('s-dept').textContent = lastConfirmedBookingData.department;
            document.getElementById('s-doc').textContent = lastConfirmedBookingData.doctor;
            document.getElementById('s-time').textContent = `${lastConfirmedBookingData.date} at ${lastConfirmedBookingData.time}`;
            document.getElementById('s-reason').textContent = lastConfirmedBookingData.reason || 'General Consultation';

            const successModal = document.getElementById('success-modal');
            successModal.classList.add('active');

            // Trigger one-shot mail-fly animation (no loop)
            const mailEnvelope = document.getElementById('mail-envelope');
            if (mailEnvelope) {
                mailEnvelope.classList.remove('mail-fly');
                void mailEnvelope.offsetWidth; // reflow to re-trigger
                mailEnvelope.classList.add('mail-fly');
                // Show sub-text after animation completes
                const subText = document.getElementById('modal-sub-text');
                if (subText) setTimeout(() => { subText.style.display = 'block'; }, 1400);
            }

            if (typeof gsap !== 'undefined') {
                const modalInner = successModal.querySelector('.success-modal-card');
                const glowRing = successModal.querySelector('.success-glow-ring');

                gsap.fromTo(successModal, { opacity: 0 }, { opacity: 1, duration: 0.3 });
                gsap.fromTo(modalInner,
                    { y: 50, scale: 0.9 },
                    { y: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)", delay: 0.1 }
                );
                // Fixed: repeat:1 (plays twice, ~2.4s total) — was infinite repeat:-1
                if (glowRing) {
                    window._glowTween = gsap.fromTo(glowRing,
                        { scale: 0.5, opacity: 0 },
                        { scale: 1.5, opacity: 0.5, duration: 1.2, ease: "power2.out", yoyo: true, repeat: 1 }
                    );
                }
            }

            // Reset booking form
            document.getElementById('booking-form').reset();
            updateAvailableSlots();
        } else {
            otpError.textContent = data.error || 'Verification failed.';
            otpError.style.display = 'block';
        }
    } catch (err) {
        otpError.textContent = 'Server error verifying OTP.';
        otpError.style.display = 'block';
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Confirm';
    }
}

// Generate PDF Appointment Receipt Slip
function generateAppointmentPDF() {
    if (!lastConfirmedBookingData || !window.jspdf) {
        alert('PDF generator component loading...');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Primary Colors
    const primaryTeal = '#0d9488';
    const darkSlate = '#0f172a';

    // Header Banner
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('BM MULTI SPECIALITY HOSPITAL', 15, 19);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('42, Anna Salai, Near Gemini Flyover, Chennai | Call: +91 44-2600-1234', 15, 26);

    // Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIRMED APPOINTMENT SLIP', 15, 46);

    const dataRows = [
        ['Appointment ID:', lastConfirmedBookingData.id],
        ['Patient Name:', lastConfirmedBookingData.name],
        ['Patient Email:', lastConfirmedBookingData.email],
        ['Department:', lastConfirmedBookingData.department],
        ['Attending Specialist:', lastConfirmedBookingData.doctor],
        ['Appointment Date:', lastConfirmedBookingData.date],
        ['Consultation Slot:', lastConfirmedBookingData.time],
        ['Symptoms / Reason:', lastConfirmedBookingData.reason || 'General Consultation']
    ];

    let currentY = 66;
    const startY = 53;

    doc.setFontSize(10.5);

    // First calculate layout positions & heights for multiline fields
    const renderedRows = dataRows.map(([label, value]) => {
        const textStr = String(value || '');
        const wrappedLines = doc.splitTextToSize(textStr, 110);
        const rowHeight = Math.max(10, wrappedLines.length * 5.5 + 4);
        return { label, value, wrappedLines, rowHeight };
    });

    const totalBoxHeight = renderedRows.reduce((sum, r) => sum + r.rowHeight, 14);

    // Draw Slip Details Box with calculated height
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.8);
    doc.roundedRect(15, startY, 180, totalBoxHeight, 4, 4);

    // Render Data Rows inside box
    renderedRows.forEach(({ label, wrappedLines, rowHeight }) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136);
        doc.text(label, 22, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        
        wrappedLines.forEach((line, i) => {
            doc.text(line, 75, currentY + (i * 5));
        });

        currentY += rowHeight;
    });

    // Footer Disclaimer below the box
    const footerY = startY + totalBoxHeight + 12;
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Please present this slip at the OPD reception counter 15 minutes prior to your consultation slot.', 15, footerY);
    doc.text('Emergency Helpline: +91 1800-222-555 | 24/7 Pharmacy & Diagnostics Available', 15, footerY + 6);

    doc.save(`Appointment_Slip_${lastConfirmedBookingData.id}.pdf`);
}

// AI Symptom Enhancer
function setupAISymptomsEnhancer() {
    const btnEnhance = document.getElementById('btn-ai-symptoms');
    const textarea = document.getElementById('f-reason');
    const toolbar = document.getElementById('ai-enhance-bar');
    const btnConfirm = document.getElementById('btn-ai-confirm');
    const btnRollback = document.getElementById('btn-ai-rollback');

    if (!btnEnhance || !textarea) return;

    btnEnhance.addEventListener('click', async () => {
        const text = textarea.value.trim();
        if (!text) {
            alert('Please enter your symptoms in the box first!');
            return;
        }

        rawSymptomBackup = text;
        btnEnhance.disabled = true;
        btnEnhance.textContent = '✨ Refining...';

        try {
            const res = await fetch('/api/ai/enhance-symptoms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_symptoms: text })
            });

            const data = await res.json();
            if (res.ok && data.enhanced_text) {
                // Strip raw markdown formatting symbols (*, **, ###) for clean text presentation
                const cleanText = data.enhanced_text
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1')
                    .replace(/`(.*?)`/g, '$1')
                    .replace(/^\s*[\*\-\+]\s+/gm, '• ')
                    .replace(/^#+\s+/gm, '')
                    .trim();
                textarea.value = cleanText;
                if (toolbar) toolbar.classList.add('active');
            } else {
                alert(data.error || 'Failed to refine symptoms with AI.');
            }
        } catch (err) {
            alert('Server error connecting to AI symptom enhancer.');
        } finally {
            btnEnhance.disabled = false;
            btnEnhance.textContent = '✨ Enhance with AI';
        }
    });

    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            if (toolbar) toolbar.classList.remove('active');
        });
    }

    if (btnRollback) {
        btnRollback.addEventListener('click', () => {
            textarea.value = rawSymptomBackup;
            if (toolbar) toolbar.classList.remove('active');
        });
    }
}

// AI Chatbot Interface
function setupAIChat() {
    const toggleBtn = document.getElementById('ai-toggle-btn');
    const chatBox = document.getElementById('ai-chat-box');
    const sendBtn = document.getElementById('ai-send-btn');
    const input = document.getElementById('ai-input');
    const closeBtn = document.getElementById('ai-close-btn');

    if (toggleBtn && chatBox) {
        const openChat = () => {
            chatBox.style.display = 'flex';
            chatBox.setAttribute('aria-hidden', 'false');
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(chatBox,
                    { y: 50, scale: 0.95, opacity: 0 },
                    { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.2)" }
                );
            }
            chatBox.classList.add('active');
        };

        const closeChat = () => {
            chatBox.setAttribute('aria-hidden', 'true');
            if (typeof gsap !== 'undefined') {
                gsap.to(chatBox, {
                    y: 50, scale: 0.95, opacity: 0, duration: 0.3, ease: "power2.in",
                    onComplete: () => {
                        chatBox.style.display = 'none';
                        chatBox.classList.remove('active');
                    }
                });
            } else {
                chatBox.style.display = 'none';
                chatBox.classList.remove('active');
            }
        };

        toggleBtn.addEventListener('click', () => {
            const isActive = chatBox.classList.contains('active');
            if (!isActive) {
                openChat();
            } else {
                closeChat();
            }
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeChat();
            });
        }
    }

    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;

        // Render User Message
        appendChatMessage('user', text);
        input.value = '';

        // Show Animated Thinking Indicator
        const thinkingId = showThinkingIndicator();

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            const data = await res.json();
            removeThinkingIndicator(thinkingId);

            if (res.ok && data.response) {
                typewriterAIResponse(data.response);
            } else {
                appendChatMessage('bot', 'I apologize, I am unable to connect to the AI medical server right now.');
            }
        } catch (err) {
            removeThinkingIndicator(thinkingId);
            appendChatMessage('bot', 'Server error. Please check your connection.');
        }
    };

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

function appendChatMessage(sender, text) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    div.innerHTML = parseMarkdownToHTML(text);
    chatMessages.appendChild(div);
    
    // Only scroll automatically for the user's typed messages
    if (sender === 'user') {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function showThinkingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return null;

    const div = document.createElement('div');
    const id = 'thinking-' + Date.now();
    div.id = id;
    div.className = 'chat-msg bot';
    div.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div> Analytics AI Thinking...`;
    chatMessages.appendChild(div);
    return id;
}

function removeThinkingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Typewriter Effect for AI Markdown
function typewriterAIResponse(fullText) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    chatMessages.appendChild(div);

    let htmlContent = parseMarkdownToHTML(fullText);
    div.innerHTML = htmlContent;
    // Keep page/chatbox standing (no auto-scroll to bottom, letting the user swipe down)
}

// Parse Markdown & Action Triggers
function parseMarkdownToHTML(md) {
    let text = md;

    // Detect Action Tag e.g. [ACTION:SUGGEST_BOOKING department="Ophthalmology" doctor_id=12 doctor_name="Dr. Ramesh Kumar"]
    let actionBtnHtml = '';
    const actionMatch = text.match(/\[ACTION:SUGGEST_BOOKING department="([^"]+)" doctor_id=(\d+) doctor_name="([^"]+)"\]/);

    if (actionMatch) {
        const [_, dept, docId, docName] = actionMatch;
        actionBtnHtml = `<br><button class="chat-action-btn" onclick="prefillBooking('${dept}', ${docId})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg> Book Consultation with ${docName}</button>`;
        text = text.replace(actionMatch[0], '');
    }

    // Markdown Rules
    text = text.replace(/### (.*?)\n/g, '<h3>$1</h3>');
    text = text.replace(/## (.*?)\n/g, '<h2>$1</h2>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\* (.*?)\n/g, '<li>$1</li>');
    text = text.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    text = text.replace(/\n\n/g, '</p><p>');

    return `<p>${text}</p>${actionBtnHtml}`;
}


// Theme Toggle Setup
function setupThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('.theme-icon') || toggleBtn;

    const apply = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        if (icon.classList.contains('theme-icon')) {
            icon.textContent = theme === 'dark' ? '☀' : '☽';
        }
    };

    apply(document.documentElement.getAttribute('data-theme') || 'dark');

    toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        apply(current === 'dark' ? 'light' : 'dark');
    });
}



// ── Scroll-in Animations ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const targets = document.querySelectorAll('[data-animate]');
    if (!targets.length) return;

    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => obs.observe(el));
});
