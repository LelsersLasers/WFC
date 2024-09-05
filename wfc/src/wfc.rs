use macroquad::prelude as mq;
use crate::consts;

// -------------------------------------------------------------------------- //
#[derive(Copy, Clone)]
struct Color {
	r: u8,
	g: u8,
	b: u8,
	m: u8,
}
impl Color {
	fn from_mq_color(mq_color: mq::Color, m: u8) -> Self {
		Self {
			r: (mq_color.r * 255.0).round() as u8,
			g: (mq_color.g * 255.0).round() as u8,
			b: (mq_color.b * 255.0).round() as u8,
			m
		}
	}
}
impl PartialEq for Color {
	fn eq(&self, other: &Self) -> bool {
		self.r == other.r && self.g == other.g && self.b == other.b && self.m == other.m
	}
}
// -------------------------------------------------------------------------- //

// -------------------------------------------------------------------------- //
struct Pattern {
	// colors: Vec<Color>, // 2D, NxN array of colors
	colors: Vec<Vec<Color>>, // 2D, NxN array of colors
	overlaps: Vec<Overlap>,
}
impl Pattern {
	fn from_img(center_x: usize, center_y: usize, src: &mq::Image) -> Self {
		let mut colors = Vec::new();
		let shift = (consts::N - 1) as i32 / 2;

		let start_x = center_x as i32 - shift;
		let start_y = center_y as i32 - shift;

		let end_x = start_x + consts::N as i32;
		let end_y = start_y + consts::N as i32;

		for x in start_x..end_x {
			colors.push(Vec::new());
			for y in start_y..end_y {
				let mut m = 0;

				// #[rustfmt::skip]
				{
					if x < 0                    { m |= 1 << 0; }
					if x >= src.width() as i32  { m |= 1 << 1; }
					if y < 0                    { m |= 1 << 2; }
					if y >= src.height() as i32 { m |= 1 << 3; }
				}

				let mq_color = if m != 0 {
					mq::Color::new(1.0, 0.0, 1.0, 1.0)
				} else {
					src.get_pixel(x as u32, y as u32)
				};

				let color = Color::from_mq_color(mq_color, m);
				// colors.push(color);

				let last_idx = colors.len() - 1;
				colors[last_idx].push(color);
			}
		}

		Self { colors, overlaps: Vec::new() }
	}
	fn color_at(&self, x: usize, y: usize) -> Color {
		// self.colors[x * consts::N + y]
		self.colors[x][y]
	}
	fn can_go_next_to(&self, other: &Self, offset_x: i32, offset_y: i32) -> bool {
		for pattern_x in 0..consts::N as i32 {
			for pattern_y in 0..consts::N as i32 {
				let other_pattern_x = pattern_x - offset_x;
				let other_pattern_y = pattern_y - offset_y;

				if other_pattern_x < 0 || other_pattern_x >= consts::N as i32 || other_pattern_y < 0 || other_pattern_y >= consts::N as i32 {
					continue;
				}
				let color = self.color_at(pattern_x as usize, pattern_y as usize);
				let other_color = other.color_at(other_pattern_x as usize, other_pattern_y as usize);
				if color != other_color {
					return false;
				}
			}
		}

		true
	}
	fn center_color(&self) -> Color {
		// self.colors[self.colors.len() / 2]
		self.colors[consts::N / 2][consts::N / 2]
	}
	fn to_mq_color(&self) -> mq::Color {
		let center_color = self.center_color();
		mq::Color::new(
			center_color.r as f32 / 255.0,
			center_color.g as f32 / 255.0,
			center_color.b as f32 / 255.0,
			1.0
		)
	}
}
impl PartialEq for Pattern {
	fn eq(&self, other: &Self) -> bool {
		self.colors == other.colors && self.overlaps == other.overlaps
	}
}
// -------------------------------------------------------------------------- //

// -------------------------------------------------------------------------- //
struct Overlap {
	pattern_idx: usize,
	offset_x: i32,
	offset_y: i32,
}
impl Overlap {
	fn new(pattern_idx: usize, offset_x: i32, offset_y: i32) -> Self {
		Self { pattern_idx, offset_x, offset_y }
	}
}
impl PartialEq for Overlap {
	fn eq(&self, other: &Self) -> bool {
		self.pattern_idx == other.pattern_idx && self.offset_x == other.offset_x && self.offset_y == other.offset_y
	}
}
// -------------------------------------------------------------------------- //

