import type { MetadataRoute } from "next";

// PWA (docs/pwa-requirements.md): без «МГПУ» в названии и на иконке.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Студкаб. Концепт кабинета студента",
    short_name: "Студкаб",
    description: "Концепт личного кабинета студента для конкурса MGIMO AI Challenge 2026.",
    lang: "ru",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Цвет плашки концепта: она верхний элемент страницы (как themeColor в layout).
    theme_color: "#fff6d6",
    background_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
