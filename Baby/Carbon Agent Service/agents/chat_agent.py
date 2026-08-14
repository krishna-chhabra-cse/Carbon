import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def run(folder_structure: str, files_content: dict, query: str) -> str:
    """
    The Chat Agent.
    Answers a specific user query based on the codebase context.
    """
    print(f"\n[CHAT AGENT] Answering query: '{query}'")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file!")

    client = genai.Client(api_key=api_key)
    MODEL = "gemini-3.1-flash-lite"  # Using the same reliable model as other agents

    # Format files
    files_text = ""
    for filepath, content in list(files_content.items())[:30]:
        files_text += f"\n\n--- FILE: {filepath} ---\n"
        files_text += content[:4000]

    prompt = f"""
You are an expert AI software engineering assistant.
The user has provided their codebase. Your job is to answer their specific question about it.

Here is the folder structure:
{folder_structure}

Here are the key source files:
{files_text}

USER QUESTION:
{query}

INSTRUCTIONS:
- Answer the user's question directly and concisely.
- Cite specific file names and line numbers if possible.
- Provide code snippets in markdown if relevant.
- Do NOT make things up. If the codebase does not contain the answer, say so.
- Format your entire response in clear, well-structured GitHub-flavored Markdown.
"""

    from tools.llm_client import generate_with_retry
    return generate_with_retry(prompt)
