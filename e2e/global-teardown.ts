import { clearDemoLoginAttempts } from "./global-setup";

export default async function globalTeardown(): Promise<void> {
  await clearDemoLoginAttempts();
}
