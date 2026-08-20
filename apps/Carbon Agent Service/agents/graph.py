from langgraph.graph import StateGraph, START, END
from agents.state import AgentState

from agents.architecture_agent import run as run_architecture_agent
from agents.api_agent import run as run_api_agent
from agents.business_logic_agent import run as run_business_logic_agent
from agents.security_agent import security_agent_node

def architecture_node(state: AgentState):
    print("\n[GRAPH] Running Architecture Node...")
    result = run_architecture_agent(state["folder_structure"], state["files_content"])
    # Return partial state update
    return {"architecture_result": result}

def api_node(state: AgentState):
    print("\n[GRAPH] Running API Node...")
    result = run_api_agent(state["folder_structure"], state["files_content"])
    return {"api_result": result}

def security_node(state: AgentState):
    return security_agent_node(state)

def business_logic_node(state: AgentState):
    print("\n[GRAPH] Running Business Logic Node (Collaborative)...")
    # Pass in the results from the previous agents!
    result = run_business_logic_agent(
        folder_structure=state["folder_structure"],
        files_content=state["files_content"],
        architecture_info=state.get("architecture_result"),
        api_info=state.get("api_result")
    )
    return {"business_logic_result": result}

# 1. Initialize the graph with our State schema
workflow = StateGraph(AgentState)

# 2. Add our agent nodes
workflow.add_node("architecture", architecture_node)
workflow.add_node("api", api_node)
workflow.add_node("security", security_node)
workflow.add_node("business_logic", business_logic_node)

# 3. Define the edges (the flow)
# Architecture, API, and Security all start from START (run in parallel)
workflow.add_edge(START, "architecture")
workflow.add_edge(START, "api")
workflow.add_edge(START, "security")

# All feed into business_logic (LangGraph waits for all incoming edges)
workflow.add_edge("architecture", "business_logic")
workflow.add_edge("api", "business_logic")
workflow.add_edge("security", "business_logic")
workflow.add_edge("business_logic", END)

# 4. Compile it into an executable graph
agent_graph = workflow.compile()
