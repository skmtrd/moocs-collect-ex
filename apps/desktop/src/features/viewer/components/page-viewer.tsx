import { openPath } from "@tauri-apps/plugin-opener";
import { useAtomValue } from "jotai";
import { ExternalLinkIcon } from "lucide-react";
import { useTransition } from "react";
import { css } from "styled-system/css";
import { Box, Flex, HStack, VStack } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  recordedPageDetailAtom,
  selectedRecordedPageAtom,
} from "../atoms/viewer";
import { PdfSlidePreview } from "./pdf-slide-preview";

export function PageViewer() {
  const pageDetail = useAtomValue(recordedPageDetailAtom);
  const selectedPage = useAtomValue(selectedRecordedPageAtom);
  const [isPending, startTransition] = useTransition();

  if (!selectedPage) {
    return (
      <EmptyState
        title="ページを選択してください"
        description="左側のページ一覧から保存済み教材を選ぶと、ここで MOOCs のように閲覧できます。"
      />
    );
  }

  if (!pageDetail) {
    return (
      <EmptyState
        title="ローカル教材を読み込み中です"
        description="ページ情報と PDF を準備しています。"
      />
    );
  }

  const openFirstPdf = async () => {
    const firstSlide = pageDetail.slides[0];
    if (!firstSlide) {
      return;
    }
    await openPath(firstSlide.pdfPath);
  };

  return (
    <Box h="full" overflowY="auto" bg="bg.canvas">
      <Box maxW="6xl" mx="auto" px={{ base: "5", lg: "8" }} py={{ base: "5", lg: "7" }}>
        <VStack alignItems="stretch" gap="6">
          <Flex
            justify="space-between"
            align={{ base: "flex-start", lg: "center" }}
            gap="4"
            flexDirection={{ base: "column", lg: "row" }}
          >
            <VStack alignItems="stretch" gap="2">
              <Text fontSize={{ base: "2xl", lg: "3xl" }} fontWeight="semibold">
                {pageDetail.pageName}
              </Text>
              <HStack gap="2" flexWrap="wrap" color="fg.muted" fontSize="sm">
                <span>{pageDetail.year}年度</span>
                <span>/</span>
                <span>{pageDetail.courseName}</span>
                <span>/</span>
                <span>{pageDetail.lectureName}</span>
              </HStack>
            </VStack>
            <Button
              variant="subtle"
              size="sm"
              loading={isPending}
              disabled={pageDetail.slides.length === 0}
              onClick={() => {
                startTransition(async () => {
                  await openFirstPdf();
                });
              }}
            >
              PDF を開く
              <ExternalLinkIcon />
            </Button>
          </Flex>

          {pageDetail.slides.length > 0 ? (
            <VStack alignItems="stretch" gap="6">
              {pageDetail.slides.map((slide) => (
                <SlidePanel
                  key={`${pageDetail.pageKey}-${slide.index}`}
                  pageName={pageDetail.pageName}
                  slide={slide}
                  multiSlide={pageDetail.slides.length > 1}
                />
              ))}
            </VStack>
          ) : (
            <EmptyCard description="このページには保存済み PDF がありません。" />
          )}

          {hasBodyContent(pageDetail.contentHtml, pageDetail.contentText) && (
            <VStack
              alignItems="stretch"
              gap="4"
              pt="6"
              borderTop="1px solid"
              borderColor="border.subtle"
            >
              <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                本文
              </Text>
              <PageBody
                pageKey={pageDetail.pageKey}
                contentHtml={pageDetail.contentHtml}
                contentText={pageDetail.contentText}
              />
            </VStack>
          )}
        </VStack>
      </Box>
    </Box>
  );
}

function SlidePanel({
  pageName,
  slide,
  multiSlide,
}: {
  pageName: string;
  slide: { index: number; pdfPath: string };
  multiSlide: boolean;
}) {
  return (
    <VStack alignItems="stretch" gap="3">
      {multiSlide && (
        <Text fontSize="sm" color="fg.muted">
          PDF {slide.index + 1}
        </Text>
      )}
      <Box position="relative">
        <PdfSlidePreview
          path={slide.pdfPath}
          title={`${pageName} - slide ${slide.index + 1}`}
        />
      </Box>
    </VStack>
  );
}

function PageBody({
  pageKey,
  contentHtml,
  contentText,
}: {
  pageKey: string;
  contentHtml: string;
  contentText: string;
}) {
  if (contentHtml.trim()) {
    return (
      <div
        className={css({
          display: "grid",
          gap: "4",
          color: "fg.default",
          lineHeight: "1.8",
          "& p": {
            margin: 0,
          },
          "& a": {
            color: "colorPalette.fg",
            textDecoration: "underline",
            wordBreak: "break-all",
          },
          "& ul, & ol": {
            paddingInlineStart: "1.5rem",
          },
          "& li + li": {
            marginTop: "0.35rem",
          },
          "& h1, & h2, & h3, & h4": {
            fontWeight: "semibold",
            lineHeight: "1.4",
          },
          "& blockquote": {
            borderLeftWidth: "2px",
            borderLeftStyle: "solid",
            borderColor: "border.subtle",
            paddingInlineStart: "1rem",
            color: "fg.muted",
          },
          "& img": {
            maxW: "full",
            h: "auto",
          },
          "& table": {
            width: "full",
            borderCollapse: "collapse",
          },
          "& th, & td": {
            borderWidth: "1px",
            borderColor: "border.subtle",
            padding: "0.5rem 0.75rem",
          },
        })}
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    );
  }

  return (
    <VStack alignItems="stretch" gap="3">
      {contentText
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.trim().length > 0)
        .map((paragraph, index) => (
          <Text key={`${pageKey}-text-${index}`} lineHeight="1.8">
            {paragraph}
          </Text>
        ))}
    </VStack>
  );
}

function hasBodyContent(contentHtml: string, contentText: string) {
  return contentHtml.trim().length > 0 || contentText.trim().length > 0;
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Flex h="full" align="center" justify="center" bg="bg.canvas" px="8">
      <VStack gap="3" textAlign="center" maxW="lg">
        <Text fontSize="2xl" fontWeight="semibold">
          {title}
        </Text>
        <Text color="fg.muted">{description}</Text>
      </VStack>
    </Flex>
  );
}

function EmptyCard({ description }: { description: string }) {
  return (
    <Box
      p="5"
      rounded="l2"
      border="1px dashed"
      borderColor="border.subtle"
      color="fg.muted"
      bg="bg.canvas"
      fontSize="sm"
    >
      {description}
    </Box>
  );
}
