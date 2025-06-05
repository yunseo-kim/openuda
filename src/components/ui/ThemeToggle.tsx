/**
 * Theme Toggle Component
 */

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react'
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { useThemeStore, type ThemeMode } from '@/stores/ui/themeStore'

const themeOptions = [
  {
    key: 'light' as ThemeMode,
    label: 'Light',
    icon: SunIcon,
  },
  {
    key: 'dark' as ThemeMode,
    label: 'Dark',
    icon: MoonIcon,
  },
  {
    key: 'system' as ThemeMode,
    label: 'System',
    icon: ComputerDesktopIcon,
  },
]

export function ThemeToggle() {
  const { mode, setMode } = useThemeStore()

  const currentTheme = themeOptions.find(option => option.key === mode)
  const CurrentIcon = currentTheme?.icon || SunIcon

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="flat"
          size="sm"
          startContent={<CurrentIcon className="w-4 h-4" />}
          endContent={<ChevronDownIcon className="w-3 h-3" />}
        >
          {currentTheme?.label}
        </Button>
      </DropdownTrigger>

      <DropdownMenu
        aria-label="Theme selection"
        selectedKeys={[mode]}
        selectionMode="single"
        onAction={key => setMode(key as ThemeMode)}
      >
        {themeOptions.map(option => {
          const IconComponent = option.icon
          return (
            <DropdownItem key={option.key} startContent={<IconComponent className="w-4 h-4" />}>
              {option.label}
            </DropdownItem>
          )
        })}
      </DropdownMenu>
    </Dropdown>
  )
}
