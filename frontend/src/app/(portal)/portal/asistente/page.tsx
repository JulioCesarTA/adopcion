import { PageHeader } from "@/components/layout/page-header";
import { ChatPanel } from "@/components/public/chat-panel";

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="Asistente virtual"
        description="Pregunta sobre adopción, vacunas, horarios o tenencia responsable."
      />
      <div className="mx-auto flex h-[min(680px,70vh)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ChatPanel className="flex-1" />
      </div>
    </>
  );
}
