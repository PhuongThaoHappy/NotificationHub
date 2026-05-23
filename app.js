/* =========================
   DATA INITIALIZATION
========================= */
const apps = [
  { id: "teams", name: "Teams", color: "#6264a7", connected: true },
  { id: "slack", name: "Slack", color: "#e01e5a", connected: true },
  { id: "outlook", name: "Outlook", color: "#0078d4", connected: true },
  { id: "discord", name: "Discord", color: "#5865f2", connected: false }
];

let notifications = [
  { id: 1, app: "teams", sender: "Nguyễn Văn A", message: "Bạn được nhắc đến trong cuộc họp AI Vision.", time: "5 phút trước", date: "Hôm nay", read: false },
  { id: 2, app: "slack", sender: "Backend Team", message: "API notification-service đã deploy thành công lên môi trường Staging.", time: "20 phút trước", date: "Hôm nay", read: false },
  { id: 3, app: "outlook", sender: "Phòng nhân sự", message: "Lịch phỏng vấn tuần này đã được cập nhật. Vui lòng kiểm tra.", time: "Hôm qua lúc 16:20", date: "Hôm qua", read: true }
];

let selectedStatus = "all";
let selectedApp = "all";
let notificationIdToDelete = null; // Lưu trữ tạm thời ID thông báo chuẩn bị xóa

/* =========================
   DOM ELEMENTS
========================= */
const appList = document.getElementById("appList");
const appFilters = document.getElementById("appFilters");
const notificationsContainer = document.getElementById("notificationsContainer");

// Modal Elements
const deleteModal = document.getElementById("deleteModal");
const btnCancelDelete = document.getElementById("btnCancelDelete");
const btnConfirmDelete = document.getElementById("btnConfirmDelete");

/* =========================
   RENDER FUNCTIONS
========================= */
function renderApps() {
  appList.innerHTML = apps.map(app => `
    <div class="app-item">
      <div class="app-left">
        <div class="app-icon" style="background:${app.color}">${app.name.charAt(0)}</div>
        <div class="app-name">${app.name}</div>
      </div>
      <button class="connect-btn ${app.connected ? 'connected' : 'not-connected'}" data-app="${app.id}">
        ${app.connected ? "Ngắt kết nối" : "Kết nối"}
      </button>
    </div>
  `).join("");
}

function renderAppFilters() {
  let html = `<button class="app-filter-btn ${selectedApp === 'all' ? 'active' : ''}" data-app="all">Tất cả ứng dụng</button>`;
  
  apps.filter(app => app.connected).forEach(app => {
    html += `<button class="app-filter-btn ${selectedApp === app.id ? 'active' : ''}" data-app="${app.id}">${app.name}</button>`;
  });
  
  appFilters.innerHTML = html;
}

function groupByDate(data) {
  const grouped = {};
  data.forEach(n => {
    if (!grouped[n.date]) grouped[n.date] = [];
    grouped[n.date].push(n);
  });
  return grouped;
}

function renderNotifications() {
  notificationsContainer.innerHTML = "";

  const filtered = notifications.filter(n => {
    const statusMatch = selectedStatus === "all" || !n.read;
    const appMatch = selectedApp === "all" || n.app === selectedApp;
    const isConnected = apps.find(a => a.id === n.app)?.connected;
    return statusMatch && appMatch && isConnected;
  });

  if (filtered.length === 0) {
    notificationsContainer.innerHTML = `<div style="text-align:center; padding: 40px; color:#64748b; font-weight:600;">Không có thông báo nào</div>`;
    return;
  }

  const grouped = groupByDate(filtered);

  Object.keys(grouped).forEach(date => {
    const section = document.createElement("div");
    section.className = "date-section";

    const cardsHtml = grouped[date].map(n => {
      const app = apps.find(a => a.id === n.app);
      return `
        <div class="card ${n.read ? '' : 'unread'}" data-id="${n.id}">
          <div class="card-header">
            <div class="sender-info">
              <span class="badge" style="background:${app.color}">${app.name}</span>
              <span class="sender">${n.sender}</span>
            </div>
            <div class="card-actions">
              <span class="time">${n.time}</span>
              <!-- Thay thế bánh răng thành dấu 3 chấm dọc mã hóa HTML -->
              <button class="menu-btn" data-id="${n.id}">&#8942;</button>
              <div class="dropdown-menu" id="menu-${n.id}">
                <div class="dropdown-item mark-action" data-id="${n.id}">${n.read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}</div>
                <div class="dropdown-item delete-notification" data-id="${n.id}">Xóa thông báo</div>
              </div>
            </div>
          </div>
          <div class="message">${n.message}</div>
        </div>
      `;
    }).join("");

    section.innerHTML = `
      <div class="date-title">${date}</div>
      <div class="notification-list">${cardsHtml}</div>
    `;
    notificationsContainer.appendChild(section);
  });
}

