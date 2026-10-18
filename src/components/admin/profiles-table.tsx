"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROFILE_STATUS_LABELS } from "@/domain/publishing";
import { normalizeTr } from "@/domain/text";
import { PROFILE_STATUSES, type ProfileStatus } from "@/domain/types";
import { PROFILE_STATUS_TONE, StatusBadge } from "./status-badge";

export type ProfileRow = {
  id: string;
  nickname: string;
  slug: string;
  location: string;
  age: number;
  status: ProfileStatus;
  moderation: "pending" | "approved" | "rejected";
  ready: boolean;
  verified: boolean;
  openReports: number;
  updatedAt: string;
  updatedLabel: string;
};

const MOD_LABEL = { pending: "Bekliyor", approved: "Onaylı", rejected: "Reddedildi" } as const;

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});
const helper = createColumnHelper<typeof features, ProfileRow>();

const columns = helper.columns([
  helper.accessor("nickname", {
    header: ({ column }) => <SortHeader label="Profil" onClick={() => column.toggleSorting()} />,
    cell: ({ row }) => (
      <Link prefetch={false} href={`/admin/profiller/${row.original.id}`} className="flex items-center gap-1.5 font-medium hover:underline">
        {row.original.nickname}
        {row.original.verified ? <BadgeCheck className="size-3.5 text-brand" aria-label="Kimlik doğrulanmış" /> : null}
      </Link>
    ),
  }),
  helper.accessor("location", { header: "Konum", meta: { desktopOnly: true }, enableSorting: false, cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span> }),
  helper.accessor("age", {
    header: ({ column }) => <SortHeader label="Yaş" onClick={() => column.toggleSorting()} />,
    meta: { desktopOnly: true },
    cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
  }),
  helper.accessor("status", {
    header: "Durum",
    cell: ({ row }) => <StatusBadge tone={PROFILE_STATUS_TONE[row.original.status]}>{PROFILE_STATUS_LABELS[row.original.status]}</StatusBadge>,
  }),
  helper.accessor("moderation", {
    header: "Moderasyon", meta: { desktopOnly: true },
    cell: ({ row }) => (
      <StatusBadge tone={row.original.moderation === "approved" ? "success" : row.original.moderation === "rejected" ? "danger" : "warning"}>
        {MOD_LABEL[row.original.moderation]}
      </StatusBadge>
    ),
  }),
  helper.accessor("ready", {
    header: "Yayın koşulları",
    cell: ({ row }) => (row.original.ready ? <StatusBadge tone="success">Tamam</StatusBadge> : <StatusBadge tone="warning">Eksik</StatusBadge>),
  }),
  helper.accessor("openReports", {
    header: "Şikâyet", meta: { desktopOnly: true },
    cell: ({ getValue }) => (getValue() ? <StatusBadge tone="danger">{getValue()}</StatusBadge> : <span className="text-muted-foreground">—</span>),
  }),
  helper.accessor("updatedAt", {
    header: ({ column }) => <SortHeader label="Güncelleme" onClick={() => column.toggleSorting()} />,
    meta: { desktopOnly: true },
    cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.updatedLabel}</span>,
  }),
]);

export function ProfilesTable({ rows, initialStatus }: { rows: ProfileRow[]; initialStatus?: string }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(initialStatus && (PROFILE_STATUSES as readonly string[]).includes(initialStatus) ? initialStatus : "all");

  const data = useMemo(() => {
    const q = normalizeTr(query);
    return rows.filter((r) => (status === "all" || r.status === status) && (!q || normalizeTr(`${r.nickname} ${r.location} ${r.slug}`).includes(q)));
  }, [rows, query, status]);

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const table = useTable({
    features,
    columns,
    data,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Takma ad, konum veya slug ara…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Profil ara" className="sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48" aria-label="Durum filtresi"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            {PROFILE_STATUSES.map((s) => <SelectItem key={s} value={s}>{PROFILE_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => <TableHead key={h.id} className={mobileClass(h.column.columnDef.meta)}>{h.isPlaceholder ? null : <table.FlexRender header={h} />}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-testid="profile-row">
                  {row.getAllCells().map((cell) => <TableCell key={cell.id} className={mobileClass(cell.column.columnDef.meta)}><table.FlexRender cell={cell} /></TableCell>)}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Sonuç yok.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data.length} profil</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Önceki</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Sonraki</Button>
        </div>
      </div>
    </div>
  );
}

function SortHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-6 items-center gap-1 rounded-sm hover:text-foreground">
      {label} <ArrowUpDown className="size-3" aria-hidden />
    </button>
  );
}

/** Mobilde yalnızca ad, durum ve yayın koşulları; ayrıntılar md ve üstünde (A-11). */
function mobileClass(meta: unknown) {
  return (meta as { desktopOnly?: boolean } | undefined)?.desktopOnly ? "hidden md:table-cell" : undefined;
}
