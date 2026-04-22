import { createCommand } from "./utils";

export type Args = {
  year: number;
  courseSlug: string;
  lectureSlug: string;
};

export type Output = {
  year: number;
  courseSlug: string;
  lectureSlug: string;
  slug: string;
  name: string;
  key: string;
  index: number;
  slideCount: number;
  hasContent: boolean;
}[];

export const getRecordedPages = createCommand<Args, Output>(
  "get_recorded_pages",
);
