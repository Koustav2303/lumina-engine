import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { gsap } from 'gsap';

// Language Configuration
const LANGUAGES = {
  web: { id: 'web', name: 'Web 3D / HTML', monaco: 'javascript', type: 'browser', icon: '🌐' },
  python: { id: 'python', name: 'Python 3', monaco: 'python', type: 'local', icon: '🐍' },
  javascript: { id: 'javascript', name: 'Node.js', monaco: 'javascript', type: 'local', icon: '🟢' },
  cpp: { id: 'cpp', name: 'C++', monaco: 'cpp', type: 'local', icon: '⚙️' },
  go: { id: 'go', name: 'Go', monaco: 'go', type: 'local', icon: '🐹' }
};

const defaultCodes = {
  web: `// Standard 3D Web Environment
const geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
const material = new THREE.MeshStandardMaterial({ color: 0x00ffcc, wireframe: true });
const torus = new THREE.Mesh(geometry, material);
scene.add(torus);

console.log("Web environment ready.");

gsap.to(torus.rotation, {
  x: Math.PI * 2, y: Math.PI * 2, duration: 8, repeat: -1, ease: "none"
});`,
  python: `def greet(name):\n    print(f"Hello, {name}! Welcome to the Local Playground.")\n\ngreet("Developer")\n\n# Try writing a loop:\nfor i in range(5):\n    print(f"Loop iteration: {i}")`,
  javascript: `// Node.js Environment\nconsole.log("Welcome to Local Node.js Playground");\n\nconst os = require('os');\nconsole.log("Platform: " + os.platform());\n\nconst nums = [1, 2, 3, 4, 5];\nconst squared = nums.map(n => n * n);\nconsole.log("Squared numbers:", squared);`,
  cpp: `// Requires C++ compiler installed locally and added to server.js\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}`,
  go: `// Requires Go installed locally and added to server.js\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go!")\n}`
};

