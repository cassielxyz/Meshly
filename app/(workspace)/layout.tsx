import { DriveShell } from "@/components/workspace/drive-shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <DriveShell>{children}</DriveShell>;
}
