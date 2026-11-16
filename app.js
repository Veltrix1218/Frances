// Frances - love app
// The password is NOT in this file. It lives in the FRANCES_PASSWORD
// environment variable and gets checked on the server (see api/verify.js).

const $ = (id) => document.getElementById(id);

const DB_NAME = 'FrancesLoveDB';
const SONG_STORE = 'songs';
const SESSION_KEY = 'francesSession';
const STORE = 'photos';

const defaultPhotos = [
  'assets/1794317232470.jpg',
  'assets/1794312159617.jpg',
  'assets/1791442114674.jpg'
];

// SONGS THAT COME WITH THE APP
// Put your mp3 files in assets/music and list them here, like this:
//   { title: 'Our Song', src: 'assets/music/our-song.mp3' }
// Songs you import from Settings are saved on the device and play after these.
const defaultSongs = [
  { title: 'Me and you',      src: 'assets/music/Tems_-_Me___U__Official_Video_(256k).mp3' },
  { title: 'Lovely', src: 'assets/music/Billie_Eilish,_Khalid_-_lovely(256k).mp3' },
  { title: 'Runaway',    src: 'assets/music/AURORA_-_Runaway(256k).mp3' }
];

const compliment = 'You turn ordinary days into something worth remembering.';
const question = 'Wanna see something cool?';

const noLines = ['Are you sure?', 'Really sure?', 'Pretty please?', 'Last chance...'];

const praise = [
  { text: 'Super Girl',    icon: 'fa-bolt' },
  { text: 'Energetic',     icon: 'fa-fire' },
  { text: 'Hardworking',   icon: 'fa-dumbbell' },
  { text: 'Smart',         icon: 'fa-brain' },
  { text: 'Beautiful',     icon: 'fa-gem' },
  { text: 'Frances',       icon: 'fa-heart' },
  { text: 'Amazing',       icon: 'fa-star' },
  { text: 'One of a kind', icon: 'fa-crown' },
  { text: 'Unstoppable',   icon: 'fa-rocket' },
  { text: 'Fearless',      icon: 'fa-shield-heart' },
  { text: 'Brilliant',     icon: 'fa-lightbulb' },
  { text: 'Radiant',       icon: 'fa-sun' }
];

const sparkIcons = ['fa-heart', 'fa-star', 'fa-bolt', 'fa-gem', 'fa-crown', 'fa-wand-magic-sparkles'];
const wordTones = ['rose', 'gold', 'wine', 'rose'];

let settings = {
  bg: '#FFE8EE',
  heart: '#D6336C',
  text: '#D6336C',
  button: '#D6336C',
  message: 'Made with love for Frances',
  speed: 3000,
  musicOn: true
};

let photos = [];
let objectUrls = [];
let current = 0;

let slideTimer = null;
let wordTimer = null;
let swapTicket = 0;

let playing = true;
let heartReady = false;
let checkingPassword = false;
let newToken = '';

