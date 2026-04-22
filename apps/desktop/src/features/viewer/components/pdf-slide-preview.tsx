import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useMemo, useRef, useState } from "react";
import { css } from "styled-system/css";
import { Box, Flex, VStack } from "styled-system/jsx";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { readLocalFileBytes } from "@/command/read-local-file-bytes";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "Unknown error";
}

type Status = "loading" | "ready" | "error";

export function PdfSlidePreview({
  path,
  title,
}: {
  path: string;
  title: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{
    cancel: () => void;
    promise: Promise<unknown>;
  } | null>(null);

  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(
    null,
  );
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [reason, setReason] = useState<string | null>(null);
  const stablePath = useMemo(() => path, [path]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }

    const measure = () => {
      setContainerWidth(element.clientWidth);
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;
    let nextDocument: PDFDocumentProxy | null = null;

    setStatus("loading");
    setReason(null);
    setDocumentProxy(null);
    setPageCount(0);
    setCurrentPage(1);

    const load = async () => {
      try {
        const data = await readLocalFileBytes(stablePath);
        if (cancelled) {
          return;
        }

        loadingTask = getDocument({ data });
        nextDocument = await loadingTask.promise;
        if (cancelled) {
          await nextDocument.destroy();
          return;
        }

        setDocumentProxy(nextDocument);
        setPageCount(nextDocument.numPages);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = errorMessage(error);
        console.error("Viewer pdf load error:", message);
        setStatus("error");
        setReason(message);
      }
    };

    void load();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      loadingTask?.destroy();
      if (nextDocument) {
        void nextDocument.destroy();
      }
    };
  }, [stablePath]);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current || containerWidth === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      setStatus("error");
      setReason("canvas 初期化に失敗しました。");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setReason(null);

    const render = async () => {
      try {
        const page = await documentProxy.getPage(currentPage);
        if (cancelled) {
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.max(containerWidth - 32, 320) / baseViewport.width;
        const viewport = page.getViewport({ scale: fitScale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderTaskRef.current?.cancel();
        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = errorMessage(error);
        if (message.toLowerCase().includes("cancel")) {
          return;
        }

        console.error("Viewer pdf render error:", message);
        setStatus("error");
        setReason(message);
      }
    };

    void render();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [containerWidth, currentPage, documentProxy]);

  const handleViewerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!documentProxy || pageCount <= 1 || status !== "ready") {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left;
    const goNext = offsetX >= bounds.width / 2;

    setCurrentPage((prev) => {
      if (goNext) {
        return Math.min(pageCount, prev + 1);
      }
      return Math.max(1, prev - 1);
    });
  };

  return (
    <Box
      ref={wrapperRef}
      onClick={handleViewerClick}
      className={css({
        position: "relative",
        bg: "white",
        rounded: "l1",
        overflow: "auto",
        border: "1px solid",
        borderColor: "border.subtle",
        minH: "24rem",
        maxH: "75vh",
        p: "4",
        cursor: pageCount > 1 ? "pointer" : "default",
      })}
    >
      <Flex justify="center">
        <canvas
          ref={canvasRef}
          aria-label={title}
          className={css({
            display: status === "error" ? "none" : "block",
            maxW: "none",
            bg: "white",
            boxShadow: "md",
          })}
        />
      </Flex>
      {pageCount > 0 && (
        <Box
          position="absolute"
          right="4"
          bottom="4"
          px="2.5"
          py="1"
          rounded="full"
          bg="rgba(255, 255, 255, 0.92)"
          border="1px solid"
          borderColor="border.subtle"
          boxShadow="sm"
        >
          <Text fontSize="sm" color="fg.default">
            {currentPage} / {pageCount}
          </Text>
        </Box>
      )}
      {status !== "ready" && (
        <Flex
          position="absolute"
          inset={0}
          align="center"
          justify="center"
          bg="rgba(255, 255, 255, 0.92)"
          px="6"
        >
          {status === "loading" ? (
            <VStack gap="3">
              <Spinner size="md" />
              <Text color="fg.muted" fontSize="sm">
                PDF を読み込み中です
              </Text>
            </VStack>
          ) : (
            <VStack gap="2" textAlign="center" maxW="md">
              <Text fontWeight="medium">PDF を表示できませんでした</Text>
              {reason ? (
                <Text color="fg.muted" fontSize="sm">
                  {reason}
                </Text>
              ) : null}
            </VStack>
          )}
        </Flex>
      )}
    </Box>
  );
}
