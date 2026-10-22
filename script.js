const TOTAL_SECONDS = 10 * 60;
const locations = [...document.querySelectorAll(".location")];
const buildingView = document.querySelector("#buildingView");
const map = document.querySelector("#map");
const buildingTitle = document.querySelector("#buildingTitle");
const buildingSubtitle = document.querySelector("#buildingSubtitle");
const floorTabs = document.querySelector("#floorTabs");
const floorPlanTitle = document.querySelector("#floorPlanTitle");
const roomGrid = document.querySelector("#roomGrid");
const indoorStatus = document.querySelector("#indoorStatus");
const timerElement = document.querySelector("#timer");
const timerBar = document.querySelector("#timerBar");
const minutesLeftElement = document.querySelector("#minutesLeft");
const searchCountElement = document.querySelector("#searchCount");
const toast = document.querySelector("#mapToast");
const playerMarker = document.querySelector("#playerMarker");
const clueText = document.querySelector("#clueText");
const modal = document.querySelector("#resultModal");
const resultIcon = document.querySelector("#resultIcon");
const resultKicker = document.querySelector("#resultKicker");
const resultTitle = document.querySelector("#resultTitle");
const resultMessage = document.querySelector("#resultMessage");

const buildingLayouts = {
  教1: ["1F", "2F", "3F", "4F"],
  教2: ["1F", "2F", "3F", "4F"],
  教3: ["1F", "2F", "3F", "4F"],
  教4: ["1F", "2F", "3F", "4F"],
  科研楼: ["1F", "2F", "3F", "4F", "5F", "6F"],
  "科研楼会议室": ["3F"],
  "实验室 A-204": ["2F"],
  "实验室 B-301": ["3F"],
  老一食堂: ["1F", "2F"],
  老二食堂: ["1F", "2F"],
  矮子食堂: ["1F"],
  新1食堂: ["1F", "2F", "3F"],
  新2食堂: ["1F", "2F", "3F"],
};

const roomsByFloor = (floor) => [
  `${floor}-01`, `${floor}-02`, `${floor}-03`, `${floor}-04`,
  `${floor}-05`, `${floor}-06`, `${floor}-07`, `${floor}-08`,
];

let secondsRemaining = TOTAL_SECONDS;
let searchCount = 0;
let tutorLocation;
let gameOver = false;
let toastTimeout;
let activeBuilding = null;
let activeFloor = null;
const searchedRooms = new Set();

function chooseTutorLocation() {
  const location = locations[Math.floor(Math.random() * locations.length)];
  const building = location.dataset.location;
  const floors = buildingLayouts[building] || ["1F", "2F", "3F", "4F"];
  const floor = floors[Math.floor(Math.random() * floors.length)];
  const rooms = roomsByFloor(floor);
  tutorLocation = { building, floor, room: rooms[Math.floor(Math.random() * rooms.length)] };
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function updateTimer() {
  timerElement.textContent = formatTime(secondsRemaining);
  timerBar.style.width = `${(secondsRemaining / TOTAL_SECONDS) * 100}%`;
  minutesLeftElement.textContent = Math.ceil(secondsRemaining / 60);
  if (secondsRemaining <= 60) timerBar.style.background = "#c95135";
}

function finishGame(won) {
  gameOver = true;
  resultIcon.textContent = won ? "✓" : "!";
  resultIcon.style.background = won ? "var(--green)" : "var(--orange-dark)";
  resultKicker.textContent = won ? "MISSION COMPLETE" : "MISSION FAILED";
  resultTitle.textContent = won ? "顺利毕业" : "延毕";
  resultMessage.textContent = won
    ? `你在 ${searchCount} 个地点中找到了导师，签字完成，论文终于可以提交了。`
    : "10 分钟的签字窗口已经关闭。导师还在校园里，而你的论文只能等下一轮了。";
  modal.classList.remove("hidden");
}

function updateIndoorStatus() {
  const count = [...searchedRooms].filter((room) => room.startsWith(`${activeBuilding}/`)).length;
  indoorStatus.textContent = `${activeBuilding} 已搜索 ${count} 个房间`;
}

function renderRooms() {
  floorPlanTitle.textContent = `${activeFloor} · 房间分布`;
  roomGrid.innerHTML = "";
  roomsByFloor(activeFloor).forEach((room, index) => {
    const button = document.createElement("button");
    const roomKey = `${activeBuilding}/${activeFloor}/${room}`;
    button.type = "button";
    button.className = `room-card${searchedRooms.has(roomKey) ? " searched" : ""}`;
    button.innerHTML = `<span class="room-number">${room}</span><small>${index % 3 === 0 ? "实验室" : index % 2 === 0 ? "导师办公室" : "研究生工位"}</small><b>${searchedRooms.has(roomKey) ? "已查" : "搜索"}</b>`;
    button.addEventListener("click", () => searchRoom(room, button));
    roomGrid.appendChild(button);
  });
}

function openBuilding(building) {
  activeBuilding = building;
  activeFloor = (buildingLayouts[building] || ["1F"])[0];
  buildingTitle.textContent = building;
  buildingSubtitle.textContent = "朋友和同门只看见导师经过这里，先从最可疑的楼层查起。";
  floorTabs.innerHTML = "";
  (buildingLayouts[building] || ["1F"]).forEach((floor) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `floor-tab${floor === activeFloor ? " active" : ""}`;
    tab.textContent = floor;
    tab.addEventListener("click", () => {
      activeFloor = floor;
      document.querySelectorAll(".floor-tab").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      renderRooms();
    });
    floorTabs.appendChild(tab);
  });
  map.classList.add("hidden");
  document.querySelector(".map-footer").classList.add("hidden");
  buildingView.classList.remove("hidden");
  renderRooms();
  updateIndoorStatus();
  showToast(`已进入${building}，请选择楼层搜索`);
}

