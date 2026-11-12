"""Persian text utilities — foundation of the normalization layer.

Crawled listings mix Arabic/Persian letters, Persian/Arabic/Latin digits,
zero-width joiners and random spacing. Everything that compares text goes
through `normalize_text` first.
"""
import re
import random

_PERSIAN = "۰۱۲۳۴۵۶۷۸۹"
_ARABIC = "٠١٢٣٤٥٦٧٨٩"
_TO_LATIN = str.maketrans({**{c: str(i) for i, c in enumerate(_PERSIAN)}, **{c: str(i) for i, c in enumerate(_ARABIC)}})
_TO_PERSIAN = str.maketrans({str(i): c for i, c in enumerate(_PERSIAN)})
_LETTERS = str.maketrans({"ي": "ی", "ى": "ی", "ك": "ک", "ة": "ه", "أ": "ا", "إ": "ا", "آ": "ا", "ؤ": "و"})

_ZW = re.compile(r"[‌‍‎‏]")
_HARAKAT = re.compile(r"[ً-ْ]")
_PUNCT = re.compile(r"[،,؛;:|/\\()\[\]{}«»\"'!؟?*+_\-–—]")
_DIGIT_FA = re.compile(r"(\d)([؀-ۿ])")
_FA_DIGIT = re.compile(r"([؀-ۿ])(\d)")
_SPACES = re.compile(r"\s+")


def to_latin_digits(s: str) -> str:
    return s.translate(_TO_LATIN)


def to_persian_digits(s: object) -> str:
    return str(s).translate(_TO_PERSIAN)


def normalize_text(s: str) -> str:
    """Canonical form used for matching: Persian letters, Latin digits, lower-case, single spaces."""
    s = to_latin_digits(s).translate(_LETTERS)
    s = _ZW.sub(" ", s)
    s = _HARAKAT.sub("", s)
    s = _PUNCT.sub(" ", s).lower()
    # split glued Persian/digit runs: "206تیپ5" -> "206 تیپ 5"
    s = _DIGIT_FA.sub(r"\1 \2", s)
    s = _FA_DIGIT.sub(r"\1 \2", s)
    return _SPACES.sub(" ", s).strip()


def format_toman(v: float) -> str:
    return f"{to_persian_digits(f'{round(v):,}')} تومان"


def format_number(v: float) -> str:
    return to_persian_digits(f"{round(v):,}")


def seeded_random(seed: str) -> random.Random:
    """Deterministic PRNG so simulated data is stable across restarts."""
    return random.Random(seed)
