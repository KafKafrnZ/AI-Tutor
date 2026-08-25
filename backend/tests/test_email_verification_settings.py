from app.core.config import parse_require_email_verification

def test_parse_require_email_verification():
    # a) raw=None, environment=production -> True
    assert parse_require_email_verification(None, "production") is True
    
    # b) raw="", environment=production -> True
    assert parse_require_email_verification("", "production") is True
    
    # c) raw="false", environment=production -> False
    assert parse_require_email_verification("false", "production") is False
    
    # d) raw=None, environment=development -> False
    assert parse_require_email_verification(None, "development") is False
    
    # e) raw="true", environment=development -> True
    assert parse_require_email_verification("true", "development") is True
    
    # f) raw="0", environment=production -> False
    assert parse_require_email_verification("0", "production") is False

    assert parse_require_email_verification("FALSE", "production") is False
    assert parse_require_email_verification("off", "production") is False
    assert parse_require_email_verification("   ", "production") is True
    assert parse_require_email_verification(None, "Production") is True

