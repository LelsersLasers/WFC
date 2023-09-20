from __future__ import annotations

import re
import random
import copy
import argparse

# ---------------------------------------------------------------------------- #
ap = argparse.ArgumentParser()

ap.add_argument("-n", "--n", required=True, type=int, help="N")
ap.add_argument("-f", "--filename", required=True, type=str, help="Filename")
ap.add_argument("-l", "--length", required=False, help="Output length")
ap.add_argument("-m", "--min-length", required=False, help="Output length")

args = vars(ap.parse_args())

N: int = args["n"]
FILENAME: str = args["filename"]
OUTPUT_LENGTH: int | None = args["length"] if args["length"] is None else int(args["length"])
MIN_OUTPUT_LENGTH: int | None = (
    args["min_length"] if args["min_length"] is None else int(args["min_length"])
)
# ---------------------------------------------------------------------------- #


# ---------------------------------------------------------------------------- #
END_WORD_PUNCTUATION = ".,;!?:-—"
CAP_PUNCTUATION = ".!?"
STRIP_PUNCTUATION = ".,;!?:"
BAD_PUNCTUATION = ["'", "’", ")", "(", "[", "]", "{", "}"]
# ---------------------------------------------------------------------------- #


class Word:
    def __init__(self, word: str, word_weight: int, allowed: dict[int, list[str]]):
        self.word: str = word
        self.word_weight: int = word_weight
        self.allowed: dict[int, list[str]] = allowed

    def __str__(self) -> str:
        return f"{self.word} ({self.word_weight}, {self.allowed})"


class Spot:
    def __init__(self) -> None:
        self.words: list[Word] = []
        self.collapsed: bool = False

    def __str__(self) -> str:
        if self.collapsed and len(self.words) > 0:
            return self.words[0].word
        else:
            return str(len(self.words))

    def add_word(self, word: Word):
        self.words.append(word)

    def random_word(self) -> Word:
        # return random.choices(self.words, weights=[word.word_weight for word in self.words], k=1)[0]
        return random.choices(self.words, k=1)[0]

    def collapse(self):
        self.words = [self.random_word()]
        self.collapsed = True

    def semi_collapse_to_period(self):
        period_words = [word for word in self.words if word.word == "."]
        self.words = period_words
        # self.collapsed = True

    def update(self, neighbor_words: list[Word], offset: int) -> bool:
        # if self.collapsed:
        #     return False

        previous_count = len(self.words)
        offset = -offset

        neighbor_word_strings = [word.word for word in neighbor_words]
        self.words = [
            word
            for word in self.words
            if offset in word.allowed.keys()
            and len(
                [
                    True
                    for allowed_word in word.allowed[offset]
                    if allowed_word in neighbor_word_strings
                ]
            )
            > 0
        ]

        # if len(self.words) == 1:
        #     self.collapsed = True

        return previous_count != len(self.words)


def lowest_entropy_indexes(spots: list[Spot]) -> tuple[list[int], bool, bool]:
    lowest_entropy = float("inf")
    indexes = []
    done = True
    for i, spot in enumerate(spots):
        if len(spot.words) == 0:
            return [], True, False

        if not spot.collapsed:
            done = False

            if len(spot.words) < lowest_entropy:
                lowest_entropy = len(spot.words)
                indexes = [i]
            elif len(spot.words) == lowest_entropy:
                indexes.append(i)

    return indexes, False, done


def propagate(spots: list[Spot], index: int) -> None:
    stack = [index]

    while len(stack) > 0:
        current_index = stack.pop()

        offsets = [i for i in range(-N, N + 1) if i != 0]
        offsets.sort(key=lambda x: abs(x))
        # neighbor_idxs = [current_index + offset for offset in offsets]

        current_words = spots[current_index].words

        for offset in offsets:
            neighbor_idx = current_index + offset
            if neighbor_idx < 0 or neighbor_idx > len(spots) - 1:
                continue

            updated = spots[neighbor_idx].update(current_words, offset)

            if updated and neighbor_idx not in stack:
                stack.append(neighbor_idx)

        print(join_spots(spots) + "   " + str(len(stack)) + ": " + str(stack))


def iterate(
    spots: list[Spot], words: list[Word], max_len: int | None
) -> tuple[bool, bool, int | None]:
    lowest_indexes, failed, done = lowest_entropy_indexes(spots)

    if len(lowest_indexes) > 0:
        index = rand_from_list(lowest_indexes)

        spots[index].collapse()
        propagate(spots, index)

        if MIN_OUTPUT_LENGTH is not None:
            if index + N >= len(spots) - 1 and max_len is None:
                spots.append(create_spot(words))

            if max_len is None:
                for i, spot in enumerate(spots):
                    if (
                        spot.collapsed
                        and len(spot.words) > 0
                        and i >= MIN_OUTPUT_LENGTH
                        and spot.words[0].word in CAP_PUNCTUATION
                    ):
                        max_len = i
            else:
                for i in range(len(spots) - 1, max_len, -1):
                    spots.pop(i)

    return failed, done, max_len


