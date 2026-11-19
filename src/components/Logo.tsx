/**
 * Логотип «Студкаб» (собственный, не связан с логотипом МГПУ). Два файла под фон темы:
 * logo-light — тёмный текст для светлого фона, logo-dark — светлый для тёмного (globals.css).
 */
export function Logo({ size = "header" }: { size?: "header" | "large" }) {
  const height = size === "large" ? "h-12" : "h-9";
  return (
    <span className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG из public, оптимизация не нужна */}
      <img
        src="/brand/studcab-logo-light.svg"
        alt="Студкаб"
        width={291}
        height={100}
        className={`logo-for-light ${height} w-auto`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- то же для тёмной темы */}
      <img
        src="/brand/studcab-logo-dark.svg"
        alt="Студкаб"
        width={291}
        height={100}
        className={`logo-for-dark ${height} w-auto`}
      />
    </span>
  );
}
