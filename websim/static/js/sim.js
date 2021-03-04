import * as pc from './playcanvas.js'
import * as pcx from './extras/index.js'
import {earcut} from './earcut.js';

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
    // app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    let miniStats = new pcx.MiniStats(app);

    // ensure canvas is resized when window changes size
    window.addEventListener('resize', () => app.resizeCanvas());

    const gesims = new pc.Entity("gesims");
    app.root.addChild(gesims);
    gesims.translate(0, 0, 0);

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
    const light = new pc.Entity('globalLight');
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

export function reset() {
    // Recreate the scene root from the app
    const gesims = app.root.findByName("gesims");
    let scene_root = gesims.findByName("scene_root");
    if (scene_root !== undefined) {
        gesims.removeChild(scene_root);
    }
    scene_root = new pc.Entity("scene_root")
    gesims.addChild(scene_root);

    // Reset all the bulbs
    bulbs = [];
    // Reset the frame data to mid values
    active_frame_data = new Array(512).fill(0.5);
}

export function loadSign(sign_name) {
    // Reset the scene first
    reset();

    const base_url = "api/signs/"+sign_name+"/";
    const scene_root = app.root.findByName("scene_root");


    fetch(base_url+"scene.json")
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
                scene_root.addChild(sign_bg);
                

                app.loader.load(base_url+"assets/"+data.background.texture, "texture", function(err, texture){
                    let material = new pc.StandardMaterial();
                    material.diffuseMap = texture;
                    material.opacityMap = texture;
                    material.blendType = pc.BLEND_NORMAL;
                    material.update();
            
                    sign_bg.model.material = material;
                });
            
            }
            
            const camera = app.root.findByName("camera");
            const globalLight = app.root.findByName("globalLight");
            for (const [group_index, j_group] of data['groups'].entries()) {
                const group = new pc.Entity("group_"+group_index);
                group.translate(j_group.pos[0], j_group.pos[1], 0.01);

                const group_layer = new pc.Layer({name: "group_"+group_index})
                app.scene.layers.pushOpaque(group_layer);
                camera.camera.layers = camera.camera.layers.concat([group_layer.id]);
                // camera.camera.update();

                // Handle aluminium if any
                if (j_group.alu !== undefined) {
                    const j_alu = j_group.alu;

                    // Flatten all the vertices
                    // then run earcut to triangulate the polygon
                    const vertices_2d = [];
                    for (const p of j_alu.outline) {
                        vertices_2d.push(p[0], p[1])
                    }
                    const holes_index_ranges = [];
                    for (const hole of j_alu.holes) {
                        const start = vertices_2d.length/2;
                        for (const p of hole) {
                            vertices_2d.push(p[0], p[1])
                        }
                        holes_index_ranges.push(start);
                    }    
                    
                    const indices = earcut(vertices_2d, holes_index_ranges, 2);

                    // Convert to 2d vertices (not sure if needed)
                    const vertices = [];
                    const vertex_count = vertices_2d.length/2;
                    for (let i = 0; i <= vertices_2d.length; i+=2) {
                        vertices.push(vertices_2d[i], vertices_2d[i+1], 0.0);
                    }
                    
                    const normals = [];
                    for (let i = 0; i <= vertices.length/3; i++) {
                        normals.push(0.0, 0.0, 1.0);
                    }

                    const colors = [];
                    for (let i = 0; i <= vertices.length/3; i++) {
                        colors.push(1.0, 1.0, 1.0, 0.0); // rgba
                        // 
                    }

                    // Create the outline ALU perimeter
                    let alu_points = j_alu.outline;
                    for (let i = 0; i < alu_points.length; i++) {
                        // We need the previous, current and next vertex in the polygon to generate the normals 
                        const is_last = i == (alu_points.length - 1);
                        const p_cur = alu_points[i];
                        const p_next = is_last ? alu_points[0] : alu_points[i+1];

                        // Create the a two triangles (ct = current top, cb = current bottom, nt = next top, nb = next bottom)
                        // cb ---- nb
                        // |      / |
                        // |    /   |
                        // |  /     |
                        // | /      |
                        // ct ---- nt
                        
                        const index_start = vertices.length/3;
                        vertices.push(p_cur[0], p_cur[1], 0); // cb
                        vertices.push(p_cur[0], p_cur[1], 0.15); // ct
                        vertices.push(p_next[0], p_next[1], 0); // nb
                        vertices.push(p_next[0], p_next[1], 0.15); // nt

                        // Push the color for the two vertices we created
                        colors.push(0.955, 0.960, 0.915, 0.0); // silver
                        colors.push(0.955, 0.960, 0.915, 0.0); // silver
                        colors.push(0.955, 0.960, 0.915, 0.0); // silver
                        colors.push(0.955, 0.960, 0.915, 0.0); // silver

                        // Calculate the normals
                        const dx = p_next[0] - p_cur[0]
                        const dy = p_next[1] - p_cur[1]
                        const dxy_len = Math.sqrt(dx*dx + dy*dy);
                        const norm_x = dx/dxy_len;
                        const norm_y = dy/dxy_len;
                        // normals.push(-norm_y, norm_x, 0.0);
                        // normals.push(-norm_y, norm_x, 0.0);
                        // normals.push(-norm_y, norm_x, 0.0);
                        // normals.push(-norm_y, norm_x, 0.0);
                        // normals.push(norm_y, -norm_x, 0.0);
                        // normals.push(norm_y, -norm_x, 0.0);
                        // normals.push(norm_y, -norm_x, 0.0);
                        // normals.push(norm_y, -norm_x, 0.0);
                        normals.push(0.0, 0.0, 1.0)
                        normals.push(0.0, 0.0, 1.0)
                        normals.push(0.0, 0.0, 1.0)
                        normals.push(0.0, 0.0, 1.0)
                        

                        const ct = index_start;
                        const cb = index_start + 1;
                        const nt = index_start + 2;
                        const nb = index_start + 3;

                        indices.push(cb, nb, ct);
                        indices.push(ct, nb, nt);
                    }

                    // Create a new mesh
                    const mesh = new pc.Mesh(app.graphicsDevice);
                    mesh.setPositions(vertices); // only x and y positions
                    mesh.setIndices(indices);
                    mesh.setColors(colors);
                    mesh.setNormals(normals);
                    mesh.update();

                    // Create the material
                    // const material = new pc.BasicMaterial();
                    const material = new pc.StandardMaterial();
                    material.diffuseVertexColor = true;
                    material.glossVertexColor = true;
                    material.glossVertexColorChannel = 'a';
                    material.metalnessVertexColor = true;
                    material.metalnessVertexColorChannel = 'a';
                    material.update();
                    
                    // Create the mesh instance
                    var node = new pc.GraphNode();
                    const meshInstance = new pc.MeshInstance(mesh, material, node);

                    // Create a model and add the mesh instance to it
                    var model = new pc.Model();
                    model.graph = node;
                    model.meshInstances = [meshInstance];

                    // Create the entity
                    const alu_entity = new pc.Entity("alu_"+group_index);
                    alu_entity.addComponent('model', {
                        type: 'asset',
                        layers: [group_layer.id]
                    });
                    alu_entity.model.model = model;


                    group.addChild(alu_entity);
                }

                // Handle bulbs
                for(const j_bulb of j_group["bulbs"]) {
                    const bulb_id = j_bulb[0];
                    const bulb_pos = [j_bulb[1], j_bulb[2]];
                    const bulb_channels = j_bulb.slice(3);
                    const bulb = new pc.Entity("bulb_"+bulb_id);
                    group.addChild(bulb);
                    bulbs.push(bulb);

                    bulb.addComponent('model', {
                        type: 'sphere',
                    });
                    bulb.setLocalScale(0.05, 0.05, 0.05); // scale to 5cm diameter
                    bulb.translate(bulb_pos[0], bulb_pos[1], 0.07);

                    bulb.model.material = new pc.BasicMaterial();
                    bulb.model.material.color.set(0.2, 0.2, 0.2);
                    bulb.model.material.update();

                    bulb.addComponent('light', {
                        type: "point",
                        color: new pc.Color(0.1, 0.1, 0.1),
                        intensity: 1.0,
                        range: 0.4,
                        layers: [group_layer.id]
                    });
                    globalLight.light.layers = globalLight.light.layers.concat(group_layer.id)

                    bulb.channels = bulb_channels;
                }

                scene_root.addChild(group);
            }
        });
}

export function pushFrame(frame_data) {
    active_frame_data = frame_data;
}