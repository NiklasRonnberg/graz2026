const AppState = {
    isResizing: false
};

document.addEventListener("DOMContentLoaded", () => {
    createMapCanvas();
});

function createMapCanvas() {
    const mapDiv = document.createElement("div");
    mapDiv.id = "map";
    document.body.appendChild(mapDiv);

    loadLeaflet(() => {
        initializeMap();
    });
}

function loadLeaflet(callback) {
    if (typeof L !== "undefined") {
        callback();
        return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet/dist/leaflet.js";
    script.onload = callback;
    document.head.appendChild(script);
}