let map;

let activeEditMarkers = [];
let activeLine = null;


let isDraggingViewpoint = false;
let holdTimer = null;


let sourceNodes = [];
let allPaths = [];
let allViewpoints = [];
let mapDblClickHandler;


let currentWriteLayer = 0;
let layers = [
    { paths: [], viewpoints: [], nodes: [] },
    { paths: [], viewpoints: [], nodes: [] },
    { paths: [], viewpoints: [], nodes: [] },
    { paths: [], viewpoints: [], nodes: [] }
];


    
function initializeMap() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }

    let userMarker;

    let projectTitle = "Untitled Project";

    let simulationMode = false;
    let drawMode = false;

    function toggleSimulation() {
        simulationMode = !simulationMode;

        if (simulationMode) {
            if (!map.hasLayer(userMarker)) {
                userMarker.addTo(map);
            }
        } else {
            if (map.hasLayer(userMarker)) {
                map.removeLayer(userMarker);
            }
        }
    }

    navigator.geolocation.watchPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const userLatLng = L.latLng(lat, lon);

        if (!map) {
            const normalLayer = L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    attribution: "© OpenStreetMap contributors",
                    maxZoom: 22,
                    maxNativeZoom: 19
                }
            );

            const satelliteLayer = L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                {
                    attribution: "Tiles © Esri",
                    maxZoom: 22,
                    maxNativeZoom: 19
                }
            );
            map = L.map("map").setView([lat, lon], 19);
            map.doubleClickZoom.disable();

            map.on("click", function (e) {
                if (e.originalEvent && e.originalEvent.target.closest(".preview-button")) {
                    return;
                }
                clearEditHandles(map);
                if (SourceNode.allNodes) {
                    SourceNode.allNodes.forEach(n => n.hideControls());
                }
            });
            mapDblClickHandler = function (e) {
                const target = e.originalEvent?.target;

                if (target && (
                    target.closest(".layer-button") ||
                    target.closest(".map-toggle-button") ||
                    target.closest(".load-button") ||
                    target.closest(".save-button") ||
                    target.closest(".export-button") ||
                    target.closest(".title-button") ||
                    target.closest(".draw-button") ||
                    target.closest(".sim-button")
                )) {
                    return;
                }

                handleMapDblClick(e);
            };

            map.on("dblclick", mapDblClickHandler);

            normalLayer.addTo(map);
            let isSatellite = false;
    
            userMarker = L.circleMarker(userLatLng, {
                radius: 5,
                color: "green"
            });

            function handleMapDblClick(e) {
                if (window.isResizing) return;

                const node = new SourceNode(map, e.latlng);
                node._layerIndex = currentWriteLayer;




                const layerIndex = node._layerIndex ?? currentWriteLayer;

                layers[layerIndex].nodes.push(node);
                sourceNodes.push(node);
            }

            const mapCluster = L.control({ position: "topleft" });

            mapCluster.onAdd = function () {
                const container = L.DomUtil.create("div", "button-cluster");

                const div = L.DomUtil.create("div", "map-toggle-button", container);

                div.title = "Toggle satellite view";

                div.onclick = function (e) {
                    L.DomEvent.stop(e);

                    if (isSatellite) {
                        map.removeLayer(satelliteLayer);
                        normalLayer.addTo(map);
                        div.classList.remove("selected");
                    } else {
                        map.removeLayer(normalLayer);
                        satelliteLayer.addTo(map);
                        div.classList.add("selected");
                    }

                    isSatellite = !isSatellite;
                };

                return container;
            };

            mapCluster.addTo(map);

            const layerCluster = L.control({ position: "topleft" });

            layerCluster.onAdd = function () {
                const container = L.DomUtil.create("div", "button-cluster");

                const layer1Btn = L.control({ position: "topleft" });
                layer1Btn.onAdd = function () {
                    const div = L.DomUtil.create("div", "layer-button layer1-button");
                    div.classList.add("selected"); // default
                    
                    div.onclick = function (e) {
                        L.DomEvent.stop(e);
                        activateLayer(0);
                    };

                    div.ondblclick = function (e) {
                        L.DomEvent.stop(e);
                        setWriteLayer(0);
                    };

                    return div;
                };
                layer1Btn.addTo(map);

                const layer2Btn = L.control({ position: "topleft" });
                layer2Btn.onAdd = function () {
                    const div = L.DomUtil.create("div", "layer-button layer2-button");
                    div.title = "Layer 2";

                    div.onclick = function (e) {
                        L.DomEvent.stop(e);
                        activateLayer(1);
                    };

                    div.ondblclick = function (e) {
                        L.DomEvent.stop(e);
                        setWriteLayer(1);
                    };

                    return div;
                };
                layer2Btn.addTo(map);

                const layer3Btn = L.control({ position: "topleft" });
                layer3Btn.onAdd = function () {
                    const div = L.DomUtil.create("div", "layer-button layer3-button");
                    div.title = "Layer 3";

                    div.onclick = function (e) {
                        L.DomEvent.stop(e);
                        activateLayer(2);
                    };

                    div.ondblclick = function (e) {
                        L.DomEvent.stop(e);
                        setWriteLayer(2);
                    };

                    return div;
                };
                layer3Btn.addTo(map);


                const layer4Btn = L.control({ position: "topleft" });
                layer4Btn.onAdd = function () {
                    const div = L.DomUtil.create("div", "layer-button layer4-button");
                    div.title = "Layer 4";

                    div.onclick = function (e) {
                        L.DomEvent.stop(e);
                        activateLayer(3);
                    };

                    div.ondblclick = function (e) {
                        L.DomEvent.stop(e);
                        setWriteLayer(3);
                    };

                    return div;
                };
                layer4Btn.addTo(map);

                return container;
            };

            layerCluster.addTo(map);

            updateWriteLayerUI();

            map.on("mousemove", function (e) {
                if (!simulationMode) return;

                const simulatedLatLng = e.latlng;

                userMarker.setLatLng(simulatedLatLng);

                updateAudio(sourceNodes, simulatedLatLng);
            });

            let infoOverlay = document.createElement("div");
            infoOverlay.className = "info-overlay";

            infoOverlay.innerHTML = `
                <div class="info-content">
                    <h3>Controls</h3>

                    <h4>Map control</h4>
                    + → Zoom in<br>
                    - → Zoom out<br>
                    <img src="./assets/satellite.png" class="inline-icon"> → Map or Arial view<br>
                    <img src="./assets/layer1.png" class="inline-icon">-<img src="./assets/layer4.png" class="inline-icon"> → Double-click to edit layer<br>
                    <img src="./assets/layer1.png" class="inline-icon">-<img src="./assets/layer4.png" class="inline-icon"> → Click to toggle layer visibility<br>
                    <img src="./assets/info.png" class="inline-icon">  → Open information<br>

                    <h4>Project</h4>
                    <img src="./assets/load.png" class="inline-icon"> → Open project (audio is loaded only as filenames and must be reloaded)<br>
                    <img src="./assets/save.png" class="inline-icon"> → Save Project (audio is only saved as filenames)<br>
                    <img src="./assets/export.png" class="inline-icon"> → Export project (still ongoing work). HTML, CSS, and JS files are exported. After export, audio files must be placed in a folder called "sounds".<br>
                    <img src="./assets/title.png" class="inline-icon"> → Add title to project<br>
                    <img src="./assets/path.png" class="inline-icon"> → Draw path<br>
                    <img src="./assets/simulate.png" class="inline-icon"> → Toggle GPS simulation<br>

                    <h4>Sound nodes</h4>
                    Double click on map → Create sound node<br>
                    Click node → Show controls<br>
                    Click empty map → Close controls<br>
                    Drag node → Move node<br>
                    Drag edge → Resize node<br>
                    Rectangle corner → Rotate note<br>

                    <h4>Node control</h4>
                    <img src="./assets/load.png" class="inline-icon"> → Load audio file<br>
                    <img src="./assets/delete.png" class="inline-icon"> → Delete node<br>
                    <img src="./assets/linear.png" class="inline-icon"> → Toggle linear or loop<br>
                    <img src="./assets/play.png" class="inline-icon"> → Toggle preview audio<br>
                    <img src="./assets/rectangle.png" class="inline-icon"> → Toggle node shape (Circle or Rectangle)<br>
                    <img src="./assets/restart.png" class="inline-icon"> → Toggle playback mode (Restart, Pause, Single)<br>
                    <img src="./assets/binary.png" class="inline-icon"> → Toggle fade mode (On/Off or Fade)<br>
                    <img src="./assets/unlocked.png" class="inline-icon"> → Toggle lock<br>
                    Slider → Sound volume<br>

                    <h4>Paths</h4>
                    Left click → Draw path<br>
                    Right click → End path<br>
                    Click path → Move path points<br>
                    Drag point → Reshape<br>
                    Double click path → Delete<br>
                    Hold on path → Create viewpoint (hold 1 second)<br>

                    <h4>Viewpoints</h4>
                    Drag → Move along path<br>
                    Hold → Edit note (hold 1 second)<br>
                    Double click → Delete<br>
                    Hover → View note<br>

                    <br><button class="close-info">Close</button>
                </div>
            `;

            document.body.appendChild(infoOverlay);

            infoOverlay.style.display = "flex";

            const infoCluster = L.control({ position: "topleft" });

            infoCluster.onAdd = function () {
                const container = L.DomUtil.create("div", "button-cluster");
                const div = L.DomUtil.create("div", "info-button selected", container);

                div.title = "Show help";

                div.onclick = function (e) {
                    L.DomEvent.stop(e);

                    if (infoOverlay.style.display === "none") {
                        infoOverlay.style.display = "flex";
                        div.classList.add("selected");
                    } else {
                        infoOverlay.style.display = "none";
                        div.classList.remove("selected");
                    }
                };
                infoOverlay.querySelector(".close-info").onclick = () => {
                    infoOverlay.style.display = "none";
                    div.classList.remove("selected");
                };

                return container;
            };

            infoCluster.addTo(map);

            enableViewpointCreation(map);

            const projectCluster = L.control({ position: "topleft" });

            projectCluster.onAdd = function () {
                const container = L.DomUtil.create("div", "button-cluster");

                const loadButton = L.control({ position: "topleft" });

                loadButton.onAdd = function () {
                    const div = L.DomUtil.create("div", "load-button");
                    div.title = "Load project";

                    div.onclick = function (e) {
                        L.DomEvent.stop(e);

                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "application/json";

                        input.onchange = async (event) => {
                            map.off("dblclick", mapDblClickHandler);

                            const file = event.target.files[0];
                            if (!file) return;

                            clearEditHandles(map);

                            while (sourceNodes.length > 0) {
                                sourceNodes[0].remove();
                            }

                            SourceNode.allNodes = [];

                            allPaths.forEach(line => map.removeLayer(line));
                            allPaths = [];

                            allViewpoints.forEach(v => map.removeLayer(v));
                            allViewpoints = [];

                            layers = [
                                { paths: [], viewpoints: [], nodes: [] },
                                { paths: [], viewpoints: [], nodes: [] },
                                { paths: [], viewpoints: [], nodes: [] },
                                { paths: [], viewpoints: [], nodes: [] }
                            ];

                            const text = await file.text();
                            const loaded = JSON.parse(text);
                            const data = Array.isArray(loaded.nodes) ? loaded.nodes : [];
                            console.log("Loaded nodes:", data.length);

                            const paths = loaded.paths || [];
                            const viewpoints = loaded.viewpoints || [];

                            const requiredFiles = data
                                .map(d => d.audioFileName)
                                .filter(name => name);

                            if (loaded.projectTitle) {
                                projectTitle = loaded.projectTitle;
                                document.title = projectTitle;
                            }

                            paths.forEach(p => {
                                const latlngs = p.latlngs.map(pt => L.latLng(pt.lat, pt.lng));
                                const layerIndex = p.layerIndex ?? 0;

                                const line = L.polyline(latlngs, {
                                    color: layerColors[layerIndex] + "0.4)",
                                    weight: 8,
                                    opacity: 1
                                }).addTo(map);

                                line._layerIndex = layerIndex;

                                layers[layerIndex].paths.push(line);
                                allPaths.push(line);

                                line.on("click", (e) => {
                                    if (line._layerIndex !== currentWriteLayer) return;
                                    L.DomEvent.stopPropagation(e);
                                    showEditHandles(line);
                                });

                                line.on("dblclick", (e) => {
                                    if (line._layerIndex !== currentWriteLayer) return;
                                    L.DomEvent.stopPropagation(e);
                                    showDeletePopup(map, line, e.latlng);
                                });
                            });

                            viewpoints.forEach(v => {
                                const path = allPaths[v.pathIndex];
                                if (!path) return;

                                const marker = createViewpoint(map, path, L.latLng(v.lat, v.lng));
                                marker._note = v.note || "";
                                marker._layerIndex = v.layerIndex ?? 0;
                            });

                            const latlngs = [];

                            data.forEach(d => {
                                const node = new SourceNode(
                                    map,
                                    L.latLng(d.lat, d.lng)
                                );

                                node._layerIndex = d.layerIndex ?? 0;

                                const i = node._layerIndex;

                                node.dot.setStyle({
                                    color: layerMarkerColors[i] + "1)"
                                });

                                node.circle.setStyle({
                                    color: layerColors[i] + "0.4)",
                                    fillColor: layerColors[i] + "0.2)"
                                });

                                node.radius = d.radius;
                                node.circle.setRadius(d.radius);

                                if (d.isRectangle) {
                                    node.isRectangle = true;
                                    node.map.removeLayer(node.circle);
                                    node.createRectangle();

                                    if (d.rectBounds) {
                                        node.rectBounds = d.rectBounds;
                                        node.rect.setLatLngs(node.getRectangleCorners());
                                    }
                                }

                                node.rotation = d.rotation || 0;

                                if (node.rect) {
                                    node.rect.setLatLngs(node.getRectangleCorners());

                                    node.rect.setStyle({
                                        color: layerColors[node._layerIndex] + "0.4)",
                                        fillColor: layerColors[node._layerIndex] + "0.2)"
                                    });

                                    node.showRotationHandle();
                                }

                                node.playMode = d.playMode || "restart";
                                node.updatePlayModeButton();

                                node.maxGain = d.maxGain ?? 1;
                                const slider = node.controls?.getElement()?.querySelector(".volume-slider");
                                if (slider) slider.value = node.maxGain;

                                node.audioMode = d.audioMode || "binary";
                                node.loopEnabled = d.loopEnabled || false;

                                if (node.source) {
                                    node.source.loop = node.loopEnabled;
                                }

                                node.updateLoopIcon();

                                node.audioFileName = d.audioFileName || null;
                                node.updateLabel();

                                node.updateFadeVisual();
                                node.updateFadeButton();

                                const layerIndex = node._layerIndex ?? currentWriteLayer;

                                layers[layerIndex].nodes.push(node);
                                sourceNodes.push(node);

                                latlngs.push([d.lat, d.lng]);
                            });

                            if (latlngs.length > 0) {                            
                                const center = L.latLngBounds(latlngs).getCenter();
                                map.panTo(center)
                            }

                            map.on("dblclick", mapDblClickHandler);

                            const buttons = document.querySelectorAll(".layer-button");

                            buttons.forEach(btn => btn.classList.remove("selected"));

                            buttons.forEach((btn, i) => {
                                activateLayer(i);
                            });

                            setWriteLayer(0);
                            enableViewpointCreation(map);
                        };

                        input.click();
                    };

                    return div;
                };

                loadButton.addTo(map);

                const saveButton = L.control({ position: "topleft" });

                saveButton.onAdd = function () {
                    const div = L.DomUtil.create("div", "save-button");
                    div.title = "Save project";

                    div.onclick = function (e) {
                        L.DomEvent.stop(e);

                        const data = {
                            projectTitle: projectTitle,
                            nodes: sourceNodes.map(node => ({
                                lat: node.latlng.lat,
                                lng: node.latlng.lng,
                                layerIndex: node._layerIndex,
                                radius: node.radius,
                                isRectangle: node.isRectangle,
                                rectBounds: node.rectBounds,
                                rotation: node.rotation,
                                audioMode: node.audioMode,
                                loopEnabled: node.loopEnabled,
                                playMode: node.playMode,
                                maxGain: node.maxGain,
                                audioFileName: node.audioFileName || null
                            })),
                            paths: allPaths.map(line => ({
                                latlngs: line.getLatLngs().map(p => ({
                                    lat: p.lat,
                                    lng: p.lng
                                })),
                                layerIndex: line._layerIndex
                            })),
                            viewpoints: allViewpoints.map(marker => ({
                                lat: marker.getLatLng().lat,
                                lng: marker.getLatLng().lng,
                                note: marker._note || "",
                                pathIndex: allPaths.indexOf(marker._path),
                                layerIndex: marker._layerIndex
                            }))
                        };

                        const blob = new Blob(
                            [JSON.stringify(data, null, 2)],
                            { type: "application/json" }
                        );

                        const url = URL.createObjectURL(blob);

                        let defaultName = projectTitle || "sourceNodes";

                        let filename = prompt(
                            "Enter filename (without extension)",
                            defaultName
                        );

                        if (!filename) return;

                        if (!filename.endsWith(".json")) {
                            filename += ".json";
                        }

                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename;
                        a.click();

                        URL.revokeObjectURL(url);
                    };

                    return div;
                };

                saveButton.addTo(map);

                const exportButton = L.control({ position: "topleft" });

                exportButton.onAdd = function () {
                    const div = L.DomUtil.create("div", "export-button");
                    div.title = "Export project";

                    div.onclick = function (e) {
                        L.DomEvent.stop(e);

                        const data = {
                            projectTitle: projectTitle,
                            nodes: sourceNodes.map(node => ({
                                lat: node.latlng.lat,
                                lng: node.latlng.lng,
                                radius: node.radius,
                                audioMode: node.audioMode,
                                loopEnabled: node.loopEnabled,
                                audioFileName: node.audioFileName || null
                            }))
                        };

                        let defaultName = projectTitle || "export";

                        let filename = prompt(
                            "Enter export filename (without extension)",
                            defaultName
                        );

                        if (!filename) return;

                        exportProject(data, sourceNodes, filename);
                    };

                    return div;
                };

                exportButton.addTo(map);

                const titleButton = L.control({ position: "topleft" });

                titleButton.onAdd = function () {
                    const div = L.DomUtil.create("div", "title-button");
                    div.title = "Set project title";

                    div.onclick = function (e) {
                        L.DomEvent.stop(e);

                        const title = prompt("Enter project title", projectTitle);
                        if (!title) return;

                        projectTitle = title;

                        // update browser tab
                        document.title = projectTitle;

                        // optional: tooltip reflects title
                        div.title = `Project: ${projectTitle}`;
                    };

                    return div;
                };

                titleButton.addTo(map);

                return container;
            };

            projectCluster.addTo(map);


            const drawCluster = L.control({ position: "topleft" });

            drawCluster.onAdd = function () {
                const container = L.DomUtil.create("div", "button-cluster");

                const div = L.DomUtil.create("div", "draw-button", container);

                div.title = "Draw path";

                let stopDrawing = null;

                div.onclick = function (e) {
                    L.DomEvent.stop(e);

                    if (drawMode) {
                        drawMode = false;
                        div.classList.remove("selected");

                        if (stopDrawing) {
                            stopDrawing();
                            stopDrawing = null;
                        }

                        return;
                    }

                    drawMode = true;
                    div.classList.add("selected");

                    stopDrawing = startDrawingPath(map, () => {
                        drawMode = false;
                        div.classList.remove("selected");
                        stopDrawing = null;
                    });
                };

                return container;
            };

            drawCluster.addTo(map);

            const simCluster = L.control({ position: "topleft" });

            simCluster.onAdd = function () {
                const container = L.DomUtil.create("div", "button-cluster");

                const div = L.DomUtil.create("div", "sim-button", container);

                div.title = "Toggle GPS simulation";

                div.onclick = function (e) {
                    L.DomEvent.stop(e);

                    toggleSimulation();

                    if (simulationMode) {
                        div.classList.add("selected");
                    } else {
                        div.classList.remove("selected");
                    }
                };

                return container;
            };

            simCluster.addTo(map);

        }
        
        if (simulationMode) {
            const simulatedLatLng = userMarker.getLatLng();
            updateAudio(sourceNodes, simulatedLatLng);
        } else {
            userMarker.setLatLng(userLatLng);
            updateAudio(sourceNodes, userLatLng);
        }

    }, () => {
        alert("Could not get location");
    });
}

