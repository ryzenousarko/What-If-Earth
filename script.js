/* ============================================================
   WHAT IF EARTH — GLOBAL SIMULATION LAB
   Main Simulation Engine
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   SIMULATION STATE
------------------------------------------------------------ */

const state = {
    year: 2026,
    running: false,

    temperature: 0,
    seaLevel: 0,
    rainfall: 100,
    forest: 100,
    population: 8.2,
    cleanEnergy: 30,

    climateRisk: 0,
    floodRisk: 0,
    droughtRisk: 0,
    ecosystemHealth: 100,
    humanPressure: 0,
    waterStress: 0,
    energyPressure: 0,

    interval: null,
    simulationSeconds: 0
};

/* ------------------------------------------------------------
   DOM HELPER
------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------
   CONTROLS
------------------------------------------------------------ */

const temperatureControl = $("temperature");
const seaLevelControl = $("seaLevel");
const rainfallControl = $("rainfall");
const forestControl = $("forest");
const populationControl = $("population");
const cleanEnergyControl = $("cleanEnergy");

const temperatureValue = $("temperatureValue");
const seaLevelValue = $("seaLevelValue");
const rainfallValue = $("rainfallValue");
const forestValue = $("forestValue");
const populationValue = $("populationValue");
const cleanEnergyValue = $("cleanEnergyValue");

const runButton = $("runSimulation");
const resetButton = $("resetSimulation");

/* ------------------------------------------------------------
   SIMULATION STATUS
------------------------------------------------------------ */

const simulationStateElement = $("simulationState");
const simulationYearElement = $("simulationYear");
const simulationClockElement = $("simulationClock");

/* ------------------------------------------------------------
   BASIC METRICS
------------------------------------------------------------ */

const temperatureMetric = $("metricTemperature");
const seaLevelMetric = $("metricSeaLevel");
const rainfallMetric = $("metricRainfall");
const forestMetric = $("metricForest");
const populationMetric = $("metricPopulation");
const cleanEnergyMetric = $("metricCleanEnergy");

/* ------------------------------------------------------------
   RISK DASHBOARD
------------------------------------------------------------ */

const climateRiskValue = $("climateRiskValue");
const climateRiskBar = $("climateRiskBar");
const climateRiskText = $("climateRiskText");

const floodRiskValue = $("floodRiskValue");
const floodRiskBar = $("floodRiskBar");
const floodRiskText = $("floodRiskText");

const droughtRiskValue = $("droughtRiskValue");
const droughtRiskBar = $("droughtRiskBar");
const droughtRiskText = $("droughtRiskText");

const waterStressValue = $("waterStressValue");
const waterStressBar = $("waterStressBar");
const waterStressText = $("waterStressText");

const ecosystemValue = $("ecosystemValue");
const ecosystemBar = $("ecosystemBar");
const ecosystemTextElement = $("ecosystemText");

const humanPressureValue = $("humanPressureValue");
const humanPressureBar = $("humanPressureBar");
const humanPressureText = $("humanPressureText");

const riskBadge = $("riskBadge");
const consequenceText = $("consequenceText");

/* ============================================================
   GLOBE
   ============================================================ */

let d3Ready = typeof window.d3 !== "undefined";
let topojsonReady = typeof window.topojson !== "undefined";

let globeSvg = null;
let landLayer = null;
let graticuleLayer = null;
let climateLayer = null;
let cityLayer = null;

let projection = null;
let path = null;
let countries = null;

let globeRotation = [0, -15, 0];
let globeScale = 1;

/* ------------------------------------------------------------
   SETUP GLOBE
------------------------------------------------------------ */

function setupGlobe() {

    if (!d3Ready) {
        console.error("D3 is not available.");
        return;
    }

    globeSvg = d3.select("#earthGlobe");

    if (globeSvg.empty()) {
        console.error("Could not find #earthGlobe.");
        return;
    }

    landLayer = d3.select("#landLayer");
    graticuleLayer = d3.select("#graticuleLayer");
    climateLayer = d3.select("#climateLayer");
    cityLayer = d3.select("#cityLayer");

    projection = d3.geoOrthographic()
        .scale(300)
        .translate([350, 350])
        .clipAngle(90)
        .rotate(globeRotation);

    path = d3.geoPath(projection);

    drawGlobeBase();
    setupGlobeInteraction();
}

