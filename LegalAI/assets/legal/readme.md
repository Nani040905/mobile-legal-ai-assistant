# Legal Corpus Directory Structure

This directory holds the index and local reference metadata files for the Indian Legal Corpus.
To keep the application package lightweight, the active law content is dynamically downloaded/queried from the offline LLM or local database indices rather than bundled as raw text files.

## Directory Layout
- `readme.md`: This file outlining corpus configurations.
- `acts_metadata.json`: Index file containing structured information about the main acts (IPC, BNS, CrPC, BNSS, IEA, BSA, NI Act, Consumer Protection Act).

## Act Schemas
Every act definition should follow the structure:
- `id`: Unique identifier (e.g. `ipc_1860`)
- `name`: Full title of the Act
- `abbreviation`: Short code (e.g. `IPC`)
- `year`: Year of enactment
- `totalSections`: Number of provisions