function clearEditHandles(map) {
    activeEditMarkers.forEach(m => map.removeLayer(m));
    activeEditMarkers = [];
    activeLine = null;
}

function showEditHandles(line) {
    const map = line._map;

    clearEditHandles(map);

    activeLine = line;

    const latlngs = line.getLatLngs();

    latlngs.forEach((latlng, index) => {

        const marker = L.marker(latlng, {
            draggable: true,
            icon: L.divIcon({
                className: "edit-handle",
                html: "",
                iconSize: [12, 12]
            })
        }).addTo(map);

        marker.dragging.enable();

        marker.on("drag", (e) => {
            if (activeLine._layerIndex !== currentWriteLayer) return;

            latlngs[index] = e.target.getLatLng();
            line.setLatLngs(latlngs);

            updateViewpointsOnPath(line);
        });

        activeEditMarkers.push(marker);
    });
}



function snapToPath(line, latlng) {
    const map = line._map;
    const points = line.getLatLngs().map(p => map.latLngToLayerPoint(p));
    const p = map.latLngToLayerPoint(latlng);

    let closestPoint = null;
    let minDist = Infinity;

    for (let i = 0; i < points.length - 1; i++) {

        const p1 = points[i];
        const p2 = points[i + 1];

        const projected = closestPointOnSegmentPixel(p1, p2, p);

        const dist = p.distanceTo(projected);

        if (dist < minDist) {
            minDist = dist;
            closestPoint = projected;
        }
    }

    return map.layerPointToLatLng(closestPoint);
}

