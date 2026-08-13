from typing import TypedDict, Optional

class AgentState(TypedDict):
    repo_url: str
    folder_structure: str
    files_content: dict
    architecture_result: Optional[dict]
    api_result: Optional[dict]
    business_logic_result: Optional[dict]
