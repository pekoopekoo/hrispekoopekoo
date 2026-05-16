const SUPABASE_URL = "https://zysktnpfmnfetoldjsvl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c2t0bnBmbW5mZXRvbGRqc3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzA2OTksImV4cCI6MjA5NDQ0NjY5OX0.XdYrZ4V1MxkauVbHCTokZRVQbb7jDBovUaLOO4lbjXk";

const fallbackEmployees = [
  { id: 1, name: "Alya Prameswari", role: "HR Business Partner", division: "People Ops", status: "Tetap", location: "Jakarta", salary: 14500000, attendance: "Hadir", checkIn: "08:11" },
  { id: 2, name: "Bima Santoso", role: "Backend Engineer", division: "Engineering", status: "Tetap", location: "Bandung", salary: 18000000, attendance: "Hadir", checkIn: "08:28" },
  { id: 3, name: "Citra Lestari", role: "Finance Analyst", division: "Finance", status: "Tetap", location: "Jakarta", salary: 12500000, attendance: "Terlambat", checkIn: "09:14" },
  { id: 4, name: "Damar Wirawan", role: "Product Manager", division: "Product", status: "Tetap", location: "Remote", salary: 20500000, attendance: "Hadir", checkIn: "08:03" },
  { id: 5, name: "Eka Mahendra", role: "Sales Executive", division: "Sales", status: "Kontrak", location: "Jakarta", salary: 9800000, attendance: "Cuti", checkIn: "-" },
  { id: 6, name: "Farah Nabila", role: "UX Designer", division: "Product", status: "Tetap", location: "Bandung", salary: 13750000, attendance: "Hadir", checkIn: "08:36" },
  { id: 7, name: "Gilang Saputra", role: "Customer Success", division: "Operations", status: "Kontrak", location: "Remote", salary: 9200000, attendance: "Hadir", checkIn: "08:22" },
  { id: 8, name: "Hana Putri", role: "Recruiter", division: "People Ops", status: "Tetap", location: "Jakarta", salary: 11200000, attendance: "Izin", checkIn: "-" }
];

const fallbackLeaveRequests = [
  { id: 1, name: "Eka Mahendra", type: "Tahunan", days: 3, date: "20-22 Mei 2026", status: "Menunggu" },
  { id: 2, name: "Hana Putri", type: "Izin keluarga", days: 1, date: "17 Mei 2026", status: "Menunggu" },
  { id: 3, name: "Bima Santoso", type: "Tahunan", days: 2, date: "27-28 Mei 2026", status: "Disetujui" }
];

const fallbackCandidates = [
  { id: 1, name: "Raka Aditya", role: "Frontend Engineer", stage: "Screening" },
  { id: 2, name: "Nisa Amalia", role: "People Analyst", stage: "Interview" },
  { id: 3, name: "Yoga Pratama", role: "Account Executive", stage: "Offering" },
  { id: 4, name: "Maya Renata", role: "Data Analyst", stage: "Hired" }
];

let employees = [...fallbackEmployees];
let leaveRequests = [...fallbackLeaveRequests];
let candidates = [...fallbackCandidates];
let activeStatus = "all";
let isDatabaseLive = false;

const stages = ["Screening", "Interview", "Offering", "Hired"];
const dbStatus = document.querySelector("#dbStatus");

const rupiah = value => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
}).format(value);

const initials = name => name.split(" ").map(part => part[0]).slice(0, 2).join("");

const getAttendanceClass = status => {
  if (status === "Hadir") return "good";
  if (status === "Terlambat" || status === "Izin") return "warn";
  return "bad";
};

function setDbStatus(message, type = "loading") {
  dbStatus.textContent = message;
  dbStatus.dataset.type = type;
}

