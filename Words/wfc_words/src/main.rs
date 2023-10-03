use std::collections::HashMap;
// use weighted_rand::builder::*;
use rayon::prelude::*;
use regex::Regex;
use structopt::StructOpt;

// const N: i32 = 2;
// const OUTPUT_LEN: usize = 20;
// const FILENAME: &str = "../book-database/test.txt";

const END_WORD_PUNCTUATION: &str = ".,;!?:-—";
const OTHER_PUNCTUATION: [&str; 8] = ["'", "’", ")", "(", "[", "]", "{", "}"];
const CAP_PUNCTUATION: &str = ".!?";
const STRIP_PUNCTUATION: &str = ".,;!?:";


#[derive(Debug, StructOpt)]
#[structopt(name = "WFC Words", about = "Wave Function Collapse for prose")]
struct Opt {
    // N
    #[structopt(short, long)]
    n: i32,

    // Output length
    #[structopt(short, long)]
    length: usize,

    // Filename
    #[structopt(short, long)]
    filename: String,
}

#[derive(Clone)]
struct Word {
    word: String,
    word_weight: u32,
    allowed: HashMap<i32, Vec<String>>,
}

impl Word {
    fn new(word: String, allowed: HashMap<i32, Vec<String>>) -> Word {
        Word {
            word,
            word_weight: 1,
            allowed,
        }
    }

    // fn str(&self) -> String {
    //     format!("{} ({}, {})", self.word, self.word_weight, self.allowed.len())
    // }
}

struct Spot {
    words: Vec<Word>,
    collapsed: bool,
}

impl Spot {
    fn new() -> Spot {
        Spot {
            words: Vec::new(),
            collapsed: false,
        }
    }

    fn str(&self) -> String {
        if self.collapsed && !self.words.is_empty() {
            self.words[0].word.clone()
        } else {
            format!("{}", self.words.len())
        }
    }

    fn add_word(&mut self, word: Word) {
        self.words.push(word);
    }

    // fn random_weighted_word(&self) -> usize {
    //     let weights = self.words.iter().map(|w| w.word_weight).collect::<Vec<u32>>();
    //     let builder = WalkerTableBuilder::new(&weights);
    //     let wa_table = builder.build();

    //     wa_table.next()
    // }

    fn collapse(&mut self) {
        // let word_index = self.random_weighted_word();
        let word_index = rand::random::<usize>() % self.words.len();
        // self.words = vec![self.words[word_index].clone()];
        // self.collapsed = true;

        self.words = vec![self.words[word_index].clone()];
        self.collapsed = true;
    }

    fn semi_collapse_to_cap_punctuation(&mut self) {
        self.words = self
            .words
            .iter()
            .filter(|w| w.word.len() == 1 && CAP_PUNCTUATION.contains(&w.word))
            .cloned()
            .collect::<Vec<Word>>();
    }

    fn update(&mut self, neighbor_words: &[Word], offset: i32) -> bool {
        // if self.collapsed {
        //     return false;
        // }

        let previous_count = self.words.len();
        let offset = -offset;

        let neighbor_word_strings = neighbor_words
            .par_iter()
            .map(|w| w.word.as_str())
            .collect::<Vec<&str>>();
        self.words = self
            .words
            .par_iter()
            .filter(|word| {
                word.allowed.contains_key(&offset)
                    && word.allowed[&offset]
                        .iter()
                        .any(|w| neighbor_word_strings.contains(&w.as_str()))
            })
            .cloned()
            .collect::<Vec<Word>>();

        let new_count = self.words.len();

        // if new_count == 1 {
        //     self.collapsed = true;
        // }

        previous_count != new_count
    }
}

fn lowest_entropy_indexes(spots: &[Spot]) -> (Vec<usize>, bool, bool) {
    let mut lowest_entropy = usize::MAX;
    let mut idxs = Vec::new();
    let mut done = true;

    for (i, spot) in spots.iter().enumerate() {
        let len = spot.words.len();

        if len == 0 {
            return (Vec::new(), true, false);
        }

        if !spot.collapsed {
            done = false;

            match len.cmp(&lowest_entropy) {
                std::cmp::Ordering::Less => {
                    lowest_entropy = len;
                    idxs = vec![i];
                }
                std::cmp::Ordering::Equal => {
                    idxs.push(i);
                }
                std::cmp::Ordering::Greater => {}
            }

            // if len < lowest_entropy {
            //     lowest_entropy = len;
            //     idxs = vec![i];
            // } else if len == lowest_entropy {
            //     idxs.push(i);
            // }
        }
    }

    (idxs, false, done)
}

fn propagate(spots: &mut Vec<Spot>, index: usize, n: i32) {
    let mut stack = vec![index];

    let mut offsets = (-n..n + 1).filter(|o| *o != 0).collect::<Vec<i32>>();
    offsets.sort_by_key(|a| a.abs());

    while let Some(current_index) = stack.pop() {
        // let neighbor_idxs = offsets
        //     .iter()
        //     .map(|o| current_index as i32 + o)
        //     .collect::<Vec<i32>>();

        let current_words = &spots[current_index].words.clone();
        for offset in offsets.iter() {
            let neighbor_idx = current_index as i32 + offset;
            if neighbor_idx < 0 || neighbor_idx > spots.len() as i32 - 1 {
                continue;
            }

            let neighbor_idx = neighbor_idx as usize;
            let updated = spots[neighbor_idx].update(current_words, *offset);
            if updated && !stack.contains(&neighbor_idx) {
                stack.push(neighbor_idx);
            }
        }

        print!("{}   ", join_spots(spots));
        println!("{}: {:?}", stack.len(), stack);
    }
}

