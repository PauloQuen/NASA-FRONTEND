let svg, projection, path, width, height;

function initMap() {
    const container = document.getElementById('d3-map-container');
    if (!container) {
        console.error("D3 container not found.");
        return;
    }

    width = container.clientWidth;
    height = container.clientHeight;

    // 1. Crear el SVG con sombra y efectos
    svg = d3.select(container).append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("filter", "drop-shadow(0 4px 12px rgba(0,0,0,0.5))");

    // 2. Definir gradientes mejorados
    const defs = svg.append("defs");
    
    // Gradiente para zona de riesgo
    const riskGradient = defs.append("radialGradient")
        .attr("id", "riskGradient")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");

    riskGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#ff0000")
        .attr("stop-opacity", 0.8);

    riskGradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#ff4500")
        .attr("stop-opacity", 0.4);

    riskGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#ff0000")
        .attr("stop-opacity", 0);

    // Gradiente para el marcador de impacto
    const impactGradient = defs.append("radialGradient")
        .attr("id", "impactGradient")
        .attr("cx", "30%")
        .attr("cy", "30%")
        .attr("r", "70%");

    impactGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#ffffff")
        .attr("stop-opacity", 1);

    impactGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#ff0000")
        .attr("stop-opacity", 1);

    // 3. Definir la Proyección
    projection = d3.geoMercator()
        .scale(width / (2 * Math.PI))
        .translate([width / 2, height / 2]);

    // 4. Crear el Generador de Rutas
    path = d3.geoPath().projection(projection);

    // 5. Dibujar el fondo (espacio con estrellas)
    drawStarfield();
    
    // 6. Dibujar el globo terráqueo
    svg.append("path")
        .datum({ type: "Sphere" })
        .attr("d", path)
        .attr("fill", "url(#earthGradient)")
        .attr("stroke", "#4b5563")
        .attr("stroke-width", 0.5);

    // 7. Grupo para características del mapa
    const mapFeatures = svg.append("g").attr("class", "map-features");
    
    // 8. Cargar datos del mundo
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
        .then(world => {
            const countries = topojson.feature(world, world.objects.countries);
            
            // Dibujar países
            mapFeatures.selectAll("path.country")
                .data(countries.features)
                .enter().append("path")
                .attr("class", "country")
                .attr("d", path)
                .attr("fill", "#374151")
                .attr("stroke", "#1f2937")
                .attr("stroke-width", 0.3)
                .attr("opacity", 0.9)
                .on("mouseover", function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("fill", "#4b5563")
                        .attr("opacity", 1);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("fill", "#374151")
                        .attr("opacity", 0.9);
                });

            // Efectos
            mapFeatures.selectAll("path.country")
                .clone(true)
                .attr("fill", "#000000")
                .attr("stroke", "none")
                .attr("opacity", 0.1)
                .attr("transform", "translate(2,2)")
                .lower();

        }).catch(error => {
            console.warn("Could not load world map data. Using fallback.", error);
            drawFallbackMap(mapFeatures);
        });

    // Zoom
    const zoom = d3.zoom()
        .scaleExtent([1, 12])
        .on("zoom", (event) => {
            mapFeatures.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Redimensionamiento
    window.addEventListener('resize', handleResize);
}

function drawStarfield() {
    const defs = svg.select("defs");
    
    // Crear patrón de estrellas
    const pattern = defs.append("pattern")
        .attr("id", "starPattern")
        .attr("width", 20)
        .attr("height", 20)
        .attr("patternUnits", "userSpaceOnUse");

    // Agregar estrellas aleatorias al patrón
    for (let i = 0; i < 10; i++) {
        pattern.append("circle")
            .attr("cx", Math.random() * 20)
            .attr("cy", Math.random() * 20)
            .attr("r", Math.random() * 0.5 + 0.1)
            .attr("fill", "#ffffff")
            .attr("opacity", Math.random() * 0.8 + 0.2);
    }

    // Fondo con estrellas
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "url(#starPattern)")
        .lower();
}

function drawFallbackMap(mapFeatures) {
    const fallbackData = {
        type: "FeatureCollection",
        features: [
            createContinent("North America", -140, 20, -50, 70),
            createContinent("South America", -80, -55, -35, 15),
            createContinent("Europe", -10, 35, 40, 70),
            createContinent("Africa", -20, -35, 50, 35),
            createContinent("Asia", 40, 10, 180, 70),
            createContinent("Australia", 110, -45, 155, -10)
        ]
    };

    mapFeatures.selectAll("path.continent")
        .data(fallbackData.features)
        .enter().append("path")
        .attr("class", "continent")
        .attr("d", path)
        .attr("fill", "#374151")
        .attr("stroke", "#1f2937")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.9);
}

function createContinent(name, x1, y1, x2, y2) {
    return {
        type: "Feature",
        properties: { name: name },
        geometry: {
            type: "Polygon",
            coordinates: [[
                [x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]
            ]]
        }
    };
}

function handleResize() {
    const container = document.getElementById('d3-map-container');
    if (!container || !svg) return;
    
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    
    svg.attr("width", newWidth).attr("height", newHeight);
    
    projection.scale(newWidth / (2 * Math.PI))
        .translate([newWidth / 2, newHeight / 2]);

    // Redibujar todas las rutas
    svg.selectAll("path").attr("d", path);
}

/**
 * Dibuja un círculo de impacto y un punto en el mapa.
 */
