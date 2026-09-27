import { notFound } from "next/navigation";
import { AccountsView } from "@/components/workspace/accounts-view";
import { DriveView } from "@/components/workspace/drive-view";
import { SectionView } from "@/components/workspace/section-view";
import { workspaceSections } from "@/lib/navigation";

type Section = (typeof workspaceSections)[number];
function isSection(value: string): value is Section {
  return (workspaceSections as readonly string[]).includes(value);
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  if (section === "recent") return <DriveView scope="recent"/>;
  if (section === "starred") return <DriveView scope="starred"/>;
  if (section === "trash") return <DriveView scope="trash"/>;
  if (section === "accounts") return <AccountsView/>;
  return <SectionView section={section}/>;
}
