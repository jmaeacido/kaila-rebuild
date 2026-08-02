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
        height={248}
        priority={priority}
        src="/brand/kaila-wordmark.png"
        width={1102}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="themeWordmarkDark"
        height={248}
        priority={priority}
        src="/brand/kaila-wordmark-on-dark.png"
        width={1102}
      />
    </span>
  );
}
