from datetime import date, timedelta


def sample_dates(start: date, end: date, count: int = 3) -> list[date]:
    days = (end - start).days
    if days <= 0:
        return [start]
    offsets = sorted({round(index * days / (count - 1)) for index in range(count)})
    return [start + timedelta(days=offset) for offset in offsets]


def sample_date_pairs(
    departure_start: date,
    departure_end: date,
    return_start: date,
    return_end: date,
    count: int = 3,
) -> list[tuple[date, date]]:
    departures = sample_dates(departure_start, departure_end, count)
    returns = sample_dates(return_start, return_end, count)
    return [
        (departure_date, return_date)
        for departure_date in departures
        for return_date in returns
        if return_date > departure_date
    ]
