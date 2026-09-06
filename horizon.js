/* framework by me, cowork with ChatGPT and Claude*/
class Horizon{

    #svg;
    #prepared_to_show = false; // true if prepared to show
    #show_able = true;
    #ref;
    #ref_setter;
    #rotation_transform;
    #needle;
    #refline;
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
        const cx = 50, cy = 50, r = 40;
        
        let bg = document.createElementNS(ns,"circle");
        bg.setAttribute("cx",cx);
        bg.setAttribute("cy",cy);
        bg.setAttribute("r",r);
        bg.setAttribute("fill","none");
        bg.setAttribute("stroke","white");
        bg.setAttribute("stroke-opacity","0.4");
        this.#svg.appendChild(bg);
        
        this.#refline = document.createElementNS(ns,"line");
        this.#refline.setAttribute("x1",cx - r);
        this.#refline.setAttribute("y1",cy);
        this.#refline.setAttribute("x2",cx + r);
        this.#refline.setAttribute("y2",cy);
        this.#refline.setAttribute("stroke","yellow");
        this.#refline.setAttribute("stroke-dasharray","4 3");
        this.#refline.style.display = "none";
        this.#svg.appendChild(this.#refline);
        
        this.#needle = document.createElementNS(ns,"line");
        this.#needle.setAttribute("x1",cx - r);
        this.#needle.setAttribute("y1",cy);
        this.#needle.setAttribute("x2",cx + r);
        this.#needle.setAttribute("y2",cy);
        this.#needle.setAttribute("stroke","white");
        this.#needle.setAttribute("stroke-width","2");
        this.#svg.appendChild(this.#needle);
        
        let dot = document.createElementNS(ns,"circle");
        dot.setAttribute("cx",cx);
        dot.setAttribute("cy",cy);
        dot.setAttribute("r",2);
        dot.setAttribute("fill","white");
        this.#svg.appendChild(dot);
    }
    
    static #min_diff(angle,ref_angle){
        let a_candidates = (angle === 0) ? [0,180] : [angle];
        let r_candidates = (ref_angle === 0) ? [0,180] : [ref_angle];
        let best = Infinity;
        for(let a of a_candidates){
            for(let r of r_candidates){
                best = Math.min(best, Math.abs(a - r));
            }
        }
        return best;
    }
    
    #svg_update(angle,ref_angle){
        const cx = 50, cy = 50;
        
        if(angle === null){
            this.#prepared_to_show = false;
            return;
        }
        this.#prepared_to_show = true;
        
        this.#needle.setAttribute(
            "transform",
            `rotate(${-angle} ${cx} ${cy})`
        );
        
        if(ref_angle === null){
            this.#refline.style.display = "none";
            this.#needle.setAttribute("stroke","white");
            return;
        }
        
        this.#refline.style.display = "";
        this.#refline.setAttribute(
            "transform",
            `rotate(${-ref_angle} ${cx} ${cy})`
        );
        
        let involves_zero = (angle === 0 || ref_angle === 0);
        let T = Horizon.#min_diff(angle,ref_angle);
        
        if(T <= Horizon.#match_tolerance && !involves_zero){
            this.#needle.setAttribute("stroke","#00e676");
        }else if(T <= Horizon.#match_tolerance && involves_zero){
            this.#needle.setAttribute("stroke","#ffd600");
        }else{
            this.#needle.setAttribute("stroke","white");
        }
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
                       return beta + 180;
                   }else{
                       return null;
                   }
               };
               break;
           case 90:
               this.#rotation_transform = ({beta,gamma}) => {
                   if(gamma !== null && beta !== null && gamma === 0 && (180 - Math.abs(beta)) < (0 - Math.abs(beta))){
                       gamma = 180;
                   }else{
                       //pass
                   }
                   if(gamma !== null && beta !== null && -90 <= gamma && gamma <= 90){
                       return -gamma + (gamma <= 0 ? 0 : 180);
                   }else{
                       return null;
                   }
               };
               break;
           case 270:
               this.#rotation_transform = ({beta,gamma}) => {
                   if(gamma !== null && beta !== null && gamma === 0 && (180 - Math.abs(beta)) < (0 - Math.abs(beta))){
                       gamma = 180;
                   }else{
                       //pass
                   }
                   if(gamma !== null && beta !== null && -90 <= gamma && gamma <= 90){
                       return gamma + (0 <= gamma ? 0 : 180);
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
