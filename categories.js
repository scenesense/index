const REPO = "scenesense/index";
const BRANCH = "main";
const DATA_PATH = "data/movies.json";

const CATEGORIES = [
  {
    key:"writing", title:"Writing and Narrative Construction", weight:9,
    items:[
      ["storyQuality","Story Quality","Did the story keep revealing more, or did its main idea wear thin?"],
      ["storyLogic","Story Logic","Did events grow naturally from what came before, or did the script force them?"],
      ["development","Development","Did the story build on itself as it went?"],
      ["construction","Construction","Did the story set things up and pay them off, or leave pieces hanging?"],
      ["dialogue","Dialogue","Did people sound like themselves, or like the screenplay talking?"]
    ]
  },
  {
    key:"character", title:"Character Quality", weight:7,
    items:[
      ["characterDepth","Character Depth","Could I imagine these characters having lives when the camera wasn't on them?"],
      ["drive","Drive","Did the characters pursue what mattered to them, or mostly wait for the plot?"],
      ["consistency","Consistency","Under pressure, did the characters still behave like themselves?"],
      ["practicalIntelligence","Practical Intelligence","Did the characters deal with problems sensibly, or keep causing avoidable ones?"],
      ["maturity","Maturity","Did the characters handle themselves with maturity, or let emotion run the show?"]
    ]
  },
  {
    key:"realism", title:"Realism / Plausibility / Human Coherence", weight:6,
    items:[
      ["humanRealism","Human Realism","Did people behave like real people, or like plot devices creating drama?"],
      ["realityGrounding","Reality Grounding","Once I accepted the premise, did the rest of the world still behave normally?"],
      ["practicalRealism","Practical Realism","Did ordinary real-world obstacles actually matter, or did the plot quietly remove them?"],
      ["technicalRealism","Technical Realism","Did the science and technology have rules, or change whenever the plot needed them to?"],
      ["physicalRealism","Physical Realism","Did bodies and objects behave like they had weight, or did physics stop mattering?"]
    ]
  },
  {
    key:"casting", title:"Casting and Role Congruence", weight:12,
    items:[
      ["functionalFit","Functional Fit","Did the performers look and move like people who could actually fill these roles?"],
      ["roleFit","Role Fit","Did the performers feel born for their roles, or merely placed in them?"],
      ["aesthetics","Aesthetics","Did the performers' look and movement add real visual beauty?"],
      ["magnetism","Magnetism","Did the performers naturally pull my attention, or did the film have to push them at me?"],
      ["ensembleFit","Ensemble Fit","Did the cast feel naturally matched, rather than assembled one role at a time?"]
    ]
  },
  {
    key:"performance", title:"Performance and Character Embodiment", weight:6,
    items:[
      ["characterization","Characterization","Did I see the characters, or mostly actors performing?"],
      ["emotionalLife","Emotional Life","Could I read what the characters were feeling even when they said nothing?"],
      ["delivery","Delivery","Did the lines feel spoken to someone, or delivered at the camera?"],
      ["physicalPerformance","Physical Performance","Did the performers use their faces and bodies to bring the characters to life?"],
      ["performanceControl","Performance Control","When the movie changed gears, did the actors shift with it?"]
    ]
  },
  {
    key:"chemistry", title:"Interpersonal Genuineness and Chemistry", weight:6,
    items:[
      ["connection","Connection","Did the characters genuinely affect each other, or merely share scenes?"],
      ["flow","Flow","Did people flow naturally together, or feel like actors taking turns?"],
      ["relationshipDepth","Relationship Depth","Did the relationships have layers, or did they stay at the surface?"],
      ["relationshipGrowth","Relationship Growth","Did the relationships actually evolve, or keep returning to the same state?"],
      ["relationshipCharge","Relationship Charge","Did the relationships have real energy, or did the film have to force it?"]
    ]
  },
  {
    key:"direction", title:"Direction and Scene Construction", weight:5,
    items:[
      ["staging","Staging","Did scenes use the space around the characters well, or did everyone just stand where the camera needed them?"],
      ["actorDirection","Actor Direction","Did the cast feel in sync, or did some performances throw the scene off?"],
      ["tone","Tone","Could the film change mood without feeling like it became a different movie?"],
      ["action","Action","Could I follow the action and feel it build, or did it dissolve into chaos?"],
      ["directorialControl","Directorial Control","Did the direction serve the movie, or keep trying to impress me?"]
    ]
  },
  {
    key:"editing", title:"Editing, Rhythm and Pacing", weight:7,
    items:[
      ["pacing","Pacing","Did scenes last as long as they needed to, without dragging or rushing?"],
      ["rhythm","Rhythm","Did the film know when to move and when to let a moment breathe?"],
      ["cutting","Cutting","Did the cuts land at the right moments, or did scenes feel chopped up?"],
      ["clarity","Clarity","Did I always know where and when I was without having to reconstruct it?"],
      ["restraint","Restraint","Did the editing give important moments enough time to land?"]
    ]
  },
  {
    key:"visuals", title:"Visual Craft and Cinematography", weight:5,
    items:[
      ["photography","Photography","Did the camera put me in the right place to experience each scene?"],
      ["imageDesign","Image Design","Did the lighting and color belong to the movie, or make it look processed?"],
      ["imageQuality","Image Quality","Did the image look naturally clear, or did the presentation get in the way?"],
      ["visualEffects","Visual Effects","Did the effects disappear into the movie, or keep reminding me they were effects?"],
      ["visualBeauty","Visual Beauty","How often did I simply enjoy looking at the film?"]
    ]
  },
  {
    key:"world", title:"World / Production Realization", weight:5,
    items:[
      ["worldDepth","World Depth","Did the world seem to keep existing beyond the frame?"],
      ["place","Place","Did locations feel like real places, or interchangeable backdrops?"],
      ["productionDesign","Production Design","Did the sets and spaces feel lived in, or freshly arranged for the camera?"],
      ["effectsRealization","Effects Realization","Did practical and digital effects feel like they belonged to the same world?"],
      ["designRestraint","Design Restraint","Did the design serve the world, or keep showing off?"]
    ]
  },
  {
    key:"sound", title:"Sound Design and Aural Realization", weight:5,
    items:[
      ["soundQuality","Sound Quality","Could the soundtrack go from whisper-quiet to huge without losing control?"],
      ["dialogue","Dialogue","Did voices stay clear without sounding pasted onto the scene?"],
      ["soundscape","Soundscape","If I closed my eyes, would the world still feel alive and specific?"],
      ["spatialSound","Spatial Sound","Did the sound create a convincing sense of space?"],
      ["mixing","Mixing","Did the important sounds come through naturally, or fight for attention?"]
    ]
  },
  {
    key:"music", title:"Music Score", weight:6,
    items:[
      ["musicQuality","Music Quality","Would this still be good music without the movie?"],
      ["execution","Execution","Did the music sound fully alive, or like a sketch of what it could have been?"],
      ["musicalIdentity","Musical Identity","Could I recognize this film from its music alone?"],
      ["sceneFit","Scene Fit","Did the music deepen scenes, or just tell me what to feel?"],
      ["scoreControl","Score Control","Did the musical score feel like one journey from beginning to end?"]
    ]
  },
  {
    key:"creativity", title:"Creative Intelligence and Originality", weight:6,
    items:[
      ["originality","Originality","Did this feel like its own creation, or something I'd basically seen before?"],
      ["ingenuity","Ingenuity","Did the film find clever solutions, or keep taking the obvious route?"],
      ["ideaGrowth","Idea Growth","Did its ideas become richer as the film went on?"],
      ["filmicInvention","Filmic Invention","Did the film find genuinely new ways to show or tell things?"],
      ["resourcefulness","Resourcefulness","Did the film turn its limitations into strengths?"]
    ]
  },
  {
    key:"morality", title:"Moral / Ethical Quality", weight:7,
    items:[
      ["humanValues","Human Values","Did the film itself value human dignity, or treat people as disposable?"],
      ["relationshipEthics","Relationship Ethics","Did the film understand healthy relationships, or mistake manipulation and control for love or loyalty?"],
      ["responsibility","Responsibility","Did good and bad choices carry meaningful consequences?"],
      ["moralOpposition","Moral Opposition","Did the film make its opposition both worth opposing and memorable, or just give me a generic bad guy?"],
      ["ethicalFraming","Ethical Framing","Did the film show harm for what it was, or make it look cool?"]
    ]
  },
  {
    key:"integrity", title:"Artistic Integrity / Restraint / Cohesion", weight:8,
    items:[
      ["independence","Independence","Did the movie follow its own creative vision, or check corporate boxes?"],
      ["viewerRespect","Viewer Respect","Did the film trust me, or keep trying to force a reaction?"],
      ["restraint","Restraint","Did the film know when enough was enough?"],
      ["degradation","Degradation","Did the profanity and depravity earn their place, or just drag the film down?"],
      ["cohesion","Cohesion","Did the movie feel whole, or did some parts feel out of place?"]
    ]
  }
];

