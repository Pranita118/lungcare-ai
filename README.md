# LungCare AI

**AI-Powered Lung Cancer Screening & Explainable Healthcare Decision Support**

> **Educational & Research Prototype | Not a Medical Diagnostic Tool**
> This application is an educational and research prototype and does not provide a medical
> diagnosis. AI results should not replace evaluation by a qualified healthcare professional.

LungCare AI is a calm, patient-centred **lung-health companion** built on top of a working
machine-learning screening system. The machine learning runs underneath; the person using the
app never has to know it exists.

- **Patient experience** (the default) — health assessment, plain-language screening result,
  symptom tracking, CT image analysis, personalised healthy steps, care organiser, questions
  for a doctor, a downloadable health report, and lung health information.
- **Research mode** (kept, but separated) — the original technical ML screens: model
  performance, confusion matrices, SHAP outputs, dataset statistics, training pipeline and
  technical logs. Reachable only from the footer link *Research / Developer Mode*.

---

## The two modes

### Patient mode — `/`

| Screen | Route | Purpose |
|--------|-------|---------|
| Home | `/` | Overview, next steps, quick actions |
| My Risk | `/my-risk` | The AI screening result in plain language |
| My Health Assessment | `/assessment` | Five-step guided questionnaire |
| My Lung Health | `/my-lung-health` | Daily symptom check-in and history |
| CT Scan | `/ct-scan` | Upload and AI-assisted image analysis with zoom |
| My Healthy Steps | `/my-healthy-steps` | Personalised guidance and daily checklist |
| My Care | `/my-care` | Appointments, scans, reminders, follow-ups |
| Understand My Result | `/understand-my-result` | What the result does and does not mean |
| Read My Report | `/read-my-report` | Upload a scan or test report, get the words explained |
| Ask About Lung Cancer | `/ask-about-lung-cancer` | Ask a question, get a plain-language answer |
| My Health Report | `/my-health-report` | Printable / PDF health summary |
| Questions for My Doctor | `/questions-for-my-doctor` | Questions generated from your own answers |
| Lung Health Information | `/lung-health-information` | Educational articles |

### Research mode — `/research`

The original project screens, unchanged, for demonstration and evaluation:

`/research` · `/research/models` · `/research/explainable-ai` · `/research/datasets` ·
`/research/model-insights` · `/research/reports` · `/research/assessment` ·
`/research/ct-analysis` · `/research/about` · `/research/settings`

---

## Repository layout

```
AIH project Lung Cancer/
├── frontend/                 React + TypeScript + Vite + Tailwind application
│   ├── src/
│   │   ├── components/
│   │   │   ├── patient/      patient shell, cards, CT viewer, safety copy
│   │   │   ├── layout/       research shell, sidebar, header
│   │   │   ├── results/      screening result, report document, charts
│   │   │   ├── medical/      XAI visuals, disclaimers, process steps
│   │   │   ├── charts/       shared chart frame and theme
│   │   │   ├── ui/           buttons, cards, inputs, states
│   │   │   └── assistant/    rule-based insights assistant
│   │   ├── lib/              guidance engine, education content, validation
│   │   ├── pages/patient/    the ten patient screens
│   │   ├── pages/            the preserved research screens
│   │   ├── services/         ML service abstraction (live FastAPI client only)
│   │   ├── store/            HealthProvider (patient data), AppProvider (ML session),
│   │   │                     ThemeProvider (light / dark)
│   │   └── types/            technical and patient-facing contracts
│   └── package.json
└── backend/                  FastAPI ML service (trained models + SHAP + OpenCV)
    ├── app/                  dataset, models, explain, imaging, reports,
    │                         report_reader, main, train
    ├── data/                 put lung_cancer_dataset.csv here
    └── requirements.txt
```

---

## Quick start

The application is **live-only**. It requires a running ML service with trained artifacts;
there is no simulated engine. Without the service it shows a connection screen with setup
instructions rather than inventing results.

**1. Install the backend dependencies** (once):

```bash
cd backend
py -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt
```

**2. Add the dataset** to `backend/data/lung_cancer_dataset.csv`.