async function supabaseRequest(table, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${options.query || ""}`, {
    method: options.method || "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${table}: ${response.status} ${message}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

const employeeFromDb = row => ({
  id: row.id,
  name: row.name,
  role: row.role,
  division: row.division,
  status: row.status,
  location: row.location,
  salary: Number(row.salary),
  attendance: row.attendance,
  checkIn: row.check_in
});

const employeeToDb = employee => ({
  name: employee.name,
  role: employee.role,
  division: employee.division,
  status: employee.status,
  location: employee.location,
  salary: employee.salary,
  attendance: employee.attendance,
  check_in: employee.checkIn
});

const leaveFromDb = row => ({
  id: row.id,
  name: row.name,
  type: row.type,
  days: row.days,
  date: row.date_range,
  status: row.status
});

const leaveToDb = request => ({
  name: request.name,
  type: request.type,
  days: request.days,
  date_range: request.date,
  status: request.status
});

const candidateFromDb = row => ({
  id: row.id,
  name: row.name,
  role: row.role,
  stage: row.stage
});

const candidateToDb = candidate => ({
  name: candidate.name,
  role: candidate.role,
  stage: candidate.stage
});

async function loadDatabase() {
  setDbStatus("Menghubungkan database...", "loading");

  try {
    const [employeeRows, leaveRows, candidateRows] = await Promise.all([
      supabaseRequest("employees", { query: "?select=*&order=id.asc" }),
      supabaseRequest("leave_requests", { query: "?select=*&order=id.asc" }),
      supabaseRequest("candidates", { query: "?select=*&order=id.asc" })
    ]);

    employees = employeeRows.map(employeeFromDb);
    leaveRequests = leaveRows.map(leaveFromDb);
    candidates = candidateRows.map(candidateFromDb);
    isDatabaseLive = true;
    setDbStatus("Database live tersambung", "live");
    renderAll();
  } catch (error) {
    console.warn("Supabase belum siap:", error);
    isDatabaseLive = false;
    setDbStatus("Mode demo: buat tabel Supabase dulu", "demo");
    renderAll();
  }
}

async function insertEmployee(employee) {
  if (!isDatabaseLive) {
    employees.push({ ...employee, id: Date.now() });
    return;
  }

  const [created] = await supabaseRequest("employees", {
    method: "POST",
    body: employeeToDb(employee)
  });
  employees.push(employeeFromDb(created));
}

async function updateEmployee(employee) {
  if (!isDatabaseLive) return;

  await supabaseRequest("employees", {
    method: "PATCH",
    query: `?id=eq.${employee.id}`,
    body: employeeToDb(employee)
  });
}

async function insertLeaveRequest(request) {
  if (!isDatabaseLive) {
    leaveRequests.unshift({ ...request, id: Date.now() });
    return;
  }

  const [created] = await supabaseRequest("leave_requests", {
    method: "POST",
    body: leaveToDb(request)
  });
  leaveRequests.unshift(leaveFromDb(created));
}

async function updateLeaveRequest(request) {
  if (!isDatabaseLive) return;

  await supabaseRequest("leave_requests", {
    method: "PATCH",
    query: `?id=eq.${request.id}`,
    body: leaveToDb(request)
  });
}

async function insertCandidate(candidate) {
  if (!isDatabaseLive) {
    candidates.unshift({ ...candidate, id: Date.now() });
    return;
  }

  const [created] = await supabaseRequest("candidates", {
    method: "POST",
    body: candidateToDb(candidate)
  });
  candidates.unshift(candidateFromDb(created));
}

async function updateCandidate(candidate) {
  if (!isDatabaseLive) return;

  await supabaseRequest("candidates", {
    method: "PATCH",
    query: `?id=eq.${candidate.id}`,
    body: candidateToDb(candidate)
  });
}

function renderMetrics() {
  const present = employees.filter(employee => employee.attendance === "Hadir").length;
  const waitingLeave = leaveRequests.filter(request => request.status === "Menunggu").length;
  const netPayroll = employees.reduce((sum, employee) => {
    const allowance = employee.salary * 0.12;
    const deduction = employee.salary * 0.05;
    return sum + employee.salary + allowance - deduction;
  }, 0);

  document.querySelector("#metricEmployees").textContent = employees.length;
  document.querySelector("#metricPresent").textContent = present;
  document.querySelector("#metricLeave").textContent = waitingLeave;
  document.querySelector("#metricPayroll").textContent = rupiah(netPayroll);
}

function renderDivisionFilter() {
  const select = document.querySelector("#divisionFilter");
  const current = select.value;
  const divisions = [...new Set(employees.map(employee => employee.division))].sort();
  select.innerHTML = '<option value="all">Semua divisi</option>' + divisions.map(division => `<option value="${division}">${division}</option>`).join("");
  select.value = divisions.includes(current) ? current : "all";
}

function renderDivisionChart() {
  const selected = document.querySelector("#divisionFilter").value;
  const source = selected === "all" ? employees : employees.filter(employee => employee.division === selected);
  const counts = source.reduce((group, employee) => {
    group[employee.division] = (group[employee.division] || 0) + 1;
    return group;
  }, {});
  const max = Math.max(...Object.values(counts), 1);
  const chart = document.querySelector("#divisionChart");

  chart.innerHTML = Object.entries(counts).map(([division, count]) => `
    <div class="bar-row">
      <strong>${division}</strong>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
      <span>${count}</span>
    </div>
  `).join("") || "<p>Belum ada data divisi.</p>";
}

function renderTasks() {
  const waitingLeave = leaveRequests.filter(request => request.status === "Menunggu").length;
  const tasks = [
    ["!", `Review ${waitingLeave} pengajuan cuti yang masih menunggu.`],
    ["P", "Finalisasi payroll sebelum tanggal 25 Mei."],
    ["R", "Jadwalkan interview lanjutan untuk kandidat aktif."],
    ["D", "Lengkapi dokumen kontrak untuk karyawan remote."]
  ];

  document.querySelector("#taskList").innerHTML = tasks.map(([icon, text]) => `
    <div class="task">
      <span class="task-icon">${icon}</span>
      <p>${text}</p>
    </div>
  `).join("");
}

function renderEmployees() {
  const query = document.querySelector("#globalSearch").value.trim().toLowerCase();
  const filtered = employees.filter(employee => {
    const matchesSearch = [employee.name, employee.role, employee.division, employee.location].join(" ").toLowerCase().includes(query);
    const matchesStatus = activeStatus === "all" || employee.status === activeStatus;
    return matchesSearch && matchesStatus;
  });

  document.querySelector("#employeeGrid").innerHTML = filtered.map(employee => `
    <article class="employee-card">
      <div class="avatar-row">
        <span class="avatar">${initials(employee.name)}</span>
        <div>
          <strong>${employee.name}</strong>
          <div class="employee-meta">${employee.role}</div>
        </div>
      </div>
      <div class="employee-meta">
        <span>Divisi: ${employee.division}</span>
        <span>Lokasi: ${employee.location}</span>
        <span>Gaji: ${rupiah(employee.salary)}</span>
      </div>
      <div class="chip-row">
        <span class="chip">${employee.status}</span>
        <span class="chip">${employee.attendance}</span>
      </div>
    </article>
  `).join("") || "<p>Tidak ada data yang cocok.</p>";
}

function renderAttendance() {
  document.querySelector("#attendanceTable").innerHTML = employees.map(employee => `
    <tr>
      <td><strong>${employee.name}</strong></td>
      <td>${employee.division}</td>
      <td>${employee.checkIn}</td>
      <td><span class="status ${getAttendanceClass(employee.attendance)}">${employee.attendance}</span></td>
      <td><button class="secondary-button" data-attendance="${employee.id}">Ubah Status</button></td>
    </tr>
  `).join("");
}

function renderLeave() {
  document.querySelector("#leaveList").innerHTML = leaveRequests.map(request => `
    <article class="request-card">
      <div>
        <strong>${request.name}</strong>
        <p>${request.type}, ${request.days} hari, ${request.date}</p>
        <span class="status ${request.status === "Disetujui" ? "good" : request.status === "Ditolak" ? "bad" : "warn"}">${request.status}</span>
      </div>
      <div class="request-actions">
        <button class="secondary-button" data-leave-action="approve" data-id="${request.id}">Setujui</button>
        <button class="secondary-button" data-leave-action="reject" data-id="${request.id}">Tolak</button>
      </div>
    </article>
  `).join("") || "<p>Belum ada pengajuan cuti.</p>";
}

function calculatePayroll() {
  return employees.map(employee => {
    const allowance = employee.salary * 0.12;
    const deduction = employee.salary * 0.05;
    const net = employee.salary + allowance - deduction;
    return { ...employee, allowance, deduction, net };
  });
}

function renderPayroll() {
  const rows = calculatePayroll();
  const gross = rows.reduce((sum, employee) => sum + employee.salary + employee.allowance, 0);
  const deduction = rows.reduce((sum, employee) => sum + employee.deduction, 0);
  const net = rows.reduce((sum, employee) => sum + employee.net, 0);

  document.querySelector("#grossPay").textContent = rupiah(gross);
  document.querySelector("#deductionPay").textContent = rupiah(deduction);
  document.querySelector("#netPay").textContent = rupiah(net);
  document.querySelector("#payrollTable").innerHTML = rows.map(employee => `
    <tr>
      <td><strong>${employee.name}</strong></td>
      <td>${rupiah(employee.salary)}</td>
      <td>${rupiah(employee.allowance)}</td>
      <td>${rupiah(employee.deduction)}</td>
      <td><strong>${rupiah(employee.net)}</strong></td>
    </tr>
  `).join("");
}

function renderPipeline() {
  document.querySelector("#pipeline").innerHTML = stages.map(stage => `
    <section class="kanban-column">
      <h3>${stage}</h3>
      ${candidates.filter(candidate => candidate.stage === stage).map(candidate => `
        <article class="candidate-card">
          <strong>${candidate.name}</strong>
          <p>${candidate.role}</p>
          <button class="secondary-button" data-candidate="${candidate.id}">Geser</button>
        </article>
      `).join("")}
    </section>
  `).join("");
}

function renderAll() {
  renderMetrics();
  renderDivisionFilter();
  renderDivisionChart();
  renderTasks();
  renderEmployees();
  renderAttendance();
  renderLeave();
  renderPayroll();
  renderPipeline();
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item, .view").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}`).classList.add("active");
    document.querySelector("#pageTitle").textContent = button.textContent.trim();
  });
});

