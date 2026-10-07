"""Dataset loading, schema adaptation and preprocessing.

The project dataset (``lung_cancer_dataset.csv``) is not assumed to have exactly
one spelling of every column. :class:`DatasetAdapter` maps whatever schema is
found onto the canonical feature keys the model is trained on.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

CANONICAL_FEATURES: list[str] = [
    "age",
    "gender",
    "pack_years",
    "radon_exposure",
    "asbestos_exposure",
    "secondhand_smoke_exposure",
    "copd_diagnosis",
    "alcohol_consumption",
    "family_history",
]

FEATURE_LABELS: dict[str, str] = {
    "age": "Age",
    "gender": "Gender",
    "pack_years": "Pack Years",
    "radon_exposure": "Radon Exposure",
    "asbestos_exposure": "Asbestos Exposure",
    "secondhand_smoke_exposure": "Secondhand Smoke Exposure",
    "copd_diagnosis": "COPD Diagnosis",
    "alcohol_consumption": "Alcohol Consumption",
    "family_history": "Family History",
}

TARGET_ALIASES: tuple[str, ...] = ("lung_cancer", "lungcancer", "cancer", "diagnosis", "target", "label")

#: Accepted alternative spellings for each canonical feature.
FEATURE_ALIASES: dict[str, tuple[str, ...]] = {
    "age": ("age", "age_years", "patient_age"),
    "gender": ("gender", "sex"),
    "pack_years": ("pack_years", "packyears", "pack_year", "smoking_pack_years", "tobacco_pack_years"),
    "radon_exposure": ("radon_exposure", "radon", "radon_level", "exposure_to_radon"),
    "asbestos_exposure": ("asbestos_exposure", "asbestos", "asbestos_level", "exposure_to_asbestos"),
    "secondhand_smoke_exposure": (
        "secondhand_smoke_exposure",
        "secondhand_smoke",
        "passive_smoking",
        "environmental_smoking",
    ),
    "copd_diagnosis": ("copd_diagnosis", "copd", "has_copd"),
    "alcohol_consumption": ("alcohol_consumption", "alcohol", "alcohol_use", "alcohol_level"),
    "family_history": ("family_history", "family", "family_lung_cancer", "lung_cancer_family_history"),
}

EXPOSURE_ORDER = ["none", "low", "moderate", "high"]


def normalise(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(name).strip().lower()).strip("_")


@dataclass
class DatasetAdapter:
    """Maps an arbitrary CSV schema onto the canonical feature set."""

    frame: pd.DataFrame
    column_map: dict[str, str]
    target_column: str
    dropped_columns: list[str]
    duplicates_removed: int = 0

    @property
    def available_features(self) -> list[str]:
        return [feature for feature in CANONICAL_FEATURES if feature in self.column_map]

    @property
    def numeric_features(self) -> list[str]:
        frame = self.frame[[self.column_map[f] for f in self.available_features]]
        return [
            feature
            for feature in self.available_features
            if pd.api.types.is_numeric_dtype(frame[self.column_map[feature]])
        ]

    @property
    def categorical_features(self) -> list[str]:
        numeric = set(self.numeric_features)
        return [feature for feature in self.available_features if feature not in numeric]

    def features_frame(self) -> pd.DataFrame:
        columns = {self.column_map[f]: f for f in self.available_features}
        return self.frame[list(columns)].rename(columns=columns)


def clean_dataset(frame: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace, drop empty rows and drop exact duplicates."""
    cleaned = frame.copy()
    cleaned.columns = [str(column).strip() for column in cleaned.columns]
    for column in cleaned.select_dtypes(include="object").columns:
        cleaned[column] = cleaned[column].astype(str).str.strip()
    cleaned = cleaned.replace({"": np.nan, "nan": np.nan, "None": np.nan, "null": np.nan})
    cleaned = cleaned.dropna(how="all")
    before = len(cleaned)
    cleaned = cleaned.drop_duplicates()
    cleaned.attrs["duplicates_removed"] = before - len(cleaned)
    return cleaned


