const MAP_W = 1600;
const MAP_H = 900;

const game = {
  avatar: "",
  studentName: "",
  score: 0,
  currentCheckpoint: 1,
  completedCheckpoints: [],
  modalCheckpoint: null,
  player: {
    x: 800,
    y: 795,
    speed: 4.2,
    direction: "up",
    moving: false,
    frame: 0
  }
};

// =====================================================
// CHECKPOINT POSITIONS
// =====================================================

const checkpoints = [
  { id: 1, x: 415, y: 635, label: "Misi 1" },
  { id: 2, x: 810, y: 525, label: "Misi 2" },
  { id: 3, x: 1260, y: 660, label: "Misi 3" },
  { id: 4, x: 445, y: 245, label: "Misi 4" },
  { id: 5, x: 1240, y: 240, label: "Misi 5" }
];

const finish = {
  id: "finish",
  x: 805,
  y: 115,
  label: "Penamat"
};

const keys = new Set();

let scale = 1;
let lastAnim = 0;

// =====================================================
// ELEMENTS
// =====================================================

const startScreen = document.querySelector("#startScreen");
const gameScreen = document.querySelector("#gameScreen");
const prepScreen = document.querySelector("#prepScreen");

const nameInput = document.querySelector("#studentName");
const nameError = document.querySelector("#nameError");

const world = document.querySelector("#world");
const player = document.querySelector("#player");
const playerSprite = document.querySelector("#playerSprite");
const playerName = document.querySelector("#playerName");

const hudName = document.querySelector("#hudName");
const scoreEl = document.querySelector("#score");
const progressEl = document.querySelector("#progress");

const cpLayer = document.querySelector("#checkpointLayer");
const interaction = document.querySelector("#interactionMessage");

const modal = document.querySelector("#checkpointModal");
const modalTitle = document.querySelector("#modalTitle");
const activityArea = document.querySelector("#activityArea");

const interactBtn = document.querySelector("#interactBtn");
const resultModal = document.querySelector("#resultModal");


// =====================================================
// PeTaRa HAPPY KIDS ADVENTURE — original melody (Web Audio)
// Background music plays outside missions; no external audio file needed.
// =====================================================
const petaraMusic = (() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let timer = null;
  let step = 0;
  let nextTime = 0;
  let enabled = true;
  let suspendedForMission = false;
  const beat = 60 / 116;
  const melody = [
    ["G5","E5","G5","C6","B5","G5","E5","G5"],
    ["A5","G5","E5","D5","E5","G5","A5","G5"],
    ["A5","F5","A5","C6","A5","G5","F5","E5"],
    ["G5","E5","D5","G5","E5","D5","C5","E5"],
    ["G5","E5","G5","C6","D6","C6","B5","G5"],
    ["A5","C6","A5","G5","E5","G5","A5","C6"],
    ["B5","G5","B5","D6","C6","B5","G5","D5"],
    ["E5","G5","C6","G5","E5","D5","C5","G5"]
  ];
  const chords = [
    ["C3","C4","E4","G4"], ["A3","A3","C4","E4"],
    ["F3","F3","A3","C4"], ["G3","G3","B3","D4"],
    ["C3","C4","E4","G4"], ["F3","F3","A3","C4"],
    ["G3","G3","B3","D4"], ["C3","C4","E4","G4"]
  ];
  const semitones = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
  function frequency(note) {
    const match = /^([A-G])(\d)$/.exec(note);
    if (!match) return 0;
    const midi = (Number(match[2])+1)*12 + semitones[match[1]];
    return 440*Math.pow(2,(midi-69)/12);
  }
  function note(name, when, length, volume, type) {
    if (!ctx || !master) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.value = frequency(name);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(when);
    oscillator.stop(when + length + 0.02);
  }
  function schedule() {
    if (!ctx || !enabled || suspendedForMission) return;
    while (nextTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(step / 8) % 8;
      const sub = step % 8;
      note(melody[bar][sub],nextTime,beat*.37,.12,"sine");
      if (sub % 2 === 0) {
        note(chords[bar][1 + (sub/2)%3],nextTime,beat*.65,.045,"sine");
      }
      if (sub === 0) note(chords[bar][0],nextTime,beat*3.7,.045,"sine");
      step = (step + 1) % 64;
      nextTime += beat / 2;
    }
  }
  function setup() {
    if (!AudioContextClass) return false;
    if (!ctx) {
      ctx = new AudioContextClass();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    return true;
  }
  function play() {
    if (!enabled || suspendedForMission || !setup()) return;
    ctx.resume().then(() => {
      if (!enabled || suspendedForMission || timer) return;
      nextTime = ctx.currentTime + .06;
      timer = setInterval(schedule, 70);
      schedule();
    }).catch(() => {});
  }
  function pause() {
    if (timer) clearInterval(timer);
    timer = null;
    if (ctx && ctx.state === "running") ctx.suspend().catch(() => {});
  }
  function mission(open) {
    suspendedForMission = open;
    if (open) pause();
    else play();
  }
  function toggle() {
    enabled = !enabled;
    if (enabled) play(); else pause();
    button.textContent = enabled ? "🎵 Muzik ON" : "🔇 Muzik OFF";
    button.setAttribute("aria-pressed", String(enabled));
  }
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "🎵 Muzik ON";
  button.setAttribute("aria-label","Hidupkan atau matikan muzik latar");
  button.setAttribute("aria-pressed","true");
  Object.assign(button.style,{
    position:"fixed",top:"12px",right:"12px",zIndex:"10000",
    padding:"8px 12px",borderRadius:"18px",border:"2px solid #fff",
    background:"#186b86",color:"#fff",fontWeight:"bold",
    fontSize:"13px",cursor:"pointer",boxShadow:"0 2px 6px #0005"
  });
  button.addEventListener("click",toggle);
  document.body.appendChild(button);
  // Start on first user gesture (browser autoplay restrictions apply).
  document.addEventListener("pointerdown", () => play(), { once: true });
  document.addEventListener("keydown", () => play(), { once: true });
  return { play, pause, mission };
})();

// =====================================================
// HOME-only resume: memory lasts only until the page reloads or closes.
// No progress is restored after refresh, closing the tab, or pressing X.
// =====================================================
let currentSessionProgress = null;
// Delete progress saved by the previous version, which must not resume anymore.
try { localStorage.removeItem("ksp-v2-resume-v1"); } catch (e) {}

function readSavedProgress(name) {
  const saved = currentSessionProgress;
  if (!saved || saved.name !== name || !Number.isInteger(saved.mission) ||
      saved.mission < 1 || saved.mission > 6 ||
      !Number.isInteger(saved.question) || saved.question < 0 ||
      (saved.mission <= 5 && saved.question >= CP[saved.mission].length)) return null;
  return saved;
}

function saveGameProgress(mission = game.modalCheckpoint || game.currentCheckpoint,
                          question = activityIndex,
                          completed = game.completedCheckpoints,
                          score = game.score) {
  if (!game.studentName) return;
  currentSessionProgress = {
    name: game.studentName,
    mission, question, score,
    completed: [...completed]
  };
}

// =====================================================
// START GAME
// =====================================================

const AVATAR_IDS = ["boy1", "boy2", "girl1", "girl2", "teacherM", "teacherF"];
function chooseAvatar(id) {
  if (!AVATAR_IDS.includes(id)) return;
  game.avatar = id;
  document.querySelectorAll(".avatar-option").forEach(button => {
    const selected = button.dataset.avatar === id;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const error = document.querySelector("#avatarError");
  if (error) error.textContent = "";
}
document.querySelectorAll(".avatar-option").forEach(button =>
  button.addEventListener("click", () => chooseAvatar(button.dataset.avatar))
);
const APPROVED_AVATAR_ATLAS = "assets/avatars/approved-explorers-atlas.svg";
const BLANK_AVATAR_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIEAAAAAAAAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAgEAAEEBAA7";
const AVATAR_DIRECTIONS = ["down", "up", "left", "right"];
function applyAvatarArtwork(img, avatar, direction = "down", portrait = false) {
  const col = AVATAR_IDS.indexOf(avatar);
  if (!img || col < 0) return;
  const row = portrait ? 0 : Math.max(0, AVATAR_DIRECTIONS.indexOf(direction)) + 1;
  const w = portrait ? 36 : 50;
  const h = portrait ? 42 : 62;
  if (img.getAttribute("src") !== BLANK_AVATAR_PIXEL) img.setAttribute("src", BLANK_AVATAR_PIXEL);
  img.alt = "";
  img.draggable = false;
  img.style.border = "0";
  img.style.outline = "none";
  img.style.backgroundImage = 'url("' + APPROVED_AVATAR_ATLAS + '")';
  img.style.backgroundRepeat = "no-repeat";
  img.style.backgroundSize = (w * 6) + "px " + (h * 5) + "px";
  img.style.backgroundPosition = (-col * w) + "px " + (-row * h) + "px";
}

function startGame() {
  const name = nameInput.value.trim();

  if (!name) {
    nameError.textContent =
      "⚠️ Sila masukkan nama kamu dahulu.";
    nameInput.focus();
    return;
  }

  if (!AVATAR_IDS.includes(game.avatar)) {
    document.querySelector("#avatarError").textContent = "⚠️ Sila pilih avatar kamu dahulu.";
    return;
  }

  game.studentName = name;
  applyAvatarArtwork(playerSprite, game.avatar, "down");
  const hudPortrait = document.querySelector("#hud .hud-player img");
  if (hudPortrait) applyAvatarArtwork(hudPortrait, game.avatar, "down", true);

  hudName.textContent = name;
  playerName.textContent = name;

  startScreen.classList.add("hidden");
  petaraMusic.play();

  if (prepScreen) {
    prepScreen.classList.remove("hidden");
    // Offline: do not block the entire game on network-based speech recognition.
    // Oral missions instead provide a local recorder and teacher confirmation.
    if (!navigator.onLine && readyBtn) {
      readyBtn.disabled = false;
      readyBtn.classList.remove("hidden");
      const overlay = document.querySelector("#startJourneyOverlay");
      if (overlay) overlay.classList.remove("hidden");
      if (micTestStatus) {
        micTestStatus.textContent = "📴 Mod luar talian: Mikrofon diuji semasa latihan lisan. Tekan MULA BERMAIN untuk meneruskan.";
        micTestStatus.className = "mic-test-status warning";
      }
    }
  } else {
    enterWorld();
  }
}

document
  .querySelector("#startBtn")
  .addEventListener("click", startGame);

nameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") startGame();
});