function searchRoom(room, button) {
  if (gameOver) return;
  const roomKey = `${activeBuilding}/${activeFloor}/${room}`;
  if (searchedRooms.has(roomKey)) {
    showToast(`${room} 已经搜索过了`);
    return;
  }
  searchCount += 1;
  searchCountElement.textContent = searchCount;
  searchedRooms.add(roomKey);
  button.classList.add("searched");
  button.querySelector("b").textContent = "已查";
  updateIndoorStatus();

  if (activeBuilding === tutorLocation.building && activeFloor === tutorLocation.floor && room === tutorLocation.room) {
    showToast("找到了！导师正在这里等你签字。");
    window.setTimeout(() => finishGame(true), 450);
    return;
  }
  clueText.textContent = createVagueClue();
  showToast(`${room}：里面没有找到导师`);
}

function createVagueClue() {
  const witnesses = ["你的朋友小周", "同门师兄", "隔壁组同学", "门口值班的同学"];
  const areas = ["楼梯口附近", "靠近电梯的一侧", "中间走廊", "安静的内侧区域"];
  const witness = witnesses[Math.floor(Math.random() * witnesses.length)];
  const area = areas[Math.floor(Math.random() * areas.length)];
  return `“${witness}说，刚才在${tutorLocation.building}的${area}瞥见了一个像导师的人，但没看清是哪一层。”`;
}

function resetGame() {
  secondsRemaining = TOTAL_SECONDS;
  searchCount = 0;
  gameOver = false;
  activeBuilding = null;
  activeFloor = null;
  searchedRooms.clear();
  searchCountElement.textContent = "0";
  clueText.textContent = "“你的同门说，刚才在校园里看到了导师的身影，但转过弯就不见了。”";
  timerBar.style.background = "var(--orange)";
  locations.forEach((location) => location.classList.remove("searched"));
  map.classList.remove("hidden");
  document.querySelector(".map-footer").classList.remove("hidden");
  buildingView.classList.add("hidden");
  modal.classList.add("hidden");
  chooseTutorLocation();
  updateTimer();
}

locations.forEach((location) => {
  location.addEventListener("click", () => openBuilding(location.dataset.location));
});

document.querySelector("#backToCampus").addEventListener("click", () => {
  buildingView.classList.add("hidden");
  map.classList.remove("hidden");
  document.querySelector(".map-footer").classList.remove("hidden");
  showToast("已返回校园地图");
});

document.querySelector("#centerButton").addEventListener("click", () => {
  playerMarker.scrollIntoView({ behavior: "smooth", block: "center" });
  showToast("已定位到你当前的位置");
});

document.querySelector("#restartButton").addEventListener("click", resetGame);

window.setInterval(() => {
  if (gameOver) return;
  secondsRemaining -= 1;
  updateTimer();
  if (secondsRemaining <= 0) finishGame(false);
}, 1000);

window.setInterval(() => {
  if (gameOver) return;
  chooseTutorLocation();
  showToast("导师刚刚换了位置，线索已更新");
}, 60 * 1000);

resetGame();
