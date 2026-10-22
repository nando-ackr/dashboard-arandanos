// Dashboard público de solo lectura. No colocar claves API privadas aquí.
const CHANNEL_ID = "3545050";
const REFRESH_MS = 20000;
const RESULTS = 30;
const FEED_URL = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=${RESULTS}`;

let distanceChart = null;
let detectionChart = null;
let lastSuccessfulFetch = null;

const $ = (id) => document.getElementById(id);
const asNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const bit = (value) => asNumber(value) === 1;
const stateText = (value) => asNumber(value) === null ? "Sin dato" : bit(value) ? "Encendido" : "Apagado";
const timeText = (dateValue) => {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "medium" });
};
const shortTime = (dateValue) => {
  const d = new Date(dateValue);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

function showNotice(message, type = "info") {
  const el = $("notice");
  el.textContent = message;
  el.className = `notice ${type === "error" ? "error" : type === "success" ? "success" : ""}`;
  el.hidden = false;
}
function hideNotice() { $("notice").hidden = true; }

function setConnection(ok, label) {
  $("connection-status").textContent = label;
  $("side-status").textContent = ok ? "Datos disponibles" : "Sin conexión";
  $("mini-state").textContent = ok ? "Conectado" : "Sin datos";
  $("status-dot").style.background = ok ? "#149b72" : "#df4f61";
  $("side-dot").style.background = ok ? "#149b72" : "#df4f61";
}

function normalizeFeed(feed) {
  return {
    created_at: feed.created_at,
    entry_id: feed.entry_id,
    distance: asNumber(feed.field1),
    detected: asNumber(feed.field2),
    red: asNumber(feed.field3),
    green: asNumber(feed.field4),
    servo: asNumber(feed.field5)
  };
}

function initCharts() {
  if (!window.Chart) {
    showNotice("No se pudo cargar la librería de gráficos. Revisa tu conexión a Internet y vuelve a cargar la página.", "error");
    return;
  }
  const commonOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1d3151", padding: 10, titleFont: { size: 11 }, bodyFont: { size: 11 } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#8a98ad", maxTicksLimit: 6, font: { size: 10 } }, border: { display: false } },
      y: { beginAtZero: true, grid: { color: "#edf1f7" }, ticks: { color: "#8a98ad", font: { size: 10 } }, border: { display: false } }
    }
  };
  distanceChart = new Chart($("distance-chart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Distancia (cm)", data: [], borderColor: "#2864d7", backgroundColor: "rgba(40,100,215,.10)", fill: true, tension: .32, borderWidth: 2.5, pointRadius: 2.5, pointHoverRadius: 5, pointBackgroundColor: "#2864d7", spanGaps: true }] },
    options: commonOptions
  });
  detectionChart = new Chart($("detection-chart"), {
    type: "doughnut",
    data: { labels: ["Detectado", "Sin detección"], datasets: [{ data: [0, 0], backgroundColor: ["#149b72", "#e2e8f1"], borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "76%", plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1d3151" } } }
  });
}

function updateDashboard(feeds) {
  const rows = feeds.map(normalizeFeed).filter(r => r.created_at).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  const latest = rows.length ? rows[rows.length - 1] : null;
  if (!latest) {
    showNotice("ThingSpeak respondió, pero el canal todavía no tiene registros disponibles.", "info");
    setConnection(false, "Sin registros");
    return;
  }
  hideNotice();
  setConnection(true, "Conectado");
  $("side-channel").textContent = CHANNEL_ID;
  $("channel-number").textContent = CHANNEL_ID;
  $("last-update").textContent = timeText(latest.created_at);
  $("records-count").textContent = String(rows.length);

  $("distance-value").textContent = latest.distance === null ? "—" : latest.distance.toLocaleString("es-PE");
  $("distance-note").textContent = latest.distance === null ? "Sin dato de distancia" : latest.distance <= 15 ? "Objeto dentro del umbral" : "Sin objeto cercano";
  $("detected-value").textContent = latest.detected === null ? "Sin dato" : bit(latest.detected) ? "Sí" : "No";
  $("detected-note").textContent = latest.detected === null ? "Campo 2 vacío" : bit(latest.detected) ? "Objeto detectado" : "No se detecta objeto";
  $("red-value").textContent = stateText(latest.red);
  $("red-note").textContent = latest.red === null ? "Campo 3 vacío" : bit(latest.red) ? "Indicador activo" : "Indicador apagado";
  $("green-value").textContent = stateText(latest.green);
  $("green-note").textContent = latest.green === null ? "Campo 4 vacío" : bit(latest.green) ? "Indicador activo" : "Indicador apagado";
  $("servo-value").textContent = latest.servo === null ? "Sin dato" : bit(latest.servo) ? "Activo" : "Inactivo";
  $("servo-note").textContent = latest.servo === null ? "Campo 5 vacío" : bit(latest.servo) ? "Señal activa" : "Sin señal activa";

  if (distanceChart) {
    distanceChart.data.labels = rows.map(r => shortTime(r.created_at));
    distanceChart.data.datasets[0].data = rows.map(r => r.distance);
    distanceChart.update();
  }
  const detectedCount = rows.filter(r => bit(r.detected)).length;
  const notDetectedCount = rows.filter(r => r.detected === 0).length;
  $("detection-count").textContent = String(detectedCount);
  if (detectionChart) {
    detectionChart.data.datasets[0].data = [detectedCount, notDetectedCount];
    detectionChart.update();
  }

  const tbody = $("history-body");
  tbody.replaceChildren();
  rows.slice().reverse().slice(0, 10).forEach(r => {
    const tr = document.createElement("tr");
    const detection = r.detected === null ? "Sin dato" : bit(r.detected) ? "Sí" : "No";
    const cells = [
      shortTime(r.created_at),
      r.distance === null ? "—" : `${r.distance} cm`,
      detection,
      r.red === null ? "—" : bit(r.red) ? "1" : "0",
      r.green === null ? "—" : bit(r.green) ? "1" : "0",
      r.servo === null ? "—" : bit(r.servo) ? "1" : "0"
    ];
    cells.forEach((value, idx) => {
      const td = document.createElement("td");
      if (idx === 2) {
        const span = document.createElement("span");
        span.className = `table-state ${r.detected === 0 ? "off" : ""}`;
        const dot = document.createElement("i");
        span.append(dot, document.createTextNode(value));
        td.append(span);
      } else td.textContent = value;
      tr.append(td);
    });
    tbody.append(tr);
  });
}

async function loadData() {
  $("refresh-btn").disabled = true;
  $("refresh-btn").style.opacity = ".7";
  try {
    const response = await fetch(FEED_URL, { cache: "no-store" });
    if (response.status === 401 || response.status === 403) {
      throw new Error("El canal parece ser privado. Para esta versión sin claves en el navegador, cambia la visibilidad del canal a público o configura un backend seguro.");
    }
    if (!response.ok) throw new Error(`ThingSpeak respondió con HTTP ${response.status}.`);
    const data = await response.json();
    if (!Array.isArray(data.feeds)) throw new Error("La respuesta de ThingSpeak no contiene la lista de registros esperada.");
    updateDashboard(data.feeds);
    lastSuccessfulFetch = Date.now();
  } catch (error) {
    setConnection(false, "Error de conexión");
    showNotice(`${error.message} Comprueba que el canal ${CHANNEL_ID} exista, tenga datos y permita lectura pública.`, "error");
    if (lastSuccessfulFetch) {
      $("last-update").textContent = "Último éxito: " + new Date(lastSuccessfulFetch).toLocaleTimeString("es-PE");
    }
  } finally {
    $("refresh-btn").disabled = false;
    $("refresh-btn").style.opacity = "1";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  $("refresh-btn").addEventListener("click", loadData);
  loadData();
  window.setInterval(loadData, REFRESH_MS);
});