nameInput.addEventListener("input", () => {
  nameError.textContent = "";
});

// =====================================================
// PREPARATION SCREEN
// =====================================================

let micTestRecognition = null;
let micTestPassed = false;

const testMicBtn = document.querySelector("#testMicBtn");
const readyBtn = document.querySelector("#readyBtn");
const micTestStatus =
  document.querySelector("#micTestStatus");

if (readyBtn) {
  readyBtn.disabled = true;
  readyBtn.classList.remove("hidden");
}

if (testMicBtn) {
  testMicBtn.addEventListener("click", testMicrophone);
}

if (readyBtn) {
  readyBtn.addEventListener("click", enterWorld);
}

function testMicrophone() {
  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!navigator.onLine) {
    // A real microphone permission test works offline; speech-to-text may not.
    if (!navigator.mediaDevices?.getUserMedia) {
      if (micTestStatus) {
        micTestStatus.textContent = "⚠️ Pelayar ini tidak menyediakan akses mikrofon. Cuba buka aplikasi daripada ikon Skrin Utama atau Safari.";
        micTestStatus.className = "mic-test-status warning";
      }
      return;
    }
    if (micTestStatus) {
      micTestStatus.textContent = "🎤 Meminta kebenaran mikrofon...";
      micTestStatus.className = "mic-test-status listening";
    }
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
      const live=stream.getAudioTracks().some(track=>track.readyState==="live");
      stream.getTracks().forEach(track=>track.stop());
      if (micTestStatus) {
        micTestStatus.textContent = live
          ? "✅ Mikrofon boleh digunakan tanpa Internet. Jawapan lisan akan dirakam untuk semakan guru."
          : "⚠️ Mikrofon tidak aktif. Semak kebenaran mikrofon.";
        micTestStatus.className = live ? "mic-test-status success" : "mic-test-status warning";
      }
      if (live && readyBtn) {
        readyBtn.disabled = false;
        readyBtn.classList.remove("hidden");
        document.querySelector("#startJourneyOverlay")?.classList.remove("hidden");
      }
    }).catch(error=>{
      if (micTestStatus) {
        micTestStatus.textContent = error?.name==="NotAllowedError"
          ? "⚠️ Akses mikrofon ditolak. Benarkan mikrofon untuk laman ini dalam tetapan Safari dan cuba lagi."
          : "⚠️ Mikrofon belum dapat dibuka. Cuba Safari atau ikon aplikasi di Skrin Utama.";
        micTestStatus.className = "mic-test-status warning";
      }
    });
    return;
  }
  if (!SR) {
    // Browser can still permit voice recording even if recognition is unavailable.
    if (micTestStatus) {
      micTestStatus.textContent = "🎤 Pengecaman suara tiada. Tekan UJI MIKROFON untuk semak fungsi rakaman.";
      micTestStatus.className = "mic-test-status warning";
    }
    if (readyBtn) {
      readyBtn.disabled = false;
      document.querySelector("#startJourneyOverlay")?.classList.remove("hidden");
    }
    return;
  }

  if (micTestRecognition) {
    try {
      micTestRecognition.stop();
    } catch (e) {}
  }

  micTestPassed = false;
  if (readyBtn) {
    readyBtn.disabled = true;
    const overlay = document.querySelector("#startJourneyOverlay");
    if (overlay) overlay.classList.add("hidden");
  }

  const r = new SR();

  r.lang = "ms-MY";
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 3;

  micTestRecognition = r;

  if (micTestStatus) {
    micTestStatus.textContent =
      '🎙️ Sedang mendengar... Sebut “Hai, PeTara!”.';

    micTestStatus.className =
      "mic-test-status listening";
  }

  let heard = "";

  r.onresult = event => {
    heard = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      heard +=
        " " + event.results[i][0].transcript;
    }

    const text = norm(heard);

   if (text.trim().length > 0) {
      micTestPassed = true;
      if (readyBtn) {
        readyBtn.disabled = false;
        readyBtn.classList.remove("hidden");
        const overlay = document.querySelector("#startJourneyOverlay");
        if (overlay) overlay.classList.remove("hidden");
      }

      if (micTestStatus) {
        micTestStatus.textContent =
          "✅ Mikrofon berfungsi dengan baik. Anda sudah bersedia!";

        micTestStatus.className =
          "mic-test-status success";
      }

      try {
        r.stop();
      } catch (e) {}
    }

    else if (micTestStatus) {
      micTestStatus.textContent =
        `🎙️ Suara dikesan: "${heard.trim()}"`;
    }
  };

  r.onerror = event => {
    if (!micTestStatus) return;

    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      micTestStatus.textContent =
        "⚠️ Mikrofon tidak dapat digunakan. Sila benarkan akses kepada mikrofon pada peranti anda dan cuba lagi.";
    }

    else if (event.error === "no-speech") {
      micTestStatus.textContent =
        "🎤 Suara belum dapat dikesan. Cuba sekali lagi.";
    }

    else {
      micTestStatus.textContent =
        "⚠️ Mikrofon belum dapat diuji. Cuba sekali lagi.";
    }

    micTestStatus.className =
      "mic-test-status warning";
  };

  r.onend = () => {
    micTestRecognition = null;

    if (
      !micTestPassed &&
      micTestStatus &&
      !micTestStatus.textContent.includes("⚠️")
    ) {
      micTestStatus.textContent =
        "🎤 Suara belum dapat dikesan. Cuba UJI MIKROFON sekali lagi.";

      micTestStatus.className =
        "mic-test-status warning";
    }
  };

  try {
    r.start();
  }

  catch (e) {
    if (micTestStatus) {
      micTestStatus.textContent =
        "⚠️ Mikrofon belum dapat dimulakan. Cuba sekali lagi.";
    }
  }
}

function enterWorld() {
  if (micTestRecognition) {
    try {
      micTestRecognition.stop();
    } catch (e) {}

    micTestRecognition = null;
  }

  if (prepScreen) {
    prepScreen.classList.add("hidden");
  }
  const reminder = document.querySelector("#voiceReminderScreen");
  if (reminder) reminder.classList.add("hidden");

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  petaraMusic.play();

  createCheckpoints();
  updateHUD();
  resizeWorld();

  requestAnimationFrame(loop);
  if (window.__kspJoinMultiplayer) window.__kspJoinMultiplayer(game.studentName, () => game.player, game.avatar);
}

// =====================================================
// CHECKPOINT STATE
// =====================================================

function checkpointState(id) {
  if (game.completedCheckpoints.includes(id)) {
    return "completed";
  }

  if (id === game.currentCheckpoint) {
    return "active";
  }

  return "locked";
}

function assetFor(id, state) {
  return `assets/checkpoints/cp${id}-${state}.png`;
}

function createCheckpoints() {
  cpLayer.innerHTML = "";

  checkpoints.forEach(cp => {
    const el = document.createElement("div");

    el.className = "checkpoint";
    el.dataset.cp = cp.id;
    el.style.left = cp.x + "px";
    el.style.top = cp.y + "px";

    el.innerHTML =
      `<img alt="${cp.label}">`;

    cpLayer.appendChild(el);
  });

  const f = document.createElement("div");

  f.className = "checkpoint";
  f.dataset.cp = "finish";
  f.style.left = finish.x + "px";
  f.style.top = finish.y + "px";

  f.innerHTML =
    `<img alt="Penamat">`;

  cpLayer.appendChild(f);

  refreshCheckpointGraphics();
}

function refreshCheckpointGraphics() {
  checkpoints.forEach(cp => {
    const state = checkpointState(cp.id);

    const el =
      document.querySelector(
        `[data-cp="${cp.id}"]`
      );

    if (!el) return;

    el.className =
      `checkpoint ${state}`;

    el.querySelector("img").src =
      assetFor(cp.id, state);
  });

  const f =
    document.querySelector(
      '[data-cp="finish"]'
    );

  if (f) {
    const state =
      game.completedCheckpoints.length === 5
        ? "active"
        : "locked";

    f.className =
      `checkpoint ${state}`;

    f.querySelector("img").src =
      `assets/checkpoints/finish-${state}.png`;
  }
}

// =====================================================
// HUD
// =====================================================

function updateHUD() {
  scoreEl.textContent = game.score;

  progressEl.textContent =
    `${game.completedCheckpoints.length}/5`;
}

// =====================================================
// NEAREST CHECKPOINT
// =====================================================

function getNearestTarget() {
  let nearest = null;
  let best = Infinity;

  [...checkpoints, finish].forEach(cp => {
    const d =
      Math.hypot(
        game.player.x - cp.x,
        game.player.y - cp.y
      );

    if (d < best) {
      best = d;
      nearest = cp;
    }
  });

  return {
    target: nearest,
    distance: best
  };
}

// =====================================================
// INTERACTION
// =====================================================

function handleInteraction() {
  const {
    target,
    distance
  } = getNearestTarget();

  if (!target || distance > 92) {
    interaction.classList.add("hidden");
    interactBtn.classList.add("hidden");
    return;
  }

  interaction.classList.remove("hidden");
  interactBtn.classList.remove("hidden");

  if (target.id === "finish") {
    if (
      game.completedCheckpoints.length === 5
    ) {
      interaction.textContent =
        "🏆 Masuk ke PENAMAT";

      interactBtn.textContent =
        "🏆 PENAMAT";
    }

    else {
      interaction.textContent =
        "🔒 Selesaikan semua checkpoint dahulu!";

      interactBtn.classList.add("hidden");
    }

    return;
  }

  const state =
    checkpointState(target.id);

  if (state === "locked") {
    interaction.textContent =
      "🔒 Selesaikan checkpoint sebelumnya dahulu!";

    interactBtn.classList.add("hidden");
  }

  else if (state === "completed") {
    interaction.textContent =
      `✓ ${target.label} telah selesai`;

    interactBtn.classList.add("hidden");
  }

  else {
    // Only one prompt is needed for an available mission.
    interaction.classList.add("hidden");
    interactBtn.textContent =
      "✨ MULAKAN MISI ✨";
  }
}

