import type { Metadata } from "next";

import { ScreenStub } from "@/components/ScreenStub";

export const metadata: Metadata = { title: "Главная" };

// TODO(задание 2): requireStudent() перед рендером.
export default function StudentHomePage() {
  return <ScreenStub code="S1" title="Главная" />;
}
