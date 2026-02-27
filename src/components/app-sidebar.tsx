"use client"

import * as React from "react"
import Link from "next/link"
import { IconInnerShadowTop, IconUsers } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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
import { getSession } from "@/lib/demo-auth"

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
  const [user, setUser] = React.useState(DEFAULT_USER)

  React.useEffect(() => {
    const session = getSession()
    if (!session) return
    setUser((prev) => ({
      ...prev,
      name: session.user.name,
      email: session.user.email,
    }))
  }, [])

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
        <NavMain
          items={[
            {
              title: "Баг бүртгэлийн хүсэлтүүд",
              url: "/dashboard",
              icon: IconUsers,
            },
          ]}
        />
        <div className="px-2 pt-4">
          <Tabs
            value={selectedSport || "all"}
            onValueChange={(value) => onSportChange?.(value)}
            orientation="vertical"
          >
            <TabsList variant="line" className="w-full flex-col items-start">
              <TabsTrigger value="all" className="w-full justify-start">
                Бүгд
              </TabsTrigger>
              <TabsTrigger value="Сагсан бөмбөг" className="w-full justify-start">
                Сагсан бөмбөг
              </TabsTrigger>
              <TabsTrigger value="Ширээний теннис" className="w-full justify-start">
                Теннис
              </TabsTrigger>
              <TabsTrigger value="Дартс" className="w-full justify-start">
                Дартс
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {selectedSport === "all" && onAddTeam && (
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
