use macroquad::prelude as mq;
use rustc_hash::FxHashSet;
use rayon::prelude::*;
use crate::cmd;

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
#[derive(Clone)]
struct Pattern {
	colors: Vec<Color>, // 2D, NxN array of colors
	overlaps: Vec<Overlap>,
}
impl Pattern {
	fn from_img(center_x: usize, center_y: usize, src: &mq::Image, args: &cmd::Args) -> Self {
		let mut colors = Vec::with_capacity(args.n * args.n);
		let shift = (args.n - 1) as i32 / 2;

		let start_x = center_x as i32 - shift;
		let start_y = center_y as i32 - shift;

		let end_x = start_x + args.n as i32;
		let end_y = start_y + args.n as i32;

		for x in start_x..end_x {
			for y in start_y..end_y {
				let (x, y, m) = if args.wrap_input {
					(
						(x + src.width() as i32) % src.width() as i32,
						(y + src.height() as i32) % src.height() as i32,
						0
					)
				} else {
					let mut m = 0;
					// #[rustfmt::skip]
					{
						if x < 0                    { m |= 1 << 0; }
						if x >= src.width() as i32  { m |= 1 << 1; }
						if y < 0                    { m |= 1 << 2; }
						if y >= src.height() as i32 { m |= 1 << 3; }
					}
					(x, y, m)
				};
				

				let mq_color = if m != 0 {
					mq::Color::new(1.0, 0.0, 1.0, 1.0)
				} else {
					src.get_pixel(x as u32, y as u32)
				};

				let color = Color::from_mq_color(mq_color, m);
				colors.push(color);
			}
		}

		Self { colors, overlaps: Vec::new() }
	}
	fn color_at(&self, x: usize, y: usize, n: usize) -> Color {
		self.colors[x * n + y]
	}
	fn can_go_next_to(&self, other: &Self, offset_x: i32, offset_y: i32, n: usize) -> bool {
		for pattern_x in 0..n as i32 {
			for pattern_y in 0..n as i32 {
				let other_pattern_x = pattern_x - offset_x;
				let other_pattern_y = pattern_y - offset_y;

				if other_pattern_x < 0 || other_pattern_x >= n as i32 || other_pattern_y < 0 || other_pattern_y >= n as i32 {
					continue;
				}
				let color = self.color_at(pattern_x as usize, pattern_y as usize, n);
				let other_color = other.color_at(other_pattern_x as usize, other_pattern_y as usize, n);
				if color != other_color {
					return false;
				}
			}
		}

		true
	}
	fn rotate(&self, n: usize, times: usize) -> Self {
		fn rotate90(colors: &[Color], n: usize) -> Vec<Color> {
			let mut new_colors = colors.to_owned();
			let x = n / 2;
			let y = n - 1;
			for i in 0..x {
				for j in i..y - i {
					let k = colors[i * n + j];
					new_colors[i * n + j] = colors[(y - j) * n + i];
					new_colors[(y - j) * n + i] = colors[(y - i) * n + (y - j)];
					new_colors[(y - i) * n + (y - j)] = colors[j * n + (y - i)];
					new_colors[j * n + (y - i)] = k;
				}
			}
			new_colors
		}

		let mut new_colors = self.colors.clone();
		for _ in 0..times {
			new_colors = rotate90(&new_colors, n);
		}

		Self { colors: new_colors, overlaps: self.overlaps.clone() }
	}
	fn flip_x(&self, n: usize) -> Self {
		let mut new_colors = self.colors.clone();
		for i in 0..n {
			for j in 0..n / 2 {
				new_colors.swap(i * n + j, i * n + (n - j - 1));
			}
		}
		Self { colors: new_colors, overlaps: self.overlaps.clone() }
	}
	fn flip_y(&self, n: usize) -> Self {
		let mut new_colors = self.colors.clone();
		for i in 0..n / 2 {
			for j in 0..n {
				new_colors.swap(i * n + j, (n - i - 1) * n + j);
			}
		}
		Self { colors: new_colors, overlaps: self.overlaps.clone() }
	}
	fn center_color(&self) -> Color {
		self.colors[self.colors.len() / 2]
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
#[derive(Clone)]
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
	fn check_edges(&mut self, patterns: &[Pattern], args: &cmd::Args) -> bool {
		// self.valid_patterns = self.valid_patterns.iter().enumerate().map(|(i, state)| {
		// 	if !*state {
		// 		return false;
		// 	}

		// 	let shift = (args.n - 1) as i32 / 2;

		// 	for x in 0..args.n as i32 {
		// 		for y in 0..args.n as i32 {
		// 			let output_x = self.x + x - shift;
		// 			let output_y = self.y + y - shift;

		// 			let mut m = 0;

		// 			// #[rustfmt::skip]
		// 			{
		// 				if output_x < 0                   { m |= 1 << 0; }
		// 				if output_x >= args.dims_x as i32 { m |= 1 << 1; }
		// 				if output_y < 0                   { m |= 1 << 2; }
		// 				if output_y >= args.dims_y as i32 { m |= 1 << 3; }
		// 			}

		// 			let color = patterns[i].color_at(x as usize, y as usize, args.n);
		// 			if (args.edges && color.m != m) || (!args.edges && color.m != 0) {
		// 				return false;
		// 			}
		// 		}
		// 	}

		// 	true
		// }).collect();

		let mut updated = false;
		for (i, pattern) in patterns.iter().enumerate() {
			if !self.valid_patterns[i] {
				continue;
			}

			let shift = (args.n - 1) as i32 / 2;

			for x in 0..args.n as i32 {
				for y in 0..args.n as i32 {
					let output_x = self.x + x - shift;
					let output_y = self.y + y - shift;

					let mut m = 0;

					// #[rustfmt::skip]
					{
						if output_x < 0                   { m |= 1 << 0; }
						if output_x >= args.dims_x as i32 { m |= 1 << 1; }
						if output_y < 0                   { m |= 1 << 2; }
						if output_y >= args.dims_y as i32 { m |= 1 << 3; }
					}

					let color = pattern.color_at(x as usize, y as usize, args.n);
					if (args.edges && color.m != m) || (!args.edges && color.m != 0) {
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
	args: cmd::Args,
}
impl Wave {
	pub fn new(src: mq::Image, args: cmd::Args) -> Self {
		let mut patterns = Vec::new();

		for x in 0..src.width() {
			for y in 0..src.height() {
				let base_pattern = Pattern::from_img(x, y, &src, &args);

				if args.flip {
					let flipped_x = base_pattern.flip_x(args.n);
					let flipped_y = base_pattern.flip_y(args.n);
					let flipped_xy = flipped_x.flip_y(args.n);

					patterns.push(flipped_x);
					patterns.push(flipped_y);
					patterns.push(flipped_xy);
				}

				if args.rotate {
					for i in 1..4 {
						let rotated = base_pattern.rotate(args.n, i);
						patterns.push(rotated);
					}
				}

				patterns.push(base_pattern);
			}
		}

		for i in 0..patterns.len() {
			for j in 0..patterns.len() {
				for offset_x in -(args.n as i32) + 1..args.n as i32 {
					for offset_y in -(args.n as i32) + 1..args.n as i32 {
						if offset_x == 0 && offset_y == 0 {
							continue;
						}

						if patterns[i].can_go_next_to(&patterns[j], offset_x, offset_y, args.n) {
							let overlap = Overlap::new(j, offset_x, offset_y);
							patterns[i].overlaps.push(overlap);
						}
					}
				}
			}
		}

		Self {
			patterns,
			grid: Vec::with_capacity(args.dims_x * args.dims_y),
			update_stack: Vec::new(),
			going: true,
			args
		}
	}
	pub fn create_grid(&mut self) {
		self.grid.clear();
		for x in 0..self.args.dims_x {
			for y in 0..self.args.dims_y {
				let mut grid_spot = GridSpot::new(x as i32, y as i32, self.patterns.len());
			
				let updated = grid_spot.check_edges(&self.patterns, &self.args);
				if updated {
					self.update_stack.push((x as i32, y as i32));
				}

				self.grid.push(grid_spot);
			}
		}
	}
	pub fn going(&self) -> bool {
		self.going
	}
	pub fn toggle_debug(&mut self) {
		self.args.debug = !self.args.debug;
	}
	pub fn step(&mut self) {
		if !self.going {
			return;
		}

		let knotted = self.grid.par_iter().any(|spot| spot.valid_patterns.iter().filter(|&&x| x).count() == 0);

		if knotted {
			println!("Knotted!");
			self.update_stack.clear();
			self.create_grid();
		}

		if self.update_stack.is_empty() {
			self.iterate();
		} else {
			self.propagate();
		}
	}
	pub fn draw(&self) {
		let w = mq::screen_width() / self.args.dims_x as f32;
		let h = mq::screen_height() / self.args.dims_y as f32;

		let font_size = (h / 2.5).round() as u16;

		let border = w.min(h) / 20.0;

		for spot in self.grid.iter() {
			let mq_color = spot.calculate_mq_color(&self.patterns);
			let x = spot.x as f32 * w;
			let y = spot.y as f32 * h;

			let count = spot.valid_patterns.iter().filter(|&&x| x).count();

			if !self.going || !self.args.debug {
				mq::draw_rectangle(x, y, w, h, mq_color);
			} else {
				if count == 1 {
					mq::draw_rectangle(x, y, w, h, mq::PINK);
				} else if self.update_stack.contains(&(spot.x, spot.y)) {
					mq::draw_rectangle(x, y, w, h, mq::GREEN);
				}
				mq::draw_rectangle(
					x + border,
					y + border,
					w - border * 2.,
					h - border * 2.,
					mq_color
				);	
	
				let text = format!("{}", count);
				let text_dims = mq::measure_text(&text, None, font_size, 1.0);
				// mq::draw_text(&text, x + 5., y + 20., 16., mq::WHITE);
				mq::draw_text(&text,
					x + w / 2. - text_dims.width / 2.,
					y + h / 2. - text_dims.height / 2. + text_dims.offset_y,
					font_size as f32, mq::WHITE
				);
			}
		}
	}
	fn lowest_entropy_spot_idx(&self) -> (bool, Option<usize>) {
		let mut lowest_entropy = usize::MAX;
		let mut lowest_entropy_idxs = Vec::new();
		let mut finished = true;

		for (i, spot) in self.grid.iter().enumerate() {
			let count = spot.valid_patterns.iter().filter(|&&x| x).count();
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

		if finished {
			return (true, None);
		}

		println!("lowest_entropy_idxs: {} ({})", lowest_entropy_idxs.len(), lowest_entropy);

		let idx = mq::rand::gen_range(0, lowest_entropy_idxs.len());
		(false, Some(lowest_entropy_idxs[idx]))
	}
	fn remove_dups_from_stack(&mut self) {
		let mut set = FxHashSet::default();
		self.update_stack.retain(|x| set.insert(*x));
	}
	fn iterate(&mut self) {
		let (finished, idx) = self.lowest_entropy_spot_idx();

		if finished {
			self.going = false;
			println!("Finished!");
			return;
		}
		let idx = idx.unwrap();

		println!("idx: {}", idx);

		self.grid[idx].collapse();
		self.update_stack.push((self.grid[idx].x, self.grid[idx].y));
	}
	fn propagate(&mut self) {
		if self.update_stack.is_empty() {
			return;
		}

		let pos = self.update_stack.pop().unwrap();
		let idx = pos.0 as usize * self.args.dims_y + pos.1 as usize;

		let pattern_len = self.patterns.len();

		let offsets = -(self.args.n as i32) + 1..self.args.n as i32;
		let mut sorted_offsets = offsets.clone().collect::<Vec<i32>>();
		sorted_offsets.sort_unstable_by_key(|&x| x.abs());

		let update_stack = std::sync::Mutex::new(&mut self.update_stack);
		let grid = std::sync::Mutex::new(&mut self.grid);

		sorted_offsets.clone().into_par_iter().for_each(|offset_x| {
			sorted_offsets.clone().into_par_iter().for_each(|offset_y| {
				if offset_x == 0 && offset_y == 0 {
					return;
				}

				let other_pos = if self.args.wrap_output {
					(
						(pos.0 + offset_x + self.args.dims_x as i32) % self.args.dims_x as i32,
						(pos.1 + offset_y + self.args.dims_y as i32) % self.args.dims_y as i32
					)
				} else {
					(
						pos.0 + offset_x,
						pos.1 + offset_y
					)
				};
				if other_pos.0 < 0 || other_pos.0 >= self.args.dims_x as i32 || other_pos.1 < 0 || other_pos.1 >= self.args.dims_y as i32 {
					return;
				}
				let other_idx = other_pos.0 as usize * self.args.dims_y + other_pos.1 as usize;

				let current_valid_patterns = grid.lock().unwrap()[idx].valid_patterns.clone();
				let other_possible_patterns = (0..pattern_len).flat_map(|i| {
					if !current_valid_patterns[i] {
						return Vec::new();
					}
					self.patterns[i].overlaps.iter().filter_map(|overlap| {
						if overlap.offset_x == offset_x && overlap.offset_y == offset_y {
							Some(overlap.pattern_idx)
						} else {
							None
						}
					}).collect::<Vec<usize>>()
				}).collect::<Vec<usize>>();

				let old_valid_patterns = grid.lock().unwrap()[other_idx].valid_patterns.clone();
				let new_valid_patterns = old_valid_patterns.iter().enumerate().map(|(i, state)| {
					if !*state {
						return false;
					}
					if !other_possible_patterns.contains(&i) {
						update_stack.lock().unwrap().push(other_pos);
						return false;
					}
					true
				}).collect::<Vec<bool>>();
				// grid.lock().unwrap()[other_idx].valid_patterns = new_valid_patterns;
				grid.lock().unwrap()[other_idx].valid_patterns = new_valid_patterns;
			});
		});

		self.remove_dups_from_stack();
	}
}
// -------------------------------------------------------------------------- //

