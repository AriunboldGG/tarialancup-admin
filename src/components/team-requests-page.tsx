"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  React.useEffect(() => {
    setRows(requests)
  }, [requests])

  const selectedMembers = selected?.members ?? []

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
            <CardTitle className="text-base">Хүсэлтийн жагсаалт</CardTitle>
          </CardHeader>
          <CardContent>
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
                {rows.map((req) => (
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