function interact() {
  const {
    target,
    distance
  } = getNearestTarget();

  if (!target || distance > 92) return;

  if (target.id === "finish") {
    if (
      game.completedCheckpoints.length === 5
    ) {
      showResults();
    }

    return;
  }

  if (
    checkpointState(target.id) !== "active"
  ) {
    return;
  }

  // Resume only the active mission at the saved unanswered question.
  const saved = readSavedProgress(game.studentName);
  const resumeQuestion = saved && saved.mission === target.id ? saved.question : 0;
  game.modalCheckpoint = target.id;

  modalTitle.textContent =
    `Misi ${target.id}`;

  petaraMusic.mission(true);
  modal.classList.remove("hidden");

  keys.clear();

  openCheckpoint(target.id, resumeQuestion);
}

// =====================================================
// LEAVE MISSION TO MAP: HOME, X OR OUTSIDE THE MISSION CARD
// Keep current unanswered question and progress until page refresh/close.
// =====================================================
function returnMissionToMap() {
  if (game.modalCheckpoint == null) return;
  stopSpeech();
  stopRecognition(true);
  missionNavigationToken++; // ignore delayed success/voice callbacks from this mission
  // If the final answer was accepted during the celebration delay,
  // finish applying the stored result before returning to the map.
  const saved = readSavedProgress(game.studentName);
  if (saved && saved.mission !== game.modalCheckpoint &&
      Array.isArray(saved.completed)) {
    game.completedCheckpoints = saved.completed.slice();
    game.currentCheckpoint = saved.mission;
    game.score = saved.score;
    updateHUD();
    refreshCheckpointGraphics();
  }
  game.modalCheckpoint = null;
  modal.classList.add("hidden");
  petaraMusic.mission(false);
  keys.clear();
  interaction.classList.add("hidden");
  interactBtn.classList.add("hidden");
  handleInteraction();
}

document.querySelector("#closeModal").addEventListener("click", returnMissionToMap);
document.querySelector("#missionHomeBtn").addEventListener("click", returnMissionToMap);
// Only tapping the backdrop outside the mission card exits;
// touches on question controls, answers, audio and RAKAM must not exit.
modal.addEventListener("click", event => {
  if (event.target === modal) returnMissionToMap();
});

// =====================================================
// CHECKPOINT DATA
// =====================================================

let activityIndex = 0;
let missionNavigationToken = 0;

let recognition = null;
let isRecording = false;

let finalTranscript = "";
let interimTranscript = "";
// Keep the last text shown to the learner if Safari revises interim recognition on stop.
let lastVisibleVoiceTranscript = "";

const CP = {

  1: [
    {
      audio: "assets/audio/cp1-1.m4a?v=20261124-newrecording",
      options: ["🍎", "🥕", "🌽"],
      correct: "🥕"
    },

    {
      audio: "assets/audio/cp1-2.m4a",
      options: ["✏️", "📏", "✂️"],
      correct: "✏️"
    }
  ],

  2: [
    {
      audio: "assets/audio/cp2-1.m4a",

      items: [
        ["🔪", "pisau"],
        ["🥄", "sudu"],
        ["🍴", "garpu"]
      ],

      target: ["🐟", "ikan"],
      correct: "pisau"
    },

    {
      audio: "assets/audio/cp2-2.m4a",

      items: [
        ["🧂", "garam"],
        ["🥄", "sudu"],
        ["🔪", "pisau"]
      ],

      target: ["🥣", "mangkuk"],
      correct: "garam"
    }
  ],

  3: [
    {
      audio: "assets/audio/cp3-1.m4a",
      requiredGroups: [["tiga", "3"], ["biji"], ["limau"]]
    },

    {
      audio: "assets/audio/cp3-2.m4a",
      requiredGroups: [["beg"], ["warna", "berwarna"], ["biru"]]
    }
  ],

  4: [
    {
      audio: "assets/audio/cp4-1.m4a",
      responseAction: ["bantu", "membantu", "tolong", "menolong"]
    },

    {
      audio: "assets/audio/cp4-2.m4a",
      responseAction: ["beli", "membeli", "belikan", "membelikan", "membelinya", "membelikannya"]
    },

    {
      audio: "assets/audio/cp4-3.m4a",
      all: ["telur", "kicap", "garam"]
    }
  ],

  5: [
    {
      audio: "assets/audio/cp5-1.m4a",

      all: [
        "saya",
        "suka",
        "membaca",
        "buku"
      ]
    },

    {
      audio: "assets/audio/cp5-2.m4a",

      all: [
        "kami",
        "bermain",
        "bola",
        "di",
        "padang"
      ]
    }
  ]
};

// =====================================================
// CHECKPOINT INSTRUCTIONS
// =====================================================

const checkpointInstructions = {

  1: {
    icon: "👂",

    title:
      "Dengar dan pilih jawapan.",

    text:
      'Dengar audio dengan <strong>teliti</strong>, kemudian <strong>pilih jawapan yang tepat</strong>.'
  },

  2: {
    icon: "👂",

    title:
      "Dengar dan lakukan.",

    text:
      'Dengar arahan dengan <strong>teliti</strong>, kemudian <strong>seret objek yang betul ke tempat yang sesuai</strong>.'
  },

  3: {
    icon: "🎤",
    title: "Dengar dan berbual.",
    text: 'Dengar dengan <strong>teliti</strong>, kemudian <strong>berikan jawapan secara lisan</strong>.',
    secondInstruction: 'Jawab soalan menggunakan <strong>ayat yang lengkap dan betul</strong>.',
    example: ['Apakah makanan kesukaan Rafi?', 'Makanan kesukaan Rafi ialah bakso.']
  },

  4: {
    icon: "🗣️",
    title: "Dengar dan berikan respons.",
    text: 'Dengar dengan <strong>teliti</strong>, kemudian <strong>berikan respons yang sesuai</strong>.',
    secondInstruction: 'Berikan respons menggunakan <strong>ayat yang lengkap dan betul</strong>.',
    example: ['Bolehkah kamu tolong tutup pintu itu?', 'Boleh, saya akan menutup pintu itu.']
  },

  5: {
    icon: "🎙️",

    title:
      "Dengar dan sebut semula.",

    text:
      'Dengar ayat dengan <strong>teliti</strong>, kemudian <strong>sebut semula ayat yang didengar</strong>.'
  }

};

// =====================================================
// OPEN CHECKPOINT
// =====================================================

function openCheckpoint(id, resumeQuestion = 0) {
  missionNavigationToken++;
  activityIndex = resumeQuestion;

  stopSpeech();
  stopRecognition(true);

  if (resumeQuestion > 0) {
    renderActivity(id);
  } else {
    saveGameProgress(id, 0);
    showCheckpointInstruction(id);
  }
}

// =====================================================
// INSTRUCTION SCREEN
// =====================================================

function showCheckpointInstruction(id) {
  const info =
    checkpointInstructions[id];

  // In Missions 3 and 4, use the learning-skill heading instead of "Misi 3/4".
  modalTitle.textContent = info.secondInstruction ? info.title : `Misi ${id}`;

  activityArea.innerHTML = `
    <div class="instruction-screen ${info.secondInstruction ? "voice-instruction-screen" : ""}">

      <div class="instruction-icon">
        ${info.icon}
      </div>

      ${info.secondInstruction ? `
        <div class="voice-instruction-box">
          <p><span class="voice-instruction-number">1.</span> ${info.text}</p>
          <p><span class="voice-instruction-number">2.</span> ${info.secondInstruction}</p>
          <div class="voice-instruction-example">
            <strong>Contoh:</strong>
            <div>${info.example[0]}</div>
            <div>${info.example[1]}</div>
          </div>
        </div>
      ` : `
        <h3>${info.title}</h3>
        <p>${info.text}</p>
      `}

      <div class="activity-actions">

        <button
          id="instructionDoneBtn"
          class="primary-btn"
        >
          ✅ SAYA FAHAM
        </button>

      </div>

    </div>
  `;

  const instructionDoneBtn =
    document.querySelector(
      "#instructionDoneBtn"
    );

  instructionDoneBtn.onclick = () => {
    showListenTwiceReminder(id);
  };
}

// Reminder appears AFTER the main instruction, inside every mission.
function showListenTwiceReminder(id) {
  // Only the reminder screen is shown; hide the mission title above it.
  modalTitle.textContent = "";
  activityArea.innerHTML = `
    <div class="instruction-screen petara-reminder">
      <div class="instruction-icon">⚠️</div>
      <h3>PERINGATAN!</h3>
      <p>Jika audio tidak dapat <strong>didengar</strong> atau suara tidak dapat
      <strong>dirakam</strong> dengan jelas, tekan butang
      <strong>DENGAR AUDIO</strong> atau <strong>RAKAM</strong> sekali lagi.</p>
      <div class="activity-actions">
        <button id="listenTwiceDoneBtn" class="primary-btn">
          ✅ MULAKAN MISI ✅
        </button>
      </div>
    </div>
  `;
  document.querySelector("#listenTwiceDoneBtn").onclick = () => {
    modalTitle.textContent = `Misi ${id}`;
    renderActivity(id);
  };
}

// =====================================================
// ACTIVITY SHELL
// =====================================================

function shell(title, total, body) {

  const missionNumber =
    game.modalCheckpoint || "";

  const questionNumber =
    activityIndex + 1;

  activityArea.classList.remove(
    "outer-question-1",
    "outer-question-2",
    "outer-question-3"
  );

  activityArea.classList.add(
    `outer-question-${questionNumber}`
  );

  activityArea.innerHTML = `

    <div class="question-page mission-${missionNumber} question-${questionNumber}">

      <div class="activity-question">
        SOALAN ${questionNumber}
      </div>

      ${body}

      <div class="activity-title">
        ${title}
      </div>

      <div
        id="feedback"
        class="feedback"
      ></div>

    </div>
  `;
}

// =====================================================
// RENDER ACTIVITY
// =====================================================

function renderActivity(id) {
  stopSuccessCheer();
  stopSpeech();
  saveGameProgress(id, activityIndex);
  

  const d =
    CP[id][activityIndex];

  const total =
    CP[id].length;

  if (id === 1) {
    return cp1(d, total);
  }

  if (id === 2) {
    return cp2(d, total);
  }

  stopRecognition(true);
  renderVoice(
    d,
    total,

    id === 3
      ? "Dengar dan berbual."
      : id === 4
        ? "Dengar dan berikan respons."
        : "Dengar dan sebut semula.",

    id === 4,
    id === 5
  );
}

// =====================================================
// AUDIO
// =====================================================

