import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { gsap } from 'gsap';

// Pre-built templates for the dropdown
const templates = {
  pulsingShape: {
    name: "GSAP Pulsing Shape",
    code: `// 1. Create a geometry and material
const geometry = new THREE.IcosahedronGeometry(1.5, 0);
const material = new THREE.MeshStandardMaterial({ 
  color: 0x4f46e5, 
  wireframe: true,
  emissive: 0x3b82f6,
  emissiveIntensity: 0.5
});

// 2. Create mesh and add to scene
const shape = new THREE.Mesh(geometry, material);
scene.add(shape);
console.log("Icosahedron added!");

// 3. Animate using GSAP inside the execution engine!
gsap.to(shape.rotation, {
  x: Math.PI * 2,
  y: Math.PI * 2,
  duration: 8,
  repeat: -1,
  ease: "none"
});`
  },
  particleSystem: {
    name: "Cinematic Particles",
    code: `// 1. Setup Particle Geometry
const geometry = new THREE.BufferGeometry();
const particlesCount = 1500;
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    // Spread particles over a wider area
    posArray[i] = (Math.random() - 0.5) * 15;
}

geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

// 2. Setup Material
const material = new THREE.PointsMaterial({
    size: 0.05,
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});

// 3. Create Mesh and Add
const particlesMesh = new THREE.Points(geometry, material);
scene.add(particlesMesh);
console.log("Particle vortex initialized.");

// 4. Smooth Rotation with GSAP
gsap.to(particlesMesh.rotation, {
  y: Math.PI * 2,
  duration: 20,
  repeat: -1,
  ease: "none"
});`
  },
  basicCube: {
    name: "Basic Rotating Cube",
    code: `// A simple starting point
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ 
  color: 0xff4081,
  roughness: 0.2,
  metalness: 0.8
});

const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
console.log("Basic cube rendered.");

// Standard Three.js animation hook
window.onUpdate(() => {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
});`
  }
};

