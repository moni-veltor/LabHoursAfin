import { SkHeader, SkPanel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkHeader />
      <div className="grid gap-4 sm:grid-cols-2">
        <SkPanel lines={4} />
        <SkPanel lines={4} />
      </div>
      <SkPanel lines={6} />
    </div>
  );
}
