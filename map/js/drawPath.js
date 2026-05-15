function startDrawingPath(map, onFinish) {
    let drawing = false;
    let latlngs = [];
    let line = null;

    map.getContainer().style.cursor = "crosshair";

    const onClick = (e) => {
        if (!drawing) {
            drawing = true;
            latlngs = [e.latlng];

            line = L.polyline(latlngs, {
                weight: 8,
                className: `path layer${currentWriteLayer + 1}`
            }).addTo(map);

        } else {
            latlngs.push(e.latlng);
            line.setLatLngs(latlngs);
        }
    };

    const onMove = (e) => {
        if (!drawing || !line) return;

        const preview = [...latlngs, e.latlng];
        line.setLatLngs(preview);
    };

    const stop = () => {
        drawing = false;

        map.off("click", onClick);
        map.off("mousemove", onMove);
        map.off("contextmenu", stop);

        map.getContainer().style.cursor = "";

        if (line) {
            line._layerIndex = currentWriteLayer;
            
            layers[currentWriteLayer].paths.push(line);
            
            line.on("click", (e) => {
                L.DomEvent.stopPropagation(e);
                showEditHandles(line);
            });

            line.on("dblclick", (e) => {
                L.DomEvent.stopPropagation(e);
                showDeletePopup(map, line, e.latlng);
            });
            allPaths.push(line);
        }

        enableViewpointCreation(map, line);

        if (onFinish) onFinish();
    };

    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.on("contextmenu", stop);

    return stop;
}

function showDeletePopup(map, line, latlng) {
    const container = L.DomUtil.create("div", "delete-popup");

    container.innerHTML = `
        <div class="delete-popup-content">
            <div class="title">Delete path?</div>
            <div class="buttons">
                <button class="cancel">Cancel</button>
                <button class="delete">Delete</button>
            </div>
        </div>
    `;

    const popup = L.popup({
        closeButton: false,
        autoClose: true,
        closeOnClick: false
    })
    .setLatLng(latlng)
    .setContent(container)
    .openOn(map);

    const cancelBtn = container.querySelector(".cancel");
    const deleteBtn = container.querySelector(".delete");

    cancelBtn.onclick = (e) => {
        L.DomEvent.stopPropagation(e);
        map.closePopup(popup);
    };

    deleteBtn.onclick = (e) => {
        L.DomEvent.stopPropagation(e);

        clearEditHandles(map);

        allPaths = allPaths.filter(l => l !== line);

        allViewpoints = allViewpoints.filter(marker => {
            if (marker._path === line) {
                map.removeLayer(marker);

                const arr = layers[marker._layerIndex].viewpoints;
                const i = arr.indexOf(marker);
                if (i !== -1) arr.splice(i, 1);

                return false;
            }
            return true;
        });

        const arr = layers[line._layerIndex].paths;
        const i = arr.indexOf(line);
        if (i !== -1) arr.splice(i, 1);

        map.removeLayer(line);
        map.closePopup(popup);
    };
}


function showDeleteViewpointPopup(map, marker, latlng) {

    const container = L.DomUtil.create("div", "delete-popup");

    container.innerHTML = `
        <div class="delete-popup-content">
            <div class="title">Delete viewpoint?</div>
            <div class="buttons">
                <button class="cancel">Cancel</button>
                <button class="delete">Delete</button>
            </div>
        </div>
    `;

    const popup = L.popup({
        closeButton: false,
        autoClose: true,
        closeOnClick: false
    })
    .setLatLng(latlng)
    .setContent(container)
    .openOn(map);

    const cancelBtn = container.querySelector(".cancel");
    const deleteBtn = container.querySelector(".delete");

    cancelBtn.onclick = (e) => {
        L.DomEvent.stopPropagation(e);
        map.closePopup(popup);
    };

    deleteBtn.onclick = (e) => {
        L.DomEvent.stopPropagation(e);

        map.removeLayer(marker);

        allViewpoints = allViewpoints.filter(m => m !== marker);

        const arr = layers[marker._layerIndex].viewpoints;
        const i = arr.indexOf(marker);
        if (i !== -1) arr.splice(i, 1);

        map.closePopup(popup);
    };
}