// music
const audio = new Audio();
let songs = [];
let songIndex = 0;
let currentSongKey = '';
const songUrls = new Map();
let installPrompt = null;
let noCount = 0;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ---------- small helpers ---------- */

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Turns a string into animated pieces.
//   mode 'letters' -> one span per letter (words stay together on one line)
//   mode 'words'   -> one span per word
function splitText(element, text, mode, startDelay, step) {
  element.textContent = '';
  element.setAttribute('aria-label', text);

  let index = 0;

  const makePiece = (content, extraClass) => {
    const span = document.createElement('span');
    span.className = 'piece ' + extraClass;
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', index);
    span.style.setProperty('--delay', startDelay + 's');
    span.style.setProperty('--step', step + 'ms');
    span.textContent = content;
    index++;
    return span;
  };

  text.split(' ').forEach((word, wordIndex, all) => {
    if (mode === 'words') {
      element.appendChild(makePiece(word, 'chunk'));
    } else {
      const group = document.createElement('span');
      group.className = 'word-group';

      [...word].forEach((char) => {
        group.appendChild(makePiece(char, 'letter'));
      });

      element.appendChild(group);
    }

    if (wordIndex < all.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });

  return index;
}

function burstHearts(x, y, count) {
  if (reducedMotion) return;

  const tints = [settings.heart, '#E8A33D', '#FF8FB1'];

  for (let i = 0; i < count; i++) {
    const heart = document.createElement('i');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = 70 + Math.random() * 120;

    heart.className = 'fa-solid fa-heart burst-heart';
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';
    heart.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
    heart.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
    heart.style.setProperty('--size', 12 + Math.random() * 20 + 'px');
    heart.style.setProperty('--tint', pick(tints));
    heart.addEventListener('animationend', () => heart.remove());

    document.body.appendChild(heart);
  }
}


/* ---------- gate: question -> name -> password ---------- */

function startGate() {
  const complimentPieces = splitText($('complimentLine'), compliment, 'words', 0.3, 130);

  const questionStart = 0.3 + complimentPieces * 0.13 + 0.4;
  const questionPieces = splitText($('askTitle'), question, 'letters', questionStart, 55);

  const buttonsAt = questionStart + questionPieces * 0.055 + 0.5;
  setTimeout(() => $('answerRow').classList.add('is-visible'), buttonsAt * 1000);
}

function handleNo() {
  noCount++;

  const yesBtn = $('yesBtn');
  const noBtn = $('noBtn');

  // yes gets bigger, no gets smaller
  yesBtn.style.setProperty('--grow', 1 + noCount * 0.16);
  noBtn.style.setProperty('--shrink', Math.max(1 - noCount * 0.14, 0.5));

  noBtn.classList.remove('is-shaking');
  void noBtn.offsetWidth; // restart the shake
  noBtn.classList.add('is-shaking');

  if (noCount <= noLines.length) {
    $('noLabel').textContent = noLines[noCount - 1];
    return;
  }

  noBtn.hidden = true;
  $('gateNote').textContent = 'Looks like it was always going to be yes.';
}

async function handleYes() {
  // her tap lets the browser play sound, so the song starts here
  if (settings.musicOn !== false) playMusic();

  const yesBtn = $('yesBtn');
  const box = yesBtn.getBoundingClientRect();

  burstHearts(box.left + box.width / 2, box.top + box.height / 2, 20);

  yesBtn.disabled = true;
  $('noBtn').disabled = true;

  $('askStep').classList.add('is-leaving');
  await wait(550);

  $('askStep').hidden = true;
  $('nameStep').hidden = false;

  splitText($('nameReveal'), 'FRANCES', 'letters', 0.2, 130);
}

async function checkPassword(password) {
  const response = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  if (response.ok) {
    const data = await response.json().catch(() => ({}));
    newToken = data.token || '';
    return 'ok';
  }

  if (response.status === 401) return 'wrong';
  if (response.status === 500) return 'not-configured';
  return 'error';
}

function showLockError(message) {
  const field = document.querySelector('.pass-field');

  $('lockError').textContent = message;

  field.classList.remove('is-wrong');
  void field.offsetWidth;
  field.classList.add('is-wrong');
}

async function handleUnlock(event) {
  event.preventDefault();

  if (checkingPassword) return;

  const entered = $('passwordInput').value;
  if (!entered) return;

  const button = $('unlockBtn');
  const label = button.querySelector('span');

  checkingPassword = true;
  button.disabled = true;
  label.textContent = 'Checking...';
  $('lockError').textContent = '';

  let result;

  try {
    result = await checkPassword(entered);
  } catch (error) {
    result = 'offline';
  }

  checkingPassword = false;
  button.disabled = false;
  label.textContent = 'Unlock';

  if (result === 'ok') {
    // only remember her on this device if she ticked the box
    if ($('rememberBox').checked && newToken) {
      localStorage.setItem(SESSION_KEY, newToken);
    }

    await openApp(false);
    return;
  }

  const messages = {
    wrong: 'That is not the right password. Try again.',
    offline: 'Cannot reach the server. Check your internet and try again.',
    'not-configured': 'The password has not been set up on the server yet.',
    error: 'Something went wrong. Please try again.'
  };

  showLockError(messages[result]);

  if (result === 'wrong') {
    $('passwordInput').value = '';
    $('passwordInput').focus();
  }
}

function toggleEye() {
  const input = $('passwordInput');
  const icon = $('eyeBtn').firstElementChild;
  const nowVisible = input.type === 'password';

  input.type = nowVisible ? 'text' : 'password';
  icon.className = nowVisible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  $('eyeBtn').setAttribute('aria-label', nowVisible ? 'Hide password' : 'Show password');
}


/* ---------- opening the app ---------- */

async function openApp(fromSession) {
  $('app').hidden = false;

  if (!fromSession) {
    const box = $('unlockBtn').getBoundingClientRect();
    burstHearts(box.left + box.width / 2, box.top + box.height / 2, 24);
    $('gate').classList.add('is-leaving');
  }

  // the name starts spelling itself while the gate fades out
  const letters = splitText($('appName'), 'FRANCES', 'letters', 0.5, 110);
  const heartDelay = 0.5 + letters * 0.11 + 0.1;
  addNameHeart($('appName'), heartDelay);

  if (!fromSession) await wait(800);

  $('gate').hidden = true;
  $('wordField').classList.remove('is-soft');

  await playHeartIntro();
  await wait(600); // the heart glows for a moment, then the photo shows up

  heartReady = true;
  showPhoto(current);

  if (playing) startSlideTimer();
}

function addNameHeart(parent, delay) {
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-heart name-heart';
  icon.setAttribute('aria-hidden', 'true');
  icon.style.setProperty('--heart-delay', delay + 's');
  parent.appendChild(icon);
}

// Resolves once the heart outline has finished drawing itself.
function playHeartIntro() {
  return new Promise((resolve) => {
    const box = $('loveBox');
    const path = $('heartPath');
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      box.classList.add('is-filled');
      resolve();
    };

    path.addEventListener('animationend', (event) => {
      if (event.animationName === 'drawHeart') finish();
    });

    // just in case the browser never fires animationend
    setTimeout(finish, 5000);

    box.classList.add('is-drawing');
  });
}


