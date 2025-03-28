// ------------------------------------------------------
// GLOBALE VARIABELEN
// ------------------------------------------------------
let scene, camera, renderer;
let sun, moon, stars, moonHalo;
let tulips = [], clouds = [];
let cycleProgress = 0;  // 0..1 for the day/night cycle
let bloomFactor = 0;    // 0..1 for the tulip bloom phase

// Cycle speed (lower = slower cycle)
const CYCLE_SPEED = 0.0001;

// Eclipse interval (used to smoothly transition the moon’s offset)
const ECLIPSE_START = 0.45;
const ECLIPSE_END   = 0.55;

// Spawn chance for spores
const SPORE_SPAWN_CHANCE = 0.005;

// Fortune messages in Dutch (feel free to add more for contrast)
const fortuneMessages = [
  "Geluk komt binnenkort!",
  "Doe wat je leuk vindt en je hoeft nooit meer te werken.",
  "Grote dingen beginnen klein.",
  "Blijf dromen, blijf groeien.",
  "Elke stap vooruit is vooruitgang.",
  "Succes is het resultaat van doorzetten.",
  "Vandaag is jouw dag!"
];

// Raycaster and mouse vector for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ------------------------------------------------------
// INIT FUNCTION: SCENE, CAMERA, RENDERER
// ------------------------------------------------------
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 2000
  );
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Soft ambient light
  const ambientLight = new THREE.AmbientLight(0x888888, 1);
  scene.add(ambientLight);

  // Directional light (like a sunbeam)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);

  // Darker fog for a dramatic sky
  scene.fog = new THREE.FogExp2(0x1a0e0c, 0.001);

  // Celestial bodies
  sun = createSun();
  moon = createMoon();
  moonHalo = createMoonHalo();  // extra ring for the eclipse effect
  stars = createStars();

  // Ground
  const ground = createGround();
  scene.add(ground);

  // Increased number of tulips for a richer scene
  for (let i = 0; i < 30; i++) {
    const tulip = createTulip();
    tulip.position.set(
      Math.random() * 200 - 100,
      0,
      Math.random() * 200 - 100
    );
    tulip.spores = [];
    tulips.push(tulip);
    scene.add(tulip);
  }

  // Clouds
  for (let i = 0; i < 7; i++) {
    let cloud = createCloud();
    cloud.position.set(
      Math.random() * 300 - 150,
      Math.random() * 50 + 50,
      Math.random() * 200 - 100
    );
    clouds.push(cloud);
    scene.add(cloud);
  }

  // Position camera a bit farther back
  camera.position.set(0, 50, 300);

  // Event listeners
  window.addEventListener("click", onClick, false);
  window.addEventListener("resize", onWindowResize, false);

  animate();
}

// ------------------------------------------------------
// CELESTIAL BODIES
// ------------------------------------------------------

// Sun
function createSun() {
  const sunGeometry = new THREE.SphereGeometry(20, 64, 64);
  const sunMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
    emissiveIntensity: 1.5,
    roughness: 0.4,
    metalness: 0
  });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);

  // Point light from the sun
  const sunLight = new THREE.PointLight(0xffaa00, 2, 500);
  sunMesh.add(sunLight);

  scene.add(sunMesh);
  return sunMesh;
}

// Moon
function createMoon() {
  const moonGeometry = new THREE.SphereGeometry(15, 32, 32);
  const moonMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xaaaaaa,
    emissive: 0x444444,
    emissiveIntensity: 0,
    roughness: 0.8,
    metalness: 0
  });
  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  scene.add(moonMesh);
  return moonMesh;
}

// Extra "halo" (ring) for the eclipse effect
function createMoonHalo() {
  const haloGeometry = new THREE.RingGeometry(18, 25, 64);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe5aa,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide
  });
  const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
  scene.add(haloMesh);
  return haloMesh;
}

// Stars
function createStars() {
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true
  });
  const starVertices = [];
  for (let i = 0; i < 800; i++) {
    starVertices.push(
      (Math.random() - 0.5) * 2000,
      Math.random() * 1000 - 200,
      (Math.random() - 0.5) * 2000
    );
  }
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starVertices, 3)
  );
  const starsMesh = new THREE.Points(starGeometry, starMaterial);
  scene.add(starsMesh);
  return starsMesh;
}

// ------------------------------------------------------
// GROUND
// ------------------------------------------------------
function createGround() {
  const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b1b0e,
    side: THREE.DoubleSide
  });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -1;
  return groundMesh;
}

