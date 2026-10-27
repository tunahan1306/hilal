import type { Metadata } from "next";
import { requireUser } from "@/server/auth/user-session";
import { getRepository } from "@/server/repositories";
import { isAgeVerified } from "@/domain/identity";
import { AccountPanel } from "./account-panel";

export const metadata: Metadata = { title: "Hesabım" };

export default async function AccountPage() {
  const user = await requireUser();
  const checks = await getRepository().listAgeVerificationChecks(user.id);
  return <AccountPanel user={user} ageVerified={isAgeVerified(checks)} />;
}