const TV_SEASON_CATEGORIES = [
  {key:"casting", title:"CASTING", weight:12, items:[
    ["characterBelief","Character Belief","Do you believe the actors as their characters?"],
    ["ensemble","Ensemble","Does the cast click as an ensemble?"]
  ]},
  {key:"visuals", title:"CINEMATOGRAPHY", weight:5, items:[
    ["inviting","Visual Appeal","Do the visuals make the show inviting to watch?"],
    ["naturalImage","Natural Image","Do they avoid looking artificial, filtered or overly polished?"]
  ]},
  {key:"world", title:"WORLD", weight:5, items:[
    ["locations","Locations","Do the locations feel convincing rather than like sets?"],
    ["beyondCamera","World Depth","Does the world feel like it exists beyond the camera?"]
  ]},
  {key:"sound", title:"SOUND", weight:5, items:[
    ["voices","Voices","Do voices sound clean, believable and easy to understand?"],
    ["space","Spatial Sound","Does the sound make you feel physically inside the scene?"]
  ]},
  {key:"music", title:"MUSIC", weight:6, items:[
    ["identity","Musical Identity","Does the music give the show a sound of its own?"],
    ["emotion","Musical Restraint","Does the music enhance emotions without forcing them?"]
  ]}
];

const TV_EPISODE_CATEGORIES = [
  {key:"writing", title:"WRITING", weight:9, items:[
    ["worthTelling","Worth Telling","Did this episode have a story worth telling?"],
    ["plotHonesty","Plot Honesty","Did events follow naturally without the plot cheating?"]
  ]},
  {key:"character", title:"CHARACTER", weight:7, items:[
    ["characterConsistency","Character Consistency","Did everyone stay true to their character instead of changing just to serve the story?"],
    ["choices","Choices","Did the characters' choices make sense?"]
  ]},
  {key:"realism", title:"REALISM", weight:6, items:[
    ["premiseBelief","Believability","Once you accept the show's premise, did what happened feel believable?"],
    ["consequences","Consequences","Did actions have believable consequences?"]
  ]},
  {key:"performance", title:"PERFORMANCE", weight:6, items:[
    ["embodiment","Embodiment","Did the actors disappear convincingly into their roles?"],
    ["emotion","Emotion","Did the emotions feel genuine rather than performed?"]
  ]},
  {key:"chemistry", title:"CHEMISTRY", weight:6, items:[
    ["connection","Connection","Did you believe these people actually mattered to one another?"],
    ["relationshipValue","Relationship Value","Did the episode add something meaningful to a relationship?"]
  ]},
  {key:"direction", title:"DIRECTION", weight:5, items:[
    ["staging","Staging","Did scenes feel like they were happening rather than being arranged for us?"],
    ["tone","Tone","Did the episode know how seriously to take itself?"]
  ]},
  {key:"editing", title:"PACING", weight:7, items:[
    ["timeUse","Time Use","Did the episode use its time well?"],
    ["landing","Moment Timing","Did important moments get enough time to land?"]
  ]},
  {key:"creativity", title:"ORIGINALITY", weight:6, items:[
    ["freshness","Freshness","Did this episode bring something fresh to the series?"],
    ["ideaUse","Idea Use","Did the episode use its central idea in an interesting way?"]
  ]},
  {key:"morality", title:"MORALITY", weight:7, items:[
    ["characterRespect","Character Respect","Did the episode respect its characters as human beings?"],
    ["moralSense","Moral Sense","Did the episode have a sound sense of right and wrong?"]
  ]},
  {key:"integrity", title:"INTEGRITY", weight:8, items:[
    ["earnedReaction","Earned Reaction","Did it earn your reaction instead of trying to manufacture one?"],
    ["groundwork","Groundwork","Did the episode do the groundwork for its payoffs?"]
  ]}
];

window.addEventListener("DOMContentLoaded",()=>{
  if(document.querySelector('script[data-scenesense-series]')) return;
  const script=document.createElement("script");
  script.src="series.js?v=20260902-2";
  script.dataset.scenesenseSeries="1";
  script.onload=()=>{
    if(document.querySelector('script[data-scenesense-series-tv-loader]')) return;
    const tv=document.createElement("script");
    tv.src="series-tv-loader.js?v=20260902-1";
    tv.dataset.scenesenseSeriesTvLoader="1";
    document.body.appendChild(tv);
  };
  document.body.appendChild(script);
});
