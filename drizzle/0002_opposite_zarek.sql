CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"course_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "students_course_id_idx" ON "students" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_course_student_unique" ON "students" USING btree ("course_id","student_id");