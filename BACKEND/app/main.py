from fastapi import FastAPI
from database import init_db
import router

# # Initialize the database
init_db()



# FastAPI app initialization
app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Data Analysis app is running successfully 🚀"}

# Include the router
app.include_router(router.router)
