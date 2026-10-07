/**
 * Lung cancer knowledge base and retrieval engine.
 *
 * Why a curated knowledge base rather than a language model
 * --------------------------------------------------------
 * This answers medical questions, and the project's constraints rule out a paid
 * API. A free-form generator would be cheap but it invents: it can state
 * something confidently that no source supports, and on health topics that is
 * not an acceptable failure mode. So every answer here is written, reviewed
 * general information keyed to what the person actually asked.
 *
 * The trade-off is deliberate: this knows a well-chosen set of topics very well
 * and says "I don't cover that" rather than guessing outside them. The chatbot
 * layer that uses this is responsible for the safety rules, not the data.
 */

export interface KnowledgeSource {
  name: string
  url: string
}

export interface KnowledgeTopic {
  id: string
  title: string
  /** Phrasings and content words, most specific first. */
  keywords: string[]
  /** The short, direct answer. */
  summary: string
  /** Extra paragraphs shown under "More detail". */
  detail?: string[]
  /** Technical words explained inline, in the order they appear. */
  glossary?: [string, string][]
  /** Ids of related topics offered as follow-ups. */
  seeAlso?: string[]
  /** Shown when a person may need to act on this. */
  professionalAdvice?: string
  /** Shown only where a genuine red flag exists. */
  urgent?: string
  sources: KnowledgeSource[]
}

const NHS = { name: 'NHS', url: 'https://www.nhs.uk/conditions/lung-cancer/' }
const CRUK = { name: 'Cancer Research UK', url: 'https://www.cancerresearchuk.org/about-cancer/lung-cancer' }
const ACS = { name: 'American Cancer Society', url: 'https://www.cancer.org/cancer/types/lung-cancer.html' }
const NCI = { name: 'National Cancer Institute', url: 'https://www.cancer.gov/types/lung' }
const BLF = { name: 'British Lung Foundation', url: 'https://www.britishlung.org.uk' }
const WHO = { name: 'World Health Organization', url: 'https://www.who.int/health-topics/lung-cancer' }