**3. Train the models** — metrics and artifacts are written to `backend/artifacts/`:

```bash
py -m app.train
```

**4. Start the service:**

```bash
uvicorn app.main:app --reload --port 8000
```

**5. Start the frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The frontend detects the service automatically through
`GET /api/health`; the same `MLService` interface serves both patient and research modes.
The first boot takes ~40 s because SHAP imports slowly.

If the service runs elsewhere, copy `frontend/.env.example` to `frontend/.env` and set
`VITE_API_BASE_URL`.

### Why the first explanation takes a moment

Global feature importance is a property of the **model**, not of the patient, so
`app/explain.py` computes it once per model and caches it. This matters because
TreeSHAP over the primary forest costs a substantial fraction of a second per
row — recomputing the same global summary on every request would stall the
service for over a minute.

At start-up a background thread (`warm_global_importance`) pre-computes the cache,
so by the time anyone opens an explainability screen the work is already done.
Local attribution for a single patient stays fast (~1 s) because only one row goes
through the explainer.

If you retrain, restart the service so the cache is rebuilt.

### 5-minute patient demonstration

1. **Home** — "Start My Assessment"
2. **My Health Assessment** — answer the five steps and generate the result
3. **My Risk** — read the plain-language result and the contributing factors
4. **My Lung Health** — record a symptom check-in; the safety note reacts to it
5. **My Healthy Steps** — tick today's checklist; the progress ring updates
6. **CT Scan** — "Try with a sample image" → analyze → compare and zoom
7. **Questions for My Doctor** — questions are generated from the answers above
8. **My Health Report** — download as PDF
9. **Research / Developer Mode** (footer) — show the ML system underneath

---

## Appearance — light and dark

A light/dark switch sits in the **top-right corner of every header**, in both patient and
research modes. The choice is saved in `localStorage`; until a choice is made the
application follows the operating system `prefers-color-scheme` setting.

How it is built:

- `frontend/src/store/ThemeProvider.tsx` owns the theme and toggles a single class on
  `<html>`.
- `frontend/tailwind.config.ts` maps every surface, border and text colour to a CSS custom
  property, so both themes share one set of class names.
- The **saturated brand and status hues are literal hex, not variables.** A green risk band
  must not become a different green at night, and this also keeps every existing
  slash-opacity modifier working.
- `frontend/tailwind.plugin.ts` generates the translucent-surface utilities
  (`bg-surface/92` and friends). Tailwind silently drops an opacity modifier on a bare CSS
  variable, which would leave sticky headers with no background; the plugin emits the
  equivalent `color-mix()` rule behind `@supports`, with an opaque fallback.
- Charts read their palette from CSS variables (`chartTheme.ts`) so Recharts output follows
  the theme too.

---

## How the personalisation works

Nothing on any page is invented. The patient's own answers drive everything:

```
Questionnaire (HealthProvider)
        │
        ├─► toScreeningInput()  ─► POST /api/predict  ─► AI Screening Result
        │                              │
        │                              └─► personalFactors()  (plain-language factors)
        ├─► careAreas()      (3–5 supportive areas, each with a stated reason)
        ├─► extraSteps()     (weekly suggestions, only where relevant)
        ├─► healthySteps()   (7 daily steps, titles adapted to the answers)
        ├─► buildQuestions() (doctor questions with a reason for each)
        └─► Health Report    (same data, patient framing)
```

Only the nine screening inputs are sent to the ML service. Day-to-day answers (activity,
sleep, stress, appetite) stay in the browser and are used solely for supportive guidance —
which the interface states explicitly.

---

## Data honesty rules implemented in the product

- **There is no simulated engine.** A number on screen is either produced by a trained
  artifact or it is not shown. When the service is unreachable the application stops at a
  connection screen and offers a retry.
- Every metric carries a provenance chip: *Trained model* or *Not available*.
- Confusion matrices are the source; accuracy, precision, recall and F1 are *derived* from
  them, never entered separately.
- The patient interface contains **no** SHAP values, feature-importance charts, confusion
  matrices, model comparisons or dataset statistics. Those live only in research mode.