document.querySelector("#globalSearch").addEventListener("input", renderEmployees);
document.querySelector("#divisionFilter").addEventListener("change", renderDivisionChart);
document.querySelector("#themeToggle").addEventListener("click", () => document.body.classList.toggle("dark"));
document.querySelector("#runPayroll").addEventListener("click", renderPayroll);
document.querySelector("#addEmployeeBtn").addEventListener("click", () => document.querySelector("#employeeDialog").showModal());

document.querySelectorAll(".segment").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach(segment => segment.classList.remove("active"));
    button.classList.add("active");
    activeStatus = button.dataset.status;
    renderEmployees();
  });
});

document.querySelector("#employeeForm").addEventListener("submit", async event => {
  const form = new FormData(event.currentTarget);
  const employee = {
    name: form.get("name"),
    role: form.get("role"),
    division: form.get("division"),
    salary: Number(form.get("salary")),
    status: form.get("status"),
    location: form.get("location"),
    attendance: "Hadir",
    checkIn: "08:30"
  };

  await insertEmployee(employee);
  event.currentTarget.reset();
  renderAll();
});

document.querySelector("#attendanceTable").addEventListener("click", async event => {
  const button = event.target.closest("[data-attendance]");
  if (!button) return;
  const employee = employees.find(item => String(item.id) === button.dataset.attendance);
  const statuses = ["Hadir", "Terlambat", "Izin", "Cuti"];
  employee.attendance = statuses[(statuses.indexOf(employee.attendance) + 1) % statuses.length];
  employee.checkIn = employee.attendance === "Hadir" ? "08:25" : employee.attendance === "Terlambat" ? "09:18" : "-";
  await updateEmployee(employee);
  renderMetrics();
  renderEmployees();
  renderAttendance();
});