function App() {
  const [code, setCode] = useState(templates.pulsingShape.code);
  const [srcDoc, setSrcDoc] = useState('');
  const [logs, setLogs] = useState([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const headerRef = useRef(null);
  const editorRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(headerRef.current, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" })
      .fromTo(editorRef.current, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.5")
      .fromTo(previewRef.current, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.6");

    const pathId = window.location.pathname.slice(1);
    if (pathId && pathId.length > 0) {
      fetch(`http://localhost:5000/api/snippets/${pathId}`)
        .then(res => res.json())
        .then(data => {
          if (data.code) {
            setCode(data.code);
            console.log("Loaded saved snippet!");
          }
        })
        .catch(err => console.error("Error loading snippet:", err));
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.source === 'iframe') {
        setLogs((prev) => [...prev, { type: event.data.type, message: event.data.message }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRun = () => {
    setLogs([]);
    const documentTemplate = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; background-color: #0f172a; }
            #canvas-container { width: 100vw; height: 100vh; }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
        </head>
        <body>
          <div id="canvas-container"></div>
          <script>
            const originalLog = console.log;
            console.log = function(...args) {
              const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
              window.parent.postMessage({ source: 'iframe', type: 'log', message: msg }, '*');
              originalLog.apply(console, args);
            };
            window.onerror = function(message, source, lineno, colno, error) {
              window.parent.postMessage({ source: 'iframe', type: 'error', message: message }, '*');
              return true;
            };

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 4;
            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.getElementById('canvas-container').appendChild(renderer.domElement);
            
            scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 5, 5);
            scene.add(directionalLight);

            window.addEventListener('resize', () => {
              camera.aspect = window.innerWidth / window.innerHeight;
              camera.updateProjectionMatrix();
              renderer.setSize(window.innerWidth, window.innerHeight);
            });

            const updateFunctions = [];
            window.onUpdate = function(fn) {
              if(typeof fn === 'function') updateFunctions.push(fn);
            };

            function animate() {
              requestAnimationFrame(animate);
              updateFunctions.forEach(fn => fn());
              renderer.render(scene, camera);
            }
            animate();

            try {
              ${code}
            } catch (err) {
              console.error(err);
              window.parent.postMessage({ source: 'iframe', type: 'error', message: err.toString() }, '*');
            }
          </script>
        </body>
      </html>
    `;
    setSrcDoc(documentTemplate);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setShareUrl('');
    try {
      const response = await fetch('http://localhost:5000/api/snippets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, title: 'Playground Snippet' })
      });
      const data = await response.json();
      
      if (data.success) {
        const url = `${window.location.origin}/${data.shortId}`;
        setShareUrl(url);
        
        gsap.fromTo(".share-toast", 
          { y: -20, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
        );
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save snippet. Check if your backend is running!");
    }
    setIsSaving(false);
  };

  const handleTemplateChange = (e) => {
    const selectedTemplate = e.target.value;
    setCode(templates[selectedTemplate].code);
  };

  // --- NEW EXPORT FUNCTION ---
  const handleExport = () => {
    // Generate a clean HTML file without the iframe console interceptors
    const exportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported 3D Scene</title>
    <style>
        body { margin: 0; padding: 0; overflow: hidden; background-color: #0f172a; }
        #canvas-container { width: 100vw; height: 100vh; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
</head>
<body>
    <div id="canvas-container"></div>
    <script>
        // Setup Scene
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 4;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('canvas-container').appendChild(renderer.domElement);
        
        // Setup Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // Handle Resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Setup Animation Loop
        const updateFunctions = [];
        window.onUpdate = function(fn) {
            if(typeof fn === 'function') updateFunctions.push(fn);
        };

        function animate() {
            requestAnimationFrame(animate);
            updateFunctions.forEach(fn => fn());
            renderer.render(scene, camera);
        }
        animate();

        // --- User Injected Code ---
        ${code}
    </script>
</body>
</html>`;

    // Create a Blob from the HTML string and trigger download
    const blob = new Blob([exportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-3d-scene.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white p-4 md:p-8 font-sans text-slate-800 overflow-hidden relative">
      
      {shareUrl && (
        <div className="share-toast absolute top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 backdrop-blur-xl border border-blue-200 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4">
          <span className="font-semibold text-slate-700">Link Generated:</span>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline font-mono text-sm">
            {shareUrl}
          </a>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              setShareUrl('');
            }}
            className="ml-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors"
          >
            Copy & Close
          </button>
        </div>
      )}

      <header ref={headerRef} className="mb-6 flex flex-col md:flex-row justify-between items-center bg-white/40 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl p-4 opacity-0 gap-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 tracking-tight">
          Code Playground
        </h1>
        
        <div className="flex gap-3">
          {/* New Export Button */}
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-white/60 hover:bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm transition-all duration-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export HTML
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold rounded-xl shadow-sm transition-all duration-300 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>
          
          <button
            onClick={handleRun}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Run Code ▶
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]">
        
        <div ref={editorRef} className="flex-1 flex flex-col bg-white/30 backdrop-blur-xl border border-white/50 shadow-xl rounded-3xl overflow-hidden opacity-0">
          <div className="bg-white/40 px-5 py-3 border-b border-white/50 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400 mr-2"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 mr-4"></div>
              <span className="font-semibold text-sm text-slate-600">script.js</span>
            </div>
            
            <select 
              onChange={handleTemplateChange}
              className="bg-white/50 border border-blue-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 outline-none shadow-sm cursor-pointer"
            >
              <option value="pulsingShape">GSAP Pulsing Shape</option>
              <option value="particleSystem">Cinematic Particles</option>
              <option value="basicCube">Basic Rotating Cube</option>
            </select>
          </div>
          
          <div className="flex-1 p-2">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="light"
              value={code}
              onChange={(value) => setCode(value)}
              options={{ minimap: { enabled: false }, fontSize: 15, fontFamily: '"Fira Code", monospace', scrollBeyondLastLine: false, padding: { top: 16 } }}
            />
          </div>
        </div>

        <div ref={previewRef} className="flex-1 flex flex-col bg-white/30 backdrop-blur-xl border border-white/50 shadow-xl rounded-3xl overflow-hidden opacity-0">
          <div className="bg-white/40 px-5 py-3 border-b border-white/50">
            <span className="font-semibold text-sm text-slate-600">Visual Output</span>
          </div>
          
          <div className="flex-1 bg-slate-900 relative">
            {!srcDoc ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-800">
                <div className="w-16 h-16 mb-4 rounded-full border-4 border-dashed border-blue-400 animate-spin"></div>
                <p className="text-slate-300 font-medium text-lg">Engine Ready</p>
                <p className="text-slate-400 text-sm mt-2">Write code and hit Run.</p>
              </div>
            ) : (
              <iframe title="sandbox" srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin" className="w-full h-full border-none" />
            )}
          </div>

          <div className="h-48 bg-slate-950 border-t border-slate-800 overflow-y-auto p-4 font-mono text-sm">
             <div className="text-slate-400 mb-2 border-b border-slate-700 pb-1">Console</div>
             {logs.length === 0 ? (
               <span className="text-slate-600 italic">No output yet...</span>
             ) : (
               logs.map((log, index) => (
                 <div key={index} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                   <span className="opacity-50 mr-2">{'>'}</span> {log.message}
                 </div>
               ))
             )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;