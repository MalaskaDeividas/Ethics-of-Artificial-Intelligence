import asyncio
import base64
from openai import OpenAI
from search_server import tools, search_engine, get_content
import json
from config import *

def encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def chat_model(image_url: str) -> str:
    # change this to LLM local url
    base_url = chat_llm_url
    # if you have api key then change it, otherwise keep it still
    api_key = text_api_key

    client = OpenAI(
        base_url=base_url,
        api_key=api_key,
    )

    model=MODEL
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Check the dish belongs to which country in the image first. Then output it's language and what's name of this dish.\
            finally, search the recipe of this dish and tell me how to cook it in it's language."},
            {
                "type": "image_url",
                # "image_url": {"url": f"data:image/png;base64,{encode_image(image_paths)}"},
                "image_url": {"url": image_url},
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

    # print(response.choices[0].message.content)

    return response.choices[0].message.content


def image_model(prompt:str, turn: int = 0) -> object:
    base_url = image_llm_url
    api_key = image_api_key

    client = OpenAI(
        base_url=base_url,
        api_key=api_key,
    )

    prompt = "" + prompt + "\n\nPlease generate an image based on the above prompt."

    response = client.images.generate(
        model = image_model_name,
        prompt = prompt,
        size = size,
        response_format = response_format,
    )

    with open(image_dir / f"generated_{turn}.png", "wb") as f:
        f.write(base64.b64decode(response.data[0].b64_json))

    # print(repr(image_model_name), repr(prompt), repr(size), repr(response_format))

    return response.data[0].b64_json

# image_model(prompt="A beautiful landscape with mountains and a river, in the style of a watercolor painting.")