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

            const local = node.toLocal(userLatLng);

            const halfWidth  = (node.rectBounds.east - node.rectBounds.west) / 2;
            const halfHeight = (node.rectBounds.north - node.rectBounds.south) / 2;

            isInside =
                Math.abs(local.x) <= halfWidth &&
                Math.abs(local.y) <= halfHeight;

            if (!isInside) {
                distance = 1;
            } else {
                // convert to local rotated space
                const local = node.toLocal(userLatLng);

                // convert degrees → meters
                const scale = 111320;
                const dx = local.x * scale * Math.cos(node.latlng.lat * Math.PI / 180);
                const dy = local.y * scale;

                // half-size in meters
                const halfWidth =
                    (node.rectBounds.east - node.rectBounds.west) / 2 *
                    scale * Math.cos(node.latlng.lat * Math.PI / 180);

                const halfHeight =
                    (node.rectBounds.north - node.rectBounds.south) / 2 *
                    scale;

                // normalized elliptical distance
                distance = Math.sqrt(
                    (dx * dx) / (halfWidth * halfWidth) +
                    (dy * dy) / (halfHeight * halfHeight)
                );
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
