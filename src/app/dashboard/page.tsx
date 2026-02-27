import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { TeamRequestsPage, type TeamRegistrationRequest } from "@/components/team-requests-page"
import { AuthGuard } from "@/components/auth-guard"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

const DEMO_REQUESTS: TeamRegistrationRequest[] = [
  {
    id: "req_1",
    teamName: "Шонхорууд",
    sportType: "Сагсан бөмбөг",
    playingYears: "2016-2025",
    className: "12 А анги",
    graduatedYear: 2024,
    gender: "Эрэгтэй",
    contactName: "Бат-Эрдэнэ",
    phone: "99112233",
    status: "pending",
    transactionCode: "TXN-2026-0001",
    members: [
      { id: "m_1", fullName: "Цэлмэг Алдар", heightCm: 170, position: "Довтлогч", personalNumber: "889900" },
      { id: "m_2", fullName: "Содон Төгс", heightCm: 173, position: "Хамгаалагч", personalNumber: "101010" },
      { id: "m_3", fullName: "Батсайхан Ганбаатар", heightCm: 185, sportRank: "Дэд мастер", position: "Довтлогч", personalNumber: "123456" },
    ],
  },
  {
    id: "req_2",
    teamName: "Арсланууд",
    sportType: "Сагсан бөмбөг",
    playingYears: "2012-2021",
    className: "11 Б анги",
    graduatedYear: 2021,
    gender: "Эрэгтэй",
    contactName: "Төгөлдөр",
    phone: "88110022",
    status: "pending",
    transactionCode: "TXN-2026-0002",
    members: [
      { id: "m_4", fullName: "Ган-Очир", heightCm: 182, position: "Төвийн тоглогч", personalNumber: "770011" },
      { id: "m_5", fullName: "Наранболд", heightCm: 176, position: "Хамгаалагч", personalNumber: "770012" },
    ],
  },
  {
    id: "req_3",
    teamName: "Цахилгаанууд",
    sportType: "Волейбол",
    playingYears: "2010-2019",
    className: "10 А анги",
    graduatedYear: 2019,
    gender: "Эмэгтэй",
    contactName: "Саруул",
    phone: "99003344",
    status: "pending",
    transactionCode: "TXN-2026-0003",
    members: [
      { id: "m_6", fullName: "Солонго", heightCm: 168, position: "Дайрагч", personalNumber: "660021" },
      { id: "m_7", fullName: "Мөнхзаяа", heightCm: 172, position: "Сеттер", personalNumber: "660022" },
      { id: "m_8", fullName: "Энхжин", heightCm: 165, position: "Либеро", personalNumber: "660023" },
    ],
  },
  {
    id: "req_4",
    teamName: "Одод",
    sportType: "Хөлбөмбөг",
    playingYears: "2014-2023",
    className: "12 В анги",
    graduatedYear: 2023,
    gender: "Эрэгтэй",
    contactName: "Билгүүн",
    phone: "95112233",
    status: "pending",
    transactionCode: "TXN-2026-0004",
    members: [
      { id: "m_9", fullName: "Тэмүүлэн", heightCm: 178, position: "Довтлогч", personalNumber: "550031" },
      { id: "m_10", fullName: "Эрдэнэбаатар", heightCm: 181, position: "Хагас хамгаалагч", personalNumber: "550032" },
    ],
  },
  {
    id: "req_5",
    teamName: "Харцага",
    sportType: "Ширээний теннис",
    playingYears: "2018-2025",
    className: "12 Г анги",
    graduatedYear: 2025,
    gender: "Эрэгтэй",
    contactName: "Ариунболд",
    phone: "99001122",
    status: "pending",
    transactionCode: "TXN-2026-0005",
    members: [
      { id: "m_11", fullName: "Болор", heightCm: 160, sportRank: "Спортын зэрэггүй", personalNumber: "440041" },
      { id: "m_12", fullName: "Анударь", heightCm: 162, sportRank: "Спортын зэрэггүй", personalNumber: "440042" },
    ],
  },
]

export default function Page() {
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
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
            <TeamRequestsPage requests={DEMO_REQUESTS} />
        </div>
      </SidebarInset>
    </SidebarProvider>
    </AuthGuard>
  )
}
