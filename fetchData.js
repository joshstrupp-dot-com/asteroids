const fs = require("fs");
const fetch = require("node-fetch");

const API = { asteroid: "iEtTLBumhiw8bLDvxDiPnuYqf3foQlYfWJDPZcmr" };

async function fetchAndSaveData() {
  const today = new Date().toISOString().split("T")[0];
  const asteroidUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${API.asteroid}`;

  try {
    const response = await fetch(asteroidUrl);
    const rawData = await response.json();

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    // Extract and process near earth objects data
    const processedData = [];
    const dateKey = Object.keys(rawData.near_earth_objects)[0]; // Get today's date key
    const asteroids = rawData.near_earth_objects[dateKey];

    asteroids.forEach((asteroid) => {
      processedData.push({
        id: asteroid.id,
        name: asteroid.name,
        absolute_magnitude_h: asteroid.absolute_magnitude_h,
        estimated_diameter_meters: {
          min: asteroid.estimated_diameter.meters.estimated_diameter_min,
          max: asteroid.estimated_diameter.meters.estimated_diameter_max,
        },
        is_potentially_hazardous: asteroid.is_potentially_hazardous_asteroid,
        is_sentry_object: asteroid.is_sentry_object,
        close_approach_data: asteroid.close_approach_data.map((approach) => ({
          close_approach_date: approach.close_approach_date,
          close_approach_date_full: approach.close_approach_date_full,
          epoch_date_close_approach: approach.epoch_date_close_approach,
          relative_velocity: {
            kilometers_per_second: parseFloat(
              approach.relative_velocity.kilometers_per_second
            ),
            kilometers_per_hour: parseFloat(
              approach.relative_velocity.kilometers_per_hour
            ),
          },
          miss_distance: {
            astronomical: parseFloat(approach.miss_distance.astronomical),
            lunar: parseFloat(approach.miss_distance.lunar),
            kilometers: parseFloat(approach.miss_distance.kilometers),
          },
          orbiting_body: approach.orbiting_body,
        })),
      });
    });

    // Save to file with current date
    const filename = `asteroid-data-${today}.json`;
    fs.writeFileSync(filename, JSON.stringify(processedData, null, 2));
    console.log(`Data saved to ${filename}`);
  } catch (error) {
    console.error("Error fetching/saving asteroid data:", error);
  }
}

fetchAndSaveData();
