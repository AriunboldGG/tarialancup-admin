"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { TeamRequestsPage, type TeamRegistrationRequest } from "@/components/team-requests-page"
import { AuthGuard } from "@/components/auth-guard"
import { useTeamRequests } from "@/hooks/use-team-requests"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page() {
  const [selectedSport, setSelectedSport] = React.useState<string>("Сагсан бөмбөг")
  const { requests, loading, error } = useTeamRequests(selectedSport)

  // export the current requests to CSV and download
  const handleExport = React.useCallback(() => {
    if (!requests || requests.length === 0) return
    const headers = [
      'id','teamName','sportType','playingYears','className','graduatedYear','gender','contactName','phone','status','transactionCode',
      // members will be stringified
      'members',
    ]
    const rows = requests.map((r) => {
      const membersStr = r.members ? JSON.stringify(r.members) : ''
      return [
        r.id,
        r.teamName,
        r.sportType,
        r.playingYears,
        r.className,
        r.graduatedYear,
        r.gender,
        r.contactName,
        r.phone,
        r.status,
        r.transactionCode,
        membersStr,
      ]
    })
    const csvContent = [headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g,'""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedSport || 'all'}-requests.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [requests, selectedSport])

  const handleAddTeam = () => {
    if ((window as any).__openAddTeamForm) {
      ;(window as any).__openAddTeamForm()
    }
  }

  return (
    <AuthGuard redirectTo="/">
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar 
        variant="inset" 
        selectedSport={selectedSport}
        onSportChange={setSelectedSport}
        onAddTeam={handleAddTeam}
      />
      <SidebarInset>
        <SiteHeader 
          currentSport={selectedSport}
          onExport={handleExport}
        />
        <div className="flex flex-1 flex-col">
            {loading && (
              <div className="flex items-center justify-center p-8">
                <div className="text-lg">Loading team requests...</div>
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center p-8">
                <div className="text-red-500">Error: {error}</div>
              </div>
            )}
            {!loading && !error && (
              <TeamRequestsPage 
                requests={requests}
                sportFilter={selectedSport}
                onAddTeam={handleAddTeam}
              />
            )}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </AuthGuard>
  )
}