/* ---------- floating background ---------- */

function createSparkles() {
  if (reducedMotion) return;

  const box = $('sparkles');
  box.innerHTML = '';

  for (let i = 0; i < 30; i++) {
    const spark = document.createElement('i');

    spark.className = 'fa-solid ' + pick(sparkIcons) + ' spark' + (i % 4 === 0 ? ' gold' : '');
    spark.style.left = Math.random() * 100 + '%';
    spark.style.top = Math.random() * 100 + '%';
    spark.style.fontSize = 12 + Math.random() * 18 + 'px';
    spark.style.animationDelay = Math.random() * 4 + 's';
    spark.style.animationDuration = 2 + Math.random() * 3 + 's';

    box.appendChild(spark);
  }
}

function spawnWord() {
  const field = $('wordField');
  if (field.childElementCount >= 20) return;

  const item = pick(praise);
  const word = document.createElement('span');
  const icon = document.createElement('i');
  const label = document.createElement('span');

  const sway = 10 + Math.random() * 30;

  word.className = 'float-word ' + pick(wordTones);
  word.style.setProperty('--x', '0px');
  word.style.setProperty('--size', 1.25 + Math.random() * 1.1 + 'rem');
  word.style.setProperty('--dur', 5 + Math.random() * 3.5 + 's');
  word.style.setProperty('--sway', sway + 'px');
  word.style.setProperty('--tilt', (Math.random() * 2 - 1) * 10 + 'deg');

  icon.className = 'fa-solid ' + item.icon;
  label.textContent = item.text;
  word.append(icon, label);

  // the rise animation is the one that ends, the sway loops forever
  word.addEventListener('animationend', (event) => {
    if (event.animationName === 'wordRise') word.remove();
  });

  field.appendChild(word);

  // now that it has a width, pick a spot where it fits fully on screen
  const room = field.clientWidth - word.offsetWidth - sway * 2 - 16;
  word.style.setProperty('--x', 8 + sway + Math.random() * Math.max(room, 0) + 'px');
}