// ------------------------------------------------------
// TULIPS
// ------------------------------------------------------
function createTulip() {
  const tulipGroup = new THREE.Group();

  // Stem: a solid backbone pushing the tulip upward
  const stemGeometry = new THREE.CylinderGeometry(0.8, 0.8, 30);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x4cbb17 });
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.y = 15;
  tulipGroup.add(stem);

  // Choose one color per tulip for a strong visual impact
  const singleColor = new THREE.Color(Math.random(), Math.random(), Math.random());

  // Petals: six “wings” that pivot at the top of the stem
  const petalCount = 6;
  const angleStep = (Math.PI * 2) / petalCount;
  const petals = [];

  for (let i = 0; i < petalCount; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 30, 0);
    pivot.rotation.y = i * angleStep;

    // Using a hemisphere shape to symbolize growth
    const petalGeometry = new THREE.SphereGeometry(5, 12, 12, 0, Math.PI);
    const petalMaterial = new THREE.MeshStandardMaterial({ color: singleColor });
    const petalMesh = new THREE.Mesh(petalGeometry, petalMaterial);

    petalMesh.rotation.y = -Math.PI / 2;
    petalMesh.position.z = 5;
    petalMesh.scale.set(1, 1.5, 1);
    petalMesh.scale.multiplyScalar(0); // starts closed

    pivot.add(petalMesh);
    tulipGroup.add(pivot);
    petals.push({ pivot, mesh: petalMesh });
  }
  tulipGroup.petals = petals;
  return tulipGroup;
}

// ------------------------------------------------------
// CLOUDS
// ------------------------------------------------------
function createCloud() {
  const cloudGeometry = new THREE.SphereGeometry(15, 32, 32);
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b4a2c,
    transparent: true,
    opacity: 0.6
  });
  const cloudGroup = new THREE.Group();

  const puffCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < puffCount; i++) {
    let puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
    puff.position.set(
      (Math.random() - 0.5) * 30,
      Math.random() * 5,
      (Math.random() - 0.5) * 30
    );
    puff.scale.setScalar(0.8 + Math.random() * 0.7);
    cloudGroup.add(puff);
  }
  return cloudGroup;
}

// ------------------------------------------------------
// TULIP CLICK HANDLER
// ------------------------------------------------------
function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(tulips, true);

  if (intersects.length > 0) {
    // Only show fortune message when the tulip is nearly fully open and outside the eclipse
    if (bloomFactor > 0.9 && (cycleProgress < ECLIPSE_START || cycleProgress > ECLIPSE_END)) {
      const msg = fortuneMessages[Math.floor(Math.random() * fortuneMessages.length)];
      // You might later replace alert with a styled DOM element for greater contrast
      alert("Gelukswens: " + msg);
    }
  }
}

// ------------------------------------------------------
// WINDOW RESIZE
// ------------------------------------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ------------------------------------------------------
// ANIMATION LOOP
// ------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  // Advance the cycle
  cycleProgress += CYCLE_SPEED;
  if (cycleProgress >= 1) cycleProgress = 0;

  updateCycle();
  updateTulips();

  // Slowly move clouds
  clouds.forEach(cloud => {
    cloud.position.x += 0.05;
    if (cloud.position.x > 300) cloud.position.x = -300;
  });

  renderer.render(scene, camera);
}

