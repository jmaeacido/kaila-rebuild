import { BrandMark } from "../components/brand-mark";

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
      <div className="brandedLoaderBackdrop" aria-hidden="true">
        <span />
        <i />
        <i />
      </div>
      <section className="brandedLoaderCard">
        <BrandMark className="brandedLoaderLogo" priority showBull />
        <div className="brandedLoaderCopy">
        <p>{label}</p>
        </div>
        <div className="brandedLoaderRoute" aria-hidden="true">
          <span />
          <i />
          <i />
          <i />
        </div>
      </section>
    </main>
  );
}