export const KNOWLEDGE: KnowledgeTopic[] = [
  {
    id: 'what-is',
    title: 'What lung cancer is',
    keywords: [
      'what is lung cancer', 'what is a lung tumour', 'what is a lung tumor',
      'lung cancer is', 'lung tumour', 'lung tumor', 'lung cancer meaning',
      'what does lung cancer mean',
    ],
    summary:
      'Lung cancer is a group of diseases where cells in the lung grow in a way that is not controlled. Because the lungs have a lot of surface area and a rich blood supply, it is one of the cancers most likely to spread early to other parts of the body.',
    detail: [
      'Almost all lung cancer falls into two broad groups. Non-small cell lung cancer accounts for around 85 in every 100 cases, and small cell lung cancer for around 15. They behave differently and are treated differently.',
      'Lung cancer is one of the most common cancers in the world. It is also one of the most preventable, because the largest risk factor — smoking — is modifiable.',
    ],
    glossary: [
      ['malignant', 'growing in a way that can spread to other parts of the body'],
      ['carcinoma', 'a cancer that starts in the epithelial cells that line organs and tubes'],
    ],
    seeAlso: ['types', 'causes', 'symptoms'],
    sources: [NHS, CRUK, ACS],
  },
  {
    id: 'types',
    title: 'The main types',
    keywords: [
      'types of lung cancer', 'kinds of lung cancer', 'what types', 'adenocarcinoma',
      'squamous', 'small cell', 'nsclc', 'sclc', 'non small cell', 'non-small cell',
      'large cell', 'adeno', 'difference between types', 'cell type',
    ],
    summary:
      'The main types are adenocarcinoma, squamous cell carcinoma and small cell carcinoma. The type matters because it is tested for particular gene changes and, to some extent, shapes which treatments are considered.',
    detail: [
      'Adenocarcinoma usually starts in the outer part of the lung and is the most common type overall. It is also the most common type in people who have never smoked.',
      'Squamous cell carcinoma usually starts closer to the centre of the lung, often in a smoker, and is closely linked with smoking.',
      'Small cell carcinoma is a faster-growing type that is usually found near the centre of the lung. It is much less common and is treated differently from the others.',
    ],
    glossary: [
      ['non-small cell lung cancer (NSCLC)', 'the broad group that includes adenocarcinoma and squamous cell carcinoma'],
    ],
    seeAlso: ['what-is', 'biomarkers', 'staging'],
    sources: [NCI, CRUK, ACS],
  },
  {
    id: 'symptoms',
    title: 'Symptoms',
    keywords: [
      'symptoms of lung cancer', 'symptoms', 'signs of lung cancer', 'signs',
      'how do i know', 'early symptoms', 'warning signs', 'cough', 'coughing up blood',
      'haemoptysis', 'hemoptysis', 'breathless', 'shortness of breath', 'weight loss',
      'fatigue', 'chest pain', 'repeated chest infections', 'i feel unwell',
      'persistent cough', 'cough that will not go away',
    ],
    summary:
      'The common symptoms are a cough that does not go away, coughing up blood, breathlessness, chest or shoulder pain that does not improve, repeated infections, losing weight without trying, and feeling constantly tired.',
    detail: [
      'Early lung cancer often causes no symptoms at all. That is the main reason screening exists: waiting for symptoms usually means the cancer has already spread.',
      'These same symptoms are far more often caused by things that are not cancer, such as a chest infection, asthma, COPD, heartburn or anxiety. Having a symptom does not mean that cancer is the cause. It means it is worth getting checked.',
    ],
    seeAlso: ['when-to-see-doctor', 'screening', 'diagnosis'],
    urgent:
      'Coughing up blood, sudden severe breathlessness, or coughing up more than a streak of blood are reasons to seek urgent medical care rather than wait for a routine appointment.',
    professionalAdvice:
      'If a cough has lasted more than three weeks, or you keep bringing up blood, ask your healthcare professional to look into it. Mention it even if you feel otherwise well.',
    sources: [NHS, CRUK, ACS, BLF],
  },
  {
    id: 'causes',
    title: 'Causes and risk factors',
    keywords: [
      'what causes lung cancer', 'causes', 'risk factors', 'am i at risk',
      'who gets lung cancer', 'smoking and lung cancer', 'does smoking cause',
      'is it hereditary', 'genetic', 'non smoker', 'never smoked', 'why do i have it',
    ],
    summary:
      'Smoking is by far the biggest cause. It causes the large majority of lung cancers. Other things raise the risk too, including radon gas in the home, asbestos exposure, a family history, and some medical conditions.',
    detail: [
      'Smoking is linked to the great majority of lung cancer cases. Risk rises with how many cigarettes you smoke and how many years you have smoked for, described as pack-years. Pipe and cigar smoking carries a similar risk.',
      'Radon is a radioactive gas that seeps up from the ground into buildings, particularly ground floors and cellars. It is the leading cause of lung cancer among people who have never smoked, and the second overall.',
      'Other exposures that raise risk include asbestos, diesel exhaust and certain workplace dusts. Having a family history of lung cancer, or a condition such as COPD, also increases risk.',
    ],
    glossary: [
      ['pack-year', 'a way of expressing lifetime smoking: one pack of 20 cigarettes a day for one year'],
    ],
    seeAlso: ['smoking', 'screening', 'prevention'],
    professionalAdvice:
      'If you smoke, a conversation with your healthcare professional about stopping is the single most useful thing you can do for your lungs. Support is much more likely to work than willpower alone.',
    sources: [NCI, ACS, CRUK, BLF],
  },
  {
    id: 'smoking',
    title: 'Smoking, quitting and second-hand smoke',
    keywords: [
      'should i quit smoking', 'stop smoking', 'quitting', 'quitting smoking',
      'smoking and treatment', 'second hand smoke', 'passive smoking', 'vaping',
      'e cigarettes', 'cigarettes', 'can i still smoke if i have cancer',
      'smoking after diagnosis', 'how many cigarettes', 'smoke',
    ],
    summary:
      'Stopping smoking is worthwhile at any stage — including after a diagnosis, where it is linked to better outcomes and fewer complications from surgery and treatment. It is never too late to benefit.',
    detail: [
      'Second-hand smoke carries much of the same risk as smoking yourself. In many places, indoor public smoking has been restricted for this reason.',
      'Vaping does not appear to carry the same risk as smoking, but the long-term picture is still being studied. If you vape to stop smoking, that is a reduction in harm; if you vape instead of never stopping, it is not.',
    ],
    seeAlso: ['causes', 'prevention', 'treatment'],
    professionalAdvice:
      'Stopping smoking is the one lung-related action with the clearest evidence behind it. Ask your healthcare professional about the support available to you, and about medicines that can help.',
    sources: [NCI, CRUK, BLF, NHS],
  },
  {
    id: 'prevention',
    title: 'Prevention',
    keywords: [
      'prevent lung cancer', 'prevention', 'how to prevent', 'reduce risk',
      'can i avoid', 'healthy lungs', 'protect my lungs',
    ],
    summary:
      'Not smoking, avoiding second-hand smoke, and testing your home for and reducing radon are the main steps within your control. Screening catches lung cancer early in the people most at risk, which is what makes it effective.',
    detail: [
      'Testing your home for radon is cheap and easy, and fixing high levels is usually straightforward. This matters especially if you live in an older building or spend a lot of time in a basement or ground floor.',
      'Air pollution and occupational exposures are harder to control individually, but knowing your exposure history is useful for your healthcare professional.',
    ],
    seeAlso: ['smoking', 'causes', 'screening'],
    sources: [NCI, CRUK, BLF],
  },
  {
    id: 'screening',
    title: 'Screening and who is offered it',
    keywords: [
      'screening', 'screening test', 'who should be screened', 'eligibility',
      'lung check', 'lung health check', 'should i get screened', 'low dose ct',
      'ldct', 'annual scan', 'early detection',
    ],
    summary:
      'Screening is a low-dose CT scan offered to people at higher risk, usually those who smoke or used to smoke. It finds lung cancer earlier, when treatment is more likely to work.',
    detail: [
      'Screening is aimed at people at higher risk — generally adults in a middle or older age range who smoke now or smoked in the past. Eligibility rules differ between countries and change over time, so the best starting point is to ask whether your local programme includes you.',
      'A screening scan is not a diagnosis. It often leads to a second, more detailed scan, a blood test or a small sample of tissue, and sometimes to no further action at all. Most abnormalities found on a screening scan are not cancer.',
      'Screening is the reason lung cancer survival has improved over the last few decades. It works because it finds disease before symptoms appear.',
    ],
    seeAlso: ['ct-scan', 'diagnosis', 'nodules'],
    professionalAdvice:
      'Ask your healthcare professional whether a lung health check or screening programme is available where you live, and whether you would be eligible. Eligibility rules are specific and vary by country.',
    sources: [NHS, NCI, ACS, CRUK],
  },
  {
    id: 'ct-scan',
    title: 'CT scans and what they show',
    keywords: [
      'ct scan', 'computed tomography', 'chest ct', 'cat scan', 'x ray', 'x-ray',
      'radiograph', 'what does a ct show', 'scan result', 'radiologist',
    ],
    summary:
      'A chest CT takes detailed pictures of the lung. It can show a nodule, fluid or enlarged lymph nodes. It is very good at showing what something looks like, but it cannot on its own tell you what that something is.',
    detail: [
      'A plain chest X-ray is quicker but shows less detail. A CT scan is the test used for screening and for looking closely at a suspicious area. A PET-CT is used after diagnosis to see whether anything has spread.',
      'The words in a scan report describe what was seen and how it measured. A radiologist writes their impression, and a tissue sample is usually needed to be certain about what a finding is.',
    ],
    glossary: [
      ['nodule', 'a spot or small lump seen on an image'],
      ['lesion', 'a general word for an area of abnormal appearance'],
      ['PET-CT', 'a scan that uses a tracer to highlight active areas and show whether anything has spread'],
    ],
    seeAlso: ['nodules', 'nodes', 'diagnosis'],
    professionalAdvice:
      'If you have a scan report, bring it to your appointment. Asking what each term means in your specific situation is a reasonable use of an appointment.',
    sources: [NCI, CRUK, NHS],
  },
  {
    id: 'nodules',
    title: 'Nodules',
    keywords: [
      'nodule', 'lung nodule', 'nodules', 'is a nodule cancer', 'nodule size',
      'how big', 'ground glass', 'ground-glass', 'spiculated', 'solid nodule',
      'watchful waiting', 'follow up scan',
    ],
    summary:
      'A nodule is a small spot found on a scan. The great majority are not cancer. How a nodule is managed depends mostly on its size, whether it looks suspicious, and whether it has changed compared with an earlier scan.',
    detail: [
      'A nodule described as ground-glass looks hazy rather than solid, and one described as part-solid is a mixture. A nodule with spiculated or lobulated edges is reported because that shape is watched more closely. These are descriptions, not verdicts.',
      'Comparison over time is the most useful piece of information. A nodule that is unchanged across several scans is far more reassuring than a new one of the same size.',
    ],
    glossary: [
      ['ground-glass', 'an appearance on a scan that looks hazy rather than solid'],
      ['spiculated', 'edges that look spoke-like or ragged rather than smooth'],
    ],
    seeAlso: ['ct-scan', 'diagnosis', 'screening'],
    professionalAdvice:
      'If a nodule is mentioned in your report, it is reasonable to ask how big it is, how it compares with previous scans, and what the plan is. Avoid reading a single number as a verdict on its own.',
    sources: [NCI, CRUK, ACS],
  },
  {
    id: 'nodes',
    title: 'Lymph nodes',
    keywords: [
      'lymph node', 'lymph nodes', 'lymphadenopathy', 'mediastinal', 'hilar',
      'enlarged nodes', 'node size', 'short axis',
    ],
    summary:
      'Lymph nodes near the lungs are checked on every scan because they drain fluid from the lung. Enlarged nodes are commonly caused by infection or inflammation rather than cancer.',
    detail: [
      'The words mediastinal and hilar describe where the nodes sit: the mediastinum is the central area between the lungs, and the hilum is where the airways and blood vessels enter. Neither word means anything is wrong by itself.',
      'Radiologists record the short axis of a node, because the smallest measurement across is the one that matters for comparison over time.',
    ],
    glossary: [
      ['lymphadenopathy', 'enlarged lymph nodes'],
      ['mediastinal', 'in the central area between the lungs'],
      ['hilar', 'where the airways and blood vessels enter the lung'],
    ],
    seeAlso: ['ct-scan', 'staging', 'nodes'],
    professionalAdvice:
      'If your report mentions enlarged nodes, ask whether they are stable compared with previous scans and what the plan is.',
    sources: [NCI, CRUK],
  },
  {
    id: 'staging',
    title: 'Stages and what they mean',
    keywords: [
      'stage', 'staging', 'stages', 'stage 1', 'stage 2', 'stage 3', 'stage 4',
      'tnm', 't1', 't2', 'n1', 'm1', 'early stage', 'advanced stage',
      'what stage am i', 'how advanced',
    ],
    summary:
      'Staging describes how far a cancer has gone. It uses the TNM letters — T for the tumour itself, N for nearby lymph nodes, M for spread elsewhere — which are then grouped into stages I to IV.',
    detail: [
      'Stage I and II disease is generally confined to the lung. Stage III involves nearby lymph nodes or nearby structures. Stage IV means it has spread to a distant site or to another organ.',
      'Stage is one of the strongest predictors of what treatment can achieve, and it is also used to compare outcomes over time. It is not a prediction about one individual, and it can change as more is learned about a case.',
      'Staging usually brings together a CT or PET-CT of the chest, a scan of the brain, and sometimes a bone scan, plus a biopsy of the lymph nodes.',
    ],
    glossary: [
      ['TNM', 'a way of describing a cancer: T the tumour, N nearby nodes, M distant spread'],
      ['metastasis', 'cells that have spread from where they started to another site'],
    ],
    seeAlso: ['prognosis', 'treatment', 'diagnosis'],
    professionalAdvice:
      'Ask your specialist to explain your stage and what each part of it means for the options being discussed. This is one of the most useful questions you can ask.',
    sources: [NCI, ACS, CRUK, NHS],
  },
  {
    id: 'prognosis',
    title: 'Outlook and survival statistics',
    keywords: [
      'prognosis', 'survival', 'survival rate', 'outlook', 'how long',
      'how long do i have', 'statistics', 'life expectancy', 'curable', 'is it curable',
      'recurrence', 'relapse', 'remission',
    ],
    summary:
      'Outlook varies enormously, and stage is the biggest factor. Public survival figures are averages across many people, recorded years ago, and are not a prediction about any individual.',
    detail: [
      'Survival statistics are usually grouped by stage and by how many years ago the diagnosis was made. Earlier-stage disease has better outcomes. Improvements in treatment have raised survival over time, which means older published figures often understate current results.',
      'Statistics describe groups, not individuals. Two people with the same stage can have very different outcomes, because stage is not the only thing that matters. Anyone quoting you a single number as your personal forecast is overstating what statistics can do.',
    ],
    glossary: [
      ['remission', 'a period when the cancer cannot be detected on scans; it is not the same as being cured'],
      ['recurrence', 'the cancer returning after a period when it could not be detected'],
    ],
    seeAlso: ['staging', 'treatment'],
    professionalAdvice:
      'If you want to talk about outlook, ask your specialist directly. They can give you a realistic view that accounts for your own situation, which no published statistic can.',
    sources: [CRUK, ACS, NCI, NHS],
  },
  {
    id: 'diagnosis',
    title: 'How lung cancer is diagnosed',
    keywords: [
      'diagnosis', 'how is it diagnosed', 'diagnostic', 'tests', 'what tests',
      'biopsy', 'tissue sample', 'confirmation', 'how do they know',
      'bronchoscopy', 'ebus', 'ebus-tbna', 'fluid',
    ],
    summary:
      'A scan can show that something is there. Usually a small sample of tissue — a biopsy — is needed to be certain what it is, and a biopsy of the lymph nodes is often taken at the same time to help with staging.',
    detail: [
      'There are several ways to take a sample. A bronchoscopy passes a thin flexible tube down the airway. EBUS uses a probe on the end of that tube to reach and sample lymph nodes near the airways. CT-guided biopsy uses imaging to guide a needle through the skin. If fluid has collected around the lung, that fluid can sometimes be drained and tested.',
      'Once tissue is available it is examined under a microscope, which is called pathology or histology. This is what establishes the cell type and often the grade.',
    ],
    glossary: [
      ['biopsy', 'a small sample of tissue taken to be examined'],
      ['histology', 'the description of what the cells look like under a microscope'],
      ['EBUS', 'a bronchoscopy technique that uses ultrasound to find and sample nearby lymph nodes'],
    ],
    seeAlso: ['biomarkers', 'staging', 'ct-scan'],
    professionalAdvice:
      'You can ask which type of biopsy is being done, why that approach was chosen, and when results will be available.',
    sources: [NCI, CRUK, NHS],
  },
  {
    id: 'biomarkers',
    title: 'Gene and protein tests',
    keywords: [
      'biomarker', 'biomarkers', 'genetic test', 'gene test', 'egfr', 'alk', 'ros1',
      'braf', 'kras', 'met exon 14', 'ret', 'her2', 'ntrk', 'pd-l1', 'pdl1',
      'tps', 'targeted therapy', 'targeted treatment', 'precision medicine',
      'immunotherapy', 'molecular testing', 'pcr',
    ],
    summary:
      'Lung cancer cells are tested for particular gene changes and for a protein called PD-L1. These results are not interesting for their own sake: they determine whether treatments aimed at those specific changes are an option for you.',
    detail: [
      'Genes commonly tested include EGFR, ALK, ROS1, BRAF, KRAS, MET exon 14, RET, NTRK and HER2. PD-L1 is a protein level, reported as a percentage. Testing is normally done on the same tissue sample used for diagnosis, or on a blood sample where tissue is not available.',
      'If a change is found and a matching treatment exists, that treatment may be offered because it is more likely to work for that particular cancer. This is called targeted therapy. Immunotherapy is a different approach that helps the immune system recognise the cancer, and PD-L1 is one factor considered when deciding about it.',
    ],
    glossary: [
      ['biomarker', 'a measurable feature of a tumour that helps predict which treatment may help'],
      ['PD-L1', 'a protein on cells that the immune system reads; its level is reported as a percentage'],
      ['targeted therapy', 'treatment aimed at a specific gene change present in that particular tumour'],
    ],
    seeAlso: ['treatment', 'diagnosis', 'clinical-trials'],
    professionalAdvice:
      'It is reasonable to ask whether biomarker testing has been done, and if not, whether it should be. It can change which options are available.',
    sources: [NCI, ACS, CRUK],
  },
  {
    id: 'treatment',
    title: 'Treatment in general terms',
    keywords: [
      'treatment', 'treatments', 'what treatment', 'how is it treated', 'surgery',
      'operation', 'resection', 'radiotherapy', 'radiation', 'chemotherapy',
      'chemo', 'immunotherapy', 'targeted therapy', 'ablation', 'palliative',
      'cure', 'is it treatable', 'care plan', 'mdt',
    ],
    summary:
      'Treatment usually falls into a few broad types: surgery to remove the cancer, radiotherapy, chemotherapy, treatment aimed at a specific gene change, and immunotherapy. Which combination is used depends on the stage, the cell type, the gene results and your general health.',
    detail: [
      'Early-stage disease is most often treated with surgery, sometimes followed by other treatment to reduce the chance of the cancer returning. Locally advanced disease is often treated with a combination of radiotherapy and chemotherapy, sometimes alongside immunotherapy or a targeted treatment.',
      'Advanced disease is usually managed with treatment that controls the cancer and manages symptoms, rather than trying to remove it. Supportive and palliative care can be given alongside active treatment at any stage — it is not the same as stopping treatment.',
      'This is a general overview. Your own treatment is decided by a multidisciplinary team based on your situation, and only they can recommend what is right for you.',
    ],
    seeAlso: ['staging', 'biomarkers', 'palliative-care', 'clinical-trials'],
    professionalAdvice:
      'Nothing here is a treatment plan. Do not start, stop or change any treatment based on general information — discuss your options with your specialist.',
    sources: [NCI, CRUK, ACS, NHS],
  },
  {
    id: 'palliative-care',
    title: 'Supportive and palliative care',
    keywords: [
      'palliative care', 'palliative', 'hospice', 'supportive care', 'end of life care',
      'comfort care', 'quality of life', 'symptom control', 'pain relief',
    ],
    summary:
      'Supportive care treats symptoms and improves quality of life at any stage of a serious illness. Palliative care is a specialist version of that, and it can be given alongside cancer treatment — it does not mean stopping treatment.',
    detail: [
      'This is one of the most commonly misunderstood parts of cancer care. Palliative care can be involved early, alongside active treatment, and it often helps with breathlessness, pain, fatigue, anxiety and difficult decisions about treatment goals.',
      'Many hospitals have a palliative care team you can ask to see, and it is a normal part of cancer services rather than a last step.',
    ],
    seeAlso: ['treatment', 'support'],
    professionalAdvice:
      'If symptoms are affecting your daily life, or you find treatment decisions difficult, asking to meet the palliative care team is a reasonable step at any stage.',
    sources: [NCI, CRUK, NHS, BLF],
  },
  {
    id: 'clinical-trials',
    title: 'Clinical trials',
    keywords: [
      'clinical trial', 'clinical trials', 'trial', 'research study', 'experimental',
      'new treatment', 'participate', 'trial results',
    ],
    summary:
      'A clinical trial tests whether a treatment works, and who it works for. Trials can give access to treatments not yet routinely available, but they also carry more uncertainty, and not every trial is a good fit.',
    detail: [
      'Trials are run at different phases. Early phases mainly look at safety and dose, later phases compare the new treatment against the current standard. Being in a trial does not mean receiving worse care, but it does mean more uncertainty and more frequent visits.',
      'You are never entered into a trial without your specific, informed consent, and you can withdraw at any point without affecting your care.',
    ],
    seeAlso: ['treatment', 'biomarkers'],
    professionalAdvice:
      'Ask your specialist whether a trial is appropriate for your situation, and ask about the specific risks and demands before deciding.',
    sources: [NCI, CRUK, ACS],
  },
  {
    id: 'when-to-see-doctor',
    title: 'When to see someone',
    keywords: [
      'when should i see a doctor', 'should i be worried', 'am i worried',
      'go to the doctor', 'see my gp', 'when to get checked', 'should i get tested',
      'i am scared', 'i am anxious', 'is this normal',
    ],
    summary:
      'Any symptom that persists rather than settling deserves a look. Early lung cancer often causes no symptoms, so high-risk people should not wait for something to feel wrong — that is what screening is for.',
    detail: [
      'A cough lasting more than three weeks, blood in your sputum, breathlessness that is new or worsening, or unexplained weight loss should all be mentioned to a healthcare professional, even if you feel otherwise well and even if you think it is nothing.',
      'If a symptom is worrying you, saying so is not overreacting. It is useful information for whoever examines you, and most causes turn out to be far more common and far more treatable than cancer.',
    ],
    urgent:
      'Seek urgent medical care for coughing up a significant amount of blood, sudden severe breathlessness, chest pain with breathlessness, or a sudden inability to swallow.',
    professionalAdvice:
      'Your healthcare professional can help you work out whether a symptom needs investigating. That conversation is a good use of an appointment even if the answer is "no action needed".',
    seeAlso: ['symptoms', 'screening'],
    sources: [NHS, BLF, CRUK],
  },
  {
    id: 'living-with',
    title: 'Living with a lung condition',
    keywords: [
      'living with', 'day to day', 'daily life', 'exercise', 'activity',
      'breathlessness management', 'pulmonary rehabilitation', 'rehab',
      'work', 'travel', 'relationship', 'family', 'anxiety', 'depression',
    ],
    summary:
      'Pulmonary rehabilitation is the most well-supported way to improve breathlessness and day-to-day energy. Staying active within your limits helps more than most people expect, though everyone\'s limits are different.',
    detail: [
      'Pulmonary rehabilitation is a structured programme of exercise, education and breathing techniques. It is offered for chronic lung conditions and is generally available on referral.',
      'Breathlessness is frightening as well as tiring, and the anxiety that comes with it makes the breathlessness worse in a loop. Learning the techniques in rehabilitation usually helps break that loop.',
      'It is normal to feel shocked, angry, frightened or low after a diagnosis. Support groups and specialist cancer nurses exist for exactly this, and using them is a practical step rather than a sign of weakness.',
    ],
    seeAlso: ['symptoms', 'palliative-care', 'support'],
    professionalAdvice:
      'Ask whether pulmonary rehabilitation is available to you, and ask to speak with a specialist nurse or support group attached to your service.',
    sources: [BLF, CRUK, NHS],
  },
  {
    id: 'support',
    title: 'Support and where to go',
    keywords: [
      'support', 'support group', 'charity', 'help', 'who can i talk to',
      'specialist nurse', 'macmillan', 'cancer council', 'social worker',
      'financial support', 'benefits', 'carers',
    ],
    summary:
      'There are specialist nurses, support groups and welfare services attached to most cancer services, and they are there for the whole journey — not only at the end.',
    detail: [
      'A specialist cancer nurse is usually the person best placed to answer practical questions between appointments: what a test involves, what the next appointment will bring, and what support exists.',
      'Welfare and financial support matters too. Cancer care can affect income, work and caring responsibilities, and help with that is a normal part of what is available.',
    ],
    seeAlso: ['living-with', 'treatment'],
    professionalAdvice:
      'Ask your clinic for a specialist nurse and a support group. You do not need to be in treatment to use either.',
    sources: [CRUK, NHS, BLF],
  },
  {
    id: 'air-quality',
    title: 'Air pollution and environment',
    keywords: [
      'air pollution', 'pollution', 'environment', 'climate', 'diesel', 'outdoor air',
      'indoor air', 'workplace exposure', 'occupational',
    ],
    summary:
      'Outdoor air pollution is a recognised cause of lung cancer risk, though the effect size is much smaller than smoking. Reducing exposure at work, where possible, matters for some occupations.',
    detail: [
      'Air pollution contributes to lung cancer risk across a population, but the increase in risk is considerably smaller than the increase from smoking. Domestic biomass smoke from burning wood or dung for cooking and heating is also linked to lung cancer in some settings.',
    ],
    seeAlso: ['causes', 'prevention', 'smoking'],
    sources: [NCI, WHO, BLF],
  },
  {
    id: 'contagious',
    title: 'Catching it from someone else',
    keywords: [
      'contagious', 'infectious', 'can i catch it', 'is it hereditary to catch',
      'passed on', 'spread to family', 'hug', 'children', 'pregnant',
    ],
    summary:
      'Lung cancer is not contagious. You cannot catch it from another person, and it is not passed on in families in a contagious way. Having a family history does slightly raise risk, but most people with lung cancer have no family history at all.',
    detail: [
      'Lung cancer is not infectious in any way, so sharing a room, a meal or physical contact with someone who has it poses no risk.',
    ],
    seeAlso: ['causes'],
    sources: [CRUK, ACS, NHS],
  },
  {
    id: 'other-cancers',
    title: 'Lung cancer and other conditions',
    keywords: [
      'copd and lung cancer', 'emphysema', 'does copd cause cancer', 'other lung disease',
      'pulmonary fibrosis', 'pneumonia', 'does asthma cause cancer', 'tuberculosis',
    ],
    summary:
      'Some other lung conditions raise the risk of lung cancer, particularly COPD and chronic lung scarring. Having a chronic lung condition does not mean you will develop cancer — it means screening is more likely to be worth discussing.',
    detail: [
      'COPD and emphysema are the best-established links. People with COPD have a higher chance of developing lung cancer, and the risk rises with how severe the COPD is. Most people with COPD never develop cancer.',
    ],
    seeAlso: ['causes', 'screening', 'symptoms'],
    professionalAdvice:
      'If you have a chronic lung condition, mention it when you ask about screening. It affects what your healthcare professional would recommend.',
    sources: [BLF, CRUK, NCI],
  },
  {
    id: 'terminology',
    title: 'Words you may see on reports',
    keywords: [
      'terminology', 'glossary', 'what does this word mean', 'jargon', 'meanings',
      'what is benign', 'what is malignant', 'what is in situ', 'in situ',
      'differential diagnosis', 'what is a biopsy', 'histology', 'grade',
      'what is clear cell', 'unknown primary', 'what does this mean',
    ],
    summary:
      'A few words come up constantly on reports. Knowing them makes a scan or pathology report much easier to read alongside your clinician.',
    detail: [
      'Benign means not cancer. Malignant means cancer. "In situ" means the abnormal cells are present but have not yet spread into surrounding tissue. Histology is what the cells look like under a microscope. Grade describes how closely they resemble normal cells.',
    ],
    glossary: [
      ['benign', 'not cancer'],
      ['malignant', 'cancer'],
      ['in situ', 'abnormal cells present but not yet spread into nearby tissue'],
      ['grade', 'how closely the cells resemble normal cells'],
      ['unknown primary', 'cancer found somewhere but the place it started is not known'],
      ['differential diagnosis', 'the list of conditions a clinician is considering'],
    ],
    seeAlso: ['diagnosis', 'ct-scan', 'nodules'],
    professionalAdvice:
      'You are entitled to a clear explanation of anything on your report. If a term is not explained, ask.',
    sources: [NCI, CRUK, NHS],
  },
]