- The report confirms this: the patient report contains zero technical ML content.
- CT processing is real computer vision — the server pipeline when available, otherwise the
  deterministic on-device pipeline, and the interface always says which ran. It repeatedly
  states that segmentation is not tumour detection, and never uses the word “tumour”.
- The insights assistant answers only from the current model output and refuses to diagnose.

---

## Ask About Lung Cancer — the question assistant

`/ask-about-lung-cancer` answers questions about lung cancer and general lung health.

**Why this is not a language model.** The project rules out paid APIs, and a
free-form generator would be cheap — but it *invents*. On health topics it can
state something confidently that no source supports, and that is not an
acceptable failure mode. So `frontend/src/lib/lungKnowledge.ts` holds 24
written, reviewed topics and a retrieval engine over them. It knows a
well-chosen set of subjects very well and says "I don't cover that" rather than
guessing outside them. The same document always gives the same answer, it runs
offline, and it costs nothing to serve.

Topics cover what lung cancer is, types, symptoms, causes and risk factors,
smoking and second-hand smoke, prevention, screening, CT scans, nodules, lymph
nodes, staging, prognosis, diagnosis and biopsy, gene and protein tests,
treatment in general terms, palliative care, clinical trials, when to see
someone, living with a lung condition, support services, air quality,
contagibility, other lung conditions, and a glossary of report terminology.

**Every answer links to its sources** — the NHS, Cancer Research UK, the
American Cancer Society, the US National Cancer Institute, the British Lung
Foundation and the World Health Organization. A link is shown next to each
answer rather than buried, so anyone can check it in full.

**Safety rules are checked before retrieval.** A personal question is never
answered with a general article that happens to share its wording:

| Question | Response |
|----------|----------|
| "do I have lung cancer", "is my scan cancer", "am I going to die" | Cannot assess; explains what it *can* help with, points to symptoms and screening |
| "I have been coughing for a month" | Acknowledges it, says most causes are far more common and treatable, advises mentioning it to a professional |
| "I am coughing up blood" | As above **plus** urgent-care guidance, because this is a genuine red flag |
| "should I take the chemo", "what is the best dose for me", "should I stop my treatment" | Explains treatment categories in general, but only the prescriber can advise |
| Anything off-topic | Says it only covers lung cancer and lung health |
| Anything outside the 24 topics | Names what it *can* answer instead of improvising |

Treatment questions are only refused when they are about the reader's own
treatment. "What treatments are used" is answered normally — refusing it would
make the tool useless for the patients who most need general information.

---

## Read My Report — explaining a patient's own report

`/read-my-report` lets someone upload a scan, test or clinic report and see what
the words in it mean. It accepts PDF, Word (`.docx`) and plain text, or the text
pasted directly from a patient portal.

**What it does.** It finds lung-related terms — nodules, lymph nodes, staging,
pathology, gene and protein tests, follow-up intervals — and explains each one
in ordinary language, with the size when the report gives one, plus a question
to ask about that specific term. Findings feed straight into *Questions for My
Doctor*, so the report becomes something actionable rather than just readable.

**What it deliberately does not do.** It does not interpret the report and it
never says what anything means for the person. Nothing in the output asserts or
implies that they have any condition — it only reports that particular wording
appeared. Every term is phrased as what it *generally* means, and the page states
in three places that a healthcare professional is the one who explains the
document.

**How it works.** `backend/app/report_reader.py` is a curated vocabulary of about
forty terms plus pattern matching. No external or paid AI service is involved, it
runs offline, and the same document always produces the same explanation.

Two details drive the accuracy:

- **Negation is respected.** Radiology reports describe what is *not* there as
  much as what is. "No pleural effusion, pneumothorax or atelectasis" has to
  read as reassurance, not as three problems. A denied finding is moved into a
  "Reassuring wording" section rather than shown as a finding with a warning
  attached, because showing it as a problem would be needlessly alarming.
- **Measurements are bound to their own finding.** "6 mm nodule" and "14 mm node"
  are a sentence apart, so only the term's own sentence is searched and the
  closest measurement wins.

One bug worth recording: negations were originally matched as plain substrings,
which read the "no" inside "adeno**carcinoma**" and "lymphade**no**pathy" as a
negation. That silently turned positive pathology findings into negative ones.
They are now matched on word boundaries.

