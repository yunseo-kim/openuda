# NEC2C Developer's Guide

## Introduction

NEC2C is a C implementation of the Numerical Electromagnetics Code (NEC-2) originally developed at Lawrence Livermore Laboratory. This code is designed for numerical modeling of electromagnetic responses of antennas and metal structures. This guide provides essential information for developers working with the NEC2C engine, particularly when integrating it with JavaScript through WebAssembly.

## Code Structure

The NEC2C engine is composed of several modular components, each serving a distinct purpose in the electromagnetic simulation process:

### Core Components

- **main.c**: Entry point for the NEC2 engine, processes input cards and controls the simulation flow.
- **geometry.c**: Handles antenna geometry definitions, including wires and surface patches.
- **calculations.c**: Performs impedance loading and network calculations.
- **radiation.c**: Computes radiation patterns, gains, and field distributions.
- **matrix.c**: Matrix operations for solving electromagnetic equations.
- **fields.c**: Calculates near and far fields.
- **ground.c**: Models ground effects on antenna performance.
- **network.c**: Addresses network interactions between antenna elements.
- **somnec.c**: Sommerfeld integral evaluations for ground modeling.
- **input.c**: Processes input commands and provides core functions like `readmn` and `qdsrc`.
- **misc.c**: Utility functions supporting various operations.
- **shared.c/h**: Variables and structures shared across modules.
- **nec2c.h**: Core definitions, structures, and function prototypes.

## Key Data Structures

NEC2C uses several global structures to manage simulation data:

- **data_t**: Contains geometry information (wires, patches, coordinates).
- **crnt_t**: Current amplitudes and distributions on antenna elements.
- **fpat_t**: Far-field pattern settings.
- **ground_t**: Ground parameters.
- **zload_t**: Impedance loading information.

## Essential Functions and Their Interfaces

### Wire Segment Management

```c
void wire(double xw1, double yw1, double zw1,
         double xw2, double yw2, double zw2, double rad,
         double rdel, double rrad, int ns, int itg)
```

**Purpose**: Generates geometry data for a straight wire antenna.

**Parameters**:
- `xw1, yw1, zw1`: Start coordinates (meters)
- `xw2, yw2, zw2`: End coordinates (meters)
- `rad`: Wire radius (meters)
- `rdel`: Ratio of segment lengths
- `rrad`: Ratio of segment radii
- `ns`: Number of segments
- `itg`: Tag number

**Implementation**: Allocates memory for wire segments and calculates segment geometry.

### Radiation Pattern Calculation

```c
void rdpat(void)
```

**Purpose**: Computes radiation patterns, gain, and normalized gain.

**Implementation**: Calculates electromagnetic fields at specified angles and determines antenna gain characteristics.

### Impedance Calculation

```c
void load(int *ldtyp, int *ldtag, int *ldtagf, int *ldtagt,
         double *zlr, double *zli, double *zlc)
```

**Purpose**: Calculates impedance of specified segments for various loading types.

**Parameters**:
- `ldtyp`: Loading type (resistive, inductive, etc.)
- `ldtag`: Tag numbers for loaded segments
- `ldtagf`, `ldtagt`: From/to segment numbers
- `zlr`: Resistance (ohms)
- `zli`: Inductance (henrys)
- `zlc`: Capacitance (farads)

**Implementation**: Applies loading to specified segments and computes resulting impedances.

### Frequency Setting

This functionality is handled through the main control flow in `main.c`, not through a dedicated function.

## Memory Management

NEC2C includes several memory management functions:

```c
void *mem_alloc(void **ptr, size_t req)
void *mem_realloc(void **ptr, size_t req)
void mem_free(void **ptr)
```

These functions handle allocation, reallocation, and freeing of memory for simulation data.

## WebAssembly Integration

When compiling NEC2C to WebAssembly, the following exported functions are essential:

- `_main`: Entry point for the NEC2 engine
- `_wire`: For defining wire antenna segments
- `_rdpat`: For computing radiation patterns
- `_load`: For impedance and loading calculations
- `_zint`: For internal impedance calculations
- `_mem_alloc`: Memory allocation function
- `_malloc`: Standard C memory allocation
- `_free`: Standard C memory deallocation
- `_prnt`: Print output function

## JavaScript to C Function Mapping

When calling NEC2C functions from JavaScript:

| JavaScript Interface | C Function | Purpose |
|---------------------|------------|---------|
| nec2_add_wire_segment | wire | Define wire segments |
| nec2_calculate_radiation_pattern | rdpat | Calculate radiation pattern |
| nec2_set_frequency | main | Set operating frequency |
| nec2_get_gain | rdpat | Get antenna gain |
| nec2_calculate_impedance | load | Calculate impedance |
| nec2_run_analysis | main | Run overall simulation |
| nec2_cleanup | main | Clean up resources |

## Integration Best Practices

1. **Memory Management**: Always free allocated memory to prevent leaks.
2. **Error Handling**: Check return codes from NEC2C functions to detect errors.
3. **Input Validation**: Validate parameters before passing to NEC2C functions.
4. **Coordinate System**: NEC2C uses a right-handed coordinate system with Z as the vertical axis.
5. **Units**: All dimensions are in wavelengths internally, but interfaces typically use meters.

## Compiling for WebAssembly

The build process needs to export the necessary functions. The OpenUda project uses a comprehensive build script (`build_wasm.sh`) that creates both a multi-threaded version and a single-threaded fallback version for browsers without SharedArrayBuffer support:

```bash
# Define functions to export
EXPORTED_FUNCS="['_main', '_wire', '_rdpat', '_load', '_zint', '_mem_alloc', '_free', '_malloc', '_prnt']"

# Compile with multi-threading and SIMD support
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
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "FS"]' \
  -s EXPORTED_FUNCTIONS=${EXPORTED_FUNCS} \
  [...source files] \
  -o "output_file.js"
```

The build script includes all necessary source files and performs appropriate optimizations.

## Limitations and Considerations

1. **Segment Limits**: NEC2 has practical limits on the number of segments (typically less than 1000 for good performance).
2. **Numerical Stability**: Very thin wires or densely packed segments can cause numerical instability.
3. **Ground Models**: Accurate ground modeling requires careful parameter selection.
4. **Multithreading**: The WebAssembly implementation can use threads for improved performance but requires SharedArrayBuffer support in the browser. The OpenUda project automatically provides a single-threaded fallback for browsers without this support.
5. **JavaScript Integration**: Using the `cwrap` method instead of `ccall` for function invocation is recommended for better code readability and performance in complex applications.
6. **Source Files**: All necessary source files including `input.c` must be included in the compilation process to avoid undefined symbol errors.

## Troubleshooting

Common issues include:
- Incorrect memory management
- Function parameter mismatches
- Boundary conditions not properly set
- Invalid antenna geometry

## References

1. Burke, G.J. and Poggio, A.J., "Numerical Electromagnetics Code (NEC) - Method of Moments," Lawrence Livermore National Lab., CA.; Naval Ocean Systems Center, San Diego, CA, Technical Document 116, 1981.
2. The implementation of NEC2 in C was done by N. Kyriazis, 2013.
