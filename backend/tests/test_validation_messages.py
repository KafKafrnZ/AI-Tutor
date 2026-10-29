from app.core.error_handler import human_validation_message


def test_human_validation_message_strips_pydantic_prefix():
    assert human_validation_message(
        [{"msg": "Value error, Password must be at least 8 characters"}]
    ) == "Password must be at least 8 characters."


def test_human_validation_message_empty():
    assert human_validation_message([]) == "One or more fields are invalid."


def test_human_validation_message_capitalizes():
    assert human_validation_message([{"msg": "field required"}]) == "Field required."


def test_human_validation_message_missing_field():
    assert human_validation_message(
        [{"type": "missing", "loc": ["body", "email"], "msg": "Field required"}]
    ) == "Email is required."
    assert human_validation_message(
        [{"type": "missing", "loc": ["body", "new_password"], "msg": "Field required"}]
    ) == "New password is required."