/* =========================
   CENTRALIZED EVENT LISTENERS
========================= */

// Sự kiện cho bộ lọc Trạng thái (Tất cả / Chưa đọc)
document.querySelectorAll(".filter-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    selectedStatus = button.dataset.status;
    renderNotifications();
  });
});

// Sự kiện cho bộ lọc Ứng dụng (Ủy quyền hành vi từ container cha)
appFilters.addEventListener("click", (e) => {
  const btn = e.target.closest(".app-filter-btn");
  if (!btn) return;
  document.querySelectorAll(".app-filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedApp = btn.dataset.app;
  renderNotifications();
});

// Sự kiện kết nối/ngắt kết nối ứng dụng ở Sidebar
appList.addEventListener("click", (e) => {
  const btn = e.target.closest(".connect-btn");
  if (!btn) return;

  const appId = btn.dataset.app;
  const app = apps.find(a => a.id === appId);
  app.connected = !app.connected;

  if (selectedApp === appId && !app.connected) {
    selectedApp = "all";
  }

  renderApps();
  renderAppFilters();
  renderNotifications();
});

// Sự kiện tương tác trên thẻ thông báo (Card clicks, Menu, Actions)
notificationsContainer.addEventListener("click", (e) => {
  const menuBtn = e.target.closest(".menu-btn");
  const markAction = e.target.closest(".mark-action");
  const deleteBtn = e.target.closest(".delete-notification");
  const card = e.target.closest(".card");

  // 1. Click nút mở menu hành động cá nhân (dấu ba chấm dọc)
  if (menuBtn) {
    e.stopPropagation();
    const id = menuBtn.dataset.id;
    const targetMenu = document.getElementById(`menu-${id}`);
    
    document.querySelectorAll(".dropdown-menu").forEach(m => {
      if (m !== targetMenu) m.classList.remove("show");
    });
    targetMenu.classList.toggle("show");
    return;
  }

  // 2. Click Đánh dấu đọc / chưa đọc bên trong menu thả xuống
  if (markAction) {
    e.stopPropagation();
    const id = Number(markAction.dataset.id);
    const n = notifications.find(item => item.id === id);
    if (n) {
      n.read = !n.read;
      renderNotifications();
    }
    return;
  }

  // 3. Click Xóa thông báo -> Kích hoạt Custom Pop-up Modal công cụ xác nhận
  if (deleteBtn) {
    e.stopPropagation();
    notificationIdToDelete = Number(deleteBtn.dataset.id); 
    
    // Đóng toàn bộ dropdown đang mở trước
    document.querySelectorAll(".dropdown-menu").forEach(m => m.classList.remove("show"));
    
    // Hiển thị Custom Modal
    deleteModal.classList.add("show");
    return;
  }

  // 4. Click trực tiếp vào thân Card để chuyển trạng thái đã đọc
  if (card) {
    const id = Number(card.dataset.id);
    const n = notifications.find(item => item.id === id);
    if (n && !n.read) {
      n.read = true;
      renderNotifications();
    }
  }
});

// Click ra ngoài vùng dropdown menu để tự động đóng hành động
document.addEventListener("click", () => {
  document.querySelectorAll(".dropdown-menu").forEach(m => m.classList.remove("show"));
});

/* =========================
   CUSTOM MODAL EVENTS
========================= */

// Nhấn nút Hủy trong Modal
btnCancelDelete.addEventListener("click", () => {
  deleteModal.classList.remove("show");
  notificationIdToDelete = null;
});

// Nhấn nút Xác nhận xóa trong Modal
btnConfirmDelete.addEventListener("click", () => {
  if (notificationIdToDelete !== null) {
    notifications = notifications.filter(item => item.id !== notificationIdToDelete);
    deleteModal.classList.remove("show");
    notificationIdToDelete = null;
    renderNotifications();
  }
});

// Nhấn ra ngoài rìa (vùng đen mờ) của modal cũng tự động Hủy đóng trang
deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) {
    deleteModal.classList.remove("show");
    notificationIdToDelete = null;
  }
});

/* =========================
   INITIALIZATION
========================= */
renderApps();
renderAppFilters();
renderNotifications();