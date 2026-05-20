import os
from typing import TypedDict, Annotated, Sequence
import operator
from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

# We use the ultra-cheap, ultra-fast 8B model for the "thinking" and "routing"
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.1-8b-instant", 
    temperature=0.4
)

# 1. Shared Memory
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    thought_log: str
    final_answer: str

# 2. The Conversing Agents
async def supervisor_agent(state: AgentState):
    question = state["messages"][-1].content
    prompt = f"You are the Routing Supervisor. Analyze this user query: '{question}'. Think out loud in 1-2 short sentences about whether this should be routed to the 'Vision Model', 'Math & Reasoning Model', or 'General Language Model'. Start with 'User wants to...'"
    
    response = await llm.ainvoke(prompt)
    return {"thought_log": response.content}

async def expert_agent(state: AgentState):
    question = state["messages"][-1].content
    supervisor_thought = state.get("thought_log", "")
    prompt = f"The Supervisor decided: '{supervisor_thought}'. Act as that chosen expert model. Think out loud in 1-2 short sentences about how you are processing the data for: '{question}'."
    
    response = await llm.ainvoke(prompt)
    return {"thought_log": response.content}

async def compiler_agent(state: AgentState):
    question = state["messages"][-1].content
    # In a real enterprise app, you would swap 'llm' here for your expensive 70B model to write the final perfect answer.
    prompt = f"You are the final compiler. Write a comprehensive, highly-detailed answer to this query: {question}"
    
    response = await llm.ainvoke(prompt)
    return {"final_answer": response.content}

# 3. Build the Routing Graph
workflow = StateGraph(AgentState)

workflow.add_node("supervisor", supervisor_agent)
workflow.add_node("expert", expert_agent)
workflow.add_node("compiler", compiler_agent)

workflow.set_entry_point("supervisor")
workflow.add_edge("supervisor", "expert")
workflow.add_edge("expert", "compiler")
workflow.add_edge("compiler", END)

tutor_graph = workflow.compile()