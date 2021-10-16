var container;
var camera, scene, renderer, controls;
var composer, renderPass;

const PRINT_RESOULUTION = 360;

var opt = {
    newColors: false,
    newPoints: true,
    color0: '#83A300',
    color1: '#E21B5A',
    noise: 0.05,
    pointsCount: 3,
    newPointNumber: false,
    getNoise: function (resolution = 72) {
        return opt.noise/72*resolution;
    },
    update: function(avoidChange = false) {
        draw(avoidChange);
        render();
    },
    invertColors: function() {
        let temp = opt.color0;
        opt.color0 = opt.color1;
        opt.color1 = temp;

        let oldValue = opt.newColors;
        opt.newColors = false;
        opt.update();
        opt.newColors = oldValue;
    },
    thumbSize: 500,
    printSize: 4252,
    save: function() {
        UI.save(opt.printSize, opt.printSize);
    },
    points: [[0,0,0,0,0,0],[12.5,-12.5,5.5,-12.5,18,0],[30.5,12.5,-18.5,12.5,-6,25],[6.5,37.5,-29.5,37.5,-17,50]]
};

init();
draw();
render();
//animate();

var customPass;
function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(opt.thumbSize, opt.thumbSize);

    container = document.getElementById('container');
    if (container.lastChild) {
        container.removeChild(container.lastChild);
    }
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    
    camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 2000);
    camera.position.set(0, -15, 100);
    
    scene.add(camera);

    //var axesHelper = new THREE.AxesHelper(10);
    //scene.add(axesHelper);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.update();

    composer = new THREE.EffectComposer(renderer);
    renderPass = new THREE.RenderPass(scene, camera,'', { antialias: true });
    composer.addPass(renderPass);

    //custom shader pass
    var vertShader = document.getElementById('vertexShader').textContent;
    var fragShader = document.getElementById('fragmentShader').textContent;

    var counter = 10;
    var myEffect = {
        uniforms: {
            "tDiffuse": { value: null },
            "amount": { value: 0},
            "amount1": { value: 10}
        },
        vertexShader: vertShader,
        fragmentShader: fragShader
    }

    customPass = new THREE.ShaderPass(myEffect);
    customPass.renderToScreen = true;
    composer.addPass(customPass);

    //var highres = new Highres(composer.renderer, scene, camera)
    //highres.enable();
}

function random(min, max) {
    return THREE.Math.randInt(min, max)
}

var light1, light2, points = [];

function getNewPoints(w, h) {
    let points = [];
    let nPoints = (opt.newPointNumber ? random(1, 10) : opt.pointsCount) ;
    let step = h / nPoints;

    points.push([0, 0, 0, 0, 0, 0]);

    let i = 1;
    for (let ys = 0; ys <= h; ys += step) {
        let x=0+random(-step/1.5, step*1.2)
        let y=ys

        let x1=points[i-1][4]+step/2
        let y1=y-step/2

        let x2=x-step/2
        let y2=y-step/2

        points.push([x1, y1, x2, y2, x, y]);
        
        i++;
    }

    return points;
}

