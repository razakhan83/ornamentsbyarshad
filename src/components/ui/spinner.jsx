import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={cn("animate-spin text-current", className)}
      {...props}
    />
  );
}

export { Spinner };
