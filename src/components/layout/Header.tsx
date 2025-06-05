/**
 * Header Component
 */

import { Navbar, NavbarBrand, NavbarContent } from '@nextui-org/react'
import { ThemeToggle } from '../ui/ThemeToggle'

export function Header() {
  return (
    <Navbar 
      isBordered
      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    >
      <NavbarBrand>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">OpenUda</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Yagi-Uda Antenna Designer</p>
          </div>
        </div>
      </NavbarBrand>
      
      <NavbarContent justify="end">
        <ThemeToggle />
      </NavbarContent>
    </Navbar>
  )
} 