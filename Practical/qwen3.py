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

def analyze(image_path: Path):
    print(f"\nAnalyzing image: {image_path.name}")
    
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": "You are a dish language identifier, you identify the language used by the origin country of a dish."},
            {"role": "user", "content": promt, "image": str(image_path)},
            
        ],
        format="json",
        options={"temperature": 0}

    )
    response = response["message"]["content"]
    
    try:
        result = json.loads(response)
    except json.JSONDecodeError:
        print("Failed to parse JSON response. Raw response:")
        print(response)
        return {
            "language": None,
            "confidence": 0,
            "raw_response": response
        }
    return result


def main():
    supported_formats = {".jpg", ".jpeg", ".png", ".webp"}
    

    for image_path in image_folder.iterdir():

            if image_path.suffix.lower() not in supported_formats:
                continue

            language = analyze(image_path)

            print(f"{image_path.name}: {language}")


if __name__ == "__main__":
    main()