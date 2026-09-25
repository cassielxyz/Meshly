import { notFound } from "next/navigation";
import { SectionView } from "@/components/workspace/section-view";
import { workspaceSections } from "@/lib/navigation";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(workspaceSections as readonly string[]).includes(section)) notFound();
  return <SectionView section={section} />;
}
