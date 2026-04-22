import { Suspense } from "react";
import { css } from "styled-system/css";
import { Box, Flex, VStack } from "styled-system/jsx";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { Navigator } from "../components/navigator";
import { PageViewer } from "../components/page-viewer";

export function ViewerPage() {
  return (
    <main
      className={css({
        display: "grid",
        gridTemplateColumns: {
          base: "1fr",
          xl: "minmax(360px, 440px) minmax(0, 1fr)",
        },
        gridTemplateRows: {
          base: "minmax(280px, 40dvh) minmax(0, 1fr)",
          xl: "minmax(0, 1fr)",
        },
        minH: 0,
      })}
    >
      <Box
        minH={0}
        borderBottom={{ base: "1px solid", xl: "none" }}
        borderRight={{ base: "none", xl: "1px solid" }}
        borderColor="border.subtle"
        bg="bg.default"
      >
        <Suspense fallback={<LoadingPanel label="保存済み教材を読み込み中" />}>
          <Navigator />
        </Suspense>
      </Box>
      <Box minH={0}>
        <Suspense fallback={<LoadingPanel label="ページを準備中" />}>
          <PageViewer />
        </Suspense>
      </Box>
    </main>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <Flex h="full" align="center" justify="center" bg="bg.canvas">
      <VStack gap="3">
        <Spinner size="md" />
        <Text color="fg.muted" fontSize="sm">
          {label}
        </Text>
      </VStack>
    </Flex>
  );
}
