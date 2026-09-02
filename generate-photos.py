#!/usr/bin/env python3

import base64
import requests
import rdflib
from pathlib import Path

SD_URL = "http://localhost:7860"
ONTOLOGY = "http://example.org/ontology/office#"
OUTPUT_DIR = Path("images")

OUTPUT_DIR.mkdir(exist_ok=True)

g = rdflib.Graph()
g.parse("onboarding-data.ttl", format="turtle")

ONT = rdflib.Namespace(ONTOLOGY)
RDFS = rdflib.namespace.RDFS

persons = sorted(g.subjects(rdflib.RDF.type, ONT.Person), key=str)

for person in persons:
    local_name = str(person).split("#")[-1]
    output_path = OUTPUT_DIR / f"{local_name}.png"

    if output_path.exists():
        print(f"Skipping {local_name} (already exists)")
        continue

    label = str(g.value(person, RDFS.label))
    role = g.value(g.value(person, ONT.hasRole), RDFS.label)

    prompt = (
        f"professional corporate headshot photo of a person, "
        f"{role}, office environment, "
        f"neutral background, soft lighting, business attire, "
        f"looking at camera, friendly expression, "
        f"high quality portrait photography, 85mm lens"
    )

    negative_prompt = (
        "cartoon, anime, illustration, painting, drawing, art, "
        "deformed, ugly, blurry, low quality, text, watermark, "
        "multiple people, group photo"
    )

    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "steps": 25,
        "width": 512,
        "height": 512,
        "cfg_scale": 7,
        "sampler_name": "Euler a",
    }

    print(f"Generating {local_name} ({label}, {role})...")

    try:
        resp = requests.post(f"{SD_URL}/sdapi/v1/txt2img", json=payload, timeout=120)
        resp.raise_for_status()
        image_data = base64.b64decode(resp.json()["images"][0])
        output_path.write_bytes(image_data)
        print(f"  Saved {output_path}")
    except Exception as e:
        print(f"  ERROR: {e}")

print("Done.")
