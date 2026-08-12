declare module 'html2pdf.js' {
  export interface Html2PdfOptions {
    margin?: number | number[] | [number, number, number, number] | [number, number];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: { scale?: number; useCORS?: boolean; logging?: boolean; [key: string]: any };
    jsPDF?: { unit?: string; format?: string | number[]; orientation?: 'portrait' | 'landscape' | string; [key: string]: any };
  }

  export interface Html2PdfWorker {
    from(element: HTMLElement | string): Html2PdfWorker;
    set(options: Html2PdfOptions): Html2PdfWorker;
    save(): Promise<void>;
    outputPdf(type?: string, params?: any): Promise<any>;
  }

  function html2pdf(): Html2PdfWorker;
  function html2pdf(element: HTMLElement | string, options?: Html2PdfOptions): Html2PdfWorker;

  export default html2pdf;
}
