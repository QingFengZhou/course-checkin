import { type SelectCourse } from "@/db/schema/courses";

export type CreateCourseInput = {
  name: string;
  semester: string;
};

export type EnrollStudentInput = {
  studentId: string;
  name: string;
};

export type CourseWithStudentCount = SelectCourse & {
  studentCount: number;
};
