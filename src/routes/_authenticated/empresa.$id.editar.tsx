import { createFileRoute } from "@tanstack/react-router";
import { ProjectForm } from "./empresa.nuevo";

export const Route = createFileRoute("/_authenticated/empresa/$id/editar")({
  component: () => <ProjectForm mode="edit" />,
});