window.drawImpactZone = function(lat, lon, radiusKm) {
    if (!svg) {
        console.error("Map not initialized.");
        return;
    }

    // Limpiar visualizaciones anteriores
    svg.selectAll(".impact-visualization").remove();

    // Convertir coordenadas a píxeles
    const center = projection([lon, lat]);
    
    if (!center) {
        console.error("Could not project coordinates:", lat, lon);
        return;
    }

    // Crear grupo para la visualización de impacto
    const impactGroup = svg.append("g")
        .attr("class", "impact-visualization");

    // 1. Zona de riesgo con animación de pulso
    const degreesPerKm = 1 / 111.32;
    const radiusDegrees = radiusKm * degreesPerKm;
    const pointAux = projection([lon, lat + radiusDegrees]);
    
    if (pointAux) {
        const pixelRadius = Math.sqrt(
            Math.pow(pointAux[0] - center[0], 2) + 
            Math.pow(pointAux[1] - center[1], 2)
        );

        // Círculo principal de riesgo
        const riskZone = impactGroup.append("circle")
            .attr("class", "risk-zone")
            .attr("cx", center[0])
            .attr("cy", center[1])
            .attr("r", 0)
            .attr("fill", "url(#riskGradient)")
            .attr("stroke", "#ff6b6b")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,2")
            .style("opacity", 0.7);

        // Anillo de pulso
        const pulseRing = impactGroup.append("circle")
            .attr("class", "pulse-ring")
            .attr("cx", center[0])
            .attr("cy", center[1])
            .attr("r", 0)
            .attr("fill", "none")
            .attr("stroke", "#ff4444")
            .attr("stroke-width", 1)
            .style("opacity", 0);

        // Animaciones
        riskZone.transition()
            .duration(1500)
            .ease(d3.easeElasticOut.period(0.6))
            .attr("r", pixelRadius);

        // Animación de pulso continuo
        function pulseAnimation() {
            pulseRing
                .attr("r", 0)
                .style("opacity", 0.8)
                .transition()
                .duration(2000)
                .ease(d3.easeLinear)
                .attr("r", pixelRadius * 1.2)
                .style("opacity", 0)
                .on("end", pulseAnimation);
        }
        pulseAnimation();
    }

    // 2. Marcador de impacto con efectos
    const markerGlow = impactGroup.append("circle")
        .attr("class", "marker-glow")
        .attr("cx", center[0])
        .attr("cy", center[1])
        .attr("r", 0)
        .attr("fill", "#ff4444")
        .attr("opacity", 0.3);

    const marker = impactGroup.append("circle")
        .attr("class", "impact-marker")
        .attr("cx", center[0])
        .attr("cy", center[1])
        .attr("r", 0)
        .attr("fill", "url(#impactGradient)")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 0 8px #ff0000)");

    // Animación del marcador
    markerGlow.transition()
        .duration(1000)
        .attr("r", 15)
        .transition()
        .duration(1000)
        .attr("r", 12)
        .on("end", function() {
            d3.select(this).transition()
                .duration(1000)
                .attr("r", 15)
                .on("end", arguments.callee);
        });

    marker.transition()
        .duration(800)
        .ease(d3.easeBackOut.overshoot(2))
        .attr("r", 8);

    // 3. Efectos de ondas concéntricas
    for (let i = 0; i < 3; i++) {
        const wave = impactGroup.append("circle")
            .attr("class", "impact-wave")
            .attr("cx", center[0])
            .attr("cy", center[1])
            .attr("r", 5)
            .attr("fill", "none")
            .attr("stroke", "#ff6b6b")
            .attr("stroke-width", 1)
            .style("opacity", 0);

        wave.transition()
            .delay(i * 300)
            .duration(1500)
            .ease(d3.easeLinear)
            .attr("r", 50)
            .style("opacity", 0.6)
            .style("opacity", 0)
            .remove();
    }

    // 4. Etiqueta informativa con estilo mejorado
    const labelGroup = impactGroup.append("g")
        .attr("class", "impact-label")
        .attr("transform", `translate(${center[0] + 15}, ${center[1] - 15})`);

    // Fondo de etiqueta
    labelGroup.append("rect")
        .attr("x", -5)
        .attr("y", -15)
        .attr("width", 120)
        .attr("height", 40)
        .attr("rx", 8)
        .attr("fill", "#1f2937")
        .attr("stroke", "#ff6b6b")
        .attr("stroke-width", 1)
        .style("opacity", 0)
        .transition()
        .delay(500)
        .duration(500)
        .style("opacity", 0.9);

    // Texto de coordenadas
    labelGroup.append("text")
        .attr("x", 5)
        .attr("y", 5)
        .attr("fill", "#ff6b6b")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text(`Lat: ${lat.toFixed(2)}°`)
        .style("opacity", 0)
        .transition()
        .delay(700)
        .duration(500)
        .style("opacity", 1);

    labelGroup.append("text")
        .attr("x", 5)
        .attr("y", 18)
        .attr("fill", "#ff6b6b")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text(`Lon: ${lon.toFixed(2)}°`)
        .style("opacity", 0)
        .transition()
        .delay(800)
        .duration(500)
        .style("opacity", 1);

    // 5. Líneas de referencia
    const referenceLines = impactGroup.append("g")
        .attr("class", "reference-lines");

    // Línea horizontal
    referenceLines.append("line")
        .attr("x1", center[0] - 60)
        .attr("y1", center[1])
        .attr("x2", center[0] - 10)
        .attr("y2", center[1])
        .attr("stroke", "#ff6b6b")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,2")
        .style("opacity", 0)
        .transition()
        .delay(300)
        .duration(500)
        .style("opacity", 0.5);

    // Línea vertical
    referenceLines.append("line")
        .attr("x1", center[0])
        .attr("y1", center[1] - 60)
        .attr("x2", center[0])
        .attr("y2", center[1] - 10)
        .attr("stroke", "#ff6b6b")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,2")
        .style("opacity", 0)
        .transition()
        .delay(400)
        .duration(500)
        .style("opacity", 0.5);
};

// Inicializar cuando la página cargue
window.addEventListener('load', initMap);