let currentAudio = null;


// =====================================================
// IOS / IPADOS AUDIO SESSION
// =====================================================

// Misi 3 (iOS): letakkan audio dalam mod yang membenarkan mikrofon
// sebelum Web Speech membuka sesi rakaman.
function setMission3RecordingMode() {
  try {
    if (navigator.audioSession && "type" in navigator.audioSession) {
      navigator.audioSession.type = "play-and-record";
    }
  } catch (error) {
    console.log("Mod rakaman iOS tidak tersedia", error);
  }
}

function setAudioPlaybackMode() {

  try {

    if (
      navigator.audioSession &&
      "type" in navigator.audioSession
    ) {

      navigator.audioSession.type = "playback";

    }

  } catch (e) {

    console.log("Audio playback mode tidak tersedia.");

  }
}




// =====================================================
// PLAY AUDIO
// =====================================================

function toggleQuestionAudio(src) {
  // The same button always stops any active or loading question audio.
  if (currentAudio && !currentAudio.ended) {
    stopSpeech();
    return;
  }
  speak(src);
}

function speak(src) {
  stopSuccessCheer();
  stopSpeech();
  setAudioPlaybackMode();

  const audio = new Audio(src);
  currentAudio = audio;
  audio.preload = "auto";
  audio.muted = false;
  audio.volume = 1.0;

  // Begin playback directly from the button press, not a delayed
  // canplaythrough event which can cause unexpected restarts.
  audio.addEventListener("ended", () => {
    if (currentAudio === audio) currentAudio = null;
  }, { once: true });
  audio.addEventListener("error", () => {
    if (currentAudio === audio) {
      currentAudio = null;
      fb("Audio tidak dapat dimainkan. Cuba tekan semula.", 0);
    }
  }, { once: true });
  const request = audio.play();
  if (request && typeof request.catch === "function") {
    request.catch(() => {
      if (currentAudio === audio) {
        currentAudio = null;
        fb("Audio tidak dapat dimainkan. Cuba tekan semula.", 0);
      }
    });
  }
}

function stopSpeech() {
  if (!currentAudio) return;
  const audio = currentAudio;
  currentAudio = null;
  audio.pause();
  try { audio.currentTime = 0; } catch (e) {}
}

// =====================================================
// FEEDBACK
// =====================================================

function fb(text, goodFeedback) {

  const el =
    document.querySelector("#feedback");

  if (!el) return;

  el.textContent = text;

  el.className =
    `feedback ${
      goodFeedback
        ? "good"
        : "bad"
    }`;
}

function good() {

  const messages = [
    "⭐ Hebat! Jawapan kamu betul!",
    "🎉 Tahniah! Kamu berjaya!",
    "🌟 Bagus! Teruskan!",
    "🏆 Syabas! Jawapan tepat!"
  ];

  return messages[
    Math.floor(
      Math.random() *
      messages.length
    )
  ];
}

function bad() {

  const messages = [
    "💪 Hampir betul. Cuba sekali lagi!",
    "👂 Dengar semula dengan teliti.",
    "🌱 Cuba lagi. Kamu pasti boleh!",
        "🔊 Tekan DENGAR AUDIO dan cuba lagi."
  ];

  return messages[
    Math.floor(
      Math.random() *
      messages.length
    )
  ];
}

// =====================================================
// CP1
// =====================================================

function cp1(d, total) {

  shell(
    "Dengar dan pilih jawapan.",
    total,
    `
      <div class="activity-actions">

        <button
          class="audio-btn"
          id="listenBtn"
        >
          TEKAN UNTUK DENGAR
        </button>

      </div>

      <div class="picture-options">

        ${
          d.options
            .map(
              option => `
                <button
                  class="picture-option"
                  data-a="${option}"
                >
                  ${option}
                </button>
              `
            )
            .join("")
        }

      </div>
    `
  );

  const listenBtn =
    document.querySelector("#listenBtn");

listenBtn.onclick = () => {
  toggleQuestionAudio(d.audio);
};
  document
    .querySelectorAll(".picture-option")
    .forEach(button => {

      button.onclick = () => {

        if (
          button.dataset.a ===
          d.correct
        ) {

          fb(good(), 1);
          advance();
        }

        else {

          fb(bad(), 0);

        }
      };
    });
}

// =====================================================
// CP2
// =====================================================

function cp2(d, total) {

  shell(
    "Dengar dan lakukan.",
    total,
    `
      <div class="activity-actions">

        <button
          class="audio-btn"
          id="listenBtn"
        >
          TEKAN UNTUK DENGAR
        </button>

      </div>

      <div class="kitchen">

        <div class="drag-zone">

          ${
            d.items
              .map(
                item => `
                  <div
                    class="drag-item"
                    draggable="true"
                    data-value="${item[1]}"
                  >
                    ${item[0]}
                  </div>
                `
              )
              .join("")
          }

        </div>

        <div
          class="drop-zone"
          id="dropZone"
          data-target="${d.target[1]}"
        >
          ${d.target[0]}
        </div>

      </div>
    `
  );

  const listenBtn =
    document.querySelector("#listenBtn");

  listenBtn.onclick = () =>
    toggleQuestionAudio(d.audio);

  const items =
    document.querySelectorAll(
      ".drag-item"
    );

  const zone =
    document.querySelector(
      "#dropZone"
    );

  // Pointer Events: actual drag-and-drop is required on touch and mouse.
  let dragging = null;
  let ghost = null;
  items.forEach(item => {
    item.draggable = false;
    item.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      dragging = { item, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      item.setPointerCapture(event.pointerId);
      ghost = item.cloneNode(true);
      ghost.classList.add("drag-ghost");
      document.body.appendChild(ghost);
      ghost.style.left = event.clientX + "px";
      ghost.style.top = event.clientY + "px";
    });
    item.addEventListener("pointermove", event => {
      if (!dragging || dragging.id !== event.pointerId || dragging.item !== item) return;
      if (Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) > 12) dragging.moved = true;
      if (ghost) {
        ghost.style.left = event.clientX + "px";
        ghost.style.top = event.clientY + "px";
      }
      const bounds = zone.getBoundingClientRect();
      zone.classList.toggle("drag-over", event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom);
    });
    const finishDrag = event => {
      if (!dragging || dragging.id !== event.pointerId || dragging.item !== item) return;
      const bounds = zone.getBoundingClientRect();
      const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      const value = dragging.item.dataset.value;
      const moved = dragging.moved;
      dragging = null;
      if (ghost) { ghost.remove(); ghost = null; }
      zone.classList.remove("drag-over");
      if (event.type === "pointerup" && moved && inside) checkDrop(value);
    };
    item.addEventListener("pointerup", finishDrag);
    item.addEventListener("pointercancel", finishDrag);
  });

  function checkDrop(value) {

    if (
      value ===
      d.correct
    ) {

      fb(good(), 1);
      advance();
    }

    else {

      fb(bad(), 0);

    }
  }
}

// =====================================================
// TEXT NORMALIZATION
// =====================================================

function norm(text = "") {

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


// =====================================================
// VOICE ACTIVITIES
// Misi 3, Misi 4 dan Misi 5
// =====================================================


/* Offline-only oral practice: record locally and ask the teacher to check.
   Without Internet there is no guaranteed automatic Safari speech scoring. */
let offlineRecorder=null, offlineVoiceStream=null, offlineVoiceUrl=null, offlineVoiceToken=0;
function stopOfflineVoice(silent=true) {
  if(silent)offlineVoiceToken++;
  const r=offlineRecorder; offlineRecorder=null;
  if(r && r.state==="recording"){try{r.stop();}catch(e){}}
  if(offlineVoiceStream){
    offlineVoiceStream.getTracks().forEach(t=>t.stop());
    offlineVoiceStream=null;
  }
  if(silent && offlineVoiceUrl){URL.revokeObjectURL(offlineVoiceUrl);offlineVoiceUrl=null;}
  if(silent){isRecording=false;setRecordButton(false);}
}
async function handleOfflineVoiceButton() {
  if(offlineRecorder?.state==="recording"){offlineRecorder.stop();return;}
  if(typeof MediaRecorder==="undefined"||!navigator.mediaDevices?.getUserMedia){
    setStatus("⚠️ Pelayar tidak menyokong rakaman suara luar talian.");return;
  }
  stopSpeech();
  stopOfflineVoice(true);
  const token=++offlineVoiceToken, mission=game.modalCheckpoint, question=activityIndex;
  document.querySelector("#offlineVoiceReview")?.replaceChildren();
  setStatus("🎙️ Meminta kebenaran mikrofon...");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(token!==offlineVoiceToken||mission!==game.modalCheckpoint||question!==activityIndex){
      stream.getTracks().forEach(t=>t.stop());return;
    }
    offlineVoiceStream=stream;
    const recorder=new MediaRecorder(stream),chunks=[];
    offlineRecorder=recorder;
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(offlineVoiceStream===stream)offlineVoiceStream=null;
      if(offlineRecorder===recorder)offlineRecorder=null;
      isRecording=false;setRecordButton(false);
      setMicIndicator(false,"🎤 Rakaman tamat");
      if(token!==offlineVoiceToken||mission!==game.modalCheckpoint||question!==activityIndex)return;
      const blob=new Blob(chunks,{type:recorder.mimeType||"audio/mp4"});
      if(!blob.size){setStatus("⚠️ Tiada audio. Cuba rakam semula.");return;}
      if(offlineVoiceUrl)URL.revokeObjectURL(offlineVoiceUrl);
      offlineVoiceUrl=URL.createObjectURL(blob);
      const panel=document.querySelector("#offlineVoiceReview");if(!panel)return;
      panel.replaceChildren();
      const intro=document.createElement("p");
      intro.textContent="📴 Rakaman disimpan pada peranti. Guru dengar dan semak jawapan dahulu; sistem tidak menilai suara secara automatik ketika offline.";
      const playback=document.createElement("audio");
      playback.controls=true;playback.src=offlineVoiceUrl;playback.style.maxWidth="100%";
      const approve=document.createElement("button");
      approve.className="primary-btn";approve.textContent="✅ GURU SAHKAN JAWAPAN BETUL";
      approve.onclick=()=>{
        if(token!==offlineVoiceToken||mission!==game.modalCheckpoint||question!==activityIndex)return;
        stopOfflineVoice(true);
        advance();
      };
      const retry=document.createElement("button");
      retry.className="record-btn";retry.textContent="🎤 RAKAM SEMULA";
      retry.onclick=handleOfflineVoiceButton;
      panel.append(intro,playback,approve,retry);
      setStatus("Rakaman siap. Sila minta guru semak dan sahkan jawapan.");
    };
    recorder.start();
    isRecording=true;setRecordButton(true);
    setMicIndicator(true,"🎤 Mikrofon aktif — rakaman offline");
    setStatus("🎙️ Sedang merakam. Tekan BERHENTI apabila selesai.");
  }catch(e){
    if(token===offlineVoiceToken){
      stopOfflineVoice(true);
      setStatus("⚠️ Mikrofon tidak dapat dibuka. Benarkan akses mikrofon dan cuba lagi.");
    }
  }
}

