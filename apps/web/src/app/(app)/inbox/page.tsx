import { redirect } from "next/navigation";

export default function InboxRoot() {
  redirect("/inbox/dms");
}
