class FlightProviderError(Exception):
    """Raised when an upstream flight provider cannot complete a search."""


class PersistenceError(Exception):
    """Raised when a search cannot be persisted safely."""
