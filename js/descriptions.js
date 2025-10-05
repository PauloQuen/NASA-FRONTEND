document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("meteorito-grid");

  // Extrae el parámetro "id" de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const meteoritoId = urlParams.get("id");

  if (!meteoritoId) {
    grid.innerHTML = `<p class="text-gray-400 text-center">❌ No se proporcionó ningún ID de meteorito.</p>`;
    return;
  }

  try {
    const res = await fetch(`https://api-nasa-meteor.onrender.com/api/neos-front/${meteoritoId}/`);
    const m = await res.json();

    // Verifica si el meteorito existe
    if (!m || !m.name) {
      grid.innerHTML = `<p class="text-gray-400 text-center">No se encontró el meteorito con ID ${meteoritoId}.</p>`;
      return;
    }

    // Genera una sola tarjeta descriptiva
    const description = `
      <div class="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-xl mx-auto">
        <h2 class="text-2xl font-semibold mb-4 text-red-300">${m.name}</h2>

        <div class="space-y-2">
          <p class="text-sm text-gray-300"><strong>ID NASA:</strong> ${m.neo_id}</p>
          <p class="text-sm text-gray-300"><strong>Magnitud Absoluta (H):</strong> ${m.absolute_magnitude_h}</p>
          <p class="text-sm text-gray-300"><strong>Diámetro Estimado:</strong> ${m.estimated_diameter_min.toFixed(2)} - ${m.estimated_diameter_max.toFixed(2)} m</p>
          <p class="text-sm text-gray-300"><strong>Velocidad Relativa:</strong> ${m.relative_velocity.toFixed(2)} km/s</p>
          <p class="text-sm text-gray-300"><strong>Distancia Mínima a la Tierra:</strong> ${parseFloat(m.miss_distance).toLocaleString()} km</p>
          <p class="text-sm text-gray-300"><strong>Fecha de Aproximación:</strong> ${m.close_approach_date}</p>
          <p class="text-sm text-gray-300"><strong>¿Peligroso?:</strong> ${m.is_potentially_hazardous ? "Sí" : "No"}</p>
        </div>

      </div>
    `;

    grid.innerHTML = description;

  } catch (error) {
    console.error("Error cargando meteorito:", error);
    grid.innerHTML = `<p class="text-gray-400 text-center">No se pudo cargar la información del meteorito.</p>`;
  }
});