function updateViewpointsOnPath(line) {
    layers[line._layerIndex].viewpoints.forEach(marker => {
        if (marker._path !== line) return;

        const snapped = snapToPath(line, marker._snapLatLng);

        marker.setLatLng(snapped);

        marker._snapLatLng = snapped;
    });
}

function closestPointOnSegmentPixel(p1, p2, p) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (dx === 0 && dy === 0) return p1;

    const t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / (dx * dx + dy * dy);

    const clamped = Math.max(0, Math.min(1, t));

    return L.point(
        p1.x + clamped * dx,
        p1.y + clamped * dy
    );
}

function createViewpoint(map, line, latlng) {
    const snapped = snapToPath(line, latlng);

    const marker = L.marker(snapped, {
        draggable: true,
        icon: L.divIcon({
            className: "viewpoint-marker",
            html: "📍",
            iconSize: [30, 30],
            iconAnchor: [20, 40]
        })
    }).addTo(map);

    marker._layerIndex = line._layerIndex;
    marker._path = line;

    marker._snapLatLng = snapped;

    if (marker._layerIndex !== currentWriteLayer) {
        marker.dragging.disable();
    }

    marker.on("dragstart", () => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
    });

    marker.on("dragend", () => {
        isDraggingViewpoint = false;
    });

    marker.on("drag", (e) => {
        const raw = e.target.getLatLng();

        const snapped = snapToPath(marker._path, raw);

        e.target.setLatLng(snapped);

        marker._snapLatLng = snapped;

        if (hoverPopup) {
            hoverPopup.setLatLng(marker.getLatLng());
        }

    });
    
    let viewHoldTimer = null;

    marker.on("mousedown", (e) => {
        if (marker._layerIndex !== currentWriteLayer) return;
        viewHoldTimer = setTimeout(() => {
            showViewpointEditor(map, marker);
            viewHoldTimer = null;
        }, 1000);

        L.DomEvent.stopPropagation(e);
    });

    marker.on("mouseup", () => {
        if (viewHoldTimer) {
            clearTimeout(viewHoldTimer);
            viewHoldTimer = null;
        }
    });

    marker.on("dragstart", () => {
        if (viewHoldTimer) {
            clearTimeout(viewHoldTimer);
            viewHoldTimer = null;
        }
    });

    marker.on("dblclick", (e) => {
        L.DomEvent.stopPropagation(e);
        showDeleteViewpointPopup(map, marker, e.latlng);
    });
    
    let hoverPopup = null;

    marker.on("mouseover", () => {
        if (!marker._note || marker._note.trim() === "") return;

        const container = L.DomUtil.create("div", "viewpoint-hover");

        container.innerHTML = `
            <div class="hover-box">
                ${marker._note}
            </div>
        `;

        hoverPopup = L.popup({
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
            offset: [0, -25],
            className: "viewpoint-hover-popup"
        })
        .setLatLng(marker.getLatLng())
        .setContent(container)
        .openOn(map);

        L.DomEvent.disableClickPropagation(container);
    });

    marker.on("mouseout", () => {
        if (hoverPopup) {
            map.closePopup(hoverPopup);
            hoverPopup = null;
        }
    });
    

    allViewpoints.push(marker);

    layers[marker._layerIndex].viewpoints.push(marker);

    return marker;
}


