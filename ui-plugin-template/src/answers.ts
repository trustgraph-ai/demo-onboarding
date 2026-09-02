import type { Triple, Term } from "@trustgraph/client";
import { iri, officeIri, labelPred, rdfType, OFFICE } from "./types";
import type { TriageResult, EntityKind, ProcessData } from "./types";

export interface AnswerResult {
  text: string;
  entityUris: string[];
  processes?: ProcessData[];
}

export interface FlowApi {
  triplesQuery: (s?: Term, p?: Term, o?: Term, limit?: number, collection?: string) => Promise<Triple[]>;
  graphRag: (text: string) => Promise<string>;
  graphRagStreaming: (
    text: string,
    receiver: (chunk: string, complete: boolean) => void,
    onError: (error: string) => void,
    options?: Record<string, unknown>,
    collection?: string,
  ) => void;
  embeddings: (texts: string[]) => Promise<number[][]>;
  graphEmbeddingsQuery: (vec: number[], limit: number) => Promise<Array<{ entity: Term | null; score: number }>>;
  textCompletion: (system: string, text: string) => Promise<string>;
}

type Socket = FlowApi;

async function getLabel(uri: string, socket: Socket): Promise<string> {
  const triples = await socket.triplesQuery(iri(uri), labelPred, undefined, 1);
  if (triples.length > 0 && triples[0].o.t === "l") return triples[0].o.v;
  return uri.split("#").pop() || uri;
}

async function getEntityKind(uri: string, socket: Socket): Promise<EntityKind> {
  const triples = await socket.triplesQuery(iri(uri), rdfType, undefined, 5);
  for (const t of triples) {
    if (t.o.t === "i" && t.o.i.startsWith(OFFICE)) {
      return t.o.i.slice(OFFICE.length) as EntityKind;
    }
  }
  return "Unknown";
}

async function findEntities(text: string, socket: Socket, limit = 8): Promise<string[]> {
  const vecs = await socket.embeddings([text]);
  if (!vecs || vecs.length === 0) return [];
  const matches = await socket.graphEmbeddingsQuery(vecs[0], limit);
  return matches
    .filter((m) => m.entity && m.entity.t === "i")
    .map((m) => (m.entity as Extract<Term, { t: "i" }>).i);
}

async function findEntitiesOfKind(
  text: string, kind: EntityKind, socket: Socket,
): Promise<string[]> {
  const uris = await findEntities(text, socket, 15);
  const results: string[] = [];
  await Promise.all(
    uris.map(async (uri) => {
      const k = await getEntityKind(uri, socket);
      if (k === kind) results.push(uri);
    }),
  );
  return results;
}

async function getRelatedUris(
  entityUri: string, predicate: string, direction: "out" | "in", socket: Socket,
): Promise<string[]> {
  const s = direction === "out" ? iri(entityUri) : undefined;
  const o = direction === "in" ? iri(entityUri) : undefined;
  const triples = await socket.triplesQuery(s, officeIri(predicate), o, 50);
  return triples
    .map((t) => direction === "out" ? t.o : t.s)
    .filter((term): term is Extract<Term, { t: "i" }> => term.t === "i")
    .map((term) => term.i);
}

async function labelList(uris: string[], socket: Socket): Promise<string> {
  const labels = await Promise.all(uris.map((u) => getLabel(u, socket)));
  return labels.join(", ");
}

async function serviceOwnership(
  entity: string, socket: Socket,
): Promise<{ text: string; entityUris: string[] }> {
  const services = await findEntitiesOfKind(entity, "Service", socket);
  if (services.length === 0) {
    return { text: `I couldn't find a service matching "${entity}".`, entityUris: [] };
  }

  const serviceUri = services[0];
  const serviceName = await getLabel(serviceUri, socket);
  const teamUris = await getRelatedUris(serviceUri, "owns", "in", socket);

  const parts: string[] = [`**${serviceName}**`];

  for (const teamUri of teamUris) {
    const teamName = await getLabel(teamUri, socket);
    const managerUris = await getRelatedUris(teamUri, "managedBy", "out", socket);
    const channelUris = await getRelatedUris(teamUri, "associatedChannel", "out", socket);

    let line = `Owned by **${teamName}**`;
    if (managerUris.length > 0) {
      line += `, managed by **${await labelList(managerUris, socket)}**`;
    }
    if (channelUris.length > 0) {
      line += `. Channel: ${await labelList(channelUris, socket)}`;
    }
    parts.push(line);
  }

  const svcChannels = await getRelatedUris(serviceUri, "associatedChannel", "out", socket);
  if (svcChannels.length > 0) {
    parts.push(`Support channel: ${await labelList(svcChannels, socket)}`);
  }

  return { text: parts.join("\n\n"), entityUris: [serviceUri, ...teamUris] };
}

async function roleTooling(
  entity: string, socket: Socket,
): Promise<{ text: string; entityUris: string[] }> {
  const roles = await findEntitiesOfKind(entity, "Role", socket);
  if (roles.length === 0) {
    return { text: `I couldn't find a role matching "${entity}".`, entityUris: [] };
  }

  const roleUri = roles[0];
  const roleName = await getLabel(roleUri, socket);
  const serviceUris = await getRelatedUris(roleUri, "requiresAccess", "out", socket);

  let text: string;
  if (serviceUris.length === 0) {
    text = `**${roleName}** doesn't have any default tool access requirements listed.`;
  } else {
    const serviceNames = await Promise.all(serviceUris.map((u) => getLabel(u, socket)));
    text = `**${roleName}** requires access to:\n\n${serviceNames.map((n) => `- ${n}`).join("\n")}`;
  }

  return { text, entityUris: [roleUri, ...serviceUris] };
}

