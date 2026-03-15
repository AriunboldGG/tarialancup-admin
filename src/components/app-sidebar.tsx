"use client"

import * as React from "react"
import Link from "next/link"
import { IconInnerShadowTop } from "@tabler/icons-react"

import { NavUser } from "@/components/nav-user"
import { useAuthUser } from "@/hooks/use-auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { IconPlus } from "@tabler/icons-react"

const DEFAULT_USER = {
  name: "Demo Admin",
  email: "admin@demo.com",
  avatar: "/avatars/shadcn.jpg",
}

export function AppSidebar({ 
  selectedSport,
  onSportChange,
  onAddTeam,
  ...props 
}: React.ComponentProps<typeof Sidebar> & {
  selectedSport?: string
  onSportChange?: (sport: string) => void
  onAddTeam?: () => void
}) {
  const authUser = useAuthUser()
  const [user, setUser] = React.useState(DEFAULT_USER)

  React.useEffect(() => {
    if (!authUser) return
    setUser({
      name: authUser.name,
      email: authUser.email,
      avatar: authUser.avatar || DEFAULT_USER.avatar,
    })
  }, [authUser])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
                <Link href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                  <span className="text-base font-semibold">Tarialan Cup</span>
                </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-2 pt-4">
          <Tabs
            value={selectedSport || "Сагсан бөмбөг"}
            onValueChange={(value) => onSportChange?.(value)}
            orientation="vertical"
          >
            <TabsList variant="line" className="w-full flex-col items-start">
              <TabsTrigger value="Сагсан бөмбөг" className="w-full justify-start">
                Сагсан бөмбөг
              </TabsTrigger>
              <TabsTrigger value="Дартс" className="w-full justify-start">
                Дартс
              </TabsTrigger>
              <TabsTrigger value="Теннис" className="w-full justify-start">
                Теннис
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {onAddTeam && (
            <div className="px-2 pt-3">
              <Button
                variant="default"
                className="w-full"
                onClick={onAddTeam}
              >
                <IconPlus className="size-4" />
                Баг нэмэх
              </Button>
            </div>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
