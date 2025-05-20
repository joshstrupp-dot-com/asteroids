// API key and data
const API = { asteroid: "iEtTLBumhiw8bLDvxDiPnuYqf3foQlYfWJDPZcmr" };

// Solar system state
const solarSystem = {
  asteroids: [],
  planets: [],
  loaded: false,
  container: null,
  ship: {
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    maxSpeed: 5,
    acceleration: 0.2,
    deceleration: 0.1,
    rotationSpeed: 5,
    element: null,
  },
  camera: {
    x: 0,
    y: 0,
    scale: 1,
    zoomFactor: 5, // Reduced from 6 to 4 for a slightly wider view
  },
  keys: {
    up: false,
    down: false,
    left: false,
    right: false,
  },
  earthPosition: {
    x: 0,
    y: 0,
  },
  constants: {
    MIN_DISTANCE: 15000, // Reduced minimum distance
    MAX_DISTANCE: 100000000, // Reduced maximum distance to bring asteroids closer
    ORBIT_SEGMENTS: 100,
    ANIMATION_INTERVAL: 16, // ~60 FPS
    EARTH_SIZE: 60,
    TOOLTIP_DELAY: 500,
    SHIP_ON_EARTH: true, // Start with ship on Earth
    EARTH_INDICATOR_DISTANCE: 100, // Increased distance of indicator from center of screen
    EARTH_INDICATOR_SHOW_THRESHOLD: 150, // Distance from Earth at which to show indicator
  },
  tooltip: null,
  infoPanel: null,
  tooltipTimeout: null,
  earthIndicator: null, // Reference to Earth direction indicator
};

// Position ship over Earth
function positionShipOnEarth() {
  if (!solarSystem.constants.SHIP_ON_EARTH) return;

  const earthSize = solarSystem.constants.EARTH_SIZE * 2;
  const shipSize = 32; // Match the CSS size

  // Position ship at the top center of Earth
  const containerRect = solarSystem.container.getBoundingClientRect();
  const earthCenterX = containerRect.width / 2;
  const earthCenterY = containerRect.height / 2;

  solarSystem.ship.x = earthCenterX;
  solarSystem.ship.y = earthCenterY - earthSize / 2 + shipSize / 4; // Position near top of Earth
  solarSystem.ship.angle = 0; // Point up

  updateShipPosition();
}

// Initialize the solar system
async function initSolarSystem() {
  // Set up container
  solarSystem.container = document.getElementById("solar-system");

  // Create loading indicator
  const loading = document.createElement("div");
  loading.className = "loading";
  loading.innerHTML = "<span>Loading Solar System...</span>";
  solarSystem.container.appendChild(loading);

  // Setup tooltip
  solarSystem.tooltip = document.createElement("div");
  solarSystem.tooltip.className = "tooltip";
  solarSystem.container.appendChild(solarSystem.tooltip);

  // Setup info panel
  solarSystem.infoPanel = document.createElement("div");
  solarSystem.infoPanel.className = "info-panel";
  solarSystem.infoPanel.textContent = "Use arrow keys to navigate";
  solarSystem.container.appendChild(solarSystem.infoPanel);

  // Set up navigation ship
  setupNavShip();

  // Set up Earth direction indicator
  createEarthIndicator();

  // Set up keyboard controls
  setupControls();

  // Load data
  try {
    await Promise.all([loadPlanetsData(), loadAsteroidData()]);

    // Remove loading indicator
    solarSystem.container.removeChild(loading);

    // Build the solar system
    createSolarSystem();

    // Position ship on Earth
    positionShipOnEarth();

    // Start game loop
    solarSystem.loaded = true;
    gameLoop();
  } catch (error) {
    console.error("Error initializing solar system:", error);
    loading.innerHTML = "<span>Error loading data. Please refresh.</span>";
  }
}

// Load planets data
async function loadPlanetsData() {
  try {
    const response = await fetch("planets.json");
    const data = await response.json();
    solarSystem.planets = data.celestial_bodies;
    console.log("Planets data loaded:", solarSystem.planets);
  } catch (error) {
    console.error("Error loading planets data:", error);
    throw error;
  }
}
async function fetchAllData() {
  const today = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD

  // Correct API call: Fetch only today's data
  const asteroidUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${API.asteroid}`;

  try {
    const response = await fetch(asteroidUrl);
    const newData = await response.json();

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    // Prevent redundant updates
    if (JSON.stringify(newData) !== JSON.stringify(previousData)) {
      previousData = newData; // Store the latest data
      display_asteroids(newData, today);
    } else {
      console.log("No new asteroid data, skipping update.");
    }
  } catch (error) {
    console.error("Error fetching asteroid data:", error);
  } finally {
    setTimeout(fetchAllData, 300000); // Fetch again in 5 minutes
  }
}

// Load asteroid data
let previousData = null;

async function loadAsteroidData() {
  const today = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD

  // Correct API call: Fetch only today's data
  const asteroidUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${API.asteroid}`;

  try {
    const response = await fetch(asteroidUrl);
    const newData = await response.json();

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    // Prevent redundant updates
    if (JSON.stringify(newData) !== JSON.stringify(previousData)) {
      previousData = newData; // Store the latest data
      solarSystem.asteroids = newData.near_earth_objects[today];
      console.log("Asteroids data loaded:", solarSystem.asteroids);
    } else {
      console.log("No new asteroid data, skipping update.");
    }
  } catch (error) {
    console.error("Error fetching asteroid data:", error);
  } finally {
    setTimeout(loadAsteroidData, 300000); // Fetch again in 5 minutes
  }
}

