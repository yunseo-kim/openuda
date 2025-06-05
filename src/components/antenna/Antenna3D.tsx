/**
 * 3D Antenna Visualization Component
 */

import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei'
import { Group, Mesh } from 'three'
import type { PresetElement } from '@/types/antenna/presets'

interface Antenna3DProps {
  elements: PresetElement[]
  frequency: number
  showGrid?: boolean
  showLabels?: boolean
}

interface AntennaElementProps {
  element: PresetElement
  index: number
}

// Individual antenna element component
function AntennaElement({ element, index }: AntennaElementProps) {
  const meshRef = useRef<Mesh>(null)
  
  // Colors for different element types
  const getElementColor = () => {
    switch (element.type) {
      case 'reflector':
        return '#ff6b6b'
      case 'driven':
        return '#4ecdc4'
      case 'director':
        return '#45b7d1'
      default:
        return '#95a5a6'
    }
  }

  // Convert mm to scene units (1 unit = 100mm for better visualization)
  const scaleToScene = (mm: number) => mm / 100

  return (
    <group position={[scaleToScene(element.position), 0, 0]}>
      {/* Element cylinder */}
      <mesh
        ref={meshRef}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry 
          args={[
            scaleToScene(element.diameter / 2),
            scaleToScene(element.diameter / 2),
            scaleToScene(element.length),
            16
          ]} 
        />
        <meshStandardMaterial 
          color={getElementColor()} 
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
    </group>
  )
}

// Main antenna assembly
function AntennaAssembly({ elements }: { elements: PresetElement[] }) {
  const groupRef = useRef<Group>(null)

  // Calculate boom length based on element positions
  const minPos = Math.min(...elements.map(e => e.position))
  const maxPos = Math.max(...elements.map(e => e.position))
  const boomLength = maxPos - minPos
  const boomCenter = (minPos + maxPos) / 2

  const scaleToScene = (mm: number) => mm / 100

  return (
    <group ref={groupRef}>
      {/* Boom */}
      <mesh
        position={[scaleToScene(boomCenter), 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry 
          args={[
            scaleToScene(5), // 5mm radius for boom
            scaleToScene(5),
            scaleToScene(boomLength * 1.1), // Slightly longer than elements span
            8
          ]} 
        />
        <meshStandardMaterial 
          color="#34495e" 
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>

      {/* Antenna elements */}
      {elements.map((element, index) => (
        <AntennaElement 
          key={`${element.type}-${index}`} 
          element={element} 
          index={index} 
        />
      ))}
    </group>
  )
}

export function Antenna3D({ elements, frequency, showGrid = true, showLabels = false }: Antenna3DProps) {
  // Calculate wavelength for reference
  const wavelength = 299792458 / (frequency * 1e6) * 1000 // in mm
  
  return (
    <div className="w-full h-full min-h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg">
      <Canvas shadows>
        <PerspectiveCamera 
          makeDefault 
          position={[10, 5, 10]} 
          fov={50}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight 
          position={[-10, -10, -5]} 
          intensity={0.3}
        />
        
        {/* Antenna */}
        <AntennaAssembly elements={elements} />
        
        {/* Grid */}
        {showGrid && (
          <Grid 
            args={[20, 20]} 
            cellSize={1}
            cellThickness={0.5}
            cellColor="#6f6f6f"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#9d9d9d"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />
        )}
        
        {/* Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI * 0.9}
          minDistance={2}
          maxDistance={50}
        />
      </Canvas>
      
      {/* Info overlay */}
      <div className="absolute top-4 left-4 bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg text-sm">
        <div className="font-semibold mb-1">Antenna Info</div>
        <div className="text-gray-600 dark:text-gray-300">
          <div>Frequency: {frequency} MHz</div>
          <div>Wavelength: {(wavelength / 1000).toFixed(2)} m</div>
          <div>Elements: {elements.length}</div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg text-sm">
        <div className="font-semibold mb-1">Elements</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff6b6b]"></div>
            <span className="text-gray-600 dark:text-gray-300">Reflector</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#4ecdc4]"></div>
            <span className="text-gray-600 dark:text-gray-300">Driven</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#45b7d1]"></div>
            <span className="text-gray-600 dark:text-gray-300">Director</span>
          </div>
        </div>
      </div>
    </div>
  )
} 