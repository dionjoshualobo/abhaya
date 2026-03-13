def generate_sos_message(
    latitude: float,
    longitude: float,
    person_name: str | None = None,
    tracking_url: str | None = None,
) -> str:
    """
    Generate an SOS message that includes name and a location link.
    """
    safe_name = (person_name or 'Abhaya user').strip() or 'Abhaya user'

    has_coordinates = latitude is not None and longitude is not None
    if has_coordinates:
        maps_link = f"https://maps.google.com/?q={latitude},{longitude}"
        message = (
            f"URGENT SOS from {safe_name}. "
            f"Current location: {latitude}, {longitude}. "
            f"Map: {maps_link}"
        )
        if tracking_url:
            message = f"{message}. Live tracking: {tracking_url}"
        return message

    if tracking_url:
        return f"URGENT SOS from {safe_name}. Location unavailable right now. Live tracking: {tracking_url}"

    return f"URGENT SOS from {safe_name}. Location unavailable right now."
