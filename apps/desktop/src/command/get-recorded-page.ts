import { createCommand } from "./utils";

export type Args = {
  year: number;
  courseSlug: string;
  lectureSlug: string;
  pageSlug: string;
};

export type RecordedSlide = {
  index: number;
  pdfPath: string;
};

export type Output = {
  year: number;
  courseSlug: string;
  courseName: string;
  lectureSlug: string;
  lectureName: string;
  pageSlug: string;
  pageName: string;
  pageKey: string;
  contentHtml: string;
  contentText: string;
  slides: RecordedSlide[];
};

export const getRecordedPage = createCommand<Args, Output>("get_recorded_page");