/* ------------------------------------------------------------------ retrieval */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'am', 'i', 'me', 'my',
  'you', 'your', 'it', 'its', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'but',
  'do', 'does', 'did', 'can', 'could', 'should', 'would', 'what', 'which', 'who',
  'how', 'why', 'when', 'where', 'about', 'tell', 'explain', 'know', 'there', 'that',
  'this', 'with', 'have', 'has', 'had', 'get', 'got', 'any', 'some', 'if', 'so',
])

/** Everyday phrasings mapped onto the wording used in the knowledge base. */
const SYNONYMS: Record<string, string> = {
  'lung ca': 'lung cancer',
  carcinoma: 'carcinoma',
  tumour: 'tumor',
  tumors: 'tumor',
  tumours: 'tumor',
  cigs: 'cigarettes',
  'low dose': 'low dose ct',
  'cat scan': 'ct scan',
  'ct-scan': 'ct scan',
  'chest xray': 'x ray',
  'chest x-ray': 'x ray',
  'how bad is it': 'staging',
  'how serious': 'prognosis',
  'deadly': 'prognosis',
  'dead': 'prognosis',
  'die': 'prognosis',
  'survive': 'survival',
  'signs': 'signs of lung cancer',
  'symptom': 'symptoms',
  checkup: 'screening',
  check: 'screening',
  scan: 'ct scan',
  'gene testing': 'genetic test',
  'targeted drugs': 'targeted therapy',
  'immuno': 'immunotherapy',
  'stage 4': 'stage 4',
  operable: 'surgery',
  operation: 'surgery',
  'no smoking': 'smoking',
  quitting: 'quitting',
  'secondhand': 'second hand smoke',
  'second-hand': 'second hand smoke',
  'never smoked': 'non smoker',
  'non-smoker': 'non smoker',
  'breathless': 'breathlessness',
  coughing: 'cough',
  'blood in phlegm': 'coughing up blood',
  'spitting blood': 'coughing up blood',
  spread: 'metastasis',
  'has spread': 'metastasis',
  'biomarker testing': 'molecular testing',
  gene: 'biomarker',
  genes: 'biomarker',
}

