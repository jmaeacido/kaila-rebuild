import Image from "next/image";

export function ThemeWordmark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={className} data-theme-wordmark>
      <Image
        alt="KAILA"
        className="themeWordmarkLight"
        height={526}
        priority={priority}
        src="/brand/kaila-wordmark-bull-v1.png"
        width={2023}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="themeWordmarkDark"
        height={526}
        priority={priority}
        src="/brand/kaila-wordmark-bull-v1-on-dark.png"
        width={2023}
      />
    </span>
  );
}
