import { useState } from 'react'
import { Tabs, Tab, Card, CardBody } from '@nextui-org/react'
import { useTranslation } from 'react-i18next'
import { DesignTab } from './components/tabs/DesignTab'
import { PerformanceTab } from './components/tabs/PerformanceTab'
import { PatternTab } from './components/tabs/PatternTab'
import { AboutTab } from './components/tabs/AboutTab'
import { Header } from './components/layout/Header'
import { useAntennaStore } from './stores/antennaStore'

function App() {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState('design')
  const antennaModel = useAntennaStore((state) => state.antennaModel)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Card className="bg-content1">
          <CardBody className="p-0">
            <Tabs
              aria-label="Navigation tabs"
              selectedKey={selectedTab}
              onSelectionChange={(key) => setSelectedTab(key as string)}
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
                    <span>{t('nav.design')}</span>
                  </div>
                }
              >
                <div className="p-6">
                  <DesignTab />
                </div>
              </Tab>
              
              <Tab
                key="performance"
                title={
                  <div className="flex items-center space-x-2">
                    <span>{t('nav.performance')}</span>
                  </div>
                }
                isDisabled={!antennaModel}
              >
                <div className="p-6">
                  <PerformanceTab />
                </div>
              </Tab>
              
              <Tab
                key="pattern"
                title={
                  <div className="flex items-center space-x-2">
                    <span>{t('nav.pattern')}</span>
                  </div>
                }
                isDisabled={!antennaModel}
              >
                <div className="p-6">
                  <PatternTab />
                </div>
              </Tab>
              
              <Tab
                key="about"
                title={
                  <div className="flex items-center space-x-2">
                    <span>{t('nav.about')}</span>
                  </div>
                }
              >
                <div className="p-6">
                  <AboutTab />
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      </main>
    </div>
  )
}

export default App 