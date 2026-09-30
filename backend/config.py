from pathlib import Path

# chat model configuration
MODEL = "llava"
chat_llm_url = "http://localhost:11434/v1"
text_api_key = "lmstudio"

# image model configuration
image_llm_url = "http://localhost:1235/v1"
image_api_key = "none"
image_model_name = "abenzerps/Qwen-Image-2.1-Uncensored-GGUF"
size = "1024x1024"
response_format = "b64_json"

# image configuration
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp")
MAX_IMAGE_MB = 10
image_dir = Path(__file__).parent / "images"
image_dir.mkdir(exist_ok=True)
image_paths = sorted(
    p for p in image_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS
)

# search server configuration
search_server_url = "http://localhost:5679"
engines = "bing"