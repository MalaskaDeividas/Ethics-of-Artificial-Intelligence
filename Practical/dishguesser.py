import json
from pathlib import Path
import ollama


model       = "qwen3-vl:8b"
image_folder  = Path("images")
 
promt = """
Look at the dish in the image and determine the country the dish most likely originated from.

Then tell me the main language spoken in that country.

Provide ONLY the language as a single word.
Do not explain your answer.
"""
# Identify the dish. 
def identify_dish(image_path: Path):
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "user", "content": "Identify the dish in the image." "Return only the name of the dish.", "images": [str(image_path)]},
        ],
        options={"temperature": 0}   
    )
    dish = response["message"]["content"].strip()
    return dish

# Identify the language of the dish.
def identify_language(dish: str):
    
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "user", "content": (f"The dish is {dish}. " "What country did this dish originate from? " "Then return ONLY the main language of that country " "as a single word.")},
            
        ],
        options={"temperature": 0}

    )
    return response["message"]["content"].strip()

# Analyze the image and return the dish and language.
def analyze(image_path: Path):
    dish = identify_dish(image_path)
    language = identify_language(dish)

    print(f"Dish: {dish}")
    print(f"Language: {language}")

    return dish, language

    


def main():
    supported_formats = {".jpg", ".jpeg", ".png", ".webp"}

    for image_path in image_folder.iterdir():

        if image_path.suffix.lower() not in supported_formats:
            continue

        print(f"\nAnalyzing: {image_path.name}")
        analyze(image_path)


if __name__ == "__main__":
    main()