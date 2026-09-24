import asyncio
import base64
from openai import OpenAI
from search_server import tools, search_engine, get_content
import json
from pathlib import Path

"TODO: base on front GUI change this path"
image_path = Path(__file__).parent / "xiaolongbao.png"

def encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def model():
    # change this to LLM local url
    base_url = "http://192.168.50.230:1234/v1"
    # if you have api key then change it, otherwise keep it still
    api_key ="lmstudio"

    client = OpenAI(
        base_url=base_url,
        api_key=api_key,
    )

    model="google/gemma-4-26b-a4b-qat"
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Check the dish belongs to which country in the image first. Then output it's language and what's name of this dish.\
            finally, search the recipe of this dish and tell me how to cook it in it's language."},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{encode_image(image_path)}"},
            },
        ],
    }]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools
    )
    # print(response.choices[0].message.content)

    messages.append(response.choices[0].message)

    for tool_call in response.choices[0].message.tool_calls or []:
        if tool_call.function.name == "search_engine":
            args = json.loads(tool_call.function.arguments)
            search = search_engine(args["query"], args.get("limit", 10))

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps({"search result": search}),
                }
            )
        elif tool_call.function.name == "get_content":
            args = json.loads(tool_call.function.arguments)
            content = asyncio.run(get_content(args["url"], args.get("max_chars", 20000)))

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps({"content": content}),
                }
            )

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools,
    )

    print(response.choices[0].message.content)

model()