function startWordField() {
  if (reducedMotion) return;

  clearInterval(wordTimer);

  for (let i = 0; i < 8; i++) {
    setTimeout(spawnWord, i * 200);
  }

  wordTimer = setInterval(() => {
    if (!document.hidden) spawnWord();
  }, 450);
}


/* ---------- storage (IndexedDB): photos and songs ---------- */

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = () => {
      const db = request.result;

      // version 1 only had photos, version 2 adds songs
      [STORE, SONG_STORE].forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
        }
      });
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close(); // never block an upgrade from another tab
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

async function dbRun(storeName, mode, action) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const request = action(db.transaction(storeName, mode).objectStore(storeName));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const getPhotos = () => dbRun(STORE, 'readonly', (store) => store.getAll());
const addPhoto = (file) => dbRun(STORE, 'readwrite', (store) => store.add({ name: file.name, blob: file, created: Date.now() }));
const deletePhoto = (id) => dbRun(STORE, 'readwrite', (store) => store.delete(id));
const clearAddedPhotos = () => dbRun(STORE, 'readwrite', (store) => store.clear());

const getSongs = () => dbRun(SONG_STORE, 'readonly', (store) => store.getAll());
const addSong = (file) => dbRun(SONG_STORE, 'readwrite', (store) => store.add({ name: file.name, blob: file, created: Date.now() }));
const deleteSong = (id) => dbRun(SONG_STORE, 'readwrite', (store) => store.delete(id));
const clearAddedSongs = () => dbRun(SONG_STORE, 'readwrite', (store) => store.clear());

// true if the image file really exists and loads
function canLoad(src) {
  return new Promise((resolve) => {
    const probe = new Image();

    probe.onload = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = src;
  });
}

async function refreshPhotos() {
  // free the old blob urls so they don't pile up in memory
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls = [];

  const stored = await getPhotos();
  const list = stored.map((item) => {
    const src = URL.createObjectURL(item.blob);
    objectUrls.push(src);
    return { id: item.id, name: item.name, src: src, added: true };
  });

  // only keep starter photos that actually exist
  const exists = await Promise.all(defaultPhotos.map(canLoad));

  defaultPhotos.forEach((path, i) => {
    if (exists[i]) list.push({ name: path.split('/').pop(), src: path, added: false });
  });

  photos = list;
  current = Math.min(current, Math.max(photos.length - 1, 0));

  makeDots();
  renderPhotoList();

  if (heartReady) showPhoto(current);
  else updateView();
}


/* ---------- slideshow ---------- */

function showPhoto(index) {
  const image = $('myImage');

  if (!photos.length) {
    current = 0;
    updateView();
    return;
  }

  current = (index + photos.length) % photos.length;
  updateView();

  // photos stay hidden until the heart has finished drawing
  if (!heartReady) return;

  const target = photos[current];
  const ticket = ++swapTicket;

  image.classList.remove('show');

  setTimeout(() => {
    if (ticket !== swapTicket) return; // a newer click took over

    const loader = new Image();

    loader.onload = () => {
      if (ticket !== swapTicket) return;
      image.src = target.src;
      requestAnimationFrame(() => image.classList.add('show'));
    };

    loader.onerror = () => image.classList.remove('show');
    loader.src = target.src;
  }, 240);
}

function updateView() {
  const hasPhotos = photos.length > 0;

  $('myImage').style.display = hasPhotos ? 'block' : 'none';
  $('emptyPhoto').style.display = hasPhotos ? 'none' : 'block';
  $('counter').textContent = hasPhotos ? `${current + 1} / ${photos.length}` : 'Add photos to begin';

  [...$('dots').children].forEach((dot, i) => {
    dot.classList.toggle('active', i === current);
  });
}

// used by the buttons and dots, so the timer starts over after a manual change
function goTo(index) {
  showPhoto(index);
  if (playing && heartReady) startSlideTimer();
}

function startSlideTimer() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => showPhoto(current + 1), Number(settings.speed) || 3000);
}

function togglePlay() {
  playing = !playing;

  $('playLabel').textContent = playing ? 'Pause slideshow' : 'Play slideshow';
  $('playIcon').className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';

  if (playing && heartReady) startSlideTimer();
  else clearInterval(slideTimer);
}

