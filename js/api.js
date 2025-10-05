document.addEventListener("DOMContentLoaded", async () => {
    const grid = document.getElementById("meteorito-grid");

    try {
      const res = await fetch("https://api-nasa-meteor.onrender.com/api/neos-front/");
      const meteoritos = await res.json();

      // Genera las tarjetas de meteoritos
      meteoritos.forEach(m => {
        const card = `
          <div class="bg-gray-800 p-5 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 border border-gray-700">
            <h3 class="text-lg font-semibold text-red-400 mb-2">${m.name}</h3>
            <a href="details-impact.html?id=${m.id}" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium w-full text-center block">
              Ver detalles
            </a>
          </div>`;
        grid.innerHTML += card;
      });
    } catch (error) {
      console.error("Error cargando meteoritos:", error);
      grid.innerHTML = `<p class="text-gray-400 text-center">No se pudieron cargar los meteoritos.</p>`;
    }
  });