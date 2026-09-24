"""
Cyber Animals - project CORE (engine)
=====================================

Layers:
  1. perceive_food()  -> PERCEPTION. The only place a model is used. It turns an
     image into a single food word (via ollama), then looks that word up in our
     own FOOD_DB. Model does perception ONLY; everything after is our system.
  2. Creature.eat()   -> THE CORE we designed. State changes every feeding, so
     the same food gives different outcomes. 
"""

import re
import random
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# 1. OUR KNOWLEDGE BASE  (authored by us: food -> origin, language, attributes)
# ---------------------------------------------------------------------------
FOOD_DB = {
    "sushi":     {"origin": "Japan",    "language": "japanese", "taste": "savoury", "color": (230, 90, 90)},
    "ramen":     {"origin": "Japan",    "language": "japanese", "taste": "savoury", "color": (210, 140, 70)},
    "pizza":     {"origin": "Italy",    "language": "italian",  "taste": "savoury", "color": (200, 60, 40)},
    "pasta":     {"origin": "Italy",    "language": "italian",  "taste": "savoury", "color": (220, 190, 120)},
    "lasagna":   {"origin": "Italy",    "language": "italian",  "taste": "savoury", "color": (190, 90, 50)},
    "croissant": {"origin": "France",   "language": "french",   "taste": "sweet",   "color": (210, 170, 90)},
    "baguette":  {"origin": "France",   "language": "french",   "taste": "savoury", "color": (205, 165, 95)},
    "tacos":     {"origin": "Mexico",   "language": "spanish",  "taste": "spicy",   "color": (200, 120, 40)},
    "paella":    {"origin": "Spain",    "language": "spanish",  "taste": "savoury", "color": (215, 160, 60)},
    "kimchi":    {"origin": "Korea",    "language": "korean",   "taste": "spicy",   "color": (190, 50, 30)},
    "pretzel":   {"origin": "Germany",  "language": "german",   "taste": "savoury", "color": (150, 100, 50)},
    "curry":     {"origin": "India",    "language": "hindi",    "taste": "spicy",   "color": (200, 140, 30)},
    "dumpling":  {"origin": "China",    "language": "chinese",  "taste": "savoury", "color": (225, 210, 170)},
    "hummus":    {"origin": "Lebanon",  "language": "arabic",   "taste": "savoury", "color": (225, 205, 150)},
    "padthai":   {"origin": "Thailand", "language": "thai",     "taste": "sour",    "color": (210, 150, 80)},
    "burger":    {"origin": "USA",      "language": "english",  "taste": "savoury", "color": (170, 110, 60)},
    "donut":     {"origin": "USA",      "language": "english",  "taste": "sweet",   "color": (220, 150, 170)},
}


# ---------------------------------------------------------------------------
# 2. LANGUAGE FRAGMENTS  
# ---------------------------------------------------------------------------
PHRASEBOOK = {
    "japanese": {"happy": ["oishii!", "umai~", "yatta!"],   "meh": ["mmm...", "sou ka."],    "grumpy": ["iya da!", "mou..."]},
    "italian":  {"happy": ["delizioso!", "che buono!"],     "meh": ["boh...", "insomma."],   "grumpy": ["basta!", "mamma mia..."]},
    "french":   {"happy": ["magnifique!", "miam!"],         "meh": ["bof...", "peut-etre."], "grumpy": ["non, non!", "zut!"]},
    "spanish":  {"happy": ["que rico!", "delicioso!"],      "meh": ["mas o menos.", "bueno..."],"grumpy": ["ay, no!", "que va!"]},
    "korean":   {"happy": ["masisseoyo!", "joah!"],         "meh": ["geujeo...", "eumm."],   "grumpy": ["silheo!", "aish!"]},
    "german":   {"happy": ["lecker!", "wunderbar!"],        "meh": ["naja...", "geht so."],  "grumpy": ["nein!", "pfui!"]},
    "hindi":    {"happy": ["swaadisht!", "wah!"],           "meh": ["theek hai.", "hmm."],   "grumpy": ["nahi!", "chhee!"]},
    "chinese":  {"happy": ["haochi!", "zhen bang!"],        "meh": ["haihao.", "en."],       "grumpy": ["buyao!", "aiya!"]},
    "arabic":   {"happy": ["ladheedh!", "yummy!"],          "meh": ["maashi.", "hmm."],      "grumpy": ["laa!", "ufff!"]},
    "thai":     {"happy": ["aroi!", "aroi mak!"],           "meh": ["ok na.", "eu."],        "grumpy": ["mai ao!", "yae!"]},
    "english":  {"happy": ["yum!", "so good!"],             "meh": ["it's ok.", "meh."],     "grumpy": ["yuck!", "no thanks!"]},
    "gibberish":{"happy": ["blorp!", "yumyum!"],            "meh": ["meep."],                "grumpy": ["grrk!"]},
}

# 1b. PERCEPTION 

class RecognitionUnavailable(Exception):
    """Raised when ollama can't be reached, so the caller can offer a fallback."""


