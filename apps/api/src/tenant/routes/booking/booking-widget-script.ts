/**
 * Dento Booking Widget — Self-contained embeddable JavaScript
 *
 * This module exports the widget source as a string.
 * It is served by GET /api/bookings/widget.js
 *
 * The widget reads its configuration from:
 *   - data-api attribute on the script tag (API base URL)
 *   - data-tenant attribute on the script tag (tenant slug)
 * Then fetches runtime config from GET /api/bookings/widget-config
 */

export function generateWidgetScript(): string {
  return `(function(){
"use strict";

// ── Find our own script tag ────────────────────────────────

var scriptTag = document.currentScript || (function(){
  var scripts = document.getElementsByTagName('script');
  for(var i = scripts.length - 1; i >= 0; i--){
    if(scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) return scripts[i];
  }
  return null;
})();

if(!scriptTag){
  console.error('[Dento Widget] Could not find script tag');
  return;
}

var API_URL = scriptTag.getAttribute('data-api') || '';
var TENANT_SLUG = scriptTag.getAttribute('data-tenant') || '';

if(!API_URL || !TENANT_SLUG){
  console.error('[Dento Widget] Missing data-api or data-tenant attributes');
  return;
}

// Remove trailing slash
API_URL = API_URL.replace(/\\/+$/, '');

var HEADERS = { 'X-Tenant-Slug': TENANT_SLUG, 'Content-Type': 'application/json' };

// ── Default configuration (overridden by API) ──────────────

var config = {
  primaryColor: '#16a085',
  buttonPosition: 'bottom-right',
  language: 'en',
  buttonText: 'Book Now',
  showBranding: true
};

// ── Translations ───────────────────────────────────────────

var T = {
  en: {
    title: 'Book an Appointment',
    step1: 'Choose a Branch',
    step2: 'Choose a Doctor',
    step3: 'Choose a Date',
    step4: 'Choose a Time',
    step5: 'Your Information',
    selectBranch: 'Select a branch...',
    selectDoctor: 'Select a doctor...',
    loadingBranches: 'Loading branches...',
    loadingDoctors: 'Loading doctors...',
    loadingSlots: 'Loading times...',
    noSlots: 'No available times on this date.',
    allBooked: 'All times are booked. Try another date.',
    firstName: 'First Name *',
    lastName: 'Last Name *',
    phone: 'Phone *',
    email: 'Email (optional)',
    reason: 'Reason for visit (optional)',
    submit: 'Book Appointment',
    booking: 'Booking...',
    success: 'Booking submitted! We will contact you shortly.',
    error: 'Something went wrong. Please try again.',
    required: 'Please fill in all required fields.',
    selectSlot: 'Please select a time slot.',
    close: 'Close',
    available: 'Available',
    taken: 'Taken',
    poweredBy: 'Powered by Dento'
  },
  ar: {
    title: '\\u062D\\u062C\\u0632 \\u0645\\u0648\\u0639\\u062F',
    step1: '\\u0627\\u062E\\u062A\\u0631 \\u0627\\u0644\\u0641\\u0631\\u0639',
    step2: '\\u0627\\u062E\\u062A\\u0631 \\u0627\\u0644\\u0637\\u0628\\u064A\\u0628',
    step3: '\\u0627\\u062E\\u062A\\u0631 \\u0627\\u0644\\u062A\\u0627\\u0631\\u064A\\u062E',
    step4: '\\u0627\\u062E\\u062A\\u0631 \\u0627\\u0644\\u0648\\u0642\\u062A',
    step5: '\\u0628\\u064A\\u0627\\u0646\\u0627\\u062A\\u0643',
    selectBranch: '\\u0627\\u062E\\u062A\\u0631 \\u0641\\u0631\\u0639...',
    selectDoctor: '\\u0627\\u062E\\u062A\\u0631 \\u0637\\u0628\\u064A\\u0628...',
    loadingBranches: '\\u062C\\u0627\\u0631\\u064A \\u062A\\u062D\\u0645\\u064A\\u0644 \\u0627\\u0644\\u0641\\u0631\\u0648\\u0639...',
    loadingDoctors: '\\u062C\\u0627\\u0631\\u064A \\u062A\\u062D\\u0645\\u064A\\u0644 \\u0627\\u0644\\u0623\\u0637\\u0628\\u0627\\u0621...',
    loadingSlots: '\\u062C\\u0627\\u0631\\u064A \\u062A\\u062D\\u0645\\u064A\\u0644 \\u0627\\u0644\\u0645\\u0648\\u0627\\u0639\\u064A\\u062F...',
    noSlots: '\\u0644\\u0627 \\u062A\\u0648\\u062C\\u062F \\u0645\\u0648\\u0627\\u0639\\u064A\\u062F \\u0645\\u062A\\u0627\\u062D\\u0629 \\u0641\\u064A \\u0647\\u0630\\u0627 \\u0627\\u0644\\u062A\\u0627\\u0631\\u064A\\u062E.',
    allBooked: '\\u062C\\u0645\\u064A\\u0639 \\u0627\\u0644\\u0645\\u0648\\u0627\\u0639\\u064A\\u062F \\u0645\\u062D\\u062C\\u0648\\u0632\\u0629. \\u062C\\u0631\\u0628 \\u062A\\u0627\\u0631\\u064A\\u062E \\u0622\\u062E\\u0631.',
    firstName: '\\u0627\\u0644\\u0627\\u0633\\u0645 \\u0627\\u0644\\u0623\\u0648\\u0644 *',
    lastName: '\\u0627\\u0644\\u0627\\u0633\\u0645 \\u0627\\u0644\\u0623\\u062E\\u064A\\u0631 *',
    phone: '\\u0631\\u0642\\u0645 \\u0627\\u0644\\u0647\\u0627\\u062A\\u0641 *',
    email: '\\u0627\\u0644\\u0628\\u0631\\u064A\\u062F \\u0627\\u0644\\u0625\\u0644\\u0643\\u062A\\u0631\\u0648\\u0646\\u064A (\\u0627\\u062E\\u062A\\u064A\\u0627\\u0631\\u064A)',
    reason: '\\u0633\\u0628\\u0628 \\u0627\\u0644\\u0632\\u064A\\u0627\\u0631\\u0629 (\\u0627\\u062E\\u062A\\u064A\\u0627\\u0631\\u064A)',
    submit: '\\u062D\\u062C\\u0632 \\u0645\\u0648\\u0639\\u062F',
    booking: '\\u062C\\u0627\\u0631\\u064A \\u0627\\u0644\\u062D\\u062C\\u0632...',
    success: '\\u062A\\u0645 \\u0625\\u0631\\u0633\\u0627\\u0644 \\u0627\\u0644\\u062D\\u062C\\u0632! \\u0633\\u0646\\u062A\\u0648\\u0627\\u0635\\u0644 \\u0645\\u0639\\u0643 \\u0642\\u0631\\u064A\\u0628\\u0627\\u064B.',
    error: '\\u062D\\u062F\\u062B \\u062E\\u0637\\u0623. \\u064A\\u0631\\u062C\\u0649 \\u0627\\u0644\\u0645\\u062D\\u0627\\u0648\\u0644\\u0629 \\u0645\\u0631\\u0629 \\u0623\\u062E\\u0631\\u0649.',
    required: '\\u064A\\u0631\\u062C\\u0649 \\u0645\\u0644\\u0621 \\u062C\\u0645\\u064A\\u0639 \\u0627\\u0644\\u062D\\u0642\\u0648\\u0644 \\u0627\\u0644\\u0645\\u0637\\u0644\\u0648\\u0628\\u0629.',
    selectSlot: '\\u064A\\u0631\\u062C\\u0649 \\u0627\\u062E\\u062A\\u064A\\u0627\\u0631 \\u0645\\u0648\\u0639\\u062F.',
    close: '\\u0625\\u063A\\u0644\\u0627\\u0642',
    available: '\\u0645\\u062A\\u0627\\u062D',
    taken: '\\u0645\\u062D\\u062C\\u0648\\u0632',
    poweredBy: '\\u0645\\u062F\\u0639\\u0648\\u0645 \\u0645\\u0646 Dento'
  }
};

var t;

function setLang(lang) {
  t = T[lang] || T.en;
}

// ── Style injection ────────────────────────────────────────

function injectStyles(cfg) {
  var pc = cfg.primaryColor;
  var pos = cfg.buttonPosition;
  var isRTL = cfg.language === 'ar';
  var dir = isRTL ? 'rtl' : 'ltr';

  var css = \`
    .dento-w-fab {
      position: fixed;
      bottom: 24px;
      \${pos === 'bottom-left' ? 'left: 24px' : 'right: 24px'};
      z-index: 999998;
      background: \${pc};
      color: #fff;
      border: none;
      border-radius: 50px;
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
      direction: \${dir};
    }
    .dento-w-fab:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(0,0,0,0.3);
    }
    .dento-w-fab svg { width: 20px; height: 20px; }

    .dento-w-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.3s;
      display: none;
    }
    .dento-w-overlay.open { display: block; opacity: 1; }

    .dento-w-panel {
      position: fixed;
      top: 0;
      \${pos === 'bottom-left' ? 'left: 0' : 'right: 0'};
      width: 420px;
      max-width: 100vw;
      height: 100vh;
      background: #fff;
      z-index: 1000000;
      box-shadow: -4px 0 24px rgba(0,0,0,0.15);
      transform: translateX(\${pos === 'bottom-left' ? '-100%' : '100%'});
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      direction: \${dir};
    }
    .dento-w-panel.open {
      transform: translateX(0);
    }

    .dento-w-header {
      background: \${pc};
      color: #fff;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .dento-w-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
    .dento-w-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      opacity: 0.8;
    }
    .dento-w-close:hover { opacity: 1; }

    .dento-w-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
    }

    .dento-w-step { margin-bottom: 20px; }
    .dento-w-step label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    .dento-w-select, .dento-w-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      background: #fff;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
      direction: inherit;
    }
    .dento-w-select:focus, .dento-w-input:focus {
      border-color: \${pc};
    }
    .dento-w-select:disabled, .dento-w-input:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }

    .dento-w-slots {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .dento-w-slot {
      padding: 8px 14px;
      border: 2px solid \${pc};
      border-radius: 8px;
      background: #fff;
      color: \${pc};
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.15s;
    }
    .dento-w-slot:hover { background: \${pc}; color: #fff; }
    .dento-w-slot.selected { background: \${pc}; color: #fff; }
    .dento-w-slot.taken {
      border-color: #d1d5db;
      color: #9ca3af;
      cursor: not-allowed;
      text-decoration: line-through;
    }
    .dento-w-slot.taken:hover { background: #fff; color: #9ca3af; }

    .dento-w-btn {
      width: 100%;
      padding: 14px;
      background: \${pc};
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
      font-family: inherit;
      margin-top: 8px;
    }
    .dento-w-btn:hover { opacity: 0.9; }
    .dento-w-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .dento-w-msg {
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 12px;
      font-size: 14px;
      text-align: center;
    }
    .dento-w-msg.success { background: #d1fae5; color: #065f46; }
    .dento-w-msg.error { background: #fee2e2; color: #991b1b; }

    .dento-w-info { color: #6b7280; font-size: 13px; text-align: center; margin-top: 4px; }

    .dento-w-footer {
      padding: 12px 24px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
    }
    .dento-w-footer a { color: #6b7280; text-decoration: none; }

    .dento-w-spinner {
      display: inline-block;
      width: 16px; height: 16px;
      border: 2px solid #d1d5db;
      border-top-color: \${pc};
      border-radius: 50%;
      animation: dento-spin 0.6s linear infinite;
      margin: 0 auto;
    }
    @keyframes dento-spin { to { transform: rotate(360deg); } }

    @media(max-width: 480px) {
      .dento-w-panel { width: 100vw; }
      .dento-w-fab { padding: 12px 18px; font-size: 14px; bottom: 16px; }
    }
  \`;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// ── State ──────────────────────────────────────────────────

var state = {
  branches: [],
  doctors: [],
  slots: [],
  selectedBranchId: '',
  selectedDoctorId: '',
  selectedDate: '',
  selectedSlot: null,
  isOpen: false
};

// ── DOM helpers ────────────────────────────────────────────

function el(tag, attrs, children) {
  var e = document.createElement(tag);
  if(attrs) Object.keys(attrs).forEach(function(k) {
    if(k === 'className') e.className = attrs[k];
    else if(k.indexOf('on') === 0) e.addEventListener(k.substring(2).toLowerCase(), attrs[k]);
    else if(k === 'disabled') { if(attrs[k]) e.disabled = true; }
    else if(k === 'value') e.value = attrs[k];
    else if(k === 'htmlFor') e.htmlFor = attrs[k];
    else e.setAttribute(k, attrs[k]);
  });
  if(children) {
    if(typeof children === 'string') e.textContent = children;
    else if(Array.isArray(children)) children.forEach(function(c){ if(c) e.appendChild(c); });
    else e.appendChild(children);
  }
  return e;
}

function opt(value, text, disabled) {
  var o = document.createElement('option');
  o.value = value;
  o.textContent = text;
  if(disabled) o.disabled = true;
  return o;
}

// ── API helpers ────────────────────────────────────────────

function apiGet(path) {
  return fetch(API_URL + path, { headers: HEADERS }).then(function(r){ return r.json(); });
}

function apiPost(path, body) {
  return fetch(API_URL + path, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
    .then(function(r){
      return r.json().then(function(data) {
        if(!r.ok) throw new Error(data.message || 'Request failed');
        return data;
      });
    });
}

// ── Widget Logic ───────────────────────────────────────────

var panel, overlay, fab;
var branchSelect, doctorSelect, dateInput, slotsContainer, msgDiv, submitBtn;
var fnameInput, lnameInput, phoneInput, emailInput, reasonInput;

function toggle() {
  state.isOpen = !state.isOpen;
  if(state.isOpen) {
    overlay.classList.add('open');
    panel.classList.add('open');
    if(state.branches.length === 0) loadBranches();
  } else {
    overlay.classList.remove('open');
    panel.classList.remove('open');
  }
}

function loadBranches() {
  branchSelect.innerHTML = '';
  branchSelect.appendChild(opt('', t.loadingBranches, true));
  branchSelect.disabled = true;

  apiGet('/api/bookings/branches').then(function(res){
    state.branches = res.data.branches || [];
    branchSelect.innerHTML = '';
    branchSelect.appendChild(opt('', t.selectBranch));
    state.branches.forEach(function(b){
      branchSelect.appendChild(opt(b._id, b.name + (b.address ? ' — ' + b.address : '')));
    });
    branchSelect.disabled = false;
  }).catch(function(){
    branchSelect.innerHTML = '';
    branchSelect.appendChild(opt('', t.error, true));
  });
}

function onBranchChange() {
  state.selectedBranchId = branchSelect.value;
  state.selectedDoctorId = '';
  state.selectedSlot = null;
  state.slots = [];
  doctorSelect.innerHTML = '';
  doctorSelect.disabled = true;
  dateInput.disabled = true;
  dateInput.value = '';
  slotsContainer.innerHTML = '';
  submitBtn.disabled = true;
  hideMsg();

  if(!state.selectedBranchId) return;

  doctorSelect.appendChild(opt('', t.loadingDoctors, true));

  apiGet('/api/bookings/doctors?branchId=' + state.selectedBranchId).then(function(res){
    state.doctors = res.data.doctors || [];
    doctorSelect.innerHTML = '';
    doctorSelect.appendChild(opt('', t.selectDoctor));
    state.doctors.forEach(function(d){
      doctorSelect.appendChild(opt(d._id, d.name + (d.specialty ? ' (' + d.specialty + ')' : '')));
    });
    doctorSelect.disabled = false;
  }).catch(function(){
    doctorSelect.innerHTML = '';
    doctorSelect.appendChild(opt('', t.error, true));
  });
}

function onDoctorChange() {
  state.selectedDoctorId = doctorSelect.value;
  state.selectedSlot = null;
  state.slots = [];
  slotsContainer.innerHTML = '';
  submitBtn.disabled = true;
  hideMsg();

  if(state.selectedDoctorId) {
    dateInput.disabled = false;
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
    var maxD = new Date();
    maxD.setDate(maxD.getDate() + 60);
    dateInput.max = maxD.toISOString().split('T')[0];
  } else {
    dateInput.disabled = true;
    dateInput.value = '';
  }
}

function onDateChange() {
  state.selectedDate = dateInput.value;
  state.selectedSlot = null;
  submitBtn.disabled = true;
  hideMsg();

  if(!state.selectedBranchId || !state.selectedDoctorId || !state.selectedDate) return;

  slotsContainer.textContent = '';
  slotsContainer.appendChild(el('div', { className: 'dento-w-spinner' }));

  var url = '/api/bookings/slots?branchId=' + state.selectedBranchId +
    '&doctorId=' + state.selectedDoctorId +
    '&date=' + state.selectedDate +
    '&durationMinutes=30';

  apiGet(url).then(function(res){
    state.slots = res.data.slots || [];
    renderSlots();
  }).catch(function(){
    slotsContainer.textContent = '';
    slotsContainer.appendChild(el('p', { className: 'dento-w-info' }, t.error));
  });
}

function renderSlots() {
  slotsContainer.innerHTML = '';
  if(state.slots.length === 0) {
    slotsContainer.textContent = '';
    slotsContainer.appendChild(el('p', { className: 'dento-w-info' }, t.noSlots));
    return;
  }

  var available = 0;
  state.slots.forEach(function(s) {
    var cls = 'dento-w-slot' + (s.isAvailable ? '' : ' taken');
    var btn = el('div', { className: cls }, s.startTime + ' - ' + s.endTime);
    if(s.isAvailable) {
      available++;
      btn.addEventListener('click', function(){
        slotsContainer.querySelectorAll('.selected').forEach(function(el){ el.classList.remove('selected'); });
        btn.classList.add('selected');
        state.selectedSlot = s;
        submitBtn.disabled = false;
      });
    }
    slotsContainer.appendChild(btn);
  });

  if(available === 0) {
    slotsContainer.textContent = '';
    slotsContainer.appendChild(el('p', { className: 'dento-w-info' }, t.allBooked));
  }
}

function hideMsg() {
  if(msgDiv) { msgDiv.style.display = 'none'; msgDiv.className = 'dento-w-msg'; }
}

function showMsg(type, text) {
  msgDiv.style.display = 'block';
  msgDiv.className = 'dento-w-msg ' + type;
  msgDiv.textContent = text;
}

function onSubmit() {
  hideMsg();

  var fname = fnameInput.value.trim();
  var lname = lnameInput.value.trim();
  var phone = phoneInput.value.trim();
  var email = emailInput.value.trim();
  var reason = reasonInput.value.trim();

  if(!fname || !lname || !phone) {
    showMsg('error', t.required);
    return;
  }

  if(!state.selectedSlot) {
    showMsg('error', t.selectSlot);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = t.booking;

  var body = {
    branchId: state.selectedBranchId,
    doctorId: state.selectedDoctorId,
    date: state.selectedDate,
    startTime: state.selectedSlot.startTime,
    endTime: state.selectedSlot.endTime,
    durationMinutes: 30,
    firstName: fname,
    lastName: lname,
    phone: phone,
    reason: reason || undefined,
    preferredLanguage: config.language
  };
  if(email) body.email = email;

  apiPost('/api/bookings', body).then(function(){
    showMsg('success', t.success);
    submitBtn.textContent = t.submit;
    // Reset form after delay
    setTimeout(function(){
      fnameInput.value = '';
      lnameInput.value = '';
      phoneInput.value = '';
      emailInput.value = '';
      reasonInput.value = '';
      state.selectedSlot = null;
      slotsContainer.innerHTML = '';
      submitBtn.disabled = true;
      hideMsg();
    }, 4000);
  }).catch(function(e){
    showMsg('error', e.message || t.error);
    submitBtn.disabled = false;
    submitBtn.textContent = t.submit;
  });
}

// ── Build DOM ──────────────────────────────────────────────

function buildWidget(cfg) {
  setLang(cfg.language);

  // Floating action button — build SVG via DOM API
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  var r = document.createElementNS(svgNS, 'rect');
  r.setAttribute('x','3'); r.setAttribute('y','4'); r.setAttribute('width','18'); r.setAttribute('height','18'); r.setAttribute('rx','2');
  svg.appendChild(r);
  [['16','2','16','6'],['8','2','8','6'],['3','10','21','10']].forEach(function(c){
    var ln = document.createElementNS(svgNS, 'line');
    ln.setAttribute('x1',c[0]); ln.setAttribute('y1',c[1]); ln.setAttribute('x2',c[2]); ln.setAttribute('y2',c[3]);
    svg.appendChild(ln);
  });
  var fabIconSpan = document.createElement('span');
  fabIconSpan.appendChild(svg);
  fab = el('button', { className: 'dento-w-fab', onClick: toggle }, [
    fabIconSpan,
    el('span', null, cfg.buttonText)
  ]);

  // Overlay
  overlay = el('div', { className: 'dento-w-overlay', onClick: toggle });

  // Panel
  branchSelect = el('select', { className: 'dento-w-select', onChange: onBranchChange, disabled: true });
  branchSelect.appendChild(opt('', t.selectBranch));

  doctorSelect = el('select', { className: 'dento-w-select', onChange: onDoctorChange, disabled: true });
  doctorSelect.appendChild(opt('', t.selectDoctor));

  dateInput = el('input', { className: 'dento-w-input', type: 'date', onChange: onDateChange, disabled: true });

  slotsContainer = el('div', { className: 'dento-w-slots' });
  msgDiv = el('div', { className: 'dento-w-msg' });
  msgDiv.style.display = 'none';

  fnameInput = el('input', { className: 'dento-w-input', type: 'text', placeholder: t.firstName });
  lnameInput = el('input', { className: 'dento-w-input', type: 'text', placeholder: t.lastName });
  phoneInput = el('input', { className: 'dento-w-input', type: 'tel', placeholder: t.phone });
  emailInput = el('input', { className: 'dento-w-input', type: 'email', placeholder: t.email });
  reasonInput = el('textarea', { className: 'dento-w-input', placeholder: t.reason, rows: '2' });
  reasonInput.style.minHeight = '48px';
  reasonInput.style.resize = 'vertical';

  submitBtn = el('button', { className: 'dento-w-btn', onClick: onSubmit, disabled: true }, t.submit);

  var body = el('div', { className: 'dento-w-body' }, [
    el('div', { className: 'dento-w-step' }, [el('label', null, t.step1), branchSelect]),
    el('div', { className: 'dento-w-step' }, [el('label', null, t.step2), doctorSelect]),
    el('div', { className: 'dento-w-step' }, [el('label', null, t.step3), dateInput]),
    el('div', { className: 'dento-w-step' }, [el('label', null, t.step4), slotsContainer]),
    el('div', { className: 'dento-w-step' }, [
      el('label', null, t.step5),
      fnameInput,
      el('div', { style: 'height:8px' }),
      lnameInput,
      el('div', { style: 'height:8px' }),
      phoneInput,
      el('div', { style: 'height:8px' }),
      emailInput,
      el('div', { style: 'height:8px' }),
      reasonInput
    ]),
    submitBtn,
    msgDiv
  ]);

  var footer = cfg.showBranding
    ? el('div', { className: 'dento-w-footer' }, [el('a', { href: 'https://dento.app', target: '_blank', rel: 'noopener' }, t.poweredBy)])
    : null;

  panel = el('div', { className: 'dento-w-panel' }, [
    el('div', { className: 'dento-w-header' }, [
      el('h2', null, t.title),
      el('button', { className: 'dento-w-close', onClick: toggle, 'aria-label': t.close }, '\\u00D7')
    ]),
    body,
    footer
  ]);

  document.body.appendChild(fab);
  document.body.appendChild(overlay);
  document.body.appendChild(panel);
}

// ── Initialize ─────────────────────────────────────────────

function init() {
  // Fetch widget config from API
  apiGet('/api/bookings/widget-config').then(function(res) {
    if(res.data) {
      Object.keys(res.data).forEach(function(k){ if(res.data[k] != null) config[k] = res.data[k]; });
    }
    injectStyles(config);
    buildWidget(config);
  }).catch(function() {
    // Use defaults if config fetch fails
    injectStyles(config);
    buildWidget(config);
  });
}

// Wait for DOM ready
if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();`;
}
