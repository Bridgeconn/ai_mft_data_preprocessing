from database import SessionLocal
import os
import json
from usfm_grammar import USFMParser,Filter
from db_models import  Book, Verse
import logging
import csv
import hashlib
import io
import csv



# UPLOAD_DIR = "uploads/"
# if not os.path.exists(UPLOAD_DIR):
#     os.makedirs(UPLOAD_DIR)
# OUTPUT_DIR = os.path.join(UPLOAD_DIR, "output")  


def parse_usfm_to_csv(book_name, usfm_content, project_id):
    """ Convert USFM content to CSV format and return extracted data """
    try:
        my_parser = USFMParser(usfm_content)  # Initialize parser
        output = my_parser.to_list(include_markers=Filter.BCV + Filter.TEXT)  # Extract BCV and Text
        logging.info(f"Extracted {len(output)} verses from {book_name}")
        if not output:
            logging.error(f"No data extracted for {book_name}!")
        else:
            logging.info(f"Extracted {len(output)} verses for {book_name}")

        return output  #  Ensure we return the extracted verse data
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
    """ Update existing verses in the `verses` table without duplicating, based on `book_id` and `project_id`. """
    
    if not verse_data:
        logging.error(f"No verse data found for book {book_name}, skipping update.")
        return

    try:
        # Fetch all existing verses for this book and project into a dictionary
        existing_verses = {
            (v.chapter, v.verse): v
            for v in session.query(Verse).filter(Verse.book_id == book_id).all()
        }
        for row in verse_data:
            if len(row) >= 4:
                csv_book, chapter, verse, text = row[0], row[1], row[2], row[3]

                # Ensure valid chapter, verse, and text
                if not str(chapter).isdigit() or not str(verse).strip() or not text.strip():
                    logging.warning(f"Skipping invalid data: Chapter {chapter}, Verse {verse}")
                    continue
                verse_key = (int(chapter), str(verse))

                if verse_key in existing_verses:
                    #  Update existing verse
                    existing_verses[verse_key].text = text.replace("\n", " ")
                    logging.info(f"Updated verse {chapter}:{verse} in {book_name}")
                else:
                    logging.warning(f"Verse {chapter}:{verse} does not exist, skipping update.")

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
