import { useEffect } from 'react'
import { NextUIProvider } from '@nextui-org/react'
import { Tabs, Tab } from '@nextui-org/react'
import { 
  CubeIcon, 
  ChartBarIcon, 
  RadioIcon, 
  InformationCircleIcon,
  BeakerIcon 
} from '@heroicons/react/24/outline'

import { Header } from './components/layout/Header'
import { DesignTab } from './components/tabs/DesignTab'
import { PerformanceTab } from './components/tabs/PerformanceTab'
import { PatternTab } from './components/tabs/PatternTab'
import { AboutTab } from './components/tabs/AboutTab'
import { NEC2Test } from './components/NEC2Test'
import { useThemeStore } from './stores/ui/themeStore'

function App() {
  const { initializeTheme } = useThemeStore()

  // Initialize theme on app startup
  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])

  return (
    <NextUIProvider>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto p-6">
          <Tabs 
            aria-label="OpenUda navigation"
            size="lg"
            variant="underlined"
            classNames={{
              tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-0 h-12",
              tabContent: "group-data-[selected=true]:text-primary"
            }}
          >
            <Tab
              key="design"
              title={
                <div className="flex items-center space-x-2">
                  <CubeIcon className="w-5 h-5" />
                  <span>Design</span>
                </div>
              }
            >
              <DesignTab />
            </Tab>
            
            <Tab
              key="performance"
              title={
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="w-5 h-5" />
                  <span>Performance</span>
                </div>
              }
            >
              <PerformanceTab />
            </Tab>
            
            <Tab
              key="pattern"
              title={
                <div className="flex items-center space-x-2">
                  <RadioIcon className="w-5 h-5" />
                  <span>Pattern Analysis</span>
                </div>
              }
            >
              <PatternTab />
            </Tab>
            
            <Tab
              key="about"
              title={
                <div className="flex items-center space-x-2">
                  <InformationCircleIcon className="w-5 h-5" />
                  <span>About</span>
                </div>
              }
            >
              <AboutTab />
            </Tab>
            
            <Tab
              key="engine-test"
              title={
                <div className="flex items-center space-x-2">
                  <BeakerIcon className="w-5 h-5" />
                  <span>Engine Test</span>
                </div>
              }
            >
              <NEC2Test />
            </Tab>
          </Tabs>
        </main>
      </div>
    </NextUIProvider>
  )
}

export default App 