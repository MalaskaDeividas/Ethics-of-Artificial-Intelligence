from mcp.server.mcpserver import MCPServer
import requests
import httpx2
import trafilatura as tr

mcp = MCPServer("search engine")

def mcp_search_engine(query: str):
    # this website provide better search engine and may have free amount of money. https://serpapi.com/
    base_url = "http://192.168.50.230:5679"
    r = requests.get(base_url, params={"q": query, "format": "json", "pageno": 1, "engines": "360search"}, timeout=10)
    data = r.json().get("results",[])
    print(data)
    return data

@mcp.tool()
def search_engine(query: str, limit: int = 10) -> str:
    title, url, content = [], [], []
    search = mcp_search_engine(query)
    search = search[:limit]
    for item in search:
        title.append(item.get("title"))
        url.append(item.get("url"))
        content.append(item.get("content"))

    return "\n\n".join(
        f"{t}\n{u}\n{c}" for t, u, c in zip(title, url, content)
    )

@mcp.tool()
async def get_content(url: str, max_chars: int = 20000) -> str:
    async with httpx2.AsyncClient(follow_redirects=True, timeout=20, headers={"User-Agent": "Mozilla/5.0 (url-reader)"}) as client:
        r = await client.get(url)
        r.raise_for_status()
    text = tr.extract(r.text, output_format="markdown", include_links=True, include_tables=True)

    return (text or "Cloud not extract content.")[:max_chars]


tools = [
    {
        "type": "function",
        "function": {
            "name": "search_engine",
            "description": "search information on internet.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "your search query."
                    },
                    "limit": {
                        "type": "integer",
                        "description": "limitation for search result."
                    }
                },
                "required": ["query"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_content",
            "description": "get content from specific url. if not extract any information will rise Cloud not extract content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url":{
                        "type": "string",
                        "description": "url address",
                    },
                    "max_chars": {
                        "type": "integer",
                        "description": "maximum characters will return from main content"
                    },
                },
                "required": ["url"],
                "additionalProperties": False,
            },
        }
    }
]