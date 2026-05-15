function exportProject(data, sourceNodes, filenameBase) {

    console.log("Exporting project:", data);

    const title =
        data.projectTitle && data.projectTitle.trim()
            ? data.projectTitle
            : "My sound walk";

    const base =
        (filenameBase || title).replace(/\s+/g, "_");

    exportProjectAsHTML(title, base);
    exportProjectCSS(sourceNodes, title, base);
    exportScriptsJS(sourceNodes, allPaths, allViewpoints, title, base);
}



// ---- HTML ----
function exportProjectAsHTML(projectTitle, base) {

    const safeTitle = projectTitle || "My sound walk";
    const safeBase  = base || "export";

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>

    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

    <!-- Project files -->
    <link rel="stylesheet" href="${safeBase}.css">
    <script src="${safeBase}.js" defer></script>

    <style>
        /* fallback if CSS file fails */
        #map {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
        }

        body {
            margin: 0;
            padding: 0;
        }
    </style>
</head>

<body>

<div id="map"></div>

</body>
</html>`;

    // create file
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const filename = safeBase + ".html";

    // download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}




// ---- CSS ----
function exportProjectCSS(sourceNodes, projectTitle, base) {

    const safeTitle = projectTitle || "My sound walk";
    const safeBase  = (base || safeTitle).replace(/\s+/g, "_");

    // Default colors
    let strokeColor = "rgba(255, 0, 0, 0.4)";
    let fillColor   = "rgba(255, 0, 0, 0.2)";

    // Extract style from first node (if available)
    if (sourceNodes.length > 0) {
        const style = sourceNodes[0].circle?.options || {};

        strokeColor = style.color || strokeColor;
        fillColor   = style.fillColor || fillColor;
    }

    const css = `
html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    font-family: Arial, sans-serif;
}

#map {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
}

path.leaflet-interactive {
    fill: none !important;
}

circle.leaflet-interactive,
rect.leaflet-interactive {
    stroke: ${strokeColor};
    fill: ${fillColor};
    fill-opacity: 1;
}

.viewpoint-marker {
    font-size: 24px;
}

.leaflet-popup-content-wrapper {
    background: transparent;
    box-shadow: none;
    border: none;
}

.leaflet-popup-tip {
    display: none;
}

.hover-box {
    background: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 14px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    white-space: nowrap;
    max-width: 200px;
}

.start-button {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    
    width: 50vw;
    height: 25vh;

    font-size: 8vh;
    font-weight: bold;

    background: white;
    color: black;

    border: none;
    border-radius: 12px;

    cursor: pointer;

    z-index: 1000;

    box-shadow: 0 6px 20px rgba(0,0,0,0.3);

    transition: all 0.2s ease;
}

.start-button:hover {
    background: #f0f0f0;
    transform: translate(-50%, -50%) scale(1.02);
}

.start-button:active {
    transform: translate(-50%, -50%) scale(0.98);
}

@media (max-width: 768px) {
    .start-button {
        width: 70vw;
        height: 20vh;
        font-size: 5vh;
    }

    .hover-box {
        white-space: normal;
        max-width: 70vw;
    }
}

.leaflet-interactive[stroke="green"] {
    stroke: green;
}

body {
    touch-action: none;
}
`;

    // create file
    const blob = new Blob([css], { type: "text/css" });
    const url = URL.createObjectURL(blob);

    const filename = safeBase + ".css";

    // download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}




// ---- JS ----
function exportScriptsJS(sourceNodes, allPaths, allViewpoints, projectTitle, base) {
    const safeBase = (base || "export").replace(/\s+/g, "_");

    const nodeData = sourceNodes.map(n => ({
        lat: n.latlng.lat,
        lng: n.latlng.lng,
        radius: n.radius,
        audioMode: n.audioMode,
        loopEnabled: n.loopEnabled,
        playMode: n.playMode,
        audioFileName: n.audioFileName || null
    }));

    const pathData = allPaths.map(p => ({
        latlngs: p.getLatLngs().map(pt => ({
            lat: pt.lat,
            lng: pt.lng
        }))
    }));

    const viewpointData = allViewpoints.map(v => ({
        lat: v.getLatLng().lat,
        lng: v.getLatLng().lng,
        note: v._note || ""
    }));


    const scriptContent = `
