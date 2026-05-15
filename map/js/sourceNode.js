const layerMarkerColors = [
    "rgba(173, 75, 59, ",
    "rgba(170, 149, 60, ",
    "rgba(76, 134, 204, ",
    "rgba(63, 165, 63, "
];

const layerColors = [
    "rgba(225, 100, 75, ",
    "rgba(224, 196, 76, ",
    "rgba(92, 158, 255, ",
    "rgba(2, 219, 82, "
];

class SourceNode {
    constructor(map, latlng) {
        this.audioMode = "binary"; // default
        this.circleStyleDashed = false;

        this.map = map;
        this.latlng = latlng;
        this.radius = 25;

        this.isRectangle = false;
        this.rectBounds = null;

        this.rotation = 0;
        this.rotationHandle = null;

        this.hasAudio = false;
        this.maxGain = 1;

        this.isPreviewPlaying = false;
        this.loopEnabled = false

        this.playMode = "restart";
        this.hasPlayedOnce = false; 
        this.pauseTime = 0;

        this.isPlaying = false;

        this.isLocked = false;


        if (!SourceNode.allNodes) {
            SourceNode.allNodes = [];
        }
        SourceNode.allNodes.push(this);

        this.wasInside = false;

        this.createVisuals();
        this.enableResize();
        this.enableMove();
    }

    async loadAudio() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*";

        input.click();

        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            this.audioFileName = file.name;
            this.updateLabel(); 

            const arrayBuffer = await file.arrayBuffer();

            if (!SourceNode.audioCtx) {
                SourceNode.audioCtx = new AudioContext();
            }

            if (this.source) {
                try {
                    this.pauseTime = this.getCurrentTime();
                    this.stopAudioWithPause();
                } catch {}
            }

            this.stopPreview();

            this.audioBuffer =
                await SourceNode.audioCtx.decodeAudioData(arrayBuffer);

