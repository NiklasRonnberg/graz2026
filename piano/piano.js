
document.addEventListener("DOMContentLoaded", () => {

    const nodesData = [
  {
    "lat": 47.07159607947099,
    "lng": 15.41799992322922,
    "radius": 25,
    "audioMode": "binary",
    "loopEnabled": false,
    "audioFileName": "piano.wav"
  },
  {
    "lat": 47.07110101180334,
    "lng": 15.417723655700685,
    "radius": 25,
    "audioMode": "binary",
    "loopEnabled": false,
    "audioFileName": "piano.wav"
  },
  {
    "lat": 47.07088361901281,
    "lng": 15.416296720504763,
    "radius": 25,
    "audioMode": "binary",
    "loopEnabled": false,
    "audioFileName": "piano.wav"
  }
];

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
