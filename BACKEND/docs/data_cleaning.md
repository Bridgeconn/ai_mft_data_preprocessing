# Data Cleaning Process

## 1. Removing Non-Printable Characters
- Uses Unicode categories (`C`, `Cc`, `Cf`, `Cs`, `Co`, `Cn`) to identify non-printable characters.
- Replaces them with a space (`" "`).
- Implemented using `unicodedata` and `str.translate()`.

```python
import sys
import unicodedata
import typing as tp

def get_non_printing_char_replacer(replace_by: str = " ") -> tp.Callable[[str], str]:
    non_printable_map = {
        ord(c): replace_by
        for c in (chr(i) for i in range(sys.maxunicode + 1))
        if unicodedata.category(c) in {"C", "Cc", "Cf", "Cs", "Co", "Cn"}
    }
    def replace_non_printing_char(line) -> str:
        return line.translate(non_printable_map)
    return replace_non_printing_char

replace_nonprint = get_non_printing_char_replacer(" ")
```

---

## 2. Normalizing Punctuation
- Uses `MosesPunctNormalizer` (from `sacremoses`).
- Standardizes punctuation marks for consistency.

```python
from sacremoses import MosesPunctNormalizer
import re

mpn = MosesPunctNormalizer(lang="en")
mpn.substitutions = [(re.compile(r), sub) for r, sub in mpn.substitutions]
```

---

## 3. Unicode Normalization
- Uses `NFKC` normalization to convert equivalent characters to a consistent form.

```python
import unicodedata

def normalize_unicode(text: str) -> str:
    return unicodedata.normalize("NFKC", text)
```

---

## 4. Final Normalization Pipeline
- Applies all the above steps in sequence to clean text.

```python
def normalize_text(text: str) -> str:
    if not isinstance(text, str):
        return text
    clean = mpn.normalize(text)  # Normalize punctuation
    clean = replace_nonprint(clean)  # Remove non-printable characters
    clean = unicodedata.normalize("NFKC", clean)  # Normalize Unicode characters
    return clean
```