document.querySelector("#markAllPresent").addEventListener("click", async () => {
  employees.forEach(employee => {
    employee.attendance = "Hadir";
    employee.checkIn = "08:20";
  });

  await Promise.all(employees.map(updateEmployee));
  renderMetrics();
  renderEmployees();
  renderAttendance();
});

document.querySelector("#leaveList").addEventListener("click", async event => {
  const button = event.target.closest("[data-leave-action]");
  if (!button) return;
  const request = leaveRequests.find(item => String(item.id) === button.dataset.id);
  request.status = button.dataset.leaveAction === "approve" ? "Disetujui" : "Ditolak";
  await updateLeaveRequest(request);
  renderMetrics();
  renderTasks();
  renderLeave();
});

document.querySelector("#newLeaveBtn").addEventListener("click", async () => {
  const request = {
    name: employees[0]?.name || "Karyawan Baru",
    type: "Tahunan",
    days: 1,
    date: "30 Mei 2026",
    status: "Menunggu"
  };

  await insertLeaveRequest(request);
  renderMetrics();
  renderTasks();
  renderLeave();
});

document.querySelector("#pipeline").addEventListener("click", async event => {
  const button = event.target.closest("[data-candidate]");
  if (!button) return;
  const candidate = candidates.find(item => String(item.id) === button.dataset.candidate);
  const current = stages.indexOf(candidate.stage);
  candidate.stage = stages[Math.min(current + 1, stages.length - 1)];
  await updateCandidate(candidate);
  renderPipeline();
});

document.querySelector("#addCandidate").addEventListener("click", async () => {
  await insertCandidate({ name: "Kandidat Baru", role: "General Application", stage: "Screening" });
  renderPipeline();
});

renderAll();
loadDatabase();