def rand_from_list(l: list[int]) -> int:
    return l[random.randint(0, len(l) - 1)]


def read_words(filename: str) -> list[Word]:
    word_strings: list[str] = []

    with open(filename, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()

            # punctuation_pattern = f'[{re.escape(end_word_punctuation)}]'
            # word_pattern = r'\b\w+\b'
            # tokens = re.findall(f'{word_pattern}|{punctuation_pattern}', line)

            punctuation_pattern = f"[{re.escape(END_WORD_PUNCTUATION)}]"
            word_pattern = r"\b[\w\']+?\b"  # Include the apostrophe in word characters
            tokens = re.findall(f"{word_pattern}|{punctuation_pattern}", line)

            apostrophe_adjusted_tokens = "090".join(tokens).replace("090'090", "'").split("090")

            word_strings.extend(apostrophe_adjusted_tokens)

    filtered_words = []
    for word_string in word_strings:
        word_string = word_string.strip()
        word_string = word_string.lower()

        if word_string == "":
            continue

        skip = False
        for char in BAD_PUNCTUATION:
            if char in word_string:
                skip = True
                break

        if not skip:
            filtered_words.append(word_string)

    left_word = "."
    current_word = filtered_words[0]
    word_combo = (current_word, {-1: [left_word]})
    all_word_combs: list[tuple[str, dict[int, list[str]]]] = [word_combo]

    offsets = [i for i in range(-N, N + 1) if i != 0]

    length = len(filtered_words)
    last_word = filtered_words[-1]
    length_offset = 0
    if last_word == ".":
        length_offset = 1

    for i in range(len(filtered_words)):
        current_word = filtered_words[i]

        neighbor_idxs = [i + offset for offset in offsets]
        for neighbor_idx, offset in zip(neighbor_idxs, offsets):
            if neighbor_idx < -1 or neighbor_idx > length - length_offset:
                continue

            if neighbor_idx == length - length_offset or neighbor_idx == -1:
                offset_word = "."
            else:
                offset_word = filtered_words[neighbor_idx]

            tup = (current_word, {offset: [offset_word]})

            all_word_combs.append(tup)

    words: list[Word] = []
    for word_comb in all_word_combs:
        word_str = word_comb[0]
        allowed = word_comb[1]

        if word_str not in [word.word for word in words]:
            words.append(Word(word_str, 1, allowed))
        else:
            for word in words:
                if word.word == word_str:
                    word.word_weight += 1

                    offset = list(allowed.keys())[0]
                    allowed_word = allowed[offset][0]

                    if offset not in word.allowed.keys():
                        word.allowed[offset] = [allowed_word]
                    if allowed_word not in word.allowed[offset]:
                        word.allowed[offset].append(allowed_word)

    return words


def create_spot(words: list[Word]) -> Spot:
    spot = Spot()
    for word in words:
        spot.add_word(copy.deepcopy(word))
    return spot


def create_spots(words: list[Word], length: int | None, min_length: int | None) -> list[Spot]:
    spots: list[Spot] = []

    if length is None and min_length is None:
        raise Exception("Must specify length or min_length")

    elif length is not None:
        l = length
    elif min_length is not None:
        l = min_length

    for _ in range(l):
        spot = create_spot(words)
        spots.append(spot)

    spots[0].semi_collapse_to_period()
    print(join_spots(spots))

    propagate(spots, 0)
    print(join_spots(spots))

    if min_length is None:
        spots[-1].semi_collapse_to_period()
        print(join_spots(spots))
        propagate(spots, len(spots) - 1)
        print(join_spots(spots))

    return spots


def join_spots(spots: list[Spot]) -> str:
    output = ""
    last_word = ""
    for spot in spots:
        word = str(spot)

        if last_word in CAP_PUNCTUATION:
            word = word.capitalize()
        if word in STRIP_PUNCTUATION:
            output = output.strip()

        output += word + " "
        last_word = word

    output = output.strip()

    return output


def main() -> None:
    words = read_words(FILENAME)
    print("Words read")

    spots = create_spots(words, OUTPUT_LENGTH, MIN_OUTPUT_LENGTH)

    done = False
    max_len: int | None = None
    while not done:
        failed, done, max_len = iterate(spots, words, max_len)
        print(join_spots(spots))
        print("\n")

        if failed:
            print("KNOTTED, RESTARTING\n")
            spots = create_spots(words, OUTPUT_LENGTH, MIN_OUTPUT_LENGTH)
            max_len = None
            # break


main()