// -------------------------------------------------------------------------- //
struct GridSpot {
	x: i32,
	y: i32,
	valid_patterns: Vec<bool>,
}
impl GridSpot {
	fn new(x: i32, y: i32, patterns_length: usize) -> Self {
		Self { x, y, valid_patterns: vec![true; patterns_length] }
	}
	fn collapse(&mut self) {
		let valid_idxs: Vec<usize> = self.valid_patterns.iter().enumerate().filter_map(|(i, state)| if *state { Some(i) } else { None }).collect();
		let idx = mq::rand::gen_range(0, valid_idxs.len());
		let pattern_idx = valid_idxs[idx];
		self.valid_patterns = vec![false; self.valid_patterns.len()];
		self.valid_patterns[pattern_idx] = true;
	}
	fn check_edges(&mut self, patterns: &[Pattern]) -> bool {
		let mut updated = false;
		for (i, pattern) in patterns.iter().enumerate() {
			if !self.valid_patterns[i] {
				continue;
			}

			let shift = (consts::N - 1) as i32 / 2;

			for x in 0..consts::N as i32 {
				for y in 0..consts::N as i32 {
					let output_x = self.x + x - shift;
					let output_y = self.y + y - shift;

					let mut m = 0;

					// #[rustfmt::skip]
					{
						if output_x < 0                      { m |= 1 << 0; }
						if output_x >= consts::DIMS_X as i32 { m |= 1 << 1; }
						if output_y < 0                      { m |= 1 << 2; }
						if output_y >= consts::DIMS_Y as i32 { m |= 1 << 3; }
					}

					let color = pattern.color_at(x as usize, y as usize);
					if color.m != m {
						self.valid_patterns[i] = false;
						updated = true;
						break;
					}
				}
			}
		}

		updated
	}
	fn calculate_mq_color(&self, patterns: &[Pattern]) -> mq::Color {
		let sum = self.valid_patterns.iter().enumerate().fold(
			mq::Color::new(0.0, 0.0, 0.0, 1.0),
			|color, (i, state)| {
				if *state {
					let pattern = &patterns[i];
					let pattern_color = pattern.to_mq_color();
					mq::Color::new(
						color.r + pattern_color.r,
						color.g + pattern_color.g,
						color.b + pattern_color.b,
						1.0
					)
				} else {
					color
				}
			}
		);
		let count = self.valid_patterns.iter().filter(|&&x| x).count() as f32;
		mq::Color::new(sum.r / count, sum.g / count, sum.b / count, 1.0)
	}
}
// -------------------------------------------------------------------------- //

