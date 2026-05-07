import { redirect } from "next/navigation";

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthFormLoginPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp: SearchParams = searchParams ? await searchParams : {};
  const error = firstParam(sp.error);
  const next = firstParam(sp.next);

  const url = new URL("/login", "http://localhost");
  if (error) url.searchParams.set("error", error);
  if (next) url.searchParams.set("next", next);

  redirect(url.pathname + url.search);
}