// Set up the navigation ship
function setupNavShip() {
  const ship = document.createElement("div");
  ship.className = "nav-ship";

  // Create an img element for the SVG
  const shipImage = document.createElement("img");
  shipImage.src = "assets/ship.svg";
  shipImage.alt = "Spaceship";
  shipImage.style.width = "100%";
  shipImage.style.height = "100%";

  // Add the image to the ship div
  ship.appendChild(shipImage);

  solarSystem.container.appendChild(ship);
  solarSystem.ship.element = ship;

  // Set initial ship position to be at Earth's center
  // The Earth is at the center of the coordinates
  const containerRect = solarSystem.container.getBoundingClientRect();
  solarSystem.ship.x = containerRect.width / 2; // Center of container
  solarSystem.ship.y = containerRect.height / 2; // Center of container

  // Position ship at center of screen (visual position never changes)
  updateShipPosition();
}

// Set up keyboard controls
function setupControls() {
  // Keyboard event listeners
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
        solarSystem.keys.up = true;
        break;
      case "ArrowDown":
        solarSystem.keys.down = true;
        break;
      case "ArrowLeft":
        solarSystem.keys.left = true;
        break;
      case "ArrowRight":
        solarSystem.keys.right = true;
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowUp":
        solarSystem.keys.up = false;
        break;
      case "ArrowDown":
        solarSystem.keys.down = false;
        break;
      case "ArrowLeft":
        solarSystem.keys.left = false;
        break;
      case "ArrowRight":
        solarSystem.keys.right = false;
        break;
    }
  });
}

// Create the solar system visualization
function createSolarSystem() {
  const containerRect = solarSystem.container.getBoundingClientRect();
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;

  // Update earth position
  solarSystem.earthPosition = {
    x: centerX,
    y: centerY,
  };

  // Add Earth to the center
  createEarth(centerX, centerY);

  // Create orbits and planets
  createOrbits(centerX, centerY);

  // Create asteroids
  createAsteroids(centerX, centerY);
}

// Create Earth at the center
function createEarth(centerX, centerY) {
  const earthSize = solarSystem.constants.EARTH_SIZE * 2; // Make Earth significantly larger
  const earth = document.createElement("div");
  earth.className = "earth";
  earth.style.width = `${earthSize}px`;
  earth.style.height = `${earthSize}px`;
  earth.style.left = `${centerX - earthSize / 2}px`;
  earth.style.top = `${centerY - earthSize / 2}px`;
  earth.style.backgroundImage =
    "url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/The_Blue_Marble_%28remastered%29.jpg/240px-The_Blue_Marble_%28remastered%29.jpg')";

  earth.addEventListener("mouseover", () => {
    showTooltip(earth, "Earth", centerX, centerY - earthSize / 2 - 20);
  });

  earth.addEventListener("mouseout", () => {
    hideTooltip();
  });

  solarSystem.container.appendChild(earth);
}

