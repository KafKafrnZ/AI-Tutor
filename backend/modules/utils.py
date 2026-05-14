# Deprecated - We now use PostgreSQL directly
# Kept for backward compatibility if needed

def save_mock_data(new_row, file_path="data/mock_data.csv"):
    """This function is no longer used. Use /save-mock-test endpoint instead."""
    print("⚠️  Warning: save_mock_data() is deprecated. Use save_mock_test() instead.")
    return {"status": "deprecated", "message": "Data should now be saved via API"}