from fastapi import APIRouter, HTTPException,File,UploadFile
from pydantic import BaseModel
from database import SessionLocal
import shutil
import os
import json
from usfm_grammar import USFMParser,Filter
from db_models import Project, Book, Verse
import logging
import csv
import io
import csv
from fastapi.responses import StreamingResponse
import crud
# from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse



logging.basicConfig(level=logging.INFO)

router = APIRouter()


UPLOAD_DIR = "uploads/"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
OUTPUT_DIR = os.path.join(UPLOAD_DIR, "output")  

class ProjectRequest(BaseModel):
    language: str
    version: str
    revision: int


@router.post("/add_project/")
async def add_project(request: ProjectRequest):
    """ Add a new project and return the project ID """
    session = SessionLocal()

    # Check if the project already exists
    existing_project = session.query(Project).filter_by(
        language=request.language
    ).first()

    if existing_project:
        session.close()
        raise HTTPException(status_code=400, detail="Project already exists")

    # Insert new project
    new_project = Project(
        language=request.language,
        version=request.version,
        revision=request.revision
    )
    session.add(new_project)
    session.commit()
    session.refresh(new_project)
    project_id = new_project.project_id
    session.close()

    return {"message": "Project added successfully", "project_id": project_id}





@router.post("/upload_usfm/")
async def upload_usfm(
    project_id: int,
    usfm_sha: str,
    file: UploadFile = File(...)
):
    """ Upload a single USFM file, process it synchronously, and store data in DB """
    session = SessionLocal()

    try:
        # Check if project exists
        project = session.query(Project).filter_by(project_id=project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project ID not found")

        # Save USFM file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logging.info(f"Uploaded USFM file: {file.filename}")

        # Read USFM content
        with open(file_path, "r", encoding="utf8") as f:
            usfm_content = f.read()

        # Extract book name from USFM
        book_name = crud.extract_book_code(usfm_content)
        if not book_name:
            logging.error(f"Failed to extract book name from {file.filename}")
            raise HTTPException(status_code=400, detail="Failed to extract book name")

        logging.info(f"Processing USFM file for book: {book_name}")
        
        usj_text = None
        parsing_errors = []
        # Convert USFM to USJ
        try:
            my_parser = USFMParser(usfm_content)
            usj_data = my_parser.to_usj()
            usj_text = json.dumps(usj_data, ensure_ascii=False)
            parsing_errors = my_parser.errors
        except Exception as e:
            logging.error(f"USFM Parsing Failed: {str(e)}")
            parsing_errors.append(str(e))

        # Insert or update Book entry in DB with errors if present
        existing_book = session.query(Book).filter_by(book_name=book_name, project_id=project_id).first()

        if existing_book:
            existing_book.usfm = usfm_content
            existing_book.usj = usj_text if not parsing_errors else None
            existing_book.usfm_sha = usfm_sha
            existing_book.error_message = json.dumps(parsing_errors) if parsing_errors else None
            book_id = existing_book.book_id
        else:
            new_book = Book(
                book_name=book_name,
                project_id=project_id,
                usfm=usfm_content,
                usj=usj_text if not parsing_errors else None,
                usfm_sha=usfm_sha,
                error_message=json.dumps(parsing_errors) if parsing_errors else None
            )
            session.add(new_book)
            session.commit()
            session.refresh(new_book)
            book_id = new_book.book_id

        session.commit()

        # Raise an error if parsing failed, but still store data
        if parsing_errors:
            raise HTTPException(status_code=400, detail={"message": "USFM parsing failed", "errors": parsing_errors})

        # Convert USFM to CSV and insert verses
        logging.info(f"Parsing USFM to CSV for book: {book_name}")
        verse_data = crud.parse_usfm_to_csv(book_name, usfm_content, project_id)

        if verse_data:
            logging.info(f"Inserting verses into database for book: {book_name}")
            crud.insert_verses_into_db(book_name,project_id, verse_data, session)
        else:
            logging.warning(f"No verse data extracted for {book_name}")

        session.commit()
        logging.info(f"Processing completed for Project ID: {project_id}, Book: {book_name}")

        return JSONResponse(
            content={"message": "USFM file processed successfully", "project_id": project_id, "book_id": book_id},
            status_code=200
        )

    except HTTPException as e:
        session.rollback()
        raise e  # Propagate HTTPException to return API response

    except Exception as e:
        logging.error(f"Error processing USFM file: {str(e)}")
        session.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()




@router.get("/list_bibles/")
async def list_bibles():
    """ Retrieve all Bibles (projects) along with their books """
    session = SessionLocal()
    try:
        projects = session.query(Project).all()

        if not projects:
            raise HTTPException(status_code=404, detail="No Bibles found")

        bible_list = []
        for project in projects:
            books = session.query(Book).filter(Book.project_id == project.project_id).all()
            book_names = [book.book_name for book in books]  # Extract book names

            bible_list.append({
                "project_id": project.project_id,
                "language": project.language,
                "version": project.version,
                "revision": project.revision,
                "books": book_names
            })

        return {"bibles": bible_list}

    except Exception as e:
        logging.error(f"Error retrieving Bibles: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving Bibles")

    finally:
        session.close()


@router.get("/find_missing_verses/")
async def find_missing_verses(book_id: int, project_id: int):
    """Find missing verses for a given book_id and project_id by comparing with versification.json."""
    
    session = SessionLocal()

    try:
        # Load versification.json inside the function
        VERSIFICATION_FILE = "versification.json"

        try:
            with open(VERSIFICATION_FILE, "r", encoding="utf-8") as f:
                versification_data = json.load(f)
                max_verses = versification_data.get("maxVerses", {})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error loading versification.json: {e}")

        # Get book name from `books` table
        book = session.query(Book).filter(Book.book_id == book_id, Book.project_id == project_id).first()
        if not book:
            raise HTTPException(status_code=404, detail=f"Book ID {book_id} not found in project {project_id}")

        book_name = book.book_name.upper()  # Convert to uppercase to match versification.json
        if book_name not in max_verses:
            raise HTTPException(status_code=404, detail=f"Book '{book_name}' not found in versification.json")

        # Get all existing verses for this book
        existing_verses = session.query(Verse.chapter, Verse.verse).filter(Verse.book_id == book_id).all()  #[(1, "1"), (1, "2"), (2, "1"), (2, "3")]
        existing_verse_dict = {(c, v) for c, v in existing_verses}   #{(1, "1"), (1, "2"), (2, "1"), (2, "3")}


        missing_verses = []

        # Check for missing verses
        for chapter, max_verse in enumerate(max_verses[book_name], start=1):  # `enumerate` ensures correct chapter index
            for verse in range(1, int(max_verse) + 1):  # Loop through expected verses
                if (chapter, str(verse)) not in existing_verse_dict:  # Convert to string for comparison
                    missing_verses.append({"book": book_name, "chapter": chapter, "verse": verse})

        if not missing_verses:
            return {"message": f"No missing verses found for {book_name} in project {project_id}"}

        return {
            "message": "Missing verses found.",
            "book": book_name,
            "missing_count": len(missing_verses),
            "missing_verses": missing_verses
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        session.close()

@router.get("/book/chapters/")
async def get_book_chapters(book_id: int):
    """
    Get a list of unique chapters available in a book.
    """
    session = SessionLocal()
    
        # Fetch the book details
    book = session.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    try:
        # Get distinct chapter numbers from verses table
        chapters = (
            session.query(Verse.chapter)
            .filter(Verse.book_id == book_id)
            .distinct()
            .order_by(Verse.chapter)
            .all()
        )

        # Convert chapters to a list of integers
        chapter_list = [chapter[0] for chapter in chapters]

        return {
            "book_id": book_id,
            "book_name": book.book_name,
            "chapters": chapter_list
        }

    except Exception as e:
        logging.error(f"Error fetching chapters for book_id {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()