function renderVoice(
  d,
  total,
  title,
  isCP4 = false,
  isCP5 = false
) {

  // Pastikan Soalan 2 Misi 3 tidak mewarisi mod audio panggilan
  // daripada sesi mikrofon Soalan 1.
  if (game.modalCheckpoint === 3) {
    setAudioPlaybackMode();
  }

  const audioText = "TEKAN UNTUK DENGAR";

  shell(
    title,
    total,
    `
      <div class="activity-actions">

        <button
          class="audio-btn"
          id="listenBtn"
        >
          ${audioText}
        </button>

      </div>

      ${
        isCP4
          ? `
            <div class="goods">
              🧂 🥕 🥣 🍎
            </div>
          `
          : ""
      }

      <div
        id="micIndicator"
        class="mic-indicator"
      >
        🎤 Mikrofon belum aktif
      </div>

      <div class="activity-actions">

        <button
          class="record-btn"
          id="recordBtn"
        >
          TEKAN UNTUK RAKAM
        </button>

      </div>

      <div
        id="statusLine"
        class="status-line"
      ></div>

      <div
        id="transcript"
        class="transcript"
      >
      </div>
      ${!navigator.onLine ? '<div id="offlineVoiceReview" class="offline-voice-review" style="display:grid;gap:8px;padding:12px;margin:10px 0;border:2px solid #8ab1b1;border-radius:12px;background:#e7f8f5"><p>📴 Mod luar talian: jawapan lisan dirakam dan disemak oleh guru.</p></div>' : ''}
    `
  );

  const listenBtn =
    document.querySelector(
      "#listenBtn"
    );

  const recordBtn =
    document.querySelector(
      "#recordBtn"
    );

  listenBtn.onclick = () => {
  if (offlineRecorder?.state==="recording") {
    setStatus("🎤 Hentikan rakaman dahulu.");
    return;
  }
  if (recognition) {
    stopRecognition(true);
    setStatus("⏳ Mikrofon dihentikan. Tekan DENGAR AUDIO sekali lagi jika perlu.");
    return;
  }
  toggleQuestionAudio(d.audio);
};

  /*
    PENTING UNTUK MOBILE:
    SpeechRecognition dimulakan terus
    daripada tindakan pengguna menekan butang.
  */

recordBtn.onclick = () => {
  if (!navigator.onLine) {
    handleOfflineVoiceButton();
    return;
  }

  // ===================================================
  // JIKA SEDANG MERAKAM
  // ===================================================

  if (isRecording) {

    stopRecognition(false);
    return;

  }


  // Semua misi lisan menggunakan satu laluan rakaman.
  // Jangan abort sesi iPhone secara paksa sebelum startRecognition.
  startRecognition(d, isCP4, isCP5);
};
}


// =====================================================
// SPEECH RECOGNITION HELPERS
// =====================================================

function getSpeechRecognition() {

  return (
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    null
  );
}


function setMicIndicator(
  active,
  text
) {

  const indicator =
    document.querySelector(
      "#micIndicator"
    );

  if (!indicator) return;

  indicator.textContent =
    text;

  indicator.classList.toggle(
    "active",
    !!active
  );
}


function setRecordButton(
  recording
) {

  const button =
    document.querySelector(
      "#recordBtn"
    );

  if (!button) return;

  if (recording) {

    button.textContent =
      "TEKAN UNTUK BERHENTI";

    button.classList.add(
      "recording"
    );

  }

  else {

    button.textContent =
      "TEKAN UNTUK RAKAM";

    button.classList.remove(
      "recording"
    );

  }
}


function setStatus(
  text = ""
) {

  const el =
    document.querySelector(
      "#statusLine"
    );

  if (!el) return;

  el.textContent =
    text;
}


// Normalize a small, known set of English ASR outputs into Malay display text.
// This does not translate arbitrary speech or override the learner's meaning.
function malayTranscript(text = "") {
  const words = {
    apple: "epal", apples: "epal", carrot: "lobak", carrots: "lobak",
    corn: "jagung", fish: "ikan", chicken: "ayam", cat: "kucing",
    egg: "telur", eggs: "telur", salt: "garam", bowl: "mangkuk",
    spoon: "sudu", fork: "garpu", knife: "pisau", book: "buku",
    ball: "bola", field: "padang", soap: "sabun", soy: "soya"
  };
  return text.replace(/\\b[a-z]+\\b/gi, word => {
    const translated = words[word.toLowerCase()];
    return translated ? (word[0] === word[0].toUpperCase() ? translated[0].toUpperCase() + translated.slice(1) : translated) : word;
  });
}

function setTranscript(
  text = ""
) {

  const el =
    document.querySelector(
      "#transcript"
    );

  if (!el) return;

  el.textContent =
    malayTranscript(text);
}


// =====================================================
// SPEECH RECOGNITION STATE
// SIMPLE VERSION — SAME APPROACH AS MIC TEST
// =====================================================

let recognitionSession = 0;
let recognitionShouldStop = false;
let recognitionEvaluated = false;
let recognitionCloseTimer = null;
let recognitionStartTimer = null;
function clearRecognitionTimers() {
  if (recognitionCloseTimer) clearTimeout(recognitionCloseTimer);
  if (recognitionStartTimer) clearTimeout(recognitionStartTimer);
  recognitionCloseTimer = null;
  recognitionStartTimer = null;
}

let currentVoiceData = null;
let currentVoiceIsCP4 = false;
let currentVoiceIsCP5 = false;


// =====================================================
// START RECOGNITION
// =====================================================