/* ------------------------------------------------------------
   BASE GLOBE
------------------------------------------------------------ */

function drawGlobeBase() {

    if (!projection || !globeSvg) {
        return;
    }

    globeSvg
        .selectAll(".ocean-sphere")
        .remove();

    globeSvg
        .insert("circle", ":first-child")
        .attr("class", "ocean-sphere")
        .attr("cx", 350)
        .attr("cy", 350)
        .attr("r", projection.scale())
        .attr("fill", "#071722")
        .attr("stroke", "rgba(85,229,255,.45)")
        .attr("stroke-width", 2);

    if (graticuleLayer) {

        graticuleLayer
            .selectAll("*")
            .remove();

        const graticule = d3.geoGraticule();

        graticuleLayer
            .append("path")
            .datum(graticule())
            .attr("class", "graticule")
            .attr("d", path);
    }
}

/* ------------------------------------------------------------
   GLOBE INTERACTION
------------------------------------------------------------ */

function setupGlobeInteraction() {

    if (!globeSvg || !projection || !path) {
        return;
    }

    const dragBehavior = d3.drag()

        .on("start", function () {

            globeSvg.style(
                "cursor",
                "grabbing"
            );

        })

        .on("drag", function (event) {

            const rotate = projection.rotate();

            const sensitivity = 0.45;

            projection.rotate([
                rotate[0] + event.dx * sensitivity,
                rotate[1] - event.dy * sensitivity,
                rotate[2]
            ]);

            globeRotation = projection.rotate();

            redrawGlobe();

        })

        .on("end", function () {

            globeSvg.style(
                "cursor",
                "grab"
            );

        });

    globeSvg.call(dragBehavior);

    const zoomBehavior = d3.zoom()

        .scaleExtent([
            0.82,
            1.35
        ])

        .on("zoom", function (event) {

            globeScale = event.transform.k;

            projection.scale(
                300 * globeScale
            );

            redrawGlobe();

        });

    globeSvg.call(zoomBehavior);

    globeSvg.on(
        "wheel.zoom",
        null
    );

    globeSvg.style(
        "cursor",
        "grab"
    );
}

/* ------------------------------------------------------------
   REDRAW GLOBE
------------------------------------------------------------ */

function redrawGlobe() {

    if (!path) {
        return;
    }

    if (graticuleLayer) {

        graticuleLayer
            .selectAll("path")
            .attr("d", path);

    }

    if (landLayer) {

        landLayer
            .selectAll("path")
            .attr("d", path);

    }

    if (climateLayer) {

        climateLayer
            .selectAll("path")
            .attr("d", path);

    }

    if (cityLayer) {

        cityLayer
            .selectAll("circle")
            .attr(
                "transform",
                (d) => {

                    const point =
                        projection([
                            d.lon,
                            d.lat
                        ]);

                    if (!point) {
                        return "translate(-100,-100)";
                    }

                    return `translate(${point[0]},${point[1]})`;
                }
            );
    }

    globeSvg
        .select(".ocean-sphere")
        .attr(
            "r",
            projection.scale()
        );
}

/* ============================================================
   COUNTRY DATA
============================================================ */

function drawCountries(worldData) {

    if (
        !d3Ready ||
        !topojsonReady ||
        !landLayer
    ) {
        return;
    }

    try {

        const objectName =
            worldData.objects.countries
                ? "countries"
                : Object.keys(
                    worldData.objects
                )[0];

        countries =
            topojson.feature(
                worldData,
                worldData.objects[
                    objectName
                ]
            );

        landLayer
            .selectAll("*")
            .remove();

        landLayer
            .selectAll("path")
            .data(
                countries.features
            )
            .enter()
            .append("path")
            .attr(
                "class",
                "land"
            )
            .attr(
                "d",
                path
            )
            .attr(
                "vector-effect",
                "non-scaling-stroke"
            );

        redrawGlobe();

    } catch (error) {

        console.error(
            "Country rendering failed:",
            error
        );

        drawFallbackLand();
    }
}