// Create orbit circles - with modifications to make them more visible with zoom
function createOrbits(centerX, centerY) {
  // Calculate orbit sizes based on asteroid and planet distances
  const distances = new Set();

  // Add planet distances only - asteroids now have their own non-circular paths
  solarSystem.planets.forEach((planet) => {
    if (
      planet.name !== "Earth" &&
      planet.distance_km <= solarSystem.constants.MAX_DISTANCE
    ) {
      distances.add(planet.distance_km);
    }
  });

  // Sort distances and create orbits - limit the number of orbits for clarity
  const sortedDistances = Array.from(distances).sort((a, b) => a - b);

  // Only show some of the orbits to avoid clutter
  const maxOrbits = 15;
  const orbitsToShow =
    sortedDistances.length <= maxOrbits
      ? sortedDistances
      : sortedDistances.filter(
          (_, i) => i % Math.ceil(sortedDistances.length / maxOrbits) === 0
        );

  orbitsToShow.forEach((distance) => {
    const orbitRadius = distanceToPixels(distance);
    const orbit = document.createElement("div");
    orbit.className = "orbit";
    orbit.style.width = `${orbitRadius * 2}px`;
    orbit.style.height = `${orbitRadius * 2}px`;
    orbit.style.left = `${centerX - orbitRadius}px`;
    orbit.style.top = `${centerY - orbitRadius}px`;
    solarSystem.container.appendChild(orbit);
  });

  // Add planets to their orbits
  solarSystem.planets.forEach((planet) => {
    if (planet.name === "Earth") return; // Skip Earth as it's at the center

    const distance = planet.distance_km;
    if (distance > solarSystem.constants.MAX_DISTANCE) return;

    const orbitRadius = distanceToPixels(distance);
    const diameterInPixels = Math.max(
      10,
      Math.min(30, planet.diameter_km / 500)
    );

    // Create planet at random position on its orbit
    const angle = Math.random() * Math.PI * 2;
    const xPosition = 0 + orbitRadius * Math.cos(angle);
    const yPosition = 0 + orbitRadius * Math.sin(angle);

    const planetElement = document.createElement("div");
    planetElement.className = "planet";
    planetElement.style.width = `${diameterInPixels}px`;
    planetElement.style.height = `${diameterInPixels}px`;
    planetElement.style.left = `${xPosition - diameterInPixels / 2}px`;
    planetElement.style.top = `${yPosition - diameterInPixels / 2}px`;

    planetElement.dataset.distance = distance;
    planetElement.dataset.name = planet.name;

    planetElement.addEventListener("mouseover", () => {
      const tooltip = `${planet.name}\nDistance: ${(distance / 1000000).toFixed(
        2
      )}M km`;
      showTooltip(
        planetElement,
        tooltip,
        xPosition,
        yPosition - diameterInPixels - 20
      );
    });

    planetElement.addEventListener("mouseout", () => {
      hideTooltip();
    });

    solarSystem.container.appendChild(planetElement);
  });
}
function getRandomSize(maxSizeMeters, minSizeMeters) {
  return Math.random() * (maxSizeMeters - minSizeMeters) + minSizeMeters;
}
// Create asteroids on their orbits
function createAsteroids(centerX, centerY) {
  solarSystem.asteroids.forEach((asteroid) => {
    const missDistance = parseFloat(
      asteroid.close_approach_data[0].miss_distance.kilometers
    );

    // Skip if outside our range
    if (missDistance > solarSystem.constants.MAX_DISTANCE) return;

    const orbitRadius = distanceToPixels(missDistance);

    const minSizeMeters =
      asteroid.estimated_diameter.meters.estimated_diameter_min;
    const maxSizeMeters =
      asteroid.estimated_diameter.meters.estimated_diameter_max;

    const diameterInPixels = Math.max(2, Math.min(25, minSizeMeters / 2));

    // Get velocity in km/s for tooltip display
    const velocityKmS = parseFloat(
      asteroid.close_approach_data[0].relative_velocity.kilometers_per_second
    );

    // Get velocity in km/h for animation calculations
    const velocityKmH = parseFloat(
      asteroid.close_approach_data[0].relative_velocity.kilometers_per_hour
    );

    // Create asteroid element
    const asteroidElement = document.createElement("div");
    asteroidElement.className = "asteroid";
    // Add sentry class if it's a sentry object
    if (asteroid.is_sentry_object === true) {
      asteroidElement.classList.add("sentry-object");
    }
    asteroidElement.style.width = `${diameterInPixels}px`;
    asteroidElement.style.height = `${diameterInPixels}px`;

    // Create a trailing gradient to show path
    const tailElement = document.createElement("div");
    tailElement.className = "asteroid-tail";
    // Calculate tail length based on velocity (faster = longer tail)
    const tailLengthFactor = Math.min(1, velocityKmS / 50); // Normalize velocity to 0-1 range with higher factor
    const tailLength = 30 + tailLengthFactor * 120; // Scale to 30-150px for more dramatic tails
    tailElement.style.width = `${tailLength}px`;
    // Add sentry class if it's a sentry object
    if (asteroid.is_sentry_object === true) {
      tailElement.classList.add("sentry-tail");
    }
    // Append the tail first so it appears behind the asteroid
    solarSystem.container.appendChild(tailElement);

    // Generate random orbit offset for non-circular paths
    // This creates an elliptical/irregular orbit instead of a perfect circle
    const orbitCenterOffsetX =
      Math.random() * (orbitRadius * 0.4) - orbitRadius * 0.2;
    const orbitCenterOffsetY =
      Math.random() * (orbitRadius * 0.4) - orbitRadius * 0.2;

    // Store asteroid data for animation
    asteroidElement.dataset.name = asteroid.name;
    asteroidElement.dataset.distance = missDistance;
    asteroidElement.dataset.velocityKmS = velocityKmS; // Store velocity in km/s for tooltip
    asteroidElement.dataset.orbitRadius = orbitRadius;
    asteroidElement.dataset.centerX = centerX;
    asteroidElement.dataset.centerY = centerY;
    asteroidElement.dataset.diameter = diameterInPixels;
    asteroidElement.dataset.actualDiameter = minSizeMeters; // Store actual size for tooltip
    asteroidElement.dataset.isSentry = asteroid.is_sentry_object; // Store sentry status
    asteroidElement.dataset.tailId = tailElement.id =
      "tail-" + Math.random().toString(36).substr(2, 9);
    asteroidElement.dataset.tailLength = tailLength;
    asteroidElement.dataset.orbitOffsetX = orbitCenterOffsetX;
    asteroidElement.dataset.orbitOffsetY = orbitCenterOffsetY;

    // Create permanent tooltip for the asteroid with more information
    const tooltipElement = document.createElement("div");
    tooltipElement.className = "permanent-tooltip";
    tooltipElement.innerHTML = formatAsteroidTooltip(
      asteroid.name,
      velocityKmS,
      missDistance
    );
    tooltipElement.dataset.tooltipFor = asteroidElement.id =
      "asteroid-" + Math.random().toString(36).substr(2, 9);
    solarSystem.container.appendChild(tooltipElement);

    // Calculate how much of the circle (in radians) the asteroid should move per frame
    // A full circle (2π radians) represents a full day (24 hours)
    // So the velocity determines what fraction of the day is covered per hour
    // Then we adjust for the frame rate (60fps = 3600 frames per hour)
    const radiansPerHour = (2 * Math.PI) / 24; // Base movement: full circle in 24 hours
    const velocityFactor = velocityKmH / 50000; // Scale factor to make velocity differences visible
    const scaledRadiansPerHour = radiansPerHour * (1 + velocityFactor); // Adjust speed based on velocity
    const radiansPerFrame = scaledRadiansPerHour / 3600; // Convert to radians per frame (assuming 60fps)

    asteroidElement.dataset.velocity = radiansPerFrame;

    // Set initial position on orbit based on the time of day from epoch
    const epoch = asteroid.close_approach_data[0].epoch_date_close_approach;
    const date = new Date(epoch);
    const hoursOfDay = date.getUTCHours() + date.getUTCMinutes() / 60;
    const dayProgress = hoursOfDay / 24; // 0 to 1 representing progress through the day

    // Convert to angle in radians (0 to 2π)
    const angle = dayProgress * 2 * Math.PI;
    asteroidElement.dataset.angle = angle;

    // Calculate position using the offset center (for non-circular path)
    const xPosition =
      centerX + orbitCenterOffsetX + orbitRadius * Math.cos(angle);
    const yPosition =
      centerY + orbitCenterOffsetY + orbitRadius * Math.sin(angle);

    // Set position
    asteroidElement.style.left = `${xPosition - diameterInPixels / 2}px`;
    asteroidElement.style.top = `${yPosition - diameterInPixels / 2}px`;

    solarSystem.container.appendChild(asteroidElement);
  });
}

