import base64
from vision_client import chat_model, image_model
from flask_cors import CORS
from flask import Flask, request, jsonify
from config import MAX_IMAGE_MB, IMAGE_EXTS

app = Flask(__name__)
CORS(app)

@app.route("/api/analyze", methods=["POST"])
def analyze():
    upload = request.files.get("image")
    if upload is None:
        return jsonify({"error": "No image uploaded."}), 400

    data = upload.read()
    if len(data) > MAX_IMAGE_MB * 1024 * 1024:
        return jsonify({"error": f"Image exceeds maximum size of {MAX_IMAGE_MB} MB."}), 400

    mime = upload.mimetype or "image/png" # or "image/jpeg"
    data_url = f"data:{mime};base64,{base64.b64encode(data).decode()}"

    history = []
    for turn in range(4):
        text_result = chat_model(image_url=data_url)
        image_b64 = image_model(prompt=text_result, turn=turn)
        history.append({"turn": turn, "text": text_result, "image": image_b64})
        # feed the generated image back to the chat model for the next turn
        data_url = f"data:image/png;base64,{image_b64}"

    return jsonify({"turns": history})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
