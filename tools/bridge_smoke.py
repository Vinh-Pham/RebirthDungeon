from automation_bridge import editor

print("Connecting to Defold...")

project = editor.open_project(
    ".",
    start_if_needed=False,
)

print("Building and running game...")

game = project.build_and_run()

print("\nHealth:")
print(game.health())

print("\nScreen:")
print(game.screen())

print("\nFirst visible elements:")

elements = game.elements(
    visible=True,
    limit=20,
)

for element in elements:
    print(
        element.id,
        element.type,
        element.name,
        element.text,
    )

print("\nTaking screenshot...")

shot = game.screenshot(
    wait=True,
    resolution_multiplier=0.5,
)

print("Screenshot:", shot.path)

game.close()