// Format tooltip text for asteroids
function formatAsteroidTooltip(name, velocity, distance) {
  return `${name}<br>Velocity: ${velocity.toFixed(2)} km/s<br>Distance: ${(
    distance / 1000000
  ).toFixed(2)}M km`;
}

// Convert astronomical distance to pixels for visualization with zoom consideration
function distanceToPixels(distance) {
  const { MIN_DISTANCE, MAX_DISTANCE } = solarSystem.constants;

  // Use log scale for better visualization
  const logMin = Math.log10(MIN_DISTANCE + 1);
  const logMax = Math.log10(MAX_DISTANCE);
  const logDist = Math.log10(distance + 1);

  // Calculate radius proportion (0 to 1)
  const proportion = (logDist - logMin) / (logMax - logMin);

  // Calculate radius in pixels (min 40px, max is 40% of the smaller container dimension)
  const containerRect = solarSystem.container.getBoundingClientRect();
  const maxRadius = Math.min(containerRect.width, containerRect.height) * 0.4;

  // Apply zoom factor to make orbits appear larger
  return (40 + proportion * (maxRadius - 40)) * solarSystem.camera.zoomFactor;
}

// Show tooltip with information
function showTooltip(element, text, x, y) {
  clearTimeout(solarSystem.tooltipTimeout);

  solarSystem.tooltipTimeout = setTimeout(() => {
    solarSystem.tooltip.innerHTML = `<h4>${text}</h4>`;
    solarSystem.tooltip.style.left = `${x}px`;
    solarSystem.tooltip.style.top = `${y}px`;
    solarSystem.tooltip.style.opacity = "1";
  }, solarSystem.constants.TOOLTIP_DELAY);
}

// Hide tooltip
function hideTooltip() {
  clearTimeout(solarSystem.tooltipTimeout);
  solarSystem.tooltip.style.opacity = "0";
}

// Game loop
function gameLoop() {
  if (!solarSystem.loaded) return;

  // Update ship position and rotation based on controls
  updateShip();

  // Update camera to follow ship (keeps ship centered)
  updateCamera();

  // Update all celestial bodies
  updateAsteroids();
  updateElementPositions();

  // Update Earth indicator
  updateEarthIndicator();

  // Update info panel
  updateInfoPanel();

  // Request next frame
  requestAnimationFrame(gameLoop);
}

// Update ship position and rotation based on controls
function updateShip() {
  const prevX = solarSystem.ship.x;
  const prevY = solarSystem.ship.y;

  // Update rotation
  if (solarSystem.keys.left) {
    solarSystem.ship.angle -= solarSystem.ship.rotationSpeed;
  }
  if (solarSystem.keys.right) {
    solarSystem.ship.angle += solarSystem.ship.rotationSpeed;
  }

  // Update speed
  if (solarSystem.keys.up) {
    solarSystem.ship.speed = Math.min(
      solarSystem.ship.maxSpeed,
      solarSystem.ship.speed + solarSystem.ship.acceleration
    );
    // When we start moving, ship is no longer on Earth
    solarSystem.constants.SHIP_ON_EARTH = false;
  } else if (solarSystem.keys.down) {
    solarSystem.ship.speed = Math.max(
      -solarSystem.ship.maxSpeed / 2,
      solarSystem.ship.speed - solarSystem.ship.acceleration
    );
    // When we start moving, ship is no longer on Earth
    solarSystem.constants.SHIP_ON_EARTH = false;
  } else {
    // Apply deceleration when no keys are pressed
    if (solarSystem.ship.speed > 0) {
      solarSystem.ship.speed = Math.max(
        0,
        solarSystem.ship.speed - solarSystem.ship.deceleration
      );
    } else if (solarSystem.ship.speed < 0) {
      solarSystem.ship.speed = Math.min(
        0,
        solarSystem.ship.speed + solarSystem.ship.deceleration
      );
    }
  }

  // Update position
  const radians = (solarSystem.ship.angle * Math.PI) / 180;

  // If ship is still on Earth, keep it positioned there
  if (solarSystem.constants.SHIP_ON_EARTH) {
    // Position ship on Earth's surface
    const containerRect = solarSystem.container.getBoundingClientRect();
    solarSystem.ship.x = containerRect.width / 2;
    solarSystem.ship.y = containerRect.height / 2;
  } else {
    // Normal movement physics
    solarSystem.ship.x += Math.sin(radians) * solarSystem.ship.speed;
    solarSystem.ship.y -= Math.cos(radians) * solarSystem.ship.speed;
  }

  // Update visual position and rotation
  updateShipPosition();
}

