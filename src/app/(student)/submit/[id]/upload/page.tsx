import { redirect } from "next/navigation";

// Photos are added on the same page as typed notes now (CLAUDE.md 2a.9);
// old links to /upload land there.
export default async function UploadPage({
  params,
}: PageProps<"/submit/[id]/upload">) {
  const { id } = await params;
  redirect(`/submit/${id}/questions`);
}
