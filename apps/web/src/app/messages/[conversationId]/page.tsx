import { redirect } from "next/navigation";

export default function LegacyDirectConversationPage() {
  redirect("/messages");
}
