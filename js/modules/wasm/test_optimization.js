// NEC2 WebAssembly Module Optimization Test Script
console.log('Testing NEC2 WebAssembly optimization levels...');

// Check for multithreading/SIMD support
const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
const hasSIMD = WebAssembly.validate(new Uint8Array([
  0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11
]));

console.log('SharedArrayBuffer support:', hasSharedArrayBuffer ? 'YES' : 'NO');
console.log('SIMD support:', hasSIMD ? 'YES' : 'NO');

// Load appropriate module based on environment
const moduleToLoad = hasSharedArrayBuffer ? './nec2_direct.js' : './nec2_direct_single.js';
console.log('Loading module:', moduleToLoad);

// It is recommended to implement the logic for dynamically loading the appropriate module in the main application.
