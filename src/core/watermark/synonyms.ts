const SYNONYM_MAP: Record<string, string[]> = {
  // Common LLM-favored words and their alternatives
  'however': ['but', 'yet', 'still', 'nevertheless', 'though'],
  'therefore': ['so', 'thus', 'hence', 'consequently'],
  'additionally': ['also', 'moreover', 'besides', 'furthermore'],
  'furthermore': ['also', 'moreover', 'besides', 'additionally'],
  'moreover': ['also', 'furthermore', 'besides', 'additionally'],
  'nevertheless': ['however', 'still', 'yet', 'regardless'],
  'consequently': ['therefore', 'so', 'thus', 'hence'],
  'specifically': ['particularly', 'namely', 'especially', 'notably'],
  'particularly': ['especially', 'specifically', 'notably'],
  'significantly': ['considerably', 'notably', 'substantially', 'markedly'],
  'essentially': ['basically', 'fundamentally', 'primarily'],
  'approximately': ['about', 'roughly', 'around', 'nearly'],
  'utilize': ['use', 'employ', 'apply'],
  'implement': ['apply', 'execute', 'carry out', 'put in place'],
  'demonstrate': ['show', 'illustrate', 'prove', 'reveal'],
  'indicate': ['show', 'suggest', 'point to', 'signal'],
  'facilitate': ['help', 'enable', 'assist', 'support'],
  'comprehend': ['understand', 'grasp', 'get'],
  'acquire': ['get', 'obtain', 'gain'],
  'commence': ['start', 'begin', 'initiate'],
  'terminate': ['end', 'stop', 'finish', 'conclude'],
  'sufficient': ['enough', 'adequate', 'ample'],
  'numerous': ['many', 'several', 'various', 'multiple'],
  'substantial': ['significant', 'considerable', 'major', 'large'],
  'fundamental': ['basic', 'core', 'essential', 'key'],
  'comprehensive': ['complete', 'thorough', 'full', 'extensive'],
  'crucial': ['critical', 'vital', 'key', 'essential', 'important'],
  'important': ['key', 'vital', 'critical', 'significant'],
  'various': ['different', 'diverse', 'multiple', 'several'],
  'provide': ['give', 'offer', 'supply', 'deliver'],
  'obtain': ['get', 'acquire', 'gain', 'secure'],
  'establish': ['set up', 'create', 'build', 'found'],
  'determine': ['decide', 'figure out', 'find', 'establish'],
  'consider': ['think about', 'examine', 'look at', 'weigh'],
  'require': ['need', 'demand', 'call for'],
  'maintain': ['keep', 'preserve', 'sustain', 'uphold'],
  'ensure': ['make sure', 'guarantee', 'confirm', 'verify'],
  'regarding': ['about', 'concerning', 'on', 'as for'],
  'prior': ['before', 'earlier', 'previous', 'preceding'],
  'subsequent': ['later', 'following', 'next', 'after'],
  'assist': ['help', 'aid', 'support'],
  'attempt': ['try', 'seek', 'aim'],
  'possess': ['have', 'own', 'hold'],
  'exhibit': ['show', 'display', 'present'],
  'allocate': ['assign', 'distribute', 'give'],
  'modify': ['change', 'alter', 'adjust', 'update'],

  // Common adjectives
  'significant': ['notable', 'major', 'important', 'meaningful'],
  'effective': ['useful', 'successful', 'productive', 'strong'],
  'efficient': ['productive', 'streamlined', 'optimized'],
  'relevant': ['related', 'applicable', 'pertinent'],
  'appropriate': ['suitable', 'fitting', 'proper', 'right'],
  'potential': ['possible', 'likely', 'prospective'],
  'primary': ['main', 'chief', 'key', 'central'],
  'initial': ['first', 'early', 'opening', 'starting'],

  // Hedging phrases (LLM-typical)
  'certainly': ['sure', 'definitely', 'clearly', 'indeed'],
  'absolutely': ['completely', 'totally', 'fully', 'entirely'],
  'undoubtedly': ['clearly', 'surely', 'without doubt'],
  // Expanded coverage: LLM-favored vocabulary -> plainer alternatives (first = plainest)
  'pivotal': ['key', 'central', 'vital'],
  'noteworthy': ['notable', 'important', 'worth noting'],
  'aforementioned': ['earlier', 'above', 'named'],
  'nonetheless': ['still', 'even so', 'yet'],
  'notwithstanding': ['despite', 'even so', 'still'],
  'pertaining': ['about', 'regarding', 'on'],
  'encompasses': ['covers', 'includes', 'spans'],
  'encompass': ['cover', 'include', 'span'],
  'constitutes': ['forms', 'makes up', 'is'],
  'constitute': ['form', 'make up', 'are'],
  'paramount': ['key', 'top', 'critical'],
  'multifaceted': ['complex', 'many-sided', 'varied'],
  'intricate': ['complex', 'detailed', 'involved'],
  'nuanced': ['subtle', 'fine', 'layered'],
  'compelling': ['strong', 'convincing', 'powerful'],
  'underscores': ['shows', 'highlights', 'stresses'],
  'underscore': ['show', 'highlight', 'stress'],
  'underscored': ['showed', 'highlighted', 'stressed'],
  'leveraging': ['using', 'tapping', 'drawing on'],
  'leverage': ['use', 'tap', 'draw on'],
  'leveraged': ['used', 'tapped', 'drew on'],
  'landscape': ['field', 'scene', 'area'],
  'delve': ['dig', 'look', 'explore'],
  'delving': ['digging', 'looking', 'exploring'],
  'realm': ['area', 'field', 'space'],
  'tapestry': ['mix', 'blend', 'web'],
  'fostering': ['building', 'growing', 'helping'],
  'foster': ['build', 'grow', 'help'],
  'navigating': ['handling', 'working through', 'managing'],
  'navigate': ['handle', 'work through', 'manage'],
  'aligning': ['matching', 'lining up', 'fitting'],
  'align': ['match', 'line up', 'fit'],
  'streamlining': ['simplifying', 'tidying', 'trimming'],
  'streamline': ['simplify', 'tidy', 'trim'],
  'spearheading': ['leading', 'heading', 'driving'],
  'spearhead': ['lead', 'head', 'drive'],
  'bolstering': ['boosting', 'backing', 'strengthening'],
  'bolster': ['boost', 'back', 'strengthen'],
  'underpinning': ['basis', 'backing', 'support'],
  'underpin': ['support', 'back', 'anchor'],
  'overarching': ['broad', 'main', 'overall'],
  'holistic': ['whole', 'all-round', 'full'],
  'synergy': ['teamwork', 'fit', 'combined effect'],
  'paradigm': ['model', 'pattern', 'approach'],
  'robust': ['strong', 'solid', 'sturdy'],
  'meticulous': ['careful', 'precise', 'thorough'],
  'meticulously': ['carefully', 'precisely', 'closely'],
  'seamlessly': ['smoothly', 'cleanly', 'easily'],
  'seamless': ['smooth', 'clean', 'even'],
  'invaluable': ['vital', 'priceless', 'key'],
  'myriad': ['many', 'countless', 'lots of'],
  'plethora': ['plenty', 'a lot', 'many'],
  'delved': ['dug', 'looked', 'explored'],
  'showcase': ['show', 'display', 'present'],
  'showcasing': ['showing', 'displaying', 'presenting'],
  'harness': ['use', 'tap', 'draw on'],
  'harnessing': ['using', 'tapping', 'drawing on'],
  'elevate': ['raise', 'lift', 'boost'],
  'cultivate': ['build', 'grow', 'develop'],
  'embark': ['start', 'begin', 'set out'],
  'unlock': ['open', 'reveal', 'access'],
  'testament': ['proof', 'sign', 'mark'],
  'vibrant': ['lively', 'bright', 'active'],
  'essential': ['key', 'vital', 'needed'],
};

export function getSynonyms(word: string): string[] {
  const lower = word.toLowerCase();
  return SYNONYM_MAP[lower] ?? [];
}

export function getSynonymAlternatives(word: string): Array<{ text: string; similarity: number }> {
  const synonyms = getSynonyms(word);
  if (synonyms.length === 0) return [];

  const isCapitalized = word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
  const isAllCaps = word === word.toUpperCase() && word.length > 1;

  return synonyms.map((syn, i) => {
    let text = syn;
    if (isAllCaps) text = syn.toUpperCase();
    else if (isCapitalized) text = syn.charAt(0).toUpperCase() + syn.slice(1);

    return {
      text,
      similarity: 1 - (i * 0.1),
    };
  });
}
