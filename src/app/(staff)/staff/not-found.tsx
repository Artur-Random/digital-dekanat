import { NotFoundContent } from "@/components/NotFoundContent";

// Рендерится внутри layout сотрудника, у которого уже есть <main>.
export default function StaffNotFound() {
  return <NotFoundContent homeHref="/staff" />;
}
