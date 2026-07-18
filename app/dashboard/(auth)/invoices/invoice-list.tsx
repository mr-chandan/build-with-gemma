"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ColumnsIcon,
  FileTextIcon,
  FilterIcon,
  MoreHorizontal,
  PlusCircle,
} from "lucide-react";

import { inr, formatDate } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  client: string;
  type: string;
  total: number;
  paid: number;
  balance: number;
  dueDate: string;
  status: "paid" | "sent" | "draft" | "overdue" | "cancelled" | "partial";
};

const STATUS_VARIANT = {
  paid: "success",
  sent: "secondary",
  draft: "outline",
  partial: "warning",
  overdue: "destructive",
  cancelled: "outline",
} as const;

function SortHeader({ column, label }: { column: any; label: string }) {
  return (
    <Button
      className="-ml-3"
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
      {label}
      <ArrowUpDown className="size-3" />
    </Button>
  );
}

const arrIncludes = (row: any, id: string, value: string[]) =>
  value.length === 0 || value.includes(row.getValue(id));

export const columns: ColumnDef<Invoice>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "invoiceNumber",
    header: ({ column }) => <SortHeader column={column} label="Invoice" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <figure className="bg-muted flex size-9 items-center justify-center rounded-lg border">
          <FileTextIcon className="text-muted-foreground size-4" />
        </figure>
        <div className="font-medium">{row.getValue("invoiceNumber")}</div>
      </div>
    ),
  },
  {
    accessorKey: "client",
    header: ({ column }) => <SortHeader column={column} label="Client" />,
    cell: ({ row }) => <div>{row.getValue("client")}</div>,
  },
  {
    accessorKey: "type",
    header: "Type",
    filterFn: arrIncludes,
    cell: ({ row }) => (
      <Badge variant="outline" className="uppercase">
        {row.getValue("type")}
      </Badge>
    ),
  },
  {
    accessorKey: "total",
    header: ({ column }) => <SortHeader column={column} label="Total" />,
    cell: ({ row }) => <div className="tabular-nums">{inr(row.getValue("total"))}</div>,
  },
  {
    accessorKey: "paid",
    header: ({ column }) => <SortHeader column={column} label="Paid" />,
    cell: ({ row }) => <div className="tabular-nums">{inr(row.getValue("paid"))}</div>,
  },
  {
    accessorKey: "balance",
    header: ({ column }) => <SortHeader column={column} label="Balance" />,
    cell: ({ row }) => <div className="tabular-nums">{inr(row.getValue("balance"))}</div>,
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => <SortHeader column={column} label="Due" />,
    cell: ({ row }) => (
      <div className="text-muted-foreground">{formatDate(row.getValue("dueDate"))}</div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortHeader column={column} label="Status" />,
    filterFn: arrIncludes,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="capitalize">
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>View invoice</DropdownMenuItem>
          <DropdownMenuItem>Record payment</DropdownMenuItem>
          <DropdownMenuItem>Copy number</DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

const statuses = [
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "sent", label: "Sent" },
  { value: "draft", label: "Draft" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const types = [
  { value: "b2b", label: "B2B" },
  { value: "b2c", label: "B2C" },
];

export default function InvoiceList({ data }: { data: Invoice[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  });

  const FacetFilter = ({
    columnId,
    label,
    options,
  }: {
    columnId: string;
    label: string;
    options: { value: string; label: string }[];
  }) => {
    const column = table.getColumn(columnId);
    const selected = (column?.getFilterValue() as string[]) ?? [];
    const toggle = (value: string) => {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      column?.setFilterValue(next.length ? next : undefined);
    };
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <PlusCircle />
            {label}
            {selected.length > 0 && (
              <Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal">
                {selected.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0">
          <Command>
            <CommandInput placeholder={label} className="h-9" />
            <CommandList>
              <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem key={option.value} value={option.value} onSelect={() => toggle(option.value)}>
                    <div className="flex items-center space-x-3 py-1">
                      <Checkbox checked={selected.includes(option.value)} />
                      <label className="leading-none">{option.label}</label>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const Filters = () => (
    <>
      <FacetFilter columnId="status" label="Status" options={statuses} />
      <FacetFilter columnId="type" label="Type" options={types} />
    </>
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search invoices..."
            value={(table.getColumn("invoiceNumber")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("invoiceNumber")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <div className="hidden gap-2 md:flex">
            <Filters />
          </div>
          <div className="inline md:hidden">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <FilterIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-4">
                <div className="grid space-y-2">
                  <Filters />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="ms-auto flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <span className="hidden lg:inline">Columns</span> <ColumnsIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value)}>
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