// Update ship's DOM element
function updateShipPosition() {
  if (!solarSystem.ship.element) return;

  // Ship stays fixed at the center of the screen
  const containerRect = solarSystem.container.getBoundingClientRect();
  const screenCenterX = containerRect.width / 2;
  const screenCenterY = containerRect.height / 2;

  // Only update rotation, position is always center of screen
  solarSystem.ship.element.style.transform = `translate(-50%, -50%) rotate(${solarSystem.ship.angle}deg)`;
  solarSystem.ship.element.style.left = `${screenCenterX}px`;
  solarSystem.ship.element.style.top = `${screenCenterY}px`;
}

// Update asteroids' positions based on time
function updateAsteroids() {
  const asteroidElements = document.querySelectorAll(".asteroid");
  const containerRect = solarSystem.container.getBoundingClientRect();
  const viewportBuffer = 100; // Extra buffer beyond viewport to keep asteroids active

  asteroidElements.forEach((asteroidElement) => {
    // Get asteroid data
    const orbitRadius = parseFloat(asteroidElement.dataset.orbitRadius);
    const centerX = parseFloat(asteroidElement.dataset.centerX);
    const centerY = parseFloat(asteroidElement.dataset.centerY);
    const diameter = parseFloat(asteroidElement.dataset.diameter);
    const velocity = parseFloat(asteroidElement.dataset.velocity);
    const orbitOffsetX = parseFloat(asteroidElement.dataset.orbitOffsetX || 0);
    const orbitOffsetY = parseFloat(asteroidElement.dataset.orbitOffsetY || 0);
    const tailId = asteroidElement.dataset.tailId;
    const tailLength = parseFloat(asteroidElement.dataset.tailLength || 30);
    const velocityKmS = parseFloat(asteroidElement.dataset.velocityKmS || 20);

    // Update angle
    let angle = parseFloat(asteroidElement.dataset.angle);
    angle = (angle + velocity) % (Math.PI * 2);
    asteroidElement.dataset.angle = angle;

    // Calculate new position with offset center (for non-circular paths)
    const xPosition = centerX + orbitOffsetX + orbitRadius * Math.cos(angle);
    const yPosition = centerY + orbitOffsetY + orbitRadius * Math.sin(angle);

    // Apply camera offset
    const screenX = xPosition - solarSystem.camera.x;
    const screenY = yPosition - solarSystem.camera.y;

    // Check if asteroid is within viewport (plus buffer)
    const isVisible =
      screenX >= -viewportBuffer &&
      screenX <= containerRect.width + viewportBuffer &&
      screenY >= -viewportBuffer &&
      screenY <= containerRect.height + viewportBuffer;

    // Only update visible asteroids for performance
    if (isVisible) {
      asteroidElement.style.display = "block";
      asteroidElement.style.left = `${screenX - diameter / 2}px`;
      asteroidElement.style.top = `${screenY - diameter / 2}px`;

      // Update tail position and rotation
      const tail = document.getElementById(tailId);
      if (tail) {
        tail.style.display = "block";

        // Calculate movement direction to position tail correctly
        // Look back along the path by several steps to create a curved tail effect
        const prevAngles = [];
        const steps = 5; // Number of steps to look back

        for (let i = 1; i <= steps; i++) {
          // Look ahead in direction of motion for tail positioning
          const lookAheadAngle = (angle + velocity * i * 3) % (Math.PI * 2);
          prevAngles.push(lookAheadAngle);
        }

        // Calculate the future position for tail direction
        const futureX =
          centerX + orbitOffsetX + orbitRadius * Math.cos(prevAngles[0]);
        const futureY =
          centerY + orbitOffsetY + orbitRadius * Math.sin(prevAngles[0]);

        // Calculate rotation angle for the tail (point in direction of movement)
        const dx = futureX - xPosition;
        const dy = futureY - yPosition;
        const tailAngle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Position tail at the asteroid's position
        tail.style.left = `${screenX}px`;
        tail.style.top = `${screenY}px`;

        // Set tail width based on velocity
        tail.style.width = `${tailLength}px`;
        // Align the tail to trail behind the asteroid (opposite of movement direction)
        tail.style.transform = `translate(0, -50%) rotate(${
          tailAngle + 180
        }deg)`;
      }

      // Update permanent tooltip position - position it to the right of the asteroid
      const tooltip = document.querySelector(
        `.permanent-tooltip[data-tooltip-for="${asteroidElement.id}"]`
      );
      if (tooltip) {
        tooltip.style.display = "block";
        // Position tooltip to the right of the asteroid with a small gap
        tooltip.style.left = `${screenX + diameter + 10}px`;
        tooltip.style.top = `${
          screenY - tooltip.offsetHeight / 2 + diameter / 2
        }px`;
        // Reset transform that was centering it above
        tooltip.style.transform = "none";
      }
    } else {
      asteroidElement.style.display = "none";

      // Hide tail when asteroid is not visible
      const tail = document.getElementById(tailId);
      if (tail) {
        tail.style.display = "none";
      }

      // Hide tooltip when asteroid is not visible
      const tooltip = document.querySelector(
        `.permanent-tooltip[data-tooltip-for="${asteroidElement.id}"]`
      );
      if (tooltip) {
        tooltip.style.display = "none";
      }
    }
  });
}

