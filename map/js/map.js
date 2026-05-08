function initializeMap() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }

    let map;
    let userMarker;

    let projectTitle = "Untitled Project";


    let simulationMode = false;

    function toggleSimulation() {
        simulationMode = !simulationMode;
    }

    const sourceNodes = [];

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
                if (SourceNode.allNodes) {
                    SourceNode.allNodes.forEach(n => n.hideControls());
                }
            });

            normalLayer.addTo(map);
            let isSatellite = false;

            userMarker = L.circleMarker(userLatLng, {
                radius: 5,
                color: "green"
            }).addTo(map);

            map.on("dblclick", function (e) {
                if (window.isResizing) return;

                const node = new SourceNode(map, e.latlng);

                node.onRemove = (n) => {
                    const index = sourceNodes.indexOf(n);
                    if (index !== -1) sourceNodes.splice(index, 1);
                };

                sourceNodes.push(node);
            });

            const mapToggle = L.control({ position: "topleft" });

            mapToggle.onAdd = function () {
                const div = L.DomUtil.create("div", "map-toggle-button");

                div.innerHTML = "🛰️";
                div.title = "Toggle satellite view";

                div.onclick = function (e) {
                    L.DomEvent.stop(e);

                    if (isSatellite) {
                        map.removeLayer(satelliteLayer);
                        normalLayer.addTo(map);
                        div.classList.remove("active");
                    } else {
                        map.removeLayer(normalLayer);
                        satelliteLayer.addTo(map);
                        div.classList.add("active");
                    }

                    isSatellite = !isSatellite;
                };

                return div;
            };

            mapToggle.addTo(map);

            const loadButton = L.control({ position: "topleft" });

            loadButton.onAdd = function () {
                const div = L.DomUtil.create("div", "load-button");
                div.innerHTML = "📂";
                div.title = "Load project";

                div.onclick = function (e) {
                    L.DomEvent.stop(e);

                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "application/json";

                    input.onchange = async (event) => {
                        const file = event.target.files[0];
                        if (!file) return;

                        const text = await file.text();
                        const loaded = JSON.parse(text);
                        const data = loaded.nodes || loaded;

                        const requiredFiles = data
                            .map(d => d.audioFileName)
                            .filter(name => name);

                        if (loaded.projectTitle) {
                            projectTitle = loaded.projectTitle;
                            document.title = projectTitle;
                        }

                        // remove old nodes
                        sourceNodes.forEach(n => n.remove());
                        sourceNodes.length = 0;

                        const latlngs = [];

                        data.forEach(d => {
                            const node = new SourceNode(
                                map,
                                L.latLng(d.lat, d.lng)
                            );

                            // restore properties
                            node.radius = d.radius;
                            node.circle.setRadius(d.radius);

                            if (d.isRectangle) {
                                node.isRectangle = true;

                                node.rectBounds = d.rectBounds;

                                node.map.removeLayer(node.circle);
                                node.createRectangle();
                            }

                            node.rotation = d.rotation || 0;

                            if (node.rect) {
                                node.rect.setLatLngs(node.getRectangleCorners());
                                node.showRotationHandle();
                            }

                            if (d.rectBounds && node.rect) {
                                node.rectBounds = d.rectBounds;

                                node.rect.setBounds([
                                    [d.rectBounds.south, d.rectBounds.west],
                                    [d.rectBounds.north, d.rectBounds.east]
                                ]);
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

                            node.audioFileName = d.audioFileName || null; // restore name
                            node.updateLabel(); 

                            // restore visual style                            
                            node.updateFadeVisual();
                            node.updateFadeButton();
                            node.circle.setStyle({
                                dashArray: node.circleStyleDashed ? "4,4" : null
                            });

                            // rebind removal
                            node.onRemove = (n) => {
                                const index = sourceNodes.indexOf(n);
                                if (index !== -1) sourceNodes.splice(index, 1);
                            };

                            sourceNodes.push(node);

                            latlngs.push([d.lat, d.lng]);
                        });

                        // center map
                        if (latlngs.length > 0) {                            
                            const center = L.latLngBounds(latlngs).getCenter();
                            map.panTo(center)
                        }
                    };

                    input.click();
                };

                return div;
            };

            loadButton.addTo(map);

            const saveButton = L.control({ position: "topleft" });

            saveButton.onAdd = function () {
                const div = L.DomUtil.create("div", "save-button");
                div.innerHTML = "💾";
                div.title = "Save project";

                div.onclick = function (e) {
                    L.DomEvent.stop(e);

                    const data = {
                        projectTitle: projectTitle,
                        nodes: sourceNodes.map(node => ({
                            lat: node.latlng.lat,
                            lng: node.latlng.lng,
                            radius: node.radius,
                            isRectangle: node.isRectangle,
                            rectBounds: node.rectBounds,
                            rotation: node.rotation,
                            audioMode: node.audioMode,
                            loopEnabled: node.loopEnabled,
                            playMode: node.playMode,
                            maxGain: node.maxGain,
                            audioFileName: node.audioFileName || null
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

                div.innerHTML = "📤";
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

                    exportProject(data, sourceNodes);
                };


                return div;
            };

            exportButton.addTo(map);

            const titleButton = L.control({ position: "topleft" });

            titleButton.onAdd = function () {
                const div = L.DomUtil.create("div", "title-button");
                div.innerHTML = "✏️";
                div.title = "Set project title";

                div.onclick = function (e) {
                    L.DomEvent.stop(e);

                    const title = prompt("Enter project title", projectTitle);
                    if (!title) return;

                    projectTitle = title;

                    // update browser tab
                    document.title = projectTitle;

                    // ptional: tooltip reflects title
                    div.title = `Project: ${projectTitle}`;
                };

                return div;
            };

            titleButton.addTo(map);

            const simButton = L.control({ position: "topleft" });

            simButton.onAdd = function () {
                const div = L.DomUtil.create("div", "sim-button");
                div.innerHTML = "🧭";

                div.title = "Toggle GPS simulation";

                div.onclick = function (e) {
                    L.DomEvent.stop(e);

                    toggleSimulation();

                    if (simulationMode) {
                        div.classList.add("active");
                    } else {
                        div.classList.remove("active");
                    }
                };

                return div;
            };

            simButton.addTo(map);

            map.on("mousemove", function (e) {
                if (!simulationMode) return;

                const simulatedLatLng = e.latlng;

                userMarker.setLatLng(simulatedLatLng);

                updateAudio(sourceNodes, simulatedLatLng);
            });

        }
        
        if (!simulationMode) {
            userMarker.setLatLng(userLatLng);
            updateAudio(sourceNodes, userLatLng);
        }


    }, () => {
        alert("Could not get location");
    });
}