# LungCare AI — ML Service

FastAPI service that trains and serves the lung cancer screening models, SHAP
explainability and the OpenCV CT processing pipeline.

> Educational and research prototype. The service returns screening scores and
> feature attributions — never a diagnosis.

## Setup

```bash
cd backend
py -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
```

## 1. Add the dataset

Copy the project dataset to `backend/data/lung_cancer_dataset.csv`.

The adapter in `app/dataset.py` recognises alternative column spellings, so a dataset
using `packyears`, `passive_smoking` or `has_copd` is mapped automatically onto the
canonical feature set:

```
age, gender, pack_years, radon_exposure, asbestos_exposure,
secondhand_smoke_exposure, copd_diagnosis, alcohol_consumption,
family_history, lung_cancer
```

Only the binary target column is required. Extra columns (symptoms, ethnicity,
performance status, …) are ignored by the screening model but remain in the dataset
metadata.

## 2. Train

```bash
py -m app.train
```

Output looks like:

```
Records: 309
Mapped features: age, gender, pack_years, radon_exposure, asbestos_exposure, ...

Model                       Accuracy  Precision   Recall       F1      AUC
------------------------------------------------------------------------
Logistic Regression            0.774      0.652    0.500    0.565    0.855
Decision Tree                  0.780      0.633    0.633    0.633    0.850
Random Forest                  0.880      0.833    0.750    0.789    0.923
Gradient Boosting              0.875      0.807    0.767    0.786    0.921
Voting Ensemble                0.895      0.855    0.783    0.818    0.932
Stacking Ensemble              0.911      0.875    0.817    0.845    0.941
```

(The numbers above illustrate the output format — they are not the project's
measurements. Run the trainer to obtain the real values for your dataset.)

Artifacts are written to `backend/artifacts/`:

```
artifacts/
├── registry.json        metrics, confusion matrices, feature list
├── logistic-regression.pkl
├── decision-tree.pkl
├── random-forest.pkl
├── gradient-boosting.pkl
├── voting-ensemble.pkl
└── stacking-ensemble.pkl
```

## 3. Serve

```bash
uvicorn app.main:app --reload --port 8000
```

Check the service:

```bash
curl http://127.0.0.1:8000/api/health
```

The frontend proxies `/api` to `http://127.0.0.1:8000` during development, so no
frontend configuration is needed.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | `ok` when artifacts exist, otherwise `degraded` |
| `POST` | `/api/predict` | Screening prediction plus per-feature SHAP contributions |
| `POST` | `/api/explain` | Global importance, local attribution, SHAP summary data |
| `POST` | `/api/analyze-ct` | OpenCV pipeline: grayscale → denoise → Otsu → K-Means → ROI |
| `GET`  | `/api/models` | Model catalogue with real evaluation metrics |
| `GET`  | `/api/datasets` | Dataset metadata and class balance |
| `GET`  | `/api/datasets/{id}/insights` | Distributions for the dataset screens |
| `GET`/`POST` | `/api/report` | Report list and generation |
| `GET`  | `/api/report/{id}/document` | Full stored report document |

### Example request

```bash
curl -X POST http://127.0.0.1:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "LC-2041",
    "age": 67,
    "gender": "male",
    "packYears": 45,
    "radonExposure": "moderate",
    "asbestosExposure": "high",
    "secondhandSmokeExposure": "low",
    "copdDiagnosis": "yes",
    "alcoholConsumption": "moderate",
    "familyHistory": "yes"
  }'
```

## Error handling

The service returns a user-safe envelope and never a traceback:

```json
{
  "userMessage": "Please enter a valid age.",
  "hint": "Age must be between 18 and 100 years."
}
```

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `LUNGCARE_DATA_DIR` | `backend/data` | Dataset location |
| `LUNGCARE_ARTIFACT_DIR` | `backend/artifacts` | Model artifact location |
| `LUNGCARE_TARGET` | `lung_cancer` | Binary target column name |
