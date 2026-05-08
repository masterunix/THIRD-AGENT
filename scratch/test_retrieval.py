import os
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT', 'https://ai-fortnight.cognitiveservices.azure.com/')
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-5-nano')
AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2024-12-01-preview')

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vectorstore = Chroma(
    collection_name="globalfreight_docs",
    embedding_function=embeddings,
    persist_directory="./chroma_db" # Check where it persists
)

# Wait, the backend.py doesn't specify a persist_directory, so it might be in-memory or default
# Let's check backend.py for where Chroma is initialized.

# 131:     vectorstore = Chroma.from_texts(
# 132:         texts=texts,
# 133:         embedding=embeddings,
# 134:         metadatas=metadatas,
# 135:         collection_name="globalfreight_docs"
# 136:     )

# It doesn't have persist_directory, so it's in-memory.
# I need to run a script that recreates it exactly like backend.py does.

def load_documents():
    documents = []
    doc_files = [
        ('data/DOC1-carrier-sla-agreement.md', 'Carrier SLA Agreement'),
        ('data/DOC2-customs-tariff-reference.md', 'Customs Tariff Reference'),
        ('data/DOC3-shipment-delay-policy.md', 'Shipment Delay Policy')
    ]
    for filename, doc_name in doc_files:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
                documents.append({'content': content, 'metadata': {'source': filename, 'document_name': doc_name}})
    return documents

from langchain_text_splitters import RecursiveCharacterTextSplitter

def create_vectorstore():
    documents = load_documents()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    texts = []
    metadatas = []
    for doc in documents:
        chunks = text_splitter.split_text(doc['content'])
        texts.extend(chunks)
        metadatas.extend([doc['metadata']] * len(chunks))
    
    vectorstore = Chroma.from_texts(texts=texts, embedding=embeddings, metadatas=metadatas, collection_name="test_collection")
    return vectorstore

vs = create_vectorstore()
retriever = vs.as_retriever(search_type="similarity", search_kwargs={"k": 3})

questions = [
    "A Gold customer's shipment is 15 hours late. What compensation applies and what must we do?",
    "HS code for mobile phones is?",
    "What is the HS code and import duty for mobile phones?"
]

for q in questions:
    print(f"\nQuestion: {q}")
    docs = retriever.invoke(q)
    print(f"Retrieved {len(docs)} documents:")
    for i, doc in enumerate(docs):
        print(f"--- Doc {i+1} ({doc.metadata['source']}) ---")
        print(doc.page_content)
