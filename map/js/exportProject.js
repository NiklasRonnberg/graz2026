function exportProject(data, sourceNodes) {
    console.log("Exporting project:", data);

    
    const title =
            data.projectTitle && data.projectTitle.trim()
                ? data.projectTitle
                : "My sound walk";

    exportProjectAsHTML(title);
    exportProjectCSS(sourceNodes, title);
    exportScriptsJS(sourceNodes, title);
}




// ---- HTML ----
function exportProjectAsHTML(projectTitle) {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${projectTitle || "My sound walk"}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <link rel="stylesheet" href="${projectTitle}.css">
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script src="${projectTitle}.js"></script>
</head>
<body>
<div id="map"></div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const filename =
        (projectTitle || "My sound walk").replace(/\s+/g, "_") + ".html";

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}




// ---- CSS ----
function exportProjectCSS(sourceNodes, projectTitle) {
    let strokeColor = "rgba(255, 0, 0, 0.4)";
    let fillColor = "rgba(255, 0, 0, 0.2)";

    if (sourceNodes.length > 0) {
        const style = sourceNodes[0].circle.options;

        strokeColor = style.color || strokeColor;
        fillColor = style.fillColor || fillColor;
    }

    const css = `
        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
        }

        #map {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
        }

        .leaflet-interactive {
            stroke: ${strokeColor};
            fill: ${fillColor};
            fill-opacity: 1;
        }

        .start-button {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50vw;
            height: 25vh;
            padding: 12px;
            z-index: 1000;
            font-size: 10vh;
            background: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        }

        .start-button:hover {
            background: #eee;
        }
        `;

    const blob = new Blob([css], { type: "text/css" });
    const url = URL.createObjectURL(blob);

    const filename =
        (projectTitle || "My sound walk").replace(/\s+/g, "_") + ".css";

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}




// ---- JS ----
function exportScriptsJS(sourceNodes, projectTitle) {

    const nodeData = sourceNodes.map(n => ({
        lat: n.latlng.lat,
        lng: n.latlng.lng,
        radius: n.radius,
        audioMode: n.audioMode,
        loopEnabled: n.loopEnabled,
        audioFileName: n.audioFileName || null
    }));

    const scriptContent = `
document.addEventListener("DOMContentLoaded", () => {

    const nodesData = ${JSON.stringify(nodeData, null, 2)};

    let map = L.map("map").setView([0, 0], 18);

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

    function startAudio(node) {
        if (!node.audioBuffer) return;

        const source = audioCtx.createBufferSource();
        source.buffer = node.audioBuffer;
        source.loop = node.data.loopEnabled;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;

        source.connect(gainNode).connect(audioCtx.destination);
        source.start();

        node.source = source;
        node.gainNode = gainNode;
    }

    function restartAudio(node) {
        if (!node.audioBuffer) return;

        if (node.source) {
            try { node.source.stop(); } catch {}
        }

        const source = audioCtx.createBufferSource();
        source.buffer = node.audioBuffer;
        source.loop = node.data.loopEnabled;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;

        source.connect(gainNode).connect(audioCtx.destination);
        source.start(0);

        node.source = source;
        node.gainNode = gainNode;
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
            gainNode: null,
            wasInside: false
        };

        nodes.push(node);

        if (n.audioFileName) {
            fetch("sounds/" + n.audioFileName)
                .then(res => res.arrayBuffer())
                .then(buf => audioCtx.decodeAudioData(buf))
                .then(decoded => {
                    node.audioBuffer = decoded;

                    if (audioCtx.state === "running") {
                        startAudio(node);
                    }
                })
                .catch(err => {
                    console.error("Audio load failed:", n.audioFileName, err);
                });
        }
    }

    nodesData.forEach(createNode);

    if (nodesData.length > 0) {
        const bounds = L.latLngBounds(nodesData.map(n => [n.lat, n.lng]));
        map.fitBounds(bounds);
    }

    function updateAudio(userPos) {

        if (!audioCtx) return;

        const now = audioCtx.currentTime;

        nodes.forEach(node => {

            if (!node.gainNode) return;
            if (!node.audioBuffer) return;

            const distance = userPos.distanceTo(node.latlng);
            const isInside = distance <= node.data.radius;

            // restart when entering
            if (isInside && node.wasInside === false) {
                restartAudio(node);
            }

            node.wasInside = isInside;

            let volume;

            if (node.data.audioMode === "fade") {
                volume = Math.max(0, Math.min(1, 1 - (distance / node.data.radius)));
            } else {
                volume = (distance <= node.data.radius) ? 1 : 0;
            }

            node.gainNode.gain.setTargetAtTime(volume, now, 0.05);
        });
    }

    // GPS tracking
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (pos) => {
                const latlng = L.latLng(
                    pos.coords.latitude,
                    pos.coords.longitude
                );

                currentPosition = latlng;

                userMarker.setLatLng(latlng);
                updateAudio(latlng);
            },
            () => console.warn("GPS not available"),
            { enableHighAccuracy: true }
        );
    }

    // START BUTTON
    const btn = document.createElement("button");
    btn.innerText = "Start";

    btn.className = "start-button";

    btn.onclick = () => {

        audioCtx.resume();

        nodes.forEach(node => {
            startAudio(node);

            if (currentPosition) {
                const dist = currentPosition.distanceTo(node.latlng);
                node.wasInside = dist <= node.data.radius;
            }
        });

        if (currentPosition) {
            updateAudio(currentPosition);
        }

        btn.remove();
    };

    document.body.appendChild(btn);
});
`;

    const blob = new Blob([scriptContent], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);

    const filename =
        (projectTitle || "My sound walk").replace(/\\s+/g, "_") + ".js";

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}
