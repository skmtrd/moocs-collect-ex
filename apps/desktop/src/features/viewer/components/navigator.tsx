import { useAtom, useAtomValue } from "jotai";
import { Fragment, useEffect, useMemo } from "react";
import { css, cx } from "styled-system/css";
import { Box, Divider } from "styled-system/jsx";
import {
  recordedCoursesAtom,
  recordedLecturesAtom,
  recordedPagesAtom,
  selectedRecordedCourseAtom,
  selectedRecordedLectureAtom,
  selectedRecordedPageAtom,
} from "../atoms/viewer";
import type {
  RecordedCourse,
  RecordedLecture,
  RecordedPage,
} from "../services/viewer";

function isSelectedCourse(
  selected: RecordedCourse | null,
  course: RecordedCourse,
) {
  return selected?.year === course.year && selected?.slug === course.slug;
}

function isSelectedLecture(
  selected: RecordedLecture | null,
  lecture: RecordedLecture,
) {
  return (
    selected?.year === lecture.year &&
    selected?.courseSlug === lecture.courseSlug &&
    selected?.slug === lecture.slug
  );
}

function isSelectedPage(selected: RecordedPage | null, page: RecordedPage) {
  return (
    selected?.year === page.year &&
    selected?.courseSlug === page.courseSlug &&
    selected?.lectureSlug === page.lectureSlug &&
    selected?.slug === page.slug
  );
}

export function Navigator() {
  const sections = [<CourseList key="courses" />, <LectureList key="lectures" />, <PageList key="pages" />];

  return (
    <Box
      className={css({
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr auto 1fr",
        h: "full",
        minH: 0,
      })}
    >
      {sections.map((section, index) => (
        <Fragment key={index}>
          <Section>{section}</Section>
          {index < sections.length - 1 && <Divider orientation="vertical" />}
        </Fragment>
      ))}
    </Box>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <Box
      overflowY="auto"
      minH={0}
      p="2"
      position="relative"
    >
      {children}
    </Box>
  );
}

function GroupLabel({
  label,
  first = false,
}: {
  label: string;
  first?: boolean;
}) {
  return (
    <Box
      px="3"
      pt={first ? "1" : "3"}
      pb="1"
      fontSize="xs"
      color="fg.muted"
      fontWeight="medium"
    >
      {label}
    </Box>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Box
      px="3"
      py="2"
      color="fg.muted"
      fontSize="sm"
    >
      {message}
    </Box>
  );
}

function SelectableItem({
  selected,
  onClick,
  title,
}: {
  selected?: boolean;
  onClick: () => void;
  title: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-selected={selected ? "" : undefined}
      className={cx(
        css({
          appearance: "none",
          border: "none",
          bg: "transparent",
          h: "8",
          w: "full",
          px: "3",
          display: "flex",
          alignItems: "center",
          textAlign: "left",
          rounded: "l2",
          color: "fg.default",
          cursor: "pointer",
          outline: "none",
          transitionDuration: "normal",
          transitionProperty: "background, border-color, color, box-shadow",
          transitionTimingFunction: "default",
          userSelect: "none",
          verticalAlign: "middle",
          whiteSpace: "nowrap",
          _hover: {
            bg: "bg.subtle",
          },
          "&[data-selected]": {
            bg: "gray.a3",
          },
        }),
      )}
    >
      <Box
        flex="1"
        overflow="hidden"
        textOverflow="ellipsis"
        fontSize="sm"
        fontWeight={selected ? "medium" : "normal"}
        color="fg.default"
      >
        {title}
      </Box>
    </button>
  );
}

