import * as pc from './playcanvas.js'
import * as pcx from './extras/index.js'

let app = null; // pc.Application
let bulbs = []; // map of bulb ID to bulb node
let active_frame_data = new Array(512).fill(0.5);

export function init(canvas) {
    app = new pc.Application(canvas, {
        mouse: new pc.Mouse(canvas),
        keyboard: new pc.Keyboard(window)
    });
    globalThis.pc = pc; // export pc such that scripts work. Not sure if this is the best way

    // fill the available space at full resolution
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    let miniStats = new pcx.MiniStats(app);

    // ensure canvas is resized when window changes size
    window.addEventListener('resize', () => app.resizeCanvas());

    const gesims = new pc.Entity("gesism");
    app.root.addChild(gesims);
    gesims.translate(0, 0, 0);

    fetch("static/uka17.json")
        .then(response => response.json())
        .then(data => {
            // create box entity
            if (data.background !== undefined) {
                const sign_bg = new pc.Entity('sign_bg');
                sign_bg.addComponent('model', {
                    type: 'plane'
                });
                sign_bg.rotate(90, 0, 0);
                sign_bg.setLocalScale(data.background.size[0], 1, data.background.size[1]);
                sign_bg.translate(0, data.background.size[1]/2, 0);
                gesims.addChild(sign_bg);
                

                app.loader.load("static/textures/sign_bg.png", "texture", function(err, texture){
                    let material = new pc.StandardMaterial();
                    material.diffuseMap = texture;
                    material.opacityMap = texture;
                    material.blendType = pc.BLEND_NORMAL;
                    material.update();
            
                    sign_bg.model.material = material;
                });
            
            }
            

            for (const [group_index, j_group] of data['groups'].entries()) {
                const group = new pc.Entity("group_"+group_index);
                group.translate(j_group.pos[0], j_group.pos[1], 0.01);

                for(const j_bulb of j_group["bulbs"]) {
                    const bulb_id = j_bulb[0];
                    const bulb_pos = [j_bulb[1], j_bulb[2]];
                    const bulb_channels = j_bulb.slice(3);
                    const bulb = new pc.Entity("bulb_"+bulb_id);
                    group.addChild(bulb);
                    bulbs.push(bulb);

                    bulb.addComponent('model', {
                        type: 'sphere'
                    });
                    bulb.setLocalScale(0.05, 0.05, 0.05); // scale to 5cm diameter
                    bulb.translate(bulb_pos[0], bulb_pos[1], 0.03);

                    bulb.model.material = new pc.BasicMaterial();
                    bulb.model.material.color.set(0.2, 0.2, 0.2);
                    bulb.model.material.update();

                    bulb.addComponent('light', {
                        type: "point",
                        color: new pc.Color(0.1, 0.1, 0.1),
                        intensity: 1,
                        range: 0.4
                    });
                    
                    bulb.channels = bulb_channels;
                }

                gesims.addChild(group);
            }
        });

    

    // create camera entity
    const camera = new pc.Entity('camera');
    camera.addComponent('camera', {
        clearColor: new pc.Color(0.1, 0.1, 0.1)
    });
    app.root.addChild(camera);
    camera.setPosition(0, 0, 7);

    // add the fly camera script to the camera
    app.assets.loadFromUrl('static/js/fly-camera.js', 'script', function (err, asset) {
        camera.addComponent("script");
        camera.script.create("flyCamera");
    });


    // create directional light entity
    const light = new pc.Entity('light');
    light.addComponent('light', {
        intensity: 0.3,
    });
    app.root.addChild(light);
    light.setEulerAngles(45, 0, 0);

    app.on('update', dt => {
        for (const bulb of bulbs) {
            // channels are 1 indexed, but data is zero indexed
            const r = active_frame_data[bulb.channels[0]-1]; 
            const g = active_frame_data[bulb.channels[1]-1];
            const b = active_frame_data[bulb.channels[2]-1];
            if (r === undefined || g === undefined || b === undefined) {
                alert("could not find frame data for bulb");
            }
            // TODO improve the algorithm below
            // We do not want the bulbs to become completely black
            // as the bulbs themselves are white.
            bulb.model.material.color.set(0.2+r, 0.2+g, 0.2+b);
            bulb.model.material.update()
            bulb.light.color = new pc.Color(r, g, b);
        }
    });

    app.start();
}

export function pushFrame(frame_data) {
    active_frame_data = frame_data;
}