import os
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT')
AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION')

llm = AzureChatOpenAI(
    azure_deployment=AZURE_OPENAI_DEPLOYMENT,
    openai_api_version=AZURE_OPENAI_API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=AZURE_OPENAI_API_KEY,
    temperature=1,
    request_timeout=45,
    max_retries=1
)

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def load_documents():
    documents = []
    doc_files = [('data/DOC2-customs-tariff-reference.md', 'Customs Tariff Reference')]
    for filename, doc_name in doc_files:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
            documents.append({'content': content, 'metadata': {'source': filename, 'document_name': doc_name}})
    return documents

from langchain_text_splitters import RecursiveCharacterTextSplitter

documents = load_documents()
text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
texts = []
for doc in documents:
    texts.extend(text_splitter.split_text(doc['content']))

vectorstore = Chroma.from_texts(texts=texts, embedding=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

question = "What is the HS code and import duty for mobile phones?"
docs = retriever.invoke(question)
context = "\n\n".join(doc.page_content for doc in docs)

rag_system_prompt = f"""You are the GlobalFreight Shipment Assistant. Answer ONLY from the context below.

RULES:
1. Answer ONLY from provided context
2. If the answer is not in the context, respond: "I can only answer questions about GlobalFreight policies, tariffs, and operational procedures."
3. Be precise and concise
4. Never hallucinate

Context:
{context}"""

from langchain_core.messages import SystemMessage, HumanMessage
messages = [
    SystemMessage(content=rag_system_prompt),
    HumanMessage(content=f"Question: {question}\n\nAnswer:")
]

print("Invoking LLM...")
response = llm.invoke(messages)
print(f"Response: {response.content}")
