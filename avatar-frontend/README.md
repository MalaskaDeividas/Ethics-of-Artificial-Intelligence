## Run it

```bash
cd avatar-frontend
npm install
npm run dev          # http://localhost:5173
```

You also need an `.env.local` file in the project root:

> The frontend is running with a mock backend. Switch `VITE_USE_MOCK_BACKEND` to `false` to use the real backend.

---

## The endpoint to build

### `POST /api/analyze`

Content type is `multipart/form-data`.

**Fields**

| Field   | Type   | Notes                    |
|---------|--------|--------------------------|
| `kind`  | string | `image`                  |
| `image` | file   | The image user uploaded. |

**Response — `200 OK`, `application/json`**

```jsonc
{
  "text": "Wow, so much blue! Is that the sky, or the sea?",
  "language": "en-US",
}
```

**Response — errors**

```json
{
  "error": "IMAGE_TOO_LARGE",
  "message": "That picture is too big for me."
}
```
