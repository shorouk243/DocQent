import os
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from llama_cpp import Llama 
from pydantic import BaseModel
from dotenv import load_dotenv
from langsmith import traceable
from tavily import TavilyClient

load_dotenv()
router = APIRouter()

# --- CONFIG ---
# n_ctx=8192 for sufficient room for both Web and Internal context
llm = Llama(
    model_path="/home/shorouk/Documents/shorouk/project/app/granite-4.0-h-micro-Q4_K_M.gguf", 
    n_gpu_layers=-1, 
    n_ctx=8192,
    logits_all=False  # Disabled as Perplexity is no longer needed
)

class ChatRequest(BaseModel):
    context: str
    question: str

@router.post("/ask")
async def ask_assistant(request: ChatRequest):
    # Improved Prompt with clearer instructions to prevent "refusal"
    prompt = f"""<|start_of_role|>system<|end_of_role|>You are a precise technical assistant. 
Use the provided context to answer the question, or internal knowledge. If you don't know, say you don't know. 

### CONTEXT:
{request.context}
<|end_of_text|>
<|start_of_role|>user<|end_of_role|>{request.question}<|end_of_text|>
<|start_of_role|>assistant<|end_of_role|>"""

    async def stream_generator():
        llm.reset() 
        
        # Start Streaming with error handling
        try:
            stream = llm(
                prompt, 
                stop=["<|end_of_text|>", "<|end_of_role|>"],
                stream=True, 
                max_tokens=1024, 
                temperature=0.1, 
                top_p=0.9
            )

            for chunk in stream:
                # Safer data extraction
                if chunk and "choices" in chunk and len(chunk["choices"]) > 0:
                    token = chunk["choices"][0].get("text", "")
                    yield token
                await asyncio.sleep(0.01)
        except Exception as e:
            yield f"\n[Error during generation: {str(e)}]"

    return StreamingResponse(stream_generator(), media_type="text/plain")

@router.post("/ask_web")
async def ask_assistant_web(request: ChatRequest):
    tavily_key = os.getenv("TavilyClient_api_key")
    web_context = ""
    search_response = None
    try:
        tavily = TavilyClient(api_key=tavily_key)
        search_response = tavily.search(
            query=request.question,
            search_depth="advanced",
            max_results=5
        )
        for result in search_response.get('results', []):
            web_context += f"\n---\nSource: {result['url']}\nContent: {result['content']}\n"
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tavily search failed: {str(e)}")

    if not web_context:
        web_context = "No relevant web results found."

    sources = ""
    if search_response and search_response.get("results"):
        urls = [r.get("url") for r in search_response["results"] if r.get("url")]
        if urls:
            sources = "\nSOURCES:\n" + "\n".join(urls)

    prompt = f"""<|start_of_role|>system<|end_of_role|>You are a precise technical assistant. 
STRICT WEB MODE:
- Answer ONLY using the WEB CONTEXT below.
- If the answer is not explicitly in WEB CONTEXT, say: "I couldn't find that in the provided sources."
- Do NOT use prior knowledge or internal context.
- Always include the Sources list when URLs are provided.

### WEB CONTEXT:
{web_context}{sources}
<|end_of_text|>
<|start_of_role|>user<|end_of_role|>{request.question}<|end_of_text|>
<|start_of_role|>assistant<|end_of_role|>"""

    async def stream_generator():
        try:
            llm.reset()
            stream = llm(
                prompt, 
                stop=["<|end_of_text|>", "<|end_of_role|>"],
                stream=True, 
                max_tokens=1024, 
                temperature=0.0
            )

            for chunk in stream:
                if chunk and "choices" in chunk:
                    yield chunk["choices"][0].get("text", "")
                await asyncio.sleep(0.01)

        except Exception as e:
            # Yielding the error as a string since headers are already sent
            yield f"\n\n[SYSTEM ERROR]: {str(e)}"

    return StreamingResponse(stream_generator(), media_type="text/plain")
