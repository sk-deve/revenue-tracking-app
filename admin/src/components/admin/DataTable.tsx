import { ReactNode } from "react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
}

export function DataTable<T>({ columns, data, keyField }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="admin-table">
        <thead>
          <tr className="bg-muted/30">
            {columns.map((column, index) => (
              <th key={index} className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={String(row[keyField])} className="transition-colors">
              {columns.map((column, index) => (
                <td key={index} className={column.className}>
                  {typeof column.accessor === "function"
                    ? column.accessor(row)
                    : (row[column.accessor] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
