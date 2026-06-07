const PASSCODE = "143";
const UNLOCK_DURATION = 1000 * 60 * 60 * 6; // 6 hours

// shared config data
let APP_CONFIG = null;

// detect iOS to reduce particle load and improve performance
const IS_IOS = (typeof navigator !== 'undefined') && (/iP(ad|hone|od)/.test(navigator.userAgent) || (navigator.platform && /iP(ad|hone|od)/.test(navigator.platform)));
const LOVE_BOMB_DEFAULTS = { count: IS_IOS ? 28 : 48, chargeDuration: IS_IOS ? 1100 : 1400 };

// fetch config once and populate UI
fetch("config.json")
  .then(r => r.json())
  .then(data => {
    APP_CONFIG = data;

    const versionEl = document.getElementById("appVersion");
    if (versionEl) versionEl.innerText = "v" + data.version;

    // populate trip date display if present
    const tripText = document.getElementById("tripDateText");
    if (tripText && data.tripDate) {
      const trip = new Date(data.tripDate);
      const formatted = trip.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      tripText.innerText = formatted;
      tripDate = new Date(data.tripDate).getTime();
      updateCountdown();
    }
  }).catch(() => { APP_CONFIG = null; });



// 🔐 auto-unlock if recently used
window.addEventListener("load", () => {
  const last = localStorage.getItem("unlockedTime");

  if (last) {
    const diff = Date.now() - parseInt(last);

    if (diff < UNLOCK_DURATION) {
      unlockApp();

      // 🔥 clear leftover password (important fix)
      const input = document.getElementById("codeInput");
      if (input) input.value = "";
    }
  }
});

// ⏳ countdown
let tripDate = APP_CONFIG && APP_CONFIG.tripDate ? new Date(APP_CONFIG.tripDate).getTime() : null;

function updateCountdown() {
  if (!tripDate) return;

  const now = Date.now();
  const diff = tripDate - now;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);

  const cd = document.getElementById("countdown");
  if (cd) cd.innerText = `${d}d ${h}h ${m}m`;
}

setInterval(updateCountdown, 1000);

/* 🔓 UNLOCK FUNCTION */
function checkCode() {
  const input = document.getElementById("codeInput");

  if (input.value === PASSCODE) {

    // 💾 save unlock time
    localStorage.setItem("unlockedTime", Date.now());

    unlockApp();

  } else {
    // ❌ wrong password
    const error = document.getElementById("error");
    error.style.display = "block";

    input.value = "";
    input.focus();

    const box = document.querySelector(".lockBox");
    box.style.animation = "shake 0.3s";

    setTimeout(() => {
      box.style.animation = "";
      error.style.display = "none";
    }, 800);
  }
}

/* 🔓 unlock animation */
function unlockApp() {
  const lock = document.getElementById("lockScreen");
  const app = document.getElementById("app");

  lock.style.opacity = "0";
  lock.style.transform = "scale(1.05)";
  lock.style.filter = "blur(10px)";

  app.classList.add("appVisible");
  document.body.classList.add("appUnlocked");

  setTimeout(() => {
    // ensure homepage is visible after unlocking and update nav
    try { goPage(0); } catch (e) {}

    lock.style.display = "none";
    app.style.opacity = "1";
  }, 600);
}

/* ⌨️ ENTER KEY SUPPORT */
const codeInputEl = document.getElementById("codeInput");
if (codeInputEl) {
  codeInputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      checkCode();
    }
  });
}

// 💗 HEART TAP INTERACTION
// time of last programmatic lock (to suppress the following click)
let lastHoldTime = 0;

// track the last click target (capture phase) so lockAppManually can ignore clicks
let lastClickInfo = null;
document.addEventListener('click', (e) => {
  lastClickInfo = { time: Date.now(), el: e.target };
}, true); // use capture to record the origin