export function normalise(question: string): string {
  let text = ` ${question.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ')} `
  for (const [from, to] of Object.entries(SYNONYMS)) {
    text = text.replaceAll(` ${from} `, ` ${to} `)
  }
  return text
}

export interface KnowledgeMatch {
  topic: KnowledgeTopic
  score: number
}

/**
 * Score every topic against a question.
 *
 * Phrase matches on the curated keywords count far more than a single common
 * word, so "what is small cell" lands on the types topic rather than anywhere
 * that happens to contain "what" and "cell".
 */
export function findTopics(question: string, limit = 3): KnowledgeMatch[] {
  const text = normalise(question)
  const words = text.split(' ').filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  const scores = new Map<string, number>()

  for (const topic of KNOWLEDGE) {
    let score = 0
    for (const keyword of topic.keywords) {
      const phrase = normalise(keyword)
      if (phrase.trim() && text.includes(phrase.trim())) {
        // Longer, more specific phrases are worth more.
        score += 3 + phrase.split(' ').length * 2
      }
    }
    for (const word of words) {
      if (topic.title.toLowerCase().includes(word)) score += 2
      for (const keyword of topic.keywords) {
        if (keyword.toLowerCase().includes(word) && word.length > 3) score += 1
      }
    }
    if (score > 0) scores.set(topic.id, score)
  }

  return [...scores.entries()]
    .map(([id, score]) => ({ topic: KNOWLEDGE.find((t) => t.id === id)!, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function topicById(id: string): KnowledgeTopic | undefined {
  return KNOWLEDGE.find((topic) => topic.id === id)
}

/* ------------------------------------------------------------- safety routing */

export interface SafetyReply {
  kind: 'personal-diagnosis' | 'symptoms' | 'medication' | 'off-topic'
  message: string
  suggestedTopicIds: string[]
}

const SYMPTOM_FIRST_PERSON =
  /\b(?:i|we)\s+(?:have|am getting|keep getting|'ve been|have been|keep having)\b[^.?]{0,60}\b(?:cough|coughing|breathless|short of breath|wheez|hemoptysis|haemoptysis|blood|weight|fatigue|tired|pain|hoarse|chest)\b/i

const ASKS_ABOUT_SELF =
  /\b(?:do i|am i|do we|should i|would i|is my|is this|are my|could i)\b[^.?]{0,40}\b(?:have|has|cancer|terminal|die|dying|sick|ill|serious)\b/i

const MEDICATION_TERM =
  /\b(?:medicine|medication|drug|drugs|tablet|tablets|dose|dosage|chemo|chemotherapy|radiation|radiotherapy|immunotherapy|targeted therapy|treatment|therapy)\b/i

/** Only about the *reader's own* treatment, so "what treatments are used" still answers. */
const MEDICATION_SECOND_PERSON =
  /\b(?:should|can|do|would|will) i (?:take|start|stop|continue|try|use|reduce|increase|skip)\b|\bmy (?:dose|medication|treatment|chemo|therapy|course of treatment)\b|\bhalve my\b|\bdouble my\b|\b(?:dose|medicine|medication|treatment|therapy|pills)\b[^.?]{0,25}\bfor me\b/i

const MEDICATION_ACTION =
  /\b(?:start|stop|continue|skip|reduce|increase|change)\b[^.?]{0,30}\b(?:my|our)\b[^.?]{0,30}\b(?:medicine|medication|drug|tablet|dose|chemo|chemotherapy|therapy|treatment)\b/i

const RED_FLAG =
  /\b(?:coughing up (?:a lot of )?blood|haemoptysis|hemoptysis|severe breathlessness|can't breathe|cannot breathe|struggling to breathe|chest pain.{0,20}breathless)\b/i

const OFF_TOPIC =
  /\b(?:stock|share price|recipe|football|cricket|weather|bitcoin|encrypt|write me a poem|homework)\b/i

const PERSONAL_SAFETY =
  'This is general information, and I cannot tell you what is happening in your body or whether you have lung cancer. Only a healthcare professional who can examine you and look at your scans and test results can say that. What I can do is explain any term or subject you have read about.'

const SYMPTOM_SAFETY =
  'Thank you for telling me — that sounds worrying, and it deserves a proper look. I cannot work out the cause from a message, and most causes of these symptoms are far more common and far more treatable than cancer. Please mention it to a healthcare professional, especially if it has lasted more than three weeks or is getting worse.'

const MEDICATION_SAFETY =
  'I can explain treatment categories in general, but I cannot tell you to start, stop or change any medicine or treatment. Only the person prescribing it can do that, because it depends on your diagnosis, your other medicines and your health. Please discuss it with your specialist or pharmacist.'

const OFF_TOPIC_SAFETY =
  'I only cover lung cancer and general lung health. I am not able to help with that, and I would rather say so than give you an answer outside what I know.'

export function routeSafety(question: string): SafetyReply | null {
  if (OFF_TOPIC.test(question)) {
    return { kind: 'off-topic', message: OFF_TOPIC_SAFETY, suggestedTopicIds: ['what-is'] }
  }
  if (RED_FLAG.test(question)) {
    return {
      kind: 'symptoms',
      message: `${SYMPTOM_SAFETY}\n\nCoughing up a significant amount of blood, or sudden severe breathlessness, is a reason to seek urgent medical care rather than wait.`,
      suggestedTopicIds: ['symptoms', 'when-to-see-doctor'],
    }
  }
  if (
    MEDICATION_TERM.test(question) &&
    (MEDICATION_SECOND_PERSON.test(question) || MEDICATION_ACTION.test(question))
  ) {
    return {
      kind: 'medication',
      message: MEDICATION_SAFETY,
      suggestedTopicIds: ['treatment', 'palliative-care'],
    }
  }
  if (SYMPTOM_FIRST_PERSON.test(question)) {
    return { kind: 'symptoms', message: SYMPTOM_SAFETY, suggestedTopicIds: ['symptoms', 'when-to-see-doctor'] }
  }
  if (ASKS_ABOUT_SELF.test(question)) {
    return {
      kind: 'personal-diagnosis',
      message: PERSONAL_SAFETY,
      suggestedTopicIds: ['symptoms', 'when-to-see-doctor', 'screening'],
    }
  }
  return null
}

/** Opening questions offered before the conversation starts. */
export const STARTER_QUESTIONS = [
  'What is lung cancer?',
  'What are the symptoms?',
  'Am I at risk?',
  'How is it diagnosed?',
  'What are the stages?',
  'What treatments are used?',
  'Is lung cancer contagious?',
  'What does this word mean: nodule?',
]
