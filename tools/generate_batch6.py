#!/usr/bin/env python3
# Reuse the long-read writer in batch 5; its side effect refreshes b05 first.
import runpy, json
ns=runpy.run_path('/tmp/tsb/tools/generate_batch5.py')
normal=ns['normal']
N=[
('The Age of AI','Henry A. Kissinger, Eric Schmidt and Daniel Huttenlocher',2021,'Business & Startups','Artificial intelligence changes how we know, decide and organise society, so institutions must learn to use it without giving up human judgment.','google-wave'),
('The Alignment Problem','Brian Christian',2020,'Business & Startups','Teaching machines what humans actually value is harder than making them optimise a target, because targets can miss context, fairness and intent.','cambridge-analytica'),
('Power and Prediction','Ajay Agrawal, Joshua Gans and Avi Goldfarb',2022,'Business & Startups','AI lowers the cost of prediction, but its biggest value appears only when organisations redesign the decisions and systems around it.','humane-ai-pin'),
('The Hype Machine','Sinan Aral',2020,'Psychology & People','Social platforms amplify connection, misinformation and division through the same attention mechanisms, so users and institutions need deliberate safeguards.','facebook-beacon'),
('Algorithms to Live By','Brian Christian and Tom Griffiths',2016,'Productivity','Computer science offers useful rules for search, scheduling, sorting and uncertainty when human time and information are limited.','color-labs'),
('The Heat Will Kill You First','Jeff Goodell',2023,'History','Extreme heat is a public health, inequality and infrastructure problem that will reshape where and how people can live.','bhopal'),
('The Ministry for the Future','Kim Stanley Robinson',2020,'History','Climate action needs imagination large enough to connect finance, justice, technology and the lived reality of people facing heat and loss.','deepwater-bp'),
('The New Climate War','Michael E. Mann',2021,'History','Delay campaigns shift climate responsibility onto individuals to protect powerful interests, but personal choices and collective action both matter.','tobacco-denial'),
('Braiding Sweetgrass','Robin Wall Kimmerer',2013,'History','Scientific knowledge and Indigenous ways of knowing can meet in a reciprocal relationship with the living world rather than extraction alone.','easter-island'),
('Entangled Life','Merlin Sheldrake',2020,'History','Fungi connect ecosystems, shape life and challenge the idea that organisms are separate, self-contained competitors.','harappa-collapse'),
('The Hidden Life of Trees','Peter Wohlleben',2015,'History','Forests work through relationships among trees, fungi, soil and time, reminding us that ecosystems cannot be understood as isolated parts.','easter-island'),
('The Sixth Extinction','Elizabeth Kolbert',2014,'History','Human activity is driving rapid species loss, and understanding it requires seeing climate, habitat and consumption as connected systems.','rana-plaza'),
('The Warmth of Other Suns','Isabel Wilkerson',2010,'History','The Great Migration shows how millions of individual acts of courage can reshape a country while carrying the costs of injustice across generations.','plassey-betrayal'),
('Caste','Isabel Wilkerson',2020,'History','Hidden hierarchies organise social life through inherited status, and naming their mechanisms is necessary before they can be challenged.','nanda-tyrant'),
('The WEIRDest People in the World','Joseph Henrich',2020,'Psychology & People','Culture shapes psychology deeply, and many supposedly universal conclusions were drawn from unusually individualistic Western populations.','westernunion-phone'),
('The Worldly Philosophers','Robert L. Heilbroner',1953,'Economics','Economic ideas are stories about how people, power, scarcity and institutions shape the material lives of societies.','south-sea-mania'),
('The Undercover Economist','Tim Harford',2005,'Economics','Everyday prices reveal trade-offs, incentives and power, but markets work well only when their rules and information are fair.','wells-fargo-fake'),
('The Divide','Jason Hickel',2017,'Economics','Global inequality cannot be explained only by poor countries failing to catch up; history, extraction and rules of trade matter.','imperial-armada'),
('The Future of Money','Eswar S. Prasad',2021,'Money & Finance','Digital money can make payments faster and more inclusive, but it also changes privacy, power and financial stability.','terra-luna'),
('The Man Who Solved the Market','Gregory Zuckerman',2019,'Money & Finance','Quant investing shows the power of data and disciplined systems, but financial models can create risks when people mistake patterns for certainty.','ltcm-geniuses'),
('The End of the World Is Just the Beginning','Peter Zeihan',2022,'History','Demography, geography and supply chains shape national power, though forecasts about geopolitics should always be treated as uncertain scenarios.','global-crossing'),
('The Wager','David Grann',2023,'History','A shipwreck and its competing survivor stories show how institutions decide truth when evidence, incentives and power pull in different directions.','titanic-hubris'),
('Killers of the Flower Moon','David Grann',2017,'History','The murders of Osage people reveal how racism, greed and weak institutions can turn wealth into danger instead of freedom.','purdue-opioids'),
('The Splendid and the Vile','Erik Larson',2020,'History','Leadership during crisis requires honest communication, morale, institutions and the ordinary courage of people who keep going.','challenger-launch'),
('The Last Lecture','Randy Pausch',2008,'Self-Improvement','A meaningful life is built through curiosity, gratitude, preparation and helping other people achieve their dreams.','jobs-surgery'),
('Designing Your Life','Bill Burnett and Dave Evans',2016,'Self-Improvement','Career and life choices improve when we prototype small possibilities instead of waiting for a single perfect answer.','quibi-flop'),
('Tiny Experiments','Anne-Laure Le Cunff',2025,'Self-Improvement','A life can be explored through small, low-risk experiments that generate information before identity and commitment harden around a plan.','color-labs'),
('The Perfection Trap','Thomas Curran',2023,'Psychology & People','Modern perfectionism turns worth into performance, making growth harder by turning ordinary mistakes into threats to identity.','wework-neumann'),
('The Art of Gathering','Priya Parker',2018,'Psychology & People','Good gatherings begin with a clear purpose, thoughtful invitation and boundaries that make meaningful connection possible.','fyre-festival'),
('The Good Life','Robert Waldinger and Marc Schulz',2023,'Psychology & People','Long-running evidence suggests that the quality of close relationships is one of the strongest predictors of health and life satisfaction.','secret-app'),
('The Longevity Diet','Valter Longo',2018,'Self-Improvement','Health habits work best when they are sustainable, culturally practical and connected to long-term metabolic wellbeing rather than quick fixes.','theranos-board'),
('The Joy of Movement','Kelly McGonigal',2019,'Self-Improvement','Movement can be a source of connection, confidence and joy, not only a punishment for the body or a number on a scale.','peloton-pandemic'),
('No Hard Feelings','Liz Fosslien and Mollie West Duffy',2019,'Psychology & People','Emotions at work contain information about needs and relationships, and handling them with honesty improves both results and wellbeing.','better-place'),
('The Friction Project','Robert I. Sutton and Huggy Rao',2024,'Business & Startups','Organisations improve when they remove needless friction for people while preserving the useful friction that prevents careless decisions.','uber-china'),
('The Art of Community','Charles H. Vogl',2016,'Psychology & People','Belonging grows through shared values, rituals, roles and stories that let people know how to participate and contribute.','orkut-brazil'),
('The Invention of Nature','Andrea Wulf',2015,'History','Alexander von Humboldt’s life shows how observing connections across climate, plants, politics and people can change how a society sees nature.','mao-sparrows')]
B=[normal(x) for x in N]
json.dump(B,open('/home/user/tsb-app/newbooks/b06.json','w'),ensure_ascii=False,indent=2)
print(len(B),sum(len(b['lessons']) for b in B))
