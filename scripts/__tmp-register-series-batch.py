import json
from pathlib import Path

path = Path('data/series/index.json')
data = json.loads(path.read_text(encoding='utf-8'))

entries = [
  {
    "id":"the-grand-tour-2016","type":"series","title":"The Grand Tour","yearStart":2016,"yearEnd":2024,
    "seasonCount":4,"episodeCount":46,"scoringEntryCount":46,
    "genres":["Adventure","Comedy","Documentary"],
    "actors":["Jeremy Clarkson","Richard Hammond","James May","Abbie Eaton","Mike Skinner"],
    "audio":{"layouts":["5.1"],"lossless":False},
    "description":"Jeremy Clarkson, Richard Hammond and James May travel the world testing cars, attempting elaborate motoring challenges and turning road trips into large-scale comic adventures, first from a travelling studio tent and later through feature-length expeditions.",
    "poster":"assets/posters/the-grand-tour-2016.webp","score":None,"questionsVersion":"tv-v1","runtimeSeconds":194621,
    "seasons":[
      {"number":1,"yearStart":2016,"yearEnd":2017,"episodeCount":13,"scoringEntryCount":13,"audio":{"layouts":["5.1"],"lossless":False}},
      {"number":2,"yearStart":2017,"yearEnd":2018,"episodeCount":11,"scoringEntryCount":11,"audio":{"layouts":["5.1"],"lossless":False}},
      {"number":3,"yearStart":2019,"yearEnd":2019,"episodeCount":14,"scoringEntryCount":14,"audio":{"layouts":["5.1"],"lossless":False}},
      {"number":4,"yearStart":2019,"yearEnd":2024,"episodeCount":8,"scoringEntryCount":8,"audio":{"layouts":["5.1"],"lossless":False}}
    ]
  },
  {
    "id":"the-outpost-2018","type":"series","title":"The Outpost","yearStart":2018,"yearEnd":2021,
    "seasonCount":4,"episodeCount":49,"scoringEntryCount":49,
    "genres":["Adventure","Fantasy","Action","Drama"],
    "actors":["Jessica Green","Jake Stormoen","Anand Desai-Barochia","Reece Ritchie","Izuka Hoyle"],
    "audio":{"layouts":["5.1"],"lossless":True},
    "description":"Talon, the last known survivor of a persecuted Blackblood clan, reaches a remote fortress seeking the people who destroyed her family and becomes central to a struggle involving the Prime Order, rival rulers, ancient powers and the fate of her people.",
    "poster":"assets/posters/the-outpost-2018.webp","score":None,"questionsVersion":"tv-v1","runtimeSeconds":124330,
    "seasons":[
      {"number":1,"yearStart":2018,"yearEnd":2018,"episodeCount":10,"scoringEntryCount":10,"audio":{"layouts":["5.1"],"lossless":True,"quality":"24-bit"}},
      {"number":2,"yearStart":2019,"yearEnd":2019,"episodeCount":13,"scoringEntryCount":13,"audio":{"layouts":["5.1"],"lossless":True}},
      {"number":3,"yearStart":2020,"yearEnd":2021,"episodeCount":13,"scoringEntryCount":13,"audio":{"layouts":["5.1"],"lossless":True,"quality":"24-bit"}},
      {"number":4,"yearStart":2021,"yearEnd":2021,"episodeCount":13,"scoringEntryCount":13,"audio":{"layouts":["5.1"],"lossless":True,"quality":"24-bit"}}
    ]
  },
  {
    "id":"the-outer-limits-1995","type":"series","title":"The Outer Limits","yearStart":1995,"yearEnd":2002,
    "seasonCount":7,"episodeCount":154,"scoringEntryCount":152,
    "genres":["Science Fiction","Horror","Drama","Mystery"],
    "actors":["Kevin Conway","Alex Diakun","Garwin Sanford","Larry Musser","Nathaniel DeVeaux"],
    "audio":{"layouts":["Stereo"],"lossless":False},
    "description":"A science-fiction anthology in which new characters confront alien contact, genetic manipulation, artificial intelligence, time travel and experimental technologies whose promises repeatedly expose difficult questions about identity, power and survival.",
    "collectionScope":"Collection numbering preserves 22 numbered episodes per season. Local Season 3 includes the first four stories commonly catalogued in broadcast Season 4, while local Season 4 continues with the remaining 22 stories. Sandkings and Final Appeal are retained as combined physical scoring entries.",
    "poster":"assets/posters/the-outer-limits-1995.webp","score":None,"questionsVersion":"tv-v1","runtimeSeconds":409382,
    "seasons":[
      {"number":1,"yearStart":1995,"yearEnd":1995,"episodeCount":22,"scoringEntryCount":21,"audio":{"layouts":["Stereo"],"lossless":False},"cutLabel":"UNCUT"},
      {"number":2,"yearStart":1996,"yearEnd":1996,"episodeCount":22,"scoringEntryCount":22,"audio":{"layouts":["Stereo"],"lossless":False},"cutLabel":"UNCUT"},
      {"number":3,"yearStart":1997,"yearEnd":1998,"episodeCount":22,"scoringEntryCount":22,"audio":{"layouts":["Stereo"],"lossless":False},"cutLabel":"UNCUT"},
      {"number":4,"yearStart":1998,"yearEnd":1998,"episodeCount":22,"scoringEntryCount":22,"audio":{"layouts":["Stereo"],"lossless":False},"cutLabel":"UNCUT"},
      {"number":5,"yearStart":1999,"yearEnd":1999,"episodeCount":22,"scoringEntryCount":22,"audio":{"layouts":["Stereo"],"lossless":False},"cutLabel":"UNCUT"},
      {"number":6,"yearStart":2000,"yearEnd":2000,"episodeCount":22,"scoringEntryCount":21,"audio":{"layouts":["Stereo"],"lossless":False},"cutLabel":"UNCUT"},
      {"number":7,"yearStart":2001,"yearEnd":2002,"episodeCount":22,"scoringEntryCount":22,"audio":{"layouts":["Stereo"],"lossless":False}}
    ]
  }
]

series = data.setdefault('series', [])
by_id = {item.get('id'): i for i, item in enumerate(series)}
for entry in entries:
    if entry['id'] in by_id:
        series[by_id[entry['id']]] = entry
    else:
        series.append(entry)

path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
