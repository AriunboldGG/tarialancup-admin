"use client"

import * as React from "react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { IconDownload, IconLoader2 } from "@tabler/icons-react"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { doc, updateDoc, addDoc, collection as firestoreCollection } from "firebase/firestore"
import { db, storage, auth } from "@/lib/firebase"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type TeamMember = {
  id: string
  fullName: string
  heightCm?: number
  sportRank?: string
  position?: string
  personalNumber?: string
  imageUrl?: string
}

export type TeamRegistrationRequest = {
  id: string
  teamName: string
  sportType: string
  playingYears: string // e.g. "2016-2025"
  className: string // e.g. "12 A анги"
  graduatedYear: number
  gender: string
  contactName: string
  phone: string
  members: TeamMember[]
  status: "pending" | "approved" | "rejected"
  transactionCode?: string
}

function parseClassInfo(className: string | null | undefined): { grade: number | null; section: string | null } {
  // Supports: "12 А анги", "12A", "12 A", etc.
  if (!className) return { grade: null, section: null }
  const match = className.match(/(\d+)\s*([\p{L}])?/u)
  const grade = match?.[1] ? Number(match[1]) : null
  const section = match?.[2] ? match[2].toUpperCase() : null
  return {
    grade: Number.isFinite(grade) ? grade : null,
    section,
  }
}
function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="text-sm font-medium text-right">{value}</div>
    </div>
  )
}

