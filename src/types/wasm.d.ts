// WebAssembly module type declarations

declare module '/wasm/nec2_direct.js' {
  interface NEC2ModuleFactory {
    (config?: any): Promise<any>
  }
  const NEC2Module: NEC2ModuleFactory
  export default NEC2Module
}

declare module '/wasm/nec2_direct_single.js' {
  interface NEC2ModuleSingleFactory {
    (config?: any): Promise<any>
  }
  const NEC2ModuleSingle: NEC2ModuleSingleFactory
  export default NEC2ModuleSingle
}

// Allow importing WASM files
declare module '*.wasm' {
  const content: string
  export default content
}

// Allow importing worker files
declare module '*.worker.js' {
  const content: string
  export default content
}