def _clean_to_food_word(text):
    """Vision models are chatty, reduce to one known word."""
    text = text.lower()
    for key in FOOD_DB:                       # prefer an exact known food
        if key in text:
            return key
    words = re.findall(r"[a-z]+", text)       # otherwise first plausible word
    stop = {"this", "is", "a", "an", "the", "image", "shows", "of", "some", "it"}
    for w in words:
        if w not in stop:
            return w
    return "unknown"


def _recognize_with_ollama(image_path, model):
    try:
        import ollama
    except ImportError:
        raise RecognitionUnavailable("The 'ollama' python package isn't installed "
                                     "(pip install ollama).")
    try:
        r = ollama.chat(
            model=model,
            messages=[{
                "role": "user",
                # tight prompt so we get ONE word back, not a paragraph
                "content": "Identify the food in this image. Reply with only the "
                           "single most specific food name, lowercase, no other words.",
                "images": [image_path],
            }],
        )
    except Exception as e:
        raise RecognitionUnavailable(f"Couldn't reach the model '{model}': {e}")
    return _clean_to_food_word(r["message"]["content"])


def perceive_food(image_path=None, food_name=None, model="gemma4:e4b"):
    """Turn an image (or a given name) into a food descriptor our system uses.

    Pass image_path to recognise a photo with ollama, or food_name to skip the
    model (useful for testing, or as a manual fallback).
    """
    if food_name is None:
        if image_path is None:
            raise ValueError("Give an image_path or a food_name.")
        food_name = _recognize_with_ollama(image_path, model)

    food_name = food_name.lower().strip()
    if food_name in FOOD_DB:
        return {"name": food_name, **FOOD_DB[food_name]}
    # unknown food: our system still reacts, just in a made-up tongue
    return {"name": food_name, "origin": "Unknown", "language": "gibberish",
            "taste": "mystery", "color": (128, 128, 128)}


# ---------------------------------------------------------------------------
# 3. THE CREATURE  (the CORE we designed ourselves)
# ---------------------------------------------------------------------------
@dataclass
class Creature:
    name: str
    species: str
    likes_taste: str            # personality: preferred taste
    volatility: float           # how strongly mood swings (0..1)

    hunger: int = 70            # 0 = full, 100 = starving
    mood: str = "meh"
    size: float = 1.0
    color: list = field(default_factory=lambda: [180, 180, 180])
    craving: str = "savoury"
    history: list = field(default_factory=list)

    def eat(self, food):
        # (a) enjoyment: preference + current craving + hunger + OUR noise
        delight = 0.3
        if food["taste"] == self.likes_taste: delight += 0.4
        if food["taste"] == self.craving:      delight += 0.3
        if self.hunger > 60:                    delight += 0.2
        delight += random.uniform(-self.volatility, self.volatility)
        delight = max(0.0, min(1.0, delight))

        # (b) delight -> mood, probabilistically (same food can differ)
        roll = random.random()
        if roll < delight:          self.mood = "happy"
        elif roll < delight + 0.35: self.mood = "meh"
        else:                        self.mood = "grumpy"

        # (c) assemble the utterance from OUR fragments by OUR rule
        bank = PHRASEBOOK.get(food["language"], PHRASEBOOK["gibberish"])
        utterance = random.choice(bank.get(self.mood, bank["meh"]))

        # (d) appearance drifts toward the food; the creature grows
        self.color = [int(c * 0.85 + fc * 0.15) for c, fc in zip(self.color, food["color"])]
        self.size = round(self.size + 0.05 + delight * 0.05, 2)

        # (e) hunger drops; pick the NEXT craving (drives desire)
        self.hunger = max(0, self.hunger - 25)
        if delight > 0.6:
            self.craving = food["taste"]
        else:
            self.craving = random.choice(["sweet", "savoury", "spicy", "sour"])

        self.history.append(food["name"])
        return {
            "animal": self.name, "species": self.species,
            "says": utterance, "language": food["language"],
            "saw": food["name"], "origin": food["origin"],
            "mood": self.mood,
            "appearance": {"size": self.size, "color": tuple(self.color)},
            "wants_next": f"something {self.craving}",
            "delight": round(delight, 2),
        }


def make_rabbit(): return Creature("Bit",   "rabbit", likes_taste="savoury", volatility=0.4)
def make_duck():   return Creature("Quack", "duck",   likes_taste="sweet",   volatility=0.15)


# ---------------------------------------------------------------------------
# quick self-test (no images, no ollama needed)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    def show(a):
        print(f"  {a['animal']} saw {a['saw']} ({a['origin']}) -> "
              f"\"{a['says']}\" [{a['language']}, mood={a['mood']}, "
              f"size={a['appearance']['size']}, wants={a['wants_next']}]")
    print("Same rabbit, same sushi, twice (should differ):")
    r = make_rabbit()
    show(r.eat(perceive_food(food_name="sushi")))
    show(r.eat(perceive_food(food_name="sushi")))
