import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CourseCheckIn",
  description: "Course attendance check-in system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
