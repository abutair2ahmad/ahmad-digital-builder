import type { Treatment } from '@/lib/types';

export const treatments: Treatment[] = [
  {
    id: 'smile-design',
    name: 'Digital Smile Design',
    category: 'cosmetic',
    tagline: 'The plan before the porcelain.',
    summary:
      'A photographic and digital study of your face, bite and speech that turns "I want nicer teeth" into a shape we can both look at before anything is touched.',
    description:
      'We photograph and film you speaking and smiling, scan the arches intraorally, and mock the proposed shape directly onto the scan. You then wear a printed trial smile for a day or two. Nothing irreversible happens until you have seen it on your own face and agreed to it.',
    durationMinutes: 90,
    priceFrom: 1200,
    sessions: '1 consultation + 1 trial fitting',
    includes: [
      'Full facial and intraoral photography series',
      '3D intraoral scan of both arches',
      'Digital wax-up and shape proposal',
      'Printed trial smile worn at home',
      'Written treatment plan with staged costs',
    ],
    journey: [
      { title: 'Records', body: 'Photography, video of speech, and a digital scan. Roughly 45 minutes.' },
      { title: 'Design', body: 'The ceramist and prosthodontist draw the proposal against your facial midline and lip dynamics.' },
      { title: 'Trial', body: 'You wear the mock-up, live with it, and tell us what to change.' },
      { title: 'Decision', body: 'Only once the shape is agreed do we discuss veneers, bonding or alignment.' },
    ],
    suitedFor: ['Anyone considering veneers', 'Patients unsure what they want changed', 'Second opinions'],
  },
  {
    id: 'veneers',
    name: 'Porcelain Veneers',
    category: 'cosmetic',
    tagline: 'Layered, not painted.',
    summary:
      'Hand-layered feldspathic and lithium-disilicate veneers built by a ceramist who works with translucency the way nacre forms in a shell — in depth, not in one flat shade.',
    description:
      'Veneers are bonded ceramic facings. Done well they are conservative, individually characterised and hard to spot. Done badly they are opaque and uniform. We work with a single ceramist, use minimal or no-prep designs wherever the enamel allows, and always start from an approved Digital Smile Design.',
    durationMinutes: 120,
    priceFrom: 3500,
    sessions: '3 — 4 visits over 3 weeks',
    includes: [
      'Approved smile design as the starting point',
      'Minimal-preparation protocol where enamel permits',
      'Hand-layered ceramic by our in-house ceramist',
      'Shade and texture session in daylight',
      'Bonded under rubber dam, reviewed at 2 weeks',
    ],
    journey: [
      { title: 'Design approval', body: 'We do not prepare a single tooth before the trial smile is signed off.' },
      { title: 'Preparation', body: 'Conservative reduction under magnification, then temporaries built from the approved shape.' },
      { title: 'Characterisation', body: 'You meet the ceramist. Shade, translucency and surface texture are chosen in natural light.' },
      { title: 'Bonding', body: 'Isolated, bonded, polished. A review two weeks later checks the bite and the gums.' },
    ],
    suitedFor: ['Worn or chipped edges', 'Discolouration that does not bleach', 'Small gaps and shape asymmetry'],
  },
  {
    id: 'implants',
    name: 'Dental Implants',
    category: 'restorative',
    tagline: 'Planned in software, placed with a guide.',
    summary:
      'Guided implant placement using a CBCT scan and a printed surgical guide, restored with a screw-retained ceramic crown that can be serviced years later.',
    description:
      'A titanium fixture replaces the root; a crown replaces the tooth. The difference between a good implant and a mediocre one is almost entirely in the planning: bone volume, emergence profile, and where the screw channel exits. We plan every case in 3D and place through a printed guide.',
    durationMinutes: 120,
    priceFrom: 6500,
    sessions: 'Surgery + healing period + restoration',
    includes: [
      'CBCT scan and 3D planning',
      'Printed surgical guide',
      'Premium implant system with a documented track record',
      'Provisional to shape the gum contour',
      'Screw-retained final crown',
    ],
    journey: [
      { title: 'Assessment', body: 'CBCT, scan, medical history and a frank discussion about bone and gum.' },
      { title: 'Planning', body: 'The final crown is designed first; the implant position follows it.' },
      { title: 'Placement', body: 'Guided surgery under local anaesthetic, typically 45 — 90 minutes.' },
      { title: 'Restoration', body: 'After healing, a provisional shapes the tissue, then the definitive crown is fitted.' },
    ],
    suitedFor: ['A single missing tooth', 'Failing bridges', 'Patients who dislike removable options'],
  },
  {
    id: 'invisalign',
    name: 'Clear Aligners',
    category: 'orthodontic',
    tagline: 'Move the teeth before you dress them.',
    summary:
      'Invisalign treatment supervised by an orthodontist, used both on its own and as the step that lets us place fewer, thinner veneers afterwards.',
    description:
      'Aligning teeth first is almost always the more conservative route: it means less tooth reduction later, or none at all. Treatment is planned by an orthodontist, not by the software alone, with attachments and refinements where the biology requires them.',
    durationMinutes: 60,
    priceFrom: 9500,
    sessions: '6 — 18 months, reviewed every 6 — 8 weeks',
    includes: [
      'Orthodontic assessment and records',
      'Digital treatment simulation',
      'Full aligner series and refinements',
      'Attachments and interproximal reduction as planned',
      'Fixed and removable retainers',
    ],
    journey: [
      { title: 'Assessment', body: 'An orthodontist checks the bite, the roots and the gum support.' },
      { title: 'Simulation', body: 'You see the projected movement before committing.' },
      { title: 'Wear', body: '20 — 22 hours a day, changed on schedule, reviewed in the chair regularly.' },
      { title: 'Retention', body: 'Retainers are part of the treatment, not an upsell.' },
    ],
    suitedFor: ['Crowding and spacing', 'Relapse after childhood braces', 'Pre-cosmetic alignment'],
  },
  {
    id: 'whitening',
    name: 'Professional Whitening',
    category: 'cosmetic',
    tagline: 'Shade, taken seriously.',
    summary:
      'Supervised in-clinic and take-home whitening with custom trays, sensitivity management, and an honest conversation about what bleaching can and cannot change.',
    description:
      'Whitening works on natural tooth structure. It does not change ceramic, composite or existing crowns, and results vary with the underlying dentine. We record your starting shade, treat, and record it again — so the change is measured rather than claimed.',
    durationMinutes: 60,
    priceFrom: 1400,
    sessions: '1 in-clinic session + 2 weeks at home',
    includes: [
      'Shade recording before and after',
      'Gum isolation and enamel protection',
      'Custom-made take-home trays',
      'Desensitising protocol',
      'Review appointment',
    ],
    journey: [
      { title: 'Check', body: 'Whitening on untreated decay or exposed roots is a bad idea. We look first.' },
      { title: 'In-clinic', body: 'One supervised session with the gums isolated.' },
      { title: 'At home', body: 'Custom trays, worn on a schedule that suits your sensitivity.' },
      { title: 'Review', body: 'We photograph the result against the same reference shade tab.' },
    ],
    suitedFor: ['Generalised staining', 'Pre-wedding and pre-event timelines', 'Maintenance after veneers'],
  },
  {
    id: 'cosmetic-bonding',
    name: 'Composite Bonding',
    category: 'cosmetic',
    tagline: 'Additive, reversible, same-day.',
    summary:
      'Freehand composite artistry for chipped edges, small gaps and worn incisors — usually with no drilling, and completed in a single visit.',
    description:
      'Composite is added to the tooth, sculpted, and polished. Nothing is removed. It is the most conservative cosmetic option available and the right answer far more often than veneers are. It needs polishing every year or two and is not stain-proof, and we say so before you commit.',
    durationMinutes: 90,
    priceFrom: 900,
    sessions: '1 visit per 2 — 6 teeth',
    includes: [
      'Shape planning from a digital mock-up',
      'No tooth reduction in most cases',
      'Layered composite with edge translucency',
      'Full polish and bite check',
      'Annual maintenance guidance',
    ],
    journey: [
      { title: 'Mock-up', body: 'The shape is agreed on screen or in the mouth before we start.' },
      { title: 'Build', body: 'Composite is layered freehand under magnification.' },
      { title: 'Polish', body: 'Surface texture and shine are the difference between "obvious" and invisible.' },
      { title: 'Maintain', body: 'A short polish visit keeps the surface bright.' },
    ],
    suitedFor: ['Chipped front edges', 'Small midline gaps', 'Trying a shape before veneers'],
  },
  {
    id: 'general',
    name: 'General & Preventive',
    category: 'preventive',
    tagline: 'The unglamorous half that makes the rest last.',
    summary:
      'Examinations, hygiene therapy, white fillings and root canal treatment — because cosmetic work built on an unstable foundation does not survive.',
    description:
      'Every cosmetic plan at NACRE starts with a health assessment: gums, decay, bite forces, night grinding. Patients are welcome to see us for general care alone; many do, and never book anything cosmetic at all.',
    durationMinutes: 45,
    priceFrom: 350,
    sessions: 'Every 6 months',
    includes: [
      'Full examination with intraoral photography',
      'Gum charting',
      'Airflow hygiene therapy',
      'Tooth-coloured restorations',
      'Night-guard assessment for grinding',
    ],
    journey: [
      { title: 'Examine', body: 'Photographs and charting so you can see what we see.' },
      { title: 'Stabilise', body: 'Decay and gum disease treated before anything else is planned.' },
      { title: 'Maintain', body: 'A recall interval chosen for your risk, not a default six months.' },
      { title: 'Protect', body: 'Guards and coaching for grinding, acid erosion and sensitivity.' },
    ],
    suitedFor: ['New patients', 'Routine care', 'Anyone before cosmetic treatment'],
  },
];

export const treatmentsById = new Map(treatments.map((t) => [t.id, t]));

export function getTreatment(id: string): Treatment | undefined {
  return treatmentsById.get(id);
}
