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
    project_name: str


@router.post("/add_project/")
async def add_project(request: ProjectRequest):
    """ Add a new project and return the project ID """
    session = SessionLocal()

    # Check if the project already exists
    existing_project = session.query(Project).filter_by(
        project_name=request.project_name
    ).first()

    if existing_project:
        session.close()
        raise HTTPException(status_code=400, detail="Project already exists")

    # Insert new project
    new_project = Project(
        project_name=request.project_name
    )
    session.add(new_project)
    session.commit()
    session.refresh(new_project)
    project_id = new_project.project_id
    session.close()

    return {"message": "Project added successfully", "project_id": project_id}



@router.get("/list_projects/")
async def list_projects():
   session=SessionLocal()
   projects=session.query(Project).all()
   session.close()
   return {"projects": projects}




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
        existing_book = session.query(Book).filter_by(book_name=book_name, project_id=project_id).first()
        if existing_book:
            logging.error(f"Book '{book_name}' already exists for Project ID {project_id}")
            raise HTTPException(status_code=400, detail=f"Book '{book_name}' already exists for this project")

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

        status = "success" if not parsing_errors else "failed"

        new_book = Book(
            book_name=book_name,
            project_id=project_id,
            usfm=usfm_content,
            usj=usj_text if not parsing_errors else None,
            usfm_sha=usfm_sha,
            # error_message=json.dumps(parsing_errors) if parsing_errors else None
            status=status
        )
        session.add(new_book)
        session.commit()
        session.refresh(new_book)
        book_id = new_book.book_id

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




@router.put("/update_usfm/")
async def update_usfm(
    project_id: int,
    usfm_sha: str,
    file: UploadFile = File(...)
):
    """ Update an existing USFM file, reprocess it, and update both book and verse tables properly. """
    session = SessionLocal()

    try:
        # Save the uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logging.info(f"Uploaded USFM file for update: {file.filename}")
        # Read USFM content
        with open(file_path, "r", encoding="utf8") as f:
            usfm_content = f.read()
        # Extract book name from USFM
        book_name = crud.extract_book_code(usfm_content)
        if not book_name:
            logging.error(f"Failed to extract book name from {file.filename}")
            raise HTTPException(status_code=400, detail="Failed to extract book name")
        logging.info(f"Updating USFM file for book: {book_name}")
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

        # Check if book entry exists in DB for the given project
        existing_book = session.query(Book).filter_by(book_name=book_name, project_id=project_id).first()
        if existing_book:
            #  Update the existing book record
            existing_book.usfm = usfm_content
            existing_book.usj = usj_text if not parsing_errors else None
            existing_book.usfm_sha = usfm_sha
            existing_book.status = "success" if not parsing_errors else json.dumps(parsing_errors)  # ✅ Store errors instead of "failed"
            book_id = existing_book.book_id
            logging.info(f"Updated existing book entry: {book_name} (Book ID: {book_id})")
        else:
            # If the book does not exist, raise an error instead of inserting
            logging.warning(f"Book {book_name} does not exist in project {project_id}. Update failed.")
            raise HTTPException(status_code=404, detail="Book not found for the given project ID")
        session.commit()

        # If parsing failed, raise an error but keep the book entry updated
        if parsing_errors:
            raise HTTPException(status_code=400, detail={"message": "USFM parsing failed", "errors": parsing_errors})

        #  Convert USFM to CSV and update verses
        logging.info(f"Re-parsing USFM to CSV for book: {book_name}")
        verse_data = crud.parse_usfm_to_csv(book_name, usfm_content, project_id)

        if verse_data:
            logging.info(f"Updating verses in database for book: {book_name}")
            crud.update_verses_in_db(book_name, project_id, book_id, verse_data, session)
        else:
            logging.warning(f"No verse data extracted for {book_name}")

        session.commit()
        logging.info(f"USFM update completed for Project ID: {project_id}, Book: {book_name}")

        return JSONResponse(
            content={"message": "USFM file updated successfully", "project_id": project_id, "book_id": book_id},
            status_code=200
        )
    except HTTPException as e:
        session.rollback()
        raise e  
    except Exception as e:
        logging.error(f"Error updating USFM file: {str(e)}")
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
                "project_name": project.project_name,
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



@router.get("/book/usfm/")
async def get_book_usfm(book_id: int):
    """
    Get the USFM content of a book from the database.
    """
    session = SessionLocal()
    try:
        # Fetch the book details
        book = session.query(Book).filter(Book.book_id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        return JSONResponse(
            content={
                "book_id": book_id,
                "book_name": book.book_name,
                "usfm_content": book.usfm
            },
            status_code=200
        )
    except HTTPException :
        raise
    except Exception as e:
        logging.error(f"Error fetching USFM for book_id {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()



@router.get("/book/csv/")
async def get_book_csv(book_id: int):
    """
    Get the book's content in CSV format.
    """
    session = SessionLocal()
    try:
        # Fetch book details
        book = session.query(Book).filter(Book.book_id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        # Fetch verses for the given book_id
        verses = (
            session.query(Verse.chapter, Verse.verse, Verse.text)
            .filter(Verse.book_id == book_id)
            .order_by(Verse.chapter, Verse.verse)
            .all()
        )
        if not verses:
            raise HTTPException(status_code=404, detail="No verses found for the book")
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        # Write CSV headers
        writer.writerow(["Book", "Chapter", "Verse", "Text"])
        # Write CSV rows
        for chapter, verse, text in verses:
            writer.writerow([book.book_name, chapter, verse, text])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]), 
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={book.book_name}.csv"}
        )

    except HTTPException :
        raise
    except Exception as e:
        logging.error(f"Error generating CSV for book_id {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()


@router.get("/chapter/csv/")
async def get_chapter_csv(book_id: int, chapter: int):
    """
    Get the chapter's content in CSV format.
    """
    session = SessionLocal()
    try:
        # Fetch book details
        book = session.query(Book).filter(Book.book_id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        # Fetch verses for the given book_id and chapter
        verses = (
            session.query(Verse.verse, Verse.text)
            .filter(Verse.book_id == book_id, Verse.chapter == chapter)
            .order_by(Verse.verse)
            .all()
        )

        if not verses:
            raise HTTPException(status_code=404, detail="No verses found for the chapter")
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        # Write CSV headers
        writer.writerow(["Book", "Chapter", "Verse", "Text"])

        # Write CSV rows
        for verse, text in verses:
            writer.writerow([book.book_name, chapter, verse, text])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={book.book_name}_Chapter_{chapter}.csv"}
        )
    except HTTPException :
        raise
    except Exception as e:
        logging.error(f"Error generating CSV for book_id {book_id}, chapter {chapter}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()






@router.get("/book/chapters/")
async def get_book_chapters(book_id: int):
    """
    Get the list of chapters available in a book.
    """
    session = SessionLocal()
    try:
        # Fetch book details
        book = session.query(Book).filter(Book.book_id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        # Fetch distinct chapters for the book
        chapters = (
            session.query(Verse.chapter)
            .filter(Verse.book_id == book_id)
            .distinct()
            .order_by(Verse.chapter)
            .all()
        )
        # Convert to a simple list
        chapter_list = [chapter[0] for chapter in chapters]

        if not chapter_list:
            raise HTTPException(status_code=404, detail="No chapters found for the book")

        return {
            "book_id": book_id,
            "book_name": book.book_name,
            "chapters": chapter_list
        }
    except HTTPException :
        raise

    except Exception as e:
        logging.error(f"Error fetching chapters for book_id {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()




