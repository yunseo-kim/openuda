/**
 * Node.js Test Environment Setup
 * 
 * Provides mock objects for browser APIs and configures
 * the module system for the Node.js environment.
 * 
 * Also includes mock implementations for testing the WebAssembly NEC2C engine.
 */

// Import WebAssembly mock objects
import { createMockNEC2CEngine } from './wasm-mock.js';

// DOM element mock implementation
global.document = {
    createElement: () => ({
        getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            getImageData: () => ({
                data: new Uint8Array(0)
            }),
            putImageData: () => {},
            createImageData: () => ({}),
            setTransform: () => {},
            drawImage: () => {},
            save: () => {},
            restore: () => {},
            scale: () => {},
            translate: () => {},
            fillText: () => {},
            measureText: () => ({ width: 0 }),
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {},
            stroke: () => {},
            fill: () => {}
        }),
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        width: 300,
        height: 150,
    }),
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

// Web API mock implementation
global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
};

// 콘솔 로그 포맷팅 (테스트 출력 가독성 향상)
const originalLog = console.log;
console.log = function(...args) {
    // Add ANSI colors to special messages
    const formatted = args.map(arg => {
        if (typeof arg === 'string') {
            if (arg.includes('PASSED:')) {
                return `\x1b[32m${arg}\x1b[0m`; // Green
            }
            if (arg.includes('FAILED:')) {
                return `\x1b[31m${arg}\x1b[0m`; // Red
            }
            if (arg.includes('SKIPPED:')) {
                return `\x1b[33m${arg}\x1b[0m`; // Yellow
            }
        }
        return arg;
    });
    
    originalLog.apply(console, formatted);
};

// Dynamic import helper for ESM modules
global.dynamicImport = async (modulePath) => {
    return import(modulePath);
};

// WebAssembly API mock implementation
global.WebAssembly = {
  Memory: class {
    constructor(options) {
      this.buffer = new ArrayBuffer(options.initial * 64 * 1024);
    }
  },
  instantiateStreaming: async () => ({
    instance: { exports: {} },
    module: {}
  }),
  Module: class {}
};

// NEC2C WASM loader mock function
global.loadNEC2CWasm = async () => {
  return createMockNEC2CEngine();
};

// NEC2C path configuration
global.NEC2C_WASM_PATH = 'mocked/path';
global.NEC2C_WASM_WORKER_PATH = 'mocked/worker/path';

// Worker mock implementation (WebWorker replacement)
class WorkerMock {
  constructor(scriptURL) {
    this.onmessage = null;
    this.onerror = null;
    this.scriptURL = scriptURL;
  }
  
  postMessage(message) {
    // 워커 비동기 처리 시뮬레이션
    setTimeout(() => {
      if (this.onmessage) {
        const result = {
          type: message.type || 'result',
          success: true
        };
        
        // Generate results based on message type
        if (message.type === 'calculate') {
          result.data = {
            impedance: { real: 50.0, imag: 0.0 },
            vswr: 1.0,
            gain: 10.0,
            frontToBack: 20.0
          };
        } else if (message.type === 'pattern') {
          result.data = {
            azimuth: Array.from({length: 72}, (_, i) => ({ 
              angle: i * 5, 
              gain: 10 * Math.sin(i * 5 * Math.PI / 180) 
            })),
            elevation: Array.from({length: 37}, (_, i) => ({ 
              angle: i * 5, 
              gain: 10 * Math.cos(i * 5 * Math.PI / 180) 
            }))
          };
        }
        
        this.onmessage({ data: result });
      }
    }, 10);
  }
  
  terminate() {
    // 워커 종료 시뮬레이션
  }
}

// Worker class replacement
global.Worker = WorkerMock;

// Add Three.js mock objects
global.THREE = {
  Scene: class {},
  PerspectiveCamera: class {},
  WebGLRenderer: class {
    constructor() {
      this.domElement = {};
    }
    render() {}
    setSize() {}
    setClearColor() {}
  },
  MeshBasicMaterial: class {},
  SphereGeometry: class {},
  Mesh: class {},
  Color: class {},
  Vector3: class {},
  BoxGeometry: class {},
  MeshPhongMaterial: class {},
  AmbientLight: class {},
  DirectionalLight: class {},
  Group: class {}
};

console.log('Node.js test environment has been set up (including NEC2C WASM mock objects).');