// Update camera position to follow ship
function updateCamera() {
  // Camera is always centered on the ship
  // Calculate camera position based on ship's position
  const containerRect = solarSystem.container.getBoundingClientRect();
  const screenCenterX = containerRect.width / 2;
  const screenCenterY = containerRect.height / 2;

  // Calculate camera offset to keep ship centered
  solarSystem.camera.x = solarSystem.ship.x - screenCenterX;
  solarSystem.camera.y = solarSystem.ship.y - screenCenterY;

  // Update positions of all elements based on camera
  updateElementPositions();
}

// Update all element positions based on camera offset
function updateElementPositions() {
  // Update Earth position
  const earth = document.querySelector(".earth");
  if (earth) {
    const earthSize = solarSystem.constants.EARTH_SIZE * 2; // Match the size used in createEarth
    const screenX = solarSystem.earthPosition.x - solarSystem.camera.x;
    const screenY = solarSystem.earthPosition.y - solarSystem.camera.y;

    earth.style.left = `${screenX - earthSize / 2}px`;
    earth.style.top = `${screenY - earthSize / 2}px`;
  }

  // Update planets position
  const planets = document.querySelectorAll(".planet");
  planets.forEach((planet) => {
    const left = parseFloat(planet.style.left) + planet.offsetWidth / 2;
    const top = parseFloat(planet.style.top) + planet.offsetHeight / 2;

    // Convert to world coordinates, then back to screen with camera offset
    const worldX = left + solarSystem.camera.x;
    const worldY = top + solarSystem.camera.y;

    // Calculate new screen position
    const screenX = worldX - solarSystem.camera.x;
    const screenY = worldY - solarSystem.camera.y;

    planet.style.left = `${screenX - planet.offsetWidth / 2}px`;
    planet.style.top = `${screenY - planet.offsetHeight / 2}px`;
  });

  // Update orbits position
  const orbits = document.querySelectorAll(".orbit");
  orbits.forEach((orbit) => {
    const width = parseFloat(orbit.style.width);
    const radius = width / 2;

    const worldX = solarSystem.earthPosition.x;
    const worldY = solarSystem.earthPosition.y;

    const screenX = worldX - solarSystem.camera.x;
    const screenY = worldY - solarSystem.camera.y;

    orbit.style.left = `${screenX - radius}px`;
    orbit.style.top = `${screenY - radius}px`;
  });
}

// Update the info panel with current data
function updateInfoPanel() {
  // Calculate distance from Earth
  const dx = solarSystem.ship.x - solarSystem.earthPosition.x;
  const dy = solarSystem.ship.y - solarSystem.earthPosition.y;
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);

  // Find the closest visible asteroid to use as reference
  let closestAsteroid = null;
  let closestDistance = Infinity;

  const asteroidElements = document.querySelectorAll(".asteroid");
  asteroidElements.forEach((asteroid) => {
    if (asteroid.style.display === "none") return;

    // Get the asteroid's screen position
    const asteroidX =
      parseFloat(asteroid.style.left) + asteroid.offsetWidth / 2;
    const asteroidY =
      parseFloat(asteroid.style.top) + asteroid.offsetHeight / 2;

    // Get the ship's screen position (center of screen)
    const containerRect = solarSystem.container.getBoundingClientRect();
    const shipX = containerRect.width / 2;
    const shipY = containerRect.height / 2;

    // Calculate pixel distance between ship and asteroid
    const dx = shipX - asteroidX;
    const dy = shipY - asteroidY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestAsteroid = asteroid;
    }
  });

  // Calculate distance from Earth based on the closest asteroid's actual distance
  let distanceKm = 0;

  if (closestAsteroid) {
    // Get the asteroid's actual distance from Earth in km
    const asteroidDistance = parseFloat(closestAsteroid.dataset.distance);

    // Calculate the ship's distance using the closest asteroid as reference
    // The closer the ship is to the asteroid visually, the closer it is to the asteroid's actual distance
    const asteroidOrbitRadius = parseFloat(closestAsteroid.dataset.orbitRadius);

    // Calculate what percentage of the asteroid's orbit radius the ship is at
    const shipOrbitRatio = pixelDistance / asteroidOrbitRadius;

    // Scale the actual distance accordingly
    distanceKm = asteroidDistance * shipOrbitRatio;
  } else {
    // Fallback to the old calculation if no asteroids are visible
    const containerRect = solarSystem.container.getBoundingClientRect();
    const maxRadius =
      Math.min(containerRect.width, containerRect.height) * 0.45;
    const proportion = (pixelDistance - 50) / (maxRadius - 50);

    if (proportion > 0) {
      const { MIN_DISTANCE, MAX_DISTANCE } = solarSystem.constants;
      const logMin = Math.log10(MIN_DISTANCE + 1);
      const logMax = Math.log10(MAX_DISTANCE);
      const logDist = proportion * (logMax - logMin) + logMin;
      distanceKm = Math.pow(10, logDist) - 1;
    }
  }
  addButtons();
  // Update info text
  solarSystem.infoPanel.innerHTML = `
    <h3 style="font-weight: bold; padding-bottom:4px; font-size:18px;">Use Arrows to Navigate</h3>
    <h3>Speed: ${solarSystem.ship.speed.toFixed(1)} px/s</h3>
    <h3>Distance from Earth: ${(distanceKm / 1000000).toFixed(2)}M km</h3>
    <h3>Total Asteroids: ${solarSystem.asteroids.length}</h3>
    
`;
}

// Start the solar system
document.addEventListener("DOMContentLoaded", initSolarSystem);

