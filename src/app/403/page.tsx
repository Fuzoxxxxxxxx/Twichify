import { Suspense } from "react";
import ForbiddenContent from "@/components/ForbiddenContent";

// useSearchParams (lecture de ?from=) exige une frontière Suspense.
export default function Forbidden() {
  return (
    <Suspense fallback={null}>
      <ForbiddenContent />
    </Suspense>
  );
}
