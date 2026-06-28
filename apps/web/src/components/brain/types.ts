import type { GraphFact } from "../BrainGraph";

export type Fact = GraphFact & { link?: { url: string; label: string } };

export type QKind = "single" | "multi" | "text" | "longtext";
export type TextField = { key: string; label: string; placeholder: string };
export type Question = {
  topic: string; // drives the chip colour header only — the LLM assigns the real fact topic
  q: string;
  kind: QKind;
  options?: string[];
  allowOther?: boolean; // single/multi: also show a free "add your own" input
  otherLabel?: string; // single/multi: a labelled follow-up text input
  fields?: TextField[]; // text: the small labelled inputs
  optional?: boolean;
};

export type Answer = { selected: string[]; other: string; fields: Record<string, string> };
export const emptyAnswer = (): Answer => ({ selected: [], other: "", fields: {} });

export type BrainResp = {
  facts?: Fact[];
  total?: number;
  byTopic?: Record<string, number>;
  account?: { username?: string };
};