/* ------------------------------------------------------------
   FALLBACK LAND
------------------------------------------------------------ */

function drawFallbackLand() {

    if (!landLayer || !d3Ready) {
        return;
    }

    landLayer
        .selectAll("*")
        .remove();

    const fallbackContinents = [

        {
            name: "North America",

            coordinates: [
                [-168, 72],
                [-140, 70],
                [-125, 55],
                [-105, 50],
                [-95, 30],
                [-82, 25],
                [-80, 10],
                [-100, 15],
                [-115, 30],
                [-140, 40],
                [-160, 55]
            ]
        },

        {
            name: "South America",

            coordinates: [
                [-80, 10],
                [-60, 10],
                [-45, -5],
                [-50, -30],
                [-60, -55],
                [-75, -45],
                [-80, -20]
            ]
        },

        {
            name: "Europe",

            coordinates: [
                [-10, 36],
                [10, 35],
                [30, 45],
                [40, 60],
                [20, 70],
                [-10, 65],
                [-20, 50]
            ]
        },

        {
            name: "Africa",

            coordinates: [
                [-18, 35],
                [15, 37],
                [35, 20],
                [45, -5],
                [30, -35],
                [10, -35],
                [-5, -15],
                [-15, 10]
            ]
        },

        {
            name: "Asia",

            coordinates: [
                [30, 40],
                [55, 60],
                [100, 70],
                [150, 60],
                [170, 45],
                [140, 25],
                [120, 10],
                [80, 5],
                [50, 20]
            ]
        },

        {
            name: "Australia",

            coordinates: [
                [112, -10],
                [153, -12],
                [155, -40],
                [135, -44],
                [115, -30]
            ]
        }
    ];

    landLayer
        .selectAll("path")
        .data(fallbackContinents)
        .enter()
        .append("path")
        .attr(
            "class",
            "land"
        )
        .attr(
            "d",
            d => {

                const points =
                    d.coordinates
                        .map(
                            coord =>
                                projection(coord)
                        )
                        .filter(Boolean);

                if (points.length < 3) {
                    return "";
                }

                return d3.line()
                    .curve(
                        d3.curveLinearClosed
                    )(points);
            }
        );
}

/* ============================================================
   CLIMATE ZONES
============================================================ */

function drawClimateZones() {

    if (
        !climateLayer ||
        !d3Ready
    ) {
        return;
    }

    const zones = [

        {
            name: "Northern Heat",

            coords: [
                [-180, 35],
                [180, 35],
                [180, 90],
                [-180, 90]
            ],

            className:
                "climate-zone heat-zone"
        },

        {
            name: "Southern Heat",

            coords: [
                [-180, -90],
                [180, -90],
                [180, -35],
                [-180, -35]
            ],

            className:
                "climate-zone heat-zone"
        }
    ];

    climateLayer
        .selectAll("*")
        .remove();

    climateLayer
        .selectAll("path")
        .data(zones)
        .enter()
        .append("path")
        .attr(
            "class",
            d => d.className
        )
        .attr(
            "d",
            d => {

                const points =
                    d.coords
                        .map(
                            coord =>
                                projection(coord)
                        )
                        .filter(Boolean);

                if (points.length < 3) {
                    return "";
                }

                return d3.line()
                    .curve(
                        d3.curveLinearClosed
                    )(points);
            }
        );

    redrawGlobe();
}

/* ============================================================
   CITIES
============================================================ */

const cities = [

    {
        name: "New York",
        lat: 40.7128,
        lon: -74.0060
    },

    {
        name: "London",
        lat: 51.5072,
        lon: -0.1276
    },

    {
        name: "Delhi",
        lat: 28.6139,
        lon: 77.2090
    },

    {
        name: "Tokyo",
        lat: 35.6762,
        lon: 139.6503
    },

    {
        name: "Sydney",
        lat: -33.8688,
        lon: 151.2093
    },

    {
        name: "São Paulo",
        lat: -23.5505,
        lon: -46.6333
    },

    {
        name: "Cairo",
        lat: 30.0444,
        lon: 31.2357
    },

    {
        name: "Singapore",
        lat: 1.3521,
        lon: 103.8198
    }
];