document.addEventListener("click", (e) => {
  // Don't trigger hearts while lock screen is visible
  const lock = document.getElementById("lockScreen");
  if (lock && getComputedStyle(lock).display !== "none") return;

  // suppress clicks immediately after a hold-lock action
  if (Date.now() - lastHoldTime < 700) return;

  createHeart(e.clientX, e.clientY);
  createRipple(e.clientX, e.clientY);

  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
});

function createHeart(x, y) {
  const heart = document.createElement("div");
  heart.className = "heart";
  heart.innerText = "💗";

  heart.style.left = x + "px";
  heart.style.top = y + "px";

  let effects = document.getElementById("effects");
  if (!effects) {
    effects = document.createElement("div");
    effects.id = "effects";
    const container = document.getElementById("pageContainer") || document.body;
    container.appendChild(effects);
  }

  effects.appendChild(heart);
  setTimeout(() => heart.remove(), 1200);
}

function createRipple(x, y) {
  const ripple = document.createElement("div");
  ripple.className = "ripple";

  ripple.style.left = x + "px";
  ripple.style.top = y + "px";

  let effects = document.getElementById("effects");
  if (!effects) {
    effects = document.createElement("div");
    effects.id = "effects";
    const container = document.getElementById("pageContainer") || document.body;
    container.appendChild(effects);
  }

  effects.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// 💥 Heart explosion animation
function heartExplosion(count = LOVE_BOMB_DEFAULTS.count, chargeDuration = LOVE_BOMB_DEFAULTS.chargeDuration) {
  const cx = Math.round(window.innerWidth / 2);
  const cy = Math.round(window.innerHeight / 2);

  let effects = document.getElementById('effects');
  if (!effects) {
    effects = document.createElement('div');
    effects.id = 'effects';
    const container = document.getElementById('pageContainer') || document.body;
    container.appendChild(effects);
  }

  // central big heart immediately visible (slightly transparent)
  const center = document.createElement('div');
  center.className = 'explosionCharge';
  center.innerText = '💗';
  center.style.left = cx + 'px';
  center.style.top = cy + 'px';
  center.style.opacity = '0.85';
  effects.appendChild(center);

  // spawn many small hearts that fade in and fly toward center
  // on iOS we lower the particle multiplier to keep animations smooth
  const chargeParticles = IS_IOS
    ? Math.min(90, Math.max(40, Math.floor(count * 1.0)))
    : Math.min(160, Math.max(60, Math.floor(count * 1.5)));
  // throttle if effects area already busy (avoid huge spikes)
  const effectsBusy = effects.querySelectorAll('.explosionHeart, .chargeHeart').length > (IS_IOS ? 140 : 420);
  if (effectsBusy) return;
  const particles = [];

  for (let i = 0; i < chargeParticles; i++) {
    // distribute spawn points mostly off-center: edges and random
    const edgeChoice = Math.random();
    let x, y;
    if (edgeChoice < 0.25) { x = Math.random() * window.innerWidth; y = -10; }
    else if (edgeChoice < 0.5) { x = Math.random() * window.innerWidth; y = window.innerHeight + 10; }
    else if (edgeChoice < 0.75) { x = -10; y = Math.random() * window.innerHeight; }
    else { x = window.innerWidth + 10; y = Math.random() * window.innerHeight; }

    const p = document.createElement('div');
    p.className = 'chargeHeart';
    p.innerText = '💗';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.opacity = '0';
    effects.appendChild(p);
    particles.push(p);

    // compute vector to center
    const dx = cx - x;
    const dy = cy - y;
    const delay = Math.random() * (chargeDuration * 0.5);

    // animate: fade-in quickly then move into center over remaining time
    p.animate([
      { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(0.9)', opacity: 1, offset: 0.18 },
      { transform: `translate(${dx}px, ${dy}px) translate(-50%, -50%) scale(1)`, opacity: 1 }
    ], { duration: Math.max(300, chargeDuration - delay), delay: Math.max(0, delay), easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' });
  }

  // subtle pulse on center during last 40% of the charge
  center.animate([
    { transform: 'translate(-50%, -50%) scale(0.9)', opacity: 0.7 },
    { transform: 'translate(-50%, -50%) scale(1.25)', opacity: 1 }
  ], { duration: Math.max(300, Math.round(chargeDuration * 0.45)), easing: 'ease-out', fill: 'forwards', delay: Math.max(0, chargeDuration - Math.round(chargeDuration * 0.45)) });

  // after chargeDuration, remove charge particles and trigger explosion
  setTimeout(() => {
    particles.forEach(p => p.remove());
    center.remove();

    // explosion
    // reduce explosion particle count on iOS to limit CPU/GPU cost
    const explodeCount = IS_IOS ? Math.min(count, 28) : count;
    for (let i = 0; i < explodeCount; i++) {
      const h = document.createElement('div');
      h.className = 'explosionHeart';
      h.innerText = '💗';
      h.style.left = cx + 'px';
      h.style.top = cy + 'px';
      h.style.opacity = '1';

      effects.appendChild(h);

      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 240;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const rotate = (Math.random() * 360 - 180) + 'deg';
      const dur = 600 + Math.random() * 900;

      h.animate([
        { transform: 'translate(-50%, -50%) scale(0.6) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${1 + Math.random()}) rotate(${rotate})`, opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' });

      setTimeout(() => h.remove(), dur + 50 + i * 4);
    }

    if (navigator.vibrate) navigator.vibrate(100);
  }, chargeDuration);
}

// ⚙️ PWA SERVICE WORKER
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/trip/sw.js");
}

// Listen for reload requests from the service worker (helps iOS update behavior)
if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
  navigator.serviceWorker.addEventListener('message', (ev) => {
    try {
      if (ev && ev.data && ev.data.type === 'SW_UPDATE_RELOAD') {
        // small delay to let activation finish
        setTimeout(() => {
          if (document.visibilityState === 'visible') window.location.reload();
        }, 250);
      }
    } catch (e) {}
  });
}



function lockAppManually() {
  // don't lock while debug panel is open
  const debugPanel = document.getElementById("debugPanel");
  if (debugPanel && debugPanel.classList.contains("visible")) return;

  // ignore if the most recent click originated inside bottom nav, version, or debug panel
  if (lastClickInfo && (Date.now() - lastClickInfo.time) < 300) {
    const el = lastClickInfo.el;
    if (el && (el.id === 'appVersion' || el.closest && (el.closest('.bottomNav') || el.closest('#debugPanel')))) {
      return;
    }
  }

  // suppress accidental locks right after a version click or hold
  if (Date.now() - lastHoldTime < 700) return;

  localStorage.removeItem("unlockedTime");

  const lock = document.getElementById("lockScreen");
  const app = document.getElementById("app");
  const input = document.getElementById("codeInput");

  // switch to homepage and hide app UI (update nav too)
  try { goPage(0); } catch (e) {}

  app.classList.remove("appVisible");
  document.body.classList.remove("appUnlocked");
  app.style.opacity = "0";

  // 🔥 clear password input
  input.value = "";
  input.blur();

  lock.style.display = "flex";
  lock.style.opacity = "1";
  lock.style.transform = "scale(1)";
  lock.style.filter = "none";

  // record hold time so the immediate click doesn't create a heart
  lastHoldTime = Date.now();
}


let pressTimer = null;
let isHolding = false;

function startHoldLock() {
  isHolding = true;

  pressTimer = setTimeout(() => {
    if (isHolding) {
      lockAppManually();
    }
  }, 2000); // 2s hold
}

function cancelHoldLock() {
  isHolding = false;
  clearTimeout(pressTimer);
}

// iOS + mobile + desktop support
document.addEventListener("touchstart", startHoldLock);
document.addEventListener("touchend", cancelHoldLock);
document.addEventListener("touchcancel", cancelHoldLock);

// fallback for mouse (testing on PC)
document.addEventListener("mousedown", startHoldLock);
document.addEventListener("mouseup", cancelHoldLock);

let pages = ["homePage", "memoriesPage", "todoPage", "notesPage"];
let currentPage = 0;

/* 📱 SWITCH PAGE */
function showPage(index) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });

  document.getElementById(pages[index]).classList.add("active");
  currentPage = index;
}

