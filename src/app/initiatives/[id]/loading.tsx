import { Sk, SkPanel } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Sk className="h-4 w-40" />
      <div>
        <Sk className="h-9 w-2/3 max-w-2xl rounded-lg" />
        <Sk className="mt-2 h-4 w-full max-w-3xl" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <SkPanel lines={6} />
          <SkPanel lines={4} />
        </div>
        <div className="space-y-4">
          <SkPanel lines={3} />
          <SkPanel lines={2} />
        </div>
      </div>
    </div>
  );
}