function makeDots() {
  const box = $('dots');
  box.innerHTML = '';

  photos.forEach((_, i) => {
    const dot = document.createElement('button');

    dot.type = 'button';
    dot.className = 'dot' + (i === current ? ' active' : '');
    dot.setAttribute('aria-label', 'Show photo ' + (i + 1));
    dot.onclick = () => goTo(i);

    box.appendChild(dot);
  });
}

function renderPhotoList() {
  const box = $('photoList');
  box.innerHTML = '';

  photos.forEach((photo) => {
    if (!photo.added) return;

    const item = document.createElement('div');
    const thumb = document.createElement('img');
    const remove = document.createElement('button');

    item.className = 'photo-item';
    thumb.src = photo.src;
    thumb.alt = photo.name || 'Added photo';

    remove.type = 'button';
    remove.textContent = '×';
    remove.title = 'Remove photo';
    remove.onclick = async () => {
      await deletePhoto(photo.id);
      await refreshPhotos();
    };

    item.append(thumb, remove);
    box.appendChild(item);
  });
}


/* ---------- music ---------- */

function cleanTitle(fileName) {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[_]+/g, ' ').trim() || 'Untitled';
}

async function songExists(src) {
  try {
    const response = await fetch(src, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function refreshSongs() {
  const stored = await getSongs();
  const list = [];
  const keepUrls = new Set();

  // the songs that ship with the app come first
  const found = await Promise.all(defaultSongs.map((song) => songExists(song.src)));

  defaultSongs.forEach((song, i) => {
    if (found[i]) list.push({ key: 'file:' + song.src, title: song.title, src: song.src, added: false });
  });

  // then the ones she imported. Reuse the blob url if we already made one,
  // so a song that is playing right now does not get cut off.
  stored.forEach((item) => {
    const key = 'db:' + item.id;
    if (!songUrls.has(key)) songUrls.set(key, URL.createObjectURL(item.blob));

    keepUrls.add(key);
    list.push({ key: key, id: item.id, title: cleanTitle(item.name), src: songUrls.get(key), added: true });
  });

  songUrls.forEach((url, key) => {
    if (!keepUrls.has(key)) {
      URL.revokeObjectURL(url);
      songUrls.delete(key);
    }
  });

  songs = list;

  const stillThere = songs.findIndex((song) => song.key === currentSongKey);

  if (stillThere >= 0) {
    songIndex = stillThere;
  } else {
    // the song that was loaded got removed
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    currentSongKey = '';
    songIndex = Math.min(songIndex, Math.max(songs.length - 1, 0));
  }

  audio.loop = songs.length === 1;

  renderSongList();
  updateMusicUI();
}

function loadSong(index) {
  if (!songs.length) return;

  songIndex = (index + songs.length) % songs.length;

  const song = songs[songIndex];

  audio.src = song.src;
  audio.loop = songs.length === 1;
  currentSongKey = song.key;

  updateMediaSession();
  updateMusicUI();
  renderSongList();
}

// returns true if the song really started. Browsers refuse to start sound
// until the person has tapped something, so this can fail on a fresh open.
async function playMusic() {
  if (!songs.length) return false;

  const loaded = songs[songIndex] && songs[songIndex].key === currentSongKey;
  if (!loaded) loadSong(songIndex);

  try {
    await audio.play();
    return true;
  } catch (error) {
    return false;
  }
}

function goToSong(index) {
  settings.musicOn = true;
  saveSettings();

  loadSong(index);
  playMusic();
}

function toggleMusic() {
  if (audio.paused) {
    settings.musicOn = true;
    playMusic();
  } else {
    settings.musicOn = false;
    audio.pause();
  }

  saveSettings();
}

function updateMusicUI() {
  const bar = $('musicBar');
  const playingNow = !audio.paused;
  const song = songs[songIndex];

  bar.hidden = songs.length === 0;
  bar.classList.toggle('is-playing', playingNow);

  $('musicTitle').textContent = song ? song.title : 'No song';
  $('musicIcon').className = playingNow ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  $('musicToggle').setAttribute('aria-label', playingNow ? 'Pause music' : 'Play music');
}

function renderSongList() {
  const box = $('songList');
  box.innerHTML = '';

  songs.forEach((song, index) => {
    const row = document.createElement('div');
    const title = document.createElement('button');

    row.className = 'song-row' + (index === songIndex && currentSongKey ? ' current' : '');

    title.type = 'button';
    title.className = 'song-title';
    title.textContent = song.title;
    title.onclick = () => {
      settings.musicOn = true;
      saveSettings();
      goToSong(index);
    };

    row.appendChild(title);

    if (song.added) {
      const remove = document.createElement('button');

      remove.type = 'button';
      remove.className = 'song-remove';
      remove.textContent = '×';
      remove.title = 'Remove song';
      remove.onclick = async () => {
        await deleteSong(song.id);
        await refreshSongs();
      };

      row.appendChild(remove);
    }

    box.appendChild(row);
  });
}

// song name and buttons on the phone's lock screen
function updateMediaSession() {
  if (!('mediaSession' in navigator) || !songs[songIndex]) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: songs[songIndex].title,
      artist: 'For Frances',
      artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }]
    });
  } catch (error) {
    // not supported here, no problem
  }
}

