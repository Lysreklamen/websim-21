import * as pc from './playcanvas.js'
import * as pcx from './extras/index.js'

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: r,
        g: g,
        b: b
    };
}

export function init(canvas) {
    const app = new pc.Application(canvas, {
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

    let all_bulbs = [];


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
                    const bulb = new pc.Entity("bulb_"+bulb_id);
                    group.addChild(bulb);
                    all_bulbs.push(bulb);
                    bulb.translate(bulb_pos[0], bulb_pos[1], 0.05);

                    bulb.addComponent('model', {
                        type: 'sphere'
                    });
                    bulb.model.material = new pc.StandardMaterial();
                    bulb.model.material.diffuse.set(0.4, 0.4, 0.4);
                    bulb.model.material.emissive.set(1, 0, 0)
                    bulb.model.material.emissiveIntensity = 0.8;
                    bulb.model.material.update();
                    bulb.setLocalScale(0.05, 0.05, 0.05); // scale to 5cm diameter

                    // let bulb_light = new pc.Entity();
                    bulb.addComponent('light', {
                        type: "point",
                        color: new pc.Color(1, 0, 0),
                        intensity: 0.5,
                        range: 0.5
                    });
                    // bulb.addChild(bulb_light);
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
    light.addComponent('light');
    app.root.addChild(light);
    light.setEulerAngles(45, 0, 0);

    // rotate the box according to the delta time since the last frame
    // app.on('update', dt => box.rotate(10 * dt, 20 * dt, 30 * dt));
    let total_time = 0.0;
    app.on('update', dt => {
        total_time += dt*0.1;
        let c = HSVtoRGB(total_time, 1.0, 1.0);
        for (const b of all_bulbs) {
            b.model.material.diffuse.set(c.r, c.g, c.b);
            b.model.material.emissive.set(c.r, c.g, c.b);
            b.model.material.update()
            b.light.color = new pc.Color(c.r, c.g, c.b);
            // const light = b.children[0];
            // light.light.color = ;
            // console.log(light);
        }
    });

    app.start();
}