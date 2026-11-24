from automation_bridge import editor

report = editor.doctor(
    ".",
    required_capabilities=(
        "elements",
        "input.click",
    )
)

for check in report.checks:
    print(
        check.name,
        check.status,
        check.message,
        check.action or ""
    )

print("READY:", report.ready)