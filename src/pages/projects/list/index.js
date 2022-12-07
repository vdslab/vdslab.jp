import { useEffect } from "react";
import { useRouter } from "next/router";

function ProjectsListPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/projects/list/1");
  });
  return <div></div>;
}

export default ProjectsListPage;
