class SourceNode {
    constructor(map, latlng) {
        this.audioMode = "binary"; // default
        this.circleStyleDashed = false;

        this.map = map;
        this.latlng = latlng;
        this.radius = 25;

        this.isRectangle = false;
        this.rectBounds = null;

        this.hasAudio = false;
        this.maxGain = 1;

        this.isPreviewPlaying = false;
        this.loopEnabled = false

        this.playMode = "restart";
        this.hasPlayedOnce = false; 
        this.pauseTime = 0;


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

            this.audioBuffer = await SourceNode.audioCtx.decodeAudioData(arrayBuffer);

            this.startAudio();
            this.hasAudio = true;
        };
    }

    startAudio() {
        const ctx = SourceNode.audioCtx;

        if (ctx.state === "suspended") {
            ctx.resume();
        }

        this.source = ctx.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.loop = this.loopEnabled;

        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = 0; // start silent

        this.source.connect(this.gainNode).connect(ctx.destination);
        
        this.startTime = ctx.currentTime;
        this.offset = 0;

        this.source.start();
    }

    restartAudio() {
        if (!this.audioBuffer) return;

        const ctx = SourceNode.audioCtx;

        if (this.source) {
            try {
                this.source.stop();
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
            color: "rgba(155, 0, 0, 1)"
        }).addTo(this.map);

        this.circle = L.circle(this.latlng, {
            radius: this.radius,
            color: "rgba(255, 0, 0, 0.4)",
            fillColor: "rgba(255, 0, 0, 0.2)",
            fillOpacity: 1
        }).addTo(this.map);

        this.circleStyleDashed = false;

        this.controls = L.marker(this.latlng, {
            icon: L.divIcon({
                className: "node-controls",
                html: `
                    <div class="controls-row">
                        <div class="file-button missing-audio" title="Click to load an audio file">📁</div>
                        <div class="delete-button" title="Remove this sound node">🗑</div>
                        <div class="loop-button" title="Enable or disable looping playback">➡</div>
                        <div class="preview-button" title="Play or stop preview sound">▶</div>
                    </div>
                    <div class="controls-row">
                        <div class="shape-button" title="Toggle circle / rectangle">▭</div>
                        <div class="playmode-button" title="Playback mode (Restart, Pause, Single play)">R</div>
                        <div class="fade-button" title="Toggle fade (≈) / on-off (!)">!</div>
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
            L.DomEvent.stopPropagation(e);

            SourceNode.allNodes.forEach(n => n.hideControls());
            this.showControls();
        });

        this.circle.on("click", (e) => {
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

        loopBtn.innerHTML = this.loopEnabled ? "🔁" : "➡";

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

                this.rect.setBounds([
                    [this.rectBounds.south, this.rectBounds.west],
                    [this.rectBounds.north, this.rectBounds.east]
                ]);
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
            const center = this.circle.getLatLng();
            const dist = center.distanceTo(e.latlng);
            const tol = 10;

            // Only allow move when clicking near center, not edge
            if (Math.abs(dist - this.radius) < tol) return;

            startMove(e);
        });
    }

    // RESIZE (already had, now inside class)
    enableResize() {
        const map = this.map;

        const onMouseMove = (e) => {
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

                this.rect.setBounds([
                    [this.rectBounds.south, this.rectBounds.west],
                    [this.rectBounds.north, this.rectBounds.east]
                ]);

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

        previewBtn.innerHTML = this.isPreviewPlaying ? "⏹" : "▶";
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
        }
    }



    // REMOVE node completely
    remove() {
        [this.dot, this.circle, this.rect, this.controls, this.label].forEach(layer => {
            if (layer) this.map.removeLayer(layer);
        });

        if (this.source) {
            this.source.stop();
        }

        if (this.onRemove) {
            this.onRemove(this);
        }
    }

    bindControls() {
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

                    this.audioBuffer =
                        await SourceNode.audioCtx.decodeAudioData(arrayBuffer);

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
                    this.stopPreview();      // ❗ stop looping immediately
                    this.startPreview();     // restart with new loop state
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

        this.rect = L.rectangle(
            [
                [this.rectBounds.south, this.rectBounds.west],
                [this.rectBounds.north, this.rectBounds.east]
            ],
            {
                color: "rgba(255, 0, 0, 0.4)",
                fillColor: "rgba(255, 0, 0, 0.2)",
                fillOpacity: 1,
                dashArray: this.circleStyleDashed ? "4,4" : null
            }
        ).addTo(this.map);

        this.rect.on("click", (e) => {
            L.DomEvent.stopPropagation(e);

            SourceNode.allNodes.forEach(n => n.hideControls());
            this.showControls();
        });

        this.rect.on("mousedown", (e) => {
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
                    const lat = ev.latlng.lat;
                    const lng = ev.latlng.lng;

                    const dNorth = Math.abs(lat - this.rectBounds.north);
                    const dSouth = Math.abs(lat - this.rectBounds.south);
                    const dEast = Math.abs(lng - this.rectBounds.east);
                    const dWest = Math.abs(lng - this.rectBounds.west);

                    const min = Math.min(dNorth, dSouth, dEast, dWest);

                    const centerLat = this.latlng.lat;
                    const centerLng = this.latlng.lng;

                    if (min === dNorth || min === dSouth) {
                        const newHalfHeight = Math.abs(lat - centerLat);

                        this.rectBounds.north = centerLat + newHalfHeight;
                        this.rectBounds.south = centerLat - newHalfHeight;

                    } else if (min === dEast || min === dWest) {
                        const newHalfWidth = Math.abs(lng - centerLng);

                        this.rectBounds.east = centerLng + newHalfWidth;
                        this.rectBounds.west = centerLng - newHalfWidth;
                    }

                    this.rect.setBounds([
                        [this.rectBounds.south, this.rectBounds.west],
                        [this.rectBounds.north, this.rectBounds.east]
                    ]);
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

        } else {
            this.removeRectangle();
            this.circle.addTo(this.map);
        }
        this.updateShapeButton();
    }

    updateShapeButton() {
        const el = this.controls?.getElement();
        if (!el) return;

        const shapeBtn = el.querySelector(".shape-button");
        if (!shapeBtn) return;

        shapeBtn.innerHTML = this.isRectangle ? "◯" : "▭";
    }

    updatePlayModeButton() {
        const el = this.controls?.getElement();
        if (!el) return;

        const btn = el.querySelector(".playmode-button");
        if (!btn) return;

        if (this.playMode === "restart") btn.innerHTML = "R";
        else if (this.playMode === "pause") btn.innerHTML = "P";
        else if (this.playMode === "single") btn.innerHTML = "1";
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
            btn.innerHTML = "≈";
            btn.classList.add("active");
        } else {
            btn.innerHTML = "!";
            btn.classList.remove("active");
        }
    }

}