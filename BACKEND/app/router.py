import itertools
from fastapi import APIRouter, HTTPException,File,UploadFile,Query
from fastapi import Body
from pydantic import BaseModel
from database import SessionLocal
import json
from usfm_grammar import USFMParser,Filter
from db_models import Project, Book, Verse
import logging
import csv
import io
import csv
from fastapi.responses import StreamingResponse
import crud
from fastapi.responses import JSONResponse
import base64



logging.basicConfig(level=logging.INFO)

router = APIRouter()


 

class ProjectRequest(BaseModel):
    project_name: str


class USFMUploadRequest(BaseModel):
    project_name: str
    usfm_sha: str
    encoded_usfm: str


@router.post("/add_project/")
async def add_project(request: ProjectRequest):
    """ Add a new project and return the project ID """
    session = SessionLocal()
    project_name = request.project_name.strip()

    # Validate project name (Ensure it's not empty after trimming)
    if not project_name:
        session.close()
        raise HTTPException(status_code=400, detail="Project name cannot be empty")

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
async def list_projects(project_name: str = Query(None)):
    """
    List all projects or fetch a specific project by project_name.
    If project_name is provided, returns the matching project or null if not found.
    """
    session = SessionLocal()
    try:
        if project_name:
            project = session.query(Project).filter(Project.project_name == project_name).first()
            return {"project": project if project else None}

        projects = session.query(Project).all()
        return {"projects": projects}

    except Exception as e:
        logging.error(f"Error fetching projects: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()





@router.post("/upload_usfm/")
async def upload_usfm(
    request: USFMUploadRequest
):
    """ 
    Upload a USFM content as a string, process it, and store data in DB.
    No file is saved to disk; everything is handled in-memory.
    """
    session = SessionLocal()

    try:
        # Get project_id from project_name
        project_name = request.project_name
        usfm_sha = request.usfm_sha
        encoded_usfm = request.encoded_usfm
        project = session.query(Project).filter_by(project_name=project_name).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project name not found")
        
        project_id = project.project_id
        logging.info(f"Processing USFM file for project: {project_name} (Project ID: {project_id})")

        try:
            usfm_bytes = base64.b64decode(encoded_usfm)
            usfm = usfm_bytes.decode("utf-8")  # Decode from bytes to string
            usfm=crud.normalize_text(usfm)
        except Exception as e:
            logging.error(f"Failed to decode USFM content: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid encoded USFM content")


        # Extract book name from USFM
        book_name = crud.extract_book_code(usfm)
        if not book_name:
            logging.error(f"Failed to extract book name ")
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
            my_parser = USFMParser(usfm)
            usj_data = my_parser.to_usj()
            usj_text = json.dumps(usj_data, ensure_ascii=False)
            parsing_errors = my_parser.errors
        except Exception as e:
            logging.error(f"USFM Parsing Failed: {str(e)}")
            parsing_errors.append(str(e))

        status ="success" if not parsing_errors else json.dumps(parsing_errors)

        new_book = Book(
            book_name=book_name,
            project_id=project_id,
            usfm=usfm,
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
        verse_data = crud.parse_usfm_to_csv(book_name, usfm, project_id)

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
    request: USFMUploadRequest
):
    """ Update an existing USFM file, reprocess it, and update both book and verse tables properly. """
    session = SessionLocal()

    try:
        # Extract values from request body
        project_name = request.project_name
        usfm_sha = request.usfm_sha
        encoded_usfm = request.encoded_usfm
        # Extract book name from USFM
        project = session.query(Project).filter(Project.project_name == project_name).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        project_id = project.project_id

        logging.info(f"Updating USFM file for project: {project_name} (Project ID: {project_id})")
        try:
            usfm_bytes = base64.b64decode(encoded_usfm)
            usfm = usfm_bytes.decode("utf-8")  # Convert bytes to string
        except Exception as e:
            logging.error(f"Failed to decode USFM content: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid encoded USFM content")

        book_name = crud.extract_book_code(usfm)
        if not book_name:
            logging.error(f"Failed to extract book name ")
            raise HTTPException(status_code=400, detail="Failed to extract book name")
        logging.info(f"Updating USFM file for book: {book_name}")
        usj_text = None
        parsing_errors = []
        # Convert USFM to USJ
        try:
            my_parser = USFMParser(usfm)
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
            existing_book.usfm = usfm
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
        verse_data = crud.parse_usfm_to_csv(book_name, usfm, project_id)

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






@router.get("/list_books/")
async def list_books(project_name: str = Query(None)):
    """ Retrieve all Bibles (projects) along with their books and their status, optionally filtering by project name """
    session = SessionLocal()
    try:
        query = session.query(Project)
        
        if project_name:
            query = query.filter(Project.project_name == project_name)

        projects = query.all()

        if not projects:
            raise HTTPException(status_code=404, detail="No Bibles found")

        bible_list = []
        for project in projects:
            books = session.query(Book).filter(Book.project_id == project.project_id).all()
            book_data = [{"book_id": book.book_id, "book_name": book.book_name, "status": book.status , "usfm_sha": book.usfm_sha} for book in books] 

            bible_list.append({
                "project_id": project.project_id,
                "project_name": project.project_name,
               
                "books": book_data  # List of books with their status
            })

        return {"bibles": bible_list}
    except HTTPException :
        raise
    except Exception as e:
        logging.error(f"Error retrieving Bibles: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving Bibles")

    finally:
        session.close()



@router.get("/find_missing_verses/")
# async def find_missing_verses(book_id: int, project_id: int):
async def merged_verses(book_name: str, project_name: str):
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
        # Get project_id from project_name
        project = session.query(Project).filter(Project.project_name == project_name).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")
        project_id = project.project_id
        # Get book name from `books` table
        book = session.query(Book).filter(Book.book_name == book_name, Book.project_id == project_id).first()
        book_id = book.book_id
        if not book:
            raise HTTPException(status_code=404, detail=f"Book ID {book_id} not found in project {project_id}")

        book_name = book.book_name.upper()  # Convert to uppercase to match versification.json
        if book_name not in max_verses:
            raise HTTPException(status_code=404, detail=f"Book '{book_name}' not found in versification.json")

        # Get all existing verses for this book
        existing_verses = session.query(Verse.chapter, Verse.verse).filter(Verse.book_id == book_id).all()  #[(1, "1"), (1, "2"), (2, "1"), (2, "3")]
        # Convert to dict by chapter
        existing_verse_dict = {}
        for chapter, verse in existing_verses:
            # if verse has - split and and take both numbers else append as is
            if "-" in verse:
                start_verse, end_verse = verse.split("-")
                # just start_verse and end_verse are there can this be simplified
                existing_verse_dict.setdefault(chapter, []).append(int(start_verse))
                existing_verse_dict.setdefault(chapter, []).append(int(end_verse))
            else:
                existing_verse_dict.setdefault(chapter, []).append(int(verse))
            
        print("Existing verses:", existing_verse_dict)

        missing_verses = []

        # Check for missing verses
        for chapter, max_verse in enumerate(max_verses[book_name], start=1):  # `enumerate` ensures correct chapter index
            for verse in range(1, int(max_verse) + 1):  # Loop through expected verses
                if verse not in existing_verse_dict.get(chapter, []):
                    missing_verses.append({"chapter": chapter, "verse": verse})

        if not missing_verses:
            return {"message": f"No missing verses found for {book_name} in project {project_id}"}

        return {
            "message": "Missing verses found.",
            "project": project_id,
            "project_name": project_name,
            "book": book_name,
            "book_id": book_id,           
            "missing_count": len(missing_verses),
            "missing_verses": missing_verses
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        session.close()



@router.get("/book/usfm/")
# async def get_book_usfm(book_id: int):
async def get_book_usfm(project_name: str, book_name: str):
    """
    Get the USFM content of a book from the database.
    """
    session = SessionLocal()
    try:
        project = session.query(Project).filter(Project.project_name == project_name).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Fetch the book details
        book = session.query(Book).filter(Book.project_id == project.project_id, Book.book_name == book_name).first()
        book_id = book.book_id
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        return JSONResponse(
            content={
                "project_name": project_name,
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



@router.get("/book/json/")
# async def get_book_json(book_id: int):
async def get_book_json(project_name: str, book_name: str):
    """
    Get the book's content in JSON format.
    """
    session = SessionLocal()
    try:
        project = session.query(Project).filter(Project.project_name == project_name).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Fetch book details
        book = session.query(Book).filter(Book.project_id == project.project_id, Book.book_name == book_name).first()
        book_id = book.book_id
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
        # Sort by chapter first, then by parsed verse number
        sorted_verses = sorted(verses, key=lambda v: (int(v.chapter), crud.parse_verse_number(v.verse)))

        book_data = []
        # convert to a list of dictionaries sort into sub list by chapter
        for chapter, verses in itertools.groupby(sorted_verses, key=lambda v: v.chapter):
            book_data.append({"chapter": chapter, "verses": [{"verse": v.verse, "text": v.text} for v in verses]})

        return JSONResponse(
            content={
                "project_name": project_name,
                "book_id": book_id,
                "book_name": book.book_name,
                "chapters": book_data
            },
            status_code=200
        )
    except HTTPException :
        raise
    except Exception as e:
        logging.error(f"Error generating JSON for book_id {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()


@router.get("/chapter/json/")
# async def get_chapter_json(book_id: int, chapter: int):
async def get_chapter_json(project_name: str, book_name: str, chapter: int):
    """
    Get the chapter's content in JSON format.
    """
    session = SessionLocal()
    try:
        # Fetch project
        project = session.query(Project).filter(Project.project_name == project_name).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Fetch book details
        book = session.query(Book).filter(Book.project_id == project.project_id, Book.book_name == book_name).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        book_id = book.book_id
        # Fetch verses for the given book_id and chapter
        verses = (
            session.query(Verse.verse, Verse.text)
            .filter(Verse.book_id == book_id, Verse.chapter == chapter)
            .order_by(Verse.verse)
            .all()
        )

        if not verses:
            raise HTTPException(status_code=404, detail="No verses found for the chapter")
        sorted_verses = sorted(verses, key=lambda v: crud.parse_verse_number(v.verse))

        # return sorted_verses list as json array
        
        data = [crud.verses_to_dict(row[0],row[1]) for row in sorted_verses]
        return JSONResponse(
            content={
                "project_name": project_name,
                "book_id": book_id,
                "book": book.book_name,
                "chapter": chapter,
                "verses": data
            },
            status_code=200
        )
        
        
    except HTTPException :
        raise
    except Exception as e:
        logging.error(f"Error generating JSON for book_id {book_id}, chapter {chapter}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()



@router.get("/book/chapters/")
# async def get_book_chapters(book_id: int):
async def get_book_chapters(project_name: str, book_name: str):
    """
    Get the list of chapters available in a book.
    """
    session = SessionLocal()
    try:
        project = session.query(Project).filter(Project.project_name == project_name).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Fetch book details
        book = session.query(Book).filter(Book.project_id == project.project_id, Book.book_name == book_name).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        book_id = book.book_id
        # Fetch distinct chapters for the book
        chapters = (
            session.query(Verse.chapter.distinct())
            .filter(Verse.book_id == book_id)
            .order_by(Verse.chapter)
            .all()
        )
        chapter_list = [chapter[0] for chapter in chapters]
        if not chapter_list:
            raise HTTPException(status_code=404, detail="No chapters found for the book")

        return {
            "project_name": project_name,
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




# @router.get("/parallel_corpora/withbcv/csv/")
# async def get_parallel_corpora_csv(project_name_1: str, project_name_2: str,
#                                    response_type: str = Query("csv", description="Set 'json' for JSON response, 'csv' for file download")):
#     """
#     Generate and return the parallel corpus between two projects (two languages) in CSV or JSON format.
#     - Retains existing merged verses if both projects have them.
#     - Merges split verses only if the other project has them merged.
#     - Skips missing verses.
#     - Response type controlled by query parameter.
#     """
#     session = SessionLocal()
#     try:
#         # Fetch project IDs from project names
#         project_1 = session.query(Project).filter(Project.project_name == project_name_1).first()
#         project_2 = session.query(Project).filter(Project.project_name == project_name_2).first()

#         if not project_1:
#             raise HTTPException(status_code=404, detail=f"Project '{project_name_1}' not found")
#         if not project_2:
#             raise HTTPException(status_code=404, detail=f"Project '{project_name_2}' not found")
#         project_id_1 = project_1.project_id
#         project_id_2 = project_2.project_id
#         # Fetch books for both projects
#         books_1 = session.query(Book).filter(Book.project_id == project_id_1).all()
#         books_2 = session.query(Book).filter(Book.project_id == project_id_2).all()

#         # Convert books_2 to a dictionary {book_name: book_id}
#         books_2_dict = {book.book_name: book.book_id for book in books_2}

#         # Find common books by name
#         common_books = [book for book in books_1 if book.book_name in books_2_dict]
#         print("Common books:", common_books)

#         # 🔹 Raise error if no common books are found
#         if not common_books:
#             raise HTTPException(status_code=404, detail="No common books found between the two projects")
#         parallel_corpora = []
#         for book in common_books:
#             book_name = book.book_name
#             book_id_1 = book.book_id
#             book_id_2 = books_2_dict[book_name]

#             # Fetch verses for both projects
#             verses_1 = (
#                 session.query(Verse.chapter, Verse.verse, Verse.text)
#                 .filter(Verse.book_id == book_id_1)
#                 .order_by(Verse.chapter, Verse.verse)
#                 .all()
#             )
#             verses_2 = (
#                 session.query(Verse.chapter, Verse.verse, Verse.text)
#                 .filter(Verse.book_id == book_id_2)
#                 .order_by(Verse.chapter, Verse.verse)
#                 .all()
#             )
#             # # Convert verses into dictionaries for fast lookup
#             # verses_1_dict = {(c, v): t for c, v, t in verses_1}
#             # verses_2_dict = {(c, v): t for c, v, t in verses_2}
#             verses_1_dict = {}
#             verses_2_dict = {}
#             # Store merged verses as they are
#             merged_verses_1 = {}
#             merged_verses_2 = {}

#             for chapter, verse, text in verses_1:
#                 if "-" in verse:  
#                     merged_verses_1[(chapter, verse)] = text
#                 else:
#                     verses_1_dict[(chapter, verse)] = text

#             for chapter, verse, text in verses_2:
#                 if "-" in verse:  
#                     merged_verses_2[(chapter, verse)] = text
#                 else:
#                     verses_2_dict[(chapter, verse)] = text

#             # Align split verses only when necessary
#             final_verses_1 = verses_1_dict.copy()
#             final_verses_2 = verses_2_dict.copy()
            
#             # Preserve existing merged verses if both projects have them
#             for (chapter, merged_verse), merged_text in merged_verses_1.items():
#                 if (chapter, merged_verse) in merged_verses_2:
#                     # Both projects have the same merged verse, retain them
#                     final_verses_1[(chapter, merged_verse)] = merged_text
#                     final_verses_2[(chapter, merged_verse)] = merged_verses_2[merged_verse]
#                 else:
#                     # Merge split verses from Project 2
#                     split_verses = [str(v) for v in range(int(merged_verse.split("-")[0]), int(merged_verse.split("-")[1]) + 1)]
#                     merged_text_2 = " ".join([verses_2_dict.get((chapter, v), "") for v in split_verses]).strip()
#                     final_verses_1[(chapter, merged_verse)] = merged_text
#                     final_verses_2[(chapter, merged_verse)] = merged_text_2 if merged_text_2 else None

#             for (chapter, merged_verse), merged_text in merged_verses_2.items():
#                 if (chapter, merged_verse) in merged_verses_1:
#                     continue  # Already handled
#                 # Merge split verses from Project 1
#                 split_verses = [str(v) for v in range(int(merged_verse.split("-")[0]), int(merged_verse.split("-")[1]) + 1)]
#                 merged_text_1 = " ".join([verses_1_dict.get((chapter, v), "") for v in split_verses]).strip()
#                 final_verses_2[(chapter, merged_verse)] = merged_text
#                 final_verses_1[(chapter, merged_verse)] = merged_text_1 if merged_text_1 else None

#             # Get all unique chapter-verse pairs
#             # Get all unique chapter-verse pairs and sort them
#             all_keys = sorted(
#                 set(final_verses_1.keys()) | set(final_verses_2.keys()),
#                 key=lambda x: (int(x[0]), int(x[1].split("-")[0]) if "-" in x[1] else int(x[1]))
#             )

#             for chapter, verse in all_keys:
#                 text_1 = final_verses_1.get((chapter, verse))
#                 text_2 = final_verses_2.get((chapter, verse))

#                 # Skip missing verses
#                 if text_1 is None or text_2 is None:
#                     continue


#                 parallel_corpora.append({
#                     "book": book_name,
#                     "chapter": chapter,
#                     "verse": verse,
#                     "text_1": text_1,
#                     "text_2": text_2
#                 })
#                 # parallel_corpora.append([book_name, chapter, verse, text_1, text_2])

#         # 🔹 Ensure there's parallel corpus data, else raise an error
#         if not parallel_corpora:
#             raise HTTPException(status_code=404, detail="No parallel corpus data found")
#         # Return JSON response if requested
#         if response_type.lower() == "json":
#             return JSONResponse(
#                 content={"parallel_corpora": parallel_corpora},
#                 status_code=200
#             )

#         # Create CSV in memory
#         output = io.StringIO()
#         writer = csv.writer(output)
#         # Write CSV headers
#         writer.writerow(["Book", "Chapter", "Verse", "Text_1", "Text_2"])
#         for row in parallel_corpora:
#             writer.writerow([row["book"], row["chapter"], row["verse"], row["text_1"], row["text_2"]])

#         # Write CSV rows
#         # writer.writerows(parallel_corpora)
#         output.seek(0)
#         return StreamingResponse(
#             iter([output.getvalue()]),
#             media_type="text/csv",
#             headers={
#                 "Content-Disposition": 'attachment; filename="Parallel_corpus_withbcv.csv"',
#                 "Content-Type": "application/octet-stream",  # Forces download
#             }
#         )

#     except HTTPException as e:
#         session.rollback()
#         raise e  # Return HTTP exception with message
#     except Exception as e:
#         logging.error(f"Error generating parallel corpora: {str(e)}")
#         session.rollback()
#         raise HTTPException(status_code=500, detail="Internal server error")

#     finally:
#         session.close()

@router.get("/parallel_corpora/withbcv/csv/")
async def get_parallel_corpora_csv(
    project_name_1: str, 
    project_name_2: str, 
    response_type: str = Query("csv", description="Set 'json' for JSON response, 'csv' for file download")
):
    """
    Generate and return the parallel corpus between two projects (two languages) in CSV or JSON format.
    - Retains existing merged verses if both projects have them.
    - Merges split verses only if the other project has them merged.
    - Skips missing verses.
    - Response type controlled by query parameter.
    """
    session = SessionLocal()
    try:
        # Fetch project IDs from project names
        project_1 = session.query(Project).filter(Project.project_name == project_name_1).first()
        project_2 = session.query(Project).filter(Project.project_name == project_name_2).first()

        if not project_1:
            raise HTTPException(status_code=404, detail=f"Project '{project_name_1}' not found")
        if not project_2:
            raise HTTPException(status_code=404, detail=f"Project '{project_name_2}' not found")

        project_id_1 = project_1.project_id
        project_id_2 = project_2.project_id

        # Fetch books for both projects
        books_1 = session.query(Book).filter(Book.project_id == project_id_1).all()
        books_2 = session.query(Book).filter(Book.project_id == project_id_2).all()

        books_2_dict = {book.book_name: book.book_id for book in books_2}
        common_books = [book for book in books_1 if book.book_name in books_2_dict]

        if not common_books:
            raise HTTPException(status_code=404, detail="No common books found between the two projects")

        parallel_corpora = []

        for book in common_books:
            book_name = book.book_name
            book_id_1 = book.book_id
            book_id_2 = books_2_dict[book_name]

            # Fetch verses for both projects
            verses_1 = session.query(Verse.chapter, Verse.verse, Verse.text).filter(Verse.book_id == book_id_1).all()
            verses_2 = session.query(Verse.chapter, Verse.verse, Verse.text).filter(Verse.book_id == book_id_2).all()

            # Convert verses into dictionaries for easy lookup
            verses_1_dict = {}
            verses_2_dict = {}

            # Store merged verses as they are
            merged_verses_1 = {}
            merged_verses_2 = {}

            for chapter, verse, text in verses_1:
                if "-" in verse:  
                    merged_verses_1[(chapter, verse)] = text
                else:
                    verses_1_dict[(chapter, verse)] = text

            for chapter, verse, text in verses_2:
                if "-" in verse:  
                    merged_verses_2[(chapter, verse)] = text
                else:
                    verses_2_dict[(chapter, verse)] = text

            # Align split verses only when necessary
            final_verses_1 = verses_1_dict.copy()
            final_verses_2 = verses_2_dict.copy()

            # Preserve existing merged verses if both projects have them
            for (chapter, merged_verse), merged_text in merged_verses_1.items():
                if (chapter, merged_verse) in merged_verses_2:
                    # Both projects have the same merged verse, retain them
                    final_verses_1[(chapter, merged_verse)] = merged_text
                    final_verses_2[(chapter, merged_verse)] = merged_verses_2[(chapter, merged_verse)]
                else:
                    # Merge split verses from Project 2
                    split_verses = [str(v) for v in range(int(merged_verse.split("-")[0]), int(merged_verse.split("-")[1]) + 1)]
                    merged_text_2 = " ".join([verses_2_dict.get((chapter, v), "") for v in split_verses]).strip()
                    final_verses_1[(chapter, merged_verse)] = merged_text
                    final_verses_2[(chapter, merged_verse)] = merged_text_2 if merged_text_2 else None

            for (chapter, merged_verse), merged_text in merged_verses_2.items():
                if (chapter, merged_verse) in merged_verses_1:
                    continue  # Already handled
                # Merge split verses from Project 1
                split_verses = [str(v) for v in range(int(merged_verse.split("-")[0]), int(merged_verse.split("-")[1]) + 1)]
                merged_text_1 = " ".join([verses_1_dict.get((chapter, v), "") for v in split_verses]).strip()
                final_verses_2[(chapter, merged_verse)] = merged_text
                final_verses_1[(chapter, merged_verse)] = merged_text_1 if merged_text_1 else None

            # Get all unique chapter-verse pairs and sort them
            all_keys = sorted(
                set(final_verses_1.keys()) | set(final_verses_2.keys()),
                key=lambda x: (int(x[0]), int(x[1].split("-")[0]) if "-" in x[1] else int(x[1]))
            )

            for chapter, verse in all_keys:
                text_1 = final_verses_1.get((chapter, verse))
                text_2 = final_verses_2.get((chapter, verse))

                # Skip missing verses
                if text_1 is None or text_2 is None:
                    continue

                parallel_corpora.append({
                    "book": book_name,
                    "chapter": chapter,
                    "verse": verse,
                    "text_1": text_1,
                    "text_2": text_2
                })

        if not parallel_corpora:
            raise HTTPException(status_code=404, detail="No parallel corpus data found")

        # Return JSON response if requested
        if response_type.lower() == "json":
            return JSONResponse(
                content={"parallel_corpora": parallel_corpora},
                status_code=200
            )

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Book", "Chapter", "Verse", "Text_1", "Text_2"])
        for row in parallel_corpora:
            writer.writerow([row["book"], row["chapter"], row["verse"], row["text_1"], row["text_2"]])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="Parallel_corpus_withbcv.csv"',
                "Content-Type": "application/octet-stream",  # Forces download
            }
        )

    except HTTPException as e:
        session.rollback()
        raise e  # Return HTTP exception with message

    except Exception as e:
        logging.error(f"Error generating parallel corpora: {str(e)}")
        session.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()


@router.get("/parallel_corpora/withoutbcv/csv/")
async def get_parallel_corpora_texts_csv(project_name_1: str, project_name_2: str,
                                         response_type: str = Query("csv", description="Set 'json' for JSON response, 'csv' for file download")):
    """
    Generate and return the parallel corpus between two projects in CSV format with only Text_1 and Text_2.
    """
    session = SessionLocal()
    try:
        # Fetch project IDs from project names
        project_1 = session.query(Project).filter(Project.project_name == project_name_1).first()
        project_2 = session.query(Project).filter(Project.project_name == project_name_2).first()

        if not project_1:
            raise HTTPException(status_code=404, detail=f"Project '{project_name_1}' not found")
        if not project_2:
            raise HTTPException(status_code=404, detail=f"Project '{project_name_2}' not found")
        project_id_1 = project_1.project_id
        project_id_2 = project_2.project_id

        # Fetch books for both projects
        books_1 = session.query(Book).filter(Book.project_id == project_id_1).all()
        books_2 = session.query(Book).filter(Book.project_id == project_id_2).all()

        books_2_dict = {book.book_name: book.book_id for book in books_2}
        common_books = [book for book in books_1 if book.book_name in books_2_dict]

        if not common_books:
            raise HTTPException(status_code=404, detail="No common books found between the two projects")

        parallel_corpora = []

        for book in common_books:
            book_id_1 = book.book_id
            book_id_2 = books_2_dict[book.book_name]

            # Fetch verses for both projects
            verses_1 = session.query(Verse.chapter, Verse.verse, Verse.text).filter(Verse.book_id == book_id_1).all()

            verses_2 = session.query(Verse.chapter, Verse.verse, Verse.text).filter(Verse.book_id == book_id_2).all()

            # Convert verses into dictionaries for easy lookup
            verses_1_dict = {}
            verses_2_dict = {}

            merged_verses_1 = {}
            merged_verses_2 = {}

            for chapter, verse, text in verses_1:
                if "-" in verse:
                    merged_verses_1[(chapter, verse)] = text
                else:
                    verses_1_dict[(chapter, verse)] = text

            for chapter, verse, text in verses_2:
                if "-" in verse:
                    merged_verses_2[(chapter, verse)] = text
                else:
                    verses_2_dict[(chapter, verse)] = text

            final_verses_1 = verses_1_dict.copy()
            final_verses_2 = verses_2_dict.copy()

            # Preserve existing merged verses if both projects have them
            for (chapter, merged_verse), merged_text in merged_verses_1.items():
                if (chapter, merged_verse) in merged_verses_2:
                    final_verses_1[(chapter, merged_verse)] = merged_text
                    final_verses_2[(chapter, merged_verse)] = merged_verses_2[(chapter, merged_verse)]
                else:
                    split_verses = [str(v) for v in range(int(merged_verse.split("-")[0]), int(merged_verse.split("-")[1]) + 1)]
                    merged_text_2 = " ".join([verses_2_dict.get((chapter, v), "") for v in split_verses]).strip()
                    final_verses_1[(chapter, merged_verse)] = merged_text
                    final_verses_2[(chapter, merged_verse)] = merged_text_2 if merged_text_2 else None

            for (chapter, merged_verse), merged_text in merged_verses_2.items():
                if (chapter, merged_verse) in merged_verses_1:
                    continue  
                split_verses = [str(v) for v in range(int(merged_verse.split("-")[0]), int(merged_verse.split("-")[1]) + 1)]
                merged_text_1 = " ".join([verses_1_dict.get((chapter, v), "") for v in split_verses]).strip()
                final_verses_2[(chapter, merged_verse)] = merged_text
                final_verses_1[(chapter, merged_verse)] = merged_text_1 if merged_text_1 else None

            # Get all unique chapter-verse pairs and sort them
            all_keys = sorted(
                set(final_verses_1.keys()) | set(final_verses_2.keys()),
                key=lambda x: (int(x[0]), int(x[1].split("-")[0]) if "-" in x[1] else int(x[1]))
            )

            for chapter, verse in all_keys:
                text_1 = final_verses_1.get((chapter, verse))
                text_2 = final_verses_2.get((chapter, verse))

                if text_1 is None or text_2 is None:
                    continue

                parallel_corpora.append({
                    "text_1": text_1,
                    "text_2": text_2
                })

        if not parallel_corpora :
            raise HTTPException(status_code=404, detail="No parallel corpus data found")
        
        # Return JSON response if requested
        if response_type.lower() == "json":
            return JSONResponse(
                content={"parallel_corpora": parallel_corpora},
                status_code=200
            )

        output = io.StringIO()
        writer = csv.writer(output)

        # Write CSV headers
        writer.writerow(["Text_1", "Text_2"])
        for row in parallel_corpora:
            writer.writerow([row["text_1"], row["text_2"]])
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="Parallel_corpus_Texts.csv"',
                "Content-Type": "application/octet-stream",  # Forces download
            }
        )

    except HTTPException as e:
        session.rollback()
        raise e

    except Exception as e:
        logging.error(f"Error generating parallel corpora: {str(e)}")
        session.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

    finally:
        session.close()
