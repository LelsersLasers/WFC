from __future__ import annotations

import random
import copy

FILENAME = "book-database/alice.txt"
OUTPUT_LENGTH = 20

class Word:
    def __init__(self, word: str, word_weight: int, left_allowed: list[str], right_allowed: list[str]):
        self.word: str = word
        self.word_weight: int = word_weight
        self.left_allowed: list[str] = left_allowed
        self.right_allowed: list[str] = right_allowed

    def __str__(self) -> str:
        return f"{self.word} ({self.word_weight}, {self.left_allowed}, {self.right_allowed})"


class Spot:
    def __init__(self) -> None:
        self.words: list[Word] = []
        self.collapsed: bool = False

    def __str__(self) -> str:
        if self.collapsed:
            return self.words[0].word
        else:
            return str(len(self.words))

    def add_word(self, word: Word):
        self.words.append(word)

    def random_weighted_word(self) -> Word:
        # return random.choices(self.words, weights=[word.word_weight for word in self.words], k=1)[0]
        return random.choices(self.words, k=1)[0]

    def collapse(self):
        self.words = [self.random_weighted_word()]
        self.collapsed = True

    def update(self, left_words: list[Word] | None = None, right_words: list[Word] | None = None) -> bool:
        previous_count = len(self.words)

        if left_words is not None:
            left_word_strings = [word.word for word in left_words]
            if not self.collapsed:
                self.words = [word for word in self.words if len([True for allowed_word in word.left_allowed if allowed_word in left_word_strings]) > 0]
        if right_words is not None:
            right_word_strings = [word.word for word in right_words]
            if not self.collapsed:
                self.words = [word for word in self.words if len([True for allowed_word in word.right_allowed if allowed_word in right_word_strings]) > 0]

        if len(self.words) == 1:
            self.collapsed = True

        return previous_count != len(self.words)
        


def lowest_entropy_indexes(spots: list[Spot]) -> tuple[list[int], bool, bool]:
    lowest_entropy = float("inf")
    indexes = []
    done = True
    for i, spot in enumerate(spots):
        if not spot.collapsed:
            done = False

            if len(spot.words) == 0:
                return [], True, False
            elif len(spot.words) < lowest_entropy:
                lowest_entropy = len(spot.words)
                indexes = [i]
            elif len(spot.words) == lowest_entropy:
                indexes.append(i)
    return indexes, False, done


def propagate(spots: list[Spot], index: int) -> None:
    stack = [index]

    while len(stack) > 0:
        current_index = stack.pop()

        left_index = current_index - 1
        if left_index >= 1:
            updated = spots[left_index].update(right_words=spots[current_index].words)

            if updated and left_index not in stack:
                stack.append(left_index)
        
        right_index = current_index + 1
        if right_index < len(spots) - 1:
            updated = spots[right_index].update(left_words=spots[current_index].words)

            if updated and right_index not in stack:
                stack.append(right_index)


def iterate(spots: list[Spot]) -> tuple[bool, bool]:
    lowest_indexes, failed, done = lowest_entropy_indexes(spots)

    if len(lowest_indexes) > 0:
        index = rand_from_list(lowest_indexes)
        spots[index].collapse()
        propagate(spots, index)

    return failed, done



def rand_from_list(l: list[int]) -> int:
    return l[random.randint(0, len(l) - 1)]

def read_words(filename: str) -> tuple[list[Word], list[str]]:

    word_strings: list[str] = []

    with open(filename, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            word_splits = line.split(" ")
            for word_split in word_splits:
                word_split = word_split.lower()
                word_strings.append(word_split)


    filtered_words = []
    for word_string in word_strings:
        word_string = word_string.strip()

        if word_string == "":
            continue
        
        # wsn = word string no
        wsn_apostrophe = word_string.strip("'’").strip()
        wsn_comma = wsn_apostrophe.strip(",").strip()
        wsn_nothing = wsn_comma.strip("-—.").strip()

        to_remove = "'’,-—."
        removed = wsn_nothing
        for char in to_remove:
            removed = removed.replace(char, "")

        # if "s" in wsn_nothing:
        #     continue

        if removed.isalpha():
            if wsn_apostrophe.endswith("."):
                filtered_words.append(wsn_apostrophe[:-1])
                filtered_words.append(".")
            elif word_string.endswith(","):
                filtered_words.append(wsn_apostrophe[:-1])
                filtered_words.append(",")
            else:
                filtered_words.append(wsn_apostrophe)

    left_word = "."
    current_word = filtered_words[0]
    right_word = filtered_words[1]
    all_word_combs: list[tuple[str, str, str]] = [(current_word, left_word, right_word)]

    for i, current_word in enumerate(filtered_words[1:]):
        i += 1

        left_word = filtered_words[i - 1]
        try:
            right_word = filtered_words[i + 1]
        except IndexError:
            right_word = "."

        tup = (current_word, left_word, right_word)
        all_word_combs.append(tup)

    
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
    word_strs = [word.word for word in words]

    return words, word_strs

def create_spots(words: list[Word], length: int) -> list[Spot]:
    spots: list[Spot] = []
    for _ in range(length):
        spot = Spot()
        for word in words:
            spot.add_word(copy.deepcopy(word))
        spots.append(spot)
    return spots

def join_spots(spots: list[Spot]) -> str:
    output = ""
    last_word = ""
    for spot in spots:
        word = str(spot)

        if last_word == ".":
            word = word.capitalize()
        elif word == "." or word == ",":
            output = output.strip()
        
        output += word + " "
        last_word = word

    output = output.strip()

    return output

def main() -> None:
    words, word_strs = read_words(FILENAME)
    print("Words read")

    spots: list[Spot] = []
    for _ in range(OUTPUT_LENGTH):
        spot = Spot()
        for word in words:
            spot.add_word(copy.deepcopy(word))
        spots.append(spot)


    start_word = Word(".", 1, [], word_strs)
    spots[0].words = [start_word]
    spots[0].update()

    end_word = Word(".", 1, word_strs, [])
    spots[-1].words = [end_word]
    spots[-1].update()


    propagate(spots, 0)
    print(join_spots(spots))

    propagate(spots, len(spots) - 1)
    print(join_spots(spots))

    done = False
    while not done:

        failed, done = iterate(spots)
        print(join_spots(spots))
        print("")

        if failed:
            print("KNOTTED, RESTARTING\n")
            spots = create_spots(words, OUTPUT_LENGTH)
    




main()