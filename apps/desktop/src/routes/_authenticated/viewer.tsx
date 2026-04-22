import { createFileRoute } from "@tanstack/react-router";
import { ViewerPage } from "@/features/viewer/pages/viewer";

export const Route = createFileRoute("/_authenticated/viewer")({
  component: ViewerPage,
});
