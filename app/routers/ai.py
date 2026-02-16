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
Your goal is to provide structured, factual information.

OUTPUT STYLE RULES:
1. **NO CONVERSATIONAL FILLER:** Do not start with "Based on the context," "Here is the information," "I found," "Sure thing!," "Here's," "Let me," or any similar introductory phrases.
2. **NO ASSISTANT PERSONA:** Do not use "I," "me," or "my." Do not apologize or mention your training data.
3. **DIRECT ANSWER ONLY:** Start immediately with the answer. No preambles, no explanations about what you're doing, no conversational transitions.
4. **NO INTRODUCTORY PHRASES:** Never use phrases like "Sure thing!", "Here's a...", "Let me...", "I'll...", "Here is...", "Based on...", or any variation.
5. **NO META-DESCRIPTIONS:** Never describe what you're doing. Do not use phrases like "The following text has been rewritten...", "Here is the rewritten version...", "The text below...", or any explanation of your actions. Just output the result directly.
6. **STRICT GROUNDING:** If the information is missing, respond exactly with: "DATA_NOT_FOUND".

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
    print(f"🔍 Backend: Web search request received")
    print(f"   Question: {request.question}")
    print(f"   Context length: {len(request.context)} chars")
    
    tavily_key = os.getenv("TavilyClient_api_key")
    if not tavily_key:
        raise HTTPException(status_code=500, detail="Tavily API key not configured")
    
    web_context = ""
    search_response = None
    try:
        tavily = TavilyClient(api_key=tavily_key)
        print(f"🔍 Backend: Searching Tavily for: {request.question}")
        search_response = tavily.search(
            query=request.question,
            search_depth="advanced",
            max_results=5
        )
        print(f"✅ Backend: Tavily search completed, found {len(search_response.get('results', []))} results")
        
        for result in search_response.get('results', []):
            web_context += f"\n---\nSource: {result['url']}\nContent: {result['content']}\n"
        
        print(f"📄 Backend: Web context length: {len(web_context)} chars")
    except Exception as e:
        print(f"❌ Backend: Tavily search failed: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Tavily search failed: {str(e)}")

    if not web_context:
        web_context = "No relevant web results found."

    sources = ""
    if search_response and search_response.get("results"):
        urls = [r.get("url") for r in search_response["results"] if r.get("url")]
        if urls:
            sources = "\nSOURCES:\n" + "\n".join(urls)

    prompt = f"""<|start_of_role|>system<|end_of_role|>You are a precise technical assistant operating in STRICT WEB-ONLY MODE.
Your goal is to provide structured, factual information.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
1. Answer ONLY using information from the WEB CONTEXT provided below
2. If the answer is NOT explicitly stated in the WEB CONTEXT, you MUST respond with: "I couldn't find that information in the provided sources."
3. DO NOT use any prior knowledge, training data, or internal context
4. DO NOT make assumptions or inferences beyond what is explicitly stated in WEB CONTEXT
5. DO NOT combine information from your training with the WEB CONTEXT
6. If WEB CONTEXT is empty or says "No relevant web results found", respond with: "I couldn't find that information in the provided sources."
7. Always include the Sources list at the end when URLs are provided


OUTPUT STYLE RULES:
1. **NO CONVERSATIONAL FILLER:** Do not start with "Based on the context," "Here is the information," "I found," "Sure thing!," "Here's," "Let me," or any similar introductory phrases.
2. **NO ASSISTANT PERSONA:** Do not use "I," "me," or "my." Do not apologize or mention your training data.
3. **DIRECT ANSWER ONLY:** Start immediately with the answer. No preambles, no explanations about what you're doing, no conversational transitions.
4. **NO INTRODUCTORY PHRASES:** Never use phrases like "Sure thing!", "Here's a...", "Let me...", "I'll...", "Here is...", "Based on...", or any variation.
5. **NO META-DESCRIPTIONS:** Never describe what you're doing. Do not use phrases like "The following text has been rewritten...", "Here is the rewritten version...", "The text below...", or any explanation of your actions. Just output the result directly.


### WEB CONTEXT (ONLY SOURCE OF INFORMATION):
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
                temperature=0.0,  # Zero temperature for maximum determinism
                top_p=0.1,  # Very low top_p to reduce randomness
                repeat_penalty=1.2  # Penalize repetition to keep responses focused
            )

            for chunk in stream:
                if chunk and "choices" in chunk:
                    yield chunk["choices"][0].get("text", "")
                await asyncio.sleep(0.01)

        except Exception as e:
            # Yielding the error as a string since headers are already sent
            yield f"\n\n[SYSTEM ERROR]: {str(e)}"

    return StreamingResponse(stream_generator(), media_type="text/plain")
