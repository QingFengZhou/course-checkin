import { Suspense } from "react";
import SuccessContent from "./SuccessContent";

export default function CheckinSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
