export type { InsertCheckInSession, SelectCheckInSession } from "@/db/schema/checkin";
export type { InsertAttendanceRecord, SelectAttendanceRecord } from "@/db/schema/checkin";

export interface ApiSessionResponse {
  token: string;
  sessionId: string;
  expiresAt: Date;
}

export interface ApiCheckinSubmitResponse {
  studentName: string;
  checkedAt: string;
}

export interface ApiCheckinAlreadyResponse {
  alreadyCheckedIn: true;
  message: string;
}

export interface ApiSessionInfoResponse {
  courseId: string;
  courseName: string;
  expiresAt: Date;
}
