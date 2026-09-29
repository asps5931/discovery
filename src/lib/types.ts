export interface Client {
  slug: string;
  name: string;
  description?: string;
}

export interface Deck {
  clientSlug: string;
  slug: string;
  name: string;
  slideCount: number;
}

export interface RequirementDoc {
  clientSlug: string;
  group: string;
  slug: string;
  name: string;
}

export interface RequirementGroup {
  clientSlug: string;
  slug: string;
  name: string;
  docs: RequirementDoc[];
}

export interface Poc {
  clientSlug: string;
  slug: string;
  name: string;
}

export interface Note {
  clientSlug: string;
  group: string;
  slug: string;
  name: string;
}

export interface NoteGroup {
  clientSlug: string;
  slug: string;
  name: string;
  notes: Note[];
}