function startRecognition(
  d,
  isCP4 = false,
  isCP5 = false
) {

  const SR = getSpeechRecognition();

  if (!SR) {

    setStatus(
      "⚠️ Rakaman suara tidak disokong oleh pelayar ini."
    );

    return;
  }


  // Misi 3–5: jangan bertindih dengan sesi SpeechRecognition lama.
  // Rujukan hanya dilepaskan dalam onend, selepas Safari menutupnya.
  if (recognition) {
    setStatus("⏳ Mikrofon sebelumnya sedang ditutup. Tunggu sebentar dan cuba lagi.");
    console.info("[PeTara Voice] previous session still closing", {
      mission: game.modalCheckpoint,
      question: activityIndex + 1
    });
    return;
  }
  clearRecognitionTimers();

  // Hentikan semua audio permainan sebelum meminta input mikrofon iPhone.
  stopSpeech();
  stopSuccessCheer();

  // Hentikan sorakan yang mungkin masih dimainkan ketika Soalan 2 bermula.
  // Audio media yang masih aktif boleh mengganggu pembukaan input iPhone.
  if (petaraSuccessAudio) {
    try {
      petaraSuccessAudio.pause();
      petaraSuccessAudio.currentTime = 0;
    } catch (e) {}
  }

  // Simpan soalan semasa
  currentVoiceData = d;
  currentVoiceIsCP4 = isCP4;
  currentVoiceIsCP5 = isCP5;


  // Reset rakaman
  finalTranscript = "";
  interimTranscript = "";
  lastVisibleVoiceTranscript = "";

  recognitionShouldStop = false;
  recognitionEvaluated = false;

  recognitionSession++;

  const thisSession =
    recognitionSession;
  const thisMission = game.modalCheckpoint;
  const thisQuestion = activityIndex;


  // Gunakan mod rakaman iPhone yang sama untuk semua misi lisan.
  // Audio soalan tetap menggunakan playback melalui fungsi speak().
  if (game.modalCheckpoint >= 3 && game.modalCheckpoint <= 5) {
    setMission3RecordingMode();
  }

  // Recognition BARU setiap kali tekan MULA RAKAM
  const r =
    new SR();

  recognition = r;


  // Sama seperti UJI MIKROFON
  r.lang = "ms-MY";
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 5;


  setTranscript("");

  setStatus(
    "🎙️ Membuka mikrofon..."
  );

  setMicIndicator(
    true,
    "🎤 Membuka mikrofon..."
  );


  // ===================================================
  // START
  // ===================================================

  r.onaudiostart = () => {
    if (thisSession !== recognitionSession) return;
    if (recognitionStartTimer) clearTimeout(recognitionStartTimer);
    recognitionStartTimer = null;
    if (game.modalCheckpoint === 3) {
      console.info("[PeTara M3] audio input started", { question: activityIndex + 1, session: thisSession });
      setStatus("🎤 Input audio aktif. Sila bercakap.");
      setMicIndicator(true, "🎤 Input audio aktif — sila bercakap");
    }
  };

  r.onsoundstart = () => {
    if (thisSession !== recognitionSession) return;
    if (game.modalCheckpoint === 3) {
      console.info("[PeTara M3] sound detected", { question: activityIndex + 1, session: thisSession });
      setStatus("🔉 Bunyi diterima. Sedang mengenal pasti pertuturan...");
    }
  };

  r.onaudioend = () => {
    if (thisSession !== recognitionSession) return;
    if (game.modalCheckpoint === 3) {
      console.info("[PeTara M3] audio input ended", { question: activityIndex + 1, session: thisSession });
    }
  };

  r.onstart = () => {

    if (
      thisSession !== recognitionSession
    ) {
      return;
    }
    if (recognitionStartTimer) clearTimeout(recognitionStartTimer);
    recognitionStartTimer = null;

    if (game.modalCheckpoint >= 3 && game.modalCheckpoint <= 5) {
      console.info("[PeTara Voice] recognition started", { mission: game.modalCheckpoint, question: activityIndex + 1, session: thisSession });
    }

    isRecording = true;

    setRecordButton(true);

    setMicIndicator(
      true,
      game.modalCheckpoint === 3
        ? "🎙️ Sesi bermula — menunggu input audio..."
        : "🎙️ Mikrofon aktif — sedang mendengar..."
    );

    setStatus(
      game.modalCheckpoint === 3
        ? "⏳ Menunggu input audio daripada iPhone..."
        : "Saya sedang mendengar..."
    );
  };


  // ===================================================
  // SPEECH START
  // ===================================================

  r.onspeechstart = () => {

    if (
      thisSession !== recognitionSession
    ) {
      return;
    }

    if (game.modalCheckpoint === 3) {
      console.info("[PeTara M3] speech detected", { question: activityIndex + 1, session: thisSession });
    }

    setMicIndicator(
      true,
      "🗣️ Suara dikesan"
    );

    setStatus(
      "🗣️ Suara sedang dikesan..."
    );
  };


  // ===================================================
  // RESULT
  // ===================================================

  r.onresult = event => {

    if (
      thisSession !== recognitionSession
    ) {
      return;
    }

    if (game.modalCheckpoint === 3) {
      console.info("[PeTara M3] recognition result received", { question: activityIndex + 1, session: thisSession });
    }

    let finalText = "";
    let interimText = "";


    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {

      const result =
        event.results[i];

      const text =
        result[0].transcript;


      if (result.isFinal) {

        finalText +=
          " " + text;

      } else {

        interimText +=
          " " + text;
      }
    }


    if (finalText) {

      finalTranscript +=
        " " + finalText;
    }


    interimTranscript =
      interimText;


    const display =
      (
        finalTranscript +
        " " +
        interimTranscript
      )
        .replace(/\s+/g, " ")
        .trim();


    if (display) {

      lastVisibleVoiceTranscript = display;
      setTranscript(display);

      setStatus(
        "✅ Suara dikesan."
      );

      setMicIndicator(
        true,
        "🗣️ Suara dikesan"
      );
    }
  };


  // ===================================================
  // ERROR
  // ===================================================

  r.onerror = event => {

    if (
      thisSession !== recognitionSession
    ) {
      return;
    }
    if (recognitionStartTimer) clearTimeout(recognitionStartTimer);
    recognitionStartTimer = null;

    if (game.modalCheckpoint >= 3 && game.modalCheckpoint <= 5) {
      console.warn("[PeTara Voice] recognition error", { mission: game.modalCheckpoint, question: activityIndex + 1, session: thisSession, code: event.error });
    }

    if (
      event.error === "aborted"
    ) {
      return;
    }


    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {

      setStatus(
        "⚠️ Sila benarkan akses mikrofon."
      );

      return;
    }


    if (
      event.error === "no-speech"
    ) {

      setStatus(
        "🎤 Suara belum dapat dikesan. Tekan MULA RAKAM dan cuba lagi."
      );

      return;
    }


    if (
      event.error === "audio-capture"
    ) {

      setStatus(
        "⚠️ Mikrofon tidak dapat digunakan. Cuba sekali lagi."
      );

      return;
    }


    setStatus(
      "⚠️ Rakaman terganggu. Cuba sekali lagi."
    );
  };


  // ===================================================
  // END
  // ===================================================

 r.onend = () => {

    // Sesi lama tidak boleh menukar mod audio sesi baharu.
    if (
      thisSession !== recognitionSession
    ) {
      return;
    }
    clearRecognitionTimers();

    if (game.modalCheckpoint === 3) {
      console.info("[PeTara M3] recognition ended", {
        question: activityIndex + 1,
        session: thisSession,
        hadTranscript: Boolean((finalTranscript + interimTranscript).trim())
      });
    }

    // Browser speech engines can end on silence even in continuous mode.
    // Retry while the learner has not manually stopped; never evaluate early.
    if (!recognitionShouldStop && game.modalCheckpoint === thisMission && activityIndex === thisQuestion) {
      try {
        r.start();
        setStatus("🎙️ Mikrofon bersambung — tekan untuk berhenti apabila selesai.");
        return;
      } catch (err) {
        setStatus("⚠️ Pelayar menghentikan mikrofon. Tekan UNTUK RAKAM untuk menyambung.");
      }
    }
    if (recognition === r) {
      recognition = null;
    }

    // Kekalkan pembaikan earpiece: playback selepas sesi ditutup.
    setAudioPlaybackMode();

    // Callback lama tidak boleh menilai jawapan atau menulis pada
    // soalan/misi baharu selepas pengguna menutup atau menukar skrin.
    if (game.modalCheckpoint !== thisMission || activityIndex !== thisQuestion) {
      console.info("[PeTara Voice] ignoring stale end event", { mission: thisMission, question: thisQuestion + 1 });
      return;
    }

    isRecording = false;
    setRecordButton(false);

    setMicIndicator(
      false,
      "🎤 Mikrofon tidak aktif"
    );


    const heard =
      (
        finalTranscript +
        " " +
        interimTranscript
      )
        .replace(/\s+/g, " ")
        .trim();


    // Nilai jawapan hanya selepas murid menekan butang berhenti.
    if (heard && recognitionShouldStop) {

      if (!recognitionEvaluated) {

        recognitionEvaluated = true;

        evaluateVoiceResponse(
          currentVoiceData,
          currentVoiceIsCP4,
          currentVoiceIsCP5
        );
      }

      return;
    }


    // Tiada suara
    if (!recognitionShouldStop) {

      setStatus(
        "🎤 Suara belum dapat dikesan. Tekan MULA RAKAM dan cuba lagi."
      );
    }
  };


  // ===================================================
  // MULAKAN
  // ===================================================

try {

  r.start();
  // If Safari never signals start/end, release the blocked session.
  recognitionStartTimer = setTimeout(() => {
    if (recognition !== r || thisSession !== recognitionSession) return;
    try { r.stop(); } catch (e) {}
    recognition = null;
    recognitionSession++;
    isRecording = false;
    setRecordButton(false);
    setMicIndicator(false, "🎤 Mikrofon tidak aktif");
    setStatus("⚠️ Mikrofon iPhone belum dibuka. Semak kebenaran mikrofon Safari dan tekan RAKAM semula.");
    setAudioPlaybackMode();
  }, 6500);

} catch (err) {

  setAudioPlaybackMode();

    recognition = null;
    isRecording = false;

    setRecordButton(false);

    setMicIndicator(
      false,
      "🎤 Mikrofon tidak aktif"
    );

    console.warn("[PeTara Voice] start failed", { mission: game.modalCheckpoint, question: activityIndex + 1, error: String(err) });
    setStatus("⚠️ Rakaman gagal dimulakan. Cuba tekan MULA RAKAM sekali lagi.");
  }
}





// =====================================================
// STOP RECOGNITION
// =====================================================

function stopRecognition(silent = false) {
  if (offlineRecorder || offlineVoiceStream || (silent && offlineVoiceUrl)) {
    stopOfflineVoice(silent);
  }

  const r = recognition;

  // ===================================================
  // TIADA RECOGNITION YANG SEDANG AKTIF
  // ===================================================

  if (!r) {

    clearRecognitionTimers();
    isRecording = false;

    setRecordButton(false);

    if (silent) {
      finalTranscript = "";
         interimTranscript = "";
    }

    return;
  }


  // ===================================================
  // TUKAR SOALAN / KELUAR MISI
  // ===================================================

  if (silent) {

    recognitionShouldStop = true;
    recognitionEvaluated = true;

    /*
      PENTING UNTUK IPHONE / SAFARI:

      Jangan:
      - abort()
      - buang onend
      - terus recognition = null

      Biarkan WebKit tutup sesi sendiri.
    */

    try {

      r.stop();
      // Safari may omit onend when the screen changes during microphone startup.
      if (recognitionCloseTimer) clearTimeout(recognitionCloseTimer);
      recognitionCloseTimer = setTimeout(() => {
        if (recognition !== r) return;
        recognition = null;
        recognitionSession++;
        isRecording = false;
        setRecordButton(false);
        setMicIndicator(false, "🎤 Mikrofon tidak aktif");
        setAudioPlaybackMode();
      }, 1200);

    } catch (e) {

      if (recognition === r) {
        recognition = null;
      }

      isRecording = false;

      finalTranscript = "";
      interimTranscript = "";

      setRecordButton(false);

      setMicIndicator(
        false,
        "🎤 Mikrofon tidak aktif"
      );
    }

    return;
  }


  // ===================================================
  // MURID TEKAN BERHENTI RAKAM
  // ===================================================

  recognitionShouldStop = true;

  setStatus(
    "⏳ Memproses rakaman..."
  );

  setMicIndicator(
    false,
    "⏹️ Rakaman dihentikan"
  );

  try {

    r.stop();

  } catch (e) {

    if (recognition === r) {
      recognition = null;
    }

    isRecording = false;

    setRecordButton(false);

    const heard =
      (
        finalTranscript +
        " " +
        interimTranscript
      )
        .replace(/\s+/g, " ")
        .trim();

    if (
      heard &&
      !recognitionEvaluated
    ) {

      recognitionEvaluated = true;

      evaluateVoiceResponse(
        currentVoiceData,
        currentVoiceIsCP4,
        currentVoiceIsCP5
      );

    } else if (!heard) {

      setStatus(
        "🎤 Suara belum dapat dikesan. Tekan MULA RAKAM dan cuba lagi."
      );
    }
  }
}

// =====================================================
// VOICE RESPONSE EVALUATION
// =====================================================


/* Semakan jawapan lisan baharu hanya untuk Misi 3 S1–S2 dan Misi 4 S1–S2.
   Padankan perkataan lengkap: "beli" tidak tersalah padan "beliau". */
function voiceContainsPhrase(spoken, phrase) {
  const words = norm(spoken).split(" ").filter(Boolean);
  const target = norm(phrase).split(" ").filter(Boolean);
  return target.length > 0 && words.some((word, i) =>
    word === target[0] && target.every((t, j) => words[i + j] === t)
  );
}
function voiceMatchesRequiredGroups(spoken, groups) {
  return groups.every(group => group.some(word => voiceContainsPhrase(spoken, word)));
}
function voiceHasAffirmativeHelpOrPurchase(spoken, actions) {
  // Jangan terima ayat menolak bantuan atau pembelian.
  if (["tidak", "tak", "bukan", "jangan", "enggan", "belum", "x"].some(word =>
    voiceContainsPhrase(spoken, word))) return false;
  const words = norm(spoken).split(" ").filter(Boolean);
  // Elakkan jawapan satu atau dua perkataan sahaja.
  if (words.length < 3) return false;
  const agreed = ["ya", "boleh", "baik", "sudah tentu"].some(word =>
    voiceContainsPhrase(spoken, word)) ||
    ["saya akan", "aku akan", "kami akan"].some(word =>
      voiceContainsPhrase(spoken, word));
  return agreed && actions.some(word => voiceContainsPhrase(spoken, word));
}

