#!/bin/bash

# nec2c 엔진을 WebAssembly로 컴파일하는 스크립트
# 멀티스레딩 및 SIMD 벡터화를 활용한 고성능 최적화 포함

# 현재 디렉토리 확인
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Working in directory: $DIR"

# Emscripten SDK 설정
EMSDK_DIR="$(cd "$DIR/../../emsdk" && pwd)"
source "$EMSDK_DIR/emsdk_env.sh"

# 출력 디렉토리 설정
OUTPUT_DIR="$DIR/../../js/modules/wasm"
mkdir -p "$OUTPUT_DIR"

# 병렬 빌드를 위한 CPU 코어 수 확인
if [ "$(uname)" == "Darwin" ]; then
  NUM_CORES=$(sysctl -n hw.ncpu)
else
  NUM_CORES=$(nproc)
fi
echo "Using $NUM_CORES CPU cores for compilation"

# NEC2C 소스 파일 목록
NEC2C_SOURCES=(
  "main.c"
  "geometry.c"
  "matrix.c"
  "misc.c"
  "calculations.c"
  "fields.c"
  "radiation.c"
  "ground.c"
  "network.c"
  "shared.c"
  "somnec.c"
)

# 소스 파일을 절대 경로로 변환
SOURCES_ABS=()
for src in "${NEC2C_SOURCES[@]}"; do
  SOURCES_ABS+=("$DIR/$src")
done

# 멀티스레딩 및 SIMD 최적화 버전 컴파일
echo "Compiling high-performance NEC2C to WebAssembly with multithreading and SIMD..."
emcc \
  -O3 \
  -flto \
  -ffast-math \
  -msimd128 \
  -mavx \
  -msse \
  -s WASM=1 \
  -s USE_PTHREADS=1 \
  -s PTHREAD_POOL_SIZE=4 \
  -s TOTAL_MEMORY=128MB \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s WASM_MEM_MAX=512MB \
  -s SHARED_MEMORY=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "FS"]' \
  -s EXPORTED_FUNCTIONS='["_main"]' \
  -s ENVIRONMENT='web,worker' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='NEC2Module' \
  -s FILESYSTEM=1 \
  -s EXIT_RUNTIME=0 \
  -s ASSERTIONS=1 \
  -s EXPORT_ES6=1 \
  -I "$DIR" \
  "${SOURCES_ABS[@]}" \
  -o "$OUTPUT_DIR/nec2_direct.js"

# 단일 스레드 폴백 버전도 컴파일 (브라우저가 SharedArrayBuffer를 지원하지 않는 경우)
echo "Compiling fallback single-threaded version..."
emcc \
  -O3 \
  -ffast-math \
  -msimd128 \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "FS"]' \
  -s EXPORTED_FUNCTIONS='["_main"]' \
  -s ENVIRONMENT='web,worker' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='NEC2ModuleSingleThread' \
  -s FILESYSTEM=1 \
  -s EXIT_RUNTIME=0 \
  -s ASSERTIONS=1 \
  -s EXPORT_ES6=1 \
  -I "$DIR" \
  "${SOURCES_ABS[@]}" \
  -o "$OUTPUT_DIR/nec2_direct_single.js"

# 컴파일 결과 확인 - 멀티스레딩 버전
MULTITHREAD_RESULT=$?

# 컴파일 결과 확인 - 싱글스레드 버전
if [ $MULTITHREAD_RESULT -eq 0 ]; then
  echo "Multi-threaded compilation successful!"
  echo "Output files:"
  echo "  $OUTPUT_DIR/nec2_direct.js"
  echo "  $OUTPUT_DIR/nec2_direct.wasm"
  echo "  $OUTPUT_DIR/nec2_direct.worker.js"
  
  if [ -f "$OUTPUT_DIR/nec2_direct_single.js" ]; then
    echo "Single-threaded compilation successful!"
    echo "Output files:"
    echo "  $OUTPUT_DIR/nec2_direct_single.js"
    echo "  $OUTPUT_DIR/nec2_direct_single.wasm"
  else
    echo "Warning: Single-threaded compilation failed!"
  fi
else
  echo "Multi-threaded compilation failed!"
  echo "Trying to build with reduced optimizations..."
  
  # 실패 시 최적화 수준을 낮춰 다시 시도
  emcc \
    -O2 \
    -s WASM=1 \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "FS"]' \
    -s EXPORTED_FUNCTIONS='["_main"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ENVIRONMENT='web,worker' \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='NEC2Module' \
    -s FILESYSTEM=1 \
    -s EXIT_RUNTIME=0 \
    -s ASSERTIONS=1 \
    -s EXPORT_ES6=1 \
    -I "$DIR" \
    "${SOURCES_ABS[@]}" \
    -o "$OUTPUT_DIR/nec2_direct.js"
  
  if [ $? -eq 0 ]; then
    echo "Fallback compilation successful!"
    echo "Output files:"
    echo "  $OUTPUT_DIR/nec2_direct.js"
    echo "  $OUTPUT_DIR/nec2_direct.wasm"
  else
    echo "All compilation attempts failed!"
    exit 1
  fi
fi

# 최적화 테스트 스크립트 생성
cat > "$OUTPUT_DIR/test_optimization.js" << EOF
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
EOF

echo "Created optimization test script: $OUTPUT_DIR/test_optimization.js"
echo "Build completed successfully!"
