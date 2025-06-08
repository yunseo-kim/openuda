// NEC2 WebAssembly 모듈 최적화 테스트 스크립트
console.log('Testing NEC2 WebAssembly optimization levels...');

// 멀티스레딩/SIMD 지원 확인
const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
const hasSIMD = WebAssembly.validate(new Uint8Array([
  0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11
]));

console.log('SharedArrayBuffer support:', hasSharedArrayBuffer ? 'YES' : 'NO');
console.log('SIMD support:', hasSIMD ? 'YES' : 'NO');

// 환경에 따라 적절한 모듈 로드
const moduleToLoad = hasSharedArrayBuffer ? './nec2_direct.js' : './nec2_direct_single.js';
console.log('Loading module:', moduleToLoad);

// 적절한 모듈을 동적으로 로드하는 로직을 메인 애플리케이션에 구현할 것을 권장합니다.
