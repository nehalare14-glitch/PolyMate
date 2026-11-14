"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  LoaderCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PDFViewerProps = {
  url: string;
  title?: string;
};

export default function PDFViewer(props: PDFViewerProps) {
  return <PDFViewerContent key={props.url} {...props} />;
}

function PDFViewerContent({
  url,
  title = "PDF Document",
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const pageRefs = useRef<Map<number, HTMLDivElement>>(
    new Map()
  );

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(320);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(
        Math.max(
          100,
          Math.min(1100, Math.floor(entry.contentRect.width) - 4)
        )
      );
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  function goToPage(page: number) {
    const target = Math.max(1, Math.min(numPages, page));

    const element = pageRefs.current.get(target);

    if (element) {
      element.scrollIntoView({
        behavior: "auto",
        block: "start",
      });

      setPageNumber(target);
    }
  }

  function updateCurrentPage() {
    const container = containerRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();

    const center =
      bounds.top + container.clientHeight / 2;

    let closest = 1;
    let distance = Infinity;

    pageRefs.current.forEach((element, number) => {
      const rect = element.getBoundingClientRect();

      const currentDistance = Math.abs(
        rect.top + rect.height / 2 - center
      );

      if (currentDistance < distance) {
        closest = number;
        distance = currentDistance;
      }
    });

    setPageNumber(closest);
  }

  const buttonClass =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg " +
    "hover:bg-slate-200 disabled:opacity-40 " +
    "dark:hover:bg-slate-700";

  return (
    <div
      aria-label={title}
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-100 dark:bg-slate-950"
    >
      {/* PDF toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-1 border-b border-slate-200 bg-white p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">

        <button
          type="button"
          className={buttonClass}
          aria-label="Previous page"
          disabled={pageNumber <= 1}
          onClick={() => goToPage(pageNumber - 1)}
        >
          <ChevronLeft size={20} />
        </button>

        <span className="min-w-14 text-center text-sm font-semibold">
          {numPages ? `${pageNumber} / ${numPages}` : "..."}
        </span>

        <button
          type="button"
          className={buttonClass}
          aria-label="Next page"
          disabled={!numPages || pageNumber >= numPages}
          onClick={() => goToPage(pageNumber + 1)}
        >
          <ChevronRight size={20} />
        </button>

        <span className="mx-1 hidden h-6 w-px bg-slate-300 sm:block dark:bg-slate-700" />

        <button
          type="button"
          className={buttonClass}
          aria-label="Zoom out"
          disabled={zoom <= 0.75}
          onClick={() =>
            setZoom((z) => Math.max(0.75, z - 0.25))
          }
        >
          <ZoomOut size={20} />
        </button>

        <button
          type="button"
          className="min-h-10 min-w-12 rounded-lg px-1 py-2 text-sm font-semibold"
          aria-label="Reset zoom"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          className={buttonClass}
          aria-label="Zoom in"
          disabled={zoom >= 3}
          onClick={() =>
            setZoom((z) => Math.min(3, z + 0.25))
          }
        >
          <ZoomIn size={20} />
        </button>

        <button
          type="button"
          className={buttonClass}
          aria-label="Fit page to width"
          onClick={() => setZoom(1)}
        >
          <RotateCcw size={17} />
        </button>
      </div>

      {/* Continuous vertical PDF document */}
      <div
        ref={containerRef}
        onScroll={updateCurrentPage}
        className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-4"
      >
        {error ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-slate-600 dark:text-slate-300">
            <AlertCircle size={32} />

            <p className="font-semibold">
              Unable to display PDF
            </p>

            <p className="break-all text-sm">
              {error}
            </p>

            <p className="text-sm">
              Please close the preview and try again.
            </p>
          </div>
        ) : (
          <Document
            key={url}
            file={url}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setPageNumber(1);
            }}
            onLoadError={(err) => setError(err.message)}
            loading={
              <div className="flex flex-col items-center gap-3 p-10 text-slate-500">
                <LoaderCircle
                  className="animate-spin"
                  size={28}
                />
                <span className="text-sm">
                  Loading PDF...
                </span>
              </div>
            }
          >
            <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4 pb-6">

              {Array.from(
                { length: numPages },
                (_, index) => index + 1
              ).map((number) => (
                <div
                  key={number}
                  ref={(element) => {
                    if (element) {
                      pageRefs.current.set(number, element);
                    } else {
                      pageRefs.current.delete(number);
                    }
                  }}
                  className="scroll-mt-2"
                >
                  <div className="overflow-hidden bg-white shadow-md">

                    <Page
                      pageNumber={number}
                      width={width}
                      scale={zoom}
                      devicePixelRatio={
                        Math.min(
                          typeof window !== "undefined"
                            ? Math.max(1.5, window.devicePixelRatio)
                            : 1.5,
                          2
                        )
                      }
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      onRenderError={(err) =>
                        setError(err.message)
                      }
                      loading={
                        <div className="p-8 text-center text-sm text-slate-500">
                          Rendering page {number}...
                        </div>
                      }
                    />

                  </div>

                  <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                    Page {number} of {numPages}
                  </p>
                </div>
              ))}

            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
