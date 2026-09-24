import { Sk, SkHeader, SkPanel, SkRows } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkHeader />
      <div className="flex gap-1.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Sk key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      {/* The podium, at the heights it settles to. */}
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {[72, 118, 54].map((h, i) => (
          <div key={i} className="flex w-full max-w-[10rem] flex-col items-center">
            <Sk className="h-7 w-7 rounded-full" />
            <Sk className="mt-1 h-4 w-20" />
            <Sk className="mt-1 h-6 w-12" />
            <span className="sk mt-1.5 block w-full rounded-t-lg" style={{ height: h }} aria-hidden />
          </div>
        ))}
      </div>
      <SkRows n={5} wide />
      <SkPanel lines={4} />
    </div>
  );
}
