/* impl by Claude, under user guide */
class Horizon{

    #svg;
    #dot;
    #quat_ref = null;
    #quat_now = [1,0,0,0];
    #screen_angle;
    #tolerance = 3;
    #range = 30;

    constructor(svg){
        this.#svg = svg;
        this.#build();

        this.#screen_angle = screen.orientation?.angle ?? 0;
        screen.orientation?.addEventListener(
            "change",
            () => { this.#screen_angle = screen.orientation.angle; }
        );

        Horizon.#request_permission().then(
            () => window.addEventListener(
                "deviceorientation",
                (e) => this.#update(e)
            )
        );
    }

    static display_with(svg){
        return new Horizon(svg);
    }

    expect_locked(expect_what){
        this.#quat_ref = expect_what === true ? this.#quat_now : null;
        this.track();
    }

    track(){
        if(this.#quat_ref === null){
            this.#dot.setAttribute("cx",50);
            this.#dot.setAttribute("cy",50);
            this.#dot.setAttribute("fill","none");
            return;
        }
        let [pitch,roll] = Horizon.#relative_pitch_roll(
            this.#quat_ref,
            this.#quat_now,
            this.#screen_angle
        );
        let px = Math.max(-1,Math.min(1,roll / this.#range));
        let py = Math.max(-1,Math.min(1,pitch / this.#range));
        this.#dot.setAttribute("cx",50 + px*40);
        this.#dot.setAttribute("cy",50 - py*40);
        let aligned = Math.abs(pitch) < this.#tolerance && Math.abs(roll) < this.#tolerance;
        this.#dot.setAttribute("fill",aligned ? "currentColor" : "none");
    }

    #update({alpha,beta,gamma}){
        if(alpha === null || beta === null || gamma === null){
            return;
        }
        this.#quat_now = Horizon.#euler_to_quat(alpha,beta,gamma);
    }

    #build(){
        this.#svg.innerHTML = `
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="1"/>
            <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" stroke-width="0.5"/>
            <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" stroke-width="0.5"/>
        `;
        let dot = document.createElementNS("http://www.w3.org/2000/svg","circle");
        dot.setAttribute("cx",50);
        dot.setAttribute("cy",50);
        dot.setAttribute("r",6);
        dot.setAttribute("stroke","currentColor");
        dot.setAttribute("stroke-width","1");
        dot.setAttribute("fill","none");
        this.#svg.appendChild(dot);
        this.#dot = dot;
    }

    static #request_permission(){
        if(
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function"
        ){
            return DeviceOrientationEvent.requestPermission().catch(() => "denied");
        }
        return Promise.resolve("granted");
    }

    static #euler_to_quat(alpha,beta,gamma){
        let a = alpha * Math.PI / 180;
        let b = beta  * Math.PI / 180;
        let g = gamma * Math.PI / 180;
        let cA = Math.cos(a/2), sA = Math.sin(a/2);
        let cB = Math.cos(b/2), sB = Math.sin(b/2);
        let cG = Math.cos(g/2), sG = Math.sin(g/2);
        return [
            cA*cB*cG - sA*sB*sG,
            sA*cB*cG - cA*sB*sG,
            cA*sB*cG + sA*cB*sG,
            cA*cB*sG + sA*sB*cG
        ];
    }

    static #quat_mul([w1,x1,y1,z1],[w2,x2,y2,z2]){
        return [
            w1*w2 - x1*x2 - y1*y2 - z1*z2,
            w1*x2 + x1*w2 + y1*z2 - z1*y2,
            w1*y2 - x1*z2 + y1*w2 + z1*x2,
            w1*z2 + x1*y2 - y1*x2 + z1*w2
        ];
    }

    static #quat_conj([w,x,y,z]){
        return [w,-x,-y,-z];
    }

    static #relative_pitch_roll(q_ref,q_now,screen_angle){
        let q_diff = Horizon.#quat_mul(q_now,Horizon.#quat_conj(q_ref));

        let rad = -screen_angle * Math.PI / 180;
        let q_screen = [Math.cos(rad/2),0,0,Math.sin(rad/2)];
        q_diff = Horizon.#quat_mul(
            Horizon.#quat_mul(q_screen,q_diff),
            Horizon.#quat_conj(q_screen)
        );

        let [w,x,y,z] = q_diff;
        let pitch = Math.asin(Math.max(-1,Math.min(1,2*(w*x - y*z)))) * 180/Math.PI;
        let roll  = Math.atan2(2*(w*y + x*z),1 - 2*(x*x + y*y)) * 180/Math.PI;
        return [pitch,roll];
    }

}
