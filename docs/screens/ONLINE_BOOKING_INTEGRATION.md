# Online Booking — WordPress Integration Guide

> **Audience:** Clinic owners / website administrators (non-technical)
> **Last Updated:** 2026-02-28
> **Difficulty:** Easy — copy & paste, no coding experience required

---

## What Is This?

Dento has a built-in **Online Booking System** that lets your patients book appointments directly from your website. When a patient books, you see it in your Admin Panel and can confirm, modify, or reject it.

**How it works in simple terms:**

1. Patient visits your website
2. Patient picks a branch, doctor, date, and time slot
3. Patient fills in their name and phone number
4. Patient clicks "Book"
5. You get a notification in the Admin Panel
6. You confirm or reject the booking

---

## What You Need Before Starting

| #   | Item                                                 | Where to Get It                                                                                                                                                                              |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Your **Tenant Slug**                                 | This is the short name for your clinic. It was set when your clinic was created in Dento. Example: `al-nour-dental` or `dr-smith-clinic`. Ask your Dento administrator if you don't know it. |
| 2   | The **API URL**                                      | This is the web address of your Dento server. Example: `https://api.dento.app`. Ask your Dento administrator.                                                                                |
| 3   | Access to your **WordPress website**                 | You need to be able to edit pages on your WordPress site.                                                                                                                                    |
| 4   | A **published page** where you want the booking form | This can be an existing page (like "Book Now") or a new page you create.                                                                                                                     |

---

## Step-by-Step Guide

### Step 1: Create a "Book Now" Page (or use an existing one)

1. Log in to your WordPress admin panel (usually `yoursite.com/wp-admin`)
2. Go to **Pages → Add New** (or edit an existing page)
3. Give it a title like **"Book an Appointment"**
4. You'll add the booking widget in the next steps

### Step 2: Add the Booking Widget Code

1. In the WordPress page editor, click the **+** button to add a new block
2. Search for **"Custom HTML"** and select it
3. A text box will appear — this is where you paste the code below
4. **Before pasting**, replace these two values in the code:
   - `YOUR_API_URL` → replace with your Dento API address (e.g., `https://api.dento.app`)
   - `YOUR_TENANT_SLUG` → replace with your clinic's slug (e.g., `al-nour-dental`)

**Copy this entire code block and paste it into the Custom HTML block:**

