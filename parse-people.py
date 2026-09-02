#!/usr/bin/env python3

import rdflib

ONTOLOGY = "http://example.org/ontology/office#"

g = rdflib.Graph()
g.parse("onboarding-data.ttl", format="turtle")

ONT = rdflib.Namespace(ONTOLOGY)
RDFS = rdflib.namespace.RDFS

persons = g.subjects(rdflib.RDF.type, ONT.Person)

for person in sorted(persons, key=str):
    label = g.value(person, RDFS.label)
    role = g.value(person, ONT.hasRole)
    team = g.value(person, ONT.memberOf)

    role_label = g.value(role, RDFS.label) if role else "Unknown"
    team_label = g.value(team, RDFS.label) if team else "Unknown"

    print(f"{label} — {role_label}, {team_label}")
