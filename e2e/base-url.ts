/** Адрес приложения для e2e и скриншотов. По умолчанию локальный dev-сервер. */
export const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