def load_dataset(path: Path) -> DatasetAdapter | None:
    """Load and adapt the project dataset. Returns ``None`` when unavailable."""
    if not path or not Path(path).exists():
        return None

    frame = pd.read_csv(path)
    frame = clean_dataset(frame)
    duplicates = int(frame.attrs.get("duplicates_removed", 0))

    normalised_columns = {normalise(column): column for column in frame.columns}

    target_column = None
    for alias in TARGET_ALIASES:
        if alias in normalised_columns:
            target_column = normalised_columns[alias]
            break
    if target_column is None:
        return None

    column_map: dict[str, str] = {}
    for feature, aliases in FEATURE_ALIASES.items():
        for alias in aliases:
            if alias in normalised_columns:
                column_map[feature] = normalised_columns[alias]
                break

    dropped = [
        column
        for column in frame.columns
        if column not in list(column_map.values()) and column != target_column
    ]

    return DatasetAdapter(
        frame=frame,
        column_map=column_map,
        target_column=target_column,
        dropped_columns=dropped,
        duplicates_removed=duplicates,
    )


def dataset_profile(adapter: DatasetAdapter, name: str, source: str) -> dict:
    """Metadata used by the frontend dataset cards."""
    frame = adapter.frame
    numeric = [frame[adapter.column_map[f]] for f in adapter.numeric_features]
    age_summary = None
    if "age" in adapter.numeric_features:
        ages = pd.to_numeric(frame[adapter.column_map["age"]], errors="coerce").dropna()
        if len(ages):
            age_summary = {
                "min": float(ages.min()),
                "max": float(ages.max()),
                "mean": float(ages.mean()),
                "median": float(ages.median()),
            }

    target = frame[adapter.target_column]
    counts = target.value_counts()
    class_distribution = [
        {"label": str(label), "count": int(count), "share": float(count / len(frame))}
        for label, count in counts.items()
    ]

    return {
        "id": "dataset-a",
        "name": name,
        "description": (
            "Connected project dataset. Column names are mapped onto the canonical "
            "feature set by the dataset adapter."
        ),
        "source": source,
        "records": int(len(frame)),
        "features": len(adapter.available_features),
        "target": adapter.target_column,
        "missingValues": int(frame.isna().sum().sum()),
        "duplicates": int(adapter.duplicates_removed),
        "classDistribution": class_distribution,
        "ageSummary": age_summary,
        "provenance": "trained-model",
        "columns": [str(column) for column in frame.columns],
    }