function xmlToJson(xml) {
  let obj = {};

  // Check if XML is an element node (i.e., not text)
  if (xml.nodeType === 1) {
    // If the element has attributes, add them to the JSON object
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (let i = 0; i < xml.attributes.length; i++) {
        const attribute = xml.attributes.item(i);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType === 3) {
    // Text node
    obj = xml.nodeValue;
  }

  // Process child nodes (recursively)
  if (xml.hasChildNodes()) {
    for (let i = 0; i < xml.childNodes.length; i++) {
      const item = xml.childNodes.item(i);
      const nodeName = item.nodeName;
      if (typeof obj[nodeName] === "undefined") {
        obj[nodeName] = xmlToJson(item); // Recursively process children
      } else {
        if (typeof obj[nodeName].push === "undefined") {
          const old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item)); // Push multiple elements of the same name
      }
    }
  }
  return obj;
}

function addButtons() {
  // Check if reset button already exists
  const existingButton = document.getElementById("reset-button");
  if (existingButton) {
    // If button already exists, don't create a new one
    return;
  }

  // Create and set up the reset button but don't display it
  const resetButton = document.createElement("button");
  resetButton.innerHTML = `<img src="/assets/reset.svg" alt="Reset" width="23" height="20">`;
  resetButton.id = "reset-button";
  // resetButton.style.display = "none"; // Hide the button

  resetButton.addEventListener("click", () => {
    // Reset ship's position to Earth's position
    solarSystem.ship.x = solarSystem.earthPosition.x;
    solarSystem.ship.y = solarSystem.earthPosition.y;

    // Update camera to the new position
    updateCamera();
  });

  // Append the reset button to the body
  document.body.appendChild(resetButton);

  // Create and set up the info toggle button
  const infoButton = document.createElement("button");
  infoButton.innerHTML = `<img src="/assets/info-off.svg" alt="Info" width="32" height="32">`;
  infoButton.id = "info-button";
  infoButton.className = "info-toggle";
  infoButton.setAttribute("aria-label", "Toggle legend");

  // Create the legend container element
  const legendContainer = document.createElement("div");
  legendContainer.id = "legend-container";
  legendContainer.className = "legend-popup";
  legendContainer.style.display = "none";

  // Add the legend SVG to the container
  const legendImg = document.createElement("img");
  legendImg.src = "/assets/legend.svg";
  legendImg.alt = "Legend information";
  legendImg.style.width = "100%";
  legendImg.style.height = "100%";
  legendContainer.appendChild(legendImg);

  // Add the container to the body
  document.body.appendChild(legendContainer);

  // Toggle state for the info button
  let legendVisible = false;

  // Info button click handler
  infoButton.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent the document click from immediately hiding it
    legendVisible = !legendVisible;

    if (legendVisible) {
      // Show legend and change button image
      legendContainer.style.display = "block";
      infoButton.innerHTML = `<img src="/assets/info-on.svg" alt="Info" width="32" height="32">`;
    } else {
      // Hide legend and change button image back
      legendContainer.style.display = "none";
      infoButton.innerHTML = `<img src="/assets/info-off.svg" alt="Info" width="32" height="32">`;
    }
  });

  // Prevent closing when clicking inside the legend
  legendContainer.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Close legend when clicking outside of it
  document.addEventListener("click", (e) => {
    if (
      legendVisible &&
      e.target !== infoButton &&
      !infoButton.contains(e.target) &&
      e.target !== legendContainer &&
      !legendContainer.contains(e.target)
    ) {
      legendVisible = false;
      legendContainer.style.display = "none";
      infoButton.innerHTML = `<img src="/assets/info-off.svg" alt="Info" width="32" height="32">`;
    }
  });

  // Append the info button
  document.body.appendChild(infoButton);

  // Create a container for the legend
  const legendEntries = document.createElement("div");
  legendEntries.id = "legend";
  document.body.appendChild(legendEntries);

  // Define the legend entries
  const entries = [
    { label: "ASTEROID", color: "white" },
    { label: "POTENTIALLY DANGEROUS", color: "#ff4444" },
  ];

  // Create each legend entry
  entries.forEach((entry) => {
    // Create entry container
    const entryDiv = document.createElement("div");
    entryDiv.className = "legend-entry";

    // Add label
    const label = document.createElement("h3");
    label.textContent = entry.label;
    entryDiv.appendChild(label);

    // Add color dot
    const dot = document.createElement("div");
    dot.className = "legend-icon";
    dot.style.width = "12px";
    dot.style.height = "12px";
    dot.style.backgroundColor = entry.color;
    dot.style.marginLeft = "8px";
    dot.style.borderRadius = "50%";
    entryDiv.appendChild(dot);

    // Add to legend
    legendEntries.appendChild(entryDiv);
  });

  //this is half-balked code for the zoom button:

  // // Create and set up the zoom toggle button
  // const toggleZoom = document.createElement("button");
  // toggleZoom.innerHTML = "Zoom in/out";
  // toggleZoom.id = "zoom-toggle";

  // let zoomFactor = 1;  // Initial zoom state (zoomed out)

  // toggleZoom.addEventListener("click", () => {
  //     console.log("Zoom factor:", zoomFactor);

  //     if (zoomFactor === 1) {
  //         // Zoom in (change zoom factor to 5)
  //         solarSystem.camera.zoomFactor = 5;

  //         // Clear previous elements before creating new ones
  //         d3.select("#solar-system").selectAll("*").remove(); // This will remove all child elements inside the container

  //         createSolarSystem();

  //         console.log("Zoomed in, zoom factor:", zoomFactor);
  //     } else {
  //         // Zoom out (reset zoom factor to 1)
  //         solarSystem.camera.zoomFactor = 1;

  //         // Clear previous elements before creating new ones
  //         d3.select("#solar-system").selectAll("*").remove(); // This will remove all child elements inside the container

  //         // Recreate the entire solar system at the zoomed-out level
  //         createSolarSystem();

  //         console.log("Zoomed out, zoom factor:", zoomFactor);
  //     }

  //     // Apply the zoom factor with smooth transition
  //     const container = d3.select("#solar-system");
  //     container.transition()
  //         .duration(500) // Smooth transition
  //         .style("transform", `scale(${zoomFactor})`); // Apply zoom
  // });

  // // Append the zoom toggle button to the body
  // document.body.appendChild(toggleZoom);
}

