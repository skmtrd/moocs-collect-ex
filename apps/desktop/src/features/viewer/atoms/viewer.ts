import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import {
  getRecordedCourses,
  getRecordedLectures,
  getRecordedPage,
  getRecordedPages,
  type RecordedCourse,
  type RecordedLecture,
  type RecordedPage,
} from "../services/viewer";

const viewerRefreshTokenAtom = atom(0);

export const refreshViewerAtom = atom(null, (get, set) => {
  set(viewerRefreshTokenAtom, get(viewerRefreshTokenAtom) + 1);
});

const internalRecordedCoursesAtom = atom((get) => {
  get(viewerRefreshTokenAtom);
  return getRecordedCourses();
});

export const recordedCoursesAtom = unwrap(internalRecordedCoursesAtom, () => []);

export const selectedRecordedCourseAtom = atom<RecordedCourse | null>(null);

const internalRecordedLecturesAtom = atom((get) => {
  get(viewerRefreshTokenAtom);
  const course = get(selectedRecordedCourseAtom);
  return course ? getRecordedLectures(course) : Promise.resolve([]);
});

export const recordedLecturesAtom = unwrap(internalRecordedLecturesAtom, () => []);

export const selectedRecordedLectureAtom = atom<RecordedLecture | null>(null);

const internalRecordedPagesAtom = atom((get) => {
  get(viewerRefreshTokenAtom);
  const lecture = get(selectedRecordedLectureAtom);
  return lecture ? getRecordedPages(lecture) : Promise.resolve([]);
});

export const recordedPagesAtom = unwrap(internalRecordedPagesAtom, () => []);

export const selectedRecordedPageAtom = atom<RecordedPage | null>(null);

const internalRecordedPageDetailAtom = atom((get) => {
  get(viewerRefreshTokenAtom);
  const page = get(selectedRecordedPageAtom);
  return page ? getRecordedPage(page) : Promise.resolve(null);
});

export const recordedPageDetailAtom = unwrap(
  internalRecordedPageDetailAtom,
  () => null,
);
