import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const EARTH_RADIUS = 2;
const SIMULATION_START_DISTANCE = 10;

// Variables globales
let scene, camera, renderer, controls, composer;
let earth, asteroid, impactGroup, stars;
let simulationActive = false;
let simulationTime = 0;
const IMPACT_DURATION = 120;
let currentImpactParams = null;
let impactVector = new THREE.Vector3();
let startVector = new THREE.Vector3();

// Estados de control
let isUserControlling = false;
let autoRotate = true;
let lastInteractionTime = 0;
const AUTO_ROTATE_DELAY = 3000; // 3 segundos

// Texturas y materiales mejorados
const textureLoader = new THREE.TextureLoader();

// Inicializar la escena Three.js
async function initThreeJS() {
    const threeContainer = document.getElementById('three-container');
    
    if (!threeContainer) {
        console.error('Contenedor Three.js no encontrado');
        return;
    }

    // 1. Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    scene.fog = new THREE.Fog(0x0a0e17, 15, 30);

    // 2. Cámara
    camera = new THREE.PerspectiveCamera(75, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    threeContainer.appendChild(renderer.domElement);

    // 4. Controles MEJORADOS
    setupEnhancedControls(threeContainer);

    // 5. Crear elementos
    await createEarth();
    createAsteroid();
    createStars();
    
    // 6. Grupo de impacto
    impactGroup = new THREE.Group();
    scene.add(impactGroup);

    // 7. Iluminación
    setupLighting();

    // 8. Crear interfaz de controles
    createControlUI();

    // 9. Iniciar animación
    animate();

    // 10. Manejar redimensionamiento
    window.addEventListener('resize', onWindowResize);
}

function setupEnhancedControls(container) {
    // Controles principales de OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    
    // Configurar límites de rotación
    controls.minPolarAngle = 0; // Desde el polo norte
    controls.maxPolarAngle = Math.PI; // Hasta el polo sur
    controls.minAzimuthAngle = -Infinity; // Rotación horizontal ilimitada
    controls.maxAzimuthAngle = Infinity;

    // Eventos para detectar interacción del usuario
    controls.addEventListener('start', () => {
        isUserControlling = true;
        autoRotate = false;
        controls.autoRotate = false;
        lastInteractionTime = Date.now();
        updateControlUI();
    });

    controls.addEventListener('end', () => {
        isUserControlling = false;
        lastInteractionTime = Date.now();
    });

    // Controles de teclado
    document.addEventListener('keydown', handleKeyPress);

    // Controles táctiles para dispositivos móviles
    setupTouchControls(container);
}

function setupTouchControls(container) {
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouching = false;

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isTouching = true;
            controls.autoRotate = false;
            autoRotate = false;
            updateControlUI();
        }
    });

    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isTouching) {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            const deltaX = touchX - touchStartX;
            const deltaY = touchY - touchStartY;
            
            // Rotación suave basada en el movimiento táctil
            controls.rotateLeft((deltaX * 0.01) * controls.getPolarAngle());
            controls.rotateUp((deltaY * 0.01) * controls.getPolarAngle());
            
            touchStartX = touchX;
            touchStartY = touchY;
            lastInteractionTime = Date.now();
        }
    });

    container.addEventListener('touchend', () => {
        isTouching = false;
        lastInteractionTime = Date.now();
    });
}

function handleKeyPress(event) {
    const rotationSpeed = 0.05;
    const moveSpeed = 0.1;

    switch(event.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
            controls.rotateLeft(rotationSpeed);
            break;
        case 'arrowright':
        case 'd':
            controls.rotateRight(rotationSpeed);
            break;
        case 'arrowup':
        case 'w':
            controls.rotateUp(rotationSpeed);
            break;
        case 'arrowdown':
        case 's':
            controls.rotateDown(rotationSpeed);
            break;
        case 'r':
            // Reset a vista inicial
            resetCamera();
            break;
        case ' ':
            // Toggle rotación automática
            toggleAutoRotate();
            break;
        case 'q':
            // Zoom in
            controls.dollyIn(moveSpeed);
            break;
        case 'e':
            // Zoom out
            controls.dollyOut(moveSpeed);
            break;
    }
    
    controls.autoRotate = false;
    autoRotate = false;
    lastInteractionTime = Date.now();
    updateControlUI();
}

function resetCamera() {
    controls.reset();
    camera.position.set(0, 3, 8);
    controls.target.set(0, 0, 0);
    controls.update();
    
    // Mostrar mensaje de confirmación
    showControlMessage('Vista reiniciada');
}

