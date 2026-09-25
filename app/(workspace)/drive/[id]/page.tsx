import{DriveView}from"@/components/workspace/drive-view";export default async function FolderPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <DriveView parentId={id}/>;}
