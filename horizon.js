/* framework by me, cowork with ChatGPT and Claude*/
class Horizon{

    #svg;
    #prepared_to_show = false; // true if prepared to show
    #show_able = true;
    #ref;
    #ref_setter;
    #rotation_transform;
    #needle;
    #needle_group;
    #needle_ticks = [];
    #refline;
    #refline_group;
    #cx;
    #cy;
    static #match_tolerance = 1;

    static #nop_ref(it,__){
        return;
    }
    
    static #locked_ref(
        it,
        orientation = {
            alpha: null,
            beta: null,
            gamma: null
        }
    ){
        it.#ref_setter = Horizon.#nop_ref;
        it.#ref = orientation;
    }

    static #request_permission(){
        if(
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function"
        ){
            return DeviceOrientationEvent.requestPermission().catch(() => "denied");
        }else{
            return Promise.resolve("granted");
        }
    }

    #apply_visibility(){
        this.#svg.style.visibility =
            (
                this.#prepared_to_show === true && 
                this.#show_able === true
            ) ? "visible" : "hidden";
    }

    #tracking(orientation){
        let angle = this.#rotation_transform(orientation);
        let ref_angle = this.#rotation_transform(this.#ref);
        this.#svg_update(angle,ref_angle);
        this.#apply_visibility();
    }

    #svg_init(){
        const ns = "http://www.w3.org/2000/svg";
        let box = this.#svg.viewBox.baseVal;
        this.#cx = box.x + box.width / 2;
        this.#cy = box.y + box.height / 2;
        let cx = this.#cx;
        let cy = this.#cy;
        let r = Math.min(box.width, box.height) * 0.4;

        let tick_offsets = [-4, -7, -10];
        let tick_fracs = [0.8, 0.6, 0.4];

        function build_line_with_ticks(stroke, dashed){
            let group = document.createElementNS(ns,"g");

            let main = document.createElementNS(ns,"line");
            main.setAttribute("x1",cx - r);
            main.setAttribute("y1",cy);
            main.setAttribute("x2",cx + r);
            main.setAttribute("y2",cy);
            main.setAttribute("stroke",stroke);
            main.setAttribute("stroke-width","2");
            if(dashed){
                main.setAttribute("stroke-dasharray","4 3");
            }
            group.appendChild(main);

            let ticks = [];
            for(let i = 0; i < tick_offsets.length; i++){
                let half = r * tick_fracs[i];
                let y = cy + tick_offsets[i];
                let tick = document.createElementNS(ns,"line");
                tick.setAttribute("x1", cx - half);
                tick.setAttribute("y1", y);
                tick.setAttribute("x2", cx + half);
                tick.setAttribute("y2", y);
                tick.setAttribute("stroke", stroke);
                tick.setAttribute("stroke-width","1.5");
                tick.setAttribute("stroke-opacity", 0.55 - i*0.15);
                group.appendChild(tick);
                ticks.push(tick);
            }
            
            return { group, main, ticks };
        }
        
        let refline_parts = build_line_with_ticks("yellow", true);
        this.#refline_group = refline_parts.group;
        this.#refline = refline_parts.main;
        this.#refline_group.style.display = "none";
        this.#svg.appendChild(this.#refline_group);

        let needle_parts = build_line_with_ticks("white", false);
        this.#needle_group = needle_parts.group;
        this.#needle = needle_parts.main;
        this.#needle_ticks = needle_parts.ticks;
        this.#svg.appendChild(this.#needle_group);

        let dot = document.createElementNS(ns,"circle");
        dot.setAttribute("cx",cx);
        dot.setAttribute("cy",cy);
        dot.setAttribute("r",2);
        dot.setAttribute("fill","white");
        this.#svg.appendChild(dot);
    }
    
    #svg_update(angle,ref_angle){
        let cx = this.#cx;
        let cy = this.#cy;

        if(angle === null){
            this.#prepared_to_show = false;
            return;
        }
        this.#prepared_to_show = true;

        this.#needle_group.setAttribute(
            "transform",
            `rotate(${-angle} ${cx} ${cy})`
        );

        if(ref_angle === null){
            this.#refline_group.style.display = "none";
            this.#set_needle_color("white");
            return;
        }
        
        this.#refline_group.style.display = "";
        this.#refline_group.setAttribute(
            "transform",
            `rotate(${-ref_angle} ${cx} ${cy})`
        );
        
        let T = Math.abs(angle - ref_angle);
        
        if(T <= Horizon.#match_tolerance){
            this.#set_needle_color("#00e676");
        }else{
            this.#set_needle_color("white");
        }
    }
    
    #set_needle_color(color){
        this.#needle.setAttribute("stroke", color);
        this.#needle_ticks.forEach((t) => t.setAttribute("stroke", color));
    }

    constructor(svg){
        this.update_rotation_transform();
        Horizon.#locked_ref(this);
        this.#svg = svg;
        this.#apply_visibility();
        this.#svg_init();
        Horizon.#request_permission().then(
            () => window.addEventListener(
                "deviceorientation",
                (orientation) => {
                    this.#ref_setter(this,orientation);
                    this.#tracking(orientation);
                }
            )
        );
    }

    static display_with(svg){
        return new Horizon(svg);
    }

    expect_locked(expect_what){
        if(expect_what === true){
            this.#ref_setter = Horizon.#locked_ref;
        }else{
            Horizon.#locked_ref(this);
        }
    }

    unable_show(){
        this.#show_able = false;
        this.#apply_visibility();
    }

    enable_show(){
        this.#show_able = true;
        this.#apply_visibility();
    }

    /*
      this.#rotation_transform({alpha,beta,gamma}) -> angle
      angle === null => failed to get angle
      angle <- [0,180] => angle 
         |    /
         |   / angle (_ anticlockwise turn to /)
         |  /______
         side view, legend: 
             | user
             / phone
             _ horizons
         note: 
              1. phone screen face to user
              2. for case 90 & 270, it Inferring the possible 180 via beta & gamma
         
    */
    update_rotation_transform(){
       let type = screen.orientation?.angle ?? -1;
       switch (type) {
           case 0:
               this.#rotation_transform = ({beta,gamma}) => {
                   if(beta !== null && gamma !== null && 0 <= beta && beta <= 180){
                       return beta;
                   }else{
                       return null;
                   }
               };
               break;
           case 180:
               this.#rotation_transform = ({beta,gamma}) => {
                   if(beta !== null && gamma !== null && -180 <= beta && beta <= 0){
                       return -beta;
                   }else{
                       return null;
                   }
               };
               break;
           case 90:
               this.#rotation_transform = ({beta,gamma}) => {
                   if(gamma !== null && beta !== null &&
                      (Math.abs(beta) - 0) <= (180 - Math.abs(beta)) &&
                      -90 <= gamma && gamma <= 0){
                       return -gamma;
                   }else if(gamma !== null && beta !== null &&
                      (180 - Math.abs(beta)) < (Math.abs(beta) - 0) &&
                      0 <= gamma && gamma <= 90){
                       return 180 - gamma;
                   }else{
                       return null;
                   }
               };
               break;
           case 270:
               this.#rotation_transform = ({beta,gamma}) => {
                   if(gamma !== null && beta !== null &&
                      (Math.abs(beta) - 0) <= (180 - Math.abs(beta)) &&
                      0 <= gamma && gamma <= 90){
                       return gamma;
                   }else if(gamma !== null && beta !== null &&
                      (180 - Math.abs(beta)) < (Math.abs(beta) - 0) &&
                      -90 <= gamma && gamma <= 0){
                       return 180 + gamma;
                   }else{
                       return null;
                   }
               };
               break;
           default:
               this.#rotation_transform = (_) => null;
               break;
       } 
    }
    
}
