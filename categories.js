const REPO = "scenesense/index";
const BRANCH = "main";
const DATA_PATH = "data/movies.json";

const CATEGORIES = [
  {
    key:"writing", title:"Writing & Narrative Construction", weight:9,
    items:[
      ["storyQuality","Story Quality","Did the core idea have real depth, and did the story keep finding worthwhile things in it?"],
      ["storyLogic","Story Logic","Did events grow naturally from what came before, or did the script force them?"],
      ["development","Development","Did the film build meaningful pressure, change people, and make those changes stick?"],
      ["construction","Construction","Did the film plant things, reveal them at the right time, and pay them off?"],
      ["dialogue","Dialogue","Did people sound like themselves, or like the screenplay talking?"]
    ]
  },
  {
    key:"character", title:"Character Quality", weight:7,
    items:[
      ["characterDepth","Character Depth","Could I imagine these people having lives when the camera wasn't on them?"],
      ["drive","Drive","Did they pursue what mattered to them, or mostly wait for the plot?"],
      ["consistency","Consistency","Under pressure, did they still feel like the same person?"],
      ["practicalIntelligence","Practical Intelligence","Did they handle problems like capable people, or keep making avoidable mistakes?"],
      ["maturity","Maturity","Did they understand themselves and other people, or let emotion keep running the show?"]
    ]
  },
  {
    key:"realism", title:"Realism / Plausibility / Human Coherence", weight:6,
    items:[
      ["humanRealism","Human Realism","Did people behave like humans, or like plot devices creating drama?"],
      ["realityGrounding","Reality Grounding","After accepting the main “what if,” did the rest of reality stay intact?"],
      ["practicalRealism","Practical Realism","Would this still work if real-world obstacles weren't quietly removed?"],
      ["technicalRealism","Technical Realism","Did science and technology obey limits, or become whatever the plot needed?"],
      ["physicalRealism","Physical Realism","Did action carry real weight, or did physics and bodies become indestructible?"]
    ]
  },
  {
    key:"casting", title:"Casting & Role Congruence", weight:12,
    items:[
      ["functionalFit","Functional Fit","Did the performer physically belong in the role without the film having to compensate?"],
      ["roleFit","Role Fit","Did this performer feel born for the role, or merely placed in it?"],
      ["aesthetics","Aesthetics","Did their natural appearance and movement add beauty and visual character?"],
      ["magnetism","Magnetism","Did their presence naturally draw me in without the film having to manufacture it?"],
      ["ensembleFit","Ensemble Fit","Did the cast feel naturally matched, or assembled one role at a time?"]
    ]
  },
  {
    key:"performance", title:"Performance & Character Embodiment", weight:6,
    items:[
      ["characterization","Characterization","Did I see the character, or mostly the actor performing?"],
      ["emotionalLife","Emotional Life","Could I see thoughts and feelings happening before they were spoken?"],
      ["delivery","Delivery","Did lines feel spoken to another person, not delivered for the camera?"],
      ["physicalPerformance","Physical Performance","Did their face and body stay in character even when they weren't speaking?"],
      ["performanceControl","Performance Control","Did the performance stay believable when the film changed mood or style?"]
    ]
  },
  {
    key:"chemistry", title:"Interpersonal Genuineness & Chemistry", weight:6,
    items:[
      ["connection","Connection","Did they genuinely affect each other, or just share scenes?"],
      ["flow","Flow","Did their talking and body language feel effortless together?"],
      ["relationshipDepth","Relationship Depth","Did the relationship feel like it existed before the scene began?"],
      ["relationshipGrowth","Relationship Growth","Did the relationship actually evolve, or keep returning to the same state?"],
      ["relationshipCharge","Relationship Charge","Whatever bound or divided them, did it feel genuinely alive?"]
    ]
  },
  {
    key:"direction", title:"Direction & Scene Construction", weight:5,
    items:[
      ["staging","Staging","Did scenes feel deliberately shaped rather than merely recorded?"],
      ["actorDirection","Actor Direction","Did the cast feel like they all lived in the same emotional reality?"],
      ["tone","Tone","Could the film change mood without feeling like it became a different movie?"],
      ["action","Action","Could I follow the action and feel it build, instead of just watching chaos?"],
      ["directorialControl","Directorial Control","Did the director serve the movie, or keep forcing and showing off?"]
    ]
  },
  {
    key:"editing", title:"Editing, Rhythm & Pacing", weight:7,
    items:[
      ["pacing","Pacing","Did anything outstay its value, or get rushed before it paid off?"],
      ["rhythm","Rhythm","Did the film know when to move and when to let a moment breathe?"],
      ["cutting","Cutting","Did the edit carry me smoothly through scenes and time without calling attention to itself?"],
      ["clarity","Clarity","Did I ever have to mentally rebuild where or when I was?"],
      ["restraint","Restraint","Did the edit trust the material, or keep jolting me for attention?"]
    ]
  },
  {
    key:"visuals", title:"Visual Craft & Cinematography", weight:5,
    items:[
      ["photography","Photography","Did the camera consistently find the most revealing way to show the scene?"],
      ["imageDesign","Image Design","Did light and color create a convincing look, or make the image feel processed?"],
      ["imageQuality","Image Quality","Did the actual image look natural and detailed, or did the presentation get in the way?"],
      ["visualEffects","Visual Effects","Did I believe what I saw, or could I see the effect?"],
      ["visualBeauty","Visual Beauty","How often did I simply enjoy looking at the film?"]
    ]
  },
  {
    key:"world", title:"World / Production Realization", weight:5,
    items:[
      ["worldDepth","World Depth","Did the world seem to keep existing beyond the frame?"],
      ["place","Place","Did locations feel like real places, or interchangeable backdrops?"],
      ["productionDesign","Production Design","Did the physical world feel inhabited rather than freshly built for the camera?"],
      ["effectsRealization","Effects Realization","Did effects feel naturally part of the world, or pasted on top of it?"],
      ["designRestraint","Design Restraint","Did the world feel designed because it had to, or overdesigned because it could?"]
    ]
  },
  {
    key:"sound", title:"Sound Design & Aural Realization", weight:5,
    items:[
      ["soundQuality","Sound Quality","Did the track breathe from quiet to loud while staying clean and controlled?"],
      ["dialogue","Dialogue","Could I always understand voices without them sounding detached from the space?"],
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
      ["ingenuity","Ingenuity","Did it solve creative problems in clever ways instead of obvious ones?"],
      ["ideaGrowth","Idea Growth","Did its ideas become richer as the film went on?"],
      ["filmicInvention","Filmic Invention","Did it show or tell anything in a genuinely new cinematic way?"],
      ["resourcefulness","Resourcefulness","Did the film turn its limitations into strengths?"]
    ]
  },
  {
    key:"morality", title:"Moral / Ethical Quality", weight:7,
    items:[
      ["humanValues","Human Values","Did the film value human dignity and better ways of living, or mostly reward cynicism?"],
      ["relationshipEthics","Relationship Ethics","Did it know the difference between love and possession, trust and manipulation?"],
      ["responsibility","Responsibility","Did good choices carry responsibility, and bad choices face consequences?"],
      ["moralOpposition","Moral Opposition","Was there something genuinely worth opposing, not just a villain labelled bad?"],
      ["ethicalFraming","Ethical Framing","Did it show harm honestly, or make cruelty and degradation feel cool or trivial?"]
    ]
  },
  {
    key:"integrity", title:"Artistic Integrity / Restraint / Cohesion", weight:8,
    items:[
      ["independence","Independence","Did the movie feel like itself, or like it was checking someone else's boxes?"],
      ["viewerRespect","Viewer Respect","Did it trust me, or keep pushing buttons to control my attention and feelings?"],
      ["restraint","Restraint","Did the film stop when the point had landed, or keep escalating and repeating?"],
      ["degradation","Degradation","Did profanity and depravity serve anything, or mostly make the film uglier?"],
      ["cohesion","Cohesion","Did everything feel like it belonged in the same movie?"]
    ]
  }
];
