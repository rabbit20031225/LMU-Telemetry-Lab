import pandas as pd
import json
import math
import os
import numpy as np

CSV_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\spa_elevation_results_v3.csv'
OUT_HTML = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\spa_visualization.html'

def generate():
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found")
        return

    df = pd.read_csv(CSV_PATH)
    # Use all points for perfect continuity
    full_data = df.copy()
    
    lat_c = full_data['Latitude'].mean()
    lon_c = full_data['Longitude'].mean()
    
    points = []
    for _, r in full_data.iterrows():
        # Safety check: avoid exactly (0,0) GPS points if they exist
        if abs(r['Latitude']) < 1e-6 and abs(r['Longitude']) < 1e-6:
            continue
            
        # Mercator-ish projection to local meters
        x = -(r['Longitude'] - lon_c) * 111320 * math.cos(math.radians(lat_c))
        z = (r['Latitude'] - lat_c) * 111320
        
        # Color based on Throttle (Green) and Brake (Red)
        t = r['Throttle'] / 100.0
        b = r['Brake'] / 100.0
        
        # Simple color blend
        color_hex = f"#{int(b*255):02x}{int(t*255):02x}{int((1-max(t,b))*100 + 50):02x}"
        
        points.append({
            'x': round(x, 2),
            'y': round(r['Elevation'], 2),
            'z': round(z, 2),
            'c': color_hex
        })

    html_template = f"""<!DOCTYPE html>
<html>
<head>
    <title>Spa 3D Elevation & Racing Line</title>
    <style>
        body {{ margin: 0; background: #050505; color: white; font-family: 'Segoe UI', sans-serif; overflow: hidden; }}
        #info {{ 
            position: absolute; top: 20px; left: 20px; 
            padding: 15px; background: rgba(0,0,0,0.8); 
            border-left: 4px solid #00ffff; pointer-events: none;
            backdrop-filter: blur(10px); border-radius: 0 8px 8px 0;
            z-index: 100;
        }}
        .stat {{ font-size: 13px; color: #aaa; margin-top: 5px; }}
        .val {{ color: #00ffff; font-weight: bold; }}
        .legend {{ display: flex; gap: 10px; margin-top: 10px; font-size: 11px; }}
        .leg-item {{ display: flex; align-items: center; gap: 4px; }}
        .box {{ width: 10px; height: 10px; border-radius: 2px; }}
    </style>
</head>
<body>
    <div id="info">
        <h2 style="margin:0; font-size: 18px;">Spa-Francorchamps 3D Refinement</h2>
        <div class="stat">Elevation: <span class="val">{df['Elevation'].min():.1f}m</span> to <span class="val">{df['Elevation'].max():.1f}m</span></div>
        <div class="stat">Start/Finish Alignment: <span class="val">Stitched & Closed</span></div>
        <div class="legend">
            <div class="leg-item"><div class="box" style="background:#00ff00"></div> Throttle</div>
            <div class="leg-item"><div class="box" style="background:#ff0000"></div> Brake</div>
            <div class="leg-item"><div class="box" style="background:#555555"></div> Track Surface</div>
        </div>
    </div>

    <script type="importmap">
        {{
            "imports": {{
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
            }}
        }}
    </script>

    <script type="module">
        import * as THREE from 'three';
        import {{ OrbitControls }} from 'three/addons/controls/OrbitControls.js';

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050505);

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100000);
        camera.position.set(2000, 1500, 2000);

        const renderer = new THREE.WebGLRenderer({{ antialias: true }});
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // Data
        const pointsData = {json.dumps(points)};
        
        // 1. Draw Track Surface (Closed Base)
        const curvePoints = pointsData.map(p => new THREE.Vector3(p.x, p.y - 0.5, p.z));
        const surfaceGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const surfaceMat = new THREE.LineBasicMaterial({{ color: 0x333333, opacity: 0.5, transparent: true }});
        const surfaceLine = new THREE.Line(surfaceGeo, surfaceMat);
        scene.add(surfaceLine);

        // 2. Draw Racing Line (Single Line with Vertex Colors)
        const racingGeo = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        pointsData.forEach(p => {{
            positions.push(p.x, p.y, p.z);
            const color = new THREE.Color(p.c);
            colors.push(color.r, color.g, color.b);
        }});
        
        racingGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        racingGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const racingMat = new THREE.LineBasicMaterial({{ 
            vertexColors: true,
            linewidth: 2
        }});
        
        const racingLine = new THREE.Line(racingGeo, racingMat);
        scene.add(racingLine);

        // Environment
        const grid = new THREE.GridHelper(10000, 40, 0x1a1a1a, 0x111111);
        grid.position.y = {df['Elevation'].min() - 20};
        scene.add(grid);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);

        function animate() {{
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }}
        animate();

        window.addEventListener('resize', () => {{
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }});
    </script>
</body>
</html>
"""
    with open(OUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html_template)
    print(f"Successfully generated refined {OUT_HTML}")

if __name__ == "__main__":
    generate()
