"""Plain-language reading of an uploaded medical report.

What this module does
---------------------
It finds words and phrases in a report that are commonly used in lung imaging,
pathology and oncology, and explains each one in ordinary language.

What it deliberately does not do
--------------------------------
It does not interpret the report and it does not say what anything means for
the person who uploaded it. That judgement belongs to a qualified professional
who can see the whole picture. Nothing here states or implies that the person
has any condition; it only reports that particular wording appeared in the text.

Two details matter for accuracy:

* **Negation is respected.** Radiology reports describe what is *not* there as
  much as what is. "No pleural effusion" is a reassuring finding, so the reader
  must not present it as a problem.
* **Measurements are captured.** "8 mm" next to a finding is the single most
  useful number in a radiology report, so it is pulled out with the term.

No external or paid service is involved; the whole reader is this table plus
some pattern matching, so it runs offline and its output is reproducible.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable, Optional

# --------------------------------------------------------------------------- categories

CAT_IMAGING = "imaging"
CAT_NODES = "nodes"
CAT_STAGING = "staging"
CAT_PATHOLOGY = "pathology"
CAT_BIOMARKER = "biomarker"
CAT_FOLLOW_UP = "follow-up"
CAT_REASSURING = "reassuring"

CATEGORY_TITLES: dict[str, str] = {
    CAT_IMAGING: "Findings on the scan",
    CAT_NODES: "Lymph nodes",
    CAT_STAGING: "Staging and spread",
    CAT_PATHOLOGY: "Tissue sample results",
    CAT_BIOMARKER: "Gene and protein tests",
    CAT_FOLLOW_UP: "What the report recommends",
    CAT_REASSURING: "Reassuring wording",
}

#: Order findings are shown in, most substantive first.
CATEGORY_ORDER: list[str] = [
    CAT_STAGING,
    CAT_PATHOLOGY,
    CAT_BIOMARKER,
    CAT_IMAGING,
    CAT_NODES,
    CAT_FOLLOW_UP,
    CAT_REASSURING,
]


@dataclass(frozen=True)
class TermSpec:
    """One recognisable piece of report wording and how to explain it."""

    key: str
    category: str
    title: str
    patterns: tuple[str, ...]
    meaning: str
    why: str
    question: str
    #: True when the term is only meaningful in the negative ("no ...", "absent").
    reassuring: bool = False


def _t(
    key: str,
    category: str,
    title: str,
    patterns: Iterable[str],
    meaning: str,
    why: str,
    question: str,
    reassuring: bool = False,
) -> TermSpec:
    return TermSpec(
        key=key,
        category=category,
        title=title,
        patterns=tuple(patterns),
        meaning=meaning,
        why=why,
        question=question,
        reassuring=reassuring,
    )


#: The reader's whole vocabulary. Kept deliberately small and conservative: it
#: would be worse to explain a term badly than to leave it unrecognised.
TERMS: list[TermSpec] = [
    # ------------------------------------------------------------------ imaging
    _t(
        "nodule",
        CAT_IMAGING,
        "Nodule",
        [r"\bpulmonary nodule\b", r"\blung nodule\b", r"\bnodules?\b", r"\bnodular (?:opacity|lesion)\b"],
        "A spot or small lump seen on a scan.",
        "Most lung nodules are not cancer. Radiologists judge them by how big they "
        "are, what they look like, and whether they have changed since an earlier scan.",
        "How big is the nodule, and how will you monitor it over time?",
    ),
    _t(
        "ground-glass",
        CAT_IMAGING,
        "Ground-glass appearance",
        [r"\bground[- ]glass (?:nodule|opacity|lesion|shadow)\b", r"\bground[- ]glass\b"],
        "An area that looks hazy rather than solid.",
        "It is a description of how something looks on the scan, not a statement of "
        "what it is. These are often followed up over time rather than acted on immediately.",
        "Is this something you would follow up, and if so, when?",
    ),
    _t(
        "part-solid",
        CAT_IMAGING,
        "Part-solid appearance",
        [r"\bpart[- ]solid nodule\b", r"\bmixed (?:ground[- ]glass and solid) nodule\b"],
        "A nodule that is part hazy and part solid.",
        "This is recorded because the solid part is what tends to be measured and followed.",
        "Which part of it are you measuring, and how often would you repeat the scan?",
    ),
    _t(
        "mass",
        CAT_IMAGING,
        "Mass",
        [r"\bpulmonary mass\b", r"\bmass(?:es)?\b"],
        "A spot or lump. The word usually describes something larger than a nodule.",
        "'Mass' is a description of size and appearance, not a diagnosis in itself.",
        "What are the dimensions, and what is your reading of it?",
    ),
    _t(
        "spiculation",
        CAT_IMAGING,
        "Spiculated or lobulated edges",
        [r"\bspiculat(?:ed|ion)\b", r"\blobulated\b", r"\bcorona radiata\b"],
        "Edges that look ragged, lobed or spoke-like rather than smooth.",
        "Radiologists note the shape of an edge because it affects how closely they follow it.",
        "How does the shape of the edge affect your follow-up plan?",
    ),
    _t(
        "calcification",
        CAT_IMAGING,
        "Calcification",
        [r"\bcalcifi(?:ed|cation)\b", r"\bbenign[- ]looking calcification\b"],
        "Calcium deposited inside a finding.",
        "Calcification is one of the features that more often points to a benign, "
        "non-cancerous cause, so it is a reassuring detail when it is present.",
        "Does the calcification reassure you, or does it need no follow-up?",
    ),
    _t(
        "consolidation",
        CAT_IMAGING,
        "Consolidation",
        [r"\bconsolidat(?:ion|ed)\b"],
        "A denser area of lung where the tiny air sacs are filled with fluid or cells "
        "instead of air.",
        "This appearance is commonly seen with infection or inflammation, and less often "
        "with other causes. The context of the report matters.",
        "What do you think is causing this, and does it need treating or watching?",
    ),
    _t(
        "atelectasis",
        CAT_IMAGING,
        "Atelectasis (partial collapse)",
        [r"\batelecta(?:sis|tic)\b", r"\bvolume loss\b", r"\b(?:partial|subsegmental) collapse\b"],
        "A part of the lung that is partly collapsed rather than fully inflated.",
        "It is often described alongside a blocked airway or reduced lung volume.",
        "Is this something that needs attention, or will it resolve on its own?",
    ),
    _t(
        "opacity",
        CAT_IMAGING,
        "Opacity",
        [r"\bopacit(?:y|ies)\b", r"\bincreased density\b"],
        "A general word for an area that looks different from normal lung tissue.",
        "It is a description rather than a cause, which is why reports often add more "
        "detail or recommend comparing with an earlier scan.",
        "Can you tell me more about what this area represents?",
    ),
    _t(
        "pleural-effusion",
        CAT_IMAGING,
        "Pleural effusion",
        [r"\bpleural effusion\b", r"\bpleural fluid\b"],
        "Fluid collecting in the space between the lung and the chest wall.",
        "Small amounts are common and often need no action. The amount and whether it "
        "is new usually drive the decision.",
        "How large is the effusion, and does it need draining or watching?",
    ),
    _t(
        "pleural-thickening",
        CAT_IMAGING,
        "Pleural thickening",
        [r"\bpleural thickening\b", r"\bthickening of the pleura\b"],
        "The lining around the lung appearing thicker than usual.",
        "Mild thickening is common; the report usually records whether it is new or unchanged.",
        "Is this new compared with my previous scans?",
    ),
    _t(
        "pneumothorax",
        CAT_IMAGING,
        "Pneumothorax",
        [r"\bpneumothora(?:x|ces)\b"],
        "Air in the space between the lung and the chest wall, which can make the lung "
        "partly collapse.",
        "The size decides whether anything needs doing, and symptoms guide how quickly.",
        "How significant is this, and do I need any action for it?",
    ),
    _t(
        "emphysema",
        CAT_IMAGING,
        "Emphysema",
        [r"\bemphysema(?:tous)?\b"],
        "Damage that makes the lung's air sacs less elastic, so air is harder to empty.",
        "Usually discussed alongside breathing symptoms and smoking history.",
        "How much does this contribute to my breathing symptoms?",
    ),
    _t(
        "interstitial",
        CAT_IMAGING,
        "Interstitial change or fibrosis",
        [r"\binterstitial lung disease\b", r"\bpulmonary fibrosis\b", r"\binterstitial (?:change|thickening)\b"],
        "Scarring or thickening of the fine tissue between the lung's air sacs.",
        "This is a long-term change and is usually described in terms of whether it is "
        "stable or has progressed.",
        "Is this stable compared with before, and does it need monitoring?",
    ),
    # -------------------------------------------------------------------- nodes
    _t(
        "lymphadenopathy",
        CAT_NODES,
        "Enlarged lymph nodes",
        [r"\b(?:mediastinal|hilar|axillary|retroperitoneal) lymphadenopathy\b",
         r"\blymphadenopathy\b", r"\benlarged (?:mediastinal|hilar) (?:lymph )?nodes?\b",
         r"\bmediastinal nodal\b"],
        "Lymph nodes near the lung that are larger than expected.",
        "Lymph nodes drain fluid from the lung, so radiologists check them carefully. "
        "Size alone does not tell you the cause — nodes can be enlarged for many reasons.",
        "Which nodes are enlarged, how large are they, and how do you interpret them?",
    ),
    # ------------------------------------------------------------------ staging
    _t(
        "tnm",
        CAT_STAGING,
        "TNM staging",
        [r"\bT[0-4]\b(?:\s*[NMX][0-4a-b]?\s*[M][0-4][ab]?)?", r"\bTNM\b"],
        "A way of describing a finding using three letters: T for the tumour itself, "
        "N for nearby lymph nodes, and M for spread elsewhere in the body.",
        "Staging groups everything known about the extent of a finding so that options "
        "can be compared and outcomes tracked.",
        "Can you explain my TNM stage and what each letter means for me?",
    ),
    _t(
        "stage",
        CAT_STAGING,
        "Stage",
        [r"\bstage\s*(?:I{1,3}V?|IV|IV[AB]?)\b", r"\bstaging\b"],
        "A grouping that combines size, lymph node involvement and any spread, usually "
        "into stages I to IV.",
        "Stages are used to plan and to compare results over time. They are not a measure "
        "of how well someone will do, and they are not a treatment plan.",
        "What does my stage mean, and what options does it open up?",
    ),
    _t(
        "metastatic",
        CAT_STAGING,
        "Spread to another site",
        [r"\bmetasta(?:tic|sis|tically)\b", r"\bdistant spread\b", r"\bspread to the\b",
         r"\bm(?:1|1[ab])\b"],
        "Cells have been found at a site away from where the problem started.",
        "When this appears, the focus of discussion often shifts to which sites are "
        "involved and how they are being monitored.",
        "Which sites are involved, and how are they being monitored?",
    ),
    _t(
        "invasion",
        CAT_STAGING,
        "Invasion of a nearby structure",
        [r"\binvad(?:es|ed|ing)\b", r"\binvasion\b"],
        "A finding has grown into a structure next to it.",
        "Which structures are involved is one of the main things that shapes planning.",
        "Which nearby structures are involved, and does that change the options?",
    ),
    _t(
        "resectability",
        CAT_STAGING,
        "Whether something can be removed",
        [r"\bunresectable\b", r"\bresectable\b", r"\bsurgically (?:resectable|curable)\b"],
        "A judgement about whether the finding could be removed by an operation.",
        "This is one of the biggest factors in which options are discussed, and it "
        "depends on the whole picture rather than any single scan.",
        "What makes this resectable or not, and who is assessing that?",
    ),
    # ---------------------------------------------------------------- pathology
    _t(
        "biopsy",
        CAT_PATHOLOGY,
        "Biopsy",
        [r"\bbiops(?:y|ies)\b", r"\btissue sample\b"],
        "A small sample of tissue taken to be examined under a microscope.",
        "A biopsy is usually what turns a scan finding into a definite answer about what "
        "the cells are doing.",
        "Was a tissue sample taken, and what did it show?",
    ),
    _t(
        "adenocarcinoma",
        CAT_PATHOLOGY,
        "Adenocarcinoma",
        [r"\badenocarcinoma\b"],
        "One of the main cell patterns found in lung cancer, usually arising in the outer "
        "part of the lung.",
        "The cell pattern matters because it is tested for particular gene changes that "
        "can affect which treatments are considered.",
        "Which type is it, and what testing has been done on the sample?",
    ),
    _t(
        "squamous",
        CAT_PATHOLOGY,
        "Squamous cell carcinoma",
        [r"\bsquamous cell (?:carcinoma|cancer)\b"],
        "Another main cell pattern, usually arising closer to the centre of the lung.",
        "As with any cell type, the results of specific tests on the sample guide the options.",
        "Which type is it, and what tests have been done?",
    ),
    _t(
        "small-cell",
        CAT_PATHOLOGY,
        "Small cell carcinoma",
        [r"\bsmall cell (?:carcinoma|cancer)\b"],
        "A faster-growing cell pattern, usually found more centrally.",
        "Cell type is one of the main things that shapes how quickly things are discussed "
        "and treated.",
        "Can you explain what this type means for the approach?",
    ),
    _t(
        "histology",
        CAT_PATHOLOGY,
        "Histology",
        [r"\bhistolog(?:y|ical)\b", r"\bcell (?:type|pattern)\b", r"\bmicroscop(?:y|ic)\b"],
        "The description of what the cells look like under a microscope.",
        "This is the part of a pathology report that says what the tissue actually shows.",
        "Can you walk me through the histology section?",
    ),
    _t(
        "differentiation",
        CAT_PATHOLOGY,
        "Degree of differentiation",
        [r"\bwell[- ]differentiated\b", r"\bpoorly[- ]differentiated\b",
         r"\bmoderately[- ]differentiated\b", r"\bdifferentiation\b"],
        "How closely the cells resemble normal cells.",
        "It is a description written by the person examining the sample, and it is part of "
        "the information used when planning.",
        "What does the degree of differentiation tell you?",
    ),
    _t(
        "margins",
        CAT_PATHOLOGY,
        "Surgical margins",
        [r"\bsurgical margins?\b", r"\bmargins? (?:are|were) (?:negative|positive|clear|involved|free|uninvolved)\b",
         r"\bnegative margins?\b", r"\bpositive margins?\b", r"\bclear margins?\b",
         r"\bmargin status\b", r"\bmargin(?:s)? involvement\b", r"\br0\b", r"\br1\b", r"\br2\b"],
        "The cut edges of tissue that was removed.",
        "Clear or negative margins mean no abnormal cells were seen at the cut edge. "
        "This is one of the most closely read parts of a pathology report.",
        "What do my margins show, and what does that mean for follow-up?",
    ),
    _t(
        "lvi",
        CAT_PATHOLOGY,
        "Lymphovascular or perineural invasion",
        [r"\blymphovascular invasion\b", r"\bperineural invasion\b", r"\blvi\b", r"\bpni\b"],
        "Whether abnormal cells were seen inside small blood vessels or nerves.",
        "It is recorded because it is one of the features considered when planning and when "
        "deciding about further testing.",
        "Was this seen, and how does it affect the plan?",
    ),
    # --------------------------------------------------------------- biomarkers
    _t(
        "egfr",
        CAT_BIOMARKER,
        "EGFR",
        [r"\begfr\b"],
        "A gene, tested on the tissue sample for particular changes.",
        "These tests exist because some treatments work specifically on certain gene "
        "changes, so the result can change which options are available.",
        "Was EGFR tested, and what did it show?",
    ),
    _t(
        "alk",
        CAT_BIOMARKER,
        "ALK",
        [r"\balk\b"],
        "Another gene tested for a specific change.",
        "Like other gene tests, it is done to see whether a targeted option might apply.",
        "Was ALK tested, and what was the result?",
    ),
    _t(
        "ros1-braf-kras",
        CAT_BIOMARKER,
        "Other gene changes (ROS1, BRAF, KRAS)",
        [r"\bros1\b", r"\bbraf\b", r"\bkras\b"],
        "More genes that can be checked for specific changes on the sample.",
        "They are tested as part of working out which options are open.",
        "Which of these were tested, and what did they show?",
    ),
    _t(
        "met-exon14-ret-ntrk-her2",
        CAT_BIOMARKER,
        "Other targetable gene changes",
        [r"\bmet exon 14\b", r"\bexon 14\b", r"\bret\b", r"\bntrk\b", r"\bher2\b"],
        "Further gene changes that are sometimes tested for.",
        "Each is checked because it can point towards a specific treatment option.",
        "Which of these tests were done, and what were the results?",
    ),
    _t(
        "pdl1",
        CAT_BIOMARKER,
        "PD-L1",
        [r"\bpd[- ]?l1\b", r"\btps\b", r"\bcps\b", r"\bprogrammed death[- ]ligand\b"],
        "A protein measured in the tissue sample, reported as a percentage.",
        "It is one of the numbers used when comparing treatment options, alongside your "
        "health and the stage.",
        "What is my PD-L1 level, and what does it mean for the options?",
    ),
    _t(
        "other-molecular",
        CAT_BIOMARKER,
        "Other laboratory markers",
        [r"\btumour mutational burden\b", r"\btmb\b", r"\bmsi[- ]?h\b", r"\bdmmr\b",
         r"\bimmunohistochemistry\b", r"\bihc\b"],
        "Other tests done on the sample.",
        "These are reported so the full picture is available when options are compared.",
        "Can you explain what each of these results means for me?",
    ),
    _t(
        "test-result-value",
        CAT_BIOMARKER,
        "The result of a test",
        [r"\bwild[- ]?type\b", r"\bnot detected\b", r"\bamplified\b", r"\bmutated\b",
         r"\bmutation detected\b", r"\bexpressed\b", r"\bpositive for\b", r"\bnegative for\b"],
        "The outcome of a named test.",
        "Results are always read together with the rest of the report rather than alone.",
        "What does this result mean alongside the rest of my report?",
    ),
    # --------------------------------------------------------------- follow-up
    _t(
        "follow-up",
        CAT_FOLLOW_UP,
        "A recommended follow-up",
        [r"\bfollow[- ]?up\b", r"\brepeat (?:ct|scan|imaging)\b",
         r"\b(?:in|within) \d+ (?:weeks?|months?|years?)\b", r"\bsix[- ]month\b",
         r"\brepeat in\b", r"\bmonitor(?:ing)? interval\b"],
        "The report suggests looking again later.",
        "The interval is chosen based on how a finding behaves over time, and it is one of "
        "the easiest things to ask about.",
        "What follow-up are you recommending, and when should I have it?",
    ),
    _t(
        "clinical-correlation",
        CAT_FOLLOW_UP,
        "A recommendation to compare with symptoms",
        [r"\bclinical(?:ly)? correlat(?:e|ed|ion)\b", r"\bcorrelate clinically\b",
         r"\bcorrelation with\b", r"\bin the clinical context\b"],
        "The report asks that its findings be read alongside your symptoms and history.",
        "This is standard wording meaning the report is one part of the picture, not the "
        "whole of it.",
        "What should I be watching for between appointments?",
    ),
    _t(
        "comparison",
        CAT_FOLLOW_UP,
        "Comparison with an earlier scan",
        [r"\bcompar(?:ed|ison) (?:to|with)\b", r"\bprevious(?:ly)? (?:ct|scan|study)\b",
         r"\binterval (?:increase|decrease|growth)\b", r"\bstable (?:compared|since)\b",
         r"\bno significant (?:interval )?change\b", r"\bprogressive\b"],
        "The report compares this scan with an earlier one.",
        "Change over time is usually the most useful thing in follow-up, because a finding "
        "that is stable behaves very differently from one that is growing.",
        "How does this compare with my previous scans?",
    ),
    # -------------------------------------------------------------- reassuring
    _t(
        "no-opacity",
        CAT_REASSURING,
        "No area of concern described",
        [r"\bno (?:focal )?(?:airspace )?opacity\b", r"\bno (?:focal )?consolidation\b",
         r"\bno (?:focal )?infiltrate\b", r"\blungs? (?:are|remain) clear\b"],
        "The report does not describe a focal area of concern in the lungs.",
        "Reassuring wording, but it applies to what was scanned and when.",
        "Does this cover everything you would want checked?",
    ),
    _t(
        "no-acute",
        CAT_REASSURING,
        "No acute problem found",
        [r"\bno acute (?:cardiopulmonary|abnormality|process|finding)", r"\bno acute disease\b",
         r"\bnormal chest\b", r"\bwithin normal limits\b", r"\bunremarkable\b"],
        "The report does not describe an immediate problem.",
        "Reassuring wording, but it always applies to what was scanned and when — the "
        "report is not a statement about the future.",
        "Does this cover everything you would want checked?",
    ),
    _t(
        "no-nodule",
        CAT_REASSURING,
        "No nodule seen",
        [r"\bno (?:evidence of |suspicious |definite )?(?:pulmonary )?nodules?\b",
         r"\bno (?:evidence of )?(?:focal )?masses?\b", r"\bno focal (?:lesion|mass|opacity)\b"],
        "The scan did not show a nodule or mass.",
        "This is a statement about this scan at this time.",
        "How long does a clear scan usually stay reassuring for someone with my history?",
    ),
    _t(
        "no-nodes-enlarged",
        CAT_REASSURING,
        "No enlarged lymph nodes",
        [r"\bno (?:enlarged |pathologically enlarged |suspicious )?(?:mediastinal |hilar )?lymphadenopathy\b",
         r"\bno enlarged (?:mediastinal |hilar )?(?:lymph )?nodes?\b"],
        "The scan did not show enlarged lymph nodes.",
        "This is reassuring, and is often checked repeatedly over time.",
        "Do I need this checked again, and if so when?",
    ),
    _t(
        "no-metastasis",
        CAT_REASSURING,
        "No sign of spread",
        [r"\bno (?:evidence of )?metasta(?:sis|tic disease)\b",
         r"\bno distant (?:metastases|spread)\b", r"\bm0\b"],
        "The report does not describe spread to another site.",
        "This is a statement about the areas that were scanned.",
        "Which areas were covered, and how often should this be repeated?",
    ),
    _t(
        "no-pleural-fluid",
        CAT_REASSURING,
        "No pleural fluid",
        [r"\bno (?:evidence of )?pleural effusion\b", r"\bno pleural fluid\b",
         r"\bno pleural fluid\b", r"\bwithout (?:a )?pleural effusion\b"],
        "The report does not describe fluid collecting around the lung.",
        "Reassuring wording for that specific area of the scan.",
        "Is there anything else on the scan I should know about?",
    ),
    _t(
        "no-pneumothorax",
        CAT_REASSURING,
        "No air leak around the lung",
        [r"\bno pneumothorax\b", r"\bno evidence of pneumothorax\b"],
        "The report does not describe air in the space around the lung.",
        "Reassuring wording for that specific area of the scan.",
        "Is there anything else on the scan I should know about?",
    ),
]

# ------------------------------------------------------------------------ detection

#: Phrases that mean the surrounding term is being described as *absent*.
_NEGATIONS = (
    "no evidence of",
    "no evidence for",
    "no radiographic",
    "no suspicious",
    "no definite",
    "no signs of",
    "no sign of",
    "no evidence",
    "not identified",
    "not present",
    "not seen",
    "negative for",
    "absence of",
    "unremarkable for",
    "free of",
    "ruled out",
    "absent",
    "excluded",
    "without",
    "resolved",
    "no",
)

#: A negation governs a list it introduces, so "no pleural effusion, pneumothorax
#: or atelectasis" negates all three. The words allowed to sit between the
#: negation and the term are therefore a short coordination tail.
_COORDINATION = re.compile(r"^[\w\s\-/,()]*$", re.UNICODE)
_MAX_COORDINATION_WORDS = 6

#: Negations are matched on word boundaries. Plain substring matching would read
#: the "no" inside "adenocarcinoma" or "lymphadenopathy" as a negation and
#: silently turn a positive finding into a negative one.
_NEGATION_RE = re.compile(
    r"\b(?:" + "|".join(sorted(_NEGATIONS, key=len, reverse=True)) + r")\b", re.I
)

_MM = re.compile(r"(\d+(?:\.\d+)?)\s*(mm|cm|millimet(?:er|re)s?|centimet(?:er|re)s?)", re.I)
_NODAL = re.compile(r"(?:short[- ]axis|measur\w*)\D{0,20}(\d+(?:\.\d+)?)\s*(mm|cm)", re.I)
#: A follow-up interval. Real reports put the kind of scan between the verb and
#: the interval ("repeat CT in 6 months"), and sometimes give a range
#: ("in 4-6 weeks"), so both are handled.
_FOLLOW_UP = re.compile(
    r"((?:repeat|re-?scan|re-?image|recheck|follow[- ]?up|surveillance)\w*"
    r"(?:[\s\-]+(?:ct|ct\s*/\s*hrct|hrct|scan|imaging|chest|film|x-?ray|radiograph))*)"
    r"[\s\-]*(?:in|after|within|at)?[\s\-]*"
    r"(\d+)(?:[\s\-]*(?:-|–|to)\s*(\d+))?[\s\-]*(week|month|year)s?\b",
    re.I,
)

#: A non-reassuring term that is negated is dropped when this reassuring
#: counterpart matched, so the same fact is not reported twice.
REASSURING_COUNTERPART: dict[str, str] = {
    "pleural-effusion": "no-pleural-fluid",
    "pneumothorax": "no-pneumothorax",
    "metastatic": "no-metastasis",
    "lymphadenopathy": "no-nodes-enlarged",
    "nodule": "no-nodule",
    "mass": "no-nodule",
    "opacity": "no-opacity",
    "consolidation": "no-opacity",
}

#: Measurements only make sense for physical findings.
_MEASURED_CATEGORIES = {CAT_IMAGING, CAT_NODES}

SPEC_BY_KEY: dict[str, TermSpec] = {spec.key: spec for spec in TERMS}

#: Longest stretch of text searched backwards for a negation. Bounded so a
#: negation cannot reach across unrelated sentences.
_NEGATION_WINDOW = 90

_CLAUSE_BREAK = re.compile(r"[.;]")


@dataclass
class ReportFinding:
    key: str
    category: str
    title: str
    matched: str
    meaning: str
    why: str
    question: str
    negated: bool = False
    measurement: Optional[str] = None
    extra: list[str] = field(default_factory=list)


@dataclass
class ReportReading:
    document_kind: str
    character_count: int
    findings: list[ReportFinding]
    follow_up: list[str]
    categories_present: list[str]
    notes: list[str]

    @property
    def recognised_count(self) -> int:
        return len(self.findings)

    @property
    def question_count(self) -> int:
        return len({f.question for f in self.findings})


def _snippet(text: str, start: int, end: int, width: int = 150) -> str:
    """A readable window of the report around a match."""
    left = max(0, start - width // 3)
    right = min(len(text), end + (width * 2) // 3)
    chunk = text[left:right].strip()
    chunk = re.sub(r"\s+", " ", chunk)
    if left > 0:
        chunk = "…" + chunk
    if right < len(text):
        chunk = chunk + "…"
    return chunk


def _is_negated(text: str, match_start: int) -> bool:
    """True when the wording before a match says the finding is *not* present.

    The search is bounded to the current clause, because a negation belongs to
    the sentence it appears in. From there the last negation phrase is taken and
    the text between it and the term must look like a short coordination tail
    ("opacity, pleural effusion or pneumothorax"), which is how a single "no"
    governs a list.
    """
    window_start = max(0, match_start - _NEGATION_WINDOW)
    prefix = text[window_start:match_start]

    breaks = list(_CLAUSE_BREAK.finditer(prefix))
    clause = prefix[breaks[-1].end() :] if breaks else prefix

    matches = list(_NEGATION_RE.finditer(clause))
    if not matches:
        return False

    last = matches[-1]
    tail = clause[last.end() :]
    if not _COORDINATION.match(tail):
        return False
    if len(tail.split()) > _MAX_COORDINATION_WORDS:
        return False
    # A second negation means the first was already consumed by an earlier item
    # in the list, so this term is being asserted rather than denied.
    if _NEGATION_RE.search(tail):
        return False
    return True


def _measurement_for(text: str, start: int, end: int, category: str) -> Optional[str]:
    """Pull the size that belongs to this finding, if it is a physical finding.

    Only the same clause is searched, and the measurement closest to the term
    wins, so a node's size is not attributed to a nearby nodule.
    """
    if category not in _MEASURED_CATEGORIES:
        return None

    # Everything after the term, up to the end of its sentence.
    clause_end = _CLAUSE_BREAK.search(text, end)
    tail = text[end : clause_end.start() if clause_end else len(text)]

    # Everything before the term, but only back to the start of its sentence, so
    # a size belonging to the previous sentence is never borrowed.
    head_start = max(start - 40, 0)
    preceding = text[head_start:start]
    breaks = list(_CLAUSE_BREAK.finditer(preceding))
    if breaks:
        head_start += breaks[-1].end()
    head = text[head_start:start]

    for candidate in (tail, head):
        nodal = _NODAL.search(candidate)
        if nodal:
            return f"{nodal.group(1)} {_unit(nodal.group(2))}"
        size = _MM.search(candidate)
        if size:
            return f"{size.group(1)} {_unit(size.group(2))}"
    return None


def _unit(raw: str) -> str:
    lowered = raw.lower()
    if lowered.startswith("cm") or lowered.startswith("centimet"):
        return "cm"
    if lowered.startswith("millimet"):
        return "mm"
    return lowered


def _document_kind(text: str) -> str:
    lowered = text.lower()
    if re.search(
        r"\b(?:ct|computed tomography|hrct|lung window|chest x-?ray|chest radiograph|thoracic)\b",
        lowered,
    ):
        return "A scan report"
    if re.search(r"\b(?:histopatholog|pathology report|surgical specimen|final diagnosis)\b", lowered):
        return "A pathology report"
    if re.search(r"\b(?:discharge summary|clinical notes?|progress note|consultation)\b", lowered):
        return "A clinical note"
    if re.search(r"\b(?:pd[- ]?l1|egfr|alk|immunohistochemistry|biomarker)\b", lowered):
        return "A test results report"
    return "A medical document"


def _follow_up_sentences(text: str) -> list[str]:
    """Clean "in 6 months" style recommendations found in the text."""
    results: list[str] = []
    for match in _FOLLOW_UP.finditer(text):
        action = re.sub(r"\s+", " ", match.group(1)).strip().rstrip("- ")
        first, second, unit = match.group(2), match.group(3), match.group(4).lower()
        span = first if not second else f"{first} to {second}"
        plural = "" if span == "1" else "s"
        results.append(f"{action} in {span} {unit}{plural}")
    return list(dict.fromkeys(results))[:4]


def read_report(text: str) -> ReportReading:
    """Explain the lung-related wording found in a report."""
    # Every run of whitespace becomes a single space. Reports are hard-wrapped,
    # and a line break in the middle of a sentence must not hide a negation
    # that governs the rest of it. Sentences are still separated by ";" and ".",
    # so list items keep their own negations.
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    notes: list[str] = []
    found: dict[str, ReportFinding] = {}

    for spec in TERMS:
        for pattern in spec.patterns:
            match = next(re.finditer(pattern, cleaned, re.I), None)
            if match is None:
                continue
            negated = _is_negated(cleaned, match.start())
            # A reassuring term only counts when it is negated: "no pleural
            # effusion" is reassuring, "pleural effusion" on its own is not.
            if spec.reassuring and not negated:
                continue
            found.setdefault(
                spec.key,
                ReportFinding(
                    key=spec.key,
                    category=spec.category,
                    title=spec.title,
                    matched=_snippet(cleaned, match.start(), match.end()),
                    meaning=spec.meaning,
                    why=spec.why,
                    question=spec.question,
                    negated=negated,
                    measurement=_measurement_for(
                        cleaned, match.start(), match.end(), spec.category
                    ),
                ),
            )
            break  # one entry per term keeps the explanation readable

    # A denied finding belongs in the reassuring card, not in the findings list:
    # "no pleural effusion" is good news, and reading it as a problem with a
    # "not present" badge would be needlessly alarming. Where a dedicated
    # reassuring entry exists it is synthesised from the denied one, so
    # coordinated phrasing such as "no focal opacity, pleural effusion or
    # pneumothorax" is still reported as reassurance rather than as findings.
    for key, counterpart in REASSURING_COUNTERPART.items():
        finding = found.get(key)
        if finding is None or not finding.negated or counterpart in found:
            continue
        spec = SPEC_BY_KEY.get(counterpart)
        if spec is None:
            continue
        found[counterpart] = ReportFinding(
            key=counterpart,
            category=CAT_REASSURING,
            title=spec.title,
            matched=finding.matched,
            meaning=spec.meaning,
            why=spec.why,
            question=spec.question,
            negated=False,
            measurement=None,
        )

    # Drop the denied original now that its reassuring counterpart carries it.
    findings = [
        finding
        for finding in found.values()
        if not (
            finding.negated
            and REASSURING_COUNTERPART.get(finding.key, finding.key) in found
        )
    ]

    order = {category: index for index, category in enumerate(CATEGORY_ORDER)}
    findings.sort(key=lambda f: (order.get(f.category, 99), f.title.lower()))

    present = list(dict.fromkeys(f.category for f in findings))
    present.sort(key=lambda c: order.get(c, 99))

    if not findings:
        notes.append(
            "No lung-related terms were recognised in the text. That does not mean the report is "
            "normal — it means this reader did not recognise the wording it uses."
        )
    if len(cleaned) < 400:
        notes.append(
            "Only a short amount of text was available. Longer reports usually contain more "
            "recognisable terms."
        )

    return ReportReading(
        document_kind=_document_kind(cleaned),
        character_count=len(cleaned),
        findings=findings,
        follow_up=_follow_up_sentences(cleaned),
        categories_present=present,
        notes=notes,
    )


# ------------------------------------------------------------------- extraction

_PDF_MAGIC = b"%PDF"


def extract_text(data: bytes, filename: str) -> str:
    """Pull plain text out of an uploaded PDF, DOCX or text file.

    Scanned images cannot be read without OCR, which this project does not ship.
    Rather than guess, an image produces an empty string and the caller explains
    the limitation instead of returning a misleading partial reading.
    """
    name = (filename or "").lower()
    data = data or b""

    if data[:4] == _PDF_MAGIC:
        return _read_pdf(data)
    if name.endswith(".docx") or data[:2] == b"PK":
        return _read_docx(data)
    if name.endswith((".txt", ".md", ".rtf", ".csv")) or _looks_like_text(data):
        return _decode(data)
    return ""


def _decode(data: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(encoding)
        except (UnicodeDecodeError, UnicodeError):
            continue
    return ""


def _looks_like_text(data: bytes) -> bool:
    if not data:
        return False
    sample = data[:2048]
    if b"\x00" in sample:
        return False
    printable = sum(1 for byte in sample if 32 <= byte <= 126 or byte in (9, 10, 13))
    return printable / len(sample) > 0.85


def _read_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader
        import io

        reader = PdfReader(io.BytesIO(data))
        pages = [(page.extract_text() or "") for page in reader.pages]
        return "\n".join(pages).strip()
    except Exception:
        return ""


def _read_docx(data: bytes) -> str:
    try:
        import io

        from docx import Document

        document = Document(io.BytesIO(data))
        return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    except Exception:
        return ""
