import type { Term } from "@trustgraph/client";

export const OFFICE = "http://example.org/ontology/office#";
export const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
export const FOAF_THUMBNAIL = "http://xmlns.com/foaf/0.1/thumbnail";

export const iri = (id: string): Term => ({ t: "i", i: id });
export const officeIri = (name: string): Term => iri(`${OFFICE}${name}`);
export const labelPred: Term = iri(RDFS_LABEL);
export const rdfType: Term = iri(RDF_TYPE);
export const thumbnailPred: Term = iri(FOAF_THUMBNAIL);

export type EntityKind =
  | "Person" | "Role" | "Team" | "Department"
  | "Service" | "Process" | "ApprovalStep" | "Channel"
  | "Unknown";

export type Route =
  | "service-ownership" | "role-tooling" | "spend-approval"
  | "escalation" | "general";

export interface TriageResult {
  route: Route;
  entity: string;
  amount?: number;
}

export interface ProcessStep {
  stepName: string;
  spendLimit: number;
  approverRole: string;
  approverNames: string[];
}

export interface ProcessData {
  processName: string;
  steps: ProcessStep[];
  amount?: number;
}

export interface Message {
  id: string;
  role: "user" | "bot" | "detail";
  text: string;
  triage?: TriageResult;
  entityUris?: string[];
  detailUri?: string;
  processes?: ProcessData[];
  status: "done" | "triaging" | "searching" | "answering" | "error";
  error?: string;
}
