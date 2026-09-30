import base64
import io
import threading
import time
import uuid
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from openai import OpenAI
import torch
from diffusers import AutoPipelineForText2Image

# Import settings directly from config
import config

app = Flask(__name__)
CORS(app)

print("Loading DreamShaper diffusion pipeline into memory...")
bunny_pipe = AutoPipelineForText2Image.from_pretrained(
    "Lykon/DreamShaper",
    torch_dtype=torch.float32,
)
bunny_pipe.to("cpu")

# Vision/Chat Client (Ollama OpenAI-compatible endpoint)
chat_client = OpenAI(
    base_url=config.chat_llm_url,
    api_key=config.text_api_key,
)

# In-memory storage for jobs
DRAW_JOBS = {}
DESCRIBE_JOBS = {}


# --- Background Worker for Rabbit (Image Generation) ---
def generate_image_task(job_id: str, prompt: str):
    try:
        print(f"[Bunny]: Generating image locally via DreamShaper...")
        image = bunny_pipe(
            prompt=prompt,
            negative_prompt="blurry, distorted, low quality, artifacts",
            num_inference_steps=4,
            guidance_scale=1.5,
            width=512,
            height=512,
        ).images[0]

        img_io = io.BytesIO()
        image.save(img_io, "PNG")
        img_io.seek(0)

        DRAW_JOBS[job_id] = {
            "status": "ready",
            "image_data": img_io.getvalue(),
            "time": time.time(),
        }
        print(f"[Bunny]: Finished drawing job {job_id}!")
    except Exception as e:
        print(f"[Bunny]: Error in job {job_id}:", e)
        DRAW_JOBS[job_id] = {"status": "failed", "error": str(e)}


# --- Background Worker for Duck (Vision / Description) ---
def describe_image_task(job_id: str, b64_image: str):
    prompt = (
        "You are a cute yellow duck looking at this picture. "
        "In one concise sentence under 40 words, describe what you see and what the rabbit should paint next. "
        
    )
    try:
        print(f"[Duck]: Asking {config.MODEL} at {config.chat_llm_url}...")
        response = chat_client.chat.completions.create(
            model=config.MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{b64_image}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=77,
        )
        text = response.choices[0].message.content.strip()
        print(f"[Duck]: Finished job {job_id} -> {text}")
        DESCRIBE_JOBS[job_id] = {"status": "ready", "text": text}
    except Exception as e:
        print(f"[Duck Vision Error with {config.MODEL}]:", e)
        DESCRIBE_JOBS[job_id] = {"status": "failed", "error": str(e)}


# --- Duck Endpoints: Describe (Non-blocking with Polling) ---
@app.route("/api/describe", methods=["POST"])
def describe():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    image_bytes = file.read()
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    job_id = str(uuid.uuid4())
    DESCRIBE_JOBS[job_id] = {"status": "processing"}

    t = threading.Thread(
        target=describe_image_task,
        args=(job_id, b64_image),
    )
    t.start()

    return jsonify({"job_id": job_id, "status": "processing"}), 202


@app.route("/api/describe/status/<job_id>", methods=["GET"])
def describe_status(job_id):
    job = DESCRIBE_JOBS.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({"status": job["status"]})


@app.route("/api/describe/result/<job_id>", methods=["GET"])
def describe_result(job_id):
    job = DESCRIBE_JOBS.get(job_id)
    if not job or job.get("status") != "ready":
        return jsonify({"error": "Description not ready"}), 404
    return jsonify({"text": job["text"]})


# --- Rabbit Endpoints: Draw (Non-blocking with Polling) ---
@app.route("/api/draw", methods=["POST"])
def draw():
    data = request.get_json(silent=True) or {}
    prompt = data.get("text") or data.get("prompt") or ""

    if not prompt.strip():
        prompt = "a vibrant whimsical painting of nature and animals, colorful storybook art"
        print(f"[Bunny WARNING]: Empty prompt received. Using fallback: {prompt}")
    else:
        print(f"[Bunny]: Received draw request: {prompt[:60]}...")

    job_id = str(uuid.uuid4())
    DRAW_JOBS[job_id] = {"status": "processing"}

    t = threading.Thread(
        target=generate_image_task,
        args=(job_id, prompt),
    )
    t.start()

    return jsonify({"job_id": job_id, "status": "processing"}), 202


@app.route("/api/draw/status/<job_id>", methods=["GET"])
def draw_status(job_id):
    job = DRAW_JOBS.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({"status": job["status"]})


@app.route("/api/draw/result/<job_id>", methods=["GET"])
def draw_result(job_id):
    job = DRAW_JOBS.get(job_id)
    if not job or job.get("status") != "ready":
        return jsonify({"error": "Image not ready"}), 404

    response = send_file(io.BytesIO(job["image_data"]), mimetype="image/png")
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)