function drawCities() {

    if (
        !cityLayer ||
        !projection
    ) {
        return;
    }

    cityLayer
        .selectAll("*")
        .remove();

    cityLayer
        .selectAll("circle")
        .data(cities)
        .enter()
        .append("circle")
        .attr(
            "class",
            "city-marker"
        )
        .attr(
            "r",
            3.5
        )
        .attr(
            "transform",
            d => {

                const point =
                    projection([
                        d.lon,
                        d.lat
                    ]);

                if (!point) {
                    return "translate(-100,-100)";
                }

                return `translate(${point[0]},${point[1]})`;
            }
        );

    cityLayer
        .selectAll("circle")
        .append("title")
        .text(
            d => d.name
        );
}

/* ============================================================
   LOAD EARTH
============================================================ */

async function loadEarth() {

    if (!d3Ready) {

        console.error(
            "D3 failed to load."
        );

        return;
    }

    if (!topojsonReady) {

        console.error(
            "TopoJSON failed to load."
        );

        drawFallbackLand();
        drawClimateZones();
        drawCities();

        return;
    }

    try {

        const response =
            await fetch(
                "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
                {
                    cache: "force-cache"
                }
            );

        if (!response.ok) {

            throw new Error(
                `World map request failed: HTTP ${response.status}`
            );
        }

        const worldData =
            await response.json();

        drawCountries(
            worldData
        );

        drawClimateZones();
        drawCities();

    } catch (error) {

        console.error(
            "Earth map failed to load:",
            error
        );

        drawFallbackLand();
        drawClimateZones();
        drawCities();
        redrawGlobe();
    }
}

/* ============================================================
   READ CONTROLS
============================================================ */

function readControls() {

    state.temperature =
        Number(
            temperatureControl?.value ?? 0
        );

    state.seaLevel =
        Number(
            seaLevelControl?.value ?? 0
        );

    state.rainfall =
        Number(
            rainfallControl?.value ?? 100
        );

    state.forest =
        Number(
            forestControl?.value ?? 100
        );

    state.population =
        Number(
            populationControl?.value ?? 8.2
        );

    state.cleanEnergy =
        Number(
            cleanEnergyControl?.value ?? 30
        );
}

/* ============================================================
   CONTROL LABELS
============================================================ */

function updateControlLabels() {

    if (temperatureValue) {

        const sign =
            state.temperature > 0
                ? "+"
                : "";

        temperatureValue.textContent =
            `${sign}${state.temperature.toFixed(1)} °C`;
    }

    if (seaLevelValue) {

        seaLevelValue.textContent =
            `${state.seaLevel.toFixed(1)} m`;
    }

    if (rainfallValue) {

        rainfallValue.textContent =
            `${Math.round(state.rainfall)}%`;
    }

    if (forestValue) {

        forestValue.textContent =
            `${Math.round(state.forest)}%`;
    }

    if (populationValue) {

        populationValue.textContent =
            `${state.population.toFixed(1)}B`;
    }

    if (cleanEnergyValue) {

        cleanEnergyValue.textContent =
            `${Math.round(state.cleanEnergy)}%`;
    }
}

/* ============================================================
   CONTROL LISTENERS
============================================================ */

function attachControlListeners() {

    const controls = [

        temperatureControl,
        seaLevelControl,
        rainfallControl,
        forestControl,
        populationControl,
        cleanEnergyControl

    ];

    controls.forEach(
        control => {

            if (!control) {
                return;
            }

            control.addEventListener(
                "input",
                () => {

                    readControls();
                    calculateSimulation();
                    render();

                }
            );
        }
    );
}

/* ============================================================
   UTILITY
============================================================ */

function clamp(
    value,
    min = 0,
    max = 100
) {

    return Math.max(
        min,
        Math.min(max, value)
    );
}

/* ============================================================
   SIMULATION CALCULATION
============================================================ */