function hexToComplimentary(hex){

    // Convert hex to rgb
    // Credit to Denis http://stackoverflow.com/a/36253499/4939630
    var rgb = 'rgb(' + (hex = hex.replace('#', '')).match(new RegExp('(.{' + hex.length/3 + '})', 'g')).map(function(l) { return parseInt(hex.length%2 ? l+l : l, 16); }).join(',') + ')';

    // Get array of RGB values
    rgb = rgb.replace(/[^\d,]/g, '').split(',');

    var r = rgb[0], g = rgb[1], b = rgb[2];

    // Convert RGB to HSL
    // Adapted from answer by 0x000f http://stackoverflow.com/a/34946092/4939630
    r /= 255.0;
    g /= 255.0;
    b /= 255.0;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2.0;

    if(max == min) {
        h = s = 0;  //achromatic
    } else {
        var d = max - min;
        s = (l > 0.5 ? d / (2.0 - max - min) : d / (max + min));

        if(max == r && g >= b) {
            h = 1.0472 * (g - b) / d ;
        } else if(max == r && g < b) {
            h = 1.0472 * (g - b) / d + 6.2832;
        } else if(max == g) {
            h = 1.0472 * (b - r) / d + 2.0944;
        } else if(max == b) {
            h = 1.0472 * (r - g) / d + 4.1888;
        }
    }

    h = h / 6.2832 * 360.0 + 0;

    // Shift hue to opposite side of wheel and convert to [0-1] value
    h+= 180;
    if (h > 360) { h -= 360; }
    h /= 360;

    // Convert h s and l values into r g and b values
    // Adapted from answer by Mohsen http://stackoverflow.com/a/9493060/4939630
    if(s === 0){
        r = g = b = l; // achromatic
    } else {
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    r = Math.round(r * 255);
    g = Math.round(g * 255); 
    b = Math.round(b * 255);

    // Convert r b and g values to hex
    rgb = b | (g << 8) | (r << 16); 
    return "#" + (0x1000000 | rgb).toString(16).substring(1);
}  

var mesh;
function draw(avoidChange = false) {
    if (opt.newColors && !avoidChange) {
        let palette = random(0, palettes.length - 1);
        let i = random(0, 4);
        let color0 = palettes[palette][i];
        let color1 = palettes[palette][(i === 4 ? 3 : i+1)];

        let lum0 = chroma(color0).luminance();
        let lum1 = chroma(color1).luminance();

        if (lum0 >= lum1) {
            opt.color0 = color1;
            opt.lum0 = lum1;
            opt.color1 = color0;
            opt.lum1 = lum0;
        } else {
            opt.color0 = color0;
            opt.lum0 = lum0;
            opt.color1 = color1;
            opt.lum1 = lum1;
        }



    }

    if (light1) {
        scene.remove(light1);
    }
    light1 = new THREE.AmbientLight(opt.color1, 1);
    scene.add(light1);

    if (light2) {
        scene.remove(light2);
    }
    light2 = new THREE.PointLight(opt.color1, 1);
    light2.position.set(-50,0,50);
    scene.add(light2);

    
    if (mesh) {
        scene.remove(mesh);
    }

    let shape = new THREE.Shape();
    shape.moveTo(0, 0)
    
    
    let w = 50, h =50;

    if (opt.newPoints && !avoidChange) {
        opt.points = getNewPoints(w,h);
    }

    for (let i = 1; i < opt.points.length; i += 1) {
        shape.bezierCurveTo(opt.points[i][0], opt.points[i][1], opt.points[i][2], opt.points[i][3], opt.points[i][4], opt.points[i][5]);
    }

    shape.lineTo(w, h);
    shape.lineTo(w, 0)
    shape.lineTo(0, 0)
    
    let extrudeSettings = { depth: 1000, bevelEnabled: true, curveSegments:100, bevelSegments: 0, steps: 100, bevelSize: 0, bevelThickness: 0 };
    geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings);

    //geometry = new THREE.SphereGeometry(1, 10, 100);
    let material = new THREE.MeshLambertMaterial({color: '#fff', flatShading: true });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-5, -w/2, -1000);
    //mesh.rotation.set(0, 0, 0);
    //mesh.scale.set(s, s, s);
    scene.add(mesh);
}

function render() {
    renderer.setSize(opt.thumbSize, opt.thumbSize);
    scene.background = new THREE.Color(opt.color0);

    light1.color.set(new THREE.Color(opt.color0));
    light2.color.set(new THREE.Color(opt.color1));

    customPass.uniforms.amount1.value = opt.getNoise();

    composer.render(scene, camera);
}

		

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    render();
}


let UI = (function() {
    let ui = {};

    ui.init = function() {
        var gui = new dat.gui.GUI();
        gui.remember(opt);
        
        gui.addColor(opt, 'color0').listen();
        gui.addColor(opt, 'color1').listen();
        gui.add(opt, 'invertColors');
        gui.add(opt, 'pointsCount').step(1).min(0).max(100);

        gui.add(opt, 'noise').min(0).max(0.5).onChange(function() { opt.update(true);});

        gui.add(opt, 'thumbSize');
        gui.add(opt, 'printSize');

        gui.add(opt, 'newColors');
        gui.add(opt, 'newPoints');
        gui.add(opt, 'newPointNumber');

        gui.add(opt, 'update');
        gui.add(opt, 'save');
    }

    function dataURIToBlob( dataURI ) {
        const binStr = window.atob( dataURI.split( ',' )[1] );
        const len = binStr.length;
        const arr = new Uint8Array( len );
        for ( let i = 0; i < len; i++ ) {
            arr[i] = binStr.charCodeAt( i );
        }
        return new window.Blob( [arr] );
    }
        
    function saveDataURI( name, dataURI ) {
        const blob = dataURIToBlob( dataURI );
        
        // force download
        const link = document.createElement( 'a' );
        link.download = name;
        link.href = window.URL.createObjectURL( blob );
        link.onclick = () => {
            window.setTimeout( () => {
            window.URL.revokeObjectURL( blob );
            link.removeAttribute( 'href' );
            }, 500 );
        
        };
        link.click();
    }
        
    function defaultFileName (ext) {
        const str = `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}${ext}`;
        return str.replace(/\//g, '-').replace(/:/g, '.');
    }

    ui.getJson = function(base64) {
        let obj = {};

        obj.color0 = opt.color0;
        obj.color1 = opt.color1;
        obj.points = opt.points;
        obj.timestamp = new Date().getTime();

        if(base64) {
            return btoa(JSON.stringify(obj));
        }

        return obj;
    }

    ui.save = function(width = 5000, height = 5000, save = true) {
        //camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        composer.setSize(width, height);
        
        customPass.uniforms.amount1.value = opt.getNoise((save ? PRINT_RESOULUTION : undefined));
        composer.render(scene, camera, null, false);
    
        if (save) {
          const DataURI = composer.renderer.domElement.toDataURL('image/png');
          saveDataURI(UI.getJson(true) + '.png', DataURI);

          UI.save(opt.thumbSize, opt.thumbSize, false);
        }
    }

    return ui;
})();

UI.init();