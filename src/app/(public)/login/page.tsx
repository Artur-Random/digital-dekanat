import type { Metadata } from "next";

import { ScreenStub } from "@/components/ScreenStub";

export const metadata: Metadata = { title: "Вход" };

export default function LoginPage() {
  return <ScreenStub code="S0" title="Вход" />;
}
