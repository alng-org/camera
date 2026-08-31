/* impl by Claude, under user guide */
class Horizon{

    #svg;
    #dot;
    #ref = null;
    #pending = null;
    #quat_now = [1,0,0,0];
    #tolerance = 3;
    #range = 30;
    #suppressed = false;

    constructor(svg){
        this.#svg = svg;
        this.#build();
        this.#svg.style.visibility = "hidden";

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
        if(expect_what === true){
            this.#pending = true;
        }else{
            this.#pending = null;
            this.#ref = null;
            this.#refresh_visibility();
            this.track();
        }
    }

    unable_show(){
        this.#suppressed = true;
        this.#refresh_visibility();
    }

    enable_show(){
        this.#suppressed = false;
        this.#refresh_visibility();
    }

    #refresh_visibility(){
        let show = this.#ref !== null && this.#suppressed === false;
        this.#svg.style.visibility = show ? "visible" : "hidden";
    }

    track(){
        if(this.#ref === null){
            return;
        }
        let [roll_now,pitch_now] = Horizon.#roll_pitch(Horizon.#gravity(this.#quat_now));
        let [roll_ref,pitch_ref] = this.#ref;
        let roll  = Horizon.#wrap180(roll_now - roll_ref);
        let pitch = pitch_now - pitch_ref;

        let px = Math.max(-1,Math.min(1,roll / this.#range));
        let py = Math.max(-1,Math.min(1,pitch / this.#range));
        this.#dot.setAttribute("cx",50 + px*40);
        this.#dot.setAttribute("cy",50 - py*40);
        let aligned = Math.abs(pitch) < this.#tolerance && Math.abs(roll) < this.#tolerance;
        this.#dot.setAttribute("fill",aligned ? "#4ADE80" : "none");
        this.#dot.setAttribute("stroke",aligned ? "#4ADE80" : "currentColor");
    }

    #update({alpha,beta,gamma}){
        if(alpha === null || beta === null || gamma === null){
            return;
        }
        this.#quat_now = Horizon.#euler_to_quat(alpha,beta,gamma);
        if(this.#pending === true){
            this.#ref = Horizon.#roll_pitch(Horizon.#gravity(this.#quat_now));
            this.#pending = null;
            this.#refresh_visibility();
        }
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

    static #gravity(q){
        let qv = [0,0,0,-1];
        let t = Horizon.#quat_mul(Horizon.#quat_conj(q),qv);
        let r = Horizon.#quat_mul(t,q);
        return [r[1],r[2],r[3]];
    }

    static #roll_pitch([gx,gy,gz]){
        let roll  = Math.atan2(gx,-gy) * 180/Math.PI;
        let pitch = Math.atan2(-gz,Math.sqrt(gx*gx + gy*gy)) * 180/Math.PI;
        return [roll,pitch];
    }

    static #wrap180(deg){
        return ((deg + 180) % 360 + 360) % 360 - 180;
    }

}
