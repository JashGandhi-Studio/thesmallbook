import re

with open('js/youpi.js', 'r', encoding='utf-8') as f:
    text = f.read()

# We need to remove the auto-confirm onReturn listeners:
# window.addEventListener("focus", onReturn);
# document.addEventListener("visibilitychange", onReturn);

# Let's inspect how launchCheckout handles success and modal content:
