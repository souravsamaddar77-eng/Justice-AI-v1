export class CaseRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function caseRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers:
      options.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new CaseRequestError(
      data.error ||
        data.message ||
        "The request could not be completed. Please try again.",
      response.status,
    );
  return data as T;
}

export function caseDate(value?: string | null) {
  if (!value) return "No date recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function caseError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export function safeCaseReturnPath(value: string | null, origin: string) {
  try {
    const target = new URL(value || "/cases", origin);
    return target.origin === origin
      ? `${target.pathname}${target.search}${target.hash}`
      : "/cases";
  } catch {
    return "/cases";
  }
}

export interface CaseSession {
  configured: boolean;
  authConfigured: boolean;
  user: { id: string; email: string } | null;
  setupMessage?: string;
}
