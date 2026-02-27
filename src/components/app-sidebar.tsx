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
import { getSession } from "@/lib/demo-auth"

const DEFAULT_USER = {
  name: "Demo Admin",
  email: "admin@demo.com",
    avatar: "/avatars/shadcn.jpg",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