function evaluateVoiceResponse(
  d,
  isCP4 = false,
  isCP5 = false
) {

  const raw =
    (
      finalTranscript +
      " " +
      interimTranscript
    ).trim();


  let spoken =
    norm(malayTranscript(raw));

  // Misi 3 Soalan 1 only: Safari may revise its interim result as recording
  // closes. If the last displayed transcript already has all three required
  // words, evaluate that same visible answer instead of an incomplete revision.
  if (game.modalCheckpoint === 3 && activityIndex === 0 &&
      Array.isArray(d?.requiredGroups) && lastVisibleVoiceTranscript) {
    const visible = norm(malayTranscript(lastVisibleVoiceTranscript));
    if (voiceMatchesRequiredGroups(visible, d.requiredGroups)) {
      spoken = visible;
    }
  }


  // ===================================================
  // TIADA SUARA
  // ===================================================

  if (!spoken) {

    setTranscript(
      "Tiada suara yang dapat dikenal pasti."
    );


    setStatus(
      "🎤 Suara belum dapat dikesan. Sila cuba rakam sekali lagi."
    );


    fb(
      "🎤 Cuba rakam sekali lagi.",
      0
    );


    return;
  }


  setTranscript(
    spoken === norm(malayTranscript(raw)) ? raw : lastVisibleVoiceTranscript
  );


  let correct =
    false;


  // Misi 3 Soalan 1–2: semua kumpulan kata kunci mesti dipenuhi.
  if (Array.isArray(d.requiredGroups)) {
    correct = voiceMatchesRequiredGroups(spoken, d.requiredGroups);
  }

  // Misi 4 Soalan 1–2: jawapan mesti menunjukkan persetujuan DAN tindakan.
  else if (Array.isArray(d.responseAction)) {
    correct = voiceHasAffirmativeHelpOrPurchase(spoken, d.responseAction);
  }


  // ===================================================
  // MISI 4 SOALAN 3 / MISI 5
  // Semua keyword perlu ada
  // ===================================================

  else if (
    Array.isArray(
      d.all
    )
  ) {

    correct =
      d.all.every(
        keyword =>
          spoken.includes(
            norm(keyword)
          )
      );

  }


  // ===================================================
  // BETUL
  // ===================================================

  if (correct) {

    setStatus(
      "✅ Respons diterima."
    );


    fb(
      good(),
      1
    );


    advance();

  }


  // ===================================================
  // SALAH
  // ===================================================

  else {

    setStatus(
      "🔄 Cuba berikan respons sekali lagi."
    );


    fb(
      isCP5
        ? "👂 Dengar ayat semula dan cuba sebut dengan lebih lengkap."
        : isCP4
          ? "🗣️ Dengar semula dan berikan respons yang sesuai."
          : "👂 Dengar semula dan cuba jawab sekali lagi.",
      0
    );

  }
}


// =====================================================
// ADVANCE ACTIVITY
// =====================================================

function advance() {

  stopSpeech();
  stopSuccessCheer();

  // Jawapan lisan dinilai selepas onend melepaskan recognition.
  // Jangan hentikan atau reset sesi yang sudah tamat sekali lagi.
  if (recognition) {
    stopRecognition(true);
  }

  const id =
    game.modalCheckpoint;

  if (!id) return;

  celebrateAnswer(activityIndex + 1 < CP[id].length);

  /*
    CP4 memberikan 10 markah selepas
    keseluruhan misi selesai.

    Checkpoint lain memberikan
    10 markah bagi setiap aktiviti.
  */

  if (id !== 4) {

    game.score += 10;

    updateHUD();
  }

  // Commit the NEXT unanswered question immediately, before the celebration delay.
  // This also handles leaving/reloading in the six seconds after a correct answer.
  if (activityIndex + 1 < CP[id].length) {
    saveGameProgress(id, activityIndex + 1);
  } else {
    const completed = [...new Set([...game.completedCheckpoints, id])];
    saveGameProgress(id < 5 ? id + 1 : 6, 0, completed,
                     game.score + (id === 4 ? 10 : 0));
  }

  const navigationToken = missionNavigationToken;
  window.setTimeout(
    () => {
      if (navigationToken !== missionNavigationToken || game.modalCheckpoint !== id) return;

      activityIndex += 1;

      if (
        activityIndex <
        CP[id].length
      ) {

        renderActivity(id);

      }

      else {

        completeCP(id);

      }
    },
    6000
  );
}


// =====================================================
// ANSWER CELEBRATION — applause, cheerful crowd and star rain
// Triggered for each correct answer, including the final question.
// =====================================================
// Success sound disabled at the user's request.
// Keep the visual celebration without playing any success audio.
let petaraSuccessAudio = null;
let petaraCheerTimer = null;
function stopSuccessCheer() {
  if (petaraCheerTimer) clearTimeout(petaraCheerTimer);
  petaraCheerTimer = null;
  if (petaraSuccessAudio) {
    petaraSuccessAudio.pause();
    try { petaraSuccessAudio.currentTime = 0; } catch (e) {}
  }
}
function playSuccessCheer() {
  try {
    if (!petaraSuccessAudio) {
      petaraSuccessAudio = new Audio("assets/audio/kids_cheering.mp3");
      petaraSuccessAudio.preload = "auto";
      petaraSuccessAudio.volume = 1;
    }
    stopSuccessCheer();
    petaraSuccessAudio.play().catch(error => {
      console.log("Success audio playback unavailable", error);
    });
    // Mainkan keseluruhan audio pada penamat tanpa pemasa pemotongan.
  } catch (error) {
    console.log("Success audio unavailable", error);
  }
}

function celebrateAnswer(hasNextQuestion = true) {
  stopSuccessCheer();
  stopSpeech();
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "99999",
    overflow: "hidden", pointerEvents: "auto",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(5, 10, 23, 0.69)"
  });
  const style = document.createElement("style");
  style.textContent = `@keyframes petaraStarRain {
    0% { transform:translate3d(0,-35px,0) rotate(0deg) scale(.5); opacity:0 }
    12% { opacity:1 }
    85% { opacity:1 }
    100% { transform:translate3d(var(--drift),110vh,0) rotate(var(--spin)) scale(.85); opacity:0 }
  }
  @keyframes petaraStarPop {
    0% { opacity:0; transform:scale(.96) }
    35% { opacity:1; transform:scale(1) }
    100% { opacity:1; transform:scale(1) }
  }`;
  overlay.appendChild(style);
  const reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced) {
    const symbols = ["⭐", "🌟", "✦", "✧", "✨"];
    for (let i = 0; i < 185; i++) {
      const star = document.createElement("span");
      star.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      Object.assign(star.style, {
        position: "absolute",
        left: (Math.random() * 100) + "%",
        top: "-40px",
        fontSize: (10 + Math.random() * 23) + "px",
        lineHeight: "1",
        filter: "drop-shadow(0 0 5px #ffd24a)",
        "--drift": (Math.random() * 170 - 85) + "px",
        "--spin": (Math.random() * 900 - 450) + "deg",
        animation: `petaraStarRain ${2.5 + Math.random() * 2.4}s linear ${Math.random() * 2.1}s infinite`
      });
      overlay.appendChild(star);
    }
  }
  const message = document.createElement("div");
  message.innerHTML = '⭐ SYABAS! ⭐<div style="font-size:clamp(17px,3vw,24px);margin-top:12px">Jawapan anda tepat!</div><div style="font-size:clamp(15px,2.6vw,21px);margin-top:20px;color:#ffe7a3">' + (hasNextQuestion ? 'Bersedia menjawab soalan seterusnya.' : 'Bersedia meneruskan pengembaraan!') + '</div>';
  Object.assign(message.style, {
    position: "relative", textAlign: "center",
    color: "white", fontFamily: "system-ui,sans-serif",
    fontWeight: "900", fontSize: "clamp(42px,10vw,100px)",
    textShadow: "0 3px 7px #000,0 0 12px #ffcf45",
    animation: "petaraStarPop .25s ease-out",
    background: "rgba(12, 23, 45, .40)", padding: "clamp(24px,5vw,70px)", borderRadius: "28px",
    maxWidth: "94vw", whiteSpace: "normal"
  });
  overlay.appendChild(message);
  document.body.appendChild(overlay);
  window.setTimeout(() => { message.style.transition = "opacity .2s"; message.style.opacity = "0"; }, 5700);
  window.setTimeout(() => overlay.remove(), 6000);
}

// =====================================================
// COMPLETE CHECKPOINT
// =====================================================

function completeCP(id) {

  stopSpeech();

  stopRecognition(true);

  if (
    !game.completedCheckpoints.includes(
      id
    )
  ) {

    game.completedCheckpoints.push(
      id
    );
  }

  /*
    Misi 4:
    +10 selepas seluruh misi selesai.
  */

  if (id === 4) {

    game.score += 10;

  }

  if (id < 5) {

    game.currentCheckpoint =
      id + 1;

  }

  else {

    game.currentCheckpoint =
      6;

  }

  updateHUD();

  refreshCheckpointGraphics();

  // Progress remains available only through HOME during this open game.
  if (id === 5) {
    currentSessionProgress = null;
  } else {
    saveGameProgress(game.currentCheckpoint, 0);
  }

  activityArea.innerHTML = `

    <div class="instruction-screen">

      <div class="instruction-icon">
        ⭐
      </div>

      <h3>
        Misi ${id} Selesai!
      </h3>

      <p>
        Syabas! Kamu telah berjaya
        menyelesaikan Misi ${id}.
      </p>

      <div class="activity-actions">

        <button
          id="continueMapBtn"
          class="primary-btn"
        >
          🗺️ KEMBALI KE PETA
        </button>

      </div>

    </div>
  `;

  const continueMapBtn =
    document.querySelector(
      "#continueMapBtn"
    );

  continueMapBtn.onclick = () => {

    modal.classList.add(
      "hidden"
    );
    petaraMusic.mission(false);

    game.modalCheckpoint =
      null;

    handleInteraction();
  };
}