function setupMediaButtons() {
  if (!('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.setActionHandler('play', () => playMusic());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => goToSong(songIndex - 1));
    navigator.mediaSession.setActionHandler('nexttrack', () => goToSong(songIndex + 1));
  } catch (error) {
    // some browsers don't have every button, that's fine
  }
}

function looksLikeAudio(file) {
  return file.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(file.name);
}


/* ---------- settings ---------- */

function saveSettings() {
  localStorage.setItem('francesSettings', JSON.stringify(settings));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('francesSettings') || '{}');
    settings = { ...settings, ...saved };
  } catch (error) {
    // bad saved data, just use the defaults
  }
}

function applySettings() {
  const root = document.documentElement.style;

  root.setProperty('--bg', settings.bg);
  root.setProperty('--heart', settings.heart);
  root.setProperty('--text', settings.text);
  root.setProperty('--button', settings.button);

  $('loveText').textContent = settings.message;
  $('messageInput').value = settings.message;
  $('speedInput').value = String(settings.speed);

  ['bg', 'heart', 'text', 'button'].forEach((key) => {
    $(key + 'Color').value = settings[key];
    $(key + 'Hex').value = settings[key];
  });
}

function isValidColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function bindColor(key) {
  $(key + 'Color').addEventListener('input', (event) => {
    settings[key] = event.target.value.toUpperCase();
    applySettings();
    saveSettings();
  });

  $(key + 'Hex').addEventListener('change', (event) => {
    const value = event.target.value.trim();

    if (isValidColor(value)) {
      settings[key] = value.toUpperCase();
      applySettings();
      saveSettings();
    } else {
      event.target.value = settings[key];
    }
  });
}


/* ---------- wiring ---------- */

$('yesBtn').addEventListener('click', handleYes);
$('noBtn').addEventListener('click', handleNo);
$('unlockForm').addEventListener('submit', handleUnlock);
$('eyeBtn').addEventListener('click', toggleEye);
$('installBtn').addEventListener('click', installApp);
$('installLink').addEventListener('click', installApp);
$('logoutBtn').addEventListener('click', logOut);
$('logoutTop').addEventListener('click', logOut);

$('settingsOpen').onclick = () => $('settingsDialog').showModal();
$('settingsClose').onclick = () => $('settingsDialog').close();
$('doneBtn').onclick = () => $('settingsDialog').close();

$('prevBtn').onclick = () => goTo(current - 1);
$('nextBtn').onclick = () => goTo(current + 1);
$('playBtn').onclick = togglePlay;

['bg', 'heart', 'text', 'button'].forEach(bindColor);

$('messageInput').addEventListener('input', (event) => {
  settings.message = event.target.value;
  applySettings();
  saveSettings();
});

$('speedInput').addEventListener('change', (event) => {
  settings.speed = Number(event.target.value);
  saveSettings();
  if (playing && heartReady) startSlideTimer();
});

