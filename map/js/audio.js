function updateAudio(sourceNodes, userLatLng) {
    if (!SourceNode.audioCtx) return;

    const now = SourceNode.audioCtx.currentTime;

    sourceNodes.forEach(node => {
        if (!node.gainNode) return;
        if (!node.audioBuffer) return;

        let distance;
        let isInside;

        // Rectangle logic
        if (node.isRectangle && node.rectBounds) {
            const lat = userLatLng.lat;
            const lng = userLatLng.lng;

            const { north, south, east, west } = node.rectBounds;

            isInside =
                lat >= south &&
                lat <= north &&
                lng >= west &&
                lng <= east;

            if (isInside && node.wasInside === false) {
                node.restartAudio();
            }

            if (!isInside) {
                distance = Infinity; // handled later
            } else {

                const centerLat = node.latlng.lat;
                const centerLng = node.latlng.lng;

                const dx = (lng - centerLng) * 111320 * Math.cos(centerLat * Math.PI / 180);
                const dy = (lat - centerLat) * 111320;

                const a =
                    Math.min(
                        Math.abs(centerLng - west),
                        Math.abs(east - centerLng)
                    ) * 111320 * Math.cos(centerLat * Math.PI / 180);

                const b =
                    Math.min(
                        Math.abs(north - centerLat),
                        Math.abs(centerLat - south)
                    ) * 111320;

                const norm = Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));

                distance = norm;
            }
        }



        // Circle logic
        else {

            const rawDistance = userLatLng.distanceTo(node.latlng);

            isInside = rawDistance <= node.radius;

            if (isInside && node.wasInside === false) {
                node.restartAudio();
            }

            distance = rawDistance / node.radius;

            if (isInside && node.wasInside === false) {
                node.restartAudio();
            }
        }

        node.wasInside = isInside;

        // Volume calculation
        let volume;

        if (!isInside) {
            volume = 0;
        } else if (node.audioMode === "fade") {
            volume = Math.max(0, Math.min(1, 1 - distance)); // distance is already normalized
        } else {
            volume = 1;
        }
        
        node.gainNode.gain.setTargetAtTime(volume, now, 0.05);
    });
}