// -------------------------------------------------------------------------- //
pub struct Wave {
	patterns: Vec<Pattern>,
	grid: Vec<GridSpot>,
	update_stack: Vec<(i32, i32)>,
	going: bool,
	knotted: bool,
}
impl Wave {
	pub fn new(src: mq::Image) -> Self {
		let mut patterns = Vec::new();
		for x in 0..src.width() {
			for y in 0..src.height() {
				let pattern = Pattern::from_img(x, y, &src);
				patterns.push(pattern);
			}
		}

		for i in 0..patterns.len() {
			for j in 0..patterns.len() {
				// if i == j {
				// 	continue;
				// }

				for offset_x in -(consts::N as i32) + 1..consts::N as i32 {
					for offset_y in -(consts::N as i32) + 1..consts::N as i32 {
						if offset_x == 0 && offset_y == 0 {
							continue;
						}

						if patterns[i].can_go_next_to(&patterns[j], offset_x, offset_y) {
							let overlap = Overlap::new(j, offset_x, offset_y);
							patterns[i].overlaps.push(overlap);
						}
					}
				}
			}
		}

		Self { patterns, grid: Vec::new(), update_stack: Vec::new(), going: true, knotted: false }
	}
	pub fn create_grid(&mut self) {
		self.grid.clear();
		for x in 0..consts::DIMS_X {
			for y in 0..consts::DIMS_Y {
				let mut grid_spot = GridSpot::new(x as i32, y as i32, self.patterns.len());
			
				let updated = grid_spot.check_edges(&self.patterns);
				if updated {
					self.add_to_stack((x as i32, y as i32));
				}

				self.grid.push(grid_spot);
			}
		}
	}
	pub fn going(&self) -> bool {
		self.going
	}
	pub fn step(&mut self) {
		if !self.going {
			return;
		}

		if self.knotted {
			self.update_stack.clear();
			self.create_grid();
			self.knotted = false;
		}

		if self.update_stack.is_empty() {
			self.iterate();
		} else {
			self.propagate();
		}
	}
	pub fn draw(&self) {
		let w = consts::WINDOW_WIDTH as f32 / consts::DIMS_X as f32;
		let h = consts::WINDOW_HEIGHT as f32 / consts::DIMS_Y as f32;

		for spot in self.grid.iter() {
			let mq_color = spot.calculate_mq_color(&self.patterns);
			let x = spot.x as f32 * w;
			let y = spot.y as f32 * h;

			// let collapsed = spot.valid_patterns.iter().filter(|&&x| x).count() == 1;

			// if collapsed {
			// 	mq::draw_rectangle(x, y, w, h, mq::PINK);
			// }
			// mq::draw_rectangle(x + 2., y + 2., w - 4., h - 4., mq_color);
			mq::draw_rectangle(x, y, w, h, mq_color);


			// let text = format!("{}", spot.valid_patterns.iter().filter(|&&x| x).count());
			// mq::draw_text(&text, x + 10., y + 10., 20., mq::WHITE);
		}
	}
	fn lowest_entropy_spot_idx(&self) -> (bool, bool, Option<usize>) {
		let mut lowest_entropy = usize::MAX;
		let mut lowest_entropy_idxs = Vec::new();
		let mut finished = true;
		let mut knotted = false;

		for (i, spot) in self.grid.iter().enumerate() {
			let count = spot.valid_patterns.iter().filter(|&&x| x).count();
			if count == 0 {
				println!("Knotted: {}", i);
				knotted = true;
				break;
			}
			if count > 1 {
				finished = false;
				match count.cmp(&lowest_entropy) {
					std::cmp::Ordering::Less => {
						lowest_entropy = count;
						lowest_entropy_idxs.clear();
						lowest_entropy_idxs.push(i);
					},
					std::cmp::Ordering::Equal => {
						lowest_entropy_idxs.push(i);
					},
					_ => {}
				}
			}
		}

		if knotted {
			return (true, false, None);
		}
		if finished {
			return (false, true, None);
		}

		println!("lowest_entropy_idxs: {:?}", lowest_entropy_idxs.len());

		let idx = mq::rand::gen_range(0, lowest_entropy_idxs.len());
		(false, false, Some(lowest_entropy_idxs[idx]))
	}
	fn add_to_stack(&mut self, pos: (i32, i32)) {
		if !self.update_stack.contains(&pos) {
			self.update_stack.push(pos);
		}
	}
	fn iterate(&mut self) {
		let (knotted, finished, idx) = self.lowest_entropy_spot_idx();
		if knotted {
			self.knotted = true;
			println!("Knotted!");
			return;
		}
		if finished {
			self.going = false;
			println!("Finished!");
			return;
		}
		let idx = idx.unwrap();

		println!("idx: {}", idx);

		self.grid[idx].collapse();
		self.add_to_stack((self.grid[idx].x, self.grid[idx].y));
	}
	fn propagate(&mut self) {
		if self.update_stack.is_empty() {
			return;
		}

		let pos = self.update_stack.pop().unwrap();
		let idx = pos.0 as usize * consts::DIMS_Y + pos.1 as usize;

		let pattern_len = self.patterns.len();

		// TRY DIFFERENT ORDER
		for offset_x in -(consts::N as i32) + 1..consts::N as i32 {
			for offset_y in -(consts::N as i32) + 1..consts::N as i32 {
				if offset_x == 0 && offset_y == 0 {
					continue;
				}

				let other_pos = (pos.0 + offset_x, pos.1 + offset_y);
				if other_pos.0 < 0 || other_pos.0 >= consts::DIMS_X as i32 || other_pos.1 < 0 || other_pos.1 >= consts::DIMS_Y as i32 {
					continue;
				}
				let other_idx = other_pos.0 as usize * consts::DIMS_Y + other_pos.1 as usize;

				let mut other_possible_patterns: Vec<usize> = Vec::new();

				for i in 0..pattern_len {
					if !self.grid[idx].valid_patterns[i] {
						continue;
					}
					let pattern = &self.patterns[i];
					for j in 0..pattern.overlaps.len() {
						if pattern.overlaps[j].offset_x == offset_x
							&& pattern.overlaps[j].offset_y == offset_y
							&& !other_possible_patterns.contains(&pattern.overlaps[j].pattern_idx)
						{
							other_possible_patterns.push(pattern.overlaps[j].pattern_idx);
						}
					}
				}

				for i in 0..pattern_len {
					if !self.grid[other_idx].valid_patterns[i] {
						continue;
					}
					if !other_possible_patterns.contains(&i) {
						self.grid[other_idx].valid_patterns[i] = false;

						// self.add_to_stack(other_pos);
						if !self.update_stack.contains(&other_pos) {
							self.update_stack.push(other_pos);
						}
					}
				}
			}
		}
	}
}
// -------------------------------------------------------------------------- //

