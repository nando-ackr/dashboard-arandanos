
/*
 * Dashboard público de solo lectura.
 * No colocar claves API privadas aquí.
 */

const CHANNEL_ID = "3545050";
const REFRESH_MS = 2000;
const RESULTS = 30;

const FEED_URL =
  `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?results=${RESULTS}`;

let distanceChart = null;
let detectionChart = null;
let lastSuccessfulFetch = null;
let isLoading = false;
let refreshTimer = null;

const $ = (id) => document.getElementById(id);

const asNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const bit = (value) => asNumber(value) === 1;

const stateText = (value) => {
  const number = asNumber(value);

  if (number === null) return "Sin dato";

  return bit(number) ? "Encendido" : "Apagado";
};

const timeText = (dateValue) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "medium"
  });
};

const shortTime = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

function showNotice(message, type = "info") {
  const element = $("notice");

  if (!element) return;

  element.textContent = message;
  element.className =
    `notice ${type === "error" ? "error" : type === "success" ? "success" : ""}`;
  element.hidden = false;
}

function hideNotice() {
  const element = $("notice");

  if (element) {
    element.hidden = true;
  }
}

function setConnection(ok, label) {
  const connectionStatus = $("connection-status");
  const sideStatus = $("side-status");
  const miniState = $("mini-state");
  const statusDot = $("status-dot");
  const sideDot = $("side-dot");

  if (connectionStatus) connectionStatus.textContent = label;
  if (sideStatus) {
    sideStatus.textContent = ok ? "Datos disponibles" : "Sin conexión";
  }
  if (miniState) {
    miniState.textContent = ok ? "Conectado" : "Sin datos";
  }

  if (statusDot) {
    statusDot.style.background = ok ? "#149b72" : "#df4f61";
  }

  if (sideDot) {
    sideDot.style.background = ok ? "#149b72" : "#df4f61";
  }
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

/* ==============================
   GRÁFICOS
================================ */

function initCharts() {
  if (!window.Chart) {
    showNotice(
      "No se pudo cargar la librería de gráficos. Revisa tu conexión a Internet y vuelve a cargar la página.",
      "error"
    );
    return;
  }

  const distanceCanvas = $("distance-chart");
  const detectionCanvas = $("detection-chart");

  if (!distanceCanvas || !detectionCanvas) {
    showNotice(
      "No se encontraron los elementos de los gráficos en index.html.",
      "error"
    );
    return;
  }

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false
      },

      tooltip: {
        backgroundColor: "#1d3151",
        padding: 10,
        titleFont: { size: 11 },
        bodyFont: { size: 11 }
      }
    },

    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#8a98ad",
          maxTicksLimit: 6,
          font: { size: 10 }
        },
        border: { display: false }
      },

      y: {
        beginAtZero: true,
        grid: { color: "#edf1f7" },
        ticks: {
          color: "#8a98ad",
          font: { size: 10 }
        },
        border: { display: false }
      }
    }
  };

  distanceChart = new Chart(distanceCanvas, {
    type: "line",

    data: {
      labels: [],

      datasets: [{
        label: "Distancia (cm)",
        data: [],
        borderColor: "#2864d7",
        backgroundColor: "rgba(40,100,215,.10)",
        fill: true,
        tension: 0.32,
        borderWidth: 2.5,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        pointBackgroundColor: "#2864d7",
        spanGaps: true
      }]
    },

    options: commonOptions
  });

  detectionChart = new Chart(detectionCanvas, {
    type: "doughnut",

    data: {
      labels: ["Detectado", "Sin detección"],

      datasets: [{
        data: [0, 0],
        backgroundColor: ["#149b72", "#e2e8f1"],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "76%",

      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#1d3151" }
      }
    }
  });
}

/* ==============================
   ACTUALIZAR DASHBOARD
================================ */