function App() {
  const [activeLang, setActiveLang] = useState(LANGUAGES.web);
  const [codes, setCodes] = useState(defaultCodes);
  const [srcDoc, setSrcDoc] = useState('');
  const [logs, setLogs] = useState([]);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const headerRef = useRef(null);
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cinematic UI Entrance
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(headerRef.current, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" })
      .fromTo(editorRef.current, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.5")
      .fromTo(previewRef.current, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.6");
  }, []);

  // Iframe Message Listener
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.source === 'iframe') {
        setLogs((prev) => [...prev, { type: event.data.type, message: event.data.message }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRun = async () => {
    setLogs([]);
    const currentCode = codes[activeLang.id];

    if (activeLang.type === 'browser') {
      setSrcDoc('');
      setTimeout(() => {
        const documentTemplate = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <style>body { margin: 0; padding: 0; overflow: hidden; background-color: #0f172a; } #canvas-container { width: 100vw; height: 100vh; }</style>
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

                function animate() {
                  requestAnimationFrame(animate);
                  renderer.render(scene, camera);
                }
                animate();

                try { ${currentCode} } catch (err) { console.error(err); }
              </script>
            </body>
          </html>
        `;
        setSrcDoc(documentTemplate);
      }, 50);
    } else {
      // Local Backend Execution Logic
      setIsRunning(true);
      setSrcDoc('');
      setLogs([{ type: 'log', message: `Sending ${activeLang.name} to Local Express Engine...` }]);

      try {
        const response = await fetch('http://localhost:5000/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: activeLang.monaco, 
            code: currentCode
          })
        });

        const data = await response.json();
        
        if (data.error) {
            setLogs([{ type: 'error', message: `Engine Error:\n${data.error}` }]);
        } else {
            const outputArray = [];
            
            if (data.stdout) {
                const outLines = data.stdout.split('\n').filter(line => line.trim().length > 0);
                outputArray.push(...outLines.map(line => ({ type: 'log', message: line })));
            }
            if (data.stderr) {
                const errLines = data.stderr.split('\n').filter(line => line.trim().length > 0);
                outputArray.push(...errLines.map(line => ({ type: 'error', message: line })));
            }
            
            if (outputArray.length === 0) {
                outputArray.push({ type: 'log', message: 'Program executed successfully (no output).' });
            }
            
            if(data.time) {
                outputArray.push({ type: 'log', message: `\n⚡ [Processed locally in ${data.time}s]` });
            }
            
            setLogs(outputArray);
        }
      } catch (error) {
        setLogs([{ type: 'error', message: "Failed to reach Express backend. Is your server running?" }]);
      }
      setIsRunning(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setShareUrl('');
    try {
      const response = await fetch('http://localhost:5000/api/snippets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codes[activeLang.id], title: 'Playground Snippet' })
      });
      const data = await response.json();
      
      if (data.success) {
        const url = `${window.location.origin}/${data.shortId}`;
        setShareUrl(url);
        gsap.fromTo(".share-toast", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" });
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save snippet. Check if your backend is running!");
    }
    setIsSaving(false);
  };

  const handleEditorChange = (value) => {
    setCodes(prev => ({ ...prev, [activeLang.id]: value }));
  };

  const selectLanguage = (langKey) => {
    setActiveLang(LANGUAGES[langKey]);
    setIsDropdownOpen(false);
    setLogs([]);
    setSrcDoc('');
  };

  return (
    <div 
      className="min-h-screen p-4 md:p-8 font-sans text-slate-800 overflow-hidden relative bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop')` }}
    >
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] z-0 pointer-events-none"></div>

      {shareUrl && (
        <div className="share-toast absolute top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 backdrop-blur-xl border border-blue-200 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4">
          <span className="font-semibold text-slate-700">Link Generated:</span>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline font-mono text-sm">{shareUrl}</a>
          <button onClick={() => { navigator.clipboard.writeText(shareUrl); setShareUrl(''); }} className="ml-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors">Copy</button>
        </div>
      )}

      <header ref={headerRef} className="relative z-10 mb-6 flex flex-col md:flex-row justify-between items-center bg-white/40 backdrop-blur-lg border border-white/60 shadow-lg rounded-2xl p-4 opacity-0 gap-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800 tracking-tight">
          Code Playground
        </h1>
        
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2.5 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 text-blue-800 font-semibold rounded-xl shadow-sm transition-all duration-300 disabled:opacity-50">
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRunning ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : '▶'}
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]">
        
        <div ref={editorRef} className="flex-1 flex flex-col bg-white/30 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden opacity-0">
          <div className="bg-white/40 px-5 py-3 border-b border-white/50 flex items-center justify-between relative">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-400 mr-2 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400 mr-2 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 mr-4 shadow-sm"></div>
              <span className="font-semibold text-sm text-slate-800 hidden sm:block">main.{activeLang.id === 'web' ? 'js' : activeLang.monaco}</span>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white/60 hover:bg-white/80 border border-white/50 text-slate-800 font-semibold text-sm rounded-xl px-4 py-2 shadow-sm transition-all duration-200"
              >
                <span>{activeLang.icon}</span>
                <span>{activeLang.name}</span>
                <svg className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {Object.keys(LANGUAGES).map((key) => {
                    const lang = LANGUAGES[key];
                    return (
                      <button
                        key={key}
                        onClick={() => selectLanguage(key)}
                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-blue-50 flex items-center gap-3 ${activeLang.id === lang.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}
                      >
                        <span className="text-lg">{lang.icon}</span>
                        {lang.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 p-2 bg-white/20">
            <Editor
              height="100%"
              language={activeLang.monaco}
              theme="light"
              value={codes[activeLang.id]}
              onChange={handleEditorChange}
              options={{ minimap: { enabled: false }, fontSize: 15, fontFamily: '"Fira Code", monospace', scrollBeyondLastLine: false, padding: { top: 16 }, background: 'transparent' }}
            />
          </div>
        </div>

        <div ref={previewRef} className="flex-1 flex flex-col bg-white/30 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden opacity-0">
          <div className="bg-white/40 px-5 py-3 border-b border-white/50">
            <span className="font-semibold text-sm text-slate-800">
              {activeLang.type === 'browser' ? 'Live Visual Output' : 'Terminal Engine'}
            </span>
          </div>
          
          <div className={`flex-1 relative ${activeLang.type === 'browser' ? 'bg-slate-900/90' : 'bg-slate-950 flex flex-col items-center justify-center'}`}>
            {activeLang.type === 'browser' ? (
                !srcDoc ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-800/80 backdrop-blur-sm">
                    <p className="text-slate-200 font-medium text-lg">Web Engine Ready</p>
                    <p className="text-slate-400 text-sm mt-2">Write HTML/JS and hit Run.</p>
                  </div>
                ) : (
                  <iframe title="sandbox" srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin" className="w-full h-full border-none" />
                )
            ) : (
                <div className="text-center p-6">
                    <div className="text-6xl mb-4 opacity-20">{activeLang.icon}</div>
                    <p className="text-slate-400 font-medium text-lg border border-slate-800 rounded-xl px-6 py-3 bg-slate-900/50">
                        Visualizer disabled for {activeLang.name}.<br/>Check terminal below for output.
                    </p>
                </div>
            )}
          </div>

          <div className={`${activeLang.type === 'browser' ? 'h-48' : 'h-64'} bg-slate-950/95 border-t border-slate-800/50 overflow-y-auto p-5 font-mono text-sm backdrop-blur-md transition-all duration-300`}>
             <div className="text-slate-400 mb-3 border-b border-slate-700/50 pb-2 font-semibold flex justify-between">
                <span>Terminal</span>
                <span className="text-xs text-slate-500">{activeLang.type === 'local' ? 'Powered by Local Server' : 'Browser Console'}</span>
             </div>
             {logs.length === 0 ? (
               <span className="text-slate-600 italic">Awaiting execution...</span>
             ) : (
               logs.map((log, index) => (
                 <div key={index} className={`mb-1.5 whitespace-pre-wrap ${log.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                   <span className="opacity-40 mr-2 select-none">{'>'}</span>{log.message}
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