async function spendApproval(
  entity: string, amount: number | undefined, socket: Socket,
): Promise<AnswerResult> {
  const processes = await findEntitiesOfKind(
    entity || "spend approval procurement", "Process", socket,
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

  const entityUris: string[] = [];
  const processDataList: ProcessData[] = [];

  for (const procUri of processes) {
    const processName = await getLabel(procUri, socket);
    entityUris.push(procUri);
    const stepUris = await getRelatedUris(procUri, "hasStep", "out", socket);

    const steps: Array<{
      stepName: string;
      spendLimit: number;
      approverRole: string;
      approverNames: string[];
      stepUri: string;
    }> = [];

    for (const stepUri of stepUris) {
      const stepName = await getLabel(stepUri, socket);
      entityUris.push(stepUri);

      const limitTriples = await socket.triplesQuery(
        iri(stepUri), officeIri("spendLimit"), undefined, 1,
      );
      const spendLimit = limitTriples.length > 0 && limitTriples[0].o.t === "l"
        ? parseFloat(limitTriples[0].o.v) : 0;

      const approverRoleUris = await getRelatedUris(stepUri, "approvedBy", "out", socket);
      const approverRole = approverRoleUris.length > 0
        ? await getLabel(approverRoleUris[0], socket) : "Unknown";

      const approverNames: string[] = [];
      for (const roleUri of approverRoleUris) {
        const personUris = await getRelatedUris(roleUri, "hasRole", "in", socket);
        for (const personUri of personUris) {
          approverNames.push(await getLabel(personUri, socket));
        }
      }

      steps.push({ stepName, spendLimit, approverRole, approverNames, stepUri });
    }

    steps.sort((a, b) => a.spendLimit - b.spendLimit);

    const filteredSteps = amount !== undefined
      ? steps.filter((s) => s.spendLimit >= amount)
      : steps;

    if (filteredSteps.length > 0) {
      processDataList.push({
        processName,
        steps: filteredSteps.map((s) => ({
          stepName: s.stepName,
          spendLimit: s.spendLimit,
          approverRole: s.approverRole,
          approverNames: s.approverNames,
        })),
        amount,
      });
    }
  }

  if (processDataList.length === 0) {
    const text = amount !== undefined
      ? `No approval processes found that cover ${fmt(amount)}.`
      : `No matching processes found.`;
    return { text, entityUris };
  }

  return { text: "", entityUris, processes: processDataList };
}

async function escalation(
  entity: string, socket: Socket,
): Promise<{ text: string; entityUris: string[] }> {
  const services = await findEntitiesOfKind(entity, "Service", socket);
  const teams = await findEntitiesOfKind(entity, "Team", socket);
  const targets = [...services, ...teams];

  if (targets.length === 0) {
    return { text: `I couldn't find a service or team matching "${entity}" to escalate to.`, entityUris: [] };
  }

  const parts: string[] = [];
  const entityUris: string[] = [];

  for (const uri of targets.slice(0, 3)) {
    const kind = await getEntityKind(uri, socket);
    const name = await getLabel(uri, socket);
    entityUris.push(uri);

    let teamUris: string[];
    if (kind === "Service") {
      teamUris = await getRelatedUris(uri, "owns", "in", socket);
    } else {
      teamUris = [uri];
    }

    for (const teamUri of teamUris) {
      const teamName = await getLabel(teamUri, socket);
      const managerUris = await getRelatedUris(teamUri, "managedBy", "out", socket);
      const channelUris = await getRelatedUris(teamUri, "associatedChannel", "out", socket);

      if (managerUris.length > 0) {
        const managerName = await getLabel(managerUris[0], socket);
        const managerRoleUris = await getRelatedUris(managerUris[0], "hasRole", "out", socket);
        const roleName = managerRoleUris.length > 0
          ? await getLabel(managerRoleUris[0], socket) : "";

        let line = `For **${kind === "Service" ? name : teamName}**, escalate to **${managerName}**`;
        if (roleName) line += ` (${roleName})`;
        if (channelUris.length > 0) {
          line += `. Channel: ${await labelList(channelUris, socket)}`;
        }
        parts.push(line);
        entityUris.push(teamUri, ...managerUris);
      }
    }
  }

  return {
    text: parts.length > 0 ? parts.join("\n\n") : `Found matching entities but couldn't determine an escalation path.`,
    entityUris,
  };
}

async function general(
  question: string, socket: Socket, onChunk?: (text: string) => void,
): Promise<{ text: string; entityUris: string[] }> {
  const entityPromise = findEntities(question, socket, 6);

  const ragAnswer = await new Promise<string>((resolve, reject) => {
    let accumulated = "";
    socket.graphRagStreaming(
      question,
      (chunk: string, complete: boolean) => {
        accumulated += chunk;
        onChunk?.(accumulated);
        if (complete) resolve(accumulated);
      },
      (error: string) => reject(new Error(error)),
    );
  });

  const entityUris = await entityPromise;
  return { text: ragAnswer, entityUris };
}

export async function processQuestion(
  question: string, triage: TriageResult, socket: Socket,
  onStatus: (status: string) => void,
  onChunk?: (text: string) => void,
): Promise<AnswerResult> {
  onStatus("searching");

  switch (triage.route) {
    case "service-ownership":
      return serviceOwnership(triage.entity, socket);
    case "role-tooling":
      return roleTooling(triage.entity, socket);
    case "spend-approval":
      return spendApproval(triage.entity, triage.amount, socket);
    case "escalation":
      return escalation(triage.entity, socket);
    case "general":
    default:
      onStatus("answering");
      return general(question, socket, onChunk);
  }
}
