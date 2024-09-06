
#[derive(clap::Parser)]
#[command(name = "wfc", version = "0.1.0", author = "Millan Kumar")]
pub struct Args {
	#[arg(long, default_value = "30", help = "Output width")]
	pub dims_x: usize,

	#[arg(long, default_value = "30", help = "Output height")]
	pub dims_y: usize,

	#[arg(long, default_value = "3", help = "Pattern size (must be odd)")]
	pub n: usize,

	#[arg(long, default_value = "false", help = "Wrap around the source input")]
	pub wrap_input: bool,

	#[arg(long, default_value = "false", help = "Wrap around the output image")]
	pub wrap_output: bool,

	#[arg(long, default_value = "false", help = "Output edges match input edges")]
	pub edges: bool,

	#[arg(long, default_value = "false", help = "Rotate patterns")]
	pub rotate: bool,

	#[arg(long, default_value = "false", help = "Flip patterns")]
	pub flip: bool,

	#[arg(long, help = "Input path")]
	pub input: std::path::PathBuf
}