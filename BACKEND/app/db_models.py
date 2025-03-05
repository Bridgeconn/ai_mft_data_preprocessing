from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import  declarative_base
from sqlalchemy.dialects.postgresql import JSONB


Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"
    
    project_id = Column(Integer, primary_key=True, autoincrement=True)
    project_name = Column(String, nullable=False)

  

class Book(Base):
    __tablename__ = "books"
    
    book_id = Column(Integer, primary_key=True, autoincrement=True)
    book_name = Column(String, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.project_id"), nullable=False)
    usfm = Column(Text, nullable=False)  
    usj = Column(JSONB, nullable=True)   
    usfm_sha=Column(String, nullable=False)
    status = Column(String, nullable=False)


class Verse(Base):
    __tablename__ = "verses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey("books.book_id"), nullable=False)
    chapter = Column(Integer, nullable=False)
    verse = Column(String, nullable=False)
    text = Column(Text, nullable=False)