function calculateSimulation() {

    const temperatureRisk =
        clamp(
            (state.temperature + 1) * 11
        );

    const seaRisk =
        clamp(
            state.seaLevel * 17
        );

    const rainfallDeviation =
        Math.abs(
            state.rainfall - 100
        );

    const rainfallRisk =
        clamp(
            rainfallDeviation * 0.7
        );

    const forestLoss =
        clamp(
            100 - state.forest
        );

    const forestRisk =
        clamp(
            forestLoss * 0.8
        );

    const populationRisk =
        clamp(
            (state.population - 8.2) * 7.5
        );

    const cleanEnergyBenefit =
        clamp(
            state.cleanEnergy * 0.42
        );

    state.climateRisk =
        clamp(
            temperatureRisk * 0.52 +
            seaRisk * 0.12 +
            rainfallRisk * 0.10 +
            forestRisk * 0.16 +
            populationRisk * 0.10 -
            cleanEnergyBenefit * 0.28
        );

    state.floodRisk =
        clamp(
            seaRisk * 0.62 +
            Math.max(
                0,
                state.rainfall - 100
            ) * 0.55 +
            Math.max(
                0,
                state.temperature
            ) * 5
        );

    state.droughtRisk =
        clamp(
            Math.max(
                0,
                100 - state.rainfall
            ) * 0.58 +
            Math.max(
                0,
                state.temperature
            ) * 6 +
            Math.max(
                0,
                100 - state.forest
            ) * 0.20
        );

    state.waterStress =
        clamp(
            state.droughtRisk * 0.62 +
            state.floodRisk * 0.18 +
            Math.max(
                0,
                state.population - 8.2
            ) * 5
        );

    state.humanPressure =
        clamp(
            Math.max(
                0,
                state.population - 6
            ) * 7 +
            Math.max(
                0,
                100 - state.cleanEnergy
            ) * 0.18 +
            Math.max(
                0,
                100 - state.forest
            ) * 0.22
        );

    state.energyPressure =
        clamp(
            Math.max(
                0,
                70 - state.cleanEnergy
            ) * 0.8 +
            Math.max(
                0,
                state.population - 8.2
            ) * 4
        );

    state.ecosystemHealth =
        clamp(
            100 -
            state.climateRisk * 0.36 -
            state.droughtRisk * 0.22 -
            state.humanPressure * 0.20 +
            state.cleanEnergy * 0.08
        );
}

/* ============================================================
   RISK LABEL
============================================================ */

function riskLabel(value) {

    if (value < 20) {
        return "LOW";
    }

    if (value < 40) {
        return "MODERATE";
    }

    if (value < 60) {
        return "ELEVATED";
    }

    if (value < 80) {
        return "HIGH";
    }

    return "CRITICAL";
}

/* ============================================================
   ECOSYSTEM LABEL
============================================================ */

function ecosystemTextLabel(value) {

    if (value >= 80) {
        return "Strong ecological resilience";
    }

    if (value >= 60) {
        return "Moderate ecological stress";
    }

    if (value >= 40) {
        return "Significant ecosystem degradation";
    }

    if (value >= 20) {
        return "Severe ecosystem pressure";
    }

    return "Extreme ecosystem disruption";
}

/* ============================================================
   CONSEQUENCES
============================================================ */

function consequenceSummary() {

    const consequences = [];

    if (state.temperature >= 2) {

        consequences.push(
            "Higher global temperatures increase heat stress and climate-system instability."
        );
    }

    if (state.seaLevel >= 1) {

        consequences.push(
            "Rising sea level increases exposure for coastal communities and low-lying regions."
        );
    }

    if (state.rainfall < 85) {

        consequences.push(
            "Reduced rainfall increases drought and water-stress pressure."
        );
    }

    if (state.rainfall > 115) {

        consequences.push(
            "Higher rainfall increases the potential for flooding and extreme precipitation."
        );
    }

    if (state.forest < 75) {

        consequences.push(
            "Reduced forest coverage weakens ecosystem resilience and carbon-storage capacity."
        );
    }

    if (state.population > 10) {

        consequences.push(
            "Higher population increases demand for food, water, energy and land."
        );
    }

    if (state.cleanEnergy >= 70) {

        consequences.push(
            "High clean-energy adoption reduces part of the modeled human and energy pressure."
        );
    }

    if (consequences.length === 0) {

        consequences.push(
            "The selected scenario remains relatively close to the baseline assumptions."
        );
    }

    return consequences.join(" ");
}