function goPage(index) {
  showPage(index);

  // update active button highlight
  document.querySelectorAll(".navBtn").forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });
}

/* 👆 SWIPE DETECTION */
let startX = 0;

document.addEventListener("touchstart", (e) => {

  // 🚫 BLOCK SWIPE IF LOCK SCREEN IS STILL VISIBLE
  const lock = document.getElementById("lockScreen");
  if (lock && getComputedStyle(lock).display !== "none") return;

  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", (e) => {

  // 🚫 BLOCK SWIPE IF LOCK SCREEN IS STILL VISIBLE
  const lock = document.getElementById("lockScreen");
  if (lock && getComputedStyle(lock).display !== "none") return;

  let endX = e.changedTouches[0].clientX;
  let diff = startX - endX;

  if (Math.abs(diff) < 60) return;

  if (diff > 0) {
    goPage(Math.min(currentPage + 1, pages.length - 1));
  } else {
    goPage(Math.max(currentPage - 1, 0));
  }
});



// Setup debug panel toggles (uses APP_CONFIG if available)
{
  const versionEl = document.getElementById("appVersion");
  const debugPanel = document.getElementById("debugPanel");
  const debugInfo = document.getElementById("debugInfo");

  if (versionEl) {
    // ensure it's clickable
    versionEl.style.pointerEvents = "auto";
    const versionText = APP_CONFIG ? "v" + APP_CONFIG.version : "v?";
    versionEl.innerText = versionText;

    if (debugPanel && debugInfo) {
      versionEl.addEventListener("click", (e) => {
        // fully swallow the click so it can't trigger other handlers
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        e.preventDefault();

        // toggle panel visibility
        if (debugPanel.classList.contains('visible')) {
          debugPanel.classList.remove('visible');
          return;
        }

        const versionTextNow = APP_CONFIG ? "v" + APP_CONFIG.version : (versionEl.innerText || 'v?');
        debugInfo.innerText = `Version: ${versionTextNow}\nTrip: ${APP_CONFIG ? APP_CONFIG.tripDate : 'unknown'}`;

        // mark time so we can suppress accidental locks/click-throughs
        lastHoldTime = Date.now();

        debugPanel.classList.add("visible");
      });

      // click anywhere closes
      document.addEventListener("click", () => {
        debugPanel.classList.remove("visible");
      });

      // stop clicks inside panel from closing
      debugPanel.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // wire debug action buttons
      const btnShow = document.getElementById('dbgShowState');
      const btnClear = document.getElementById('dbgClearUnlock');
      const btnExplode = document.getElementById('dbgExplode');
      const btnClose = document.getElementById('dbgClose');

      if (btnShow) btnShow.addEventListener('click', () => {
        const unlocked = !!localStorage.getItem('unlockedTime');
        const ver = APP_CONFIG ? 'v' + APP_CONFIG.version : (versionEl.innerText || 'v?');
        debugInfo.innerText = `Version: ${ver}\nTrip: ${APP_CONFIG ? APP_CONFIG.tripDate : 'unknown'}\nUnlocked: ${unlocked}`;
      });

      if (btnClear) btnClear.addEventListener('click', () => {
        localStorage.removeItem('unlockedTime');
        debugInfo.innerText = 'Cleared unlockedTime from localStorage';
      });

      if (btnExplode) btnExplode.addEventListener('click', (e) => {
        e.stopPropagation();
        const chargeMs = 900;
        try { btnExplode.disabled = true; } catch (e) {}
        heartExplosion(56, chargeMs);
        // re-enable after charge + explosion max duration
        setTimeout(() => { try { btnExplode.disabled = false; } catch (e) {} }, chargeMs + 1800);
      });

      if (btnClose) btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        debugPanel.classList.remove('visible');
      });
    }
  }
}