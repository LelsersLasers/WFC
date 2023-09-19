import re

end_word_punctuation = ".,;!?:-—"

line = """
At this the whole pack rose up into the air, and came flying down upon
her: she gave a little scream, half of fright and half of anger, and
tried to beat them off, and found herself lying on the bank"""

punctuation_pattern = f'[{re.escape(end_word_punctuation)}]'
word_pattern = r'\b[\w\']+?\b'  # Include the apostrophe in word characters
tokens = re.findall(f'{word_pattern}|{punctuation_pattern}', line)

apostrophe_adjusted_tokens = "090".join(tokens).replace("090'090", "'").split("090")

print(tokens)
print(apostrophe_adjusted_tokens)