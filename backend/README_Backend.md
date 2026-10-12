# Cyber Animals — Backend

A cyber animal is shown a food image, recognises the food, and reacts in the
language of the food's country of origin. A local vision model does the image
recognition; the creature's reaction (mood, memory, craving, utterance) is our
own system.

## Run it

Requires [Ollama](https://ollama.com/download) running with a vision model:

```bash
ollama pull gemma4:e4b
py -m pip install flask flask-cors ollama
py server.py          # http://localhost:8000
```

Check it's up: <http://localhost:8000/health>

## The endpoint

### `POST /api/analyze`

`multipart/form-data` with fields `kind` (`image`) and `image` (file).

**Response — `200 OK`**

```json
{ "text": "haochi!", "language": "zh-CN" }
```

`language` is one of `en-US`, `sv-SE`, `zh-CN`, `ja-JP`, `it-IT`.

**Errors**

```json
{ "error": "IMAGE_TOO_LARGE", "message": "That picture is too big for me." }
```

Also `NO_IMAGE` and `RECOGNITION_FAILED`.

## Files

- `cyber_animals.py` — the engine (perception + creature core)
- `server.py` — the API wrapper
- `run.py` — terminal version for testing without the frontend
