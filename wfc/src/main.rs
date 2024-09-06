use macroquad::prelude as mq;
use clap::Parser;

mod cmd;
mod consts;
mod wfc;


fn window_conf() -> mq::Conf {
    mq::Conf {
        window_title: "WFC".to_owned(),
        window_width: consts::WINDOW_WIDTH as i32 + 200,
        window_height: consts::WINDOW_HEIGHT as i32 + 200,
        window_resizable: false,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    let args = cmd::Args::parse();

    if args.n % 2 == 0 {
        panic!("Pattern size must be odd");
    }

    let file_bytes = std::fs::read(&args.input).unwrap_or_else(|_| panic!("Could not read input file"));
    let src = mq::Image::from_file_with_format(
        &file_bytes,
        Some(mq::ImageFormat::Png),
    ).unwrap();


    let mut wave = wfc::Wave::new(src, args);
    wave.create_grid();


    let seed = (instant::now() % 1000.) * 1000.0;
    mq::rand::srand(seed as u64);

    let mut steps_per_frame = 1;


    loop {
        mq::clear_background(consts::CLEAR_COLOR);

        // for _ in 0..4 {
        //     if wave.going() {
        //         wave.step();
        //     }
        // }
        // if wave.going() && mq::is_key_pressed(mq::KeyCode::Space) {
        //     wave.step();
        // }
        // if wave.going() {
        //     wave.step();
        // }

        for _ in 0..steps_per_frame {
            if wave.going() {
                wave.step();
            }
        }

        wave.draw();

        let fps = mq::get_fps();

        if fps > consts::TARGET_FPS as i32 && wave.going() {
            steps_per_frame += 1;
        } else {
            steps_per_frame -= 1;
        }

        steps_per_frame = steps_per_frame.max(1);

        mq::draw_text(&format!("FPS: {} ({})", fps, steps_per_frame), 10.0, 20.0, 20.0, mq::WHITE);


        mq::next_frame().await
    }
}
