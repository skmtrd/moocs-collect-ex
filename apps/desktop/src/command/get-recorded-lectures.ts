import { createCommand } from "./utils";

export type Args = {
  year: number;
  courseSlug: string;
};

export type Output = {
  year: number;
  courseSlug: string;
  slug: string;
  name: string;
  index: number;
  groupName: string;
  groupIndex: number;
}[];

export const getRecordedLectures = createCommand<Args, Output>(
  "get_recorded_lectures",
);
