import random

class Word:
    def __init__(self, word: str, word_weight: int, left_allowed: list[str], right_allowed: list[str]):
        self.word: str = word
        self.word_weight: int = word_weight
        self.left_allowed: list[str] = left_allowed
        self.right_allowed: list[str] = right_allowed

    def __str__(self) -> str:
        return f"{self.word} ({self.word_weight})"


class Spot:
    def __init__(self):
        self.words: list[Word] = []
        self.collapsed: bool = False

    def add_word(self, word: Word):
        self.words.append(word)

    def random_weighted_word(self) -> Word:
        return random.choices(self.words, weights=[word.word_weight for word in self.words], k=1)[0]

    def collapse(self):
        self.words = [self.random_weighted_word()]
        self.collapsed = True

    def update(self, left_words: list[Word] = None, right_words: list[Word] = None) -> tuple[bool, bool]:
        if left_words is not None:
            left_word_strings = [word.word for word in left_words]
            if not self.collapsed:
                self.words = [word for word in self.words if word.left_allowed in left_word_strings]
        if right_words is not None:
            right_word_strings = [word.word for word in right_words]
            if not self.collapsed:
                self.words = [word for word in self.words if word.right_allowed in right_word_strings]

        if len(self.words) == 1:
            self.collapsed = True
        
        failed = len(self.words) == 0

        return self.collapsed, failed
    
def lowest_entropy_spot(spots: list[Spot]) -> Spot:
    lowest_entropy = float("inf")
    lowest_entropy_spot = spots[0]
    for spot in spots:
        if not spot.collapsed:
            if len(spot.words) < lowest_entropy:
                lowest_entropy = len(spot.words)
                lowest_entropy_spot = spot
    return lowest_entropy_spot


def read_words(filename: str) -> list[Word]:

    word_strings: list[str] = []

    with open(filename, "r") as file:
        for line in file:
            line = line.strip()
            word_splits = line.split(" ")
            for word_split in word_splits:
                word_split = word_split.lower()
                word_strings.append(word_split)


    filtered_words = []
    for word_string in word_strings:
        if word_string.isalpha():
            filtered_words.append(word_string)
        elif word_string.endswith("."):
            filtered_words.append(word_string[:-1])
            filtered_words.append(".")

    left_word = "."
    current_word = filtered_words[0]
    right_word = filtered_words[1]
    all_word_combs: list[tuple[str, str, str]] = [(current_word, left_word, right_word)]

    for i, current_word in enumerate(filtered_words[1:-1]):
        all_word_combs.append((current_word, left_word, right_word))

        left_word = current_word
        try:
            right_word = filtered_words[i + 2]
        except IndexError:
            right_word = "."

    
    words: list[Word] = []
    for word_comb in all_word_combs:
        if word_comb[0] not in [word.word for word in words]:
            words.append(Word(word_comb[0], 1, [word_comb[1]], [word_comb[2]]))
        else:
            for word in words:
                if word.word == word_comb[0]:
                    word.word_weight += 1

                    if word_comb[1] not in word.left_allowed:
                        word.left_allowed.append(word_comb[1])
                    if word_comb[2] not in word.right_allowed:
                        word.right_allowed.append(word_comb[2])

    return words


def main():
    FILENAME = "book-database/alice.txt"
    OUTPUT_LENGTH = 30

    words = read_words(FILENAME)
    for word in words:
        print(word)

    spots: list[Spot] = []
    for _ in range(OUTPUT_LENGTH):
        spots.append(Spot())

    spots[0].add_word(".")
    spots[0].update()
    spots[-1].add_word(".")
    spots[-1].update()

    




main()