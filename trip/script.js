const PASSCODE = "143";

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
  const lock = document.getElementById("lockScreen");
  const app = document.getElementById("app");

  if (input.value === PASSCODE) {

    lock.style.opacity = "0";
    lock.style.transform = "scale(1.05)";
    lock.style.filter = "blur(10px)";

    app.classList.add("appVisible");

    setTimeout(() => {
      lock.style.display = "none";
      app.style.opacity = "1";
    }, 600);

  } else {
    // ❌ wrong password
    const error = document.getElementById("error");
    error.style.display = "block";

    input.value = "";          // 💥 clear input
    input.focus();             // bring cursor back

    const box = document.querySelector(".lockBox");
    box.style.animation = "shake 0.3s";

    setTimeout(() => {
      box.style.animation = "";
      error.style.display = "none";
    }, 800);
  }
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

  // 📳 vibration (mobile only)
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

  // slight random drift
  heart.style.transform += ` translateX(${(Math.random() - 0.5) * 20}px)`;

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