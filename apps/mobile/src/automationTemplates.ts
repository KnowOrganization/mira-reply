import type { AutomationNode, AutomationTrigger } from '@shaiz/shared';
import type { IconName } from './components/Icon';
import type { ChipTone } from './components/primitives';

// Prebuilt automation templates (mirrors web's TEMPLATES in AutomationsView.tsx).
// Shared by the templates gallery (app/templates.tsx) and the builder's draft
// mode (app/flow/[id].tsx — /flow/new?template=<id>). No templates table in the
// backend; creation is draft-first: nothing is POSTed until the user saves.

export type TemplateDef = {
  id: string;
  name: string;
  desc: string;
  icon: IconName;
  chips: { label: string; tone: ChipTone }[];
  trigger: AutomationTrigger;
  nodes: Omit<AutomationNode, 'id'>[];
};

const POS = { x: 0, y: 0 };

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'welcome-dm',
    name: 'Welcome DM',
    desc: 'Greet new commenters and open the conversation in DMs.',
    icon: 'message',
    chips: [
      { label: 'Comment', tone: 'grey' },
      { label: 'Opening message', tone: 'accent' },
      { label: 'Follow-up', tone: 'grey' },
    ],
    trigger: { type: 'comment_post', keywords: [], postIds: [] },
    // AI nodes carry no literal text — Mira writes the copy at send time.
    nodes: [
      { type: 'comment_reply', position: POS, data: {} },
      { type: 'opening_message', position: POS, data: {} },
      { type: 'followup_message', position: POS, data: { delayMinutes: 60 } },
    ],
  },
  {
    id: 'giveaway',
    name: 'Giveaway',
    desc: 'Capture entrants from a comment trigger and confirm their entry by DM.',
    icon: 'sparkle',
    chips: [
      { label: 'Comment', tone: 'grey' },
      { label: 'Follow gate', tone: 'warm' },
      { label: 'Giveaway', tone: 'accent' },
      { label: 'Entry #', tone: 'done' },
    ],
    trigger: { type: 'comment_post', keywords: [], postIds: [] },
    nodes: [
      { type: 'comment_reply', position: POS, data: {} },
      { type: 'follow_gate', position: POS, data: {} },
      { type: 'giveaway', position: POS, data: { text: "You're entered! Good luck 🍀", showEntryNumber: true } },
    ],
  },
  {
    id: 'faq-auto-reply',
    name: 'FAQ auto-reply',
    desc: 'Answer common questions automatically with a public reply.',
    icon: 'inbox',
    chips: [
      { label: 'Comment', tone: 'grey' },
      { label: 'Comment reply', tone: 'accent' },
    ],
    trigger: { type: 'comment_post', keywords: [], postIds: [] },
    nodes: [
      { type: 'comment_reply', position: POS, data: {} },
    ],
  },
  {
    id: 'discount-code-drop',
    name: 'Discount code drop',
    desc: 'Hand out a unique single-use code from a pool when someone comments.',
    icon: 'flows',
    chips: [
      { label: 'Comment', tone: 'grey' },
      { label: 'Discount code', tone: 'accent' },
      { label: 'DM', tone: 'grey' },
    ],
    trigger: { type: 'comment_post', keywords: [], postIds: [] },
    nodes: [
      { type: 'comment_reply', position: POS, data: {} },
      { type: 'discount_code', position: POS, data: { codePool: [], outOfCodesText: "We're out of codes for now — check back soon!" } },
    ],
  },
  {
    id: 'lead-capture',
    name: 'Lead capture',
    desc: 'Ask a qualifying question, gate on follow, and collect a lead form.',
    icon: 'user',
    chips: [
      { label: 'DM', tone: 'grey' },
      { label: 'Follow gate', tone: 'warm' },
      { label: 'Lead form', tone: 'accent' },
    ],
    trigger: { type: 'dm', keywords: [], postIds: [] },
    nodes: [
      { type: 'follow_gate', position: POS, data: {} },
      { type: 'lead_form', position: POS, data: { question: "What's the best email to reach you at?" } },
    ],
  },
];