function showViewpointEditor(map, marker) {
    const latlng = marker.getLatLng();

    const container = L.DomUtil.create("div", "viewpoint-editor");

    container.innerHTML = `
        <div class="editor-box">
            <textarea placeholder="Add note...">${marker._note || ""}</textarea>
            <div class="buttons">
                <button class="cancel">Cancel</button>
                <button class="save">Save</button>
            </div>
        </div>
    `;

    const popup = L.popup({
        closeButton: false,
        autoClose: true,
        closeOnClick: false,
        offset: [0, -20]
    })
    .setLatLng(latlng)
    .setContent(container)
    .openOn(map);

    const textarea = container.querySelector("textarea");
    const cancelBtn = container.querySelector(".cancel");
    const saveBtn = container.querySelector(".save");

    cancelBtn.onclick = (e) => {
        L.DomEvent.stopPropagation(e);
        map.closePopup(popup);
    };

    saveBtn.onclick = (e) => {
        L.DomEvent.stopPropagation(e);

        marker._note = textarea.value;

        map.closePopup(popup);
    };

    L.DomEvent.disableClickPropagation(container);
}

function enableViewpointCreation(map) {
    layers.forEach(layer => {
        layer.paths.forEach(line => {

            let holdTimer = null;

            line.on("mousedown", (e) => {

                if (line._layerIndex !== currentWriteLayer) return;

                const startLatLng = e.latlng;

                holdTimer = setTimeout(() => {

                    const snapped = snapToPath(line, startLatLng);

                    createViewpoint(map, line, snapped);

                    holdTimer = null;

                }, 1000);
            });

            line.on("mouseup", () => {
                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
            });

        });
    });
}


