import json
import os
import sys

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Run: pip install firebase-admin")
    sys.exit(1)

DATA_FILE = os.path.join(os.path.dirname(__file__), "enriched_villages.json")
KEY_FILE  = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

def upload():
    if not os.path.exists(DATA_FILE):
        print("enriched_villages.json not found. Run process_datasets.py first.")
        sys.exit(1)

    with open(DATA_FILE, encoding="utf-8") as f:
        profiles = json.load(f)

    print(f"Loaded {len(profiles)} village profiles")

    if not os.path.exists(KEY_FILE):
        print(f"serviceAccountKey.json not found at: {KEY_FILE}")
        sys.exit(1)

    cred = credentials.Certificate(KEY_FILE)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    collection = db.collection("villageProfiles")
    success = 0
    batch = db.batch()
    batch_count = 0

    for village_name, data in profiles.items():
        try:
            doc_id = village_name.lower().replace(" ", "_")
            doc_ref = collection.document(doc_id)
            batch.set(doc_ref, {
                **data,
                "villageName": village_name,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            })
            batch_count += 1
            success += 1

            if batch_count == 500:
                batch.commit()
                batch = db.batch()
                batch_count = 0
                print(f"  ✓ {success} villages uploaded so far...")

        except Exception as e:
            print(f"  ✗ {village_name}: {e}")

    if batch_count > 0:
        batch.commit()

    print(f"\n✅ Uploaded {success}/{len(profiles)} village profiles to Firestore.")

if __name__ == "__main__":
    print("Starting upload...")
    upload()