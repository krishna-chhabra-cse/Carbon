from typing import TypedDict


class AgentState(TypedDict):
    repo_url: str
    folder_structure: str
    files_content: dict
    architecture_result: dict | None
    api_result: dict | None
    business_logic_result: dict | None
    security_result: dict | None
