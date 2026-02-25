"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

export type TeamMember = {
  id: string
  fullName: string
  heightCm?: number
  sportRank?: string
  position?: string
  personalNumber?: string
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

function parseClassInfo(className: string): { grade: number | null; section: string | null } {
  // Supports: "12 А анги", "12A", "12 A", etc.
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
}: {
  requests: TeamRegistrationRequest[]
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

  React.useEffect(() => {
    setRows(requests)
  }, [requests])

  const selectedMembers = selected?.members ?? []

  const filterOptions = React.useMemo(() => {
    const grades = new Set<number>()
    const sections = new Set<string>()
    const classNames = new Set<string>()

    for (const r of rows) {
      const info = parseClassInfo(r.className)
      if (info.grade != null) grades.add(info.grade)
      if (info.section) sections.add(info.section)
      if (r.className) classNames.add(r.className)
    }

    const sortedGrades = [...grades].sort((a, b) => a - b)
    const sortedSections = [...sections].sort((a, b) => a.localeCompare(b))
    const sortedClassNames = [...classNames].sort((a, b) => a.localeCompare(b))

    return {
      grades: sortedGrades,
      sections: sortedSections,
      classNames: sortedClassNames,
    }
  }, [rows])

  const filteredRows = React.useMemo(() => {
    const q = teamQuery.trim().toLowerCase()
    const min = gradeMin === "all" ? null : Number(gradeMin)
    const max = gradeMax === "all" ? null : Number(gradeMax)
    const sectionValue = section === "all" ? null : section
    const classNameValue = className === "all" ? null : className

    return rows.filter((r) => {
      if (q && !r.teamName.toLowerCase().includes(q)) return false

      if (classNameValue && r.className !== classNameValue) return false

      const info = parseClassInfo(r.className)
      if (sectionValue && info.section !== sectionValue) return false

      if (min != null || max != null) {
        const g = info.grade
        if (g == null) return false
        if (min != null && g < min) return false
        if (max != null && g > max) return false
      }

      return true
    })
  }, [rows, teamQuery, gradeMin, gradeMax, section, className])

  function openDetails(req: TeamRegistrationRequest) {
    setSelected(req)
    setOpen(true)
  }

  function setStatus(id: string, status: TeamRegistrationRequest["status"]) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    )
    setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev))
  }

  function approve(id: string) {
    setStatus(id, "approved")
    toast.success("Хүсэлтийг зөвшөөрлөө")
  }

  function reject(id: string) {
    setStatus(id, "rejected")
    toast.message("Хүсэлтийг татгалзлаа")
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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div>
        <h2 className="text-lg font-semibold">Баг бүртгэлийн хүсэлтүүд</h2>
        <p className="text-muted-foreground text-sm">
          Ирсэн хүсэлтүүдийг эндээс шалгаж, дэлгэрэнгүй мэдээллийг үзнэ.
        </p>
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
            <CardTitle className="text-base">
              Хүсэлтийн жагсаалт{" "}
              <span className="text-muted-foreground font-normal">
                ({filteredRows.length}/{rows.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <div className="grid gap-1">
                <div className="text-muted-foreground text-xs">Багийн нэр</div>
                <Input
                  value={teamQuery}
                  onChange={(e) => setTeamQuery(e.target.value)}
                  placeholder="Ж: Шонхорууд"
                />
              </div>

              <div className="grid gap-1">
                <div className="text-muted-foreground text-xs">Анги (range)</div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={gradeMin} onValueChange={setGradeMin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүгд</SelectItem>
                      {filterOptions.grades.map((g) => (
                        <SelectItem key={`min-${g}`} value={String(g)}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={gradeMax} onValueChange={setGradeMax}>
                    <SelectTrigger>
                      <SelectValue placeholder="Max" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүгд</SelectItem>
                      {filterOptions.grades.map((g) => (
                        <SelectItem key={`max-${g}`} value={String(g)}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1">
                <div className="text-muted-foreground text-xs">Секц (A/Б/…)</div>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Бүгд" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүгд</SelectItem>
                    {filterOptions.sections.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <div className="text-muted-foreground text-xs">Анги нэр (exact)</div>
                <Select value={className} onValueChange={setClassName}>
                  <SelectTrigger>
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
                className="cursor-pointer"
                onClick={() => {
                  setTeamQuery("")
                  setGradeMin("all")
                  setGradeMax("all")
                  setSection("all")
                  setClassName("all")
                }}
              >
                Clear filters
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Баг</TableHead>
                  <TableHead>Спорт</TableHead>
                  <TableHead>Он</TableHead>
                  <TableHead>Анги</TableHead>
                  <TableHead>Гишүүд</TableHead>
                  <TableHead>Холбоо барих</TableHead>
                  <TableHead>Утас</TableHead>
                  <TableHead>Төлөв</TableHead>
                  <TableHead className="text-right">Үйлдэл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                      Илэрц олдсонгүй.
                    </TableCell>
                  </TableRow>
                ) : null}
                {filteredRows.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="cursor-pointer hover:underline underline-offset-4"
                        onClick={() => openDetails(req)}
                      >
                        {req.teamName}
                      </button>
                    </TableCell>
                    <TableCell>{req.sportType}</TableCell>
                    <TableCell>{req.playingYears}</TableCell>
                    <TableCell>{req.className}</TableCell>
                    <TableCell>{req.members.length}</TableCell>
                    <TableCell>{req.contactName}</TableCell>
                    <TableCell>{req.phone}</TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => openDetails(req)}
                        >
                          Detail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => approve(req.id)}
                          disabled={req.status === "approved"}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => reject(req.id)}
                          disabled={req.status === "rejected"}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => remove(req.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selected?.teamName ?? "Дэлгэрэнгүй"}</SheetTitle>
            <SheetDescription>Багийн дэлгэрэнгүй мэдээлэл</SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="grid gap-6 px-4 pb-6">
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedMembers.map((m) => (
                      <Card key={m.id} className="shadow-none">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{m.fullName}</CardTitle>
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
    </div>
  )
}

