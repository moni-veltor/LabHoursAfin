import { SkHeader, SkPanel, SkRows } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkHeader />
      <SkPanel lines={2} />
      <SkRows n={5} wide />
    </div>
  );
}