```html
<!-- ═══════════════════════════════════════════════════════ -->
<!-- Dento Online Booking Widget                            -->
<!-- Replace YOUR_API_URL and YOUR_TENANT_SLUG below        -->
<!-- ═══════════════════════════════════════════════════════ -->

<style>
  .dento-widget {
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
  }
  .dento-widget h3 {
    margin-top: 24px;
    color: #1a1a2e;
  }
  .dento-widget select,
  .dento-widget input {
    width: 100%;
    padding: 10px;
    margin: 6px 0 16px 0;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 15px;
  }
  .dento-widget select:disabled {
    background: #f0f0f0;
  }
  .dento-slots {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 12px 0;
  }
  .dento-slot {
    padding: 10px 16px;
    border: 2px solid #16a085;
    border-radius: 8px;
    background: white;
    color: #16a085;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
  }
  .dento-slot:hover {
    background: #16a085;
    color: white;
  }
  .dento-slot.selected {
    background: #16a085;
    color: white;
  }
  .dento-slot.taken {
    border-color: #ccc;
    color: #ccc;
    cursor: not-allowed;
    text-decoration: line-through;
  }
  .dento-btn {
    background: #16a085;
    color: white;
    border: none;
    padding: 14px 32px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    margin-top: 12px;
    width: 100%;
  }
  .dento-btn:hover {
    background: #138a72;
  }
  .dento-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  .dento-msg {
    padding: 16px;
    border-radius: 8px;
    margin: 16px 0;
    text-align: center;
  }
  .dento-msg.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  .dento-msg.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  .dento-loading {
    text-align: center;
    padding: 20px;
    color: #888;
  }
</style>

<div class="dento-widget" id="dento-booking">
  <!-- Step 1: Select Branch -->
  <h3>📍 Step 1: Choose a Branch</h3>
  <select id="dento-branch" onchange="dentoLoadDoctors()">
    <option value="">-- Loading branches... --</option>
  </select>

  <!-- Step 2: Select Doctor -->
  <h3>👨‍⚕️ Step 2: Choose a Doctor</h3>
  <select id="dento-doctor" disabled onchange="dentoEnableDate()">
    <option value="">-- Select a branch first --</option>
  </select>

  <!-- Step 3: Select Date -->
  <h3>📅 Step 3: Choose a Date</h3>
  <input type="date" id="dento-date" disabled onchange="dentoLoadSlots()" />

  <!-- Step 4: Select Time Slot -->
  <h3>🕐 Step 4: Choose a Time</h3>
  <div class="dento-slots" id="dento-slots">
    <p style="color: #888;">Select a date to see available times</p>
  </div>

  <!-- Step 5: Patient Info -->
  <h3>📝 Step 5: Your Information</h3>
  <input type="text" id="dento-fname" placeholder="First Name *" />
  <input type="text" id="dento-lname" placeholder="Last Name *" />
  <input type="tel" id="dento-phone" placeholder="Phone Number * (e.g., +201012345678)" />
  <input type="email" id="dento-email" placeholder="Email (optional)" />
  <textarea
    id="dento-reason"
    placeholder="Reason for visit (optional)"
    style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-size:15px;min-height:60px;"
  ></textarea>

  <!-- Submit Button -->
  <button class="dento-btn" id="dento-submit" onclick="dentoSubmitBooking()" disabled>
    Book Appointment
  </button>

  <!-- Status Message Area -->
  <div id="dento-message" style="display:none;"></div>
</div>

<script>
  // ══════════════════════════════════════════════════════════
  // ⚠️  CHANGE THESE TWO VALUES TO MATCH YOUR CLINIC
  // ══════════════════════════════════════════════════════════
  const DENTO_API = 'YOUR_API_URL'; // e.g., https://api.dento.app
  const DENTO_SLUG = 'YOUR_TENANT_SLUG'; // e.g., al-nour-dental
  // ══════════════════════════════════════════════════════════

  const DENTO_HEADERS = { 'X-Tenant-Slug': DENTO_SLUG, 'Content-Type': 'application/json' };
  let selectedSlot = null;

  // ── Load Branches on Page Load ────────────────────────────
  async function dentoLoadBranches() {
    try {
      const res = await fetch(DENTO_API + '/api/bookings/branches', { headers: DENTO_HEADERS });
      const data = await res.json();
      const sel = document.getElementById('dento-branch');
      sel.innerHTML = '<option value="">-- Select a branch --</option>';
      (data.data.branches || []).forEach((b) => {
        sel.innerHTML +=
          '<option value="' +
          b._id +
          '">' +
          b.name +
          (b.address ? ' — ' + b.address : '') +
          '</option>';
      });
    } catch (e) {
      document.getElementById('dento-branch').innerHTML =
        '<option value="">Error loading branches</option>';
    }
  }

  // ── Load Doctors When Branch Selected ─────────────────────
  async function dentoLoadDoctors() {
    const branchId = document.getElementById('dento-branch').value;
    const sel = document.getElementById('dento-doctor');
    sel.disabled = true;
    selectedSlot = null;
    document.getElementById('dento-slots').innerHTML =
      '<p style="color: #888;">Select a date to see available times</p>';
    document.getElementById('dento-submit').disabled = true;

    if (!branchId) {
      sel.innerHTML = '<option value="">-- Select a branch first --</option>';
      return;
    }

    sel.innerHTML = '<option value="">Loading doctors...</option>';
    try {
      const res = await fetch(DENTO_API + '/api/bookings/doctors?branchId=' + branchId, {
        headers: DENTO_HEADERS,
      });
      const data = await res.json();
      sel.innerHTML = '<option value="">-- Select a doctor --</option>';
      (data.data.doctors || []).forEach((d) => {
        sel.innerHTML +=
          '<option value="' +
          d._id +
          '">' +
          d.name +
          (d.specialty ? ' (' + d.specialty + ')' : '') +
          '</option>';
      });
      sel.disabled = false;
    } catch (e) {
      sel.innerHTML = '<option value="">Error loading doctors</option>';
    }
  }

  // ── Enable Date Picker When Doctor Selected ───────────────
  function dentoEnableDate() {
    const dateInput = document.getElementById('dento-date');
    if (document.getElementById('dento-doctor').value) {
      dateInput.disabled = false;
      // Set min date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.min = tomorrow.toISOString().split('T')[0];
      // Set max date to 60 days from now
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 60);
      dateInput.max = maxDate.toISOString().split('T')[0];
    } else {
      dateInput.disabled = true;
    }
    selectedSlot = null;
    document.getElementById('dento-slots').innerHTML =
      '<p style="color: #888;">Select a date to see available times</p>';
    document.getElementById('dento-submit').disabled = true;
  }

  // ── Load Available Slots When Date Selected ───────────────
  async function dentoLoadSlots() {
    const branchId = document.getElementById('dento-branch').value;
    const doctorId = document.getElementById('dento-doctor').value;
    const date = document.getElementById('dento-date').value;
    const slotsDiv = document.getElementById('dento-slots');
    selectedSlot = null;
    document.getElementById('dento-submit').disabled = true;

    if (!branchId || !doctorId || !date) return;

    slotsDiv.innerHTML = '<p class="dento-loading">Loading available times...</p>';

    try {
      const url =
        DENTO_API +
        '/api/bookings/slots?branchId=' +
        branchId +
        '&doctorId=' +
        doctorId +
        '&date=' +
        date +
        '&durationMinutes=30';
      const res = await fetch(url, { headers: DENTO_HEADERS });
      const data = await res.json();
      const slots = data.data.slots || [];

      if (slots.length === 0) {
        slotsDiv.innerHTML =
          '<p style="color: #e74c3c;">No available times on this date. Please try another date.</p>';
        return;
      }

      slotsDiv.innerHTML = '';
      slots.forEach((s) => {
        const btn = document.createElement('div');
        btn.className = 'dento-slot' + (s.isAvailable ? '' : ' taken');
        btn.textContent = s.startTime + ' - ' + s.endTime;
        if (s.isAvailable) {
          btn.onclick = function () {
            document
              .querySelectorAll('.dento-slot.selected')
              .forEach((el) => el.classList.remove('selected'));
            btn.classList.add('selected');
            selectedSlot = s;
            document.getElementById('dento-submit').disabled = false;
          };
        }
        slotsDiv.appendChild(btn);
      });

      const available = slots.filter((s) => s.isAvailable).length;
      if (available === 0) {
        slotsDiv.innerHTML =
          '<p style="color: #e74c3c;">All times are booked on this date. Please try another date.</p>';
      }
    } catch (e) {
      slotsDiv.innerHTML = '<p style="color: #e74c3c;">Error loading times. Please try again.</p>';
    }
  }

  // ── Submit the Booking ────────────────────────────────────
  async function dentoSubmitBooking() {
    const msgDiv = document.getElementById('dento-message');
    const btn = document.getElementById('dento-submit');
    const fname = document.getElementById('dento-fname').value.trim();
    const lname = document.getElementById('dento-lname').value.trim();
    const phone = document.getElementById('dento-phone').value.trim();
    const email = document.getElementById('dento-email').value.trim();
    const reason = document.getElementById('dento-reason').value.trim();

    // Simple validation
    if (!fname || !lname || !phone) {
      msgDiv.style.display = 'block';
      msgDiv.className = 'dento-msg error';
      msgDiv.textContent = '⚠️ Please fill in your First Name, Last Name, and Phone Number.';
      return;
    }

    if (!selectedSlot) {
      msgDiv.style.display = 'block';
      msgDiv.className = 'dento-msg error';
      msgDiv.textContent = '⚠️ Please select a time slot.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Booking...';

    try {
      const body = {
        branchId: document.getElementById('dento-branch').value,
        doctorId: document.getElementById('dento-doctor').value,
        date: document.getElementById('dento-date').value,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        durationMinutes: 30,
        firstName: fname,
        lastName: lname,
        phone: phone,
        reason: reason || undefined,
        preferredLanguage: 'en',
      };
      if (email) body.email = email;

      const res = await fetch(DENTO_API + '/api/bookings', {
        method: 'POST',
        headers: DENTO_HEADERS,
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        msgDiv.style.display = 'block';
        msgDiv.className = 'dento-msg success';
        msgDiv.innerHTML =
          '✅ <strong>Booking submitted successfully!</strong><br>Your appointment request is pending confirmation. We will contact you shortly.';
        btn.textContent = 'Booking Sent ✓';
        // Reset form after 5 seconds
        setTimeout(() => {
          document.getElementById('dento-fname').value = '';
          document.getElementById('dento-lname').value = '';
          document.getElementById('dento-phone').value = '';
          document.getElementById('dento-email').value = '';
          document.getElementById('dento-reason').value = '';
          selectedSlot = null;
          document.getElementById('dento-slots').innerHTML =
            '<p style="color: #888;">Select a date to see available times</p>';
          btn.textContent = 'Book Appointment';
          btn.disabled = true;
          msgDiv.style.display = 'none';
        }, 5000);
      } else {
        throw new Error(data.message || 'Booking failed');
      }
    } catch (e) {
      msgDiv.style.display = 'block';
      msgDiv.className = 'dento-msg error';
      msgDiv.textContent = '❌ ' + (e.message || 'Something went wrong. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Book Appointment';
    }
  }

  // ── Initialize on page load ───────────────────────────────
  dentoLoadBranches();
</script>
```