function updateDashboard(feeds) {
  const rows = feeds
    .map(normalizeFeed)
    .filter((row) => row.created_at)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

  const latest = rows.length ? rows[rows.length - 1] : null;

  if (!latest) {
    showNotice(
      "ThingSpeak respondió, pero el canal todavía no tiene registros disponibles.",
      "info"
    );

    setConnection(false, "Sin registros");
    return;
  }

  hideNotice();
  setConnection(true, "Conectado");

  if ($("side-channel")) {
    $("side-channel").textContent = CHANNEL_ID;
  }

  if ($("channel-number")) {
    $("channel-number").textContent = CHANNEL_ID;
  }

  if ($("last-update")) {
    $("last-update").textContent = timeText(latest.created_at);
  }

  if ($("records-count")) {
    $("records-count").textContent = String(rows.length);
  }

  /* Distancia */
  if ($("distance-value")) {
    $("distance-value").textContent =
      latest.distance === null
        ? "—"
        : latest.distance.toLocaleString("es-PE");
  }

  if ($("distance-note")) {
    $("distance-note").textContent =
      latest.distance === null
        ? "Sin dato de distancia"
        : latest.detected === 1
          ? "Objeto detectado"
          : latest.detected === 0
            ? "Sin objeto detectado"
            : latest.distance <= 15
              ? "Dentro del umbral configurado"
              : "Fuera del umbral configurado";
  }

  /* Detección */
  if ($("detected-value")) {
    $("detected-value").textContent =
      latest.detected === null
        ? "Sin dato"
        : bit(latest.detected)
          ? "Sí"
          : "No";
  }

  if ($("detected-note")) {
    $("detected-note").textContent =
      latest.detected === null
        ? "Campo 2 vacío"
        : bit(latest.detected)
          ? "Objeto detectado"
          : "No se detecta objeto";
  }

  /* LED rojo */
  if ($("red-value")) {
    $("red-value").textContent = stateText(latest.red);
  }

  if ($("red-note")) {
    $("red-note").textContent =
      latest.red === null
        ? "Campo 3 vacío"
        : bit(latest.red)
          ? "Indicador activo"
          : "Indicador apagado";
  }

  /* LED verde */
  if ($("green-value")) {
    $("green-value").textContent = stateText(latest.green);
  }

  if ($("green-note")) {
    $("green-note").textContent =
      latest.green === null
        ? "Campo 4 vacío"
        : bit(latest.green)
          ? "Indicador activo"
          : "Indicador apagado";
  }

  /* Servo */
  if ($("servo-value")) {
    $("servo-value").textContent =
      latest.servo === null
        ? "Sin dato"
        : bit(latest.servo)
          ? "Activo"
          : "Inactivo";
  }

  if ($("servo-note")) {
    $("servo-note").textContent =
      latest.servo === null
        ? "Campo 5 vacío"
        : bit(latest.servo)
          ? "Señal activa"
          : "Sin señal activa";
  }

  /* Gráfico de distancia */
  if (distanceChart) {
    distanceChart.data.labels = rows.map(
      (row) => shortTime(row.created_at)
    );

    distanceChart.data.datasets[0].data = rows.map(
      (row) => row.distance
    );

    distanceChart.update("none");
  }

  /* Gráfico de detecciones */
  const detectedCount = rows.filter(
    (row) => bit(row.detected)
  ).length;

  const notDetectedCount = rows.filter(
    (row) => row.detected === 0
  ).length;

  if ($("detection-count")) {
    $("detection-count").textContent = String(detectedCount);
  }

  if (detectionChart) {
    detectionChart.data.datasets[0].data = [
      detectedCount,
      notDetectedCount
    ];

    detectionChart.update("none");
  }

  /* Tabla del historial */
  const tbody = $("history-body");

  if (tbody) {
    tbody.replaceChildren();

    rows
      .slice()
      .reverse()
      .slice(0, 10)
      .forEach((row) => {
        const tr = document.createElement("tr");

        const detection =
          row.detected === null
            ? "Sin dato"
            : bit(row.detected)
              ? "Sí"
              : "No";

        const cells = [
          shortTime(row.created_at),
          row.distance === null ? "—" : `${row.distance} cm`,
          detection,
          row.red === null ? "—" : bit(row.red) ? "1" : "0",
          row.green === null ? "—" : bit(row.green) ? "1" : "0",
          row.servo === null ? "—" : bit(row.servo) ? "1" : "0"
        ];

        cells.forEach((value, index) => {
          const td = document.createElement("td");

          if (index === 2) {
            const span = document.createElement("span");

            span.className =
              `table-state ${row.detected === 0 ? "off" : ""}`;

            const dot = document.createElement("i");

            span.append(
              dot,
              document.createTextNode(value)
            );

            td.append(span);
          } else {
            td.textContent = value;
          }

          tr.append(td);
        });

        tbody.append(tr);
      });
  }
}

/* ==============================
   CARGA DE DATOS
================================ */

async function loadData() {
  // Evita ejecutar una nueva petición si hay otra pendiente.
  if (isLoading) return;

  isLoading = true;

  const refreshButton = $("refresh-btn");

  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.style.opacity = "0.7";
  }

  try {
    const response = await fetch(FEED_URL, {
      cache: "no-store"
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "El canal parece ser privado. Para esta versión sin claves en el navegador, cambia la visibilidad del canal a público o configura un backend seguro."
      );
    }

    if (!response.ok) {
      throw new Error(
        `ThingSpeak respondió con HTTP ${response.status}.`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.feeds)) {
      throw new Error(
        "La respuesta de ThingSpeak no contiene la lista de registros esperada."
      );
    }

    updateDashboard(data.feeds);
    lastSuccessfulFetch = Date.now();

  } catch (error) {
    setConnection(false, "Error de conexión");

    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error desconocido.";

    showNotice(
      `${message} Comprueba que el canal ${CHANNEL_ID} exista, tenga datos y permita lectura pública.`,
      "error"
    );

    if (lastSuccessfulFetch && $("last-update")) {
      $("last-update").textContent =
        "Último éxito: " +
        new Date(lastSuccessfulFetch).toLocaleTimeString("es-PE");
    }

  } finally {
    isLoading = false;

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.style.opacity = "1";
    }
  }
}

/* ==============================
   ACTUALIZACIÓN AUTOMÁTICA
================================ */

function startAutoRefresh() {
  // Evita crear varios intervalos.
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer);
  }

  refreshTimer = window.setInterval(() => {
    // No consultar mientras la pestaña esté oculta.
    if (!document.hidden) {
      loadData();
    }
  }, REFRESH_MS);
}

function initDashboard() {
  initCharts();

  const refreshButton = $("refresh-btn");

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      loadData();
    });
  }

  // Primera consulta al abrir el dashboard.
  loadData();

  // Consultas automáticas posteriores.
  startAutoRefresh();

  // Al volver a la pestaña, actualizar sin esperar el siguiente intervalo.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadData();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initDashboard,
    { once: true }
  );
} else {
  initDashboard();
}
