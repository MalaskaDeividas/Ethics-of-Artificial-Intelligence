"""
run.py - interactive front door for the cyber animals
=====================================================
Lists the photos in your images folder, lets you pick one and an animal, then
feeds the photo to the creature and prints its reaction.

Usage:
    python run.py                 # looks in ./images
    python run.py path/to/folder  # or point it somewhere else

The chosen creature STAYS ALIVE for the whole session, so feeding it several
photos in a row shows it change (mood, size, colour, craving) over time.
"""

import os
import sys

from cyber_animals import (
    perceive_food, make_rabbit, make_duck, RecognitionUnavailable,
)

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp")
MODEL = "gemma4:e4b"          # change to your pulled model (moondream, llava, gemma3:4b ...)


def list_images(folder):
    if not os.path.isdir(folder):
        return []
    return sorted(f for f in os.listdir(folder)
                  if f.lower().endswith(IMAGE_EXTS))


def choose(prompt, options):
    """Show a numbered menu and return the chosen item."""
    for i, opt in enumerate(options, 1):
        print(f"  {i}. {opt}")
    while True:
        pick = input(prompt).strip()
        if pick.isdigit() and 1 <= int(pick) <= len(options):
            return options[int(pick) - 1]
        print("  (type one of the numbers)")


def show(a):
    r, g, b = a["appearance"]["color"]
    print(f"\n  {a['animal']} the {a['species']} looked at your {a['saw']} "
          f"(from {a['origin']}) and said:")
    print(f"     \"{a['says']}\"   ({a['language']})")
    print(f"  mood: {a['mood']} | size: {a['appearance']['size']} | "
          f"colour: rgb({r},{g},{b}) | now wants: {a['wants_next']}\n")


def recognise(image_path):
    """Try the model; if it's not ready, let the user type the food by hand."""
    try:
        return perceive_food(image_path=image_path, model=MODEL)
    except RecognitionUnavailable as e:
        print(f"\n  [recognition unavailable] {e}")
        name = input("  Type the food name yourself for now: ").strip()
        return perceive_food(food_name=name)


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else "images"
    images = list_images(folder)
    if not images:
        print(f"No images found in '{folder}/'. Put some photos there, or run: "
              f"python run.py path/to/folder")
        return

    print(f"Found {len(images)} photo(s) in '{folder}/'.")
    print("\nChoose your animal:")
    animal = choose("Animal number: ", ["rabbit", "duck"])
    creature = make_rabbit() if animal == "rabbit" else make_duck()

    while True:
        print("\nPick a photo to feed it:")
        photo = choose("Photo number: ", images)
        food = recognise(os.path.join(folder, photo))
        show(creature.eat(food))

        again = input("Feed it another photo? (y/n): ").strip().lower()
        if again != "y":
            break

    print(f"\n{creature.name} has now eaten: {creature.history}")
    print("Bye!")


if __name__ == "__main__":
    main()