function updateWriteLayerUI() {
    const buttons = document.querySelectorAll(".layer-button");
    buttons.forEach(btn => btn.classList.remove("write"));

    const activeBtn = buttons[currentWriteLayer];

    if (activeBtn) {
        activeBtn.classList.add("write");
    }
}

function updateWriteLayerAfterRemoval(layerIndex) {
    const buttons = document.querySelectorAll(".layer-button");

    let found = false;

    for (let i = layerIndex - 1; i >= 0; i--) {
        if (buttons[i].classList.contains("selected")) {
            currentWriteLayer = i;
            found = true;
            break;
        }
    }

    if (!found) {
        currentWriteLayer = 0;
    }

    updateWriteLayerUI();
}

function setNodeVisibility(n, visible) {
    try {
        // ===== MAP =====
        if (visible) {           
            n.map.addLayer(n.dot);

            if (n.isRectangle) {
                if (n.rect) n.map.addLayer(n.rect);
            } else {
                if (n.circle) n.map.addLayer(n.circle);
            }

        } else {
            if (n.dot) n.map.removeLayer(n.dot);
            if (n.circle) n.map.removeLayer(n.circle);
            if (n.rect) n.map.removeLayer(n.rect);
        }

        // ===== CONTROLS =====
        if (n.controls) {
            let el = null;

            if (typeof n.controls.getElement === "function") {
                el = n.controls.getElement();
            }

            if (el && el.style) {
                el.style.display = visible ? "" : "none";
            }
        }

        // ===== LABEL =====
        if (n.label && typeof n.label.getElement === "function") {
            const el = n.label.getElement();
            if (el) {
                el.style.display = visible ? "" : "none";
            }
        }

        // ===== EXTRA =====
        if (!visible && typeof n.hideControls === "function") {
            n.hideControls();
        }

    } catch (err) {
        console.error("Node visibility crash:", n, err);
    }
}

