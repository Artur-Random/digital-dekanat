import type { Metadata } from "next";

import { ScreenStub } from "@/components/ScreenStub";
import { requireStudent } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Главная" };

export default async function StudentHomePage() {
  await requireStudent();
  return <ScreenStub title="Главная" />;
}
