/**
 * Patient-friendly lung health information.
 *
 * Educational content only. Written in plain language, with no diagnostic or
 * treatment claims.
 */

export interface InfoTopic {
  id: string
  title: string
  summary: string
  body: string[]
  keyPoints?: string[]
}

export const LUNG_HEALTH_TOPICS: InfoTopic[] = [
  {
    id: 'what-is-lung-cancer',
    title: 'What is lung cancer?',
    summary: 'An introduction to lung cancer and how it is usually treated.',
    body: [
      'Lung cancer is a group of conditions where cells in the lung grow in an uncontrolled way. It is one of the most common forms of cancer worldwide.',
      'Like most cancers, the outlook is much better when it is found early. That is why understanding your own risk factors and staying in touch with your healthcare professional matters.',
      'Only a healthcare professional who can examine you and arrange any necessary tests can tell you whether you have lung cancer or any other condition.',
    ],
    keyPoints: [
      'Early detection generally improves outcomes',
      'Screening is available for certain groups under local guidelines',
      'Symptoms alone cannot tell you whether you have cancer',
    ],
  },
  {
    id: 'risk-factors',
    title: 'Common risk factors',
    summary: 'The things that most affect lung health over a lifetime.',
    body: [
      'Risk factors are things that increase the chance of a health problem developing. They are not guarantees — plenty of people with risk factors never develop a condition, and some people without obvious risk factors do.',
      'The strongest known risk factor for lung cancer is smoking. Other factors include exposure to secondhand smoke, radon gas in the home, and past exposure to asbestos, particularly at work.',
      'Having a close relative with lung cancer, and a personal history of a chronic breathing condition such as COPD, are also considered when clinicians assess risk.',
    ],
    keyPoints: [
      'Smoking is the leading risk factor',
      'Secondhand smoke and radon also matter',
      'Exposure history at work is worth recording',
      'Family history is worth telling your clinician about',
    ],
  },
  {
    id: 'smoking',
    title: 'Smoking and lung health',
    summary: 'How tobacco smoke affects the lungs, and what stopping can do.',
    body: [
      'Tobacco smoke damages the airways and the tiny air sacs that move oxygen into your blood. This damage builds up gradually over years.',
      'Stopping smoking is one of the most helpful things a person can do for their lungs. The benefit can start soon after stopping and continues to grow over the following years.',
      'Pack-years are a term healthcare professionals use to describe lifetime exposure. One pack-year is roughly equivalent to smoking one pack of twenty cigarettes every day for a year.',
    ],
    keyPoints: [
      'Stopping at any age benefits lung health',
      'Support from healthcare teams improves the chance of stopping successfully',
      'Pack-years summarise lifetime exposure, not a current measurement',
    ],
  },
  {
    id: 'secondhand-smoke',
    title: 'Secondhand smoke',
    summary: 'Why smoke exposure around others still matters.',
    body: [
      'Secondhand smoke is smoke you breathe in from other people smoking. It contains many of the same harmful substances as the smoke a person inhales directly.',
      'Regular exposure to secondhand smoke, at home, in a vehicle or at work, is associated with health risks even for people who do not smoke themselves.',
      'Practical steps such as keeping your home and vehicle smoke-free help reduce exposure for everyone.',
    ],
    keyPoints: [
      'Exposure at home, in vehicles and at work all count',
      'Keeping shared spaces smoke-free is an effective step',
      'Mention your exposure to your healthcare professional',
    ],
  },
  {
    id: 'environmental-exposure',
    title: 'Environmental and workplace exposure',
    summary: 'Radon, asbestos and other exposures worth knowing about.',
    body: [
      'Radon is a colourless, odourless gas produced naturally in soil and rock. It can accumulate in buildings, particularly in basements and ground floors. Testing is the only reliable way to know the level in a home.',
      'Asbestos was widely used in construction materials in the past. Most people exposed to it are not harmed, but significant exposure — particularly certain occupations — is a recognised risk factor.',
      'Recording where and when you were exposed helps a healthcare professional assess your situation properly.',
    ],
    keyPoints: [
      'Radon levels can only be known through testing',
      'Occupational exposure history is relevant to a clinician',
      'Write down exposure details while they are fresh',
    ],
  },
  {
    id: 'family-history',
    title: 'Family history',
    summary: 'Why telling your clinician about relatives matters.',
    body: [
      'A family history of lung cancer can change how a clinician thinks about screening and follow-up. It is useful to know which relative was affected and roughly when.',
      'Sharing this information early gives you more options, not fewer. It is not a prediction that you will develop the same condition.',
    ],
    keyPoints: [
      'Note which relative was affected and when',
      'Family history may influence screening discussions',
      'It is information, not a diagnosis',
    ],
  },
  {
    id: 'symptoms',
    title: 'Common symptoms',
    summary: 'Changes worth mentioning to a healthcare professional.',
    body: [
      'Some lung-related changes people notice include a cough that does not settle, breathlessness, chest discomfort, and persistent tiredness. Reduced appetite and changes in sleep can also occur.',
      'None of these symptoms means you have a serious condition. Many everyday causes — including a cold, allergies, anxiety and poor sleep — produce the same feelings.',
      'What matters is that you notice changes in your own body and describe them to a healthcare professional, who can assess them properly.',
    ],
    keyPoints: [
      'Symptoms on their own cannot identify a condition',
      'Notice what is new or different for you',
      'Describe changes clearly, including when they started',
    ],
  },
  {
    id: 'early-evaluation',
    title: 'Why early evaluation matters',
    summary: 'The value of discussing changes early.',
    body: [
      'Healthcare professionals can look into symptoms and risk factors in ways that a screening tool cannot. Early conversations often lead to simpler investigations and clearer answers.',
      'Attending routine appointments, even when you feel completely well, is one of the most effective things you can do for your long-term health.',
      'This application is a learning and tracking tool. It complements your healthcare professional; it does not replace them.',
    ],
    keyPoints: [
      'Early conversations usually lead to clearer answers',
      'Routine reviews matter even when you feel well',
      'This tool supports, and never replaces, professional care',
    ],
  },
  {
    id: 'ct-imaging',
    title: 'CT imaging',
    summary: 'What a CT scan shows, and what this tool does with it.',
    body: [
      'A CT scan uses X-rays to create detailed cross-sectional images. Radiologists look at these images to understand the structure of the lungs and surrounding tissues.',
      'This application processes an image you upload in order to highlight areas of interest. That is image processing: it separates structures by brightness and marks regions for a person to look at.',
      'A highlighted region is not a finding and not a diagnosis. It simply shows where image processing identified a boundary. Only a qualified professional can interpret a scan in a medical context.',
    ],
    keyPoints: [
      'The highlighted area is a region of interest, not a diagnosis',
      'Imaging must be interpreted by a qualified professional',
      'This tool is educational and does not read scans diagnostically',
    ],
  },
  {
    id: 'screening-basics',
    title: 'Screening basics',
    summary: 'What an AI-assisted screening result can and cannot do.',
    body: [
      'A screening tool estimates a pattern from the information you enter. It looks for combinations of factors that, in the data it was built from, were more often associated with a particular outcome.',
      'It is not an examination. It cannot see your lungs, take your blood pressure, or assess you in any way a clinician can.',
      'A screening result is best treated as a prompt for a conversation with your healthcare professional, who can take a full history, examine you and arrange tests if needed.',
    ],
    keyPoints: [
      'A screening result is a prompt, not a diagnosis',
      'No tool can replace a consultation',
      'Use it to prepare questions for your appointment',
    ],
  },
  {
    id: 'healthy-lifestyle',
    title: 'Healthy lifestyle and supportive care',
    summary: 'Everyday habits that support lung and general health.',
    body: [
      'There is no single "healthy lung" routine, but a few habits are consistently useful: avoiding tobacco smoke, eating a balanced diet, staying hydrated, moving as much as your healthcare team advises, keeping a regular sleep pattern, and taking time to rest and relax.',
      'It is worth being realistic. Small, repeatable steps are more useful than ambitious changes that do not last.',
      'Before changing your activity level significantly, particularly if you have a breathing condition, check with your healthcare professional what is appropriate for you.',
    ],
    keyPoints: [
      'Small repeatable steps beat ambitious changes',
      'Check with your team before increasing activity',
      'Supportive habits help general wellbeing too',
    ],
  },
]

export const EDUCATION_DISCLAIMER =
  'This information is for educational purposes and does not replace medical advice. For anything about your own health, speak with a qualified healthcare professional.'

export const SAFETY_BLOCK = {
  title: 'Need Medical Help?',
  routine:
    'For any medical concerns, contact your healthcare professional. They can assess you properly and decide what, if any, investigation is needed.',
  urgent:
    'For severe or rapidly worsening symptoms, seek urgent medical attention or contact local emergency services.',
  note: 'This application does not assess emergencies and cannot determine whether a symptom is serious.',
}
