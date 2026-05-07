function enableCircleResize(map, circle) {
    function onMouseMove(e) {
        const center = circle.getLatLng();
        const radius = center.distanceTo(e.latlng);
        circle.setRadius(radius);
    }
    
    function stopResize(e) {
        window.isResizing = false;

        map.dragging.enable();
        map.off("mousemove", onMouseMove);
        map.off("mouseup", stopResize);

        if (e) L.DomEvent.stopPropagation(e);
    }

    circle.on("mousedown", function (e) {
        window.isResizing = true;

        map.dragging.disable();

        map.on("mousemove", onMouseMove);
        map.on("mouseup", stopResize);

        L.DomEvent.stopPropagation(e);
    });

    circle.on("click", function (e) {
        L.DomEvent.stopPropagation(e);
    });
}