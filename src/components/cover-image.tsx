type Props = {
  src: string | null;
  alt: string;
  className?: string;
  height?: number;
};

export function CoverImage({ src, alt, className, height = 200 }: Props) {
  if (!src) return null;
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-raised ${className ?? ""}`}
      style={{ height }}
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
  );
}
