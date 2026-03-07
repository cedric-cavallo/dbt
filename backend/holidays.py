"""French public holidays calculation."""
from datetime import date, timedelta
from functools import lru_cache


def easter_sunday(year: int) -> date:
    """Calculate Easter Sunday using the Anonymous Gregorian algorithm."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


@lru_cache(maxsize=10)
def get_french_holidays(year: int) -> set[date]:
    """Return the set of French public holidays for the given year."""
    easter = easter_sunday(year)
    holidays = {
        date(year, 1, 1),          # Jour de l'an
        easter + timedelta(days=1),# Lundi de Pâques
        date(year, 5, 1),          # Fête du Travail
        date(year, 5, 8),          # Victoire 1945
        easter + timedelta(days=39),# Ascension
        easter + timedelta(days=50),# Lundi de Pentecôte
        date(year, 7, 14),         # Fête Nationale
        date(year, 8, 15),         # Assomption
        date(year, 11, 1),         # Toussaint
        date(year, 11, 11),        # Armistice
        date(year, 12, 25),        # Noël
    }
    return holidays


def is_working_day(d: date, holidays_set: set[date] | None = None) -> bool:
    """Return True if the given date is a working day (Mon-Fri, not a holiday)."""
    if d.weekday() >= 5:  # Saturday or Sunday
        return False
    if holidays_set is None:
        holidays_set = get_french_holidays(d.year)
    return d not in holidays_set


def count_working_days(
    start: date,
    end: date,
    extra_off: set[date] | None = None,
) -> int:
    """Count working days in [start, end] inclusive, excluding holidays and extra_off days."""
    if start > end:
        return 0
    count = 0
    current = start
    # Collect all holidays across relevant years
    holidays: set[date] = set()
    for year in range(start.year, end.year + 1):
        holidays |= get_french_holidays(year)
    if extra_off:
        holidays |= extra_off
    while current <= end:
        if current.weekday() < 5 and current not in holidays:
            count += 1
        current += timedelta(days=1)
    return count


def working_days_in_range(
    start: date,
    end: date,
    extra_off: set[date] | None = None,
) -> list[date]:
    """Return list of working days in [start, end]."""
    if start > end:
        return []
    days = []
    current = start
    holidays: set[date] = set()
    for year in range(start.year, end.year + 1):
        holidays |= get_french_holidays(year)
    if extra_off:
        holidays |= extra_off
    while current <= end:
        if current.weekday() < 5 and current not in holidays:
            days.append(current)
        current += timedelta(days=1)
    return days
