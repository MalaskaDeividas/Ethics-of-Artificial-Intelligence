import os
import tempfile
 
from flask import Flask, request, jsonify
from flask_cors import CORS
import ollama
 
from cyber_animals import perceive_food, make_duck
 
MODEL = "gemma4:e4b"
MAX_IMAGE_MB = 10
 
LANGUAGE_CODES = {
    "chinese": "zh-CN",
    "swedish": "sv-SE",
    "japanese": "ja-JP",
    "italian": "it-IT",
    "english": "en-US",
}
DEFAULT_LANGUAGE = "en-US"
 
app = Flask(__name__)
CORS(app)
 
duck = make_duck()
 
 
@app.route("/api/analyze", methods=["POST"])
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "NO_IMAGE",
                        "message": "I didn't get a picture to look at."}), 400
    upload = request.files["image"]
 
    upload.seek(0, os.SEEK_END)
    size_mb = upload.tell() / (1024 * 1024)
    upload.seek(0)
    if size_mb > MAX_IMAGE_MB:
        return jsonify({"error": "IMAGE_TOO_LARGE",
                        "message": "That picture is too big for me."}), 400
 
    suffix = os.path.splitext(upload.filename or "")[1] or ".jpg"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        upload.save(tmp.name)
        tmp.close()
 
        try:
            food = perceive_food(image_path=tmp.name, model=MODEL)
        except Exception as e:
            return jsonify({"error": "RECOGNITION_FAILED",
                            "message": f"I couldn't make sense of that: {e}"}), 502
 
        reaction = duck.eat(food)
        print(f"[analyze] gemma saw: {food['name']!r} ({food['origin']}) "
              f"-> duck says: {reaction['says']!r} [{reaction['language']}]")
        return jsonify({
            "text": reaction["says"],
            "language": LANGUAGE_CODES.get(reaction["language"], DEFAULT_LANGUAGE), "debug": { "gemma_food": food["name"], "origin": food["origin"], "model": MODEL }
        
        })
    finally:
        os.unlink(tmp.name)
 
 
@app.route("/api/chat", methods=["POST"])
def chat():

    data = request.json

    message = data.get("message")

    if not message:
        return jsonify({
            "error": "NO_MESSAGE"
        }), 400


    response = ollama.chat(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Quackie, a cute friendly duck. "
                    "Reply only with spoken dialogue. "
                    "No actions, narration, or stage directions."
                )
            },
            {
                "role": "user",
                "content": message
            }
        ]
    )


    return jsonify({
        "text": response["message"]["content"],
        "language": "en-US"
    })
 
 
 
@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL})
 
 
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)