// ------------------------------------------------------
// UPDATE DAY/NIGHT CYCLE & ECLIPSE EFFECT
// ------------------------------------------------------
function updateCycle() {
  // Determine sky blend factor for color transitions
  let blendFactor;
  if (cycleProgress < ECLIPSE_START) {
    blendFactor = cycleProgress / ECLIPSE_START; 
  } else if (cycleProgress > ECLIPSE_END) {
    blendFactor = (1 - cycleProgress) / (1 - ECLIPSE_END);
  } else {
    blendFactor = 0.2; // during eclipse, sky is darker
  }

  const nightColor = new THREE.Color(0x120605);
  const dayColor = new THREE.Color(0x5c3b30);
  const skyColor = new THREE.Color().lerpColors(nightColor, dayColor, blendFactor);
  renderer.setClearColor(skyColor, 1);

  // Fade stars in/out
  let starsOpacity = 0;
  if (cycleProgress >= 0.6 && cycleProgress < 0.8) {
    starsOpacity = (cycleProgress - 0.6) * 5;
  } else if (cycleProgress >= 0.8) {
    starsOpacity = 1 - (cycleProgress - 0.8) * 5;
  }
  stars.material.opacity = Math.max(0, Math.min(1, starsOpacity));

  // --- Orbital Motion for Sun and Moon ---
  // Use cycleProgress to compute a full orbit (0 to 2π)
  const orbitRadius = 150;
  const sunAngle = cycleProgress * 2 * Math.PI;
  sun.position.set(
    orbitRadius * Math.cos(sunAngle),
    orbitRadius * Math.sin(sunAngle),
    0
  );

  // Smoothly change the moon’s offset:
  // Outside the eclipse interval, the moon is opposite the sun (offset = π)
  // During eclipse, we smoothly transition the offset to 0 so that they overlap.
  let moonOffset;
  if (cycleProgress < ECLIPSE_START) {
    moonOffset = THREE.MathUtils.lerp(Math.PI, 0, cycleProgress / ECLIPSE_START);
  } else if (cycleProgress > ECLIPSE_END) {
    moonOffset = THREE.MathUtils.lerp(0, Math.PI, (cycleProgress - ECLIPSE_END) / (1 - ECLIPSE_END));
  } else {
    moonOffset = 0;
  }
  const moonAngle = sunAngle + moonOffset;
  moon.position.set(
    orbitRadius * Math.cos(moonAngle),
    orbitRadius * Math.sin(moonAngle),
    0
  );

  // Always show both sun and moon
  sun.visible = true;
  moon.visible = true;

  // Determine if an eclipse effect should be shown (when sun and moon are nearly overlapping)
  const distance = sun.position.distanceTo(moon.position);
  if (distance < 50) {
    // Activate eclipse: show a halo around the moon and enhance glow
    moonHalo.visible = true;
    moonHalo.position.copy(moon.position);
    moonHalo.rotation.x = -Math.PI / 2;
    moonHalo.material.opacity = 0.6;

    gsap.to(sun.material, { emissiveIntensity: 3, duration: 1 });
    gsap.to(moon.material, { emissiveIntensity: 1.5, duration: 1 });
  } else {
    // No eclipse effect
    moonHalo.visible = false;
    gsap.to(sun.material, { emissiveIntensity: 1.5, duration: 1 });
    gsap.to(moon.material, { emissiveIntensity: 0, duration: 1 });
  }
}

// ------------------------------------------------------
// UPDATE TULIPS (BLOOM & SPORES)
// ------------------------------------------------------
function updateTulips() {
  // Compute bloom factor based on cycleProgress:
  if (cycleProgress < 0.25) {
    // Sunrise: scale from 0 to 1
    bloomFactor = cycleProgress * 4;
  } else if (cycleProgress < ECLIPSE_START) {
    bloomFactor = 1;
  } else if (cycleProgress < 0.75) {
    let ratio = (cycleProgress - ECLIPSE_END) / (0.75 - ECLIPSE_END);
    bloomFactor = 1 - Math.max(0, ratio);
  } else {
    bloomFactor = 0;
  }

  // Update each tulip
  tulips.forEach(tulip => {
    // Sway gently
    tulip.rotation.z = 0.1 * Math.sin(Date.now() * 0.0005 + tulip.position.x);

    // Open/close petals based on bloomFactor
    tulip.petals.forEach(({ pivot, mesh }) => {
      const maxOpenAngle = 0.7;
      pivot.rotation.x = THREE.MathUtils.lerp(0.4, -maxOpenAngle, bloomFactor);
      mesh.scale.set(1, 1.5, 1).multiplyScalar(bloomFactor);
    });

    // Spawn spores only when nearly fully bloomed and in “daylight”
    if (bloomFactor > 0.9 && (cycleProgress < ECLIPSE_START || cycleProgress > ECLIPSE_END) && Math.random() < SPORE_SPAWN_CHANCE) {
      spawnSpore(tulip);
    }
    updateSpores(tulip);
  });
}

// ------------------------------------------------------
// SPORE LOGIC
// ------------------------------------------------------
function spawnSpore(tulip) {
  const sporeGeometry = new THREE.SphereGeometry(0.3, 8, 8);
  const sporeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1
  });
  const spore = new THREE.Mesh(sporeGeometry, sporeMaterial);
  spore.position.set(0, 30, 0);
  tulip.add(spore);
  tulip.spores.push(spore);

  // Animate spore rising and fading
  gsap.to(spore.position, { y: spore.position.y + 20, duration: 3, ease: "power1.out" });
  gsap.to(spore.material, {
    opacity: 0,
    duration: 3,
    ease: "power1.out",
    onComplete: () => {
      tulip.remove(spore);
      const index = tulip.spores.indexOf(spore);
      if (index > -1) {
        tulip.spores.splice(index, 1);
      }
    }
  });
}

function updateSpores(tulip) {
  tulip.spores.forEach(spore => {
    spore.position.x += (Math.random() - 0.5) * 0.02;
  });
}

// ------------------------------------------------------
// START
// ------------------------------------------------------
init();
