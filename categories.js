const REPO = "scenesense/index";
const BRANCH = "main";
const DATA_PATH = "data/movies.json";

const CATEGORIES = [
  {
    key:"writing", title:"Writing & Narrative Construction", weight:9,
    items:[
      ["storyQuality","Story Quality","Did the story keep finding worthwhile depth in its central idea?"],
      ["storyLogic","Story Logic","Did events grow naturally from what came before, or did the script force them?"],
      ["development","Development","Did the story build pressure and change its characters in ways that mattered?"],
      ["construction","Construction","Did the story feel deliberately built, with setups and reveals paying off when they should?"],
      ["dialogue","Dialogue","Did people sound like themselves, or like the screenplay talking?"]
    ]
  },
  {
    key:"character", title:"Character Quality", weight:7,
    items:[
      ["characterDepth","Character Depth","Could I imagine these characters having lives when the camera wasn't on them?"],
      ["drive","Drive","Did the characters pursue what mattered to them, or mostly wait for the plot?"],
      ["consistency","Consistency","Under pressure, did the characters still behave like themselves?"],
      ["practicalIntelligence","Practical Intelligence","Did the characters handle problems capably, or keep making avoidable mistakes?"],
      ["maturity","Maturity","Did the characters understand themselves and others, or let emotion keep taking over?"]
    ]
  },
  {
    key:"realism", title:"Realism / Plausibility / Human Coherence", weight:6,
    items:[
      ["humanRealism","Human Realism","Did people behave like real people, or like plot devices creating drama?"],
      ["realityGrounding","Reality Grounding","Beyond the film's central premise, did ordinary reality still behave normally?"],
      ["practicalRealism","Practical Realism","Did plans and events survive ordinary real-world obstacles, or only work because those obstacles disappeared?"],
      ["technicalRealism","Technical Realism","Did science and technology follow believable limits, or change whenever the plot needed them to?"],
      ["physicalRealism","Physical Realism","Did action have real physical consequences, or did bodies and objects behave unrealistically?"]
    ]
  },
  {
    key:"casting", title:"Casting & Role Congruence", weight:12,
    items:[
      ["functionalFit","Functional Fit","Did the performers physically fit their roles without the film having to compensate?"],
      ["roleFit","Role Fit","Did the performers feel born for their roles, or merely placed in them?"],
      ["aesthetics","Aesthetics","Did the performers' natural appearance and movement add beauty and visual character?"],
      ["magnetism","Magnetism","Did the performers naturally draw me in without the film having to manufacture it?"],
      ["ensembleFit","Ensemble Fit","Did the cast feel naturally matched, rather than assembled one role at a time?"]
    ]
  },
  {
    key:"performance", title:"Performance & Character Embodiment", weight:6,
    items:[
      ["characterization","Characterization","Did I see the characters, or mostly actors performing?"],
      ["emotionalLife","Emotional Life","Could I see thoughts and feelings forming before they were spoken?"],
      ["delivery","Delivery","Did lines feel spoken to another person, rather than delivered for the camera?"],
      ["physicalPerformance","Physical Performance","Did the performers stay physically in character even when they weren't speaking?"],
      ["performanceControl","Performance Control","Did the performances stay believable when the film changed mood or style?"]
    ]
  },
  {
    key:"chemistry", title:"Interpersonal Genuineness & Chemistry", weight:6,
    items:[
      ["connection","Connection","Did the characters genuinely affect each other, or merely share scenes?"],
      ["flow","Flow","Did conversation and body language feel effortless between them?"],
      ["relationshipDepth","Relationship Depth","Did the relationships feel like they existed before the scene began?"],
      ["relationshipGrowth","Relationship Growth","Did the relationships actually evolve, or keep returning to the same state?"],
      ["relationshipCharge","Relationship Charge","Whatever connected or divided them, did that energy feel genuinely alive?"]
    ]
  },
  {
    key:"direction", title:"Direction & Scene Construction", weight:5,
    items:[
      ["staging","Staging","Did scenes feel deliberately shaped rather than merely recorded?"],
      ["actorDirection","Actor Direction","Did the performances feel like they belonged to the same emotional reality?"],
      ["tone","Tone","Could the film change mood without feeling like it became a different movie?"],
      ["action","Action","Could I follow the action and feel it build, instead of just watching chaos?"],
      ["directorialControl","Directorial Control","Did the director serve the movie, or keep forcing attention onto technique?"]
    ]
  },
  {
    key:"editing", title:"Editing, Rhythm & Pacing", weight:7,
    items:[
      ["pacing","Pacing","Did scenes last as long as they needed to, without dragging or rushing?"],
      ["rhythm","Rhythm","Did the film know when to move and when to let a moment breathe?"],
      ["cutting","Cutting","Did the editing carry me smoothly through scenes and time without drawing attention to itself?"],
      ["clarity","Clarity","Did I always know where and when I was without having to reconstruct it?"],
      ["restraint","Restraint","Did the editing trust the material, or keep jolting me for attention?"]
    ]
  },
  {
    key:"visuals", title:"Visual Craft & Cinematography", weight:5,
    items:[
      ["photography","Photography","Did the camera consistently find the most revealing way to show each scene?"],
      ["imageDesign","Image Design","Did light and color create a convincing look, or make the image feel processed?"],
      ["imageQuality","Image Quality","Did the image look natural and detailed, without the presentation getting in the way?"],
      ["visualEffects","Visual Effects","Did the effects belong in the image, or could I see the machinery?"],
      ["visualBeauty","Visual Beauty","How often did I simply enjoy looking at the film?"]
    ]
  },
  {
    key:"world", title:"World / Production Realization", weight:5,
    items:[
      ["worldDepth","World Depth","Did the world seem to keep existing beyond the frame?"],
      ["place","Place","Did locations feel like real places, or interchangeable backdrops?"],
      ["productionDesign","Production Design","Did the physical world feel inhabited rather than freshly built for the camera?"],
      ["effectsRealization","Effects Realization","Did physical and synthetic effects feel like part of the same world?"],
      ["designRestraint","Design Restraint","Did the world feel designed because it had to, or overdesigned because it could?"]
    ]
  },
  {
    key:"sound", title:"Sound Design & Aural Realization", weight:5,
    items:[
      ["soundQuality","Sound Quality","Did the track breathe from quiet to loud while staying clean and controlled?"],
      ["dialogue","Dialogue","Were voices always clear while still sounding naturally part of the space?"],
      ["soundscape","Soundscape","If I closed my eyes, would the world still feel alive and specific?"],
      ["spatialSound","Spatial Sound","Could I place sounds around me as naturally as objects on screen?"],
      ["mixing","Mixing","Did the soundtrack let the right thing matter at the right moment?"]
    ]
  },
  {
    key:"music", title:"Music Score", weight:6,
    items:[
      ["musicQuality","Music Quality","Would this still be good music without the movie?"],
      ["execution","Execution","Did the music sound fully realized rather than merely composed?"],
      ["musicalIdentity","Musical Identity","Could I recognize this film from its music alone?"],
      ["sceneFit","Scene Fit","Did the music deepen scenes, or just tell me what to feel?"],
      ["scoreControl","Score Control","Did the score feel shaped across the whole film rather than added scene by scene?"]
    ]
  },
  {
    key:"creativity", title:"Creative Intelligence & Originality", weight:6,
    items:[
      ["originality","Originality","Did this feel like its own creation, or something I'd basically seen before?"],
      ["ingenuity","Ingenuity","Did the film solve creative problems in clever rather than obvious ways?"],
      ["ideaGrowth","Idea Growth","Did its ideas become richer as the film went on?"],
      ["filmicInvention","Filmic Invention","Did it show or tell anything in a genuinely new cinematic way?"],
      ["resourcefulness","Resourcefulness","Did the film turn its limitations into strengths?"]
    ]
  },
  {
    key:"morality", title:"Moral / Ethical Quality", weight:7,
    items:[
      ["humanValues","Human Values","Did the film value human dignity and better ways of living, or mostly reward cynicism?"],
      ["relationshipEthics","Relationship Ethics","Did the film understand the difference between love and possession, and between trust and manipulation?"],
      ["responsibility","Responsibility","Did good and bad choices carry meaningful consequences?"],
      ["moralOpposition","Moral Opposition","Was there something genuinely worth opposing, rather than just someone labelled a villain?"],
      ["ethicalFraming","Ethical Framing","Did the film show harm honestly, or make cruelty and degradation feel cool or trivial?"]
    ]
  },
  {
    key:"integrity", title:"Artistic Integrity / Restraint / Cohesion", weight:8,
    items:[
      ["independence","Independence","Did the movie feel like itself, or like it was checking someone else's boxes?"],
      ["viewerRespect","Viewer Respect","Did the film trust the audience, or keep pushing buttons to control attention and emotion?"],
      ["restraint","Restraint","Did the film stop when its point had landed, or keep escalating after it was enough?"],
      ["degradation","Degradation","Did profanity and depravity serve the film, or mostly make it uglier?"],
      ["cohesion","Cohesion","Did everything feel like it belonged in the same movie?"]
    ]
  }
];
