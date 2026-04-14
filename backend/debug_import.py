import sys
import os

print("--- Starting Import Trace ---")

print("Checking current directory...")
print(f"CWD: {os.getcwd()}")
print(f"sys.path: {sys.path}")

try:
    print("Importing fastapi...")
    from fastapi import FastAPI
    print("Imported fastapi.")

    print("Importing main.py app...")
    import main
    print("Imported main.py.")
    
    print("Backend import successful!")
except Exception as e:
    print(f"Error during import: {e}")
    import traceback
    traceback.print_exc()