$('photoPicker').addEventListener('change', async (event) => {
  for (const file of event.target.files) {
    if (file.type.startsWith('image/')) await addPhoto(file);
  }

  event.target.value = '';
  await refreshPhotos();
});

$('clearPhotos').onclick = async () => {
  if (confirm('Remove all photos you added?')) {
    await clearAddedPhotos();
    await refreshPhotos();
  }
};

$('musicToggle').addEventListener('click', toggleMusic);
$('musicPrev').addEventListener('click', () => goToSong(songIndex - 1));
$('musicNext').addEventListener('click', () => goToSong(songIndex + 1));

audio.addEventListener('play', updateMusicUI);
audio.addEventListener('pause', updateMusicUI);
audio.addEventListener('ended', () => goToSong(songIndex + 1));

$('songPicker').addEventListener('change', async (event) => {
  let skipped = 0;

  for (const file of event.target.files) {
    if (!looksLikeAudio(file)) {
      skipped++;
      continue;
    }

    try {
      await addSong(file);
    } catch (error) {
      alert('Could not save "' + file.name + '". The device may be out of storage.');
    }
  }

  event.target.value = '';
  await refreshSongs();

  if (skipped) alert(skipped + ' file(s) were not music and were skipped.');
});

$('clearSongs').onclick = async () => {
  if (confirm('Remove all songs you added?')) {
    await clearAddedSongs();
    await refreshSongs();
  }
};

// if the app opened by itself (already logged in) the browser blocks sound,
// so the very first tap anywhere starts the song instead
document.addEventListener('pointerdown', () => {
  if (settings.musicOn !== false && audio.paused && songs.length) playMusic();
}, { once: true });

// tapping the heart throws a few hearts around
$('loveBox').addEventListener('click', (event) => {
  burstHearts(event.clientX, event.clientY, 10);
});


/* ---------- staying logged in ---------- */

// returns the saved token, or null if there is none or it has expired
function savedToken() {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;

  const expiry = Number(token.split('.')[0]);

  if (!expiry || expiry < Date.now()) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  return token;
}

// asks the server if the saved token is still good.
// No internet or a slow server? We trust the saved token so the app still opens.
async function sessionStillValid(token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal
    });

    return response.status !== 401;
  } catch (error) {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

function logOut() {
  localStorage.removeItem(SESSION_KEY);
  location.reload(); // back to the opening question
}


/* ---------- installing as an app ---------- */

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function updateInstallUI() {
  const section = $('installSection');

  if (isInstalled()) {
    section.hidden = true;
    $('installLink').hidden = true;
    return;
  }

  section.hidden = false;
  $('installBtn').hidden = !installPrompt;
  $('installLink').hidden = !installPrompt;

  if (installPrompt) {
    $('installHint').textContent = 'Install Frances on this device and open it like a normal app.';
  } else if (isIos()) {
    $('installHint').textContent = 'On iPhone: tap the Share button, then "Add to Home Screen".';
  } else {
    $('installHint').textContent = 'Open your browser menu and choose "Install app" or "Add to Home screen".';
  }
}

async function installApp() {
  if (!installPrompt) return;

  installPrompt.prompt();
  await installPrompt.userChoice;

  installPrompt = null;
  updateInstallUI();
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  updateInstallUI();
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  updateInstallUI();
});


/* ---------- start ---------- */

async function init() {
  loadSettings();
  applySettings();
  updateInstallUI();
  setupMediaButtons();
  createSparkles();
  $('wordField').classList.add('is-soft');
  startWordField();

  // load the songs first so the Yes tap can start one
  await refreshSongs().catch(console.error);

  // already logged in on this device? skip straight to the app
  const token = savedToken();

  if (token) {
    $('gate').hidden = true;
    await refreshPhotos().catch(console.error);

    if (await sessionStillValid(token)) {
      await openApp(true);
      return;
    }

    // password was changed or the token is no good
    localStorage.removeItem(SESSION_KEY);
    $('gate').hidden = false;
  }

  startGate();
  await refreshPhotos().catch(console.error);
}

init();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  });
}