// =====================================================
// MOBILE INTERACTION BUTTON
// =====================================================

interactBtn.addEventListener(
  "pointerup",
  event => {

    event.preventDefault();

    interact();

  }
);


// =====================================================
// RESULT
// =====================================================

function showResults() {

  stopSpeech();

  stopRecognition(true);

  document
    .querySelector("#resultText")
    .textContent =
      `${game.studentName} telah berjaya menamatkan Kembara Si PeTaRa!`;

  document
    .querySelector("#resultScore")
    .textContent = "⭐⭐⭐⭐⭐";

  resultModal.classList.remove(
    "hidden"
  );
  if (game.completedCheckpoints.length === 5) playSuccessCheer();
}


document
  .querySelector("#restartBtn")
  .addEventListener(
    "click",
    () => {
      currentSessionProgress = null;
      location.reload();
    }
  );


document
  .querySelector("#homeBtn")
  .addEventListener(
    "click",
    () => {
      // Return directly to the existing map without resetting the player.
      // Keep the chosen avatar, name, score, completed missions and multiplayer session.
      stopSuccessCheer();
      resultModal.classList.add("hidden");
      startScreen.classList.add("hidden");
      if (prepScreen) prepScreen.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      updateHUD();
      resizeWorld();
      updateCamera();
    }
  );


// =====================================================
// KEYBOARD
// =====================================================

function setKey(
  key,
  down
) {

  const allowed = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "w",
    "a",
    "s",
    "d",
    "W",
    "A",
    "S",
    "D"
  ];

  if (
    !allowed.includes(key)
  ) {
    return;
  }

  down
    ? keys.add(
        key.toLowerCase()
      )
    : keys.delete(
        key.toLowerCase()
      );
}


window.addEventListener(
  "keydown",
  event => {

    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight"
      ].includes(
        event.key
      )
    ) {

      event.preventDefault();

    }

    if (
      (
        event.key === "e" ||
        event.key === "E"
      ) &&
      modal.classList.contains(
        "hidden"
      ) &&
      !gameScreen.classList.contains(
        "hidden"
      )
    ) {

      interact();

    }

    setKey(
      event.key,
      true
    );
  }
);


window.addEventListener(
  "keyup",
  event =>

    setKey(
      event.key,
      false
    )
);


// =====================================================
// D-PAD
// =====================================================

document
  .querySelectorAll(
    "#dpad button"
  )
  .forEach(button => {

    const key =
      button.dataset.key.toLowerCase();

    const on = event => {

      event.preventDefault();

      keys.add(key);

      button.classList.add(
        "pressed"
      );
    };


    const off = event => {

      event.preventDefault();

      keys.delete(key);

      button.classList.remove(
        "pressed"
      );
    };


    button.addEventListener(
      "pointerdown",
      on
    );


    button.addEventListener(
      "pointerup",
      off
    );


    button.addEventListener(
      "pointercancel",
      off
    );


    button.addEventListener(
      "pointerleave",
      off
    );

  });


// iOS Safari: consume touch gestures on the movement pad before the
// browser can turn a long press into text selection or a callout.
document.querySelectorAll("#dpad button").forEach(button => {
  button.addEventListener("touchstart", event => {
    if (event.cancelable) event.preventDefault();
    const key = button.dataset.key?.toLowerCase();
    if (key) keys.add(key);
    button.classList.add("pressed");
  }, { passive: false });
  const stopTouch = event => {
    if (event.cancelable) event.preventDefault();
    const key = button.dataset.key?.toLowerCase();
    if (key) keys.delete(key);
    button.classList.remove("pressed");
  };
  button.addEventListener("touchend", stopTouch, { passive: false });
  button.addEventListener("touchcancel", stopTouch, { passive: false });
});

// =====================================================
// PLAYER MOVEMENT
// =====================================================

function updatePlayer(time) {

  if (
    !modal.classList.contains(
      "hidden"
    ) ||
    !resultModal.classList.contains(
      "hidden"
    )
  ) {

    return;

  }


  let dx = 0;
  let dy = 0;


  if (
    keys.has("arrowleft") ||
    keys.has("a")
  ) {

    dx--;

  }


  if (
    keys.has("arrowright") ||
    keys.has("d")
  ) {

    dx++;

  }


  if (
    keys.has("arrowup") ||
    keys.has("w")
  ) {

    dy--;

  }


  if (
    keys.has("arrowdown") ||
    keys.has("s")
  ) {

    dy++;

  }


  game.player.moving =
    dx !== 0 ||
    dy !== 0;


  if (
    dx &&
    dy
  ) {

    dx *= 0.707;
    dy *= 0.707;

  }


  if (dy > 0) {

    game.player.direction =
      "down";

  }

  else if (dy < 0) {

    game.player.direction =
      "up";

  }

  else if (dx < 0) {

    game.player.direction =
      "left";

  }

  else if (dx > 0) {

    game.player.direction =
      "right";

  }


  game.player.x =
    Math.max(
      70,
      Math.min(
        MAP_W - 70,
        game.player.x +
          dx *
          game.player.speed
      )
    );


  game.player.y =
    Math.max(
      100,
      Math.min(
        MAP_H - 30,
        game.player.y +
          dy *
          game.player.speed
      )
    );


  if (
    game.player.moving &&
    time - lastAnim > 130
  ) {

    game.player.frame =
      (
        game.player.frame %
        4
      ) + 1;

    lastAnim =
      time;

  }


  // Use the EXACT selected avatar assets for every movement direction.
  applyAvatarArtwork(playerSprite, game.avatar, game.player.direction);
  playerSprite.classList.toggle("avatar-walking", Boolean(game.player.moving));


  player.style.left =
    game.player.x +
    "px";

  player.style.top =
    game.player.y +
    "px";
}


// =====================================================
// MOVING COMPASS ARROW — always points to the next mission
// =====================================================
const missionGuideArrow = document.createElement("div");
missionGuideArrow.id = "missionGuideArrow";
missionGuideArrow.setAttribute("aria-hidden", "true");
missionGuideArrow.innerHTML = '<span class="mission-guide-shaft"></span><span class="mission-guide-head"></span>';
world.appendChild(missionGuideArrow);

function updateMissionGuide(time) {
  const target = checkpoints.find(cp => cp.id === game.currentCheckpoint) ||
    (game.completedCheckpoints.length === 5 ? finish : null);

  if (!target || !modal.classList.contains("hidden") ||
      !resultModal.classList.contains("hidden")) {
    missionGuideArrow.style.display = "none";
    return;
  }

  const dx = target.x - game.player.x;
  const dy = target.y - game.player.y;
  const distance = Math.hypot(dx, dy);

  // Do not obscure the checkpoint once the character reaches it.
  if (distance < 100) {
    missionGuideArrow.style.display = "none";
    return;
  }

  const ux = dx / distance;
  const uy = dy / distance;
  const ahead = 91 + Math.sin(time / 270) * 6;
  missionGuideArrow.style.display = "flex";
  missionGuideArrow.style.left = (game.player.x + ux * ahead) + "px";
  missionGuideArrow.style.top = (game.player.y - 39 + uy * ahead) + "px";
  missionGuideArrow.style.transform =
    "translate(-50%, -50%) rotate(" + Math.atan2(dy, dx) + "rad)";
}

// =====================================================
// CAMERA
// =====================================================

function updateCamera() {

  const viewport =
    document.querySelector(
      "#worldViewport"
    );


  const vw =
    viewport.clientWidth;

  const vh =
    viewport.clientHeight;


  const scaledW =
    MAP_W *
    scale;

  const scaledH =
    MAP_H *
    scale;


  let tx =
    vw / 2 -
    game.player.x *
    scale;


  let ty =
    vh / 2 -
    game.player.y *
    scale;


  if (
    scaledW <= vw
  ) {

    tx =
      (
        vw -
        scaledW
      ) / 2;

  }

  else {

    tx =
      Math.min(
        0,
        Math.max(
          vw -
            scaledW,
          tx
        )
      );

  }


  if (
    scaledH <= vh
  ) {

    ty =
      (
        vh -
        scaledH
      ) / 2;

  }

  else {

    ty =
      Math.min(
        0,
        Math.max(
          vh -
            scaledH,
          ty
        )
      );

  }


  world.style.transform =
    `translate(${tx}px,${ty}px) scale(${scale})`;
}


// =====================================================
// RESPONSIVE WORLD
// =====================================================

function resizeWorld() {

  const viewport =
    document.querySelector(
      "#worldViewport"
    );


  const vw =
    viewport.clientWidth;

  const vh =
    viewport.clientHeight;


  const cover =
    Math.max(
      vw / MAP_W,
      vh / MAP_H
    );


  const portrait =
    vh > vw;


  const minimum =
    portrait
      ? 0.78
      : (
          vh <= 600
            ? 0.68
            : 0.72
        );


  scale =
    Math.max(
      minimum,
      cover
    );


  world.style.width =
    MAP_W +
    "px";

  world.style.height =
    MAP_H +
    "px";


  updateCamera();
}


window.addEventListener(
  "resize",
  resizeWorld
);


window.addEventListener(
  "orientationchange",
  () =>

    setTimeout(
      resizeWorld,
      180
    )
);


// =====================================================
// GAME LOOP
// =====================================================

function loop(time) {

  updatePlayer(time);
  if (window.__kspMultiplayerUpdate) window.__kspMultiplayerUpdate();

  updateMissionGuide(time);

  updateCamera();

  handleInteraction();

  requestAnimationFrame(
    loop
  );
}
// redeploy












/* Suppress browser selection/copy menus during gameplay.
   Preserve standard typing and caret controls in editable fields. */
(() => {
  const editable = el => Boolean(el?.closest?.('input, textarea, [contenteditable="true"]'));
  document.addEventListener('contextmenu', event => {
    if (!editable(event.target)) event.preventDefault();
  });
  document.addEventListener('selectstart', event => {
    if (!editable(event.target)) event.preventDefault();
  });
  document.addEventListener('dragstart', event => {
    if (!editable(event.target) && (event.target instanceof HTMLImageElement || event.target instanceof HTMLAnchorElement)) event.preventDefault();
  });
  document.addEventListener('copy', event => event.preventDefault());
  document.addEventListener('cut', event => event.preventDefault());
  document.addEventListener('paste', event => event.preventDefault());
})();