fn iterate(spots: &mut Vec<Spot>, n: i32) -> (bool, bool) {
    let (lowest_indexes, failed, done) = lowest_entropy_indexes(spots);

    if failed || done {
        return (failed, done);
    }

    let lowest_index = lowest_indexes[rand::random::<usize>() % lowest_indexes.len()];
    spots[lowest_index].collapse();
    propagate(spots, lowest_index, n);

    (failed, done)
}

fn create_spots(words: Vec<Word>, length: usize, n: i32) -> Vec<Spot> {
    let mut spots = Vec::new();

    for _ in 0..length {
        let mut spot = Spot::new();
        for word in &words {
            spot.add_word(word.clone());
        }
        spots.push(spot);
    }

    spots[0].semi_collapse_to_cap_punctuation();
    let len = spots.len();
    spots[len - 1].semi_collapse_to_cap_punctuation();

    println!("{}", join_spots(&spots));

    propagate(&mut spots, 0, n);
    println!("{}", join_spots(&spots));

    propagate(&mut spots, len - 1, n);
    println!("{}", join_spots(&spots));

    spots
}

fn capitalize(s: &str) -> String {
    if s.is_empty() {
        return String::from("");
    }

    let mut chars = s.chars();
    if let Some(first_char) = chars.next() {
        let capitalized = first_char.to_uppercase().collect::<String>();
        let rest = chars.collect::<String>();
        capitalized + &rest
    } else {
        String::from("")
    }
}

fn join_spots(spots: &Vec<Spot>) -> String {
    let mut output = String::new();
    let mut last_word = String::from(".");

    for spot in spots {
        let mut text = spot.str();

        if CAP_PUNCTUATION.contains(last_word.as_str()) {
            text = capitalize(&text);
        }
        if STRIP_PUNCTUATION.contains(text.as_str()) {
            output = output.trim().to_string();
        }

        output.push_str(&text);
        output.push(' ');

        last_word = text;
    }

    output.trim().to_string()
}

fn read_words(filename: &str, n: i32) -> Vec<Word> {
    let mut word_strings = Vec::new();

    let contents =
        std::fs::read_to_string(filename).expect("Something went wrong reading the file");

    for line in contents.lines() {
        let line = line.trim();
        let punctuation_pattern = format!("[{}]", regex::escape(END_WORD_PUNCTUATION));
        let word_pattern = r"\b[\w\']+?\b"; // Include the apostrophe in word characters
        let re = Regex::new(&format!("{}|{}", word_pattern, punctuation_pattern)).unwrap();
        let tokens: Vec<&str> = re.find_iter(line).map(|m| m.as_str()).collect();

        let joined = tokens.join("090");
        let replaced = joined.replace("090'090", "'");
        let apostrophe_adjusted_tokens = replaced.split("090");

        for token in apostrophe_adjusted_tokens {
            let word_string = token.trim().to_lowercase();

            if !word_string.is_empty() {
                let mut skip = false;
                for char in OTHER_PUNCTUATION.iter() {
                    if word_string.contains(char) {
                        skip = true;
                        break;
                    }
                }

                if !skip {
                    word_strings.push(word_string.to_string());
                }
            }
        }
    }

    let left_word = ".";
    let current_word = &word_strings[0];
    let hashmap = HashMap::from([(-1, vec![left_word.to_string()])]);
    let word_combo = (current_word, hashmap);

    let mut all_word_combos = vec![word_combo];

    let offsets = (-n..n + 1).filter(|o| *o != 0).collect::<Vec<i32>>();

    let len = word_strings.len();
    let last_word = &word_strings[len - 1];

    let length_offset = if last_word == "." { 1 } else { 0 };

    for i in 0..len {
        let current_word = &word_strings[i];

        // let neighbor_idxs = offsets.iter().map(|o| i as i32 + o).collect::<Vec<i32>>();
        for offset in offsets.iter() {
            let neighbor_idx = i as i32 + offset;
            if neighbor_idx < -1 || neighbor_idx > len as i32 - length_offset {
                continue;
            }

            let offset_word =
                if neighbor_idx == len as i32 - length_offset || neighbor_idx == -1 {
                    "."
                } else {
                    &word_strings[neighbor_idx as usize]
                };

            let hashmap = HashMap::from([(*offset, vec![offset_word.to_string()])]);
            let word_combo = (current_word, hashmap);

            all_word_combos.push(word_combo);
        }
    }

    let mut words = Vec::new();
    let mut word_strs = Vec::new();

    for (word_str, allowed) in all_word_combos {
        if !word_strs.contains(word_str) {
            let word_string = word_str.to_string();
            let word = Word::new(word_string.clone(), allowed.clone());
            words.push(word);
            word_strs.push(word_string);
        } else {
            for word in words.iter_mut() {
                if word.word == *word_str {
                    word.word_weight += 1;

                    let offset = allowed.keys().next().unwrap();
                    let allowed_word = &allowed[offset][0];

                    if !word.allowed.contains_key(offset) {
                        word.allowed.insert(*offset, vec![allowed_word.to_string()]);
                    } else {
                        word.allowed
                            .get_mut(offset)
                            .unwrap()
                            .push(allowed_word.to_string());
                    }
                }
            }
        }
    }

    words
}

fn main() {
    let opt = Opt::from_args();

    let words = read_words(opt.filename.as_str(), opt.n);
    println!("Read {} words", words.len());

    let mut spots = create_spots(words.clone(), opt.length, opt.n);

    let mut done = false;

    while !done {
        let (failed, d) = iterate(&mut spots, opt.n);
        done = d;
        println!("{}\n", join_spots(&spots));

        if failed {
            println!("KNOTTED, RESTARTING\n");
            spots = create_spots(words.clone(), opt.length, opt.n);
        }
    }
}
