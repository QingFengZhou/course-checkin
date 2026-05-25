/**
 * Compilation-test: verifies checkin schema and types are correctly exported.
 * This file imports from the yet-to-be-created schema — it MUST fail
 * TypeScript compilation until checkin.ts + checkin-types.ts exist.
 */
import { checkInSessions, attendanceRecords } from "@/db/schema/checkin";
import type {
  InsertCheckInSession,
  SelectCheckInSession,
  InsertAttendanceRecord,
  SelectAttendanceRecord,
} from "@/lib/checkin-types";
import type { PgTable } from "drizzle-orm/pg-core";

// Type-level assertions: these must compile for the schema to be correct.
type AssertTable<T> = T extends PgTable<infer TableConfig> ? true : never;

// checkInSessions must be a PgTable
type _T1 = AssertTable<typeof checkInSessions>;

// attendanceRecords must be a PgTable
type _T2 = AssertTable<typeof attendanceRecords>;

// Insert types must be assignable to their respective tables
type _InsertSessionIsValid = InsertCheckInSession extends Record<string, unknown> ? true : never;
type _SelectSessionIsValid = SelectCheckInSession extends Record<string, unknown> ? true : never;
type _InsertAttendanceIsValid = InsertAttendanceRecord extends Record<string, unknown> ? true : never;
type _SelectAttendanceIsValid = SelectAttendanceRecord extends Record<string, unknown> ? true : never;
