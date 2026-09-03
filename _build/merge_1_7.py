import json
CH = [
 [41,"Welcome"],[72,"Why the systems around the DM matter"],[185,"Setting up your calendar"],
 [271,"Your Calendly value prop and the three-pillar offer"],[363,"The questionnaire: what to ask for"],
 [454,"Whether asking for a phone number costs you bookings"],[586,"Qualifying from the questionnaire"],
 [769,"Qualifying on revenue"],[811,"Niche, and how to frame the investment question"],
 [950,"Time commitment and the show-up promise"],[991,"Getting prospects to turn their camera on"],
 [1129,"Setting your availability"],[1215,"30-minute blocks and how far out to let them book"],
 [1260,"The pre-call email drip in Zapier"],[1352,"Email 1: confirming the booking"],
 [1397,"Asking them to reply yes"],[1443,"Email 2: sending social proof"],
 [1577,"The case study disguised as a lead magnet"],[1668,"Email 3: the next-day case study"],
 [1759,"Why the delays are set the way they are"],[1845,"Texting prospects the morning of the call"],
 [1937,"What the text actually says"],[2025,"Why text beats email when they cancel"],
 [2123,"Post-call: what to do with the 70% who don't close"],[2254,"The CRM columns"],
 [2344,"The hot follow-up drip"],[2430,"Hot email 2: the voice message video"],
 [2477,"Hot email 3: the $4,000 deal breakdown"],[2611,"Inviting them into the Facebook group"],
 [2656,"The last two hot emails"],[2700,"Q&A: tracking success rates per email"],
 [2747,"Moving prospects from hot to follow-up"],[2794,"The long-cadence follow-up drip"],
 [2835,"Staying top of mind without pushing"],[2972,"The breakup email"],
 [3060,"Rip this off and put it in your own voice"],[3154,"What's coming in the next training"],
 [3240,"Q&A: prospects who reschedule repeatedly"],[3286,"Q&A: showing you care without sounding eager"],
 [3385,"Matching your push to their interest level"],[3521,"Q&A: running drips from Gmail"],
 [3601,"Why formatting conveys competence"],[3690,"Wrap-up"],
]
d=json.load(open("chapters.json",encoding="utf-8"))
t=json.load(open("chapters_from_transcripts.json",encoding="utf-8"))
n=0
for slug,ch in t.items():
    d[slug]["chapters"]=ch; n+=1
d["1-7-sales-systems"]["chapters"]=CH; n+=1
json.dump(d,open("chapters.json","w",encoding="utf-8"),indent=1,ensure_ascii=False)
have=sum(1 for v in d.values() if v["chapters"])
print(f"filled {n} pages | now {have}/53 have chapters | missing:")
for s,v in d.items():
    if not v["chapters"]: print("   ",s)
