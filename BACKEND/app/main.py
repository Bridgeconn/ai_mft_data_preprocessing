from fastapi import FastAPI
from database import init_db
from fastapi.middleware.cors import CORSMiddleware
import router

# # Initialize the database
init_db()



# FastAPI app initialization
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router
app.include_router(router.router)

@app.get("/")
async def root():
    return {"message": "Data Analysis app is running successfully 🚀"}