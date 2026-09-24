import { SkHeader, SkRows } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkHeader lede={false} />
      <SkRows n={7} wide />
    </div>
  );
}