function activateLayer(index) {
    const buttons = document.querySelectorAll(".layer-button");

    const btn = buttons[index];
    const isActive = btn.classList.toggle("selected");

    // ===== visibility logic =====
    (SourceNode.allNodes || []).forEach(n => {
        const visible = buttons[n._layerIndex]?.classList.contains("selected");
        setNodeVisibility(n, visible);
    });

    layers.forEach((layer, i) => {
        const visible = buttons[i]?.classList.contains("selected");

        layer.paths.forEach(l => {
            if (l._layerIndex === i) {
                if (visible) {
                    if (!map.hasLayer(l)) map.addLayer(l);
                } else {
                    if (map.hasLayer(l)) map.removeLayer(l);
                }
            }
        });

        layer.viewpoints.forEach(v => {
            if (v._layerIndex === i) {
                if (visible) {
                    if (!map.hasLayer(v)) map.addLayer(v);
                } else {
                    if (map.hasLayer(v)) map.removeLayer(v);
                }
            }
        });
    });
}

function setWriteLayer(index) {
    const buttons = document.querySelectorAll(".layer-button");
    if (!buttons[index].classList.contains("selected")) {
        activateLayer(index); // only if not visible
    }

    currentWriteLayer = index;
    updateWriteLayerUI();

    allViewpoints.forEach(v => {
        if (v._layerIndex === currentWriteLayer) {
            v.dragging.enable();
        } else {
            v.dragging.disable();
        }
    });

}
