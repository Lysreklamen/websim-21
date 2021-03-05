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

function create_plane_from_polygon(node, outline, holes) {
    // Flatten all the vertices
    // then run earcut to triangulate the polygon
    const vertices_2d = [];
    for (const p of outline) {
        vertices_2d.push(p[0], p[1])
    }
    const holes_index_ranges = [];
    for (const hole of holes) {
        const start = vertices_2d.length/2;
        for (const p of hole) {
            vertices_2d.push(p[0], p[1])
        }
        holes_index_ranges.push(start);
    }    
    
    const indices = earcut(vertices_2d, holes_index_ranges, 2);

    // Convert to 2d vertices (not sure if needed)
    const vertices = [];
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
    }

    // Create a new mesh
    const mesh = new pc.Mesh(app.graphicsDevice);
    mesh.setPositions(vertices);
    mesh.setIndices(indices);
    mesh.setNormals(normals);
    mesh.update();

    // Create the material
    // const material = new pc.BasicMaterial();
    const material = new pc.StandardMaterial();
    material.diffuse.set(1.0, 1.0, 1.0)
    material.update();
    
    return new pc.MeshInstance(mesh, material, node);
}

function setVector(buffer, index, x, y, z) {
    buffer[index+0] = x;
    buffer[index+1] = y;
    buffer[index+2] = z;
}

function setTriangle(buffer, baseIndex, triangles, reversed) {
    for (let i = 0; i < 3; i++) {
        buffer[baseIndex + i] = triangles[reversed ? 2 - i : i];
    }
}

function getVector(buffer, baseIndex) {
    return {
        x: buffer[baseIndex + 0], 
        y: buffer[baseIndex + 1], 
        z: buffer[baseIndex + 2]
    };
}

function crossProduct(a, b) {
    return {
        x: a.y * b.z - a.z * b.y, 
        y: a.z * b.x - a.x * b.z, 
        z: a.x * b.y - a.y * b.x 
    }
}

function getNormal(buffer, a, b, c) {
    const va = getVector(buffer, a * 3)
    const vb = getVector(buffer, b * 3)
    const vc = getVector(buffer, c * 3)
    const leftSide = {x: vb.x - va.x, y: vb.y-va.y, z: vb.z-va.z};
    const rightSide = {x: vc.x - vb.x, y: vc.y-vb.y, z: vc.z-vb.z};

    // Cross product
    const cross = crossProduct(leftSide, rightSide);
    
    // Normalize the vector to have a magnitude of 1
    const magnitude = Math.sqrt(cross.x*cross.x + cross.y*cross.y + cross.z*cross.z);
    return {
        x: cross.x/magnitude, 
        y: cross.y/magnitude, 
        z: cross.z/magnitude
    }
}

function create_alu_from_polygon(node, perimeter) {
    // Each perimeter entry creates four triangles (one quad facing in and one quad facing out),
    // each with three vertices. Sadly, the vertices mostly cannot be shared between adjacent quads because
    // the normal vectors are tied to the vertices. However, we do share vertices between the two
    // triangles that make up a quad. Thus, two quads with four vertices each and three vector components per vertex
    // make a total of 2 * 4 * 3 = 24 vector components per quad pair. The two quads contain two triangles each,
    // which each need three indices for a total of 12 indices per quad pair. Each of the 8 vertices needs
    // a normal vector, also with three components for a total of 24 per quad pair.


    const quadCount = perimeter.length;
    const vertexBuffer = new Float32Array(quadCount * 24);
    const indexBuffer = new Int32Array(quadCount * 12);
    const normalBuffer = new Float32Array(quadCount * 24);

    for (let i = 0; i < quadCount; i++) {
        const ni = (i + 1) % perimeter.length;
        const currentPoint = {x: perimeter[i][0], y: perimeter[i][1]};
        const nextPoint = {x: perimeter[ni][0], y: perimeter[ni][1]};
        for (let j = 0; j < 2; j++) {
            // First iteration is the front face, second iteration is the back face
            // Vertices
            const vertexBase = i * 24 + j * 12 // 12 vector components per face
            setVector(vertexBuffer, vertexBase + 0, currentPoint.x, currentPoint.y, 0.0)     // Current inner perimeter vertex (close to wall)
            setVector(vertexBuffer, vertexBase + 3, currentPoint.x, currentPoint.y, 0.15) // Current outer perimeter vertex (out from wall)
            setVector(vertexBuffer, vertexBase + 6, nextPoint.x, nextPoint.y, 0.0)           // Next inner perimeter vertex
            setVector(vertexBuffer, vertexBase + 9, nextPoint.x, nextPoint.y, 0.15)       // Next outer perimeter vertex

            // Indices of the triangle corners, referencing the vertices
            const vertexIndexBase = vertexBase / 3 // Each vertex consists of 3 components
            const indexBase = vertexBase / 2 // 6 indices per face
            const currentInner = vertexIndexBase + 0 // Index of current inner perimeter vertex
            const currentOuter = vertexIndexBase + 1 // Index of current outer perimeter vertex
            const nextInner = vertexIndexBase + 2    // Index of next inner perimeter vertex
            const nextOuter = vertexIndexBase + 3    // Index of next outer perimeter vertex
            const reversed = j == 1
            setTriangle(indexBuffer, indexBase + 0, [currentInner, currentOuter, nextOuter], reversed)
            setTriangle(indexBuffer, indexBase + 3, [currentInner, nextOuter, nextInner], reversed)

            // Normal vectors
            let normal = getNormal(vertexBuffer, currentInner, currentOuter, nextOuter)
            if (reversed) {
                normal = {
                    x: -normal.x,
                    y: -normal.y,
                    z: -normal.z
                }
            }
            for (let k = 0; k < 4; k++) {
                setVector(normalBuffer, vertexBase + k * 3, normal.x, normal.y, normal.z)
            }
        }
    }


    // Create a new mesh
    const mesh = new pc.Mesh(app.graphicsDevice);
    mesh.setPositions(vertexBuffer);
    mesh.setIndices(indexBuffer);
    mesh.setNormals(normalBuffer);
    mesh.update();

    // Create the material
    // const material = new pc.BasicMaterial();
    const material = new pc.StandardMaterial();
    material.diffuse.set(0.972, 0.960, 0.915) 
    // material.emissive.set(0.1, 0.1, 0.1); 
    material.metalness = 1
    material.update();
    
    return new pc.MeshInstance(mesh, material, node);
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

                    // Create the meshes for alu and back plate
                    const node = new pc.GraphNode();

                    const meshes = [create_plane_from_polygon(node, j_alu.outline, j_alu.holes)];
                    meshes.push(create_alu_from_polygon(node, j_alu.outline));
                    for (const hole of j_alu.holes) {
                        meshes.push(create_alu_from_polygon(node, hole));
                    }

                    // Create a model and add the mesh instance to it
                    var model = new pc.Model();
                    model.graph = node;
                    model.meshInstances = meshes;

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