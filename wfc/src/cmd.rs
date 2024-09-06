
#[derive(clap::Parser)]
#[command(name = "wfc", version = "0.1.0", author = "Millan Kumar")]
pub struct Args {
	#[arg(short, long, default_value = "30", help = "Output width")]
	pub dims_x: usize,

	#[arg(short, long, default_value = "30", help = "Output height")]
	pub dims_y: usize,

	#[arg(short, long, default_value = "3", help = "Pattern size (must be odd)")]
	pub n: usize,

	#[arg(short, long, default_value = "false", help = "Wrap pattern around the edge")]
	pub wrap: bool,

	#[arg(short, long, default_value = "false", help = "Edges must match")]
	pub edges: bool,

	#[arg(short, long, default_value = "false", help = "Rotate patterns")]
	pub rotate: bool,

	#[arg(short, long, default_value = "false", help = "Flip patterns")]
	pub flip: bool,

	#[arg(short, long, help = "Input path")]
	pub input: std::path::PathBuf
}