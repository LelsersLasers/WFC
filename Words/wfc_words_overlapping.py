from __future__ import annotations

import random
import copy

N: int = 2
FILENAME = "book-database/test.txt"
OUTPUT_LENGTH = 10

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

    def collapse_to_period(self):
        period_words = [word for word in self.words if word.word == "."]
        self.words = [period_words[0]]
        self.collapsed = True

    # def update(self, left_words: list[Word] | None = None, right_words: list[Word] | None = None) -> bool:
    #     previous_count = len(self.words)

    #     if left_words is not None:
    #         left_word_strings = [word.word for word in left_words]
    #         if not self.collapsed:
    #             self.words = [word for word in self.words if len([True for allowed_word in word.left_allowed if allowed_word in left_word_strings]) > 0]
    #     if right_words is not None:
    #         right_word_strings = [word.word for word in right_words]
    #         if not self.collapsed:
    #             self.words = [word for word in self.words if len([True for allowed_word in word.right_allowed if allowed_word in right_word_strings]) > 0]

    #     if len(self.words) == 1:
    #         self.collapsed = True

    #     return previous_count != len(self.words)

    def update(self, neighbor_words: list[Word], offset: int) -> bool:
        if self.collapsed:
            return False

        previous_count = len(self.words)
        offset = -offset

        neighbor_word_strings = [word.word for word in neighbor_words]
        # self.words = [word for word in self.words if len([True for allowed_word in word.allowed[offset] if allowed_word in neighbor_word_strings]) > 0]

        new_words = []
        for word in self.words:
            # if len([True for allowed_word in word.allowed[offset] if allowed_word in neighbor_word_strings]) > 0:
            #     new_words.append(word)
            if offset in word.allowed.keys():
                if len([True for allowed_word in word.allowed[offset] if allowed_word in neighbor_word_strings]) > 0:
                    new_words.append(word)
        self.words = new_words

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
        
        offsets = [i for i in range(-N, N + 1) if i != 0]
        neighbor_idxs = [current_index + offset for offset in offsets]

        current_words = spots[current_index].words

        for neighbor_idx, offset in zip(neighbor_idxs, offsets):
            if neighbor_idx <= 0 or neighbor_idx >= len(spots) - 1:
                continue

            updated = spots[neighbor_idx].update(current_words, offset)

            if updated and neighbor_idx not in stack:
                stack.append(neighbor_idx)

        # left_index = current_index - 1
        # if left_index >= 1:
        #     updated = spots[left_index].update(right_words=spots[current_index].words)

        #     if updated and left_index not in stack:
        #         stack.append(left_index)
        
        # right_index = current_index + 1
        # if right_index < len(spots) - 1:
        #     updated = spots[right_index].update(left_words=spots[current_index].words)

        #     if updated and right_index not in stack:
        #         stack.append(right_index)


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
    # TODO: use N; filter out 2 of the same words in a row; ?

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
    word_combo = (current_word, {-1: [left_word]})
    all_word_combs: list[tuple[str, dict[int, list[str]]]] = [word_combo]

    # left_word = "."
    # current_word = filtered_words[0]
    # right_word = filtered_words[1]
    # all_word_combs: list[tuple[str, str, str]] = [(current_word, left_word, right_word)]
    offsets = [i for i in range(-N, N + 1) if i != 0]

    print(filtered_words)

    for i in range(len(filtered_words)):
        current_word = filtered_words[i]

        neighbor_idxs = [i + offset for offset in offsets]
        for neighbor_idx, offset in zip(neighbor_idxs, offsets):
            if neighbor_idx < -1 or neighbor_idx > len(filtered_words):
                continue

            if neighbor_idx == len(filtered_words) or neighbor_idx == -1:
                offset_word = "."
            else:
                offset_word = filtered_words[neighbor_idx]
            
            tup = (current_word, {offset: [offset_word]})

            if current_word == "hardly":
                print(tup)

            all_word_combs.append(tup)

        # left_word = filtered_words[i - 1]
        # try:
        #     right_word = filtered_words[i + 1]
        # except IndexError:
        #     right_word = "."

        # tup = (current_word, left_word, right_word)
        # all_word_combs.append(tup)

    
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
                        word.allowed[offset] = []
                    if allowed_word not in word.allowed[offset]:
                        word.allowed[offset].append(allowed_word)
                    

                    # if word_comb[1] not in word.allowed[-1]:
                    #     word.allowed[-1].append(word_comb[1])
                    # if word_comb[2] not in word.allowed[1]:
                    #     word.allowed[1].append(word_comb[2])


    word_strs = [word.word for word in words]

    return words, word_strs

def create_spots(words: list[Word], length: int, word_strs: list[str]) -> list[Spot]:
    spots: list[Spot] = []
    for _ in range(length):
        spot = Spot()
        for word in words:
            spot.add_word(copy.deepcopy(word))
        spots.append(spot)

    # start_word = Word(".", 1, {1: word_strs})
    # spots[0].words = [start_word]
    # spots[0].collapse()

    # end_word = Word(".", 1, {-1: word_strs})
    # spots[-1].words = [end_word]
    # spots[-1].collapse()

    spots[0].collapse_to_period()
    spots[-1].collapse_to_period()

    # propagate(spots, 0)
    # print(join_spots(spots))

    propagate(spots, len(spots) - 1)
    print(join_spots(spots))

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

    spots = create_spots(words, OUTPUT_LENGTH, word_strs)

    # spots: list[Spot] = []
    # for _ in range(OUTPUT_LENGTH):
    #     spot = Spot()
    #     for word in words:
    #         spot.add_word(copy.deepcopy(word))
    #     spots.append(spot)


    # start_word = Word(".", 1, {-1: word_strs})
    # spots[0].words = [start_word]
    # spots[0].collapse()

    # end_word = Word(".", 1, {1: word_strs})
    # spots[-1].words = [end_word]
    # spots[-1].collapse()

    # propagate(spots, 0)
    # print(join_spots(spots))

    # propagate(spots, len(spots) - 1)
    # print(join_spots(spots))

    done = False
    while not done:

        failed, done = iterate(spots)
        print(join_spots(spots))
        print("")

        if failed:
            print("KNOTTED, RESTARTING\n")
            spots = create_spots(words, OUTPUT_LENGTH, word_strs)
            break
    




main()