**Scanned images are not supported.** This prototype ships no OCR engine, so a
photo of a report is refused with clear guidance to paste the text or download
the document, rather than returning a partial or invented reading. Adding OCR
would be a self-contained follow-up.

---

## Translating answers into the model's vocabulary

The model is trained on the dataset's own categories — `Male`/`Female`,
`Low`/`Medium`/`High`, `No`/`Yes`, `Moderate`/`Heavy`. The patient interface asks
in plainer, graded language, so `backend/app/dataset.py` translates between them
before the record reaches the pipeline:

| Question | Patient answer | Value sent to the model |
|----------|----------------|-------------------------|
| Radon exposure | none, a little → `Low` · a moderate amount → `Medium` · a lot → `High` |
| Asbestos / secondhand smoke | none, a little → `No` · a moderate amount, a lot → `Yes` |
| Alcohol | none, a little, a moderate amount → `Moderate` · a lot → `Heavy` |
| COPD / family history | `Yes` / `No` |
| Gender | `Male` / `Female` |

**Why this step is not optional.** A one-hot encoder maps an unrecognised category
to an all-zero column, without warning you in the response. If the patient's
answers are passed through untranslated, every categorical column is dropped and
the model returns the population mean for everyone — in this model that silently
discarded 21% of its decision weight, and two patients with identical age and
pack-years but opposite exposure histories received the *same* score.

`ModelRegistry.set_vocabulary()` records the categories the dataset really
contains, and `resolve_category()` snaps each answer onto one of them, so a
dataset variant with different spellings degrades to a real value rather than to
nothing.

**Two answers cannot be represented exactly**, and the dataset is the limiting
factor rather than the interface:

- The dataset has no category for *no alcohol consumption*, so a non-drinker is
  recorded as the lowest level the model has seen (`Moderate`).
- The dataset records gender as binary, so *other* has no counterpart. It falls
  back to the dataset's majority class. This feature carries only 2% of the
  model's weight, but the limitation is real and worth stating.

---

## Medical safety

- Persistent, non-alarming **“Need Medical Help?”** guidance on every patient page.
- Symptom recording produces **non-diagnostic** safety notes, escalating to urgent advice
  only for severe recorded symptoms.
- The medication section is an **organiser only**. The app never recommends a medicine,
  changes a dose, or advises starting or stopping treatment.
- Personalised guidance is framed as “consider discussing with your healthcare
  professional”, never as a treatment instruction.

---

