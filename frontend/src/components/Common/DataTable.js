import React, { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

export default function DataTable({
  title,
  data,
  columns,
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found.',
  initialPageSize = 10,
  disablePagination = false,
}) {
  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = useMemo(() => columns || [], [columns]);

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const resolvedPageSize = disablePagination
    ? Math.max(1, safeData.length)
    : initialPageSize;

  useEffect(() => {
    if (disablePagination) {
      return;
    }

    setPagination((prev) => {
      if (prev.pageSize === resolvedPageSize) {
        return prev;
      }
      return { pageIndex: 0, pageSize: resolvedPageSize };
    });
  }, [disablePagination, resolvedPageSize]);

  const table = useReactTable({
    data: safeData,
    columns: safeColumns,
    state: {
      globalFilter,
      sorting,
      ...(disablePagination ? {} : { pagination }),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    ...(disablePagination ? {} : { onPaginationChange: setPagination }),
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(disablePagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
  });

  const totalFiltered = table.getFilteredRowModel().rows.length;

  useEffect(() => {
    if (disablePagination) {
      return;
    }
    const pageCount = table.getPageCount();
    if (pageCount > 0 && pagination.pageIndex > pageCount - 1) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [disablePagination, pagination.pageIndex, table]);

  return (
    <div className="space-y-4">
      {(title || searchPlaceholder) && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {title ? (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {totalFiltered} result{totalFiltered === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={
                        'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ' +
                        (canSort ? 'cursor-pointer select-none' : '')
                      }
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortDir === 'asc' ? <span>▲</span> : sortDir === 'desc' ? <span>▼</span> : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={safeColumns.length || 1}
                  className="px-6 py-8 text-center text-sm text-gray-600 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!disablePagination ? (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
            >
              Prev
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