            this.startAudio();
            this.hasAudio = true;

        };
    }

    startAudio() {
        const ctx = SourceNode.audioCtx;
        if (this.isPlaying && this.playMode !== "pause") return;

        if (ctx.state === "suspended") {
            ctx.resume();
        }

        this.source = ctx.createBufferSource();
        this.source.buffer = this.audioBuffer;

        this.source.loop = this.loopEnabled;

        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = 0;

        this.source.connect(this.gainNode).connect(ctx.destination);

        const duration = this.audioBuffer.duration;

        let offset = 0;

        if (this.playMode === "pause") {
            offset = (this.pauseTime || 0) % duration;
        }

        if (this.playMode === "pause") {
            this.startTime = ctx.currentTime - (this.pauseTime || 0);
        } else {
            this.pauseTime = 0;
            this.startTime = ctx.currentTime;
        }

        this.source.start(0, offset);
        this.isPlaying = true;
    }


    restartAudio() {
        if (!this.audioBuffer) return;

        const ctx = SourceNode.audioCtx;

        if (this.source) {
            try {
                this.stopAudioWithPause();
            } catch {}
        }

        this.source = ctx.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.loop = this.loopEnabled;

        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = 0;

        this.source.connect(this.gainNode).connect(ctx.destination);

        this.startTime = ctx.currentTime;
        this.offset = 0;

        this.source.start(0);
    }

    startAudioFrom(offset) {
        if (!this.audioBuffer) return;

        const ctx = SourceNode.audioCtx;

        this.source = ctx.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.loop = this.loopEnabled;

        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = 0;

        this.source.connect(this.gainNode).connect(ctx.destination);

        this.startTime = ctx.currentTime;
        this.offset = offset;

        this.source.start(0, offset);
    }


    createVisuals() {
        this.dot = L.circleMarker(this.latlng, {
            radius: 6,
            color: layerMarkerColors[currentWriteLayer] + "1)"
        }).addTo(this.map);

        this.circle = L.circle(this.latlng, {
            radius: this.radius,
            color: layerColors[currentWriteLayer] + "0.4)",
            fillColor: layerColors[currentWriteLayer] + "0.2)",
            fillOpacity: 1
        }).addTo(this.map);

        this.circleStyleDashed = false;

        this.controls = L.marker(this.latlng, {
            icon: L.divIcon({
                className: "node-controls",
                html: `
                    <div class="controls-row">
                        <div class="file-button missing-audio" title="Click to load an audio file"><img src="./assets/load.png" class="inline-icon"></div>
                        <div class="delete-button" title="Remove this sound node"><img src="./assets/delete.png" class="inline-icon"></div>
                        <div class="loop-button" title="Enable or disable looping playback"><img src="./assets/linear.png" class="inline-icon"></div>
                        <div class="preview-button" title="Play or stop preview sound"><img src="./assets/play.png" class="inline-icon"></div>
                    </div>
                    <div class="controls-row">
                        <div class="shape-button" title="Toggle circle / rectangle"><img src="./assets/rectangle.png" class="inline-icon"></div>
                        <div class="playmode-button" title="Playback mode (Restart, Pause, Single play)"><img src="./assets/restart.png" class="inline-icon"></div>
                        <div class="fade-button" title="Toggle fade (≈) / on-off (!)"><img src="./assets/binary.png" class="inline-icon"></div>
                        <div class="lock-button" title="Lock / unlock node"><img src="./assets/unlocked.png" class="inline-icon"></div>
                    </div>
                    <div class="controls-row">
                        <input class="volume-slider" type="range" min="0" max="1" step="0.01" value="1" />
                    </div>
                `,
                iconSize: [120, 40],
                iconAnchor: [60, 20]
            })
        }).addTo(this.map);

        this.bindControls();

        this.controls.on("add", () => {
            this.bindControls();
            this.updateShapeButton();
            this.updatePlayModeButton();
            this.updateFadeButton();
            this.updateFadeVisual();
            this.updateLockButton();
            this.updateLockState();
        });

       
        
        this.label = L.marker(this.latlng, {
            icon: L.divIcon({
                className: "node-label",
                html: "",
                iconSize: [180, 20]
            })
        }).addTo(this.map);

        // offset it slightly to the right
        this.updatePreviewPosition();

        // click handler 
        this.dot.on("click", (e) => {
            if (this._layerIndex !== currentWriteLayer) return;

            L.DomEvent.stopPropagation(e);

            SourceNode.allNodes.forEach(n => n.hideControls());
            this.showControls();
        });


        this.circle.on("click", (e) => {
            if (this._layerIndex !== currentWriteLayer) return;

            L.DomEvent.stopPropagation(e);

            SourceNode.allNodes.forEach(n => n.hideControls());
            this.showControls();
        });

        
        setTimeout(() => {
            this.updateLabel();
        }, 0);

    }

    togglePreview() {
        if (this.isPreviewPlaying) {
            this.stopPreview();
        } else {
            this.startPreview();
        }

        this.updatePreviewIcon();
    }

    updateLoopIcon() {
        const el = this.controls?.getElement();
        if (!el) return;

        const loopBtn = el.querySelector(".loop-button");
        if (!loopBtn) return;

        loopBtn.innerHTML = this.loopEnabled ? '<img src="./assets/loop.png" class="inline-icon">' : '<img src="./assets/linear.png" class="inline-icon">';

        if (this.loopEnabled) {
            loopBtn.classList.add("active");
        } else {
            loopBtn.classList.remove("active");
        }
    }

    updatePreviewPosition() {
        const lat = this.latlng.lat;
        const lng = this.latlng.lng;

        const offset = this.radius / (111320 * Math.cos(lat * Math.PI / 180));

        const labelPos = [
                lat + (this.radius / 111320), // vertical offset
                lng
            ];
        
        if (this.label) {
            this.label.setLatLng(labelPos);
        }

        if (this.label) {
            const point = this.map.latLngToLayerPoint(this.latlng);
            const labelPoint = L.point(point.x, point.y - 25);
            const labelPos = this.map.layerPointToLatLng(labelPoint);

            this.label.setLatLng(labelPos);
        }

        if (this.controls) {
            const point = this.map.latLngToLayerPoint(this.latlng);
            const controlPoint = L.point(point.x, point.y + 25);
            const controlPos = this.map.layerPointToLatLng(controlPoint);

            this.controls.setLatLng(controlPos);
        }

    }

    showPreview() {
        // hide all other preview buttons
        if (SourceNode.allNodes) {
            SourceNode.allNodes.forEach(n => {
                if (n.previewMarker) {
                    n.map.removeLayer(n.previewMarker);
                }
                if (n.deleteMarker) {
                    n.map.removeLayer(n.deleteMarker);
                }
                if (n.fileMarker) {
                    n.map.removeLayer(n.fileMarker);
                }
                if (n.loopMarker) {
                    n.map.removeLayer(n.loopMarker);
                }
            });
        }

        // update icons after it's in DOM
        this.updatePreviewIcon();
        this.updateLoopIcon();
    }

    // MOVE (drag the node)
    enableMove() {
        const map = this.map;

        let moving = false;

        const onMouseMove = (e) => {
            if (!moving) return;

            const dLat = e.latlng.lat - this.latlng.lat;
            const dLng = e.latlng.lng - this.latlng.lng;

            this.latlng = e.latlng;

            this.dot.setLatLng(e.latlng);
            this.circle.setLatLng(e.latlng);

            if (this.isRectangle && this.rectBounds && this.rect) {

                this.rectBounds.north += dLat;
                this.rectBounds.south += dLat;
                this.rectBounds.east += dLng;
                this.rectBounds.west += dLng;

                this.rect.setLatLngs(this.getRectangleCorners());
                if (this.rotationHandle) {
                    this.showRotationHandle();
                }

            }

            this.updatePreviewPosition();
        };

        const stopMove = (e) => {
            moving = false;

            map.dragging.enable();
            map.off("mousemove", onMouseMove);
            map.off("mouseup", stopMove);

            if (e) L.DomEvent.stopPropagation(e);
        };

        const startMove = (e) => {
            if (this._layerIndex !== currentWriteLayer) return;
            if (this.isLocked) return; 

            // prevent move if resizing
            if (window.isResizing) return;

            moving = true;

            map.dragging.disable();

            map.on("mousemove", onMouseMove);
            map.on("mouseup", stopMove);

            L.DomEvent.stopPropagation(e);
        };

        // Attach to both dot and circle center
        this.dot.on("mousedown", startMove);     

        this.circle.on("mousedown", (e) => {
            if (this._layerIndex !== currentWriteLayer) return
            const center = this.circle.getLatLng();
            const dist = center.distanceTo(e.latlng);
            const tol = 10;

            // Only allow move when clicking near center, not edge
            if (Math.abs(dist - this.radius) < tol) return;

            startMove(e);
        });

    }

    enableResize() {
        const map = this.map;

        const onMouseMove = (e) => {
            if (this.isLocked) return; 

            if (this.isRectangle && this.rectBounds && this.rect) {

                const lat = e.latlng.lat;
                const lng = e.latlng.lng;

                const dNorth = Math.abs(lat - this.rectBounds.north);
                const dSouth = Math.abs(lat - this.rectBounds.south);
                const dEast = Math.abs(lng - this.rectBounds.east);
                const dWest = Math.abs(lng - this.rectBounds.west);

                const min = Math.min(dNorth, dSouth, dEast, dWest);

                if (min === dNorth) this.rectBounds.north = lat;
                else if (min === dSouth) this.rectBounds.south = lat;
                else if (min === dEast) this.rectBounds.east = lng;
                else if (min === dWest) this.rectBounds.west = lng;

                this.rect.setLatLngs(this.getRectangleCorners());

                return;
            }
            const center = this.circle.getLatLng();
            let newRadius = center.distanceTo(e.latlng);

            newRadius = Math.max(5, newRadius);

            this.circle.setRadius(newRadius);
            this.radius = newRadius;

            this.updatePreviewPosition();
        };

        const stopResize = (e) => {
            window.isResizing = false;

            map.dragging.enable();
            map.off("mousemove", onMouseMove);
            map.off("mouseup", stopResize);

            if (e) L.DomEvent.stopPropagation(e);
        };

        this.circle.on("mousedown", (e) => {
            if (this.isRectangle && this.rectBounds) {

                const lat = e.latlng.lat;
                const lng = e.latlng.lng;

                const dNorth = Math.abs(lat - this.rectBounds.north);
                const dSouth = Math.abs(lat - this.rectBounds.south);
                const dEast = Math.abs(lng - this.rectBounds.east);
                const dWest = Math.abs(lng - this.rectBounds.west);

                const min = Math.min(dNorth, dSouth, dEast, dWest);
                const tol = 0.00005;

                if (min > tol) return;

            } else {
                const center = this.circle.getLatLng();
                const dist = center.distanceTo(e.latlng);
                const tol = 10;

                if (Math.abs(dist - this.radius) > tol) return;
            }

            window.isResizing = true;

            map.dragging.disable();
            map.on("mousemove", onMouseMove);
            map.on("mouseup", stopResize);

            L.DomEvent.stopPropagation(e);
        });

        this.circle.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
        });
    }

    // Sound preview
    startPreview() {
        if (!this.audioBuffer) return;

        if (!SourceNode.audioCtx) {
            SourceNode.audioCtx = new AudioContext();
        }

        const ctx = SourceNode.audioCtx;

        if (ctx.state === "suspended") {
            ctx.resume();
        }

        this.stopPreview();

        this.previewSource = ctx.createBufferSource();
        this.previewSource.buffer = this.audioBuffer;
        this.previewSource.loop = this.loopEnabled;

        this.previewGain = ctx.createGain();
        this.previewGain.gain.value = this.maxGain;

        this.previewSource.connect(this.previewGain).connect(ctx.destination);
        this.previewSource.start();

        this.isPreviewPlaying = true;
    }

    stopPreview() {
        if (this.previewSource) {
            try {
                this.previewSource.stop();
            } catch {}
            this.previewSource = null;
        }

        this.isPreviewPlaying = false;
    }

    updatePreviewIcon() {
        const el = this.controls?.getElement();
        if (!el) return;

        const previewBtn = el.querySelector(".preview-button");
        if (!previewBtn) return;

        previewBtn.innerHTML = this.isPreviewPlaying ? '<img src="./assets/stop.png" class="inline-icon">' : '<img src="./assets/play.png" class="inline-icon">';
    }

    updateLabel() {
        const el = this.label.getElement();
        if (!el) return;

        if (this.audioFileName) {
            el.innerHTML = this.audioFileName;
        } else {
            el.innerHTML = ""; // empty if no file
        }
    }


    showControls() {
        if (!this.map.hasLayer(this.controls)) {
            this.controls.addTo(this.map);
        }
    }

    hideControls() {
        if (this.map.hasLayer(this.controls)) {
            this.map.removeLayer(this.controls);
            this.removeRotationHandle();
        }
    }



    // remove node completely
    remove() {
        if (this.source) {
            try { this.stopAudioWithPause(); } catch {}
        }

        if (this.previewSource) {
            try { this.previewSource.stop(); } catch {}
        }

        this.previewSource = null;
        this.previewGain = null;
        this.isPreviewPlaying = false;

        [
            this.dot,
            this.circle,
            this.rect,
            this.controls,
            this.label,
            this.rotationHandle
        ].forEach(layer => {
            if (layer && this.map.hasLayer(layer)) {
                try { this.map.removeLayer(layer); } catch {}
            }
        });

        if (SourceNode.allNodes) {
            const i = SourceNode.allNodes.indexOf(this);
            if (i !== -1) SourceNode.allNodes.splice(i, 1);
        }

        if (typeof sourceNodes !== "undefined") {
            const i = sourceNodes.indexOf(this);
            if (i !== -1) sourceNodes.splice(i, 1);
        }

        if (this._layerIndex !== undefined &&
            typeof layers !== "undefined" &&
            layers[this._layerIndex] &&
            layers[this._layerIndex].nodes) {

            const arr = layers[this._layerIndex].nodes;
            const i = arr.indexOf(this);
            if (i !== -1) arr.splice(i, 1);
        }

        this.source = null;
        this.gainNode = null;
    }


    bindControls() {
        if (!this.controls) return;
        const el = this.controls.getElement();
        if (!el) return;

        const preview = el.querySelector(".preview-button");
        const del = el.querySelector(".delete-button");
        const file = el.querySelector(".file-button");
        const loop = el.querySelector(".loop-button");

        if (preview) {
            preview.onclick = (e) => {
                e.stopPropagation();
                this.togglePreview();
            };
        }

        if (del) {
            del.onclick = (e) => {
                e.stopPropagation();
                this.remove();
            };
        }

        if (file) {
            file.onclick = (e) => {
                e.stopPropagation();

                const input = document.createElement("input");
                input.type = "file";
                input.accept = "audio/*";

                input.onchange = async (event) => {
                    const fileObj = event.target.files[0];
                    if (!fileObj) return;

                    this.audioFileName = fileObj.name;
                    this.updateLabel();

                    const arrayBuffer = await fileObj.arrayBuffer();

                    if (!SourceNode.audioCtx) {
                        SourceNode.audioCtx = new AudioContext();
                    }


                    if (this.isPreviewPlaying) {
                        this.stopPreview();
                        const previewBtn = el.querySelector(".preview-button");
                        previewBtn.innerHTML = '<img src="./assets/play.png" class="inline-icon">';
                    }

                    if (this.source) {
                        try { this.stopAudioWithPause(); } catch {}
                    }

                    this.audioBuffer = await SourceNode.audioCtx.decodeAudioData(arrayBuffer);

                    this.startAudio();
                    this.hasAudio = true;
                    file.classList.remove("missing-audio");
                };

                input.click();
            };
        }

        if (loop) {
            loop.onclick = (e) => {
                e.stopPropagation();

                this.loopEnabled = !this.loopEnabled;

                if (this.previewSource) {
                    this.stopPreview(); 
                    this.startPreview();
                }

                if (this.source) {
                    this.restartAudio();
                }

                this.updateLoopIcon();
            };
        }

        if (this.hasAudio) {
            file.classList.remove("missing-audio");
        } else {
            file.classList.add("missing-audio");
        }

        const shape = el.querySelector(".shape-button");

        if (shape) {
            shape.onclick = (e) => {
                e.stopPropagation();
                this.toggleShape();
                const shape = el.querySelector(".shape-button");

                if (shape) {
                    shape.onclick = (e) => {
                        e.stopPropagation();
                        this.toggleShape();

                        this.updateShapeButton();
                    };
                }
            };
        }

        const modeBtn = el.querySelector(".playmode-button");

        if (modeBtn) {
            modeBtn.onclick = (e) => {
                e.stopPropagation();

                if (this.playMode === "restart") {
                    this.playMode = "pause";
                } else if (this.playMode === "pause") {
                    this.playMode = "single";
                } else {
                    this.playMode = "restart";
                }

                this.updatePlayModeButton();
            };
        }

        const fadeBtn = el.querySelector(".fade-button");

        if (fadeBtn) {
            fadeBtn.onclick = (e) => {
                e.stopPropagation();

                this.audioMode = this.audioMode === "fade" ? "binary" : "fade";

                this.updateFadeButton();
                this.updateFadeVisual();
            };
        }

        const lockBtn = el.querySelector(".lock-button");

        if (lockBtn) {
            lockBtn.onclick = (e) => {
                e.stopPropagation();

                this.isLocked = !this.isLocked;

                const btn = e.currentTarget;

                this.updateLockButton();
                this.updateLockState();
            };
        }

        const slider = el.querySelector(".volume-slider");

        if (slider) {
            slider.value = this.maxGain;

            L.DomEvent.disableClickPropagation(slider);
            L.DomEvent.disableScrollPropagation(slider);

            slider.oninput = (e) => {
                e.stopPropagation();

                this.maxGain = parseFloat(slider.value);

                if (this.isPreviewPlaying && this.previewGain) {
                    this.previewGain.gain.setTargetAtTime(
                        this.maxGain,
                        SourceNode.audioCtx.currentTime,
                        0.05
                    );
                }
            };
        }

        
        this.updateLoopIcon();
        this.updatePreviewIcon();
    }
    
    createRectangle() {
        const lat = this.latlng.lat;
        const lng = this.latlng.lng;

        const latOffset = this.radius / 111320;
        const lngOffset = this.radius / (111320 * Math.cos(lat * Math.PI / 180));

        this.rectBounds = {
            north: lat + latOffset,
            south: lat - latOffset,
            east: lng + lngOffset,
            west: lng - lngOffset
        };

        this.rect = L.polygon(this.getRectangleCorners(), {
            color: layerColors[currentWriteLayer] + "0.4)",
            fillColor: layerColors[currentWriteLayer] + "0.2)",
            fillOpacity: 1,
            dashArray: this.circleStyleDashed ? "4,4" : null
        }).addTo(this.map);

        this.rect.on("click", (e) => {
            L.DomEvent.stopPropagation(e);

            SourceNode.allNodes.forEach(n => n.hideControls());
            this.showControls();
            this.showRotationHandle();
        });

        this.rect.on("mousedown", (e) => {
            if (this.isLocked) return; 

            if (!this.rectBounds) return;

            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            const dNorth = Math.abs(lat - this.rectBounds.north);
            const dSouth = Math.abs(lat - this.rectBounds.south);
            const dEast = Math.abs(lng - this.rectBounds.east);
            const dWest = Math.abs(lng - this.rectBounds.west);

            const min = Math.min(dNorth, dSouth, dEast, dWest);
            const tol = 0.0001;

            if (min < tol) {
                window.isResizing = true;

                const onMouseMove = (ev) => {
                    // convert mouse into rectangle's local (unrotated) space
                    const local = this.toLocal(ev.latlng);

                    // current half size
                    let halfWidth  = (this.rectBounds.east - this.rectBounds.west) / 2;
                    let halfHeight = (this.rectBounds.north - this.rectBounds.south) / 2;

                    // choose dominant axis (same idea as before, but in rotated space)
                    if (Math.abs(local.y) > Math.abs(local.x)) {
                        halfHeight = Math.abs(local.y);
                    } else {
                        halfWidth = Math.abs(local.x);
                    }

                    // write back axis-aligned bounds (centered)
                    const centerLat = this.latlng.lat;
                    const centerLng = this.latlng.lng;

                    this.rectBounds.north = centerLat + halfHeight;
                    this.rectBounds.south = centerLat - halfHeight;
                    this.rectBounds.east  = centerLng + halfWidth;
                    this.rectBounds.west  = centerLng - halfWidth;

                    // redraw with rotation
                    this.rect.setLatLngs(this.getRectangleCorners());

                    // keep handle synced
                    if (this.rotationHandle) {
                        this.showRotationHandle();
                    }
                };

                const stop = () => {
                    window.isResizing = false;
                    this.map.dragging.enable();
                    this.map.off("mousemove", onMouseMove);
                    this.map.off("mouseup", stop);
                };

                this.map.dragging.disable();
                this.map.on("mousemove", onMouseMove);
                this.map.on("mouseup", stop);

            } else {
                this.dot.fire("mousedown", e);
            }

            L.DomEvent.stopPropagation(e);
        });

    }


    
    removeRectangle() {
        if (this.rect) {
            this.map.removeLayer(this.rect);
        }
    }


    toggleShape() {
        this.isRectangle = !this.isRectangle;

        if (this.isRectangle) {
            this.map.removeLayer(this.circle);

            if (!this.rect) {
                this.createRectangle();
            } else {
                this.rect.addTo(this.map);
            }

            this.showRotationHandle();

        } else {
            this.removeRectangle();
            this.circle.addTo(this.map);
            this.removeRotationHandle();
        }
        this.updateShapeButton();
    }

    updateShapeButton() {
        const el = this.controls?.getElement();
        if (!el) return;

        const shapeBtn = el.querySelector(".shape-button");
        if (!shapeBtn) return;

        shapeBtn.innerHTML = this.isRectangle ? '<img src="./assets/circle.png" class="inline-icon">' : '<img src="./assets/rectangle.png" class="inline-icon">';
    }

    updatePlayModeButton() {
        const el = this.controls?.getElement();
        if (!el) return;

        const btn = el.querySelector(".playmode-button");
        if (!btn) return;

        if (this.playMode === "restart") btn.innerHTML = '<img src="./assets/restart.png" class="inline-icon">';
        else if (this.playMode === "pause") btn.innerHTML = '<img src="./assets/pause.png" class="inline-icon">';
        else if (this.playMode === "single") btn.innerHTML = '<img src="./assets/single.png" class="inline-icon">';
    }

    updateFadeVisual() {
        const dashed = this.audioMode === "fade";

        if (this.circle) {
            this.circle.setStyle({
                dashArray: dashed ? "4,4" : null
            });
        }

        if (this.rect) {
            this.rect.setStyle({
                dashArray: dashed ? "4,4" : null
            });
        }
    }

    updateFadeButton() {
        const el = this.controls?.getElement();
        if (!el) return;

        const btn = el.querySelector(".fade-button");
        if (!btn) return;

        if (this.audioMode === "fade") {
            btn.innerHTML = '<img src="./assets/fade.png" class="inline-icon">';
            btn.classList.add("active");
        } else {
            btn.innerHTML = '<img src="./assets/binary.png" class="inline-icon">';
            btn.classList.remove("active");
        }
    }

    getRectangleCorners() {
        const { north, south, east, west } = this.rectBounds;

        const center = this.latlng;

        const corners = [
            [north, west],
            [north, east],
            [south, east],
            [south, west]
        ];

        if (this.rotation === 0) return corners;

        const angle = this.rotation;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        return corners.map(([lat, lng]) => {
            const cosLat = Math.cos(center.lat * Math.PI / 180);

            const dx = (lng - center.lng) * cosLat;
            const dy = (lat - center.lat);


            const rx = dx * cos - dy * sin;
            const ry = dx * sin + dy * cos;

            return [center.lat + ry, center.lng + (rx / cosLat)];

        });
    }

    toLocal(latlng) {
        const center = this.latlng;

        const dx = latlng.lng - center.lng;
        const dy = latlng.lat - center.lat;

        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);

        return {
            x: dx * cos - dy * sin,
            y: dx * sin + dy * cos
        };
    }

    fromLocal(x, y) {
        const center = this.latlng;

        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        return L.latLng(
            center.lat + (x * sin + y * cos),
            center.lng + (x * cos - y * sin)
        );
    }

    showRotationHandle() {
        if (!this.isRectangle || !this.rectBounds) return;

        const center = this.latlng;

        const corners = this.getRectangleCorners();

        const [lat, lng] = corners[1];  

        const handlePos = L.latLng(lat, lng);

        if (this.rotationHandle) {
            this.rotationHandle.setLatLng(handlePos);
            return;
        }

        this.rotationHandle = L.circleMarker(handlePos, {
            radius: 8,
            color: "rgba(75,75,75,0.9)",
            weight: 2,
            fillColor: "rgba(255,255,255,0.9)",
            fillOpacity: 1
        }).addTo(this.map);

        this.enableRotation();
    }

    enableRotation() {
        const map = this.map;

        let rotating = false;

        let startAngle = 0;
        let startRotation = 0;

        this.rotationHandle.on("mousedown", (e) => {
            if (this.isLocked) return; 
            
            rotating = true;
            map.dragging.disable();

            L.DomEvent.stop(e);

            const center = this.latlng;

            const dx = e.latlng.lng - center.lng;
            const dy = e.latlng.lat - center.lat;

            startAngle = Math.atan2(dy, dx);
            startRotation = this.rotation;

            map.on("mousemove", onMove);
            map.on("mouseup", stop);
        });

        const onMove = (e) => {
            if (!rotating) return;

            const center = this.latlng;

            const dx = e.latlng.lng - center.lng;
            const dy = e.latlng.lat - center.lat;

            if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) return;

            const currentAngle = Math.atan2(dy, dx);

            this.rotation = startRotation + (currentAngle - startAngle);

            this.rect.setLatLngs(this.getRectangleCorners());

            if (this.rotationHandle) {
                this.showRotationHandle();
            }
        };

        const stop = () => {
            rotating = false;
            map.dragging.enable();

            map.off("mousemove", onMove);
            map.off("mouseup", stop);
        };

    }

    updateLockButton() {
        const el = this.controls?.getElement();
        if (!el) return;

        const btn = el.querySelector(".lock-button");
        if (!btn) return;

        btn.innerHTML = this.isLocked ? '<img src="./assets/locked.png" class="inline-icon">' : '<img src="./assets/unlocked.png" class="inline-icon">';

        btn.classList.toggle("active", this.isLocked);
    }

    updateLockState() {
        const el = this.controls?.getElement();
        if (!el) return;

        const disable = this.isLocked;

        const buttons = el.querySelectorAll(
            ".file-button, .delete-button, .loop-button, .preview-button, .shape-button, .playmode-button, .fade-button"
        );

        buttons.forEach(b => {
            b.style.pointerEvents = disable ? "none" : "auto";
            b.style.opacity = disable ? "0.5" : "1";
        });

        const slider = el.querySelector(".volume-slider");
        if (slider) {
            slider.disabled = disable;
            slider.style.opacity = disable ? "0.5" : "1";
        }
    }

    removeRotationHandle() {
        if (this.rotationHandle) {
            this.map.removeLayer(this.rotationHandle);
            this.rotationHandle = null;
        }
    }

    getCurrentTime() {
        const ctx = SourceNode.audioCtx;
        return ctx.currentTime - this.startTime;
    }

    stopAudioWithPause() {
        if (!this.source) return;

        const ctx = SourceNode.audioCtx;

        try {
            this.pauseTime = ctx.currentTime - this.startTime;
            this.source.stop();
        } catch {}

        this.source = null;
        this.isPlaying = false;
    }
    
}

