#!/bin/bash

# nec2c 엔진을 WebAssembly로 컴파일하는 스크립트

# 현재 디렉토리 확인
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Working in directory: $DIR"

# Emscripten SDK 설정
EMSDK_DIR="$(cd "$DIR/../../emsdk" && pwd)"
source "$EMSDK_DIR/emsdk_env.sh"

# 출력 디렉토리 설정
OUTPUT_DIR="$DIR/../../js/modules/wasm"
mkdir -p "$OUTPUT_DIR"

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

# 컴파일 명령
echo "Compiling NEC2C to WebAssembly..."
emcc -O3 \
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

# 컴파일 결과 확인
if [ $? -eq 0 ]; then
  echo "Compilation successful!"
  echo "Output files:"
  echo "  $OUTPUT_DIR/nec2_direct.js"
  echo "  $OUTPUT_DIR/nec2_direct.wasm"
else
  echo "Compilation failed!"
  exit 1
fi