### Step 3: Update the Two Settings

Look at the top of the JavaScript code you just pasted. You'll see these two lines:

```javascript
const DENTO_API = 'YOUR_API_URL';
const DENTO_SLUG = 'YOUR_TENANT_SLUG';
```

Change them to your actual values. For example:

```javascript
const DENTO_API = 'https://api.dento.app';
const DENTO_SLUG = 'al-nour-dental';
```

> **Important:** Keep the quote marks (`'...'`) around the values!

### Step 4: Publish the Page

1. Click **"Publish"** (or **"Update"** if editing an existing page)
2. Visit the page on your website
3. You should see the booking form with 5 steps

### Step 5: Test It

1. Open the page on your website
2. Select a branch from the dropdown
3. Select a doctor
4. Pick a date (tomorrow or later)
5. You should see green time slots appear
6. Click a time slot (it turns green/selected)
7. Fill in a test name and phone number
8. Click **"Book Appointment"**
9. You should see a green success message

### Step 6: Check in Your Admin Panel

1. Log in to your Dento Admin Panel
2. Go to **Online Bookings** in the sidebar
3. You should see the test booking with status **"Pending"**
4. Click **Confirm** to approve it, or **Reject** to decline

---

## How the Booking Flow Works (for patients)

Here's what your patients see step by step:

