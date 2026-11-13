"use client";

import dynamic from "next/dynamic";

const PDFViewer = dynamic(
  () => import("./PDFViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-slate-500">
        Loading PDF viewer...
      </div>
    ),
  }
);

export default PDFViewer;
