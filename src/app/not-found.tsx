import { NotFoundContent } from "@/components/NotFoundContent";

export default function NotFound() {
  return (
    <main
      id="main"
      className="safe-x mx-auto w-full max-w-5xl flex-1 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]"
    >
      <NotFoundContent />
    </main>
  );
}
