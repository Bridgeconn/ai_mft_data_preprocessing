from http.client import HTTPException
import sys
from usfm_grammar import USFMParser,Filter
from db_models import Project, Book, Verse
import logging
import hashlib
import unicodedata
from sacremoses import MosesPunctNormalizer
import re
import typing as tp


 

# Initialize Moses Punctuation Normalizer
mpn = MosesPunctNormalizer(lang="en")
mpn.substitutions = [(re.compile(r), sub) for r, sub in mpn.substitutions]


def get_non_printing_char_replacer(replace_by: str = " ") -> tp.Callable[[str], str]:
    """Function to replace non-printable characters"""
    non_printable_map = {
        ord(c): replace_by
        for c in (chr(i) for i in range(sys.maxunicode + 1))
        if unicodedata.category(c) in {"C", "Cc", "Cf", "Cs", "Co", "Cn"}
    }
    def replace_non_printing_char(line) -> str:
        return line.translate(non_printable_map)
    return replace_non_printing_char
replace_nonprint = get_non_printing_char_replacer(" ")



def normalize_text(text: str) -> str:
    """Post-processing function for CSV data"""
    if not isinstance(text, str):
        return text
    clean = mpn.normalize(text)  # Normalize punctuation
    clean = replace_nonprint(clean)  # Remove non-printable characters
    clean = unicodedata.normalize("NFKC", clean)  # Normalize Unicode characters
    return clean

def parse_usfm_to_csv(book_name, usfm_content, project_id):
    """ Convert USFM content to CSV format and return extracted data """
    try:
        my_parser = USFMParser(usfm_content)  # Initialize parser
        output = my_parser.to_list(include_markers=Filter.BCV + Filter.TEXT)  # Extract BCV and Text      
        processed_output = [
            [re.sub(r"\s+", " ", value).strip() if isinstance(value, str) else value for value in row]
            for row in output
        ]            
        if not processed_output:
            logging.error(f"No data extracted for {book_name}!")
        else:
            logging.info(f"Extracted {len(processed_output)} verses for {book_name}")

        return processed_output  #  Ensure we return the extracted verse data
    except Exception as e:
        logging.error(f"Error processing USFM content for {book_name}: {str(e)}")
        return None


def extract_book_code(usfm_content):
    """ Extract the book code from the USFM content using \id marker """
    for line in usfm_content.split("\n"):
        if line.startswith("\\id "): 
            return line.split()[1].strip()
    return None 

def compute_sha256(content):
    """ Compute SHA256 hash of the given content """
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def insert_verses_into_db(book_name,project_id, verse_data, session):
    """ Insert verses into the `verses` table by finding the correct `book_id` first. """
    if not verse_data:  #Ensure verse_data is valid before inserting
        logging.error(f"No verse data found for {book_name}, skipping insertion.")
        return
    try:
        # Find the correct book_id from books table
        book = session.query(Book).filter(Book.book_name == book_name, Book.project_id == project_id).first()
        if not book:
            logging.error(f"No book found for {book_name} in database.")
            return
        book_id = book.book_id
        logging.info(f"Inserting verses for {book_name} (Book ID: {book_id})...")
        for row in verse_data:
            if len(row) >= 4:  # Ensure row has enough data
                csv_book, chapter, verse, text = row[0], row[1], row[2], row[3]

                # Skip rows that do not match the correct book
                if csv_book != book_name:
                    continue
                # Ensure chapter is a number
                if not str(chapter).isdigit():
                    logging.warning(f"Skipping invalid chapter: {chapter}")
                    continue
                # Ensure verse is not empty
                if not str(verse).strip():
                    logging.warning(f"Skipping invalid verse: {verse}")
                    continue
                # Ensure text is not empty
                if not text.strip():
                    logging.warning(f"Skipping empty text for chapter {chapter}, verse {verse}")
                    continue
                # Insert into database
                new_verse = Verse(
                    book_id=book_id,
                    chapter=int(chapter),
                    verse=str(verse),
                    text=text.replace("\n", " ")  # Clean text
                )
                session.add(new_verse)
        session.commit()
        logging.info(f"Successfully inserted verses for {book_name} (Book ID: {book_id})")
    except Exception as e:
        logging.error(f"Error inserting verses for {book_name}: {str(e)}")
        session.rollback() 




def update_verses_in_db(book_name, project_id, book_id, verse_data, session):
    """ 
    Update verses in the `verses` table by **deleting existing verses** for the book first 
    and then inserting the new verse data.
    """
    
    if not verse_data:
        logging.error(f"No verse data found for book {book_name}, skipping update.")
        return

    try:
        # Step 1: Delete all existing verses for the book
        session.query(Verse).filter(Verse.book_id == book_id).delete()
        
        logging.info(f"Deleted existing verses for {book_name} (Book ID: {book_id}, Project ID: {project_id})")

        # Step 2: Insert new verses from the updated USFM
        new_verses = []
        for row in verse_data:
            if len(row) >= 4:
                csv_book, chapter, verse, text = row[0], row[1], row[2], row[3]

                # Ensure valid chapter, verse, and text
                if not str(chapter).isdigit() or not str(verse).strip() or not text.strip():
                    logging.warning(f"Skipping invalid data: Chapter {chapter}, Verse {verse}")
                    continue

                new_verses.append(Verse(
                    book_id=book_id,
                    chapter=int(chapter),
                    verse=str(verse),
                    text=text.replace("\n", " ")  # Clean text by removing line breaks
                ))

        # Bulk insert new verses
        if new_verses:
            session.bulk_save_objects(new_verses)
            logging.info(f"Inserted {len(new_verses)} new verses for {book_name} (Book ID: {book_id})")
        else:
            logging.warning(f"No valid verses extracted for {book_name}")

        session.commit()
        logging.info(f"Successfully updated verses for {book_name} (Book ID: {book_id}, Project ID: {project_id})")

    except Exception as e:
        logging.error(f"Error updating verses for {book_name}, Project {project_id}: {str(e)}")
        session.rollback()



def parse_verse_number(verse):
    """Convert verse numbers into sortable format (handles single verses and ranges like '1-2')."""
    if '-' in verse:
        return int(verse.split('-')[0])  # Take the first number in range (e.g., '1-2' → 1)
    return int(verse)  # Convert single verse to int

def verses_to_dict( verse, text):
    """Helper function to convert verses to a dictionary."""
    return {
        "verse": verse,
        "text": text
    }

def get_project_id(session,project_name):
    project = session.query(Project).filter(Project.project_name == project_name).first()
    if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_name}' not found")        
    return project.project_id

def get_book_id(session, project_name, book_name):
    project_id = get_project_id(session,project_name)
    book = session.query(Book).filter(Book.project_id == project_id, Book.book_name == book_name).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    book_id = book.book_id
    return book_id
        