function toggleAutoRotate() {
    autoRotate = !autoRotate;
    controls.autoRotate = autoRotate;
    updateControlUI();
    
    showControlMessage(autoRotate ? 'Rotación automática: ACTIVADA' : 'Rotación automática: DESACTIVADA');
}

function createControlUI() {
    // Crear contenedor para controles en pantalla
    const controlsContainer = document.createElement('div');
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.top = '10px';
    controlsContainer.style.right = '10px';
    controlsContainer.style.background = 'rgba(0, 0, 0, 0.7)';
    controlsContainer.style.padding = '10px';
    controlsContainer.style.borderRadius = '8px';
    controlsContainer.style.color = 'white';
    controlsContainer.style.fontSize = '12px';
    controlsContainer.style.fontFamily = 'Arial, sans-serif';
    controlsContainer.style.zIndex = '1000';
    controlsContainer.style.backdropFilter = 'blur(10px)';
    controlsContainer.style.border = '1px solid rgba(255, 255, 255, 0.2)';

    controlsContainer.innerHTML = `
        <div style="margin-bottom: 8px; font-weight: bold; color: #ff6b6b;">🎮 Controles</div>
        <div style="margin-bottom: 4px;">🖱️ Arrastra: Rotar Tierra</div>
        <div style="margin-bottom: 4px;">🔄 Rueda: Zoom</div>
        <div style="margin-bottom: 4px;">⌨️ WASD/Flechas: Rotar</div>
        <div style="margin-bottom: 4px;">🔍 Q/E: Zoom In/Out</div>
        <div style="margin-bottom: 4px;">🔄 R: Reset Vista</div>
        <div style="margin-bottom: 4px;">⏯️ Espacio: Auto-Rotar</div>
        <div id="auto-rotate-status" style="margin-top: 8px; padding: 4px; border-radius: 4px; background: #ff4444; text-align: center;">
            Auto: OFF
        </div>
    `;

    document.getElementById('three-container').appendChild(controlsContainer);

    // Crear mensajes temporales
    const messageDiv = document.createElement('div');
    messageDiv.id = 'control-message';
    messageDiv.style.position = 'absolute';
    messageDiv.style.bottom = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.background = 'rgba(0, 0, 0, 0.8)';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '8px 16px';
    messageDiv.style.borderRadius = '20px';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.opacity = '0';
    messageDiv.style.transition = 'opacity 0.3s';
    messageDiv.style.pointerEvents = 'none';
    messageDiv.style.zIndex = '1000';

    document.getElementById('three-container').appendChild(messageDiv);
}

function updateControlUI() {
    const statusElement = document.getElementById('auto-rotate-status');
    if (statusElement) {
        if (autoRotate) {
            statusElement.textContent = 'Auto: ON';
            statusElement.style.background = '#44ff44';
        } else {
            statusElement.textContent = 'Auto: OFF';
            statusElement.style.background = '#ff4444';
        }
    }
}

function showControlMessage(message) {
    const messageDiv = document.getElementById('control-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.opacity = '1';
        
        setTimeout(() => {
            messageDiv.style.opacity = '0';
        }, 2000);
    }
}

async function createEarth() {
    // Geometría de alta resolución
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128);
    
    // Cargar texturas (usando placeholders online)
    const earthTexture = await loadTexture('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg');
    const earthBumpMap = await loadTexture('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg');
    const earthSpecularMap = await loadTexture('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg');

    const earthMaterial = new THREE.MeshPhongMaterial({ 
        map: earthTexture,
        bumpMap: earthBumpMap,
        bumpScale: 0.05,
        specularMap: earthSpecularMap,
        specular: new THREE.Color(0x333333),
        shininess: 5,
        transparent: true,
        opacity: 1
    });
    
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.castShadow = true;
    earth.receiveShadow = true;
    scene.add(earth);

    // Atmósfera
    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.1, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);
}

function loadTexture(url) {
    return new Promise((resolve, reject) => {
        textureLoader.load(
            url,
            resolve,
            undefined,
            () => {
                console.warn(`No se pudo cargar textura: ${url}`);
                resolve(null);
            }
        );
    });
}

function createAsteroid() {
    // Geometría irregular para asteroide
    const asteroidGeometry = new THREE.IcosahedronGeometry(0.15, 1);
    
    // Deformar para hacerlo más irregular
    const positions = asteroidGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        // Agregar ruido para forma irregular
        const noise = 0.1;
        positions.setX(i, x * (1 + Math.random() * noise));
        positions.setY(i, y * (1 + Math.random() * noise));
        positions.setZ(i, z * (1 + Math.random() * noise));
    }
    asteroidGeometry.computeVertexNormals();

    const asteroidMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Marrón rojizo
        roughness: 0.8,
        metalness: 0.2,
        emissive: 0xff4500,
        emissiveIntensity: 0.3
    });
    
    asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    asteroid.castShadow = true;
    asteroid.visible = false;
    scene.add(asteroid);
}

