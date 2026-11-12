import { api } from "@/lib/api";
import { Chat } from "./Chat";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const me = await api.me();
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-xl font-black">دستیار هوشمند قطعه ترب</h1>
      <Chat carTitle={me.activeVehicle?.title} />
    </div>
  );
}
