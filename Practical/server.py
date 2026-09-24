"""
server.py - the bridge between the frontend and our creature engine
===================================================================
Th This file is a THIN wrapper: it
takes the uploaded image, runs our own cyber_animals engine on it, and
translates the creature's reaction into the two fields the frontend wants.

The creative core stays in cyber_animals.py. This file only does plumbing:
receive image -> run engine -> shape the response.

Run it:
    py -m pip install flask flask-cors
    py server.py                       # serves on http://localhost:8000
Then in avatar-frontend/.env.local set the backend URL to this server and
flip VITE_USE_MOCK_BACKEND to false.
"""

import os
import tempfile

from flask import Flask, request, jsonify
from flask_cors import CORS

from cyber_animals import perceive_food, make_duck

MODEL = "llava"          # the vision model ollama uses (change if you pull another)
MAX_IMAGE_MB = 10        # reject images bigger than this

# Frontend wants BCP-47 codes ("it-IT"), our FOOD_DB uses names ("italian").
LANGUAGE_CODES = {
    "japanese": "ja-JP", "italian": "it-IT", "french": "fr-FR",
    "spanish": "es-ES",  "korean": "ko-KR", "german": "de-DE",
    "hindi": "hi-IN",    "chinese": "zh-CN", "arabic": "ar-SA",
    "thai": "th-TH",     "english": "en-US", "gibberish": "en-US",
}

app = Flask(__name__)
CORS(app)  # let the frontend (different port) call us

# ONE creature lives for the whole server run, so it evolves across uploads.
# (When you add animal choice later, pick the creature per request instead.)
duck = make_duck()


@app.route("/api/analyze", methods=["POST"])
def analyze():
    # 1. check the frontend actually sent an image file
    if "image" not in request.files:
        return jsonify({"error": "NO_IMAGE",
                        "message": "I didn't get a picture to look at."}), 400
    upload = request.files["image"]

    # 2. size guard (matches the frontend's IMAGE_TOO_LARGE error shape)
    upload.seek(0, os.SEEK_END)
    size_mb = upload.tell() / (1024 * 1024)
    upload.seek(0)
    if size_mb > MAX_IMAGE_MB:
        return jsonify({"error": "IMAGE_TOO_LARGE",
                        "message": "That picture is too big for me."}), 400

    # 3. ollama needs a file path, so save the upload to a temp file
    suffix = os.path.splitext(upload.filename or "")[1] or ".jpg"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        upload.save(tmp.name)
        tmp.close()

        # 4. run OUR engine: recognise the food, then let the duck react
        try:
            food = perceive_food(image_path=tmp.name, model=MODEL)
        except Exception as e:
            return jsonify({"error": "RECOGNITION_FAILED",
                            "message": f"I couldn't make sense of that: {e}"}), 502

        reaction = duck.eat(food)

        # 5. translate the reaction into what the frontend asked for
        return jsonify({
            "text": reaction["says"],
            "language": LANGUAGE_CODES.get(reaction["language"], "en-US"),
        })
    finally:
        os.unlink(tmp.name)  # always clean up the temp file


@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
