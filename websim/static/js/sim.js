import * as pc from './playcanvas.js'

export function init(canvas) {
    const app = new pc.Application(canvas);

    // fill the available space at full resolution
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

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
                    bulb.translate(bulb_pos[0], bulb_pos[1], 0.05);

                    bulb.addComponent('model', {
                        type: 'sphere'
                    });
                    bulb.model.material = new pc.StandardMaterial();
                    bulb.model.material.diffuse.set(0.4, 0.4, 0.4);
                    bulb.model.material.emissive.set(1, 0, 0)
                    bulb.model.material.emissiveIntensity = 0.5;
                    bulb.model.material.update();
                    bulb.setLocalScale(0.05, 0.05, 0.05); // scale to 5cm diameter

                    let bulb_light = new pc.Entity();
                    bulb_light.addComponent('light', {
                        type: "point",
                        color: new pc.Color(1, 0, 0),
                        intensity: 0.5,
                        range: 0.5
                    });
                    bulb.addChild(bulb_light);
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

    // create directional light entity
    const light = new pc.Entity('light');
    light.addComponent('light');
    app.root.addChild(light);
    light.setEulerAngles(45, 0, 0);

    // rotate the box according to the delta time since the last frame
    // app.on('update', dt => box.rotate(10 * dt, 20 * dt, 30 * dt));

    app.start();
}