def build_preprocessor(adapter: DatasetAdapter) -> ColumnTransformer:
    """Encoding + scaling pipeline shared by every model."""
    numeric = adapter.numeric_features
    categorical = adapter.categorical_features

    numeric_pipeline = Pipeline(
        [("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]
    )
    categorical_pipeline = Pipeline(
        [
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("encode", OneHotEncoder(handle_unknown="ignore", drop="if_binary")),
        ]
    )

    return ColumnTransformer(
        [
            ("num", numeric_pipeline, [adapter.column_map[f] for f in numeric]),
            ("cat", categorical_pipeline, [adapter.column_map[f] for f in categorical]),
        ],
        remainder="drop",
    )


def encode_patient(patient: dict) -> dict:
    """Convert the API payload into a flat record the trained pipeline accepts.

    The model was fitted on the dataset's own categories — ``Male``/``Female``,
    ``Low``/``Medium``/``High``, ``No``/``Yes``, ``Moderate``/``Heavy``. The
    patient interface asks in plainer, graded language (``none``/``low``/
    ``moderate``/``high``), so the values are translated here.

    This step matters more than it looks: a one-hot encoder silently maps an
    unrecognised category to all zeros, so without this translation every
    categorical answer the patient gives is discarded and the model falls back
    to the population mean. Roughly a fifth of this model's decision weight
    lives in those categorical columns.
    """
    record = {
        "age": patient.get("age"),
        "pack_years": patient.get("packYears"),
    }
    for feature, api_key, default in _SCREENING_FIELDS:
        api_value = str(patient.get(api_key) or default).strip().lower()
        record[feature] = _to_dataset_category(feature, api_value)
    return record


#: ``(feature, api field name, value used when the patient did not answer)``.
_SCREENING_FIELDS: list[tuple[str, str, str]] = [
    ("gender", "gender", "other"),
    ("radon_exposure", "radonExposure", "none"),
    ("asbestos_exposure", "asbestosExposure", "none"),
    ("secondhand_smoke_exposure", "secondhandSmokeExposure", "none"),
    ("copd_diagnosis", "copdDiagnosis", "no"),
    ("alcohol_consumption", "alcoholConsumption", "none"),
    ("family_history", "familyHistory", "no"),
]

#: Plausible spellings seen across dataset variants, so a different copy of the
#: project dataset still resolves instead of silently becoming an unknown
#: category. Keys are compared case-insensitively and without separators.
_CATEGORY_ALIASES: dict[str, str] = {
    "male": "Male",
    "m": "Male",
    "female": "Female",
    "f": "Female",
    "low": "Low",
    "medium": "Medium",
    "moderate": "Medium",
    "mid": "Medium",
    "high": "High",
    "yes": "Yes",
    "true": "Yes",
    "y": "Yes",
    "1": "Yes",
    "no": "No",
    "false": "No",
    "n": "No",
    "0": "No",
    "heavy": "Heavy",
}

#: Default used when the dataset has no equivalent category. Chosen to be the
#: most neutral value the model knows rather than an invented one.
_CATEGORY_FALLBACK: dict[str, str] = {
    "gender": "Female",
    "radon_exposure": "Low",
    "asbestos_exposure": "No",
    "secondhand_smoke_exposure": "No",
    "copd_diagnosis": "No",
    "alcohol_consumption": "Moderate",
    "family_history": "No",
}

#: Where a graded answer is treated as an exposure on a binary dataset column.
#: "A little" and "none" both mean not meaningfully exposed; "a moderate amount"
#: and "a lot" both mean exposed.
_EXPECTED = {"Yes"}
_NOT_EXPECTED = {"No"}


def _to_dataset_category(feature: str, api_value: str) -> str:
    """Map one graded API answer onto the dataset's category for that feature."""
    if feature in {"radon_exposure"}:
        if api_value in {"none", "low"}:
            return "Low"
        return {"moderate": "Medium"}.get(api_value, "High")

    if feature in {"asbestos_exposure", "secondhand_smoke_exposure"}:
        return "Yes" if api_value in {"moderate", "high"} else "No"

    if feature == "alcohol_consumption":
        # The dataset records only Moderate and Heavy, so anything below
        # "moderate" is floored at the lowest level the model has ever seen.
        return "Heavy" if api_value == "high" else "Moderate"

    if feature in {"copd_diagnosis", "family_history"}:
        return "Yes" if api_value in {"yes", "true", "1"} else "No"

    # gender: the dataset is binary, so "other" has no counterpart.
    return "Male" if api_value == "male" else _CATEGORY_FALLBACK["gender"]


def known_categories(frame: pd.DataFrame, feature: str) -> list[str]:
    """Distinct values a categorical feature actually takes in the dataset."""
    if feature not in frame.columns:
        return []
    series = frame[feature].dropna().astype(str)
    return sorted(series.unique().tolist())


def resolve_category(feature: str, value: str, available: Iterable[str]) -> str:
    """Snap a translated value onto a category the dataset really contains.

    Guards against a dataset variant using a different spelling, which would
    otherwise become an all-zero column and lose the answer entirely.
    """
    options = [str(option) for option in available]
    if not options or value in options:
        return value

    normalised = {normalise(option): option for option in options}
    key = normalise(value)
    if key in normalised:
        return normalised[key]
    alias = _CATEGORY_ALIASES.get(key)
    if alias in options:
        return alias

    # Nothing matched: keep the feature in the model rather than dropping it.
    return options[0]


def format_value(feature: str, value: object) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "Not recorded"
    if feature == "age":
        return f"{float(value):.0f} years"
    if feature == "pack_years":
        return f"{float(value):.0f} pack-years"
    return str(value).capitalize()


def to_frame(records: Iterable[dict]) -> pd.DataFrame:
    return pd.DataFrame(list(records))