/* ============================================================
   BAR
============================================================ */

function setBar(
    element,
    value
) {

    if (!element) {
        return;
    }

    element.style.width =
        `${clamp(value)}%`;
}

/* ============================================================
   RISK CARD
============================================================ */

function setRiskCard(
    valueElement,
    barElement,
    textElement,
    value
) {

    const rounded =
        Math.round(
            clamp(value)
        );

    if (valueElement) {

        valueElement.textContent =
            `${rounded}%`;
    }

    setBar(
        barElement,
        rounded
    );

    if (textElement) {

        textElement.textContent =
            riskLabel(rounded);
    }
}

/* ============================================================
   RENDER
============================================================ */

function render() {

    updateControlLabels();

    if (temperatureMetric) {

        const sign =
            state.temperature > 0
                ? "+"
                : "";

        temperatureMetric.textContent =
            `${sign}${state.temperature.toFixed(1)} °C`;
    }

    if (seaLevelMetric) {

        seaLevelMetric.textContent =
            `${state.seaLevel.toFixed(1)} m`;
    }

    if (rainfallMetric) {

        rainfallMetric.textContent =
            `${Math.round(state.rainfall)}%`;
    }

    if (forestMetric) {

        forestMetric.textContent =
            `${Math.round(state.forest)}%`;
    }

    if (populationMetric) {

        populationMetric.textContent =
            `${state.population.toFixed(1)}B`;
    }

    if (cleanEnergyMetric) {

        cleanEnergyMetric.textContent =
            `${Math.round(state.cleanEnergy)}%`;
    }

    setRiskCard(
        climateRiskValue,
        climateRiskBar,
        climateRiskText,
        state.climateRisk
    );

    setRiskCard(
        floodRiskValue,
        floodRiskBar,
        floodRiskText,
        state.floodRisk
    );

    setRiskCard(
        droughtRiskValue,
        droughtRiskBar,
        droughtRiskText,
        state.droughtRisk
    );

    setRiskCard(
        waterStressValue,
        waterStressBar,
        waterStressText,
        state.waterStress
    );

    const ecosystem =
        Math.round(
            state.ecosystemHealth
        );

    if (ecosystemValue) {

        ecosystemValue.textContent =
            `${ecosystem}%`;
    }

    setBar(
        ecosystemBar,
        100 - ecosystem
    );

    if (ecosystemTextElement) {

        ecosystemTextElement.textContent =
            ecosystemTextLabel(
                ecosystem
            );
    }

    setRiskCard(
        humanPressureValue,
        humanPressureBar,
        humanPressureText,
        state.humanPressure
    );

    if (riskBadge) {

        const overallRisk =
            Math.max(
                state.climateRisk,
                state.floodRisk,
                state.droughtRisk,
                state.waterStress
            );

        riskBadge.textContent =
            riskLabel(
                overallRisk
            );

        riskBadge.dataset.level =
            riskLabel(
                overallRisk
            ).toLowerCase();
    }

    if (consequenceText) {

        consequenceText.textContent =
            consequenceSummary();
    }

    if (simulationYearElement) {

        simulationYearElement.textContent =
            state.year;
    }

    if (simulationClockElement) {

        const minutes =
            Math.floor(
                state.simulationSeconds / 60
            );

        const seconds =
            state.simulationSeconds % 60;

        simulationClockElement.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    if (simulationStateElement) {

        simulationStateElement.textContent =
            state.running
                ? "RUNNING"
                : "PAUSED";
    }

    updateGlobeClimate();
}

/* ============================================================
   GLOBE CLIMATE
============================================================ */

function updateGlobeClimate() {

    if (
        !climateLayer ||
        !projection ||
        !d3Ready
    ) {
        return;
    }

    const heatStrength =
        clamp(
            Math.max(
                0,
                state.temperature
            ) * 14
        );

    climateLayer
        .selectAll(".heat-zone")
        .attr(
            "opacity",
            heatStrength / 100
        );
}

/* ============================================================
   RUN / PAUSE
============================================================ */

function runSimulation() {

    if (state.running) {

        pauseSimulation();

        return;
    }

    state.running = true;

    if (runButton) {

        runButton.textContent =
            "Pause Simulation";
    }

    if (state.interval) {

        clearInterval(
            state.interval
        );
    }

    state.interval =
        setInterval(
            () => {

                state.simulationSeconds += 1;

                if (
                    state.simulationSeconds % 2 === 0
                ) {

                    advanceYear();
                }

                render();

            },
            1000
        );

    render();
}

/* ============================================================
   PAUSE
============================================================ */

function pauseSimulation() {

    state.running = false;

    if (state.interval) {

        clearInterval(
            state.interval
        );

        state.interval = null;
    }

    if (runButton) {

        runButton.textContent =
            "Run Simulation";
    }

    render();
}

/* ============================================================
   ADVANCE YEAR
============================================================ */

function advanceYear() {

    if (state.year >= 2100) {

        pauseSimulation();

        return;
    }

    state.year += 1;

    calculateSimulation();
}

/* ============================================================
   RESET SIMULATION
   IMPORTANT:
   THIS IS THE ONLY resetSimulation FUNCTION.
============================================================ */

function resetSimulation() {

    pauseSimulation();

    state.year = 2026;

    if (temperatureControl) {
        temperatureControl.value = "0";
    }

    if (seaLevelControl) {
        seaLevelControl.value = "0";
    }

    if (rainfallControl) {
        rainfallControl.value = "100";
    }

    if (forestControl) {
        forestControl.value = "100";
    }

    if (populationControl) {
        populationControl.value = "8.2";
    }

    if (cleanEnergyControl) {
        cleanEnergyControl.value = "30";
    }

    state.temperature = 0;
    state.seaLevel = 0;
    state.rainfall = 100;
    state.forest = 100;
    state.population = 8.2;
    state.cleanEnergy = 30;

    state.climateRisk = 0;
    state.floodRisk = 0;
    state.droughtRisk = 0;
    state.ecosystemHealth = 100;
    state.humanPressure = 0;
    state.waterStress = 0;
    state.energyPressure = 0;

    state.simulationSeconds = 0;

    readControls();
    calculateSimulation();
    render();
}

/* ============================================================
   BUTTONS
============================================================ */

function attachButtons() {

    if (runButton) {

        runButton.addEventListener(
            "click",
            runSimulation
        );
    }

    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetSimulation
        );
    }
}

