"""Clone failures reach visitors as plain messages, never git output or server paths."""

from main import clone_error_message


def test_missing_repo_gets_a_plain_message():
    raw = "Cmd('git') failed due to: exit code(128)\n  cmdline: git clone -v --depth=1 -- https://github.com/a/b C:\Temp\carbon_x\n  stderr: 'remote: Repository not found.'"
    msg = clone_error_message(raw)
    assert "public" in msg
    assert "git" not in msg.lower() and "Temp" not in msg


def test_size_and_policy_errors():
    assert "too large" in clone_error_message("Repository exceeds 75MB disk budget limit (actual: 80.0MB).")
    assert "github.com/owner/repo" in clone_error_message("Security Policy: Only https://github.com/ URLs are allowed.")
