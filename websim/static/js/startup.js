import { init, loadSign, pushFrame } from './sim.js';
import { PlayPGM } from './pgm.js';

function addChannelClickListener(element, ...channels) {
    element.addEventListener("click", event => {
        event.preventDefault();
        const frame = new Array(512).fill(0);
        for (const channel of channels) {
            // Channels are 1-indexed, but the frame is 0-indexed
            frame[channel - 1] = 1;
        }
        pushFrame(frame);
    });
}

// Main entrypoint. The element ids reference elements in templates/simulator.html.
export function startup() {
    const url = new URL(window.location.href)
    const sign_name = url.searchParams.get("sign");
    if (sign_name == null) {
        alert("Sign name not provided!")
        return;
    }
    const api_base = "api/signs/" + sign_name;

    // create a PlayCanvas application
    const canvas = document.getElementById('application');
    init(canvas);

    const bulbsTableBody = document.getElementById("bulbs");
    const bulbCallback = function(bulb) {
        const row = htmlToElement(`<tr></tr>`);
        const bulbCell = htmlToElement(`<th>${bulb.id}</th>`);
        const redCell = htmlToElement(`<td>${bulb.redChannel}</td>`);
        const greenCell = htmlToElement(`<td>${bulb.greenChannel}</td>`);
        const blueCell = htmlToElement(`<td>${bulb.blueChannel}</td>`);
        addChannelClickListener(bulbCell, bulb.redChannel, bulb.greenChannel, bulb.blueChannel);
        addChannelClickListener(redCell, bulb.redChannel);
        addChannelClickListener(greenCell, bulb.greenChannel);
        addChannelClickListener(blueCell, bulb.blueChannel);
        row.appendChild(bulbCell);
        row.appendChild(redCell);
        row.appendChild(greenCell);
        row.appendChild(blueCell);
        bulbsTableBody.appendChild(row);
    };
    loadSign(api_base, bulbCallback);

    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    fetch(api_base + "/pgms.json").then(response => response.json()).then(data => {
        const elem_sequences = document.getElementById("pgm-sequences");
        elem_sequences.innerHTML = "";

        for (const pgm_path of data) {
            const elem = htmlToElement(`<button type="button" class="btn btn-outline-secondary pgm-button">${pgm_path}</button>`);
            elem.addEventListener('click', event => {
                event.preventDefault();
                PlayPGM(api_base + "/pgms/" + pgm_path, pushFrame);
            });
            elem_sequences.appendChild(elem);
        }

    });
};
