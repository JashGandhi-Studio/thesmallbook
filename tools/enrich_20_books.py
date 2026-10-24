import re, sys

with open("js/data.js", "r", encoding="utf-8") as f:
    text = f.read()

# Let's verify total books before
matches = re.findall(r'\"id\": \"([^\"]+)\"', text)
print("Before: total books =", len(matches))

# Let's verify that we can enrich the lessons of the 20 target books
check20 = [
  "the-intellectuals-and-society", "zen-mind-beginners-mind", "the-third-pillar",
  "alchemy-rory-sutherland", "the-great-derangement", "the-effective-engineer",
  "the-brahmagupta-scrolls", "the-courtyard-stories", "the-curious-investor",
  "the-sovereign-individual", "the-kirana-ledger", "the-zero-discount-diner",
  "the-first-hundred-patrons", "the-midnight-dispatch", "the-silent-partner-tax",
  "the-unclaimed-shelf", "the-reputation-audit", "the-apprentice-hour",
  "the-founders-warranty", "the-patient-capitalist"
]

print("All 20 present:", all(f'"id": "{bid}"' in text for bid in check20))