// Call the function to add the reset button

function createLegend() {
  // Create a container for the legend
  const legend = d3.select("body").append("div").attr("id", "legend");

  // Define the legend entries (You can modify these based on your requirements)
  const legendEntries = [
    { label: "ASTEROID", color: "white" },
    { label: "POTENTIALLY DANGEROUS", color: "#ff4444" },
  ];

  // Append each legend entry
  const entry = legend
    .selectAll(".legend-entry")
    .data(legendEntries)
    .enter()
    .append("div")
    .attr("class", "legend-entry")
    .style("display", "flex")
    .style("align-items", "center")
    .style("margin-bottom", "5px")
    .style("justify-content", "flex-end");

  // Add labels
  entry.append("h3").text((d) => d.label);

  // Add color dots
  entry
    .append("div")
    .attr("class", "legend-icon")
    .style("width", "12px")
    .style("height", "12px")
    .style("background-color", (d) => d.color)
    .style("margin-left", "8px")
    .style("border-radius", "50%");
}

// We're replacing the previous legend with our SVG-based one
// createLegend();

// Create Earth direction indicator
function createEarthIndicator() {
  // Create the indicator element
  const indicator = document.createElement("div");
  indicator.className = "earth-indicator";

  // Create arrow element
  const arrow = document.createElement("div");
  arrow.className = "earth-arrow";

  // Create label element
  const label = document.createElement("div");
  label.className = "earth-label";
  label.textContent = "EARTH DIRECTION";

  // Add elements to indicator
  indicator.appendChild(arrow);
  indicator.appendChild(label);

  // Hide indicator initially (it's only visible when away from Earth)
  indicator.style.opacity = "0";
  indicator.style.display = "none"; // Initially hidden completely

  solarSystem.container.appendChild(indicator);

  // Store reference to indicator
  solarSystem.earthIndicator = indicator;
}

// Update Earth direction indicator position and visibility
function updateEarthIndicator() {
  if (!solarSystem.earthIndicator) return;

  // Only show the indicator if we're not on Earth anymore
  if (solarSystem.constants.SHIP_ON_EARTH) {
    solarSystem.earthIndicator.style.opacity = "0";
    solarSystem.earthIndicator.style.display = "none";
    return;
  }

  // Calculate distance from Earth
  const dx = solarSystem.earthPosition.x - solarSystem.ship.x;
  const dy = solarSystem.earthPosition.y - solarSystem.ship.y;
  const distanceFromEarth = Math.sqrt(dx * dx + dy * dy);

  // Only show the indicator if we're far enough from Earth
  if (
    distanceFromEarth < solarSystem.constants.EARTH_INDICATOR_SHOW_THRESHOLD
  ) {
    solarSystem.earthIndicator.style.opacity = "0";
    solarSystem.earthIndicator.style.display = "none";
    return;
  }

  // Make sure indicator is displayed
  solarSystem.earthIndicator.style.display = "flex";

  // Calculate direction to Earth (from ship to Earth, not the other way around)
  // Use atan2 to get the angle in radians, then convert to degrees
  // Note: atan2 takes (y, x) as arguments, not (x, y)
  const angleToEarth = Math.atan2(dy, dx) * (180 / Math.PI);

  // Position the indicator around the center of the screen (where the ship is)
  const containerRect = solarSystem.container.getBoundingClientRect();
  const screenCenterX = containerRect.width / 2;
  const screenCenterY = containerRect.height / 2;

  // Calculate position on the edge of a circle around the ship
  const indicatorDistance = solarSystem.constants.EARTH_INDICATOR_DISTANCE;

  // Calculate position using the angle to Earth
  const indicatorX =
    screenCenterX +
    Math.cos((angleToEarth * Math.PI) / 180) * indicatorDistance;
  const indicatorY =
    screenCenterY +
    Math.sin((angleToEarth * Math.PI) / 180) * indicatorDistance;

  // Update indicator position
  solarSystem.earthIndicator.style.left = `${indicatorX}px`;
  solarSystem.earthIndicator.style.top = `${indicatorY}px`;

  // Get the arrow element
  const arrow = solarSystem.earthIndicator.querySelector(".earth-arrow");

  // With our new arrow design, the point is at the right side (horizontal)
  // The rotation should be set to the angle to Earth directly
  arrow.style.transform = `rotate(${angleToEarth}deg)`;

  // Make indicator visible with subtle distance-based opacity
  const opacityFactor = Math.min(1, distanceFromEarth / 1000);
  solarSystem.earthIndicator.style.opacity = 0.5 + opacityFactor * 0.5;
}