function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 5000;
    const positions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 200;
        positions[i + 1] = (Math.random() - 0.5) * 200;
        positions[i + 2] = (Math.random() - 0.5) * 200;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });
    
    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

function setupLighting() {
    // Luz principal (sol) - más dramática
    const sunLight = new THREE.DirectionalLight(0xffebc8, 3);
    sunLight.position.set(15, 10, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.far = 50;
    scene.add(sunLight);

    // Luz ambiental cálida
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Luz de relleno azulada para contraste
    const fillLight = new THREE.HemisphereLight(0x4477ff, 0x224433, 0.3);
    scene.add(fillLight);
}

function latLonToVector3(lat, lon, radius) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);

    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

// Función global para iniciar simulación
window.startSimulation = function(params) {
    console.log("Iniciando simulación 3D con:", params);
    
    currentImpactParams = params;

    // Calcular vector de impacto
    impactVector = latLonToVector3(params.lat, params.lon, EARTH_RADIUS);
    startVector.copy(impactVector).normalize().multiplyScalar(SIMULATION_START_DISTANCE);

    // Limpiar simulación anterior
    impactGroup.clear();
    asteroid.visible = true;

    // Crear trayectoria con partículas
    createTrajectoryParticles();

    // Posicionar asteroide
    asteroid.position.copy(startVector);
    asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    
    // Configurar cámara para seguir la trayectoria
    const cameraOffset = startVector.clone().normalize().multiplyScalar(5);
    camera.position.copy(startVector).add(cameraOffset);
    controls.target.copy(impactVector);
    controls.autoRotate = false;
    autoRotate = false;
    controls.update();
    updateControlUI();

    // Iniciar simulación
    simulationTime = 0;
    simulationActive = true;
};

function createTrajectoryParticles() {
    const particleCount = 50;
    const trajectoryGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const t = i / particleCount;
        
        // Interpolar posición a lo largo de la trayectoria
        const pos = new THREE.Vector3().lerpVectors(startVector, impactVector, t);
        positions[i3] = pos.x;
        positions[i3 + 1] = pos.y;
        positions[i3 + 2] = pos.z;

        // Colores degradado naranja-amarillo
        colors[i3] = 1; // R
        colors[i3 + 1] = 0.5 + t * 0.5; // G
        colors[i3 + 2] = 0; // B
    }

    trajectoryGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trajectoryGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const trajectoryMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true
    });

    const trajectoryParticles = new THREE.Points(trajectoryGeometry, trajectoryMaterial);
    impactGroup.add(trajectoryParticles);
}

function createImpactVisual(params) {
    const intensity = Math.min(params.diameter / 500, 2);
    
    // Flash inicial
    createImpactFlash();
    
    // Anillo de cráter
    createCraterRing(intensity);
    
    // Onda de choque esférica
    createShockWave(intensity);
    
    // Partículas de explosión
    createExplosionParticles(intensity);
    
    // Efecto de sacudida de cámara
    cameraShake(0.5);
}

function createImpactFlash() {
    const flashGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(impactVector);
    impactGroup.add(flash);

    // Animación flash
    let flashTime = 0;
    function animateFlash() {
        if (flashTime < 10) {
            flashTime++;
            flash.material.opacity = 0.8 * (1 - flashTime / 10);
            flash.scale.setScalar(1 + flashTime * 0.3);
            requestAnimationFrame(animateFlash);
        } else {
            impactGroup.remove(flash);
        }
    }
    animateFlash();
}

