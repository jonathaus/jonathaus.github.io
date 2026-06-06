const PASSCODE = "143";
const UNLOCK_DURATION = 1000 * 60 * 60 * 6; // 6 hours

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
let tripDate;

fetch("config.json")
  .then(r => r.json())
  .then(data => {
    tripDate = new Date(data.tripDate).getTime();
    updateCountdown();
  });

function updateCountdown() {
  if (!tripDate) return;

  const now = Date.now();
  const diff = tripDate - now;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);

  document.getElementById("countdown").innerText =
    `${d}d ${h}h ${m}m`;
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

  setTimeout(() => {
    lock.style.display = "none";
    app.style.opacity = "1";
  }, 600);
}

/* ⌨️ ENTER KEY SUPPORT */
document.getElementById("codeInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    checkCode();
  }
});

// 💗 HEART TAP INTERACTION
const effects = document.getElementById("effects");

document.addEventListener("click", (e) => {
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

  effects.appendChild(heart);
  setTimeout(() => heart.remove(), 1200);
}

function createRipple(x, y) {
  const ripple = document.createElement("div");
  ripple.className = "ripple";

  ripple.style.left = x + "px";
  ripple.style.top = y + "px";

  effects.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// ⚙️ PWA SERVICE WORKER
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/trip/sw.js");
}



function lockAppManually() {
  localStorage.removeItem("unlockedTime");

  const lock = document.getElementById("lockScreen");
  const app = document.getElementById("app");
  const input = document.getElementById("codeInput");

  app.classList.remove("appVisible");
  app.style.opacity = "0";

  // 🔥 clear password input
  input.value = "";
  input.blur();

  lock.style.display = "flex";
  lock.style.opacity = "1";
  lock.style.transform = "scale(1)";
  lock.style.filter = "none";
}


let pressTimer = null;
let isHolding = false;

function startHoldLock() {
  isHolding = true;

  pressTimer = setTimeout(() => {
    if (isHolding) {
      lockAppManually();
    }
  }, 1500); // 2s hold
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