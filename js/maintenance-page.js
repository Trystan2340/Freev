const API_BASE = "https://freev-iies.onrender.com";

const byId = (id) => document.getElementById(id);

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

async function loadMaintenance() {
  try {
    const response = await fetch(`${API_BASE}/api/site/config`, { cache: "no-store" });
    if (!response.ok) throw new Error("configuration indisponible");
    const config = await response.json();
    const maintenance = config.maintenance || {};
    byId("maintenance-title").textContent = maintenance.enabled
      ? maintenance.publicTitle || "Maintenance Freev"
      : "Freev est disponible";
    byId("maintenance-message").textContent = maintenance.enabled
      ? maintenance.publicMessage || "Freev revient bientôt."
      : "La maintenance est terminée. Tu peux revenir sur le site.";
    const date = formatDate(maintenance.expectedBackAt);
    byId("maintenance-date").textContent = date ? `Retour estimé : ${date}` : "";
    byId("maintenance-home").hidden = maintenance.enabled === true;
  } catch {
    byId("maintenance-title").textContent = "Vérification en cours";
    byId("maintenance-message").textContent = "Le service de contrôle est momentanément lent. Réessaie dans quelques instants.";
  }
}

byId("maintenance-retry")?.addEventListener("click", loadMaintenance);
loadMaintenance();
