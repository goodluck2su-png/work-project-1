import * as XLSX from 'xlsx';

export interface ExcelData {
  headers: string[];
  rows: (string | number | null)[][];
  sheetName: string;
}

export const parseExcelFile = (file: File): Promise<ExcelData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheets: ExcelData[] = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, { header: 1 });

          const headers = (jsonData[0] as string[]) || [];
          const rows = jsonData.slice(1) as (string | number | null)[][];

          return { headers, rows, sheetName };
        });

        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsArrayBuffer(file);
  });
};

export const createExcelFile = (data: ExcelData[], fileName: string = 'output.xlsx'): void => {
  const workbook = XLSX.utils.book_new();

  data.forEach(({ headers, rows, sheetName }) => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  XLSX.writeFile(workbook, fileName);
};

export const transformData = (
  data: ExcelData,
  columnMapping: Record<string, string>,
  outputHeaders: string[]
): ExcelData => {
  const transformedRows = data.rows.map((row) => {
    return outputHeaders.map((header) => {
      const sourceHeader = columnMapping[header];
      if (!sourceHeader) return null;

      const sourceIndex = data.headers.indexOf(sourceHeader);
      return sourceIndex >= 0 ? row[sourceIndex] : null;
    });
  });

  return {
    headers: outputHeaders,
    rows: transformedRows,
    sheetName: data.sheetName,
  };
};
