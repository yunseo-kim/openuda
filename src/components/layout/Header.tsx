/**
 * Header Component
 */

import { Navbar, NavbarBrand, NavbarContent } from '@nextui-org/react'
import { ThemeToggle } from '../ui/ThemeToggle'

export function Header() {
  return (
    <Navbar isBordered>
      <NavbarBrand>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <div>
            <p className="font-bold text-inherit">OpenUda</p>
            <p className="text-xs text-gray-500">Yagi-Uda Antenna Designer</p>
          </div>
        </div>
      </NavbarBrand>
      
      <NavbarContent justify="end">
        <ThemeToggle />
      </NavbarContent>
    </Navbar>
  )
} 