import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const nextParam = sp.next;
  const next = Array.isArray(nextParam) ? nextParam[0] : nextParam;

  return (
    <div className="flex min-h-screen items-center justify-center bg-sonate-cream px-4">
      <div className="w-full max-w-sm rounded-2xl border border-sonate-green/10 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-extrabold tracking-tight text-sonate-green">Sonate</p>
          <p className="mt-1 text-sm text-sonate-muted">CRM interne</p>
        </div>
        <LoginForm next={next && next.startsWith("/") ? next : "/companies"} />
      </div>
    </div>
  );
}
