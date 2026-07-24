import Image from "next/image";

type BrandedLoaderProps = {
  label?: string;
};

export function BrandedLoader({
  label = "Getting your next screen ready…",
}: BrandedLoaderProps) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="brandedLoader"
      role="status"
    >
      <div className="brandedLoaderMark" aria-hidden="true">
        <span className="brandedLoaderHalo" />
        <Image
          src="/brand/kaila-app-icon.png"
          alt=""
          width={533}
          height={556}
          priority
        />
      </div>
      <div className="brandedLoaderCopy">
        <strong>KAILA</strong>
        <p>{label}</p>
      </div>
      <div className="brandedLoaderRoute" aria-hidden="true">
        <span />
        <i />
        <i />
        <i />
      </div>
    </main>
  );
}
