import { LoginForm } from "@/components/LoginForm";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "La connexion Google n'est pas configurée (contacte un admin).",
  google_no_account: "Aucun compte n'existe pour cet email Google — demande une invitation à un admin.",
  google_failed: "La connexion Google a échoué, réessaie.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const nextParam = sp.next;
  const next = Array.isArray(nextParam) ? nextParam[0] : nextParam;
  const safeNext = next && next.startsWith("/") ? next : "/companies";

  const errorParam = sp.error;
  const errorCode = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const googleError = errorCode ? GOOGLE_ERROR_MESSAGES[errorCode] ?? "Connexion impossible." : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-sonate-cream px-4">
      <div className="w-full max-w-sm rounded-2xl border border-sonate-green/10 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-extrabold tracking-tight text-sonate-green">Sonate</p>
          <p className="mt-1 text-sm text-sonate-muted">CRM interne</p>
        </div>
        {googleError && <p className="mb-4 text-sm font-medium text-sonate-red">{googleError}</p>}
        <LoginForm next={safeNext} />

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-sonate-green/10" />
          <span className="text-xs font-semibold uppercase tracking-wide text-sonate-muted">ou</span>
          <div className="h-px flex-1 bg-sonate-green/10" />
        </div>

        <a
          href={`/api/auth/google/start?next=${encodeURIComponent(safeNext)}`}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-sonate-green/20 px-5 py-2.5 text-sm font-semibold text-sonate-green transition-colors hover:bg-sonate-green/5"
        >
          Se connecter avec Google
        </a>
      </div>
    </div>
  );
}
