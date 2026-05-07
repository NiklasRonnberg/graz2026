
document.addEventListener("DOMContentLoaded", () => {

    const nodesData = [
  {
    "lat": 47.07159607947099,
    "lng": 15.417946279048921,
    "radius": 15.031782022962416,
    "audioMode": "binary",
    "loopEnabled": false,
    "audioFileName": "piano.wav"
  },
  {
    "lat": 47.07115033609455,
    "lng": 15.41773170232773,
    "radius": 25,
    "audioMode": "binary",
    "loopEnabled": false,
    "audioFileName": "piano.wav"
  },
  {
    "lat": 47.070865350670715,
    "lng": 15.416294038295748,
    "radius": 23.41073346535289,
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

    let audioCtx = null;
    const nodes = [];

    // ✅ USER MARKER (GPS)
    let userMarker = L.circleMarker([0, 0], {
        radius: 6,
        color: "green"
    }).addTo(map);

    function createNode(n) {
        const latlng = L.latLng(n.lat, n.lng);

        const circle = L.circle(latlng, {
            radius: n.radius,
            color: "rgba(255,0,0,0.4)",
            fillColor: "rgba(255,0,0,0.2)",
            fillOpacity: 1,
            dashArray: n.audioMode === "fade" ? "4,4" : null
        }).addTo(map);

        const marker = L.circleMarker(latlng, {
            radius: 6,
            color: "rgba(155,0,0,1)"
        }).addTo(map);

        let audioBuffer = null;
        let gainNode = null;
        let source = null;

        function startAudio() {
            if (!audioCtx || !audioBuffer) return;

            source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = n.loopEnabled;

            gainNode = audioCtx.createGain();
            gainNode.gain.value = 0;

            source.connect(gainNode).connect(audioCtx.destination);
            source.start();
        }

        // ✅ load audio from /sounds/
        if (n.audioFileName) {
            fetch("sounds/" + n.audioFileName)
                .then(res => res.arrayBuffer())
                .then(buf => audioCtx.decodeAudioData(buf))
                .then(decoded => {
                    audioBuffer = decoded;
                    startAudio();
                });
        }

        nodes.push({
            latlng,
            gainNode,
            data: n
        });
    }

    // ✅ create nodes
    nodesData.forEach(createNode);

    // ✅ center map
    if (nodesData.length > 0) {
        const bounds = L.latLngBounds(nodesData.map(n => [n.lat, n.lng]));
        map.fitBounds(bounds);
    }

    // ✅ AUDIO UPDATE (based on user position)
    function updateAudio(userPos) {
        if (!audioCtx) return;

        nodes.forEach(node => {
            if (!node.gainNode) return;

            const dist = userPos.distanceTo(node.latlng);

            if (node.data.audioMode === "binary") {
                node.gainNode.gain.value =
                    dist < node.data.radius ? 1 : 0;
            } else {
                const t = Math.max(0, 1 - dist / node.data.radius);
                node.gainNode.gain.value = t;
            }
        });
    }

    // ✅ GPS TRACKING
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (pos) => {
                const latlng = L.latLng(
                    pos.coords.latitude,
                    pos.coords.longitude
                );

                userMarker.setLatLng(latlng);

                updateAudio(latlng);
            },
            () => {
                console.warn("GPS not available");
            },
            { enableHighAccuracy: true }
        );
    }

    // ✅ START BUTTON (audio context unlock)
    const btn = document.createElement("button");
    btn.innerText = "Start";
    btn.style.position = "absolute";
    btn.style.top = "20px";
    btn.style.left = "50%";
    btn.style.transform = "translateX(-50%)";
    btn.style.padding = "10px 20px";
    btn.style.zIndex = 1000;

    btn.onclick = async () => {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        await audioCtx.resume();

        btn.remove();
    };

    document.body.appendChild(btn);
});
