use clap::Parser;
use macroquad::prelude as mq;

mod cmd;
mod consts;
mod wfc;

fn window_conf() -> mq::Conf {
    mq::Conf {
        window_title: "WFC".to_owned(),
        window_width: consts::WINDOW_SIZE as i32,
        window_height: consts::WINDOW_SIZE as i32,
        window_resizable: true,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    let args = cmd::Args::parse();

    if args.n % 2 == 0 {
        panic!("Pattern size must be odd");
    }
    if args.edges && (args.wrap_input || args.wrap_output) {
        panic!("Cannot use edges with wrap");
    }

    let file_bytes =
        std::fs::read(&args.input).unwrap_or_else(|_| panic!("Could not read input file"));
    let src = mq::Image::from_file_with_format(&file_bytes, Some(mq::ImageFormat::Png)).unwrap();

    let scale = mq::screen_width() / args.dims_x.max(args.dims_y) as f32;
    let w = args.dims_x as f32 * scale;
    let h = args.dims_y as f32 * scale;
    mq::request_new_screen_size(w, h);

    let mut wave = wfc::Wave::new(src, args);
    wave.create_grid();

    let seed = (instant::now() % 1000.) * 1000.0;
    mq::rand::srand(seed as u64);

    let mut steps_per_frame = 1;

    let mut fpses = vec![];

    loop {
        mq::clear_background(consts::CLEAR_COLOR);
        for _ in 0..steps_per_frame {
            if wave.going() {
                wave.step();
            }
        }

        if mq::is_key_pressed(mq::KeyCode::D) {
            wave.toggle_debug();
        }

        wave.draw();

        let fps = mq::get_fps();
        fpses.push(fps);
        let start = if fpses.len() > consts::FPSES_TO_KEEP {
            fpses.len() - consts::FPSES_TO_KEEP
        } else {
            0
        };
        fpses = fpses[start..].to_vec();
        let avg_fps = fpses.iter().sum::<i32>() as f32 / fpses.len() as f32;

        if fps as u32 > consts::TARGET_FPS && wave.going() {
            steps_per_frame += 1;
        } else {
            steps_per_frame -= 1;
        }

        steps_per_frame = steps_per_frame.max(1);

        if wave.going() {
            let font_size = mq::screen_height() / 20.;
            mq::draw_text(
                &format!("FPS: {:.1} ({})", avg_fps, steps_per_frame),
                0.,
                font_size / 2.,
                font_size,
                mq::BLUE,
            );
        }

        mq::next_frame().await
    }
}
