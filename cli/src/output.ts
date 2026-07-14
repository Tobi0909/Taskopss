import { ApiError } from './apiClient';

export function table(rows: Record<string, string>[]): void {
  if (rows.length === 0) {
    console.log('(không có dữ liệu)');
    return;
  }
  const columns = Object.keys(rows[0]);
  const widths = columns.map((col) => Math.max(col.length, ...rows.map((r) => (r[col] ?? '').length)));

  const printRow = (values: string[]) =>
    console.log(values.map((v, i) => v.padEnd(widths[i])).join('  '));

  printRow(columns);
  printRow(widths.map((w) => '-'.repeat(w)));
  for (const row of rows) {
    printRow(columns.map((col) => row[col] ?? ''));
  }
}

/** Bọc action async: in lỗi rõ ràng và thoát với exit code 1 thay vì stack trace thô. */
export function action<Args extends unknown[]>(fn: (...args: Args) => Promise<void>) {
  return async (...args: Args) => {
    try {
      await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        console.error(`Lỗi (${err.status}): ${err.message}`);
      } else if (err instanceof Error) {
        console.error(`Lỗi: ${err.message}`);
      } else {
        console.error('Lỗi không xác định', err);
      }
      process.exit(1);
    }
  };
}
