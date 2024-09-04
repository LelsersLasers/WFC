use macroquad::prelude as mq;

mod consts;
mod wfc;


fn window_conf() -> mq::Conf {
    mq::Conf {
        window_title: "WFC".to_owned(),
        window_width: consts::WINDOW_WIDTH as i32,
        window_height: consts::WINDOW_HEIGHT as i32,
        window_resizable: false,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {

    let src = mq::Image::from_file_with_format(
        include_bytes!("../ColoredCity.png"),
        Some(mq::ImageFormat::Png),
    ).unwrap();

    let mut wave = wfc::Wave::new(src);
    wave.create_grid();

    mq::rand::srand(instant::now() as u64);


    loop {
        mq::clear_background(consts::CLEAR_COLOR);

        for _ in 0..20 {
            if wave.going() {
                wave.step();
            }
        }

        wave.draw();

        let fps = mq::get_fps();
        mq::draw_text(&format!("FPS: {}", fps), 10.0, 20.0, 20.0, mq::WHITE);

        mq::next_frame().await
    }
}