```
┌─────────────────────────────────────────────────┐
│  📍 Step 1: Choose a Branch                     │
│  ┌─────────────────────────────────┐            │
│  │ ▼ Al Nour Dental — Maadi        │            │
│  └─────────────────────────────────┘            │
│                                                  │
│  👨‍⚕️ Step 2: Choose a Doctor                     │
│  ┌─────────────────────────────────┐            │
│  │ ▼ Dr. Ahmed Hassan (Orthodontics)│            │
│  └─────────────────────────────────┘            │
│                                                  │
│  📅 Step 3: Choose a Date                       │
│  ┌─────────────────────────────────┐            │
│  │ 📅 2026-03-05                    │            │
│  └─────────────────────────────────┘            │
│                                                  │
│  🕐 Step 4: Choose a Time                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │09:00 │ │09:30 │ │10:00 │ │10:30 │          │
│  │      │ │TAKEN │ │ ✓    │ │      │          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                  │
│  📝 Step 5: Your Information                    │
│  ┌─────────────────────────────────┐            │
│  │ First Name: Ahmed               │            │
│  │ Last Name:  Mohamed             │            │
│  │ Phone:      +201012345678       │            │
│  │ Email:      (optional)          │            │
│  │ Reason:     Teeth cleaning      │            │
│  └─────────────────────────────────┘            │
│                                                  │
│  ┌─────────────────────────────────┐            │
│  │      📅 Book Appointment         │            │
│  └─────────────────────────────────┘            │
│                                                  │
│  ✅ Booking submitted successfully!              │
│  Your appointment is pending confirmation.       │
└─────────────────────────────────────────────────┘
```

---

## Frequently Asked Questions

### "I pasted the code but I see 'Error loading branches'"

- **Check your API URL** — make sure it's the correct address with `https://`
- **Check your Tenant Slug** — it must match exactly (lowercase, with dashes)
- **Check if your Dento server is running**

### "The slots page shows 'No available times'"

- The doctor may not have any schedule set for that date
- The branch may be closed on that day (holiday, weekend)
- All slots may already be booked
- **Solution:** Try a different date, or check the doctor's schedule in the Admin Panel

### "Can patients pick any service?"

Currently, the widget books a general 30-minute appointment. The service can be discussed when the clinic confirms the booking.

### "What happens after a patient books?"

1. The booking appears in your Admin Panel under **Online Bookings**
2. The status is **Pending**
3. Your receptionist reviews it and clicks one of:
   - **Confirm** → appointment is created
   - **Modify + Confirm** → change the time/doctor, then confirm
   - **Reject** → booking is rejected (with a reason)

### "Can I customize the colors or design?"

Yes! The styling is at the top of the code in the `<style>` section. You can change:

- `#16a085` → the main green color (used for buttons and slots)
- `max-width: 600px` → the width of the form
- Font sizes, spacing, etc.

Or ask your website developer to match it to your site's theme.

### "Can patients cancel their booking?"

Not from the website currently. They would need to call your clinic. A future update may add a cancellation link.

### "Is this secure?"

- Patient data is sent directly to your Dento server over HTTPS (encrypted)
- No patient data is stored on your WordPress site
- The booking API only allows creating appointments — it cannot access your clinic data

---

## Quick Reference: What Each Setting Does

| Setting      | What It Is                      | Example                 |
| ------------ | ------------------------------- | ----------------------- |
| `DENTO_API`  | Your Dento server's web address | `https://api.dento.app` |
| `DENTO_SLUG` | Your clinic's unique short name | `al-nour-dental`        |

---

## Need Help?

Contact your Dento administrator or support team if:

- You don't know your Tenant Slug
- You don't know the API URL
- The widget is not working after following all steps
- You need the widget in Arabic instead of English
