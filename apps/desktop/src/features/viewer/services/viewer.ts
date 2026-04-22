import {
  getRecordedCourses as getRecordedCoursesCommand,
  type RecordedCourse,
} from "@/command/get-recorded-courses";
import {
  getRecordedLectures as getRecordedLecturesCommand,
  type Output as RecordedLectures,
} from "@/command/get-recorded-lectures";
import {
  getRecordedPage as getRecordedPageCommand,
  type Output as RecordedPageDetail,
} from "@/command/get-recorded-page";
import {
  getRecordedPages as getRecordedPagesCommand,
  type Output as RecordedPages,
} from "@/command/get-recorded-pages";

export type RecordedLecture = RecordedLectures[number];
export type RecordedPage = RecordedPages[number];
export type { RecordedCourse, RecordedPageDetail };

function viewerErrorMessage(error: unknown, scope: string) {
  const reason =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";
  console.error(`Viewer ${scope} error:`, reason);
}

export async function getRecordedCourses(): Promise<RecordedCourse[]> {
  try {
    return await getRecordedCoursesCommand();
  } catch (error) {
    viewerErrorMessage(error, "courses");
    return [];
  }
}

export async function getRecordedLectures(
  course: RecordedCourse,
): Promise<RecordedLecture[]> {
  try {
    return await getRecordedLecturesCommand({
      year: course.year,
      courseSlug: course.slug,
    });
  } catch (error) {
    viewerErrorMessage(error, "lectures");
    return [];
  }
}

export async function getRecordedPages(
  lecture: RecordedLecture,
): Promise<RecordedPage[]> {
  try {
    return await getRecordedPagesCommand({
      year: lecture.year,
      courseSlug: lecture.courseSlug,
      lectureSlug: lecture.slug,
    });
  } catch (error) {
    viewerErrorMessage(error, "pages");
    return [];
  }
}

export async function getRecordedPage(
  page: RecordedPage,
): Promise<RecordedPageDetail | null> {
  try {
    return await getRecordedPageCommand({
      year: page.year,
      courseSlug: page.courseSlug,
      lectureSlug: page.lectureSlug,
      pageSlug: page.slug,
    });
  } catch (error) {
    viewerErrorMessage(error, "page detail");
    return null;
  }
}