/* ============================================================
   TIMELINE
============================================================ */

function attachTimeline() {

    document
        .querySelectorAll(
            "[data-year]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const selectedYear =
                            Number(
                                button.dataset.year
                            );

                        if (
                            Number.isFinite(
                                selectedYear
                            ) &&
                            selectedYear >= 2026 &&
                            selectedYear <= 2100
                        ) {

                            state.year =
                                selectedYear;

                            render();
                        }
                    }
                );
            }
        );
}

/* ============================================================
   KEYBOARD
============================================================ */

function attachKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.target.matches(
                    "input, textarea, select"
                )
            ) {
                return;
            }

            if (
                event.code === "Space"
            ) {

                event.preventDefault();

                runSimulation();
            }

            if (
                event.key.toLowerCase() === "r"
            ) {

                resetSimulation();
            }
        }
    );
}

/* ============================================================
   INITIALIZE
============================================================ */

function initialize() {

    attachControlListeners();

    attachButtons();

    attachTimeline();

    attachKeyboard();

    readControls();

    calculateSimulation();

    render();

    setupGlobe();

    if (d3Ready) {

        loadEarth();

    } else {

        console.error(
            "D3 is not available. Check the D3 CDN script in index.html."
        );
    }
}

/* ============================================================
   START
============================================================ */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

} else {

    initialize();
}