function CourseList() {
  const courses = useAtomValue(recordedCoursesAtom);
  const [selectedCourse, setSelectedCourse] = useAtom(selectedRecordedCourseAtom);
  const [, setSelectedLecture] = useAtom(selectedRecordedLectureAtom);
  const [, setSelectedPage] = useAtom(selectedRecordedPageAtom);
  const courseGroups = useMemo(() => {
    const groups = new Map<number, RecordedCourse[]>();

    for (const course of courses) {
      const current = groups.get(course.year);
      if (current) {
        current.push(course);
      } else {
        groups.set(course.year, [course]);
      }
    }

    return [...groups.entries()].map(([year, items]) => ({
      key: year,
      label: `${year}年度`,
      items,
    }));
  }, [courses]);

  useEffect(() => {
    if (courses.length === 0) {
      if (selectedCourse !== null) {
        setSelectedCourse(null);
      }
      return;
    }

    if (!selectedCourse || !courses.some((course) => isSelectedCourse(selectedCourse, course))) {
      setSelectedCourse(courses[0]);
    }
  }, [courses, selectedCourse, setSelectedCourse]);

  if (courses.length === 0) {
    return <EmptyState message="まだローカルに保存された科目がありません" />;
  }

  return (
    <Box>
      {courseGroups.map((group, index) => (
        <Fragment key={group.key}>
          <GroupLabel label={group.label} first={index === 0} />
          {group.items.map((course) => (
            <SelectableItem
              key={`${course.year}-${course.slug}`}
              selected={isSelectedCourse(selectedCourse, course)}
              onClick={() => {
                setSelectedCourse(course);
                setSelectedLecture(null);
                setSelectedPage(null);
              }}
              title={course.name}
            />
          ))}
        </Fragment>
      ))}
    </Box>
  );
}

function LectureList() {
  const lectures = useAtomValue(recordedLecturesAtom);
  const [selectedLecture, setSelectedLecture] = useAtom(selectedRecordedLectureAtom);
  const [, setSelectedPage] = useAtom(selectedRecordedPageAtom);
  const lectureGroups = useMemo(() => {
    const groups = new Map<string, { label: string; items: RecordedLecture[] }>();

    for (const lecture of lectures) {
      const label = lecture.groupName.trim() || "未分類";
      const key = `${lecture.groupIndex}:${label}`;
      const current = groups.get(key);

      if (current) {
        current.items.push(lecture);
      } else {
        groups.set(key, { label, items: [lecture] });
      }
    }

    return [...groups.entries()].map(([key, value]) => ({
      key,
      label: value.label,
      items: value.items,
    }));
  }, [lectures]);

  useEffect(() => {
    if (lectures.length === 0) {
      if (selectedLecture !== null) {
        setSelectedLecture(null);
      }
      return;
    }

    if (
      !selectedLecture ||
      !lectures.some((lecture) => isSelectedLecture(selectedLecture, lecture))
    ) {
      setSelectedLecture(lectures[0]);
    }
  }, [lectures, selectedLecture, setSelectedLecture]);

  if (lectures.length === 0) {
    return <EmptyState message="科目を選ぶと保存済みの講義が表示されます" />;
  }

  return (
    <Box>
      {lectureGroups.map((group, index) => (
        <Fragment key={group.key}>
          <GroupLabel label={group.label} first={index === 0} />
          {group.items.map((lecture) => (
            <SelectableItem
              key={`${lecture.year}-${lecture.courseSlug}-${lecture.slug}`}
              selected={isSelectedLecture(selectedLecture, lecture)}
              onClick={() => {
                setSelectedLecture(lecture);
                setSelectedPage(null);
              }}
              title={lecture.name}
            />
          ))}
        </Fragment>
      ))}
    </Box>
  );
}

function PageList() {
  const pages = useAtomValue(recordedPagesAtom);
  const [selectedPage, setSelectedPage] = useAtom(selectedRecordedPageAtom);

  useEffect(() => {
    if (pages.length === 0) {
      if (selectedPage !== null) {
        setSelectedPage(null);
      }
      return;
    }

    if (!selectedPage || !pages.some((page) => isSelectedPage(selectedPage, page))) {
      setSelectedPage(pages[0]);
    }
  }, [pages, selectedPage, setSelectedPage]);

  if (pages.length === 0) {
    return <EmptyState message="講義を選ぶと保存済みのページが表示されます" />;
  }

  return (
    <Box>
      {pages.map((page) => (
        <SelectableItem
          key={page.key}
          selected={isSelectedPage(selectedPage, page)}
          onClick={() => setSelectedPage(page)}
          title={page.name}
        />
      ))}
    </Box>
  );
}
