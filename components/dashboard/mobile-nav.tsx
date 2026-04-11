'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import type { Profile } from '@/types'

export function MobileNav({ profile }: { profile: Profile | null }) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setAberto(true)}
        className="lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <Sidebar profile={profile} onClose={() => setAberto(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
