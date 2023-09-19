import re

end_word_punctuation = ".,;!?:-—"

line = """
Alice looked down at them, and considered a little before she gave her
answer. 'They're done with blacking, I believe.'

'Boots and shoes under the sea,' the Gryphon went on in a deep voice,
'are done with a whiting. Now you know.'"""

punctuation_pattern = f'[{re.escape(end_word_punctuation)}]'
word_pattern = r'\b[\w\']+?\b'  # Include the apostrophe in word characters
tokens = re.findall(f'{word_pattern}|{punctuation_pattern}', line)

apostrophe_adjusted_tokens = "090".join(tokens).replace("090'090", "'").split("090")

print(tokens)
print(apostrophe_adjusted_tokens)