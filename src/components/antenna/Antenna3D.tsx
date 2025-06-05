/**
 * 3D Antenna Visualization Component
 */

import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei'
import { Group, Mesh } from 'three'
import type { PresetElement } from '@/types/antenna/presets'
import { useThemeStore } from '@/stores/ui/themeStore'

interface Antenna3DProps {
  elements: PresetElement[]
  frequency: number
  showGrid?: boolean
  showLabels?: boolean
}

interface AntennaElementProps {
  element: PresetElement
  index: number
  boomCenter: number
}

// Individual antenna element component
function AntennaElement({ element, boomCenter }: AntennaElementProps) {
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
    <group position={[scaleToScene(element.position - boomCenter), 0, 0]}>
      {/* Element cylinder - now vertical (along Y axis) */}
      <mesh
        ref={meshRef}
        rotation={[0, 0, 0]} // No rotation needed, cylinder is vertical by default
      >
        <cylinderGeometry
          args={[
            scaleToScene(element.diameter / 2),
            scaleToScene(element.diameter / 2),
            scaleToScene(element.length),
            16,
          ]}
        />
        <meshStandardMaterial color={getElementColor()} metalness={0.6} roughness={0.2} />
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
    // Rotate entire antenna assembly 90 degrees around X-axis (boom axis)
    // so elements are horizontal (parallel to ground)
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Boom - now centered at origin */}
      <mesh
        position={[0, 0, 0]}
        rotation={[0, 0, Math.PI / 2]} // Rotate to make it horizontal
      >
        <cylinderGeometry
          args={[
            scaleToScene(5), // 5mm radius for boom
            scaleToScene(5),
            scaleToScene(boomLength * 1.1), // Slightly longer than elements span
            8,
          ]}
        />
        <meshStandardMaterial color="#34495e" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Antenna elements - positioned relative to boom center */}
      {elements.map((element, index) => (
        <AntennaElement
          key={`${element.type}-${index}`}
          element={element}
          index={index}
          boomCenter={boomCenter}
        />
      ))}

      {/* Optional: Add small connectors where elements meet the boom */}
      {elements.map((element, index) => (
        <mesh
          key={`connector-${index}`}
          position={[scaleToScene(element.position - boomCenter), 0, 0]}
        >
          <boxGeometry args={[scaleToScene(15), scaleToScene(15), scaleToScene(15)]} />
          <meshStandardMaterial color="#2c3e50" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export function Antenna3D({ elements, frequency, showGrid = true }: Antenna3DProps) {
  const { resolvedTheme } = useThemeStore()

  // Calculate wavelength for reference
  const wavelength = (299792458 / (frequency * 1e6)) * 1000 // in mm

  // Calculate boom dimensions for display
  const minPos = Math.min(...elements.map(e => e.position))
  const maxPos = Math.max(...elements.map(e => e.position))
  const boomLength = maxPos - minPos

  // Theme-based colors
  const isDark = resolvedTheme === 'dark'
  const backgroundColor = isDark ? '#0a0a0a' : '#f8fafc'
  const gridColor = isDark ? '#404040' : '#6f6f6f'
  const sectionColor = isDark ? '#606060' : '#9d9d9d'

  return (
    <div className="w-full h-full min-h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg relative">
      <Canvas
        shadows
        gl={{
          alpha: false,
          antialias: true,
        }}
        scene={{ background: null }}
        style={{ backgroundColor }}
      >
        <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />

        {/* Lighting - adjusted for theme */}
        <ambientLight intensity={isDark ? 0.3 : 0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={isDark ? 0.8 : 1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-10, -10, -5]} intensity={isDark ? 0.2 : 0.3} />

        {/* Antenna */}
        <AntennaAssembly elements={elements} />

        {/* Grid - themed colors */}
        {showGrid && (
          <Grid
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.5}
            cellColor={gridColor}
            sectionSize={5}
            sectionThickness={1}
            sectionColor={sectionColor}
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
      <div className="absolute top-4 left-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg text-sm border border-gray-200 dark:border-gray-700">
        <div className="font-semibold mb-1">Antenna Info</div>
        <div className="text-gray-600 dark:text-gray-300">
          <div>Frequency: {frequency} MHz</div>
          <div>Wavelength: {(wavelength / 1000).toFixed(2)} m</div>
          <div>Elements: {elements.length}</div>
          <div>Boom length: {(boomLength / 1000).toFixed(2)} m</div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg text-sm border border-gray-200 dark:border-gray-700">
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

      {/* Axis indicator */}
      <div className="absolute top-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg text-xs border border-gray-200 dark:border-gray-700">
        <div className="font-semibold mb-1">View</div>
        <div className="text-gray-600 dark:text-gray-300 space-y-0.5">
          <div>Boom: X-axis (horizontal)</div>
          <div>Elements: Z-axis (horizontal)</div>
        </div>
      </div>
    </div>
  )
}
