const PALETTE = ["#ff6b54", "#ffc24b", "#3fcfb4", "#7c9cff", "#ff8fb1"];

function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % PALETTE.length;
  return PALETTE[h];
}

function initials(name) {
  return name.slice(0, 2).toUpperCase();
}

function avatarEl(friend, size) {
  if (friend.photo) {
    const img = document.createElement("img");
    img.src = friend.photo;
    img.alt = friend.name;
    if (size) { img.style.width = size + "px"; img.style.height = size + "px"; }
    return img;
  }
  const div = document.createElement("div");
  div.className = "avatar-fallback";
  if (size) { div.style.width = size + "px"; div.style.height = size + "px"; }
  div.style.background = colorFor(friend.name);
  div.textContent = initials(friend.name);
  return div;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(f) {
  if (!f.birthMonth || !f.birthDay) return "Date TBD";
  return `${MONTHS[f.birthMonth - 1]} ${f.birthDay}`;
}

function daysUntilBirthday(f, today) {
  if (!f.birthMonth || !f.birthDay) return null;
  const y = today.getFullYear();
  let next = new Date(y, f.birthMonth - 1, f.birthDay);
  next.setHours(0,0,0,0);
  const t = new Date(today); t.setHours(0,0,0,0);
  if (next < t) next = new Date(y + 1, f.birthMonth - 1, f.birthDay);
  return Math.round((next - t) / 86400000);
}

function isBirthdayToday(f, today) {
  return f.birthMonth === today.getMonth() + 1 && f.birthDay === today.getDate();
}

// ---------- Boys view ----------
function renderBoys() {
  const list = document.getElementById("boys-list");
  list.innerHTML = "";
  FRIENDS.forEach(f => {
    const row = document.createElement("div");
    row.className = "boy-row";
    row.onclick = () => goToGallery(f.id);

    const av = avatarEl(f, 56);
    av.classList.add("avatar");

    const name = document.createElement("div");
    name.className = "boy-name";
    name.textContent = f.name;

    const date = document.createElement("div");
    date.className = "boy-date" + (f.birthMonth ? "" : " tbd");
    date.textContent = formatDate(f);

    row.append(av, name, date);
    list.appendChild(row);
  });
}

// ---------- Birthdays orbit view ----------
function renderBirthdays() {
  const today = new Date();
  const withDates = FRIENDS.filter(f => f.birthMonth && f.birthDay);
  const withoutDates = FRIENDS.filter(f => !f.birthMonth || !f.birthDay);

  const sorted = [...withDates].sort((a, b) => daysUntilBirthday(a, today) - daysUntilBirthday(b, today));

  // Orbit bubbles
  const ring = document.getElementById("orbit-ring");
  ring.innerHTML = "";
  const n = sorted.length;
  const soonest = sorted[0];
  sorted.forEach((f, i) => {
    const angle = (360 / n) * i;
    const bubble = document.createElement("div");
    bubble.className = "orbit-bubble" + (f === soonest ? " orbit-bubble--next" : "");
    bubble.style.transform = `rotate(${angle}deg) translate(180px) rotate(-${angle}deg)`;
    bubble.onclick = (e) => { e.stopPropagation(); goToGallery(f.id); };

    // counter-rotate so photo stays upright as the ring spins
    const spinWrap = document.createElement("div");
    spinWrap.className = "orbit-spin";
    spinWrap.style.animation = "counterspin 40s linear infinite";

    const av = avatarEl(f, 64);
    av.style.borderColor = colorFor(f.name);
    spinWrap.appendChild(av);

    const label = document.createElement("span");
    label.className = "orbit-label";
    label.textContent = `${f.name} · ${formatDate(f)}`;
    spinWrap.appendChild(label);

    bubble.appendChild(spinWrap);
    ring.appendChild(bubble);
  });

  // inject counter-spin keyframes once
  if (!document.getElementById("counterspin-style")) {
    const style = document.createElement("style");
    style.id = "counterspin-style";
    style.textContent = `@keyframes counterspin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }`;
    document.head.appendChild(style);
  }

  // Center: next birthday or today banner
  const counter = document.getElementById("orbit-counter");
  counter.innerHTML = "";
  const todaysPerson = sorted.find(f => isBirthdayToday(f, today));

  if (todaysPerson) {
    const card = document.createElement("div");
    card.className = "next-card";
    card.innerHTML = `<div class="label">🎉 today!</div><div class="who">${todaysPerson.name}</div>`;
    counter.appendChild(card);
  } else if (sorted.length) {
    const next = sorted[0];
    const days = daysUntilBirthday(next, today);
    const card = document.createElement("div");
    card.className = "next-card";
    card.innerHTML = `
      <div class="label">next up</div>
      <div class="days">${days}</div>
      <div class="days-label">day${days === 1 ? "" : "s"} to go</div>
      <div class="who">${next.name}</div>
    `;
    counter.appendChild(card);
  }

  // Today banner (clickable, in case anyone's birthday is today)
  const bannerHost = document.getElementById("today-banner-host");
  bannerHost.innerHTML = "";
  if (todaysPerson) {
    const banner = document.createElement("div");
    banner.className = "today-banner";
    banner.textContent = `It's ${todaysPerson.name}'s birthday! Tap for the goofy photo dump →`;
    banner.onclick = () => goToGallery(todaysPerson.id);
    bannerHost.appendChild(banner);
  }

  // TBD tray
  const tray = document.getElementById("tbd-tray");
  tray.innerHTML = "";
  if (withoutDates.length) {
    const heading = document.createElement("h3");
    heading.textContent = "Waiting on birthdates";
    tray.appendChild(heading);
    const row = document.createElement("div");
    row.className = "tbd-row";
    withoutDates.forEach(f => {
      const item = document.createElement("div");
      item.className = "tbd-item";
      item.onclick = () => goToGallery(f.id);
      item.appendChild(avatarEl(f, 52));
      const span = document.createElement("span");
      span.textContent = f.name;
      item.appendChild(span);
      row.appendChild(item);
    });
    tray.appendChild(row);
  }
}

// ---------- Gallery view ----------
function renderGallery(id) {
  const f = FRIENDS.find(x => x.id === id);
  const view = document.getElementById("view-gallery");
  if (!f) { view.innerHTML = "<p>Who? Never heard of them.</p>"; return; }

  const head = document.createElement("div");
  head.className = "gallery-head";
  head.appendChild(avatarEl(f, 84));
  const info = document.createElement("div");
  info.innerHTML = `<h2>${f.name}</h2><p>${formatDate(f)}</p>`;
  head.appendChild(info);

  const grid = document.createElement("div");
  if (f.gallery && f.gallery.length) {
    grid.className = "gallery-grid";
    f.gallery.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = f.name;
      grid.appendChild(img);
    });
  } else {
    grid.className = "gallery-empty";
    grid.textContent = "No goofy photos yet — add some to this person's gallery array in data.js!";
  }

  view.innerHTML = "";
  const back = document.createElement("button");
  back.className = "gallery-back";
  back.textContent = "← Back";
  back.onclick = () => { window.location.hash = ""; };

  view.append(back, head, grid);
}

// ---------- Routing ----------
function goToGallery(id) {
  window.location.hash = "gallery/" + id;
}

function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + name).classList.add("active");
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const tabBtn = document.getElementById("tab-" + name);
  if (tabBtn) tabBtn.classList.add("active");
}

function route() {
  const hash = window.location.hash.replace("#", "");
  if (hash.startsWith("gallery/")) {
    renderGallery(hash.split("/")[1]);
    showView("gallery");
  } else if (hash === "birthdays") {
    showView("birthdays");
  } else {
    showView("boys");
  }
}

window.addEventListener("hashchange", route);

document.getElementById("tab-boys").onclick = () => { window.location.hash = ""; };
document.getElementById("tab-birthdays").onclick = () => { window.location.hash = "birthdays"; };

renderBoys();
renderBirthdays();
route();
