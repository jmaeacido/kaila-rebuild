import { notFound } from "next/navigation";
import { isStatusCode, StatusPage, type StatusCode } from "../../../components/status-page";

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ message?: string }>;
};

export function generateStaticParams(): Array<{ code: string }> {
  return ["400", "401", "403", "404", "408", "429", "500", "502", "503", "504"].map((code) => ({
    code,
  }));
}

export default async function StatusCodePage({ params, searchParams }: PageProps) {
  const { code: raw } = await params;
  const { message } = await searchParams;
  const code = Number(raw);
  if (!Number.isInteger(code) || !isStatusCode(code)) {
    notFound();
  }

  return <StatusPage code={code as StatusCode} message={message} />;
}
