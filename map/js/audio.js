function updateAudio(sourceNodes, userLatLng) {
    if (!SourceNode.audioCtx) return;

    const now = SourceNode.audioCtx.currentTime;

    sourceNodes.forEach(node => {
        if (!node.gainNode) return;
        if (!node.audioBuffer) return;

        const distance = userLatLng.distanceTo(node.latlng);

        const isInside = distance <= node.radius;

        if (isInside && node.wasInside === false) {
            node.restartAudio();
        }

        node.wasInside = isInside;

        let volume;

        if (node.audioMode === "fade") {
            // original behavior
            volume = Math.max(0, Math.min(1, 1 - (distance / node.radius)));
        } else {
            // default: binary
            volume = (distance <= node.radius) ? 1 : 0;
        }

        node.gainNode.gain.setTargetAtTime(volume, now, 0.05);
    });
}


