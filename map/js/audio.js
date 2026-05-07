function updateAudio(sourceNodes, userLatLng) {
    if (!SourceNode.audioCtx) return;

    const now = SourceNode.audioCtx.currentTime;

    sourceNodes.forEach(node => {
        if (!node.gainNode || !node.audioBuffer) return;

        let distance;
        let isInside;

        const wasInside = node.wasInside;

        // Rectangle
        if (node.isRectangle && node.rectBounds) {

            const lat = userLatLng.lat;
            const lng = userLatLng.lng;

            const { north, south, east, west } = node.rectBounds;

            isInside =
                lat >= south &&
                lat <= north &&
                lng >= west &&
                lng <= east;

            if (!isInside) {
                distance = 1;
            } else {
                const centerLat = node.latlng.lat;
                const centerLng = node.latlng.lng;

                const dx = (lng - centerLng) * 111320 * Math.cos(centerLat * Math.PI / 180);
                const dy = (lat - centerLat) * 111320;

                const a = Math.min(
                    Math.abs(centerLng - west),
                    Math.abs(east - centerLng)
                ) * 111320 * Math.cos(centerLat * Math.PI / 180);

                const b = Math.min(
                    Math.abs(north - centerLat),
                    Math.abs(centerLat - south)
                ) * 111320;

                distance = Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));
            }

        }

        // Circle
        else {

            const rawDistance = userLatLng.distanceTo(node.latlng);
            isInside = rawDistance <= node.radius;

            distance = rawDistance / node.radius; // normalize
        }

        // Enter sourceNode logic
        if (isInside && !wasInside) {

            if (node.playMode === "restart") {
                node.restartAudio();
            }

            else if (node.playMode === "pause") {
                if (node.pauseOffset != null) {
                    node.startAudioFrom(node.pauseOffset);
                } else {
                    node.startAudio();
                }
            }

            else if (node.playMode === "single") {
                if (!node.hasPlayedOnce) {
                    node.restartAudio();
                    node.hasPlayedOnce = true;
                }
            }
        }

        // Exit sourceNode logic
        if (!isInside && wasInside) {

            if (node.playMode === "pause") {
                try {
                    const ctx = SourceNode.audioCtx;
                    node.pauseOffset = node.offset + (ctx.currentTime - node.startTime);
                    node.source.stop();
                } catch {}
            }

            else if (node.playMode === "single") {
                try {
                    node.source.stop();
                } catch {}
            }
        }

        node.wasInside = isInside;

        // Sound level
        let volume;

        if (!isInside) {
            volume = 0;
        } else if (node.audioMode === "fade") {
            volume = Math.max(0, Math.min(1, 1 - distance));
        } else {
            volume = 1;
        }

        node.gainNode.gain.setTargetAtTime(
            volume * node.maxGain,
            now,
            0.05
        );

    });
}