export function TeamRequestsPage({
  requests,
  sportFilter,
  onAddTeam,
}: {
  requests: TeamRegistrationRequest[]
  sportFilter?: string
  onAddTeam?: () => void
}) {
  const [rows, setRows] = React.useState<TeamRegistrationRequest[]>(requests)
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<TeamRegistrationRequest | null>(
    null
  )

  const [teamQuery, setTeamQuery] = React.useState("")
  const [gradeMin, setGradeMin] = React.useState<string>("all")
  const [gradeMax, setGradeMax] = React.useState<string>("all")
  const [section, setSection] = React.useState<string>("all")
  const [className, setClassName] = React.useState<string>("all")
  const [playingYearsFilter, setPlayingYearsFilter] = React.useState<string>("all")
  const [gradYearFilter, setGradYearFilter] = React.useState<string>("all")

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<{
    id: string
    action: "approve" | "reject"
    teamName: string
  } | null>(null)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editingRequest, setEditingRequest] = React.useState<TeamRegistrationRequest | null>(null)
  const [editForm, setEditForm] = React.useState<Partial<TeamRegistrationRequest>>({})

  const [page, setPage] = React.useState(1)
  const PAGE_SIZE = 50

  const [uploadingMemberIdx, setUploadingMemberIdx] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [addOpen, setAddOpen] = React.useState(false)
  const [addForm, setAddForm] = React.useState<Partial<TeamRegistrationRequest>>({
    members: [],
    status: "pending",
  })

  React.useEffect(() => {
    if (onAddTeam) {
      // Expose the openAddForm function to parent
      ;(window as any).__openAddTeamForm = () => {
        setAddForm({
          members: [],
          status: "pending",
        })
        setAddOpen(true)
      }
    }
  }, [onAddTeam])

  React.useEffect(() => {
    setRows(requests)
    setPage(1)
  }, [requests])

  const selectedMembers = selected?.members ?? []

  const filterOptions = React.useMemo(() => {
    const sections = new Set<string>()
    const classNames = new Set<string>()
    const playingYears = new Set<string>()
    const gradYears = new Set<number>()

    for (const r of rows) {
      const info = parseClassInfo(r.className)
      if (info.section) sections.add(info.section)
      if (r.className) classNames.add(r.className)
      if (r.playingYears) playingYears.add(r.playingYears)
      if (r.graduatedYear) gradYears.add(r.graduatedYear)
    }

    return {
      sections: [...sections].sort((a, b) => a.localeCompare(b)),
      classNames: [...classNames].sort((a, b) => a.localeCompare(b)),
      playingYears: [...playingYears].sort((a, b) => a.localeCompare(b)),
      gradYears: [...gradYears].sort((a, b) => a - b),
    }
  }, [rows])

  const filteredRows = React.useMemo(() => {
    const q = teamQuery.trim().toLowerCase()
    const sectionValue = section === "all" ? null : section
    const classNameValue = className === "all" ? null : className
    const sportValue = sportFilter === "all" || !sportFilter ? null : sportFilter
    const playingYearsValue = playingYearsFilter === "all" ? null : playingYearsFilter
    const gradYearValue = gradYearFilter === "all" ? null : Number(gradYearFilter)

    return rows.filter((r) => {
      if (q && !r.teamName.toLowerCase().includes(q)) return false
      if (sportValue && r.sportType !== sportValue) return false
      if (classNameValue && r.className !== classNameValue) return false
      if (playingYearsValue && r.playingYears !== playingYearsValue) return false
      if (gradYearValue && r.graduatedYear !== gradYearValue) return false
      const info = parseClassInfo(r.className)
      if (sectionValue && info.section !== sectionValue) return false
      return true
    })
  }, [rows, teamQuery, section, className, sportFilter, playingYearsFilter, gradYearFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openDetails(req: TeamRegistrationRequest) {
    setSelected(req)
    setOpen(true)
  }

  function openEdit(req: TeamRegistrationRequest) {
    setEditingRequest(req)
    setEditForm({ ...req, members: [...(req.members || [])] })
    setEditOpen(true)
  }

  function updateMember(index: number, updates: Partial<TeamMember>) {
    setEditForm((prev) => {
      const members = [...(prev.members || [])]
      members[index] = { ...members[index], ...updates }
      return { ...prev, members }
    })
  }

  function addMember() {
    setEditForm((prev) => {
      const members = [...(prev.members || [])]
      members.push({
        id: `m_${Date.now()}`,
        fullName: "",
        heightCm: undefined,
        sportRank: "",
        position: "",
        personalNumber: "",
      })
      return { ...prev, members }
    })
  }

  function removeMember(index: number) {
    setEditForm((prev) => {
      const members = [...(prev.members || [])]
      members.splice(index, 1)
      return { ...prev, members }
    })
  }

  async function handleMemberImageUpload(
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
    isNew: boolean = false
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Зөвхөн зураг файл сонгоно уу")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Зурагны хэмжээ 5MB-аас ихгүй байх ёстой")
      return
    }

    setUploadingMemberIdx(index)
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        toast.error("Нэвтрэх шаардлагатай")
        return
      }

      const folder = isNew
        ? `members/new_${Date.now()}`
        : `members/${editingRequest?.id ?? `new_${Date.now()}`}`
      const fileRef = storageRef(storage, `${folder}/${Date.now()}_${index}`)
      await uploadBytes(fileRef, file)
      const imageUrl = await getDownloadURL(fileRef)
      if (isNew) {
        updateNewMember(index, { imageUrl })
      } else {
        updateMember(index, { imageUrl })
      }
      toast.success("Зураг амжилттай байршлаа")
    } catch (err: any) {
      console.error("Storage upload error:", err?.code, err?.message, err)
      if (err?.code === "storage/unauthorized") {
        toast.error("Storage-ийн эрх хүрэлцэхгүй байна. Firebase Console → Storage → Rules шалгана уу.")
      } else if (err?.code === "storage/object-not-found") {
        toast.error("Storage bucket олдсонгүй. Firebase Console-д Storage идэвхжүүлсэн эсэхийг шалгана уу.")
      } else {
        toast.error(`Зураг байршуулахад алдаа: ${err?.code ?? err?.message ?? err}`)
      }
    } finally {
      setUploadingMemberIdx(null)
    }
  }

  function addMemberToNew() {
    setAddForm((prev) => {
      const members = [...(prev.members || [])]
      members.push({
        id: `m_${Date.now()}`,
        fullName: "",
        heightCm: undefined,
        sportRank: "",
        position: "",
        personalNumber: "",
      })
      return { ...prev, members }
    })
  }

  function updateNewMember(index: number, updates: Partial<TeamMember>) {
    setAddForm((prev) => {
      const members = [...(prev.members || [])]
      members[index] = { ...members[index], ...updates }
      return { ...prev, members }
    })
  }

  function removeNewMember(index: number) {
    setAddForm((prev) => {
      const members = [...(prev.members || [])]
      members.splice(index, 1)
      return { ...prev, members }
    })
  }

  const SPORT_COLLECTION: Record<string, string> = {
    "Сагсан бөмбөг": "basketball",
    "Дартс": "darts",
    "Ширээний теннис": "tennis",
  }

  async function saveNewTeam() {
    setSaving(true)
    try {
      const collectionName = SPORT_COLLECTION[sportFilter ?? ""] ?? "basketball"
      const newTeam: TeamRegistrationRequest = {
        id: `req_${Date.now()}`,
        teamName: addForm.teamName || "",
        sportType: addForm.sportType || sportFilter || "",
        playingYears: addForm.playingYears || "",
        className: addForm.className || "",
        graduatedYear: addForm.graduatedYear || new Date().getFullYear(),
        gender: addForm.gender || "Эрэгтэй",
        contactName: addForm.contactName || "",
        phone: addForm.phone || "",
        status: "pending",
        transactionCode: addForm.transactionCode || `TXN-2026-${String(Date.now()).slice(-4)}`,
        members: addForm.members || [],
      }
      const { id, ...firestoreData } = newTeam
      await addDoc(firestoreCollection(db, collectionName), firestoreData)
      setRows((prev) => [...prev, newTeam])
      setAddOpen(false)
      setAddForm({ members: [], status: "pending" })
      toast.success("Шинэ баг нэмэгдлээ")
    } catch (err: any) {
      console.error("saveNewTeam error:", err?.code, err?.message, err)
      toast.error(`Хадгалахад алдаа: ${err?.code ?? err?.message ?? "тодорхгүй"}`)
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit() {
    if (!editingRequest) return
    setSaving(true)
    try {
      const collectionName = SPORT_COLLECTION[editingRequest.sportType] ?? SPORT_COLLECTION[sportFilter ?? ""] ?? "basketball"
      // Firestore rejects undefined values — strip them from the payload
      const cleanedMembers = (editForm.members || []).map((m) =>
        Object.fromEntries(Object.entries({ ...m }).filter(([, v]) => v !== undefined))
      )
      const payload = Object.fromEntries(
        Object.entries({ ...editForm, members: cleanedMembers }).filter(([, v]) => v !== undefined)
      )
      await updateDoc(doc(db, collectionName, editingRequest.id), payload)
      setRows((prev) =>
        prev.map((r) =>
          r.id === editingRequest.id ? { ...r, ...editForm } : r
        )
      )
      setSelected((prev) =>
        prev?.id === editingRequest.id ? { ...prev, ...editForm } as TeamRegistrationRequest : prev
      )
      setEditOpen(false)
      setEditingRequest(null)
      toast.success("Хүсэлтийг шинэчиллээ")
    } catch (err: any) {
      console.error("saveEdit error:", err?.code, err?.message, err)
      toast.error(`Хадгалахад алдаа: ${err?.code ?? err?.message ?? "тодорхгүй"}`)
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(id: string, status: TeamRegistrationRequest["status"]) {
    const req = rows.find((r) => r.id === id)
    if (!req) return
    const collectionName = SPORT_COLLECTION[req.sportType] ?? SPORT_COLLECTION[sportFilter ?? ""] ?? "basketball"
    await updateDoc(doc(db, collectionName, id), { status })
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    )
    setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev))
  }

  function handleApproveClick(id: string) {
    const req = rows.find((r) => r.id === id)
    if (req) {
      setPendingAction({ id, action: "approve", teamName: req.teamName })
      setConfirmOpen(true)
    }
  }

  function handleRejectClick(id: string) {
    const req = rows.find((r) => r.id === id)
    if (req) {
      setPendingAction({ id, action: "reject", teamName: req.teamName })
      setConfirmOpen(true)
    }
  }

  async function confirmAction() {
    if (!pendingAction) return
    try {
      if (pendingAction.action === "approve") {
        await setStatus(pendingAction.id, "approved")
        toast.success("Хүсэлтийг зөвшөөрлөө")
      } else {
        await setStatus(pendingAction.id, "rejected")
        toast.message("Хүсэлтийг татгалзлаа")
      }
    } catch (err: any) {
      console.error("setStatus error:", err?.code, err?.message, err)
      toast.error(`Төлөв өөрчлөхд алдаа: ${err?.code ?? err?.message ?? "тодорхгүй"}`)
    }
    setConfirmOpen(false)
    setPendingAction(null)
  }

  function remove(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
    if (selected?.id === id) {
      setOpen(false)
      setSelected(null)
    }
    toast.error("Хүсэлтийг устгалаа")
  }

  function StatusBadge({ status }: { status: TeamRegistrationRequest["status"] }) {
    if (status === "approved") return <Badge>Зөвшөөрсөн</Badge>
    if (status === "rejected") return <Badge variant="destructive">Татгалзсан</Badge>
    return <Badge variant="secondary">Хүлээгдэж байна</Badge>
  }

  function exportToExcel(requests: TeamRegistrationRequest[], sportType: string) {
    // Prepare data for Excel export
    const excelData = requests.map((req, index) => {
      const membersInfo = req.members
        .map(
          (m, idx) =>
            `${idx + 1}. ${m.fullName}${m.heightCm ? ` (${m.heightCm}см)` : ""}${
              m.position ? ` - ${m.position}` : ""
            }${m.personalNumber ? ` (${m.personalNumber})` : ""}`
        )
        .join("; ")

      return {
        "№": index + 1,
        "Багийн нэр": req.teamName,
        "Спортын төрөл": req.sportType,
        "Тоглох үе": req.playingYears,
        "Анги": req.className,
        "Төгссөн жил": req.graduatedYear,
        "Хүйс": req.gender,
        "Холбоо барих хүн": req.contactName,
        "Утас": req.phone,
        "Төлөв":
          req.status === "approved"
            ? "Зөвшөөрсөн"
            : req.status === "rejected"
              ? "Татгалзсан"
              : "Хүлээгдэж байна",
        "Гүйлгээний код": req.transactionCode || "",
        "Гишүүдийн тоо": req.members.length,
        "Гишүүдийн мэдээлэл": membersInfo,
      }
    })

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Хүсэлтүүд")

    // Set column widths
    const colWidths = [
      { wch: 6 }, // №
      { wch: 20 }, // Багийн нэр
      { wch: 15 }, // Спортын төрөл
      { wch: 15 }, // Тоглох үе
      { wch: 15 }, // Анги
      { wch: 12 }, // Төгссөн жил
      { wch: 10 }, // Хүйс
      { wch: 18 }, // Холбоо барих хүн
      { wch: 12 }, // Утас
      { wch: 15 }, // Төлөв
      { wch: 18 }, // Гүйлгээний код
      { wch: 12 }, // Гишүүдийн тоо
      { wch: 50 }, // Гишүүдийн мэдээлэл
    ]
    ws["!cols"] = colWidths

    // Generate filename with sport type and date
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `${sportType}_хүсэлтүүд_${dateStr}.xlsx`

    // Download file
    XLSX.writeFile(wb, filename)
    toast.success(`Excel файл татагдлаа: ${filename}`)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-6">
      <div>
        <h2 className="text-base sm:text-lg font-semibold">Баг бүртгэлийн хүсэлтүүд</h2>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Одоогоор хүсэлт алга</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Багийн бүртгэлийн хүсэлт ирмэгц энэ хэсэгт жагсаалт харагдана.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-sm sm:text-base">
                Хүсэлтийн жагсаалт{" "}
                <span className="text-muted-foreground font-normal">
                  ({filteredRows.length}/{rows.length})
                </span>
              </CardTitle>
              {sportFilter && sportFilter !== "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToExcel(filteredRows, sportFilter)}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <IconDownload className="size-4" />
                  <span className="hidden xs:inline">Excel татах</span>
                  <span className="xs:hidden">Татах</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1">
                <div className="text-muted-foreground text-xs">Багийн нэр</div>
                <Input
                  value={teamQuery}
                  onChange={(e) => { setTeamQuery(e.target.value); setPage(1) }}
                  placeholder="Ж: Шонхорууд"
                  className="w-full"
                />
              </div>

              <div className="grid gap-1">
                <div className="text-muted-foreground text-xs">Тоглох он</div>
                <Select value={playingYearsFilter} onValueChange={(v) => { setPlayingYearsFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Бүгд" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүгд</SelectItem>
                    {filterOptions.playingYears.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <div className="text-muted-foreground text-xs">Төгссөн он</div>
                <Select value={gradYearFilter} onValueChange={(v) => { setGradYearFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Бүгд" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүгд</SelectItem>
                    {filterOptions.gradYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <div className="text-muted-foreground text-xs">Анги бүлэг</div>
                <Select value={className} onValueChange={(v) => { setClassName(v); setPage(1) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Бүгд" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүгд</SelectItem>
                    {filterOptions.classNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => {
                  setTeamQuery("")
                  setGradeMin("all")
                  setGradeMax("all")
                  setSection("all")
                  setClassName("all")
                  setPlayingYearsFilter("all")
                  setGradYearFilter("all")
                  setPage(1)
                }}
              >
                Clear filters
              </Button>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] text-center">№</TableHead>
                  <TableHead className="min-w-[120px]">Баг</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[100px]">Спорт</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[100px]">Тоглох он</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[100px]">Анги</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[90px]">Төгссөн он</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[60px]">Гишүүд</TableHead>
                  <TableHead className="hidden xl:table-cell min-w-[120px]">Холбоо барих</TableHead>
                  <TableHead className="hidden xl:table-cell min-w-[100px]">Утас</TableHead>
                  <TableHead className="min-w-[100px]">Төлөв</TableHead>
                  <TableHead className="text-right min-w-[200px] sm:min-w-[280px]">Үйлдэл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-muted-foreground py-8 text-center text-sm sm:text-base">
                      Илэрц олдсонгүй.
                    </TableCell>
                  </TableRow>
                ) : null}
                {pagedRows.map((req, idx) => (
                  <TableRow key={req.id}>
                    <TableCell className="text-center text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="cursor-pointer hover:underline underline-offset-4 text-sm sm:text-base"
                        onClick={() => openDetails(req)}
                      >
                        {req.teamName}
                      </button>
                      <div className="mt-1 text-xs text-muted-foreground sm:hidden">
                        {req.sportType} • {req.playingYears}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{req.sportType}</TableCell>
                    <TableCell className="hidden md:table-cell">{req.playingYears}</TableCell>
                    <TableCell className="hidden lg:table-cell">{req.className}</TableCell>
                    <TableCell className="hidden lg:table-cell">{req.graduatedYear}</TableCell>
                    <TableCell className="hidden lg:table-cell">{req.members.length}</TableCell>
                    <TableCell className="hidden xl:table-cell">{req.contactName}</TableCell>
                    <TableCell className="hidden xl:table-cell">{req.phone}</TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer text-xs sm:text-sm"
                          onClick={() => openDetails(req)}
                        >
                          <span className="hidden sm:inline">Detail</span>
                          <span className="sm:hidden">D</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer text-xs sm:text-sm"
                          onClick={() => openEdit(req)}
                        >
                          <span className="hidden sm:inline">Edit</span>
                          <span className="sm:hidden">E</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer text-xs sm:text-sm"
                          onClick={() => handleApproveClick(req.id)}
                          disabled={req.status === "approved"}
                        >
                          <span className="hidden md:inline">Approve</span>
                          <span className="md:hidden">A</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer text-xs sm:text-sm"
                          onClick={() => handleRejectClick(req.id)}
                          disabled={req.status === "rejected"}
                        >
                          <span className="hidden md:inline">Reject</span>
                          <span className="md:hidden">R</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="cursor-pointer text-xs sm:text-sm"
                          onClick={() => remove(req.id)}
                        >
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">X</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-xs text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} / {filteredRows.length}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ‹
                  </Button>
                  <span className="px-2 text-sm">{page} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                  >
                    »
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setSelected(null)
        }}
      >
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-base sm:text-lg">{selected?.teamName ?? "Дэлгэрэнгүй"}</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">Багийн дэлгэрэнгүй мэдээлэл</SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="grid gap-4 sm:gap-6 px-2 sm:px-4 pb-4 sm:pb-6 overflow-y-auto max-h-[calc(100vh-120px)]">
              <div className="grid gap-2">
                <Field label="Багийн нэр" value={selected.teamName} />
                <Field label="Спортын төрөл" value={selected.sportType} />
                <Field label="Багийн тоглох үе" value={selected.playingYears} />
                <Field label="Анги" value={selected.className} />
                <Field label="Төгссөн жил" value={selected.graduatedYear} />
                <Field label="Хүйс" value={selected.gender} />
                <Field label="Холбоо барих хүн" value={selected.contactName} />
                <Field label="Утас" value={selected.phone} />
                <Field label="Төлөв" value={<StatusBadge status={selected.status} />} />
              </div>

              <Separator />

              <div className="grid gap-3">
                <div className="text-sm font-semibold">
                  Багийн гишүүд ({selectedMembers.length})
                </div>
                {selectedMembers.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    Гишүүдийн мэдээлэл алга.
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {selectedMembers.map((m) => (
                      <Card key={m.id} className="shadow-none">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="size-10 sm:size-12">
                              <AvatarImage src={m.imageUrl} alt={m.fullName} />
                              <AvatarFallback className="text-xs sm:text-sm">
                                {m.fullName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <CardTitle className="text-xs sm:text-sm truncate">{m.fullName}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-1 text-sm">
                          {m.heightCm ? (
                            <Field label="Өндөр" value={`${m.heightCm}см`} />
                          ) : null}
                          {m.sportRank ? (
                            <Field label="Спортын зэрэг" value={m.sportRank} />
                          ) : null}
                          {m.position ? (
                            <Field label="Байрлал" value={m.position} />
                          ) : null}
                          {m.personalNumber ? (
                            <Field
                              label="Хувийн дугаар"
                              value={m.personalNumber}
                            />
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid gap-2">
                <Field
                  label="Гүйлгээний код"
                  value={
                    selected.transactionCode ? (
                      <span className="font-mono">{selected.transactionCode}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  }
                />
              </div>
            </div>
          ) : (
            <div className="px-4 pb-6 text-muted-foreground text-sm">
              Хүсэлт сонгоогүй байна.
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next)
          if (!next) {
            setEditingRequest(null)
            setEditForm({})
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base sm:text-lg">Хүсэлт засах</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">Багийн бүртгэлийн хүсэлтийн мэдээллийг засварлах</SheetDescription>
          </SheetHeader>

          {editingRequest ? (
            <div className="grid gap-3 sm:gap-4 px-2 sm:px-4 pb-4 sm:pb-6 overflow-y-auto max-h-[calc(100vh-120px)]">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="teamName" className="text-xs sm:text-sm">Багийн нэр</Label>
                  <Input
                    id="teamName"
                    value={editForm.teamName || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, teamName: e.target.value }))
                    }
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sportType" className="text-xs sm:text-sm">Спортын төрөл</Label>
                  <Input
                    id="sportType"
                    value={editForm.sportType || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, sportType: e.target.value }))
                    }
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="playingYears" className="text-xs sm:text-sm">Багийн тоглох үе</Label>
                  <Input
                    id="playingYears"
                    value={editForm.playingYears || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, playingYears: e.target.value }))
                    }
                    placeholder="Ж: 2016-2025"
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="className" className="text-xs sm:text-sm">Анги</Label>
                  <Input
                    id="className"
                    value={editForm.className || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, className: e.target.value }))
                    }
                    placeholder="Ж: 12 А анги"
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="graduatedYear" className="text-xs sm:text-sm">Төгссөн жил</Label>
                  <Input
                    id="graduatedYear"
                    type="number"
                    value={editForm.graduatedYear || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        graduatedYear: Number(e.target.value),
                      }))
                    }
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gender" className="text-xs sm:text-sm">Хүйс</Label>
                  <Select
                    value={editForm.gender || ""}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({ ...prev, gender: value }))
                    }
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Хүйс сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Эрэгтэй">Эрэгтэй</SelectItem>
                      <SelectItem value="Эмэгтэй">Эмэгтэй</SelectItem>
                      <SelectItem value="Холимог">Холимог</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contactName" className="text-xs sm:text-sm">Холбоо барих хүн</Label>
                  <Input
                    id="contactName"
                    value={editForm.contactName || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, contactName: e.target.value }))
                    }
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-xs sm:text-sm">Утас</Label>
                  <Input
                    id="phone"
                    value={editForm.phone || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="transactionCode" className="text-xs sm:text-sm">Гүйлгээний код</Label>
                  <Input
                    id="transactionCode"
                    value={editForm.transactionCode || ""}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, transactionCode: e.target.value }))
                    }
                    placeholder="Ж: TXN-2026-0001"
                    className="text-sm sm:text-base"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <Label className="text-sm sm:text-base font-semibold">
                    Багийн гишүүд ({(editForm.members || []).length})
                  </Label>
                  <Button type="button" size="sm" variant="outline" onClick={addMember} className="text-xs sm:text-sm w-full sm:w-auto">
                    + Гишүүн нэмэх
                  </Button>
                </div>

                {(editForm.members || []).length === 0 ? (
                  <div className="text-muted-foreground text-sm text-center py-4">
                    Гишүүд алга. "+ Гишүүн нэмэх" товч дараад нэмнэ үү.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {(editForm.members || []).map((member, index) => (
                      <Card key={member.id || index} className="shadow-none">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Гишүүн #{index + 1}</CardTitle>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeMember(index)}
                            >
                              Устгах
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor={`member-${index}-name`} className="text-xs sm:text-sm">Овог нэр</Label>
                            <Input
                              id={`member-${index}-name`}
                              value={member.fullName || ""}
                              onChange={(e) =>
                                updateMember(index, { fullName: e.target.value })
                              }
                              placeholder="Ж: Цэлмэг Алдар"
                              className="text-sm sm:text-base"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor={`member-${index}-image`} className="text-xs sm:text-sm">Гишүүний зураг</Label>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                              {member.imageUrl ? (
                                <Avatar className="size-12 sm:size-16 shrink-0">
                                  <AvatarImage src={member.imageUrl} alt={member.fullName || ""} />
                                  <AvatarFallback className="text-xs sm:text-sm">
                                    {(member.fullName || "").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="bg-muted flex size-12 sm:size-16 items-center justify-center rounded-full text-muted-foreground text-xs shrink-0">
                                  Зураггүй
                                </div>
                              )}
                              <div className="flex-1 w-full sm:w-auto">
                                {uploadingMemberIdx === index ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                    <IconLoader2 className="size-4 animate-spin" />
                                    Зураг байршуулж байна...
                                  </div>
                                ) : (
                                  <Input
                                    id={`member-${index}-image`}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleMemberImageUpload(index, e, false)}
                                    className="cursor-pointer text-xs sm:text-sm"
                                    disabled={uploadingMemberIdx !== null}
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="grid gap-2">
                              <Label htmlFor={`member-${index}-height`} className="text-xs sm:text-sm">Өндөр (см)</Label>
                              <Input
                                id={`member-${index}-height`}
                                type="number"
                                value={member.heightCm || ""}
                                onChange={(e) =>
                                  updateMember(index, {
                                    heightCm: e.target.value ? Number(e.target.value) : undefined,
                                  })
                                }
                                placeholder="Ж: 170"
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor={`member-${index}-personalNumber`} className="text-xs sm:text-sm">
                                Хувийн дугаар
                              </Label>
                              <Input
                                id={`member-${index}-personalNumber`}
                                value={member.personalNumber || ""}
                                onChange={(e) =>
                                  updateMember(index, { personalNumber: e.target.value })
                                }
                                placeholder="Ж: 889900"
                              />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor={`member-${index}-position`} className="text-xs sm:text-sm">Байрлал</Label>
                            <Input
                              id={`member-${index}-position`}
                              value={member.position || ""}
                              onChange={(e) =>
                                updateMember(index, { position: e.target.value })
                              }
                              placeholder="Ж: Довтлогч"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor={`member-${index}-sportRank`}>Спортын зэрэг</Label>
                            <Input
                              id={`member-${index}-sportRank`}
                              value={member.sportRank || ""}
                              onChange={(e) =>
                                updateMember(index, { sportRank: e.target.value })
                              }
                              placeholder="Ж: Дэд мастер"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 text-sm sm:text-base"
                  onClick={() => {
                    setEditOpen(false)
                    setEditingRequest(null)
                    setEditForm({})
                  }}
                >
                  Цуцлах
                </Button>
                <Button className="flex-1 text-sm sm:text-base" onClick={saveEdit} disabled={saving || uploadingMemberIdx !== null}>
                  {saving ? <IconLoader2 className="size-4 animate-spin mr-1" /> : null}
                  Хадгалах
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={addOpen}
        onOpenChange={(next) => {
          setAddOpen(next)
          if (!next) {
            setAddForm({
              members: [],
              status: "pending",
            })
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base sm:text-lg">Шинэ баг нэмэх</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">Багийн бүртгэлийн шинэ хүсэлт үүсгэх</SheetDescription>
          </SheetHeader>

          <div className="grid gap-3 sm:gap-4 px-2 sm:px-4 pb-4 sm:pb-6 overflow-y-auto max-h-[calc(100vh-120px)]">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-teamName" className="text-xs sm:text-sm">Багийн нэр</Label>
                <Input
                  id="add-teamName"
                  value={addForm.teamName || ""}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, teamName: e.target.value }))
                  }
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-sportType" className="text-xs sm:text-sm">Спортын төрөл</Label>
                <Input
                  id="add-sportType"
                  value={addForm.sportType || ""}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, sportType: e.target.value }))
                  }
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-playingYears" className="text-xs sm:text-sm">Багийн тоглох үе</Label>
                <Input
                  id="add-playingYears"
                  value={addForm.playingYears || ""}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, playingYears: e.target.value }))
                  }
                  placeholder="Ж: 2016-2025"
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-className" className="text-xs sm:text-sm">Анги</Label>
                <Input
                  id="add-className"
                  value={addForm.className || ""}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, className: e.target.value }))
                  }
                  placeholder="Ж: 12 А анги"
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-graduatedYear" className="text-xs sm:text-sm">Төгссөн жил</Label>
                <Input
                  id="add-graduatedYear"
                  type="number"
                  value={addForm.graduatedYear || ""}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      graduatedYear: Number(e.target.value),
                    }))
                  }
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-gender" className="text-xs sm:text-sm">Хүйс</Label>
                <Select
                  value={addForm.gender || ""}
                  onValueChange={(value) =>
                    setAddForm((prev) => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue placeholder="Хүйс сонгох" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Эрэгтэй">Эрэгтэй</SelectItem>
                    <SelectItem value="Эмэгтэй">Эмэгтэй</SelectItem>
                    <SelectItem value="Холимог">Холимог</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-contactName" className="text-xs sm:text-sm">Холбоо барих хүн</Label>
                <Input
                  id="add-contactName"
                  value={addForm.contactName || ""}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, contactName: e.target.value }))
                  }
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-phone" className="text-xs sm:text-sm">Утас</Label>
                <Input
                  id="add-phone"
                  value={addForm.phone || ""}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="add-transactionCode" className="text-xs sm:text-sm">Гүйлгээний код</Label>
                <Input
                  id="add-transactionCode"
                  value={addForm.transactionCode || ""}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, transactionCode: e.target.value }))
                  }
                  placeholder="Ж: TXN-2026-0001"
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <Label className="text-sm sm:text-base font-semibold">
                  Багийн гишүүд ({(addForm.members || []).length})
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addMemberToNew} className="text-xs sm:text-sm w-full sm:w-auto">
                  + Гишүүн нэмэх
                </Button>
              </div>

              {(addForm.members || []).length === 0 ? (
                <div className="text-muted-foreground text-sm text-center py-4">
                  Гишүүд алга. "+ Гишүүн нэмэх" товч дараад нэмнэ үү.
                </div>
              ) : (
                <div className="grid gap-4">
                  {(addForm.members || []).map((member, index) => (
                    <Card key={member.id || index} className="shadow-none">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Гишүүн #{index + 1}</CardTitle>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeNewMember(index)}
                          >
                            Устгах
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor={`add-member-${index}-name`} className="text-xs sm:text-sm">Овог нэр</Label>
                          <Input
                            id={`add-member-${index}-name`}
                            value={member.fullName || ""}
                            onChange={(e) =>
                              updateNewMember(index, { fullName: e.target.value })
                            }
                            placeholder="Ж: Цэлмэг Алдар"
                            className="text-sm sm:text-base"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`add-member-${index}-image`} className="text-xs sm:text-sm">Гишүүний зураг</Label>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                            {member.imageUrl ? (
                              <Avatar className="size-12 sm:size-16 shrink-0">
                                <AvatarImage src={member.imageUrl} alt={member.fullName || ""} />
                                <AvatarFallback className="text-xs sm:text-sm">
                                  {(member.fullName || "").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="bg-muted flex size-12 sm:size-16 items-center justify-center rounded-full text-muted-foreground text-xs shrink-0">
                                Зураггүй
                              </div>
                            )}
                              <div className="flex-1 w-full sm:w-auto">
                                {uploadingMemberIdx === index ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                    <IconLoader2 className="size-4 animate-spin" />
                                    Зураг байршуулж байна...
                                  </div>
                                ) : (
                                  <Input
                                    id={`add-member-${index}-image`}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleMemberImageUpload(index, e, true)}
                                    className="cursor-pointer text-xs sm:text-sm"
                                    disabled={uploadingMemberIdx !== null}
                                  />
                                )}
                              </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor={`add-member-${index}-height`} className="text-xs sm:text-sm">Өндөр (см)</Label>
                            <Input
                              id={`add-member-${index}-height`}
                              type="number"
                              value={member.heightCm || ""}
                              onChange={(e) =>
                                updateNewMember(index, {
                                  heightCm: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              placeholder="Ж: 170"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor={`add-member-${index}-personalNumber`} className="text-xs sm:text-sm">
                              Хувийн дугаар
                            </Label>
                            <Input
                              id={`add-member-${index}-personalNumber`}
                              value={member.personalNumber || ""}
                              onChange={(e) =>
                                updateNewMember(index, { personalNumber: e.target.value })
                              }
                              placeholder="Ж: 889900"
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`add-member-${index}-position`} className="text-xs sm:text-sm">Байрлал</Label>
                          <Input
                            id={`add-member-${index}-position`}
                            value={member.position || ""}
                            onChange={(e) =>
                              updateNewMember(index, { position: e.target.value })
                            }
                            placeholder="Ж: Довтлогч"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`add-member-${index}-sportRank`}>Спортын зэрэг</Label>
                          <Input
                            id={`add-member-${index}-sportRank`}
                            value={member.sportRank || ""}
                            onChange={(e) =>
                              updateNewMember(index, { sportRank: e.target.value })
                            }
                            placeholder="Ж: Дэд мастер"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1 text-sm sm:text-base"
                onClick={() => {
                  setAddOpen(false)
                  setAddForm({
                    members: [],
                    status: "pending",
                  })
                }}
              >
                Цуцлах
              </Button>
              <Button className="flex-1 text-sm sm:text-base" onClick={saveNewTeam} disabled={saving || uploadingMemberIdx !== null}>
                  {saving ? <IconLoader2 className="size-4 animate-spin mr-1" /> : null}
                  Хадгалах
                </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "approve"
                ? "Хүсэлтийг зөвшөөрөх үү?"
                : "Хүсэлтийг татгалзах уу?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction && (
                <>
                  Та <strong>{pendingAction.teamName}</strong> багийн хүсэлтийг{" "}
                  {pendingAction.action === "approve"
                    ? "зөвшөөрөх"
                    : "татгалзах"}{" "}
                  гэж байна.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Буцах</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              variant={pendingAction?.action === "reject" ? "destructive" : "default"}
            >
              {pendingAction?.action === "approve" ? "Зөвшөөрөх" : "Татгалзах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

