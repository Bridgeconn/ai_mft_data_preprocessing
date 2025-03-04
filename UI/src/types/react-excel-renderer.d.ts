declare module "react-excel-renderer" {
  export interface ExcelRendererResponse {
    rows: any[][];
    cols: any[];
  }

  export type ExcelRendererCallback = (
    err: Error | null,
    resp: ExcelRendererResponse
  ) => void;

  export function ExcelRenderer(
    file: File,
    callback: ExcelRendererCallback
  ): void;
}
