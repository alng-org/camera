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

        let defs = document.createElementNS(ns,"defs");
        let filter = document.createElementNS(ns,"filter");
        filter.setAttribute("id","glow");
        filter.setAttribute("filterUnits","userSpaceOnUse");
        filter.setAttribute("x", box.x - box.width*0.2);
        filter.setAttribute("y", box.y - box.height*0.2);
        filter.setAttribute("width", box.width*1.4);
        filter.setAttribute("height", box.height*1.4);

        let blur = document.createElementNS(ns,"feGaussianBlur");
        blur.setAttribute("in","SourceAlpha");
        blur.setAttribute("stdDeviation","2");
        blur.setAttribute("result","blurred_alpha");
        filter.appendChild(blur);

        let flood = document.createElementNS(ns,"feFlood");
        flood.setAttribute("flood-color","#00e5ff");
        flood.setAttribute("result","glow_color");
        filter.appendChild(flood);

        let composite = document.createElementNS(ns,"feComposite");
        composite.setAttribute("in","glow_color");
        composite.setAttribute("in2","blurred_alpha");
        composite.setAttribute("operator","in");
        composite.setAttribute("result","colored_glow");
        filter.appendChild(composite);

        let offset = document.createElementNS(ns,"feOffset");
        offset.setAttribute("in","colored_glow");
        offset.setAttribute("dx","0");
        offset.setAttribute("dy","-1.5");
        offset.setAttribute("result","glow_offset");
        filter.appendChild(offset);

        let merge = document.createElementNS(ns,"feMerge");
        let mergeNode1 = document.createElementNS(ns,"feMergeNode");
        mergeNode1.setAttribute("in","glow_offset");
        let mergeNode2 = document.createElementNS(ns,"feMergeNode");
        mergeNode2.setAttribute("in","SourceGraphic");
        merge.appendChild(mergeNode1);
        merge.appendChild(mergeNode2);
        filter.appendChild(merge);

        defs.appendChild(filter);
        this.#svg.appendChild(defs);

        this.#refline = document.createElementNS(ns,"line");
        this.#refline.setAttribute("x1",cx - r);
        this.#refline.setAttribute("y1",cy);
        this.#refline.setAttribute("x2",cx + r);
        this.#refline.setAttribute("y2",cy);
        this.#refline.setAttribute("stroke","yellow");
        this.#refline.setAttribute("stroke-dasharray","4 3");
        this.#refline.setAttribute("filter","url(#glow)");
        this.#refline.style.display = "none";
        this.#svg.appendChild(this.#refline);

        this.#needle = document.createElementNS(ns,"line");
        this.#needle.setAttribute("x1",cx - r);
        this.#needle.setAttribute("y1",cy);
        this.#needle.setAttribute("x2",cx + r);
        this.#needle.setAttribute("y2",cy);
        this.#needle.setAttribute("stroke","white");
        this.#needle.setAttribute("stroke-width","2");
        this.#needle.setAttribute("filter","url(#glow)");
        this.#svg.appendChild(this.#needle);

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

        let T = Math.abs(angle - ref_angle);

        if(T <= Horizon.#match_tolerance){
            this.#needle.setAttribute("stroke","#00e676");
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