## API contract

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/health` | Service status; drives the connection screen |
| `POST` | `/api/predict` | Screening prediction for one patient |
| `POST` | `/api/analyze-ct` | CT slice processing and ROI extraction |
| `GET`  | `/api/models` | Trained models with evaluation metrics |
| `GET`  | `/api/datasets` | Dataset metadata |
| `GET`  | `/api/datasets/{id}/insights` | Dataset distributions |
| `POST` | `/api/explain` | SHAP attribution for a prediction |
| `POST` | `/api/read-report` | Explain lung terms in an uploaded PDF/DOCX/text file |
| `POST` | `/api/read-report-text` | Same, for pasted report text |
| `GET`/`POST` | `/api/report` | Report list / generation |
| `GET`  | `/api/report/{id}/document` | Full report document |

The React application never contains training code. It depends only on the `MLService`
interface in `frontend/src/services/contract.ts`.

---

## Technology

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion,
Lucide icons, React Router.
**Backend** — Python, FastAPI, pandas, NumPy, scikit-learn, SHAP, OpenCV, joblib.

---

## Deployment

The front end goes on Netlify, the ML service on Render. Both hosts need one
environment variable each, and the order matters: deploy the API first so you
know its URL.

### 1. Push the repository

The repo is a monorepo. `backend/artifacts/*.pkl` is deliberately **not**
committed — the artifacts are reproducible from the committed dataset, and the
root `.gitignore` keeps them out.

```bash
git init
git add .
git commit -m "LungCare AI"
git branch -M main
git remote add origin https://github.com/<you>/lungcare-ai.git
git push -u origin main
```

### 2. Backend on Render

`render.yaml` sits at the repository root, which is where Render looks for a
blueprint. The service inside it is rooted at `backend/` via `rootDir`.

The build command installs dependencies and then **retrains every model** from
`backend/data/lung_cancer_dataset.csv`. That takes about 40 seconds and avoids
shipping large binaries. Artifacts are written into the deployed filesystem.

Set one environment variable in the Render dashboard:

| Variable | Value |
| --- | --- |
| `LUNGCARE_CORS_ORIGINS` | your Netlify URL, e.g. `https://lungcare-ai.netlify.app` |

`LUNGCARE_CORS_ORIGINS` is not optional. Without it the service only accepts
calls from `localhost:5173`, and the browser will block every request from the
deployed site.

Health check is `/api/health`.

**Memory.** The plan is set to `free` (512 MB). The measured resident cost of
the service is about 300 MB — roughly 215 MB of that is SHAP itself — so it
fits, but with limited headroom. The free tier also spins down after about
15 minutes idle, so the first request after a pause can take 40–60 seconds while
SHAP imports and the artifacts load. The UI shows a connection screen with a
retry button during that window. Set `plan: starter` ($7/month) if you would
rather it stayed warm; that does not change the memory allowance.

### 3. Frontend on Netlify

`netlify.toml` at the repo root is picked up automatically: it installs and
builds `frontend/` and publishes `frontend/dist`. It also contains the SPA
fallback rule, which the app needs because it uses `BrowserRouter` — without it
a deep link such as `/read-my-report` returns a 404.

Set one environment variable under **Site settings → Environment variables**:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://lungcare-api.onrender.com` |

Vite inlines this at build time, so it must be set **before** the build runs.
After changing it, trigger a new deploy. If it is left unset the built app falls
back to the dev proxy, which does not exist in production, and every request
fails.

### 4. Optional configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `LUNGCARE_DATA_DIR` | `backend/data` | Where the dataset is read from. Point at a Render persistent disk to keep a private dataset. |
| `LUNGCARE_ARTIFACT_DIR` | `backend/artifacts` | Where artifacts are read from and written to. |
| `LUNGCARE_CORS_ORIGINS` | localhost only | Comma-separated list of allowed browser origins, or `*`. |

### 5. A note on model size

The tree ensembles are capped at `MAX_TREE_DEPTH = 12` with
`N_ESTIMATORS = 120` in `backend/app/models.py`. This is a deployment
constraint, not an arbitrary choice:

| Configuration | Artifact | Accuracy | Precision | Recall | ROC-AUC |
| --- | --- | --- | --- | --- | --- |
| 300 trees, no depth cap | 315 MB | 0.702 | 0.782 | 0.786 | 0.731 |
| 120 trees, depth 12 | 39 MB | 0.697 | 0.810 | 0.730 | 0.759 |

Uncapped, the forests grow until every leaf is pure, which on 50,000 records
produces a 315 MB pipeline. That is over GitHub's 100 MB per-file limit, and
because the registry loads every model at start-up, both uncapped forests need
roughly 950 MB of memory. Capping the depth brings the whole artifact set to
78 MB and the service to about 300 MB, and the capped model scores *better* on
precision and ROC-AUC, which indicates the uncapped version was overfitting.

### 6. Local check before deploying

```bash
# backend
cd backend && python -m uvicorn app.main:app --port 8000
curl http://127.0.0.1:8000/api/health

# frontend, with the deployed API URL
cd frontend
VITE_API_BASE_URL=https://lungcare-api.onrender.com npm run dev
```

---

## Privacy

Patient information is stored in this browser only (`localStorage`) and is never
transmitted except as the nine screening inputs sent to the ML service. “Sign out and
clear your data” in the sidebar removes everything. No real patient data should be entered
into this prototype.

---

## Accessibility

- Risk is always communicated with **icon + text label + colour**, never colour alone.
- Keyboard navigable controls with visible focus rings; radio groups use native inputs.
- Charts expose plain-language descriptions and accessible labels.
- Images carry descriptive `alt` text.
- `prefers-reduced-motion` is respected.

