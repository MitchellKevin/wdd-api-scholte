export const COURSES = [
  // Jaar 1 — Vakken
  { id: 'j1_content',           name: 'Content',                      jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_emerging_tech',     name: 'Emerging Technologies',        jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_hci',               name: 'Human Computer Interaction',   jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_infoarch',          name: 'Informatiearchitectuur',       jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_prog',              name: 'Inleiding Programmeren',       jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_internetstd',       name: 'Internetstandaarden',          jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_maatschappij',      name: 'Maatschappij en interactie',   jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_npd',               name: 'New Product Development',      jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_ontwerpgesch',      name: 'Ontwerpgeschiedenis',          jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_slb',               name: 'SLB',                          jaar: 1, type: 'vak',     ec: 4 },
  { id: 'j1_ucd',               name: 'User Centred Design',          jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_vid',               name: 'Visual Interface Design',      jaar: 1, type: 'vak',     ec: 3 },
  { id: 'j1_vormgeving',        name: 'Vormgeving',                   jaar: 1, type: 'vak',     ec: 3 },
  // Jaar 1 — Projecten
  { id: 'j1_proj_ind1',         name: 'Project individueel 1',        jaar: 1, type: 'project', ec: 5 },
  { id: 'j1_proj_ind2',         name: 'Project individueel 2',        jaar: 1, type: 'project', ec: 5 },
  { id: 'j1_proj_team1',        name: 'Project Team 1',               jaar: 1, type: 'project', ec: 5 },
  { id: 'j1_proj_team2',        name: 'Project Team 2',               jaar: 1, type: 'project', ec: 5 },

  // Jaar 2 — Vakken
  { id: 'j2_frontend',          name: 'Frontend Development',         jaar: 2, type: 'vak',     ec: 4 },
  { id: 'j2_vormgeving2',       name: 'Vormgeving 2',                 jaar: 2, type: 'vak',     ec: 4 },
  { id: 'j2_multimodal',        name: 'Multimodal Interaction Design',jaar: 2, type: 'vak',     ec: 3 },
  { id: 'j2_content_delivery',  name: 'Content Delivery',             jaar: 2, type: 'vak',     ec: 3 },
  { id: 'j2_ontwerponderzoek',  name: 'Ontwerponderzoek',             jaar: 2, type: 'vak',     ec: 3 },
  // Jaar 2 — Projecten
  { id: 'j2_proj_rmdd',         name: 'Project Responsive Multi Device Design', jaar: 2, type: 'project', ec: 6 },
  { id: 'j2_proj_beyond',       name: 'Project Beyond',               jaar: 2, type: 'project', ec: 5 },
  { id: 'j2_proj_tech',         name: 'Project Tech',                 jaar: 2, type: 'project', ec: 15 },
  // Jaar 2 — Stage
  { id: 'j2_korte_stage',       name: 'Korte Stage',                  jaar: 2, type: 'stage',   ec: 17 },

  // Jaar 3
  { id: 'j3_vrije_minor',       name: 'Vrije Minor',                  jaar: 3, type: 'minor',   ec: 30 },
  { id: 'j3_themasemester',     name: 'Themasemester',                jaar: 3, type: 'minor',   ec: 30 },

  // Jaar 4
  { id: 'j4_lange_stage',       name: 'Lange Stage',                  jaar: 4, type: 'stage',   ec: 30 },
  { id: 'j4_afstudeer',         name: 'Afstudeerproject',             jaar: 4, type: 'project', ec: 30 },
];

export const TOTAL_EC = COURSES.reduce((sum, c) => sum + c.ec, 0);
