import os
import json
import glob
from dotenv import load_dotenv
from openai import OpenAI
import chromadb

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Delete existing collection if it exists (clean start)
try:
    chroma_client.delete_collection("clinical_trials")
    print("Deleted old collection.")
except:
    pass

collection = chroma_client.create_collection("clinical_trials")

def get_embedding(text):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def build_text(trial):
    phases = ", ".join(trial.get("phase", [])) if trial.get("phase") else "N/A"
    return (
        f"Disease: {trial.get('disease', 'N/A')}\n"
        f"Trial ID: {trial.get('nct_id', 'N/A')}\n"
        f"Title: {trial.get('title', 'N/A')}\n"
        f"Status: {trial.get('status', 'N/A')}\n"
        f"Phase: {phases}\n"
        f"Summary: {trial.get('summary', 'N/A')}"
    )

# Load all JSON files from data folder
json_files = glob.glob("./data/*.json")
print(f"Found {len(json_files)} JSON files: {[os.path.basename(f) for f in json_files]}")

all_documents = []
all_embeddings = []
all_ids = []
all_metadatas = []

total = 0
for filepath in json_files:
    with open(filepath, "r", encoding="utf-8") as f:
        trials = json.load(f)

    print(f"Processing {os.path.basename(filepath)}: {len(trials)} trials...")

    for trial in trials:
        text = build_text(trial)
        embedding = get_embedding(text)

        disease_prefix = trial.get("disease", "unknown").replace(" ", "_").lower()
        trial_id = f"{disease_prefix}_{trial.get('nct_id', f'trial_{total}')}"

        all_documents.append(text)
        all_embeddings.append(embedding)
        all_ids.append(trial_id)
        all_metadatas.append({
            "disease": trial.get("disease", ""),
            "nct_id": trial.get("nct_id", ""),
            "title": trial.get("title", ""),
            "status": trial.get("status", ""),
        })

        total += 1
        if total % 50 == 0:
            print(f"  {total} trials embedded so far...")

# Save everything to ChromaDB in one batch
collection.add(
    documents=all_documents,
    embeddings=all_embeddings,
    ids=all_ids,
    metadatas=all_metadatas
)

print(f"\nDone! {total} trials saved to ChromaDB.")