document.addEventListener("DOMContentLoaded", () => {

    const nodesData = ${JSON.stringify(nodeData)};
    const pathsData = ${JSON.stringify(pathData)};
    const viewpointsData = ${JSON.stringify(viewpointData)};

    const map = L.map("map").setView([0, 0], 18);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 22,
        maxNativeZoom: 19
    }).addTo(map);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const nodes = [];
    let currentPosition = null;

    const userMarker = L.circleMarker([0, 0], {
        radius: 6,
        color: "green"
    }).addTo(map);

    // ===== PATHS =====
    pathsData.forEach(path => {
        const latlngs = path.latlngs.map(p => [p.lat, p.lng]);

        L.polyline(latlngs, {
            color: "blue",
            weight: 6,
            opacity: 0.5,
            fill: false
        }).addTo(map);
    });

    // ===== VIEWPOINTS =====
    viewpointsData.forEach(v => {

        const marker = L.marker([v.lat, v.lng]).addTo(map);

        if (!v.note || v.note.trim() === "") return;

        let hoverPopup = null;

        marker.on("mouseover", () => {

            const container = document.createElement("div");

            container.innerHTML = \`
                <div style="
                    background: white;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-size: 14px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                ">
                    \${v.note}
                </div>
            \`;

            hoverPopup = L.popup({
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
                offset: [0, -25]
            })
            .setLatLng(marker.getLatLng())
            .setContent(container)
            .openOn(map);
        });

        marker.on("mouseout", () => {
            if (hoverPopup) {
                map.closePopup(hoverPopup);
                hoverPopup = null;
            }
        });

    });

    function createSource(node, offset = 0) {

        const source = audioCtx.createBufferSource();
        source.buffer = node.audioBuffer;
        source.loop = node.data.loopEnabled;

        const gain = audioCtx.createGain();
        gain.gain.value = 0;

        source.connect(gain).connect(audioCtx.destination);
        source.start(0, offset);

        node.source = source;
        node.gain = gain;
        node.startTime = audioCtx.currentTime - offset;
    }

    function stopSource(node) {
        if (!node.source) return;

        try {
            node.pauseTime = audioCtx.currentTime - node.startTime;
            node.source.stop();
        } catch {}

        node.source = null;
    }

    function restart(node) {
        stopSource(node);
        createSource(node, 0);
    }

    function resume(node) {
        stopSource(node);
        const offset = (node.pauseTime || 0) % node.audioBuffer.duration;
        createSource(node, offset);
    }

    function createNode(n) {

        const latlng = L.latLng(n.lat, n.lng);

        L.circle(latlng, {
            radius: n.radius,
            color: "rgba(255,0,0,0.4)",
            fillColor: "rgba(255,0,0,0.2)",
            fillOpacity: 1,
            dashArray: n.audioMode === "fade" ? "4,4" : null
        }).addTo(map);

        L.circleMarker(latlng, {
            radius: 6,
            color: "rgba(155,0,0,1)"
        }).addTo(map);

        const node = {
            latlng,
            data: n,
            audioBuffer: null,
            source: null,
            gain: null,
            startTime: 0,
            pauseTime: 0,
            wasInside: false
        };

        nodes.push(node);

        if (n.audioFileName) {
            fetch("sounds/" + n.audioFileName)
                .then(r => r.arrayBuffer())
                .then(buf => audioCtx.decodeAudioData(buf))
                .then(decoded => {
                    node.audioBuffer = decoded;
                    if (audioCtx.state === "running") {
                        createSource(node);
                    }
                });
        }
    }

    nodesData.forEach(createNode);

    const allCoords = [
        ...nodesData.map(n => [n.lat, n.lng]),
        ...viewpointsData.map(v => [v.lat, v.lng])
    ];

    if (allCoords.length > 0) {
        map.fitBounds(allCoords);
    }

    function updateAudio(userPos) {

        const now = audioCtx.currentTime;

        nodes.forEach(node => {

            if (!node.audioBuffer) return;

            const d = userPos.distanceTo(node.latlng);
            const inside = d <= node.data.radius;

            if (inside && !node.wasInside) {
                if (node.data.playMode === "pause") {
                    resume(node);
                } else {
                    restart(node);
                }
            }

            if (!inside && node.wasInside) {
                if (node.data.playMode === "pause" || node.data.playMode === "single") {
                    stopSource(node);
                }
            }

            node.wasInside = inside;

            if (!node.gain) return;

            let vol = node.data.audioMode === "fade"
                ? Math.max(0, 1 - (d / node.data.radius))
                : (inside ? 1 : 0);

            node.gain.gain.setTargetAtTime(vol, now, 0.05);
        });
    }

    navigator.geolocation?.watchPosition(pos => {

        const p = L.latLng(pos.coords.latitude, pos.coords.longitude);

        currentPosition = p;
        userMarker.setLatLng(p);

        updateAudio(p);

    });

    const btn = document.createElement("button");
    btn.className = "start-button";
    btn.innerText = "Start";

    btn.onclick = () => {

        audioCtx.resume();

        nodes.forEach(node => {
            if (node.audioBuffer) createSource(node);
        });

        if (currentPosition) updateAudio(currentPosition);

        btn.remove();
    };

    document.body.appendChild(btn);

});
`;

    const blob = new Blob([scriptContent], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = safeBase + ".js";
    a.click();

    URL.revokeObjectURL(url);
}