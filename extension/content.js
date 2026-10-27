// SafeLayer Google Maps Content Script
console.log("[SafeLayer] Google Maps Route-Safety Layer active.");

function injectSafeLayerOverlay() {
  if (document.getElementById("safelayer-injected-badge")) return;

  const badge = document.createElement("div");
  badge.id = "safelayer-injected-badge";
  badge.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span>
      <span style="font-weight:700; color:#fff;">SafeLayer Active:</span>
      <span style="color:#94a3b8;">+3 min alternative avoids 2 unlit stretches</span>
      <a href="http://localhost:3000" target="_blank" style="color:#34d399; font-weight:600; text-decoration:underline; margin-left:6px;">View Intel</a>
    </div>
  `;
  document.body.appendChild(badge);
}

// Inject on load and URL changes
window.addEventListener("load", injectSafeLayerOverlay);
setTimeout(injectSafeLayerOverlay, 2500);
