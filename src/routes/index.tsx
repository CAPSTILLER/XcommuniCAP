import { createFileRoute } from "@tanstack/react-router";
import { XcommuniCapApp } from "@/components/xcommunicap-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <XcommuniCapApp />;
}
