from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional
from .nodes import retrieve_node, generate_node, evaluate_node

class AgentState(TypedDict):
    question: str
    context: Optional[str]
    answer: Optional[str]
    is_valid: Optional[bool]

def create_agentic_tutor_graph():
    """Builds and compiles the LangGraph workflow."""
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("evaluate", evaluate_node)

    # Define edges
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", "evaluate")
    
    # Conditional logic
    def check_validity(state: AgentState):
        if state.get("is_valid"):
            return END
        return "generate"

    workflow.add_conditional_edges("evaluate", check_validity)

    return workflow.compile()

# Initialize the graph
tutor_graph = create_agentic_tutor_graph()

def run_agentic_query(question: str) -> str:
    """Executes the graph for a given question."""
    initial_state = {"question": question}
    final_state = tutor_graph.invoke(initial_state)
    return final_state.get("answer", "I could not generate an answer.")
