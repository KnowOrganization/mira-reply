"use client";

// Multitenancy hooks: accessible accounts, orgs, members, invitations.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type AccountRef = { accountId: string; username: string; orgId: string | null; role: string };
export type OrgRef = { orgId: string; name: string; type: string; plan: string; role: string };
export type Member = { userId: string; role: string; name: string | null; email: string | null };
export type Role = "owner" | "admin" | "agent" | "viewer";

export type Me = {
  userId: string;
  orgId: string | null;
  accountId: string | null;
  orgRole: Role | null;
  accountRole: Role | null;
  canManage: boolean;
  canAct: boolean;
};

export const tk = {
  me: ["mt", "me"] as const,
  accounts: ["mt", "accounts"] as const,
  orgs: ["mt", "orgs"] as const,
  orgMembers: (orgId: string) => ["mt", "org-members", orgId] as const,
  accountMembers: (accountId: string) => ["mt", "account-members", accountId] as const,
};

export const useMe = () => useQuery({ queryKey: tk.me, queryFn: () => api.get<Me>("/api/ig/me") });

export const useAccounts = () =>
  useQuery({ queryKey: tk.accounts, queryFn: () => api.get<{ accounts: AccountRef[] }>("/api/ig/accounts") });

export const useOrgs = () =>
  useQuery({ queryKey: tk.orgs, queryFn: () => api.get<{ orgs: OrgRef[] }>("/api/ig/orgs") });

export const useOrgMembers = (orgId: string | null) =>
  useQuery({
    queryKey: tk.orgMembers(orgId ?? ""),
    queryFn: () => api.get<{ members: Member[] }>(`/api/ig/orgs/${orgId}/members`),
    enabled: !!orgId,
  });

export const useAccountMembers = (accountId: string | null) =>
  useQuery({
    queryKey: tk.accountMembers(accountId ?? ""),
    queryFn: () => api.get<{ members: Member[] }>(`/api/ig/accounts/${accountId}/members`),
    enabled: !!accountId,
  });

export function useInviteToOrg(orgId: string) {
  return useMutation({
    mutationFn: (b: { email: string; role: Role }) => api.post<{ link: string }>(`/api/ig/orgs/${orgId}/invite`, b),
  });
}

export function useInviteToAccount(accountId: string) {
  return useMutation({
    mutationFn: (b: { email: string; role: Role }) => api.post<{ link: string }>(`/api/ig/accounts/${accountId}/invite`, b),
  });
}

export function useChangeOrgMemberRole(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { userId: string; role: Role }) => api.patch(`/api/ig/orgs/${orgId}/members/${b.userId}`, { role: b.role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tk.orgMembers(orgId) }),
  });
}

export function useRemoveOrgMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.del(`/api/ig/orgs/${orgId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: tk.orgMembers(orgId) }),
  });
}

export function useAcceptInvite() {
  return useMutation({ mutationFn: (token: string) => api.post<{ ok: boolean; kind: string }>("/api/ig/invites/accept", { token }) });
}
