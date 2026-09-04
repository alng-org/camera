/* framework by me, cowork with ChatGPT and Claude*/
class Horizon{

    #svg;
    #prepared_to_show = false; // true if prepared to show
    #show_able = true;
    #ref;
    #ref_setter;
    #rotation_transform;

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
        /* init svg */
    }
    #svg_update(angle,ref_angle){
        /*
           def angle => note above Horizon::update_rotation_transform()
           param angle => angle for now, maybe null if unavailable
           param ref_angle => angle for ref to keep, maybe null if no ref
           update svg,
           set Horizon::#prepared_to_show to what you need
        */
    }

    constructor(svg){
        this.update_rotation_transform();
        Horizon.#locked_ref(this);
        this.#svg = svg;
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
         legend: 
             | user
             / phone
             _ horizons
         note: 
              1. phone screen face to user
              2. angle === 180 return as 0
         
    */
    update_rotation_transform(){
       let type = screen.orientation?.angle ?? -1;
       switch (type) {
           case 0:
               this.#rotation_transform = ({beta}) => {
                   if(0 <= beta && beta <= 180){
                       return beta % 180;
                   }else{
                       return null;
                   }
               };
               break;
           case 180:
               this.#rotation_transform = ({beta}) => {
                   if(-180 <= beta && beta <= 0){
                       return (beta + 180) % 180;
                   }else{
                       return null;
                   }
               };
               break;
           case 90:
               this.#rotation_transform = ({gamma}) => {
                   if(-90 <= gamma && gamma <= 90){
                       return (-gamma + (gamma <= 0 ? 0 : 180)) % 180;
                   }else{
                       return null;
                   }
               };
               break;
           case 270:
               this.#rotation_transform = ({gamma}) => {
                   if(-90 <= gamma && gamma <= 90){
                       return (gamma + (0 <= gamma ? 0 : 180)) % 180;
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