function createCraterRing(intensity) {
    const ringGeometry = new THREE.RingGeometry(0.3 * intensity, 0.8 * intensity, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    const craterRing = new THREE.Mesh(ringGeometry, ringMaterial);
    craterRing.position.copy(impactVector);
    craterRing.lookAt(earth.position);
    craterRing.rotateX(THREE.MathUtils.degToRad(90));
    impactGroup.add(craterRing);

    // Animación del anillo
    let ringTime = 0;
    function animateRing() {
        if (ringTime < 30) {
            ringTime++;
            const t = ringTime / 30;
            craterRing.material.opacity = 0.7 * (1 - t);
            craterRing.scale.setScalar(1 + t * 2);
            requestAnimationFrame(animateRing);
        } else {
            impactGroup.remove(craterRing);
        }
    }
    animateRing();
}

function createShockWave(intensity) {
    const waveGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const waveMaterial = new THREE.MeshBasicMaterial({
        color: 0x4477ff,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide,
        wireframe: true
    });
    const shockWave = new THREE.Mesh(waveGeometry, waveMaterial);
    shockWave.position.copy(impactVector);
    impactGroup.add(shockWave);

    let waveScale = 0;
    const maxScale = 5 + intensity * 3;
    const waveAnimDuration = 80;

    function animateShockWave() {
        if (waveScale < waveAnimDuration) {
            waveScale++;
            const t = waveScale / waveAnimDuration;

            const currentScale = THREE.MathUtils.lerp(0.1, maxScale, t);
            shockWave.scale.set(currentScale, currentScale, currentScale);
            shockWave.material.opacity = THREE.MathUtils.lerp(0.4, 0, t);

            requestAnimationFrame(animateShockWave);
        } else {
            impactGroup.remove(shockWave);
        }
    }
    animateShockWave();
}

function createExplosionParticles(intensity) {
    const particleCount = 200 * intensity;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Dirección aleatoria
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 0.1;
        
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);

        // Velocidades aleatorias
        velocities[i3] = (Math.random() - 0.5) * 0.2;
        velocities[i3 + 1] = Math.random() * 0.2;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;

        // Colores fuego
        colors[i3] = Math.random() > 0.5 ? 1 : 0.8; // R
        colors[i3 + 1] = Math.random() * 0.5; // G
        colors[i3 + 2] = 0; // B
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05 * intensity,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        sizeAttenuation: true
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.userData.velocities = velocities;
    particleSystem.position.copy(impactVector);
    impactGroup.add(particleSystem);

    animateParticles(particleSystem, intensity);
}

function animateParticles(particleSystem, intensity) {
    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.userData.velocities;
    let time = 0;

    function animate() {
        if (time < 100) {
            time++;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i] * intensity;
                positions[i + 1] += velocities[i + 1] * intensity;
                positions[i + 2] += velocities[i + 2] * intensity;
                
                // Gravedad
                positions[i + 1] -= 0.005 * intensity;
            }
            
            particleSystem.geometry.attributes.position.needsUpdate = true;
            particleSystem.material.opacity = 1 - (time / 100);
            
            requestAnimationFrame(animate);
        } else {
            impactGroup.remove(particleSystem);
        }
    }
    animate();
}

function cameraShake(intensity) {
    const originalPosition = camera.position.clone();
    let shakeTime = 0;
    const shakeDuration = 20;

    function shake() {
        if (shakeTime < shakeDuration) {
            shakeTime++;
            const t = shakeTime / shakeDuration;
            const shakeIntensity = intensity * (1 - t);
            
            camera.position.x = originalPosition.x + (Math.random() - 0.5) * shakeIntensity;
            camera.position.y = originalPosition.y + (Math.random() - 0.5) * shakeIntensity;
            camera.position.z = originalPosition.z + (Math.random() - 0.5) * shakeIntensity;
            
            requestAnimationFrame(shake);
        } else {
            camera.position.copy(originalPosition);
        }
    }
    shake();
}

function animate() {
    requestAnimationFrame(animate);

    // Rotación automática después de un tiempo sin interacción
    if (!isUserControlling && !autoRotate) {
        const timeSinceInteraction = Date.now() - lastInteractionTime;
        if (timeSinceInteraction > AUTO_ROTATE_DELAY) {
            autoRotate = true;
            controls.autoRotate = true;
            updateControlUI();
        }
    }

    // Rotación constante de la Tierra
    if (autoRotate && !isUserControlling) {
        earth.rotation.y += 0.001;
    }

    // Rotación de las estrellas
    stars.rotation.y += 0.0001;

    // Simulación de impacto
    if (simulationActive) {
        if (simulationTime < IMPACT_DURATION) {
            const t = simulationTime / IMPACT_DURATION;
            asteroid.position.lerpVectors(startVector, impactVector, t);
            
            // Rotación del asteroide durante el vuelo
            asteroid.rotation.x += 0.1;
            asteroid.rotation.y += 0.05;
            
            // Efecto de estela
            asteroid.material.emissiveIntensity = 0.3 + Math.sin(simulationTime * 0.3) * 0.2;
            
            simulationTime++;
        } else {
            simulationActive = false;
            asteroid.visible = false;
            createImpactVisual(currentImpactParams);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const threeContainer = document.getElementById('three-container');
    if (!threeContainer) return;

    const width = threeContainer.clientWidth;
    const height = threeContainer.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThreeJS);
} else {
    initThreeJS();
}