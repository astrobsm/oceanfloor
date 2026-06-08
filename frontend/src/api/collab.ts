/**
 * Typed API client for the Collaboration (PIN-protected share link) endpoints.
 */
import { apiGet, apiPost, apiPostWithHeaders } from "./client";

export interface ParticipantPublic {
  id: string;
  name: string;
  role: string;
  duties: string[];
  active: boolean;
  created_at: number;
  deactivated_at: number | null;
  last_seen_at: number | null;
  entries_count: number;
}

export interface ActivityPublic {
  at: number;
  participant_id: string;
  participant_name: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown> | null;
}

export interface SharePublic {
  id: string;
  project_id: string;
  project_title: string;
  created_at: number;
  active: boolean;
  allowed_steps: string[];
  participants: ParticipantPublic[];
  activity: ActivityPublic[];
}

export interface CreateShareResponse {
  share: SharePublic;
  supervisor_token: string;
}

export interface AddParticipantResponse {
  participant: ParticipantPublic;
  pin: string;
}

export interface JoinShareResponse {
  session_token: string;
  participant_id: string;
  participant_name: string;
  project_id: string;
  project_title: string;
  role: string;
  duties: string[];
  allowed_steps: string[];
}

const SUP = (token: string) => ({ "X-Supervisor-Token": token });
const SES = (token: string) => ({ "X-Session-Token": token });

export const collabApi = {
  createShare: (project_id: string, project_title: string, allowed_steps: string[]) =>
    apiPost<CreateShareResponse>("/collab/shares", {
      project_id,
      project_title,
      allowed_steps,
    }),
  publicInfo: (share_id: string) =>
    apiGet<{
      share_id: string;
      project_title: string;
      active: boolean;
      allowed_steps: string[];
    }>(`/collab/shares/${share_id}/public`),
  supervisorView: (share_id: string, token: string) =>
    apiGet<SharePublic>(`/collab/shares/${share_id}`, SUP(token)),
  addParticipant: (
    share_id: string,
    token: string,
    body: { name: string; role: string; duties: string[] }
  ) =>
    apiPostWithHeaders<AddParticipantResponse>(
      `/collab/shares/${share_id}/participants`,
      body,
      SUP(token)
    ),
  setActive: (
    share_id: string,
    participant_id: string,
    token: string,
    active: boolean
  ) =>
    apiPostWithHeaders<ParticipantPublic>(
      `/collab/shares/${share_id}/participants/${participant_id}/active`,
      { active },
      SUP(token)
    ),
  deactivateShare: (share_id: string, token: string) =>
    apiPostWithHeaders<SharePublic>(
      `/collab/shares/${share_id}/deactivate`,
      {},
      SUP(token)
    ),
  join: (share_id: string, name: string, pin: string) =>
    apiPost<JoinShareResponse>(`/collab/shares/${share_id}/join`, { name, pin }),
  logActivity: (
    share_id: string,
    session_token: string,
    kind: string,
    summary: string,
    payload?: Record<string, unknown>
  ) =>
    apiPostWithHeaders<{ at: number; kind: string; summary: string }>(
      `/collab/shares/${share_id}/activity`,
      { kind, summary, payload },
      SES(session_token)
    ),
};
